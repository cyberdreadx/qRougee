import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Track } from '../data/mockData';

const FREE_PLAYS = 3;
const PLAY_COUNTS_KEY = 'qrougee_play_counts';

/* ── helpers ─────────────────────────────────────────── */

function getPlayCounts(): Record<string, number> {
    try {
        return JSON.parse(localStorage.getItem(PLAY_COUNTS_KEY) || '{}');
    } catch {
        return {};
    }
}

function incrementPlayCount(trackId: string): number {
    const counts = getPlayCounts();
    counts[trackId] = (counts[trackId] || 0) + 1;
    localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(counts));
    return counts[trackId];
}

function getPlayCount(trackId: string): number {
    return getPlayCounts()[trackId] || 0;
}

/* ── types ───────────────────────────────────────────── */

interface GatedTrackInfo {
    track: Track;
    playCount: number;
    maxFree: number;
    tokenBalance: number;
    requiredBalance: number;
}

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
    // Play gating
    gatedTrack: GatedTrackInfo | null;
    dismissGate: () => void;
    setTokenBalanceChecker: (checker: (wallet: string, symbol: string) => Promise<number>) => void;
    setWalletPublicKey: (key: string | null) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animRef = useRef<number>(0);
    const balanceCheckerRef = useRef<((wallet: string, symbol: string) => Promise<number>) | null>(null);
    const walletKeyRef = useRef<string | null>(null);

    const [state, setState] = useState<PlayerState>({
        currentTrack: null,
        queue: [],
        isPlaying: false,
        progress: 0,
        duration: 0,
        volume: 0.75,
    });

    const [gatedTrack, setGatedTrack] = useState<GatedTrackInfo | null>(null);

    // Create audio element once
    useEffect(() => {
        const audio = new Audio();
        audio.volume = 0.75;
        audio.preload = 'auto';
        audioRef.current = audio;

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    // Progress update loop
    const updateProgress = useCallback(() => {
        const audio = audioRef.current;
        if (audio && !audio.paused && !audio.ended) {
            setState(prev => ({
                ...prev,
                progress: audio.currentTime,
                duration: audio.duration && isFinite(audio.duration) ? audio.duration : prev.duration,
            }));
        }
        animRef.current = requestAnimationFrame(updateProgress);
    }, []);

    useEffect(() => {
        if (state.isPlaying) {
            animRef.current = requestAnimationFrame(updateProgress);
        } else {
            cancelAnimationFrame(animRef.current);
        }
        return () => cancelAnimationFrame(animRef.current);
    }, [state.isPlaying, updateProgress]);

    function loadAndPlay(track: Track, vol: number) {
        const audio = audioRef.current;
        if (!audio) return;

        if (track.audioUrl) {
            audio.src = track.audioUrl;
            audio.volume = vol;
            audio.play().catch(() => {});
        } else {
            audio.pause();
            audio.removeAttribute('src');
        }
    }

    // Check if a play is allowed (gating logic)
    const checkPlayGate = useCallback(async (track: Track): Promise<boolean> => {
        // No token symbol = no gating
        if (!track.tokenSymbol) return true;

        const threshold = track.playGateThreshold || 50; // default from spec
        const currentPlays = getPlayCount(track.id);

        // Still have free plays?
        if (currentPlays < FREE_PLAYS) return true;

        // No wallet = can't check balance → gate
        const wallet = walletKeyRef.current;
        if (!wallet) {
            setGatedTrack({
                track,
                playCount: currentPlays,
                maxFree: FREE_PLAYS,
                tokenBalance: 0,
                requiredBalance: threshold,
            });
            return false;
        }

        // Check on-chain token balance
        let balance = 0;
        if (balanceCheckerRef.current) {
            try {
                balance = await balanceCheckerRef.current(wallet, track.tokenSymbol);
            } catch {
                balance = 0;
            }
        }

        if (balance >= threshold) return true;

        // Insufficient balance → gate
        setGatedTrack({
            track,
            playCount: currentPlays,
            maxFree: FREE_PLAYS,
            tokenBalance: balance,
            requiredBalance: threshold,
        });
        return false;
    }, []);

    // Auto-advance on track end
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            setState(prev => {
                if (prev.queue.length === 0 || !prev.currentTrack) {
                    return { ...prev, isPlaying: false, progress: 0 };
                }
                const idx = prev.queue.findIndex(t => t.id === prev.currentTrack!.id);
                const nextIdx = idx + 1;
                if (nextIdx >= prev.queue.length) {
                    return { ...prev, isPlaying: false, progress: 0 };
                }
                const nextTrack = prev.queue[nextIdx];
                // Note: auto-advance doesn't gate (they already committed to listening)
                loadAndPlay(nextTrack, prev.volume);
                return {
                    ...prev,
                    currentTrack: nextTrack,
                    isPlaying: true,
                    progress: 0,
                    duration: nextTrack.duration,
                };
            });
        };

        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const play = useCallback((track: Track, queue?: Track[]) => {
        // Increment play count
        incrementPlayCount(track.id);

        // Check gate asynchronously
        checkPlayGate(track).then(allowed => {
            if (!allowed) return; // Modal will show

            setState(prev => {
                const newQueue = queue || prev.queue;
                loadAndPlay(track, prev.volume);
                return {
                    ...prev,
                    currentTrack: track,
                    queue: newQueue,
                    isPlaying: !!track.audioUrl,
                    progress: 0,
                    duration: track.duration,
                };
            });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkPlayGate]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setState(prev => ({ ...prev, isPlaying: false }));
    }, []);

    const resume = useCallback(() => {
        const audio = audioRef.current;
        if (audio && audio.src) {
            audio.play().catch(() => {});
        }
        setState(prev => (prev.currentTrack ? { ...prev, isPlaying: true } : prev));
    }, []);

    const togglePlay = useCallback(() => {
        setState(prev => {
            if (!prev.currentTrack) return prev;
            const audio = audioRef.current;
            if (prev.isPlaying) {
                audio?.pause();
            } else if (audio?.src) {
                audio.play().catch(() => {});
            }
            return { ...prev, isPlaying: !prev.isPlaying };
        });
    }, []);

    const next = useCallback(() => {
        setState(prev => {
            if (!prev.currentTrack || prev.queue.length === 0) return prev;
            const idx = prev.queue.findIndex(t => t.id === prev.currentTrack!.id);
            const nextTrack = prev.queue[(idx + 1) % prev.queue.length];
            loadAndPlay(nextTrack, prev.volume);
            return {
                ...prev,
                currentTrack: nextTrack,
                isPlaying: !!nextTrack.audioUrl,
                progress: 0,
                duration: nextTrack.duration,
            };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const prev = useCallback(() => {
        setState(prev => {
            if (!prev.currentTrack || prev.queue.length === 0) return prev;
            const idx = prev.queue.findIndex(t => t.id === prev.currentTrack!.id);
            const prevTrack = prev.queue[(idx - 1 + prev.queue.length) % prev.queue.length];
            loadAndPlay(prevTrack, prev.volume);
            return {
                ...prev,
                currentTrack: prevTrack,
                isPlaying: !!prevTrack.audioUrl,
                progress: 0,
                duration: prevTrack.duration,
            };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const seek = useCallback((pct: number) => {
        const audio = audioRef.current;
        if (audio && audio.duration && isFinite(audio.duration)) {
            audio.currentTime = pct * audio.duration;
        }
        setState(prev => ({
            ...prev,
            progress: pct * (audio?.duration && isFinite(audio.duration) ? audio.duration : prev.duration),
        }));
    }, []);

    const setVolume = useCallback((vol: number) => {
        const clamped = Math.max(0, Math.min(1, vol));
        if (audioRef.current) {
            audioRef.current.volume = clamped;
        }
        setState(prev => ({ ...prev, volume: clamped }));
    }, []);

    const dismissGate = useCallback(() => setGatedTrack(null), []);

    const setTokenBalanceChecker = useCallback(
        (checker: (wallet: string, symbol: string) => Promise<number>) => {
            balanceCheckerRef.current = checker;
        }, []
    );

    const setWalletPublicKey = useCallback((key: string | null) => {
        walletKeyRef.current = key;
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
                gatedTrack,
                dismissGate,
                setTokenBalanceChecker,
                setWalletPublicKey,
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
