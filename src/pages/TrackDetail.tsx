import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Pause, ArrowLeft, Coins, Shield, Lock, ExternalLink } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { useNftTracks } from '../hooks/useNftTracks';
import { MOCK_TRACKS, formatDuration } from '../data/mockData';
import { explorerUrl } from '../utils/explorer';
import { useAnimeEntrance } from '../hooks/useAnimeEntrance';

export default function TrackDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { play, pause, currentTrack, isPlaying } = usePlayer();
    const { tracks: nftTracks } = useNftTracks();
    const rootRef = useAnimeEntrance<HTMLDivElement>({ staggerMs: 60, duration: 500, deps: [id] });

    const allTracks = [...MOCK_TRACKS, ...nftTracks];
    const track = allTracks.find(t => t.id === id);

    if (!track) {
        return (
            <div className="page-container">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="empty-state" style={{ paddingTop: 80 }}>
                    <h3>Track not found</h3>
                </div>
            </div>
        );
    }

    const isCurrent = currentTrack?.id === track.id;
    const isCurrentPlaying = isCurrent && isPlaying;
    const relatedTracks = allTracks.filter(t => t.artist === track.artist && t.id !== track.id);

    return (
        <div className="page-container" ref={rootRef}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
                <ArrowLeft size={16} /> Back
            </button>

            <div className="track-detail-hero anime-stagger-item">
                <div className="track-detail-cover">
                    <img src={track.coverUrl} alt={track.title} />
                </div>
                <div className="track-detail-info">
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {track.tokenSymbol ? 'Tokenized Track' : 'Track'}
                    </div>
                    <h1>{track.title}</h1>
                    <p className="track-detail-meta">
                        <Link to={`/artist/${encodeURIComponent(track.artist)}`} style={{ fontWeight: 600 }}>
                            {track.artist}
                        </Link>
                        <span>·</span>
                        <span>{track.album}</span>
                        <span>·</span>
                        <span>{formatDuration(track.duration)}</span>
                        {track.genre && <><span>·</span><span>{track.genre}</span></>}
                    </p>
                    <div className="track-detail-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => isCurrentPlaying ? pause() : play(track, allTracks)}
                        >
                            {isCurrentPlaying ? <Pause size={18} /> : <Play size={18} />}
                            {isCurrentPlaying ? 'Pause' : 'Play'}
                        </button>
                        {track.tokenSymbol && (
                            <Link to="/trade" className="btn btn-secondary">
                                <Coins size={16} /> Buy {track.tokenSymbol}
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* On-Chain Details */}
            <div className="section anime-stagger-item" style={{ marginTop: 32 }}>
                <h3 style={{ marginBottom: 16 }}>
                    <Shield size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                    On-Chain Details
                </h3>
                <div className="chain-info">
                    {track.collectionId && (
                        <div className="chain-info-row">
                            <span className="chain-info-label">Collection</span>
                            <span className="chain-info-value">
                                <a href={explorerUrl('collection', track.collectionId)}
                                   target="_blank" rel="noopener noreferrer"
                                   style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {track.collectionId}
                                    <ExternalLink size={10} style={{ opacity: 0.5 }} />
                                </a>
                            </span>
                        </div>
                    )}
                    {track.tokenId && (
                        <div className="chain-info-row">
                            <span className="chain-info-label">Token ID</span>
                            <span className="chain-info-value">{track.tokenId}</span>
                        </div>
                    )}
                    {track.owner && (
                        <div className="chain-info-row">
                            <span className="chain-info-label">NFT Owner</span>
                            <span className="chain-info-value">
                                <a href={explorerUrl('address', track.owner)}
                                   target="_blank" rel="noopener noreferrer"
                                   style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {track.owner}
                                    <ExternalLink size={10} style={{ opacity: 0.5 }} />
                                </a>
                            </span>
                        </div>
                    )}
                    {track.mintDate && (
                        <div className="chain-info-row">
                            <span className="chain-info-label">Mint Date</span>
                            <span className="chain-info-value">{track.mintDate}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tokenomics */}
            {track.tokenSymbol && (
                <div className="section anime-stagger-item">
                    <h3 style={{ marginBottom: 16 }}>
                        <Coins size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                        Song Tokenomics
                    </h3>
                    <div className="chain-info">
                        <div className="chain-info-row">
                            <span className="chain-info-label">Song Token</span>
                            <span className="chain-info-value">{track.tokenSymbol}</span>
                        </div>
                        <div className="chain-info-row">
                            <span className="chain-info-label">Total Supply</span>
                            <span className="chain-info-value">{(track.tokenSupply || 0).toLocaleString()}</span>
                        </div>
                        {track.playGateThreshold && track.playGateThreshold > 0 && (
                            <div className="chain-info-row">
                                <span className="chain-info-label">
                                    <Lock size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                                    Play Gate
                                </span>
                                <span className="chain-info-value">
                                    Hold {track.playGateThreshold} {track.tokenSymbol} for unlimited
                                </span>
                            </div>
                        )}
                        {track.premiumThreshold && track.premiumThreshold > 0 && (
                            <div className="chain-info-row">
                                <span className="chain-info-label">Premium Access</span>
                                <span className="chain-info-value">
                                    Hold {track.premiumThreshold} {track.tokenSymbol} for stems & exclusives
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Royalty Split Visual */}
                    {track.royaltySplit && (
                        <div style={{ marginTop: 16 }}>
                            <div className="text-xs font-semibold" style={{ marginBottom: 8 }}>Royalty Split</div>
                            <div className="split-bar" style={{ marginBottom: 8 }}>
                                <div style={{ width: `${track.royaltySplit.artist}%`, background: 'var(--accent)' }} />
                                <div style={{ width: `${track.royaltySplit.tokenHolders}%`, background: '#8b5cf6' }} />
                                <div style={{ width: `${track.royaltySplit.collaborators}%`, background: '#06b6d4' }} />
                                <div style={{ width: `${track.royaltySplit.platform}%`, background: '#64748b' }} />
                            </div>
                            <div className="split-legend">
                                <span><span className="split-dot" style={{ background: 'var(--accent)' }} /> Artist {track.royaltySplit.artist}%</span>
                                <span><span className="split-dot" style={{ background: '#8b5cf6' }} /> Holders {track.royaltySplit.tokenHolders}%</span>
                                <span><span className="split-dot" style={{ background: '#06b6d4' }} /> Collabs {track.royaltySplit.collaborators}%</span>
                                <span><span className="split-dot" style={{ background: '#64748b' }} /> Platform {track.royaltySplit.platform}%</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Related Tracks */}
            {relatedTracks.length > 0 && (
                <div className="section anime-stagger-item">
                    <h3 style={{ marginBottom: 16 }}>More by {track.artist}</h3>
                    <div className="track-list">
                        {relatedTracks.map((t, i) => (
                            <div key={t.id} className="track-list-item" onClick={() => navigate(`/track/${t.id}`)}>
                                <div className="track-list-num">{i + 1}</div>
                                <div className="track-list-info">
                                    <div className="track-list-thumb">
                                        <img src={t.coverUrl} alt={t.title} />
                                    </div>
                                    <div>
                                        <div className="track-list-name">{t.title}</div>
                                        <div className="track-list-artist-name">{t.album}</div>
                                    </div>
                                </div>
                                <div className="track-list-artist-name">{t.tokenSymbol || '—'}</div>
                                <div className="track-list-duration">{formatDuration(t.duration)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
