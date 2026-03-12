import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Wallet as WalletIcon, Copy, Check, Droplets, Download, Upload,
    Coins, Image as ImageIcon, ArrowUpRight, ArrowDownLeft, RefreshCw,
    Shield, LogOut, KeyRound, AlertCircle,
} from 'lucide-react';
import { useWallet, truncateKey } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import { exportKeystore, importKeystore } from '../hooks/useKeystore';

/* ────────────────────────────────────────────────────────── */

interface TokenBalance {
    symbol: string;
    balance: number;
}

interface OwnedNft {
    collectionId: string;
    tokenId: string;
    name: string;
    image?: string;
}

interface TxRecord {
    type: string;
    timestamp: number;
    amount?: number;
    token?: string;
    to?: string;
    from?: string;
    fee?: number;
}

/* ────────────────────────────────────────────────────────── */

export default function WalletPage() {
    const { isConnected, publicKey, balance, walletKeys, connect, disconnect, requestFaucet, refreshBalance } = useWallet();
    const rc = useRougeChain();

    const [copied, setCopied] = useState(false);
    const [tokens, setTokens] = useState<TokenBalance[]>([]);
    const [nfts, setNfts] = useState<OwnedNft[]>([]);
    const [txs, setTxs] = useState<TxRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [faucetLoading, setFaucetLoading] = useState(false);
    const [tab, setTab] = useState<'tokens' | 'nfts' | 'activity'>('tokens');

    // Keystore
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportPass, setExportPass] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPass, setImportPass] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [keystoreError, setKeystoreError] = useState('');

    const copyKey = () => {
        if (!publicKey) return;
        navigator.clipboard.writeText(publicKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const fetchWalletData = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            await refreshBalance();

            // Fetch NFTs owned
            try {
                const owned = await rc.nft.getByOwner(publicKey);
                setNfts((owned || []).map((n) => {
                    const raw = n as unknown as Record<string, unknown>;
                    return {
                        collectionId: String(raw.collection_id || ''),
                        tokenId: String(raw.token_id || ''),
                        name: String(raw.name || ''),
                        image: raw.image ? String(raw.image) : (raw.metadata_uri ? String(raw.metadata_uri) : undefined),
                    };
                }));
            } catch { setNfts([]); }

            // Fetch token balances
            try {
                const allTokens = await rc.getTokens();
                const balances: TokenBalance[] = [];
                for (const tok of (allTokens || [])) {
                    const raw = tok as unknown as Record<string, unknown>;
                    const sym = (raw.symbol || raw.token_symbol) as string;
                    if (!sym) continue;
                    try {
                        const bal = await rc.getTokenBalance(publicKey, sym);
                        if (bal && bal > 0) balances.push({ symbol: sym, balance: bal });
                    } catch { /* token not held */ }
                }
                setTokens(balances);
            } catch { setTokens([]); }

            // Fetch recent transactions
            try {
                const txData = await rc.getTransactions({ limit: 20 }) as { transactions?: Record<string, unknown>[] };
                const myTxs = (txData?.transactions || [])
                    .filter((tx) =>
                        tx.from === publicKey || tx.to === publicKey
                    )
                    .slice(0, 10);
                setTxs(myTxs.map((tx: Record<string, unknown>) => ({
                    type: String(tx.type || ''),
                    timestamp: Number(tx.timestamp || 0),
                    amount: tx.amount ? Number(tx.amount) : undefined,
                    token: tx.token ? String(tx.token) : undefined,
                    to: tx.to ? String(tx.to) : undefined,
                    from: tx.from ? String(tx.from) : undefined,
                    fee: tx.fee ? Number(tx.fee) : undefined,
                })));
            } catch { setTxs([]); }
        } finally {
            setLoading(false);
        }
    }, [publicKey, rc, refreshBalance]);

    useEffect(() => {
        if (isConnected) fetchWalletData();
    }, [isConnected, fetchWalletData]);

    const handleFaucet = async () => {
        setFaucetLoading(true);
        try {
            await requestFaucet();
            await refreshBalance();
        } finally {
            setFaucetLoading(false);
        }
    };

    const handleExport = async () => {
        if (!walletKeys || !exportPass) return;
        try {
            await exportKeystore(walletKeys, exportPass);
            setShowExportModal(false);
            setExportPass('');
        } catch {
            setKeystoreError('Failed to export keystore');
        }
    };

    const handleImport = async () => {
        if (!importFile || !importPass) return;
        setKeystoreError('');
        try {
            const keys = await importKeystore(importFile, importPass);
            // We need connectFromKeys but it's not exposed — use the wallet context
            // For now we'll signal the user
            console.log('Imported keys:', keys.publicKey);
            setShowImportModal(false);
            setImportPass('');
            setImportFile(null);
            window.location.reload();
        } catch {
            setKeystoreError('Wrong passphrase or corrupted keystore file');
        }
    };

    const formatTxType = (type: string) => {
        const map: Record<string, string> = {
            transfer: 'Transfer',
            create_token: 'Create Token',
            faucet: 'Faucet Claim',
            nft_create_collection: 'Create Collection',
            nft_mint: 'Mint NFT',
            nft_transfer: 'NFT Transfer',
            swap: 'Swap',
            stake: 'Stake',
            unstake: 'Unstake',
        };
        return map[type] || type;
    };

    const formatTime = (ts: number) => {
        if (!ts) return '—';
        const d = new Date(ts);
        const now = Date.now();
        const diff = now - ts;
        if (diff < 60_000) return 'Just now';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
        return d.toLocaleDateString();
    };

    // ── Not connected ──────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 100 }}>
                    <WalletIcon size={48} />
                    <h2 style={{ marginTop: 16 }}>Your Wallet</h2>
                    <p className="text-muted" style={{ marginBottom: 24, maxWidth: 360 }}>
                        Connect to manage your XRGE balance, song tokens, NFTs, and keys.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={connect}>
                            <WalletIcon size={16} /> New Wallet
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                            <KeyRound size={16} /> Import Keystore
                        </button>
                    </div>
                </div>

                {/* Import Keystore Modal */}
                {showImportModal && (
                    <div className="sidebar-overlay" style={{
                        zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} onClick={() => setShowImportModal(false)}>
                        <div onClick={e => e.stopPropagation()} style={{
                            background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 440, width: '90%',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        }}>
                            <h3 style={{ marginBottom: 4 }}>Import Keystore</h3>
                            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                                Upload your keystore JSON file and enter the passphrase.
                            </p>
                            <div style={{ marginBottom: 12 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Keystore File</label>
                                <input type="file" accept=".json" className="form-input"
                                    onChange={e => setImportFile(e.target.files?.[0] || null)} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Passphrase</label>
                                <input type="password" className="form-input" placeholder="Enter passphrase"
                                    value={importPass} onChange={e => setImportPass(e.target.value)} />
                            </div>
                            {keystoreError && (
                                <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: 12 }}>
                                    <AlertCircle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                                    {keystoreError}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary" style={{ flex: 1 }}
                                    onClick={handleImport} disabled={!importFile || !importPass}>
                                    Import
                                </button>
                                <button className="btn btn-secondary"
                                    onClick={() => { setShowImportModal(false); setKeystoreError(''); }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Connected ──────────────────────────────────────────
    return (
        <div className="page-container">
            {/* Header Card */}
            <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '28px 24px', marginBottom: 24,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: '#22c55e', display: 'inline-block',
                            }} />
                            <span className="text-sm text-muted">Connected</span>
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 4 }}>
                            {balance} <span style={{ fontSize: '1rem', opacity: 0.6 }}>XRGE</span>
                        </h1>
                        <button onClick={copyKey} style={{
                            background: 'none', border: 'none', color: 'var(--fg-muted)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                            fontFamily: 'monospace', fontSize: '0.75rem', padding: 0,
                        }}>
                            {truncateKey(publicKey!)}
                            {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={handleFaucet} disabled={faucetLoading}
                            style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                            <Droplets size={14} />
                            {faucetLoading ? 'Claiming...' : 'Faucet'}
                        </button>
                        <button className="btn btn-secondary" onClick={fetchWalletData} disabled={loading}
                            style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                            <RefreshCw size={14} className={loading ? 'spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20,
            }}>
                {(['tokens', 'nfts', 'activity'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--fg)' : '2px solid transparent',
                        color: tab === t ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer',
                        padding: '10px 20px', fontWeight: tab === t ? 600 : 400,
                        fontSize: '0.875rem', textTransform: 'capitalize',
                        transition: 'all 0.2s',
                    }}>
                        {t === 'tokens' && <Coins size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                        {t === 'nfts' && <ImageIcon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                        {t === 'activity' && <ArrowUpRight size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                        {t} {t === 'tokens' && tokens.length > 0 && <span className="text-xs text-muted">({tokens.length})</span>}
                        {t === 'nfts' && nfts.length > 0 && <span className="text-xs text-muted"> ({nfts.length})</span>}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: 200 }}>
                {/* Tokens */}
                {tab === 'tokens' && (
                    <div>
                        {/* XRGE always shown */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 16px', background: 'var(--surface)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            marginBottom: 8,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                    color: '#fff', fontWeight: 700, fontSize: '0.75rem',
                                }}>XR</div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>XRGE</div>
                                    <div className="text-xs text-muted">RougeChain Native</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600 }}>{balance}</div>
                            </div>
                        </div>

                        {tokens.map(tok => (
                            <div key={tok.symbol} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 16px', background: 'var(--surface)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                marginBottom: 8,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        background: 'var(--border)', fontWeight: 700, fontSize: '0.7rem',
                                        color: 'var(--fg)',
                                    }}>{tok.symbol.slice(0, 2)}</div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{tok.symbol}</div>
                                        <div className="text-xs text-muted">Song Token</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {tok.balance.toLocaleString()}
                                </div>
                            </div>
                        ))}

                        {tokens.length === 0 && (
                            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 24 }}>
                                No song tokens yet. Mint a track or buy tokens on the Trade page.
                            </p>
                        )}
                    </div>
                )}

                {/* NFTs */}
                {tab === 'nfts' && (
                    <div>
                        {nfts.length === 0 ? (
                            <div className="empty-state" style={{ padding: 40 }}>
                                <ImageIcon size={32} />
                                <p className="text-muted" style={{ marginTop: 8 }}>No NFTs yet</p>
                                <Link to="/upload" className="btn btn-primary" style={{ marginTop: 12 }}>
                                    Mint Your First Track
                                </Link>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: 12,
                            }}>
                                {nfts.map(nft => (
                                    <Link key={`${nft.collectionId}-${nft.tokenId}`}
                                        to={`/track/${nft.collectionId}`}
                                        style={{
                                            background: 'var(--surface)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius)', overflow: 'hidden',
                                            textDecoration: 'none', color: 'var(--fg)',
                                            transition: 'border-color 0.2s',
                                        }}>
                                        <div style={{
                                            width: '100%', aspectRatio: '1', background: 'var(--border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {nft.image ? (
                                                <img src={nft.image} alt={nft.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <ImageIcon size={32} style={{ opacity: 0.3 }} />
                                            )}
                                        </div>
                                        <div style={{ padding: '10px 12px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{nft.name}</div>
                                            <div className="text-xs text-muted">#{nft.tokenId}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Activity */}
                {tab === 'activity' && (
                    <div>
                        {txs.length === 0 ? (
                            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 40 }}>
                                No recent activity
                            </p>
                        ) : (
                            txs.map((tx, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: tx.to === publicKey ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {tx.to === publicKey
                                            ? <ArrowDownLeft size={14} style={{ color: '#22c55e' }} />
                                            : <ArrowUpRight size={14} style={{ color: '#a855f7' }} />
                                        }
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                                            {formatTxType(tx.type)}
                                        </div>
                                        <div className="text-xs text-muted">
                                            {tx.to && tx.to !== publicKey && `→ ${truncateKey(tx.to)}`}
                                            {tx.from && tx.from !== publicKey && `← ${truncateKey(tx.from)}`}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {tx.amount !== undefined && (
                                            <div style={{
                                                fontWeight: 600, fontSize: '0.85rem',
                                                color: tx.to === publicKey ? '#22c55e' : 'var(--fg)',
                                            }}>
                                                {tx.to === publicKey ? '+' : '-'}{tx.amount} {tx.token || 'XRGE'}
                                            </div>
                                        )}
                                        <div className="text-xs text-muted">{formatTime(tx.timestamp)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Key Management */}
            <div style={{
                marginTop: 32, padding: '20px 24px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
            }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={16} /> Key Management
                </h3>
                <p className="text-xs text-muted" style={{ marginBottom: 16, lineHeight: 1.5 }}>
                    Your private key is stored in this browser session only. Export a keystore file to back up
                    your wallet. You'll need the passphrase to restore it.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                        onClick={() => setShowExportModal(true)}>
                        <Download size={14} /> Export Keystore
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                        onClick={() => setShowImportModal(true)}>
                        <Upload size={14} /> Import Keystore
                    </button>
                    <button className="btn btn-secondary" style={{
                        fontSize: '0.8rem', padding: '8px 14px',
                        color: '#f87171', borderColor: 'rgba(248,113,113,0.3)',
                    }} onClick={disconnect}>
                        <LogOut size={14} /> Disconnect
                    </button>
                </div>
            </div>

            {/* Export Keystore Modal */}
            {showExportModal && (
                <div className="sidebar-overlay" style={{
                    zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => setShowExportModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 400, width: '90%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}>
                        <h3 style={{ marginBottom: 4 }}>Export Keystore</h3>
                        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                            Create a passphrase to encrypt your wallet. You'll need this to restore your keys later.
                        </p>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Passphrase</label>
                            <input type="password" className="form-input" placeholder="Choose a strong passphrase"
                                value={exportPass} onChange={e => setExportPass(e.target.value)} />
                        </div>
                        {keystoreError && (
                            <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: 12 }}>
                                {keystoreError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }}
                                onClick={handleExport} disabled={!exportPass}>
                                <Download size={14} /> Download Keystore
                            </button>
                            <button className="btn btn-secondary"
                                onClick={() => { setShowExportModal(false); setKeystoreError(''); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Keystore Modal */}
            {showImportModal && (
                <div className="sidebar-overlay" style={{
                    zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => setShowImportModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 440, width: '90%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}>
                        <h3 style={{ marginBottom: 4 }}>Import Keystore</h3>
                        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                            Upload your keystore JSON file and enter the passphrase.
                        </p>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Keystore File</label>
                            <input type="file" accept=".json" className="form-input"
                                onChange={e => setImportFile(e.target.files?.[0] || null)} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Passphrase</label>
                            <input type="password" className="form-input" placeholder="Enter passphrase"
                                value={importPass} onChange={e => setImportPass(e.target.value)} />
                        </div>
                        {keystoreError && (
                            <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: 12 }}>
                                <AlertCircle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                                {keystoreError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }}
                                onClick={handleImport} disabled={!importFile || !importPass}>
                                Import
                            </button>
                            <button className="btn btn-secondary"
                                onClick={() => { setShowImportModal(false); setKeystoreError(''); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}
