import {
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
    ChevronDown, Volume2, VolumeX, Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../hooks/usePlayer';
import { formatDuration, type Track } from '../data/mockData';
import { coverFallback } from '../utils/coverArt';
import ArtistName from './ArtistName';

/** Full-screen "Now Playing": large artwork, full transport, and the queue. */
export default function NowPlaying({ open, onClose }: { open: boolean; onClose: () => void }) {
    const navigate = useNavigate();
    const {
        currentTrack, queue, isPlaying, progress, duration, volume, shuffle, repeat, autoplay,
        togglePlay, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, toggleAutoplay, play,
    } = usePlayer();

    if (!open || !currentTrack) return null;

    const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
    const active: React.CSSProperties = { background: 'var(--fg)', color: 'var(--accent-fg)', borderRadius: '50%' };
    const bar = (handler: (pct: number) => void) => (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        handler(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    };
    const onImgErr = (t: Track) => (e: React.SyntheticEvent<HTMLImageElement>) => {
        const fb = coverFallback(t.title, t.id);
        if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
    };

    const curIdx = queue.findIndex(t => t.id === currentTrack.id);
    const upNext = curIdx >= 0 ? queue.slice(curIdx + 1) : [];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
                <button className="player-btn" onClick={onClose} title="Collapse"><ChevronDown /></button>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Now Playing</span>
                <span style={{ width: 32 }} />
            </div>

            <div style={{
                flex: 1, display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'center',
                alignItems: 'flex-start', padding: '12px 24px 40px', maxWidth: 1100, margin: '0 auto', width: '100%',
            }}>
                {/* Left: artwork + transport */}
                <div style={{ flex: '1 1 360px', maxWidth: 480, width: '100%' }}>
                    <img
                        src={currentTrack.coverUrl} alt={currentTrack.title} onError={onImgErr(currentTrack)}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
                    />
                    <div style={{ marginTop: 20 }}>
                        <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={() => { onClose(); navigate(`/track/${currentTrack.id}`); }}>
                            {currentTrack.title}
                        </h1>
                        <div className="text-muted" style={{ fontSize: '1rem', marginTop: 4 }}>
                            <ArtistName creator={currentTrack.creator} fallback={currentTrack.artist} />
                        </div>
                    </div>

                    {/* Seek */}
                    <div className="player-progress" style={{ marginTop: 20 }}>
                        <span className="player-time">{formatDuration(progress)}</span>
                        <div className="progress-bar" onClick={bar(seek)}>
                            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="player-time">{formatDuration(duration)}</span>
                    </div>

                    {/* Transport */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 16 }}>
                        <button className="player-btn" onClick={toggleShuffle} title="Shuffle" style={shuffle ? active : undefined}><Shuffle /></button>
                        <button className="player-btn" onClick={prev} title="Previous"><SkipBack /></button>
                        <button className="player-btn-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'} style={{ transform: 'scale(1.2)' }}>
                            {isPlaying ? <Pause /> : <Play />}
                        </button>
                        <button className="player-btn" onClick={next} title="Next"><SkipForward /></button>
                        <button className="player-btn" onClick={cycleRepeat} title="Repeat" style={repeat !== 'off' ? active : undefined}>
                            {repeat === 'one' ? <Repeat1 /> : <Repeat />}
                        </button>
                    </div>

                    {/* Volume */}
                    <div className="player-volume" style={{ justifyContent: 'center', marginTop: 16 }}>
                        <button className="player-btn" onClick={() => setVolume(volume === 0 ? 0.75 : 0)}>
                            {volume === 0 ? <VolumeX /> : <Volume2 />}
                        </button>
                        <div className="volume-bar" onClick={bar(setVolume)} style={{ maxWidth: 160 }}>
                            <div className="volume-fill" style={{ width: `${volume * 100}%` }} />
                        </div>
                    </div>

                    {/* Autoplay / radio */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <button
                            className="btn btn-secondary"
                            onClick={toggleAutoplay}
                            title="Keep playing related tracks when the queue ends"
                            style={{ padding: '6px 14px', fontSize: '0.8rem', ...(autoplay ? { background: 'var(--fg)', color: 'var(--accent-fg)' } : {}) }}
                        >
                            <Radio size={14} /> Autoplay {autoplay ? 'On' : 'Off'}
                        </button>
                    </div>
                </div>

                {/* Right: Up Next */}
                <div style={{ flex: '1 1 300px', maxWidth: 420, width: '100%' }}>
                    <h3 style={{ marginBottom: 12 }}>Up Next</h3>
                    {upNext.length === 0 ? (
                        <p className="text-sm text-muted">End of queue.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {upNext.map(t => (
                                <button key={t.id} onClick={() => play(t)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 8,
                                    border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit',
                                    borderRadius: 8, textAlign: 'left',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                    <img src={t.coverUrl} alt="" onError={onImgErr(t)} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                                        <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <ArtistName creator={t.creator} fallback={t.artist} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
