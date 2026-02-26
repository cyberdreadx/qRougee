import { useParams, useNavigate } from 'react-router-dom';
import { Play, Heart, ArrowLeft, ExternalLink, Clock, Music, Disc } from 'lucide-react';
import { MOCK_TRACKS, formatDuration } from '../data/mockData';
import { usePlayer } from '../hooks/usePlayer';

export default function TrackDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { play, currentTrack, isPlaying, togglePlay } = usePlayer();

    const track = MOCK_TRACKS.find(t => t.id === id);

    if (!track) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <Music />
                    <h3>Track not found</h3>
                    <p>This track doesn't exist or has been removed.</p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/')}
                        style={{ marginTop: 16 }}
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const isCurrentTrack = currentTrack?.id === track.id;

    const handlePlay = () => {
        if (isCurrentTrack) {
            togglePlay();
        } else {
            play(track, MOCK_TRACKS);
        }
    };

    // Get more tracks by the same artist
    const moreBySameArtist = MOCK_TRACKS.filter(
        t => t.artist === track.artist && t.id !== track.id
    );

    return (
        <div className="page-container">
            {/* Back Button */}
            <button
                className="btn btn-ghost"
                onClick={() => navigate(-1)}
                style={{ marginBottom: 24, marginLeft: -12 }}
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {/* Track Detail Header */}
            <div className="track-detail">
                <div className="track-detail-art">
                    <img src={track.coverUrl} alt={track.title} />
                </div>
                <div className="track-detail-info">
                    <div className="track-detail-type">NFT Track</div>
                    <h1 className="track-detail-title">{track.title}</h1>
                    <div className="track-detail-artist">{track.artist} · {track.album}</div>
                    <div className="track-detail-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={14} />
                            {formatDuration(track.duration)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Disc size={14} />
                            {track.genre}
                        </span>
                        <span className="badge">{track.mintDate}</span>
                    </div>
                    <div className="track-detail-actions">
                        <button className="btn btn-primary" onClick={handlePlay}>
                            {isCurrentTrack && isPlaying ? (
                                <>Pause</>
                            ) : (
                                <>
                                    <Play size={16} />
                                    Play
                                </>
                            )}
                        </button>
                        <button className="btn btn-secondary">
                            <Heart size={16} />
                            Like
                        </button>
                    </div>
                </div>
            </div>

            {/* On-chain Info */}
            <div className="chain-info">
                <div className="chain-info-title">
                    <ExternalLink size={14} />
                    On-Chain Details
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Collection ID</span>
                    <span className="chain-info-value">{track.collectionId || '—'}</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Token ID</span>
                    <span className="chain-info-value">{track.tokenId || '—'}</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Owner</span>
                    <span className="chain-info-value">{track.owner || '—'}</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Network</span>
                    <span className="chain-info-value">RougeChain Testnet</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Signature Scheme</span>
                    <span className="chain-info-value">ML-DSA-65 (CRYSTALS-Dilithium)</span>
                </div>
            </div>

            {/* More by Artist */}
            {moreBySameArtist.length > 0 && (
                <div className="section" style={{ marginTop: 40 }}>
                    <div className="section-header">
                        <h2>More by {track.artist}</h2>
                    </div>
                    <div className="track-list">
                        {moreBySameArtist.map((t, idx) => (
                            <div
                                key={t.id}
                                className="track-list-item"
                                onClick={() => navigate(`/track/${t.id}`)}
                            >
                                <span className="track-list-num">{idx + 1}</span>
                                <div className="track-list-info">
                                    <div className="track-list-thumb">
                                        <img src={t.coverUrl} alt={t.title} />
                                    </div>
                                    <div>
                                        <div className="track-list-name">{t.title}</div>
                                        <div className="track-list-artist-name">{t.album}</div>
                                    </div>
                                </div>
                                <span className="track-list-artist-name">{t.genre}</span>
                                <span className="track-list-duration">{formatDuration(t.duration)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
