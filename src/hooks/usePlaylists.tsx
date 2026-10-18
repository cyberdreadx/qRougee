import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useWallet } from './useWallet';

/**
 * User playlists.
 *
 * RougeChain has no on-chain playlist primitive, so playlists live in
 * localStorage, scoped per wallet identity (the connected public key, or a
 * shared `local` bucket before connecting). Liked Songs is separate and stays
 * fully on-chain (rc.social.getUserLikes) — see the Playlists page.
 */

export interface Playlist {
    id: string;
    name: string;
    trackIds: string[];
    createdAt: number;
}

interface PlaylistsValue {
    playlists: Playlist[];
    create: (name: string) => string;           // returns new playlist id
    rename: (id: string, name: string) => void;
    remove: (id: string) => void;
    addTrack: (id: string, trackId: string) => void;
    removeTrack: (id: string, trackId: string) => void;
    has: (id: string, trackId: string) => boolean;
    get: (id: string) => Playlist | undefined;
}

const PlaylistsContext = createContext<PlaylistsValue | null>(null);

const keyFor = (identity: string) => `qrougee:playlists:${identity}`;

function load(identity: string): Playlist[] {
    try {
        const raw = localStorage.getItem(keyFor(identity));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function newId(): string {
    return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function PlaylistsProvider({ children }: { children: ReactNode }) {
    const { publicKey } = useWallet();
    const identity = publicKey || 'local';
    const [playlists, setPlaylists] = useState<Playlist[]>(() => load(identity));

    // Reload when the active wallet changes (each identity has its own lists).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlaylists(load(identity));
    }, [identity]);

    // Persist on every change.
    useEffect(() => {
        try { localStorage.setItem(keyFor(identity), JSON.stringify(playlists)); } catch { /* quota */ }
    }, [identity, playlists]);

    const create = useCallback((name: string) => {
        const id = newId();
        const pl: Playlist = { id, name: name.trim() || 'Untitled playlist', trackIds: [], createdAt: Date.now() };
        setPlaylists(prev => [pl, ...prev]);
        return id;
    }, []);

    const rename = useCallback((id: string, name: string) => {
        setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p));
    }, []);

    const remove = useCallback((id: string) => {
        setPlaylists(prev => prev.filter(p => p.id !== id));
    }, []);

    const addTrack = useCallback((id: string, trackId: string) => {
        setPlaylists(prev => prev.map(p =>
            p.id === id && !p.trackIds.includes(trackId)
                ? { ...p, trackIds: [...p.trackIds, trackId] }
                : p,
        ));
    }, []);

    const removeTrack = useCallback((id: string, trackId: string) => {
        setPlaylists(prev => prev.map(p =>
            p.id === id ? { ...p, trackIds: p.trackIds.filter(t => t !== trackId) } : p,
        ));
    }, []);

    const value = useMemo<PlaylistsValue>(() => ({
        playlists,
        create, rename, remove, addTrack, removeTrack,
        has: (id, trackId) => !!playlists.find(p => p.id === id)?.trackIds.includes(trackId),
        get: id => playlists.find(p => p.id === id),
    }), [playlists, create, rename, remove, addTrack, removeTrack]);

    return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function usePlaylists(): PlaylistsValue {
    const ctx = useContext(PlaylistsContext);
    if (!ctx) throw new Error('usePlaylists must be used within PlaylistsProvider');
    return ctx;
}
