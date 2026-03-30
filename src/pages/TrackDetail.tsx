import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, ArrowLeft, Coins, Shield, Lock, ExternalLink, Heart, MessageCircle, Send, Trash2, Loader } from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import { useNftTracks } from '../hooks/useNftTracks';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import * as ext from '../utils/extensionSigner';
import { MOCK_TRACKS, formatDuration } from '../data/mockData';
import { explorerUrl } from '../utils/explorer';
import { useAnimeEntrance } from '../hooks/useAnimeEntrance';
import type { TrackStats, SocialComment } from '@rougechain/sdk';

export default function TrackDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { play, pause, currentTrack, isPlaying } = usePlayer();
    const { tracks: nftTracks } = useNftTracks();
    const { walletKeys, isExtensionWallet } = useWallet();
    const rc = useRougeChain();
    const rootRef = useAnimeEntrance<HTMLDivElement>({ staggerMs: 60, duration: 500, deps: [id, nftTracks.length] });

    const allTracks = [...MOCK_TRACKS, ...nftTracks];
    const track = allTracks.find(t => t.id === id);

    // Social state
    const [stats, setStats] = useState<TrackStats>({ plays: 0, likes: 0, commentCount: 0, liked: false });
    const [comments, setComments] = useState<SocialComment[]>([]);
    const [commentBody, setCommentBody] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);
    const [tipAmount, setTipAmount] = useState('');
    const [tipOpen, setTipOpen] = useState(false);
    const [tipLoading, setTipLoading] = useState(false);
    const [tipResult, setTipResult] = useState<string | null>(null);

    const loadSocial = useCallback(async () => {
        if (!id) return;
        try {
            const s = await rc.social.getTrackStats(id, walletKeys?.publicKey);
            setStats(s);
        } catch { /* ignore */ }
        try {
            const c = await rc.social.getComments(id, 50, 0);
            setComments(c);
        } catch { /* ignore */ }
    }, [id, walletKeys?.publicKey, rc]);

    useEffect(() => { loadSocial(); }, [loadSocial]);

    const handleLike = async () => {
        if (!walletKeys || !id || likeLoading) return;
        setLikeLoading(true);
        try {
            const res = isExtensionWallet
                ? await ext.socialToggleLike(walletKeys.publicKey, id)
                : await rc.social.toggleLike(walletKeys, id);
            if (res.success) {
                setStats(prev => ({
                    ...prev,
                    liked: (res as any).liked ?? !prev.liked,
                    likes: (res as any).likes ?? prev.likes,
                }));
            }
        } catch { /* ignore */ }
        setLikeLoading(false);
    };

    const handleComment = async () => {
        if (!walletKeys || !id || !commentBody.trim() || commentLoading) return;
        setCommentLoading(true);
        try {
            const res = isExtensionWallet
                ? await ext.socialPostComment(walletKeys.publicKey, id, commentBody.trim())
                : await rc.social.postComment(walletKeys, id, commentBody.trim());
            if (res.success && (res as any).comment) {
                setComments(prev => [...prev, (res as any).comment!]);
                setCommentBody('');
                setStats(prev => ({ ...prev, commentCount: prev.commentCount + 1 }));
            }
        } catch { /* ignore */ }
        setCommentLoading(false);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!walletKeys) return;
        try {
            const res = isExtensionWallet
                ? await ext.socialDeleteComment(walletKeys.publicKey, commentId)
                : await rc.social.deleteComment(walletKeys, commentId);
            if (res.success) {
                setComments(prev => prev.filter(c => c.id !== commentId));
                setStats(prev => ({ ...prev, commentCount: Math.max(0, prev.commentCount - 1) }));
            }
        } catch { /* ignore */ }
    };

    const handleTip = async () => {
        if (!walletKeys || !track?.owner || tipLoading) return;
        const amt = parseFloat(tipAmount);
        if (isNaN(amt) || amt <= 0) return;
        setTipLoading(true);
        setTipResult(null);
        try {
            const res = isExtensionWallet
                ? await ext.transfer(walletKeys.publicKey, { to: track.owner, amount: amt })
                : await rc.transfer(walletKeys, { to: track.owner, amount: amt });
            if (res.success) {
                setTipResult(`Sent ${amt} XRGE!`);
                setTipAmount('');
                setTimeout(() => { setTipResult(null); setTipOpen(false); }, 2000);
            } else {
                setTipResult(res.error || 'Tip failed');
            }
        } catch (e) {
            setTipResult(e instanceof Error ? e.message : 'Tip failed');
        }
        setTipLoading(false);
    };

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

            {/* Social Bar */}
            <div className="section anime-stagger-item" style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span className="text-sm text-muted">
                        <Play size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                        {stats.plays.toLocaleString()} play{stats.plays !== 1 ? 's' : ''}
                    </span>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={handleLike}
                        disabled={!walletKeys || likeLoading}
                    >
                        <Heart size={14} fill={stats.liked ? 'var(--accent)' : 'none'} color={stats.liked ? 'var(--accent)' : 'currentColor'} />
                        {stats.likes.toLocaleString()}
                    </button>
                    <span className="text-sm text-muted">
                        <MessageCircle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                        {stats.commentCount} comment{stats.commentCount !== 1 ? 's' : ''}
                    </span>
                    {track.owner && (
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                            onClick={() => setTipOpen(!tipOpen)}
                            disabled={!walletKeys}
                        >
                            <Coins size={14} /> Tip Artist
                        </button>
                    )}
                </div>

                {/* Tip modal */}
                {tipOpen && (
                    <div style={{
                        marginTop: 12, padding: 16,
                        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                        background: 'var(--bg-secondary)', maxWidth: 360,
                    }}>
                        <p className="text-sm" style={{ marginBottom: 8, fontWeight: 500 }}>Send a tip (XRGE)</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="Amount"
                                value={tipAmount}
                                onChange={e => setTipAmount(e.target.value)}
                                style={{ flex: 1 }}
                                min="0"
                                step="0.1"
                            />
                            <button className="btn btn-primary" onClick={handleTip} disabled={tipLoading || !tipAmount}>
                                {tipLoading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                                Send
                            </button>
                        </div>
                        {tipResult && <p className="text-xs" style={{ marginTop: 6, color: tipResult.includes('Sent') ? '#16a34a' : '#dc2626' }}>{tipResult}</p>}
                    </div>
                )}
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

            {/* Comments */}
            <div className="section anime-stagger-item">
                <h3 style={{ marginBottom: 16 }}>
                    <MessageCircle size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                    Comments ({stats.commentCount})
                </h3>

                {walletKeys && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input
                            className="form-input"
                            placeholder="Write a comment..."
                            value={commentBody}
                            onChange={e => setCommentBody(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleComment(); }}
                            style={{ flex: 1 }}
                            maxLength={2000}
                        />
                        <button className="btn btn-primary" onClick={handleComment} disabled={commentLoading || !commentBody.trim()}>
                            {commentLoading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                        </button>
                    </div>
                )}

                {comments.length === 0 ? (
                    <p className="text-sm text-muted">No comments yet. Be the first!</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {comments.map(c => (
                            <div key={c.id} style={{
                                padding: '10px 14px', borderRadius: 'var(--radius)',
                                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span className="text-xs" style={{ fontFamily: 'monospace', opacity: 0.7 }}>
                                        {c.wallet_pubkey.slice(0, 8)}...{c.wallet_pubkey.slice(-6)}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="text-xs text-muted">{new Date(c.timestamp).toLocaleDateString()}</span>
                                        {walletKeys && c.wallet_pubkey === walletKeys.publicKey && (
                                            <button
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#dc2626' }}
                                                onClick={() => handleDeleteComment(c.id)}
                                                title="Delete comment"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm" style={{ margin: 0 }}>{c.body}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
