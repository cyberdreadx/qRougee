import { useState, useEffect, memo } from 'react';
import { Play, Pause, Heart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Track } from '../data/mockData';
import { usePlayer } from '../hooks/usePlayer';
import { useRougeChain } from '../hooks/useRougeChain';
import { coverFallback } from '../utils/coverArt';
import { getWaveform } from '../utils/waveform';
import ArtistName from './ArtistName';
import type { TrackStats } from '@rougechain/sdk';

/** SoundCloud-style track row: artwork, artist · title, a waveform, play/like counts. */
function TrackRow({ track, queue, onRemove }: { track: Track; queue?: Track[]; onRemove?: () => void }) {
    const navigate = useNavigate();
    const { play, pause, seek, currentTrack, isPlaying, progress, duration } = usePlayer();
    const rc = useRougeChain();
    const [stats, setStats] = useState<TrackStats | null>(null);

    useEffect(() => {
        let cancelled = false;
        rc.social.getTrackStats(track.id).then(s => { if (!cancelled) setStats(s); }).catch(() => {});
        return () => { cancelled = true; };
    }, [track.id, rc]);

    const isCurrent = currentTrack?.id === track.id;
    const playing = isCurrent && isPlaying;
    const playedPct = isCurrent && duration > 0 ? (progress / duration) * 100 : 0;
    const peaks = getWaveform(track);

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (playing) pause();
        else play(track, queue);
    };

    // Click the waveform of the playing track to seek (SoundCloud-style). For a
    // track that isn't current, let the click bubble up and start it.
    const onWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isCurrent || duration <= 0) return;
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
    };

    return (
        <div className="scrow" onClick={() => play(track, queue)}>
            <div className="scrow-art">
                <img
                    src={track.coverUrl || coverFallback(track.title, track.id)} alt={track.title} loading="lazy"
                    onError={e => { const fb = coverFallback(track.title, track.id); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; }}
                />
                <button className="scrow-play" onClick={toggle} title={playing ? 'Pause' : 'Play'}>
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
            </div>

            <div className="scrow-body">
                <div className="scrow-head">
                    <div className="scrow-meta">
                        <span
                            className="scrow-artist"
                            onClick={e => { e.stopPropagation(); navigate(`/artist/${encodeURIComponent(track.artist)}`); }}
                        >
                            <ArtistName creator={track.creator} fallback={track.artist} />
                        </span>
                        <span
                            className="scrow-title"
                            onClick={e => { e.stopPropagation(); navigate(`/track/${track.id}`); }}
                        >{track.title}</span>
                    </div>
                    {stats && (
                        <div className="scrow-stats">
                            {stats.plays > 0 && <span><Play size={11} /> {stats.plays.toLocaleString()}</span>}
                            {stats.likes > 0 && <span><Heart size={11} /> {stats.likes.toLocaleString()}</span>}
                        </div>
                    )}
                </div>

                <div
                    className="scrow-wave"
                    aria-hidden
                    onClick={onWaveClick}
                    style={isCurrent ? { cursor: 'pointer' } : undefined}
                >
                    {peaks.map((p, i) => {
                        const played = (i / peaks.length) * 100 < playedPct;
                        return (
                            <span
                                key={i}
                                className={`scrow-bar${isCurrent && played ? ' played' : ''}`}
                                style={{ height: `${Math.round(Math.max(10, p * 100))}%` }}
                            />
                        );
                    })}
                </div>
            </div>

            {onRemove && (
                <button
                    className="scrow-remove"
                    title="Remove"
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

export default memo(TrackRow);
