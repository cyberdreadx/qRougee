import TrackCard from '../components/TrackCard';
import { MOCK_TRACKS, MOCK_ARTISTS } from '../data/mockData';
import { usePlayer } from '../hooks/usePlayer';

export default function Home() {
    const { play } = usePlayer();
    const trending = MOCK_TRACKS.slice(0, 8);
    const newReleases = MOCK_TRACKS.slice(4, 10);

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
                        onClick={() => play(trending[0], trending)}
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
                    <div className="stat-value">{MOCK_TRACKS.length}</div>
                    <div className="stat-label">Tracks</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{MOCK_ARTISTS.length}</div>
                    <div className="stat-label">Artists</div>
                </div>
                <div className="stat">
                    <div className="stat-value">1.2K</div>
                    <div className="stat-label">Listeners</div>
                </div>
                <div className="stat">
                    <div className="stat-value">XRGE</div>
                    <div className="stat-label">Powered By</div>
                </div>
            </div>

            {/* Trending Tracks */}
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

            {/* New Releases */}
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

            {/* Top Artists */}
            <div className="section">
                <div className="section-header">
                    <h2>Top Artists</h2>
                </div>
                <div className="artist-grid">
                    {MOCK_ARTISTS.map(artist => (
                        <div className="artist-card" key={artist.id}>
                            <div className="artist-avatar">
                                <img src={artist.avatarUrl} alt={artist.name} />
                            </div>
                            <div className="artist-name">{artist.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
