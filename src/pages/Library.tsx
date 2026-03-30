import { useState, useEffect, useCallback } from 'react';
import { Library as LibraryIcon, Wallet, Heart, Music, Droplets, Download, Upload, Loader, ThumbsUp } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { usePlayer } from '../hooks/usePlayer';
import { useRougeChain } from '../hooks/useRougeChain';
import { useNftTracks } from '../hooks/useNftTracks';
import { exportKeystore, importKeystore } from '../hooks/useKeystore';
import { formatDuration, type Track } from '../data/mockData';
import type { NftToken, NftCollection } from '@rougechain/sdk';

function nftToTrack(token: NftToken, collections: NftCollection[]): Track {
    const attrs = (token.attributes || {}) as Record<string, string>;
    const col = collections.find(c => c.collection_id === token.collection_id);

    return {
        id: `${token.collection_id}_${token.token_id}`,
        title: token.name || 'Untitled',
        artist: attrs.artist || (token.creator || '').slice(0, 8) + '...',
        album: col?.name || 'Unknown Collection',
        duration: parseInt(attrs.duration || '0', 10) || 210,
        coverUrl: attrs.coverUrl || col?.image || '',
        audioUrl: attrs.audioUrl || '',
        genre: attrs.genre || 'Unknown',
        collectionId: token.collection_id,
        tokenId: `tok_${token.token_id}`,
        mintDate: token.minted_at ? new Date(token.minted_at).toISOString().split('T')[0] : '',
        owner: token.owner.slice(0, 8) + '...' + token.owner.slice(-6),
    };
}

