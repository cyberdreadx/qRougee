import { useState, useEffect, useCallback } from 'react';
import { Coins, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import { useNftTracks } from '../hooks/useNftTracks';
import { formatDuration } from '../data/mockData';
import type { NftToken } from '@rougechain/sdk';

export default function RoyaltyDashboard() {
    const { isConnected, connect, publicKey, walletKeys } = useWallet();
    const { tracks: nftTracks, collections } = useNftTracks();
    const rc = useRougeChain();
    const [ownedTracks, setOwnedTracks] = useState(nftTracks.filter(() => false));
    const [trackStats, setTrackStats] = useState<Record<string, { plays: number; likes: number }>>({});

    const fetchOwned = useCallback(async () => {
        if (!walletKeys?.publicKey) return;
        try {
            const tokens = await rc.nft.getByOwner(walletKeys.publicKey);
            const mapped = (tokens || []).map((t: NftToken) => {
                const attrs = (t.attributes || {}) as Record<string, string>;
                const col = collections.find(c => c.collection_id === t.collection_id);
                return {
                    id: `${t.collection_id}_${t.token_id}`,
                    title: t.name || 'Untitled',
                    artist: attrs.artist || (t.creator || '').slice(0, 8) + '...',
                    album: col?.name || '',
                    duration: parseInt(attrs.duration || '0', 10) || 210,
                    coverUrl: attrs.coverUrl || col?.image || '',
                    audioUrl: attrs.audioUrl || '',
                    genre: attrs.genre || '',
                    collectionId: t.collection_id,
                    tokenId: `tok_${t.token_id}`,
                    tokenSymbol: attrs.tokenSymbol || '',
                    mintDate: t.minted_at ? new Date(t.minted_at).toISOString().split('T')[0] : '',
                    owner: t.owner,
                };
            });
            setOwnedTracks(mapped);
            const stats: Record<string, { plays: number; likes: number }> = {};
            for (const track of mapped) {
                try {
                    const s = await rc.social.getTrackStats(track.id);
                    stats[track.id] = { plays: s.plays || 0, likes: s.likes || 0 };
                } catch {
                    stats[track.id] = { plays: 0, likes: 0 };
                }
            }
            setTrackStats(stats);
        } catch {
            setOwnedTracks([]);
        }
    }, [walletKeys, rc, collections]);

    useEffect(() => {
        if (isConnected) fetchOwned();
    }, [isConnected, fetchOwned]);

    const totalPlays = Object.values(trackStats).reduce((sum, s) => sum + s.plays, 0);
    const totalLikes = Object.values(trackStats).reduce((sum, s) => sum + s.likes, 0);

    if (!isConnected) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 120 }}>
                    <TrendingUp />
                    <h3>Connect to view royalties</h3>
                    <p style={{ marginBottom: 20 }}>
                        Connect your wallet to see royalty earnings from your tracks.
                    </p>
                    <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: 8 }}>Royalties</h1>
            <p className="text-muted" style={{ marginBottom: 32 }}>
                Track earnings and manage royalty distributions · {publicKey?.slice(0, 12)}...
            </p>

            {/* Stats */}
            <div className="royalty-stats">
                <div className="royalty-stat-card">
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Total Plays
                    </div>
                    <div className="royalty-stat-value">{totalPlays.toLocaleString()}</div>
                    <div className="text-xs text-muted">Across all tracks</div>
                </div>
                <div className="royalty-stat-card">
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Total Likes
                    </div>
                    <div className="royalty-stat-value">{totalLikes.toLocaleString()}</div>
                    <div className="text-xs text-muted">Community engagement</div>
                </div>
                <div className="royalty-stat-card">
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Your Tracks
                    </div>
                    <div className="royalty-stat-value">{ownedTracks.length}</div>
                    <div className="text-xs text-muted">NFTs you own</div>
                </div>
            </div>

            {/* Track Earnings */}
            <div className="section" style={{ marginTop: 40 }}>
                <h3 style={{ marginBottom: 16 }}>
                    <Coins size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                    Track Earnings
                </h3>

                {ownedTracks.length === 0 ? (
                    <div className="empty-state" style={{ padding: 40 }}>
                        <p className="text-muted">No tracks found. Mint a track to start earning royalties.</p>
                        <Link to="/upload" className="btn btn-primary" style={{ marginTop: 12 }}>
                            Mint Track
                        </Link>
                    </div>
                ) : (
                    <div className="track-list">
                        <div className="track-list-header" style={{ gridTemplateColumns: '1fr 100px 100px 40px' }}>
                            <span>Track</span>
                            <span>Plays</span>
                            <span>Likes</span>
                            <span></span>
                        </div>
                        {ownedTracks.map(track => {
                            const stats = trackStats[track.id] || { plays: 0, likes: 0 };
                            return (
                                <div key={track.id} className="track-list-item"
                                    style={{ gridTemplateColumns: '1fr 100px 100px 40px' }}>
                                    <div className="track-list-info">
                                        <div className="track-list-thumb">
                                            <img src={track.coverUrl} alt={track.title} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div className="track-list-name">{track.title}</div>
                                            <div className="track-list-artist-name">
                                                {track.artist} · {formatDuration(track.duration)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm" style={{ fontWeight: 500 }}>{stats.plays.toLocaleString()}</div>
                                    <div className="text-sm" style={{ fontWeight: 500 }}>{stats.likes.toLocaleString()}</div>
                                    <Link to={`/track/${track.id}`}>
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Distribution Info */}
            <div className="section" style={{ marginTop: 32 }}>
                <div className="chain-info">
                    <div className="chain-info-title">Distribution Details</div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Tracking</span>
                        <span className="chain-info-value">Plays & likes recorded on-chain</span>
                    </div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Ownership</span>
                        <span className="chain-info-value">RC-721 NFT on RougeChain</span>
                    </div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Revenue Sources</span>
                        <span className="chain-info-value">qRougee streams · Token sales · Tips</span>
                    </div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Split Model</span>
                        <span className="chain-info-value">Per-track royalty split stored on-chain</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
