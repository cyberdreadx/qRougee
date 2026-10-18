import { createContext, useContext, useEffect, useCallback, useRef, useState, type ReactNode } from 'react';
import type { NftCollection, NftToken } from '@rougechain/sdk';
import { useRougeChain } from './useRougeChain';
import { MOCK_TRACKS, type Track, type RoyaltySplit, type RoyaltyPayee } from '../data/mockData';
import { coverFallback } from '../utils/coverArt';

// Older mints stored IPFS URLs with an unencoded folder name (raw spaces / em-dash), which
// won't load. Percent-encode http(s) URLs so both audio and cover resolve (encodeURI is
// idempotent, so already-safe URLs pass through unchanged).
const encodeIpfs = (u?: string): string | undefined =>
    u && /^https?:/i.test(u) ? encodeURI(u) : u;

/** Music metadata we read out of an NFT's free-form `attributes` blob. */
interface TrackAttrs {
    artist?: string;
    duration?: string | number;
    coverUrl?: string;
    audioUrl?: string;
    genre?: string;
    tokenSymbol?: string;
    tokenSupply?: string | number;
    royaltySplit?: RoyaltySplit;
    royaltyPayees?: RoyaltyPayee[];
    playGateThreshold?: string | number;
    premiumThreshold?: string | number;
    audioHash?: string;
}

