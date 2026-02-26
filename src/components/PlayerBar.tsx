import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { formatDuration } from '../data/mockData';

export default function PlayerBar() {
    const {
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        togglePlay,
        next,
        prev,
        seek,
        setVolume,
    } = usePlayer();

    if (!currentTrack) {
        return (
            <div className="player-bar" style={{ opacity: 0.5 }}>
                <div className="player-track-info">
                    <div className="player-thumb" />
                    <div className="player-track-text">
                        <div className="player-track-title" style={{ color: 'var(--muted)' }}>
                            No track selected
                        </div>
                        <div className="player-track-artist">—</div>
                    </div>
                </div>
                <div className="player-controls">
                    <div className="player-buttons">
                        <button className="player-btn" disabled><SkipBack /></button>
                        <button className="player-btn-play" disabled style={{ opacity: 0.4 }}><Play /></button>
                        <button className="player-btn" disabled><SkipForward /></button>
                    </div>
                    <div className="player-progress">
                        <span className="player-time">0:00</span>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '0%' }} />
                        </div>
                        <span className="player-time">0:00</span>
                    </div>
                </div>
                <div className="player-volume">
                    <Volume2 />
                    <div className="volume-bar">
                        <div className="volume-fill" style={{ width: '75%' }} />
                    </div>
                </div>
            </div>
        );
    }

    const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

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
        <div className="player-bar">
            <div className="player-track-info">
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
                    <button className="player-btn" onClick={prev}>
                        <SkipBack />
                    </button>
                    <button className="player-btn-play" onClick={togglePlay}>
                        {isPlaying ? <Pause /> : <Play />}
                    </button>
                    <button className="player-btn" onClick={next}>
                        <SkipForward />
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

            <div className="player-volume">
                <button className="player-btn" onClick={() => setVolume(volume === 0 ? 0.75 : 0)}>
                    {volume === 0 ? <VolumeX /> : <Volume2 />}
                </button>
                <div className="volume-bar" onClick={handleVolumeClick}>
                    <div className="volume-fill" style={{ width: `${volume * 100}%` }} />
                </div>
            </div>
        </div>
    );
}
