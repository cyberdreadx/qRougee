import { useParams, useNavigate } from 'react-router-dom';
import { Play, ExternalLink, Users, Music, Shield, Clock } from 'lucide-react';
import { MOCK_ARTISTS, MOCK_TRACKS, formatDuration } from '../data/mockData';
import { usePlayer } from '../hooks/usePlayer';
import TrackCard from '../components/TrackCard';

export default function ArtistProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { play } = usePlayer();

    const artist = MOCK_ARTISTS.find(a => a.id === id);
    const artistTracks = MOCK_TRACKS.filter(t => t.artist === artist?.name);

    if (!artist) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <Users size={48} />
                    <h3>Artist not found</h3>
                    <p>This artist doesn't exist or has been removed.</p>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const totalDuration = artistTracks.reduce((sum, t) => sum + t.duration, 0);

    const handlePlayAll = () => {
        if (artistTracks.length > 0) {
            play(artistTracks[0], artistTracks);
        }
    };

    return (
        <div className="page-container">
            {/* Artist Header */}
            <div className="artist-profile-header">
                <div className="artist-profile-avatar">
                    <img src={artist.avatarUrl} alt={artist.name} />
                </div>
                <div className="artist-profile-info">
                    <div className="artist-profile-type">
                        {artist.verified && <Shield size={12} />}
                        {artist.verified ? 'Verified Artist' : 'Artist'}
                    </div>
                    <h1 className="artist-profile-name">{artist.name}</h1>
                    <p className="artist-profile-bio">{artist.bio}</p>
                    <div className="artist-profile-meta">
                        <span><Users size={14} /> {artist.listeners.toLocaleString()} listeners</span>
                        <span><Music size={14} /> {artist.trackCount} tracks</span>
                        <span><Clock size={14} /> {formatDuration(totalDuration)} total</span>
                    </div>
                    <div className="artist-profile-actions">
                        <button className="btn btn-primary" onClick={handlePlayAll}>
                            <Play size={16} /> Play All
                        </button>
                        <button className="btn btn-secondary">Follow</button>
                    </div>
                </div>
            </div>

            {/* On-Chain Info */}
            <div className="chain-info" style={{ marginBottom: 32, marginTop: 0 }}>
                <div className="chain-info-title">
                    <ExternalLink size={14} /> On-Chain Identity
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Wallet</span>
                    <span className="chain-info-value">{artist.walletAddress}</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Network</span>
                    <span className="chain-info-value">RougeChain Testnet</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Collections Minted</span>
                    <span className="chain-info-value">{new Set(artistTracks.map(t => t.collectionId)).size}</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Tokens Created</span>
                    <span className="chain-info-value">{artistTracks.length}</span>
                </div>
            </div>

            {/* Discography */}
            <div className="section">
                <div className="section-header">
                    <h2>Discography</h2>
                </div>

                {/* Track list */}
                <div className="track-list">
                    <div className="track-list-header">
                        <span>#</span>
                        <span>Title</span>
                        <span>Album</span>
                        <span>Duration</span>
                    </div>
                    {artistTracks.map((track, idx) => (
                        <div
                            key={track.id}
                            className="track-list-item"
                            onClick={() => navigate(`/track/${track.id}`)}
                        >
                            <span className="track-list-num">{idx + 1}</span>
                            <div className="track-list-info">
                                <div className="track-list-thumb">
                                    <img src={track.coverUrl} alt={track.title} />
                                </div>
                                <div>
                                    <div className="track-list-name">{track.title}</div>
                                    <div className="track-list-artist-name">{track.genre}</div>
                                </div>
                            </div>
                            <span className="track-list-artist-name">{track.album}</span>
                            <span className="track-list-duration">{formatDuration(track.duration)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Popular Tracks as Cards */}
            {artistTracks.length > 2 && (
                <div className="section">
                    <div className="section-header">
                        <h2>Popular</h2>
                    </div>
                    <div className="track-grid">
                        {artistTracks.slice(0, 4).map(track => (
                            <TrackCard key={track.id} track={track} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
