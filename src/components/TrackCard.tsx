import { useState, useEffect } from 'react';
import { Play, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Track } from '../data/mockData';
import { usePlayer } from '../hooks/usePlayer';
import { useRougeChain } from '../hooks/useRougeChain';
import type { TrackStats } from '@rougechain/sdk';

interface TrackCardProps {
    track: Track;
    queue?: Track[];
}

export default function TrackCard({ track, queue }: TrackCardProps) {
    const navigate = useNavigate();
    const { play } = usePlayer();
    const rc = useRougeChain();
    const [stats, setStats] = useState<TrackStats | null>(null);

    useEffect(() => {
        let cancelled = false;
        rc.social.getTrackStats(track.id).then(s => { if (!cancelled) setStats(s); }).catch(() => {});
        return () => { cancelled = true; };
    }, [track.id, rc]);

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        play(track, queue);
    };

    return (
        <div className="track-card" onClick={() => navigate(`/track/${track.id}`)}>
            <div className="track-card-art">
                <img src={track.coverUrl} alt={track.title} />
                <button className="track-card-play" onClick={handlePlay}>
                    <Play />
                </button>
                {stats && (stats.plays > 0 || stats.likes > 0) && (
                    <div style={{
                        position: 'absolute', bottom: 6, left: 6, right: 6,
                        display: 'flex', gap: 8, fontSize: '0.65rem',
                        color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                        pointerEvents: 'none',
                    }}>
                        {stats.plays > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Play size={10} fill="#fff" /> {stats.plays.toLocaleString()}
                            </span>
                        )}
                        {stats.likes > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Heart size={10} fill="#fff" /> {stats.likes.toLocaleString()}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className="track-card-title">{track.title}</div>
            <div className="track-card-artist">{track.artist}</div>
        </div>
    );
}
