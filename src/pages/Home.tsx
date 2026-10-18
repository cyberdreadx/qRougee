import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Shuffle } from 'lucide-react';
import TrackCard from '../components/TrackCard';
import TrackRow from '../components/TrackRow';
import { usePlayer } from '../hooks/usePlayer';
import { useNftTracks } from '../hooks/useNftTracks';
import { useRougeChain } from '../hooks/useRougeChain';
import { useAnimeEntrance } from '../hooks/useAnimeEntrance';
import CoverBackdrop from '../components/CoverBackdrop';
import { coverFallback } from '../utils/coverArt';
import type { Track } from '../data/mockData';

export default function Home() {
    const { play, shuffle, toggleShuffle } = usePlayer();
    const navigate = useNavigate();
    const { tracks, isLoading, error, refetch } = useNftTracks();
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

    const trending = popularLoaded ? popular.slice(0, 10) : tracks.slice(0, 10);
    const newReleases = tracks.slice(0, 10);

    const shufflePlay = () => {
        if (trending.length === 0) return;
        if (!shuffle) toggleShuffle();
        play(trending[Math.floor(Math.random() * trending.length)], trending);
    };

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
            {/* Compact featured header */}
            <div className="home-feature anime-stagger-item" style={{ position: 'relative', isolation: 'isolate' }}>
                <CoverBackdrop image={trending[0]?.coverUrl} opacity={0.5} fade="bottom" />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="home-feature-kicker">On-chain music · RougeChain</div>
                    <h1 className="home-feature-title">Stream</h1>
                    <div className="home-feature-actions">
                        <button className="btn btn-primary" onClick={() => { if (trending.length) play(trending[0], trending); }}>
                            <Play size={15} /> Play all
                        </button>
                        <button className="btn btn-secondary" onClick={shufflePlay} disabled={trending.length === 0}>
                            <Shuffle size={15} /> Shuffle
                        </button>
                    </div>
                </div>
            </div>

            {/* Trending — SoundCloud-style waveform rows */}
            {trending.length > 0 && (
                <div className="section anime-stagger-item">
                    <div className="section-header">
                        <h2>{popularLoaded ? 'Popular' : 'Trending'}</h2>
                        <Link to="/search" className="section-link">See all →</Link>
                    </div>
                    <div className="track-rows">
                        {trending.map(track => (
                            <TrackRow key={track.id} track={track} queue={trending} />
                        ))}
                    </div>
                </div>
            )}

            {/* New Releases — artwork carousel */}
            {newReleases.length > 0 && (
                <div className="section anime-stagger-item">
                    <div className="section-header">
                        <h2>New Releases</h2>
                    </div>
                    <div className="hscroll">
                        {newReleases.map(track => (
                            <div className="hscroll-item" key={track.id}>
                                <TrackCard track={track} queue={newReleases} />
                            </div>
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
                                    <img src={artist.coverUrl || coverFallback(artist.name, artist.name)} alt={artist.name}
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
                    {error ? (
                        <>
                            <p className="text-muted" style={{ marginBottom: 16 }}>
                                Couldn’t reach RougeChain. The node may be down or switching networks.
                            </p>
                            <button className="btn btn-primary" onClick={() => refetch({ force: true })}>Retry</button>
                        </>
                    ) : (
                        <>
                            <p className="text-muted" style={{ marginBottom: 16 }}>No tracks on chain yet. Be the first!</p>
                            <Link to="/upload" className="btn btn-primary">Mint a Track</Link>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
