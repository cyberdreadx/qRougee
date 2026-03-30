import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TrackCard from '../components/TrackCard';
import { usePlayer } from '../hooks/usePlayer';
import { useNftTracks } from '../hooks/useNftTracks';
import { useRougeChain } from '../hooks/useRougeChain';
import { useAnimeEntrance } from '../hooks/useAnimeEntrance';
import type { Track } from '../data/mockData';

export default function Home() {
    const { play } = usePlayer();
    const navigate = useNavigate();
    const { tracks, isLoading } = useNftTracks();
    const rc = useRougeChain();
    const rootRef = useAnimeEntrance<HTMLDivElement>({ staggerMs: 55, duration: 450, deps: [tracks.length] });

    const [popular, setPopular] = useState<Track[]>([]);
    const [popularLoaded, setPopularLoaded] = useState(false);

    useEffect(() => {
        if (tracks.length === 0) return;
        let cancelled = false;
        (async () => {
            const scored: { track: Track; score: number }[] = [];
            for (const t of tracks) {
                try {
                    const s = await rc.social.getTrackStats(t.id);
                    scored.push({ track: t, score: (s.plays || 0) + (s.likes || 0) * 3 });
                } catch {
                    scored.push({ track: t, score: 0 });
                }
            }
            if (cancelled) return;
            scored.sort((a, b) => b.score - a.score);
            setPopular(scored.map(s => s.track));
            setPopularLoaded(true);
        })();
        return () => { cancelled = true; };
    }, [tracks, rc]);

    const trending = popularLoaded ? popular.slice(0, 8) : tracks.slice(0, 8);
    const newReleases = tracks.slice(0, 6);

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
        <div className="page-container" ref={rootRef}>
            {/* Hero */}
            <div className="hero anime-stagger-item">
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
                    <Link to="/upload" className="btn btn-secondary">
                        Mint a Track
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-row anime-stagger-item">
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
                <div className="section anime-stagger-item">
                    <div className="section-header">
                        <h2>{popularLoaded ? 'Popular Tracks' : 'Trending Tracks'}</h2>
                        <Link to="/search" className="section-link">
                            See all →
                        </Link>
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
                <div className="section anime-stagger-item">
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
                <div className="section anime-stagger-item">
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
                    <Link to="/upload" className="btn btn-primary">Mint a Track</Link>
                </div>
            )}
        </div>
    );
}
