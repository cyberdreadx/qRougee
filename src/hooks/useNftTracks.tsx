import { useState, useEffect, useCallback } from 'react';
import type { NftCollection, NftToken } from '@rougechain/sdk';
import { useRougeChain } from './useRougeChain';
import { MOCK_TRACKS, type Track } from '../data/mockData';

interface NftTracksState {
    tracks: Track[];
    collections: NftCollection[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Convert an on-chain NftToken + its parent collection into our app's Track interface.
 */
function nftTokenToTrack(token: NftToken, collection: NftCollection): Track {
    // Attributes may contain our music metadata
    const attrs = (token.attributes || {}) as Record<string, string>;

    return {
        id: `${token.collection_id}_${token.token_id}`,
        title: token.name || 'Untitled',
        artist: attrs.artist || truncateCreator(token.creator),
        album: collection.name || 'Unknown Collection',
        duration: parseInt(attrs.duration || '0', 10) || 210,
        coverUrl: attrs.coverUrl || collection.image || generateCover(token.token_id),
        audioUrl: attrs.audioUrl || '',
        genre: attrs.genre || 'Unknown',
        collectionId: token.collection_id,
        tokenId: `tok_${token.token_id}`,
        mintDate: new Date(token.minted_at).toISOString().split('T')[0],
        owner: truncateCreator(token.owner),
    };
}

function truncateCreator(key: string): string {
    if (key.length <= 16) return key;
    return key.slice(0, 8) + '...' + key.slice(-6);
}

function generateCover(tokenId: number): string {
    const hue = (tokenId * 37) % 360;
    return `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="hsl(${hue},0%,${12 + (tokenId % 20)}%)"/><text x="200" y="210" text-anchor="middle" fill="hsl(0,0%,${60 + (tokenId % 30)}%)" font-family="sans-serif" font-size="48">${['♪', '♫', '♬', '♩'][tokenId % 4]}</text></svg>`
    )}`;
}

export function useNftTracks() {
    const rc = useRougeChain();
    const [state, setState] = useState<NftTracksState>({
        tracks: MOCK_TRACKS, // Start with mock data as fallback
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
                } catch {
                    // Skip collections we can't read
                }
            }

            // Merge: on-chain tracks first, then mock data as fallback
            const merged = allTracks.length > 0
                ? [...allTracks, ...MOCK_TRACKS]
                : MOCK_TRACKS;

            setState({
                tracks: merged,
                collections,
                isLoading: false,
                error: null,
            });
        } catch {
            // Chain unreachable — fall back to mock data
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
