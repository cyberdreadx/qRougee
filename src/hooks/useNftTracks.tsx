import { useState, useEffect, useCallback } from 'react';
import type { NftCollection, NftToken } from '@rougechain/sdk';
import { useRougeChain } from './useRougeChain';
import { MOCK_TRACKS, type Track } from '../data/mockData';

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
    const attrs = (token.attributes || {}) as Record<string, any>;

    return {
        id: `${token.collection_id}_${token.token_id}`,
        title: token.name || 'Untitled',
        artist: attrs.artist || truncateCreator(token.creator || ''),
        album: collection.name || 'Unknown Collection',
        duration: parseInt(attrs.duration || '0', 10) || 210,
        coverUrl: attrs.coverUrl || collection.image || generateCover(token.token_id),
        audioUrl: attrs.audioUrl || '',
        genre: attrs.genre || 'Unknown',
        collectionId: token.collection_id,
        tokenId: `tok_${token.token_id}`,
        mintDate: token.minted_at ? new Date(token.minted_at).toISOString().split('T')[0] : '',
        owner: token.owner,
        creator: token.creator || collection.creator,
        tokenSymbol: attrs.tokenSymbol || undefined,
        tokenSupply: Number(attrs.tokenSupply) || undefined,
        royaltySplit: attrs.royaltySplit || undefined,
        playGateThreshold: Number(attrs.playGateThreshold) || undefined,
        premiumThreshold: Number(attrs.premiumThreshold) || undefined,
    };
}

function truncateCreator(key: string): string {
    if (key.length <= 16) return key;
    return key.slice(0, 8) + '...' + key.slice(-6);
}

function generateCover(tokenId: string | number): string {
    const id = typeof tokenId === 'string' ? parseInt(tokenId, 10) || 0 : tokenId;
    const hue = (id * 37) % 360;
    return `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl(${hue},0%,${12 + (id % 20)}%)"/><text x="200" y="210" text-anchor="middle" fill="hsl(0,0%,${60 + (id % 30)}%)" font-family="sans-serif" font-size="48">${['♪', '♫', '♬', '♩'][id % 4]}</text></svg>`
    )}`;
}

export function useNftTracks() {
    const rc = useRougeChain();
    const [state, setState] = useState<NftTracksState>({
        tracks: MOCK_TRACKS,
        allTracksUnfiltered: MOCK_TRACKS,
        hiddenTrackIds: new Set(),
        collections: [],
        isLoading: true,
        error: null,
    });

    const fetchTracks = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const collections = await rc.nft.getCollections();
            const allTracks: Track[] = [];

            for (const col of collections) {
                try {
                    const { tokens } = await rc.nft.getTokens(col.collection_id, { limit: 50 });
                    for (const token of tokens) {
                        allTracks.push(nftTokenToTrack(token, col));
                    }
                } catch { /* skip */ }
            }

            // Fetch hidden track IDs from each unique creator
            const creators = [...new Set(allTracks.map(t => t.creator).filter(Boolean))] as string[];
            const hiddenIds = new Set<string>();
            for (const creator of creators) {
                try {
                    const ids = await rc.social.getHiddenTracks(creator);
                    ids.forEach(id => hiddenIds.add(id));
                } catch { /* ignore */ }
            }

            const visibleTracks = allTracks.filter(t => !hiddenIds.has(t.id));

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
        } catch {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Could not reach RougeChain — showing demo tracks',
            }));
        }
    }, [rc]);

    useEffect(() => {
        fetchTracks();
    }, [fetchTracks]);

    return {
        ...state,
        refetch: fetchTracks,
    };
}

export { nftTokenToTrack };
