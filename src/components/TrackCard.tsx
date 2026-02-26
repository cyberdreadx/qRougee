import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Track } from '../data/mockData';
import { usePlayer } from '../hooks/usePlayer';

interface TrackCardProps {
    track: Track;
    queue?: Track[];
}

export default function TrackCard({ track, queue }: TrackCardProps) {
    const navigate = useNavigate();
    const { play } = usePlayer();

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
            </div>
            <div className="track-card-title">{track.title}</div>
            <div className="track-card-artist">{track.artist}</div>
        </div>
    );
}
