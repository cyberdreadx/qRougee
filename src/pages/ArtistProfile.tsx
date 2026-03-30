import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Play, ExternalLink, Users, Music, Shield, Clock, Coins, UserPlus, UserCheck } from 'lucide-react';
import { formatDuration } from '../data/mockData';
import { usePlayer } from '../hooks/usePlayer';
import { useNftTracks } from '../hooks/useNftTracks';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import * as ext from '../utils/extensionSigner';
import TrackCard from '../components/TrackCard';

export default function ArtistProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { play } = usePlayer();
    const { tracks } = useNftTracks();
    const { walletKeys, isExtensionWallet } = useWallet();
    const rc = useRougeChain();

    const [followerCount, setFollowerCount] = useState(0);
    const [_followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // id = artist name (URL-encoded)
    const artistName = decodeURIComponent(id || '');

    // Find all tracks by this artist
    const artistTracks = tracks.filter(t => t.artist === artistName);

    if (artistTracks.length === 0) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <Users size={48} />
                    <h3>Artist not found</h3>
                    <p>No tracks found for this artist on RougeChain.</p>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    // Derive artist profile from their tracks
    const coverUrl = artistTracks[0].coverUrl;
    const genres = [...new Set(artistTracks.map(t => t.genre).filter(g => g && g !== 'Unknown'))];
    const totalDuration = artistTracks.reduce((sum, t) => sum + t.duration, 0);
    const collections = new Set(artistTracks.map(t => t.collectionId).filter(Boolean));
    const tokenSymbols = [...new Set(artistTracks.map(t => t.tokenSymbol).filter(Boolean))];
    // Get the wallet/owner from the first track
    const walletAddress = artistTracks[0]?.owner || 'Unknown';

    const loadArtistStats = useCallback(async () => {
        if (!walletAddress || walletAddress === 'Unknown') return;
        try {
            const s = await rc.social.getArtistStats(walletAddress, walletKeys?.publicKey);
            setFollowerCount(s.followers);
            setFollowingCount(s.following);
            setIsFollowing(s.isFollowing);
        } catch { /* ignore */ }
    }, [walletAddress, walletKeys?.publicKey, rc]);

    useEffect(() => { loadArtistStats(); }, [loadArtistStats]);

    const handleFollow = async () => {
        if (!walletKeys || !walletAddress || walletAddress === 'Unknown' || followLoading) return;
        setFollowLoading(true);
        try {
            const res = isExtensionWallet
                ? await ext.socialToggleFollow(walletKeys.publicKey, walletAddress)
                : await rc.social.toggleFollow(walletKeys, walletAddress);
            if (res.success) {
                setIsFollowing((res as any).following ?? !isFollowing);
                setFollowerCount((res as any).followers ?? followerCount);
            }
        } catch { /* ignore */ }
        setFollowLoading(false);
    };

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
                    <img src={coverUrl} alt={artistName} style={{ objectFit: 'cover' }} />
                </div>
                <div className="artist-profile-info">
                    <div className="artist-profile-type">
                        <Shield size={12} />
                        Artist on RougeChain
                    </div>
                    <h1 className="artist-profile-name">{artistName}</h1>
                    {genres.length > 0 && (
                        <p className="artist-profile-bio">
                            {genres.join(' · ')}
                        </p>
                    )}
                    <div className="artist-profile-meta">
                        <span><Music size={14} /> {artistTracks.length} track{artistTracks.length !== 1 ? 's' : ''}</span>
                        <span><Clock size={14} /> {formatDuration(totalDuration)} total</span>
                        <span><Users size={14} /> {followerCount} follower{followerCount !== 1 ? 's' : ''}</span>
                        <span>{collections.size} collection{collections.size !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="artist-profile-actions">
                        <button className="btn btn-primary" onClick={handlePlayAll}>
                            <Play size={16} /> Play All
                        </button>
                        {walletKeys && walletAddress !== 'Unknown' && (
                            <button
                                className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={handleFollow}
                                disabled={followLoading}
                                style={{ gap: 6 }}
                            >
                                {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
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
                    <span className="chain-info-value">{walletAddress}</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Network</span>
                    <span className="chain-info-value">RougeChain Testnet</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Collections</span>
                    <span className="chain-info-value">{collections.size}</span>
                </div>
                <div className="chain-info-row">
                    <span className="chain-info-label">Tracks Minted</span>
                    <span className="chain-info-value">{artistTracks.length}</span>
                </div>
                {tokenSymbols.length > 0 && (
                    <div className="chain-info-row">
                        <span className="chain-info-label">Song Tokens</span>
                        <span className="chain-info-value">
                            <Coins size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                            {tokenSymbols.join(', ')}
                        </span>
                    </div>
                )}
            </div>

            {/* Discography */}
            <div className="section">
                <div className="section-header">
                    <h2>Discography</h2>
                </div>

                <div className="track-list">
                    <div className="track-list-header">
                        <span>#</span>
                        <span>Title</span>
                        <span>Collection</span>
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
