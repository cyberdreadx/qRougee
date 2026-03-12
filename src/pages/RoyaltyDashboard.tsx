import { Coins, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useNftTracks } from '../hooks/useNftTracks';
import { MOCK_TRACKS, formatDuration } from '../data/mockData';

export default function RoyaltyDashboard() {
    const { isConnected, connect, publicKey } = useWallet();
    const { tracks: nftTracks } = useNftTracks();

    const allTracks = [...MOCK_TRACKS, ...nftTracks];

    // Tracks where connected wallet is the owner (simulated)
    const ownedTracks = isConnected
        ? allTracks.filter(t => t.owner && t.tokenSymbol)
        : [];

    // Simulated royalty data for demonstration
    const totalEarnings = ownedTracks.length * 127.45;
    const pendingPayout = ownedTracks.length * 23.80;

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
                        Total Earned
                    </div>
                    <div className="royalty-stat-value">${totalEarnings.toFixed(2)}</div>
                    <div className="text-xs text-muted">USDC equivalent</div>
                </div>
                <div className="royalty-stat-card">
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Pending Payout
                    </div>
                    <div className="royalty-stat-value">${pendingPayout.toFixed(2)}</div>
                    <div className="text-xs text-muted">Next distribution cycle</div>
                </div>
                <div className="royalty-stat-card">
                    <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Active Tracks
                    </div>
                    <div className="royalty-stat-value">{ownedTracks.length}</div>
                    <div className="text-xs text-muted">Generating revenue</div>
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
                        <div className="track-list-header" style={{ gridTemplateColumns: '1fr 120px 120px 100px 40px' }}>
                            <span>Track</span>
                            <span>Token</span>
                            <span>Earned</span>
                            <span>Pending</span>
                            <span></span>
                        </div>
                        {ownedTracks.map(track => {
                            const earned = (127.45 + Math.random() * 200).toFixed(2);
                            const pending = (23.80 + Math.random() * 50).toFixed(2);
                            return (
                                <div key={track.id} className="track-list-item"
                                    style={{ gridTemplateColumns: '1fr 120px 120px 100px 40px' }}>
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
                                    <div className="text-sm" style={{ fontWeight: 500 }}>{track.tokenSymbol}</div>
                                    <div className="text-sm" style={{ color: '#4ade80' }}>${earned}</div>
                                    <div className="text-sm text-muted">${pending}</div>
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
                        <span className="chain-info-label">Payout Currency</span>
                        <span className="chain-info-value">USDC (converted from XRGE)</span>
                    </div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Distribution</span>
                        <span className="chain-info-value">Manual via rc.transfer</span>
                    </div>
                    <div className="chain-info-row">
                        <span className="chain-info-label">Revenue Sources</span>
                        <span className="chain-info-value">Rougee streams · External DSPs · Token sales</span>
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
