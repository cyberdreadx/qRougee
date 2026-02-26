import { useState } from 'react';
import { Library as LibraryIcon, Wallet, Heart, Music, Droplets } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { usePlayer } from '../hooks/usePlayer';
import { MOCK_TRACKS, formatDuration } from '../data/mockData';

export default function LibraryPage() {
    const { isConnected, address, balance, connect, requestFaucet, isLoading } = useWallet();
    const { play } = usePlayer();
    const [activeTab, setActiveTab] = useState<'tracks' | 'liked'>('tracks');

    // For MVP, show first 6 tracks as "owned" and last 4 as "liked"
    const ownedTracks = MOCK_TRACKS.slice(0, 6);
    const likedTracks = MOCK_TRACKS.slice(6, 10);
    const displayTracks = activeTab === 'tracks' ? ownedTracks : likedTracks;

    if (!isConnected) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 120 }}>
                    <LibraryIcon />
                    <h3>Connect your wallet</h3>
                    <p style={{ marginBottom: 20 }}>
                        Connect to view your collection of owned and liked tracks.
                    </p>
                    <button className="btn btn-primary" onClick={connect}>
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: 8 }}>Your Library</h1>

            {/* Wallet Info Bar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    padding: '16px 0',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 24,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={16} style={{ color: 'var(--muted)' }} />
                    <span className="text-sm" style={{ fontFamily: 'monospace' }}>
                        {address?.slice(0, 14)}...{address?.slice(-4)}
                    </span>
                </div>
                <div className="badge">{balance} XRGE</div>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                    onClick={requestFaucet}
                    disabled={isLoading}
                >
                    <Droplets size={12} />
                    {isLoading ? 'Requesting...' : 'Faucet'}
                </button>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab${activeTab === 'tracks' ? ' active' : ''}`}
                    onClick={() => setActiveTab('tracks')}
                >
                    <Music size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Your Tracks ({ownedTracks.length})
                </button>
                <button
                    className={`tab${activeTab === 'liked' ? ' active' : ''}`}
                    onClick={() => setActiveTab('liked')}
                >
                    <Heart size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Liked ({likedTracks.length})
                </button>
            </div>

            {/* Track List */}
            <div className="track-list">
                <div className="track-list-header">
                    <span>#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span style={{ textAlign: 'right' }}>Duration</span>
                </div>
                {displayTracks.map((track, idx) => (
                    <div
                        key={track.id}
                        className="track-list-item"
                        onClick={() => play(track, displayTracks)}
                    >
                        <span className="track-list-num">{idx + 1}</span>
                        <div className="track-list-info">
                            <div className="track-list-thumb">
                                <img src={track.coverUrl} alt={track.title} />
                            </div>
                            <div>
                                <div className="track-list-name">{track.title}</div>
                                <div className="track-list-artist-name">{track.artist}</div>
                            </div>
                        </div>
                        <span className="track-list-artist-name">{track.album}</span>
                        <span className="track-list-duration">
                            {formatDuration(track.duration)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
