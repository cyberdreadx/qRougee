import { useNavigate } from 'react-router-dom';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../hooks/usePlayer';
import { useNftTracks } from '../hooks/useNftTracks';

export default function Home() {
    const { play } = usePlayer();
    const navigate = useNavigate();
    const { tracks, isLoading } = useNftTracks();
    const trending = tracks.slice(0, 8);
    const newReleases = tracks.slice(4, 10);

    // Derive unique artists from on-chain track data
    const artistMap = new Map<string, { name: string; coverUrl: string; trackCount: number }>();
    for (const track of tracks) {
        const existing = artistMap.get(track.artist);
        if (existing) {
            existing.trackCount++;
        } else {
            artistMap.set(track.artist, {
                name: track.artist,
                coverUrl: track.coverUrl,
                trackCount: 1,
            });
        }
    }
    const artists = Array.from(artistMap.values());

    return (
        <div className="page-container">
            {/* Hero */}
            <div className="hero">
                <h1>Decentralized Music, Owned by Artists</h1>
                <p>
                    Stream tracks minted as NFTs on RougeChain. Every play is transparent.
                    Every artist keeps their keys.
                </p>
                <div className="hero-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => { if (trending.length > 0) play(trending[0], trending); }}
                    >
                        Start Listening
                    </button>
                    <a href="/upload" className="btn btn-secondary">
                        Mint a Track
                    </a>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="stat">
                    <div className="stat-value">{isLoading ? '...' : tracks.length}</div>
                    <div className="stat-label">Tracks</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{isLoading ? '...' : artists.length}</div>
                    <div className="stat-label">Artists</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{isLoading ? '...' : new Set(tracks.map(t => t.collectionId).filter(Boolean)).size}</div>
                    <div className="stat-label">Collections</div>
                </div>
                <div className="stat">
                    <div className="stat-value">XRGE</div>
                    <div className="stat-label">Powered By</div>
                </div>
            </div>

            {/* Trending Tracks */}
            {trending.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h2>Trending Tracks</h2>
                        <a href="/search" className="section-link">
                            See all →
                        </a>
                    </div>
                    <div className="track-grid">
                        {trending.map(track => (
                            <TrackCard key={track.id} track={track} queue={trending} />
                        ))}
                    </div>
                </div>
            )}

            {/* New Releases */}
            {newReleases.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h2>New Releases</h2>
                    </div>
                    <div className="track-grid">
                        {newReleases.map(track => (
                            <TrackCard key={track.id} track={track} queue={newReleases} />
                        ))}
                    </div>
                </div>
            )}

            {/* Artists */}
            {artists.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h2>Artists</h2>
                    </div>
                    <div className="artist-grid">
                        {artists.map(artist => (
                            <div
                                className="artist-card"
                                key={artist.name}
                                onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                            >
                                <div className="artist-avatar">
                                    <img src={artist.coverUrl} alt={artist.name}
                                        style={{ objectFit: 'cover' }} />
                                </div>
                                <div className="artist-name">{artist.name}</div>
                                <div className="text-xs text-muted">{artist.trackCount} track{artist.trackCount !== 1 ? 's' : ''}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading state */}
            {isLoading && tracks.length === 0 && (
                <div className="empty-state" style={{ paddingTop: 40 }}>
                    <p className="text-muted">Loading tracks from RougeChain...</p>
                </div>
            )}

            {!isLoading && tracks.length === 0 && (
                <div className="empty-state" style={{ paddingTop: 40 }}>
                    <p className="text-muted" style={{ marginBottom: 16 }}>No tracks on chain yet. Be the first!</p>
                    <a href="/upload" className="btn btn-primary">Mint a Track</a>
                </div>
            )}
        </div>
    );
}
