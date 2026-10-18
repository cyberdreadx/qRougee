import { useState } from 'react';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Shuffle,
    Repeat,
    Repeat1,
    ListMusic,
    ChevronUp,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../hooks/usePlayer';
import { formatDuration, type Track } from '../data/mockData';
import NowPlaying from './NowPlaying';

export default function PlayerBar() {
    const navigate = useNavigate();
    const [showQueue, setShowQueue] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const {
        currentTrack,
        queue,
        isPlaying,
        progress,
        duration,
        volume,
        shuffle,
        repeat,
        togglePlay,
        next,
        prev,
        seek,
        setVolume,
        toggleShuffle,
        cycleRepeat,
        play,
    } = usePlayer();

    // Nothing playing → no bar (SoundCloud-style: the player appears on play).
    if (!currentTrack) return null;

    const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
    // The brand is monochrome (--accent is black/white), so colour can't signal
    // "active". Use the app's inverted-fill convention (like the genre chips).
    const activeStyle: React.CSSProperties = {
        background: 'var(--fg)', color: 'var(--accent-fg)', borderRadius: '50%',
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        seek(Math.max(0, Math.min(1, pct)));
    };

    const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        setVolume(Math.max(0, Math.min(1, pct)));
    };

    return (
        <>
            <NowPlaying open={expanded} onClose={() => setExpanded(false)} />
            {showQueue && (
                <QueuePanel
                    queue={queue}
                    currentId={currentTrack.id}
                    onPlay={t => play(t)}
                    onClose={() => setShowQueue(false)}
                />
            )}
            <div className="player-bar">
                <div
                    className="player-track-info"
                    style={{ cursor: 'pointer' }}
                    role="link"
                    tabIndex={0}
                    title="Open track"
                    onClick={() => navigate(`/track/${currentTrack.id}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/track/${currentTrack.id}`); } }}
                >
                    <div className="player-thumb">
                        <img src={currentTrack.coverUrl} alt={currentTrack.title} />
                    </div>
                    <div className="player-track-text">
                        <div className="player-track-title">{currentTrack.title}</div>
                        <div className="player-track-artist">{currentTrack.artist}</div>
                    </div>
                </div>

                <div className="player-controls">
                    <div className="player-buttons">
                        <button
                            className="player-btn player-btn-secondary"
                            onClick={toggleShuffle}
                            title={shuffle ? 'Shuffle on' : 'Shuffle off'}
                            style={shuffle ? activeStyle : undefined}
                        >
                            <Shuffle />
                        </button>
                        <button className="player-btn" onClick={prev} title="Previous">
                            <SkipBack />
                        </button>
                        <button className="player-btn-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                            {isPlaying ? <Pause /> : <Play />}
                        </button>
                        <button className="player-btn" onClick={next} title="Next">
                            <SkipForward />
                        </button>
                        <button
                            className="player-btn player-btn-secondary"
                            onClick={cycleRepeat}
                            title={repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat off'}
                            style={repeat !== 'off' ? activeStyle : undefined}
                        >
                            {repeat === 'one' ? <Repeat1 /> : <Repeat />}
                        </button>
                    </div>
                    <div className="player-progress">
                        <span className="player-time">{formatDuration(progress)}</span>
                        <div className="progress-bar" onClick={handleProgressClick}>
                            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="player-time">{formatDuration(duration)}</span>
                    </div>
                </div>

                <div className="player-actions">
                    <button
                        className="player-btn"
                        onClick={() => setExpanded(true)}
                        title="Now playing"
                    >
                        <ChevronUp />
                    </button>
                    <button
                        className="player-btn"
                        onClick={() => setShowQueue(v => !v)}
                        title="Queue"
                        style={showQueue ? activeStyle : undefined}
                    >
                        <ListMusic />
                    </button>
                    <div className="player-volume">
                        <button className="player-btn" onClick={() => setVolume(volume === 0 ? 0.75 : 0)}>
                            {volume === 0 ? <VolumeX /> : <Volume2 />}
                        </button>
                        <div className="volume-bar" onClick={handleVolumeClick}>
                            <div className="volume-fill" style={{ width: `${volume * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

interface QueuePanelProps {
    queue: Track[];
    currentId: string;
    onPlay: (track: Track) => void;
    onClose: () => void;
}

function QueuePanel({ queue, currentId, onPlay, onClose }: QueuePanelProps) {
    const currentIdx = queue.findIndex(t => t.id === currentId);
    const upNext = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue;

    return (
        <div
            style={{
                position: 'fixed', right: 16, bottom: 'calc(var(--player-h, 80px) + 12px)',
                width: 'min(380px, calc(100vw - 32px))', maxHeight: '60vh',
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14,
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)', zIndex: 60,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
        >
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderBottom: '1px solid var(--border)',
            }}>
                <strong style={{ fontSize: '0.95rem' }}>Queue</strong>
                <button className="player-btn" onClick={onClose} title="Close" style={{ width: 28, height: 28 }}>
                    <X size={16} />
                </button>
            </div>
            <div style={{ overflowY: 'auto', padding: 8 }}>
                {queue.length === 0 ? (
                    <p className="text-sm text-muted" style={{ padding: 12 }}>Queue is empty.</p>
                ) : (
                    <>
                        <QueueRow label="Now playing" />
                        {currentIdx >= 0 && <QueueItem track={queue[currentIdx]} active onPlay={onPlay} />}
                        {upNext.length > 0 && <QueueRow label="Up next" />}
                        {upNext.map(t => <QueueItem key={t.id} track={t} onPlay={onPlay} />)}
                    </>
                )}
            </div>
        </div>
    );
}

function QueueRow({ label }: { label: string }) {
    return (
        <div className="text-xs text-muted" style={{
            textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 8px 4px',
        }}>{label}</div>
    );
}

function QueueItem({ track, active, onPlay }: {
    track: Track;
    active?: boolean;
    onPlay: (t: Track) => void;
}) {
    return (
        <button
            onClick={() => onPlay(track)}
            style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'var(--surface)' : 'transparent', textAlign: 'left',
                color: 'inherit',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
            <img src={track.coverUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, objectFit: 'cover' }} />
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontSize: '0.85rem', fontWeight: active ? 700 : 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{track.title}</div>
                <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.artist}
                </div>
            </div>
        </button>
    );
}
