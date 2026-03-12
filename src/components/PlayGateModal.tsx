import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Coins, ShoppingCart, X } from 'lucide-react';
import type { Track } from '../data/mockData';

interface PlayGateModalProps {
    track: Track;
    playCount: number;
    maxFree: number;
    tokenBalance: number;
    requiredBalance: number;
    onClose: () => void;
}

export default function PlayGateModal({
    track, playCount, maxFree, tokenBalance, requiredBalance, onClose,
}: PlayGateModalProps) {
    const [closing, setClosing] = useState(false);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 200);
    };

    const deficit = requiredBalance - tokenBalance;

    return (
        <div
            className="sidebar-overlay"
            style={{
                zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: closing ? 0 : 1, transition: 'opacity 0.2s',
            }}
            onClick={handleClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: 0, maxWidth: 420, width: '90%',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    transform: closing ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.2s',
                }}
            >
                {/* Header with cover art */}
                <div style={{
                    position: 'relative', height: 120, overflow: 'hidden',
                    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                }}>
                    {track.coverUrl && (
                        <img src={track.coverUrl} alt="" style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            opacity: 0.3, filter: 'blur(8px)',
                        }} />
                    )}
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 4,
                    }}>
                        <Lock size={32} style={{ color: '#fff', opacity: 0.9 }} />
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                            Track Locked
                        </span>
                    </div>
                    <button onClick={handleClose} style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%',
                        width: 28, height: 28, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: '#fff',
                    }}>
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px 24px' }}>
                    <h3 style={{ marginBottom: 4 }}>{track.title}</h3>
                    <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                        by {track.artist}
                    </p>

                    {/* Play count info */}
                    <div style={{
                        padding: '12px 16px', marginBottom: 16,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span className="text-sm">Free plays used</span>
                            <span style={{ fontWeight: 600 }}>{playCount} / {maxFree}</span>
                        </div>
                        <div style={{
                            height: 4, borderRadius: 2, background: 'var(--border)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: 2,
                                width: `${Math.min(100, (playCount / maxFree) * 100)}%`,
                                background: playCount >= maxFree
                                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                    : 'linear-gradient(90deg, #22c55e, #3b82f6)',
                                transition: 'width 0.3s',
                            }} />
                        </div>
                    </div>

                    {/* Token requirement */}
                    <div style={{
                        padding: '12px 16px', marginBottom: 16,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', fontSize: '0.8125rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span className="text-muted">Required</span>
                            <span style={{ fontWeight: 600 }}>
                                <Coins size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                                {requiredBalance.toLocaleString()} {track.tokenSymbol}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span className="text-muted">Your balance</span>
                            <span style={{
                                fontWeight: 600,
                                color: tokenBalance >= requiredBalance ? '#22c55e' : '#f87171',
                            }}>
                                {tokenBalance.toLocaleString()} {track.tokenSymbol}
                            </span>
                        </div>
                        {deficit > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-muted">Need</span>
                                <span style={{ fontWeight: 600, color: '#f97316' }}>
                                    +{deficit.toLocaleString()} {track.tokenSymbol}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                            to="/trade"
                            className="btn btn-primary"
                            style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                            onClick={handleClose}
                        >
                            <ShoppingCart size={14} />
                            Buy {track.tokenSymbol}
                        </Link>
                        <button className="btn btn-secondary" onClick={handleClose}>
                            Close
                        </button>
                    </div>

                    <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 12 }}>
                        Hold {requiredBalance.toLocaleString()} {track.tokenSymbol} to unlock unlimited streaming
                    </p>
                </div>
            </div>
        </div>
    );
}
