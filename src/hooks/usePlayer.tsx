import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Track } from '../data/mockData';

interface PlayerState {
    currentTrack: Track | null;
    queue: Track[];
    isPlaying: boolean;
    progress: number;
    duration: number;
    volume: number;
}

interface PlayerContextType extends PlayerState {
    play: (track: Track, queue?: Track[]) => void;
    pause: () => void;
    resume: () => void;
    togglePlay: () => void;
    next: () => void;
    prev: () => void;
    seek: (pct: number) => void;
    setVolume: (vol: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PlayerState>({
        currentTrack: null,
        queue: [],
        isPlaying: false,
        progress: 0,
        duration: 0,
        volume: 0.75,
    });

    // Simulate playback progress
    useEffect(() => {
        if (!state.isPlaying || !state.currentTrack) return;
        const interval = setInterval(() => {
            setState(prev => {
                const next = prev.progress + 1;
                if (next >= prev.duration) {
                    // Auto-advance
                    return { ...prev, progress: 0, isPlaying: false };
                }
                return { ...prev, progress: next };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [state.isPlaying, state.currentTrack]);

    const play = useCallback((track: Track, queue?: Track[]) => {
        setState(prev => ({
            ...prev,
            currentTrack: track,
            queue: queue || prev.queue,
            isPlaying: true,
            progress: 0,
            duration: track.duration,
        }));
    }, []);

    const pause = useCallback(() => {
        setState(prev => ({ ...prev, isPlaying: false }));
    }, []);

    const resume = useCallback(() => {
        setState(prev => (prev.currentTrack ? { ...prev, isPlaying: true } : prev));
    }, []);

    const togglePlay = useCallback(() => {
        setState(prev => {
            if (!prev.currentTrack) return prev;
            return { ...prev, isPlaying: !prev.isPlaying };
        });
    }, []);

    const next = useCallback(() => {
        setState(prev => {
            if (!prev.currentTrack || prev.queue.length === 0) return prev;
            const idx = prev.queue.findIndex(t => t.id === prev.currentTrack!.id);
            const nextTrack = prev.queue[(idx + 1) % prev.queue.length];
            return {
                ...prev,
                currentTrack: nextTrack,
                isPlaying: true,
                progress: 0,
                duration: nextTrack.duration,
            };
        });
    }, []);

    const prev = useCallback(() => {
        setState(prev => {
            if (!prev.currentTrack || prev.queue.length === 0) return prev;
            const idx = prev.queue.findIndex(t => t.id === prev.currentTrack!.id);
            const prevTrack = prev.queue[(idx - 1 + prev.queue.length) % prev.queue.length];
            return {
                ...prev,
                currentTrack: prevTrack,
                isPlaying: true,
                progress: 0,
                duration: prevTrack.duration,
            };
        });
    }, []);

    const seek = useCallback((pct: number) => {
        setState(prev => ({
            ...prev,
            progress: Math.floor(pct * prev.duration),
        }));
    }, []);

    const setVolume = useCallback((vol: number) => {
        setState(prev => ({ ...prev, volume: Math.max(0, Math.min(1, vol)) }));
    }, []);

    return (
        <PlayerContext.Provider
            value={{
                ...state,
                play,
                pause,
                resume,
                togglePlay,
                next,
                prev,
                seek,
                setVolume,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
    return ctx;
}