interface NftTracksState {
    tracks: Track[];
    allTracksUnfiltered: Track[];
    hiddenTrackIds: Set<string>;
    collections: NftCollection[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Convert an on-chain NftToken + its parent collection into our app's Track interface.
 */
function nftTokenToTrack(token: NftToken, collection: NftCollection): Track {
    // Attributes may contain our music metadata
    const attrs = (token.attributes || {}) as TrackAttrs;

    return {
        id: `${token.collection_id}_${token.token_id}`,
        title: token.name || 'Untitled',
        artist: attrs.artist || truncateCreator(token.creator || ''),
        album: collection.name || 'Unknown Collection',
        // 0 = unknown (legacy tracks minted before duration was captured). The
        // player backfills the real length from the audio element on load, and
        // formatDuration renders 0 as "--:--" rather than a fabricated time.
        duration: parseInt(String(attrs.duration || '0'), 10) || 0,
        coverUrl: encodeIpfs(attrs.coverUrl) || collection.image || coverFallback(token.name || '', token.collection_id + token.token_id),
        audioUrl: encodeIpfs(attrs.audioUrl) || '',
        genre: attrs.genre || 'Unknown',
        collectionId: token.collection_id,
        tokenId: `tok_${token.token_id}`,
        mintDate: token.minted_at ? new Date(token.minted_at).toISOString().split('T')[0] : '',
        owner: token.owner,
        creator: token.creator || collection.creator,
        tokenSymbol: attrs.tokenSymbol || undefined,
        tokenSupply: Number(attrs.tokenSupply) || undefined,
        royaltySplit: attrs.royaltySplit || undefined,
        royaltyPayees: Array.isArray(attrs.royaltyPayees) ? attrs.royaltyPayees : undefined,
        playGateThreshold: Number(attrs.playGateThreshold) || undefined,
        premiumThreshold: Number(attrs.premiumThreshold) || undefined,
        audioHash: attrs.audioHash || undefined,
        attributes: (token.attributes || undefined) as Record<string, unknown> | undefined,
    };
}

function truncateCreator(key: string): string {
    if (key.length <= 16) return key;
    return key.slice(0, 8) + '...' + key.slice(-6);
}

/** True for album-cover collectible NFTs — these are not songs and shouldn't
 *  appear in listener-facing track feeds (they stay in allTracksUnfiltered for
 *  the Collectibles / Marketplace pages). */
function isAlbumCoverCollectible(t: Track): boolean {
    return (t.attributes as { type?: string } | undefined)?.type === 'album_cover_collectible';
}

interface NftTracksValue extends NftTracksState {
    /** Re-fetch tracks. Forces a network round-trip by default (use after a
     *  mutation like mint/hide). Pass `{ force: false }` for a stale-guarded
     *  refresh that no-ops when the cache is still fresh. */
    refetch: (opts?: { force?: boolean }) => Promise<void>;
}

const NftTracksContext = createContext<NftTracksValue | null>(null);

// How long cached tracks are considered fresh. Within this window a non-forced
// refetch (e.g. the on-focus revalidation) is skipped, so page navigation never
// re-hits the network — the provider is mounted once at the app root.
const STALE_MS = 30_000;

/**
 * App-wide provider for the on-chain track list. Fetches once on mount and
 * shares the result across every page, so navigating between pages is instant
 * instead of re-fetching N collections each time. Revalidates in the background
 * when the window regains focus and the cache has gone stale.
 */
export function NftTracksProvider({ children }: { children: ReactNode }) {
    const rc = useRougeChain();
    const [state, setState] = useState<NftTracksState>({
        tracks: MOCK_TRACKS,
        allTracksUnfiltered: MOCK_TRACKS,
        hiddenTrackIds: new Set(),
        collections: [],
        isLoading: true,
        error: null,
    });
    const lastFetched = useRef(0);
    const inFlight = useRef<Promise<void> | null>(null);
    const hasData = useRef(false);

    const doFetch = useCallback(async () => {
        // Show the loading state only on the first load; background
        // revalidation keeps the current list visible while it refreshes.
        setState(prev => ({ ...prev, isLoading: !hasData.current, error: null }));

        try {
            const collections = await rc.nft.getCollections();

            // Fetch every collection's tokens in parallel — doing this
            // sequentially made the whole app wait on N round-trips in series.
            // Per-collection errors resolve to [] so one bad collection can't
            // abort the batch; Promise.all preserves collection order.
            const perCollection = await Promise.all(
                collections.map(async (col): Promise<Track[]> => {
                    try {
                        const { tokens } = await rc.nft.getTokens(col.collection_id, { limit: 50 });
                        return tokens.map(token => nftTokenToTrack(token, col));
                    } catch {
                        return [];
                    }
                }),
            );
            const allTracks: Track[] = perCollection.flat();

            // Fetch hidden track IDs from each unique creator, also in parallel.
            const creators = [...new Set(allTracks.map(t => t.creator).filter(Boolean))] as string[];
            const hiddenLists = await Promise.all(
                creators.map(async (creator): Promise<string[]> => {
                    try {
                        return await rc.social.getHiddenTracks(creator);
                    } catch {
                        return [];
                    }
                }),
            );
            const hiddenIds = new Set<string>(hiddenLists.flat());

            // Listener-facing feed: drop hidden tracks and album-cover
            // collectibles (not songs), and de-dupe by id so the same token
            // never shows twice. allTracksUnfiltered keeps everything for the
            // NFT-centric pages (Collectibles / Marketplace).
            const seen = new Set<string>();
            const visibleTracks = allTracks.filter(t => {
                if (hiddenIds.has(t.id) || isAlbumCoverCollectible(t) || seen.has(t.id)) return false;
                seen.add(t.id);
                return true;
            });

            const merged = visibleTracks.length > 0
                ? [...visibleTracks, ...MOCK_TRACKS]
                : MOCK_TRACKS;

            setState({
                tracks: merged,
                allTracksUnfiltered: allTracks.length > 0 ? [...allTracks, ...MOCK_TRACKS] : MOCK_TRACKS,
                hiddenTrackIds: hiddenIds,
                collections,
                isLoading: false,
                error: null,
            });
            hasData.current = true;
            lastFetched.current = Date.now();
        } catch {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Could not reach RougeChain — showing demo tracks',
            }));
        }
    }, [rc]);

    const refetch = useCallback(async (opts?: { force?: boolean }) => {
        const force = opts?.force ?? true;
        if (!force && Date.now() - lastFetched.current < STALE_MS) return;
        // Coalesce concurrent callers (StrictMode double-mount, rapid retries)
        // onto a single in-flight request.
        if (inFlight.current) return inFlight.current;
        const p = doFetch().finally(() => { inFlight.current = null; });
        inFlight.current = p;
        return p;
    }, [doFetch]);

    useEffect(() => {
        refetch({ force: true });
    }, [refetch]);

    // Background-revalidate when the user returns to the tab, but only if the
    // cache has gone stale — keeps data fresh without slowing navigation.
    useEffect(() => {
        const onFocus = () => { refetch({ force: false }); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [refetch]);

    return (
        <NftTracksContext.Provider value={{ ...state, refetch }}>
            {children}
        </NftTracksContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook + helper co-located with their provider
export function useNftTracks(): NftTracksValue {
    const ctx = useContext(NftTracksContext);
    if (!ctx) throw new Error('useNftTracks must be used within NftTracksProvider');
    return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- pure helper, used by callers that build Track objects
export { nftTokenToTrack };