export default function LibraryPage() {
    const { isConnected, publicKey, address, balance, connect, connectFromKeys, connectExtension, extensionDetected, isExtensionWallet, walletKeys, requestFaucet, isLoading } = useWallet();
    const { play } = usePlayer();
    const rc = useRougeChain();
    const { collections } = useNftTracks();
    const [activeTab, setActiveTab] = useState<'owned' | 'liked' | 'all'>('owned');
    const [ownedTracks, setOwnedTracks] = useState<Track[]>([]);
    const [likedTracks, setLikedTracks] = useState<Track[]>([]);
    const [loadingOwned, setLoadingOwned] = useState(false);
    const [loadingLiked, setLoadingLiked] = useState(false);
    const { tracks: allTracks } = useNftTracks();

    // Keystore state
    const [showExport, setShowExport] = useState(false);
    const [passphrase, setPassphrase] = useState('');
    const [keystoreError, setKeystoreError] = useState<string | null>(null);
    const [keystoreSuccess, setKeystoreSuccess] = useState<string | null>(null);

    // Fetch owned NFTs
    const fetchOwned = useCallback(async () => {
        if (!walletKeys?.publicKey) return;
        setLoadingOwned(true);
        try {
            const tokens = await rc.nft.getByOwner(walletKeys.publicKey);
            setOwnedTracks(tokens.map((t: NftToken) => nftToTrack(t, collections)));
        } catch {
            setOwnedTracks([]);
        }
        setLoadingOwned(false);
    }, [walletKeys, rc, collections]);

    const fetchLiked = useCallback(async () => {
        if (!walletKeys?.publicKey) return;
        setLoadingLiked(true);
        try {
            const trackIds = await rc.social.getUserLikes(walletKeys.publicKey);
            const matched = allTracks.filter(t => trackIds.includes(t.id));
            setLikedTracks(matched);
        } catch {
            setLikedTracks([]);
        }
        setLoadingLiked(false);
    }, [walletKeys, rc, allTracks]);

    useEffect(() => {
        if (isConnected && walletKeys) {
            fetchOwned();
            fetchLiked();
        }
    }, [isConnected, walletKeys, fetchOwned, fetchLiked]);

    const displayTracks = activeTab === 'owned' ? ownedTracks : activeTab === 'liked' ? likedTracks : allTracks;

    const handleExportKeystore = async () => {
        if (!walletKeys || !passphrase) return;
        setKeystoreError(null);
        try {
            await exportKeystore(walletKeys, passphrase);
            setKeystoreSuccess('Keystore exported! Keep this file safe.');
            setShowExport(false);
            setPassphrase('');
        } catch {
            setKeystoreError('Failed to export keystore');
        }
    };

    const handleImportKeystore = async (file: File) => {
        const pass = prompt('Enter your keystore passphrase:');
        if (!pass) return;
        setKeystoreError(null);
        try {
            const keys = await importKeystore(file, pass);
            await connectFromKeys(keys);
            setKeystoreSuccess('Wallet restored from keystore!');
        } catch {
            setKeystoreError('Wrong passphrase or corrupted keystore file');
        }
    };

    if (!isConnected) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 120 }}>
                    <LibraryIcon />
                    <h3>Connect your wallet</h3>
                    <p style={{ marginBottom: 20 }}>
                        Connect to view your NFT track collection, or import an existing keystore.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {extensionDetected && (
                            <button className="btn btn-primary" onClick={connectExtension}>
                                Connect Wallet
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={connect}>
                            New Wallet
                        </button>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                            <Upload size={14} />
                            Import Keystore
                            <input
                                type="file"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImportKeystore(file);
                                }}
                            />
                        </label>
                    </div>
                    {keystoreError && (
                        <p style={{ color: '#b91c1c', marginTop: 12, fontSize: '0.875rem' }}>
                            {keystoreError}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: 8 }}>Your Library</h1>

            {keystoreSuccess && (
                <div style={{
                    padding: '10px 16px', marginBottom: 16,
                    background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 'var(--radius)', color: '#4ade80',
                    fontSize: '0.875rem',
                }}>
                    {keystoreSuccess}
                    <button
                        style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80' }}
                        onClick={() => setKeystoreSuccess(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Wallet Info Bar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 0',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wallet size={16} style={{ color: 'var(--muted)' }} />
                    <span className="text-sm" style={{ fontFamily: 'monospace' }}>
                        {address ? `${address.slice(0, 14)}...${address.slice(-6)}` : `${publicKey?.slice(0, 10)}...${publicKey?.slice(-6)}`}
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
                {!isExtensionWallet && (
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                        onClick={() => setShowExport(!showExport)}
                    >
                        <Download size={12} />
                        Export Keystore
                    </button>
                )}
            </div>

            {/* Keystore Export */}
            {showExport && (
                <div style={{
                    padding: 16, marginBottom: 24,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-secondary)',
                }}>
                    <p className="text-sm" style={{ marginBottom: 8, fontWeight: 500 }}>
                        Encrypt & download your wallet keystore
                    </p>
                    <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
                        Your private key will be encrypted with AES-256-GCM. Choose a strong passphrase.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Enter passphrase"
                            value={passphrase}
                            onChange={e => setPassphrase(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleExportKeystore}
                            disabled={!passphrase}
                        >
                            Export
                        </button>
                    </div>
                    {keystoreError && (
                        <p style={{ color: '#b91c1c', marginTop: 8, fontSize: '0.75rem' }}>{keystoreError}</p>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab${activeTab === 'owned' ? ' active' : ''}`}
                    onClick={() => setActiveTab('owned')}
                >
                    <Music size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Owned NFTs ({loadingOwned ? '...' : ownedTracks.length})
                </button>
                <button
                    className={`tab${activeTab === 'liked' ? ' active' : ''}`}
                    onClick={() => setActiveTab('liked')}
                >
                    <ThumbsUp size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    Liked ({loadingLiked ? '...' : likedTracks.length})
                </button>
                <button
                    className={`tab${activeTab === 'all' ? ' active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <Heart size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                    All Tracks ({allTracks.length})
                </button>
            </div>

            {/* Track List */}
            {(loadingOwned && activeTab === 'owned') || (loadingLiked && activeTab === 'liked') ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    <p>{activeTab === 'liked' ? 'Loading liked tracks...' : 'Loading your NFTs from RougeChain...'}</p>
                </div>
            ) : displayTracks.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <Music size={32} />
                    <h3>No tracks found</h3>
                    <p>{activeTab === 'owned' ? 'Mint your first track to see it here!' : activeTab === 'liked' ? 'Like tracks to build your collection!' : 'No tracks available yet.'}</p>
                </div>
            ) : (
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
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
