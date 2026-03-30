import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Wallet as WalletIcon, Copy, Check, Droplets, Download, Upload,
    Coins, Image as ImageIcon, ArrowUpRight, ArrowDownLeft, RefreshCw,
    LogOut, KeyRound, AlertCircle, Puzzle, Send, Eye, EyeOff, Settings,
} from 'lucide-react';
import { useWallet, truncateKey } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import { exportKeystore, importKeystore } from '../hooks/useKeystore';
import * as ext from '../utils/extensionSigner';

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
    const { isConnected, publicKey, address, mnemonic, balance, walletKeys, connect, connectExtension, connectFromKeys, connectFromMnemonic, extensionDetected, isExtensionWallet, disconnect, requestFaucet, refreshBalance } = useWallet();
    const rc = useRougeChain();

    const [copied, setCopied] = useState(false);
    const [tokens, setTokens] = useState<TokenBalance[]>([]);
    const [nfts, setNfts] = useState<OwnedNft[]>([]);
    const [txs, setTxs] = useState<TxRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [faucetLoading, setFaucetLoading] = useState(false);
    const [tab, setTab] = useState<'tokens' | 'nfts' | 'activity'>('tokens');

    // Send/Transfer
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendTo, setSendTo] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendToken, setSendToken] = useState('XRGE');
    const [sendLoading, setSendLoading] = useState(false);
    const [sendError, setSendError] = useState('');
    const [sendSuccess, setSendSuccess] = useState('');

    // Keystore
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportPass, setExportPass] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPass, setImportPass] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [keystoreError, setKeystoreError] = useState('');

    // Seed phrase
    const [showSeedReveal, setShowSeedReveal] = useState(false);
    const [showSeedImportModal, setShowSeedImportModal] = useState(false);
    const [seedInput, setSeedInput] = useState('');
    const [seedError, setSeedError] = useState('');

    // Settings modal
    const [showSettings, setShowSettings] = useState(false);

    // Password setup after new wallet creation
    const [showPasswordSetup, setShowPasswordSetup] = useState(false);
    const [newWalletPassword, setNewWalletPassword] = useState('');
    const [newWalletConfirm, setNewWalletConfirm] = useState('');
    const [newWalletPwdError, setNewWalletPwdError] = useState('');
    const [newWalletPwdBusy, setNewWalletPwdBusy] = useState(false);

    const handleNewWalletPassword = async () => {
        if (newWalletPassword.length < 6) { setNewWalletPwdError('Password must be at least 6 characters'); return; }
        if (newWalletPassword !== newWalletConfirm) { setNewWalletPwdError('Passwords don\'t match'); return; }
        setNewWalletPwdError('');
        setNewWalletPwdBusy(true);
        try {
            if (walletKeys) {
                await exportKeystore(walletKeys, newWalletPassword);
            }
            setShowPasswordSetup(false);
        } catch (e) {
            setNewWalletPwdError('Failed to export keystore');
        }
        setNewWalletPwdBusy(false);
    };

    const copyKey = () => {
        if (!address && !publicKey) return;
        navigator.clipboard.writeText(address || publicKey!);
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
                setNfts((owned || []).map((n) => ({
                    collectionId: String(n.collection_id || ''),
                    tokenId: String(n.token_id || ''),
                    name: String(n.name || ''),
                    image: n.image ? String(n.image) : (n.metadata_uri ? String(n.metadata_uri) : undefined),
                })));
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
            await connectFromKeys(keys);
            setShowImportModal(false);
            setImportPass('');
            setImportFile(null);
        } catch {
            setKeystoreError('Wrong passphrase or corrupted keystore file');
        }
    };

    const handleSend = async () => {
        if (!walletKeys || !sendTo || !sendAmount) return;
        setSendLoading(true);
        setSendError('');
        setSendSuccess('');
        try {
            const amt = parseFloat(sendAmount);
            if (isNaN(amt) || amt <= 0) throw new Error('Invalid amount');
            const txOpts = { to: sendTo, amount: amt, token: sendToken === 'XRGE' ? undefined : sendToken };
            const result = isExtensionWallet
                ? await ext.transfer(walletKeys.publicKey, txOpts as { to: string; amount: number; token?: string })
                : await rc.transfer(walletKeys, txOpts);
            if (!result.success) throw new Error(result.error || 'Transfer failed');
            setSendSuccess(`Sent ${amt} ${sendToken} successfully`);
            setSendTo('');
            setSendAmount('');
            // Refresh after short delay for chain confirmation
            setTimeout(() => { fetchWalletData(); }, 2000);
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Transfer failed');
        } finally {
            setSendLoading(false);
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                        {extensionDetected && (
                            <button className="btn btn-primary" onClick={connectExtension}
                                style={{ gap: 8, padding: '12px 28px', fontSize: '0.95rem' }}>
                                <Puzzle size={18} /> Connect Extension
                            </button>
                        )}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 12, maxWidth: 560, width: '100%',
                        }}>
                            <button id="btn-new-wallet" onClick={async () => { await connect(); setShowPasswordSetup(true); }} style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', padding: '20px 16px',
                                cursor: 'pointer', color: 'var(--fg)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(168,85,247,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.15))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <WalletIcon size={18} style={{ color: '#a855f7' }} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>New Wallet</span>
                                <span className="text-xs text-muted" style={{ textAlign: 'center', lineHeight: 1.3 }}>Generate fresh keys</span>
                            </button>
                            <button id="btn-import-keystore" onClick={() => { setShowImportModal(true); }} style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', padding: '20px 16px',
                                cursor: 'pointer', color: 'var(--fg)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(168,85,247,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(34,197,94,0.15))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Upload size={18} style={{ color: '#3b82f6' }} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Import Keystore</span>
                                <span className="text-xs text-muted" style={{ textAlign: 'center', lineHeight: 1.3 }}>Restore from file</span>
                            </button>
                            <button id="btn-import-seed" onClick={() => { setShowSeedImportModal(true); }} style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', padding: '20px 16px',
                                cursor: 'pointer', color: 'var(--fg)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(168,85,247,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(249,115,22,0.15))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <KeyRound size={18} style={{ color: '#eab308' }} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Import from Seed</span>
                                <span className="text-xs text-muted" style={{ textAlign: 'center', lineHeight: 1.3 }}>24-word phrase</span>
                            </button>
                        </div>
                        {!extensionDetected && (
                            <a
                                href="https://chromewebstore.google.com/detail/rougechain-wallet/ilkbgjgphhaolfdjkfefdfiifipmhakj"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                            >
                                <Puzzle size={12} /> Get RougeChain Wallet Extension
                            </a>
                        )}
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
                            {address ? truncateKey(address) : truncateKey(publicKey!)}
                            {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={handleFaucet} disabled={faucetLoading}
                            style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                            <Droplets size={14} />
                            {faucetLoading ? 'Claiming...' : 'Faucet'}
                        </button>
                        <button className="btn btn-primary" onClick={() => { setShowSendModal(true); setSendError(''); setSendSuccess(''); }}
                            style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                            <Send size={14} />
                            Send
                        </button>
                        <button className="btn btn-secondary" onClick={fetchWalletData} disabled={loading}
                            style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                            <RefreshCw size={14} className={loading ? 'spin' : ''} />
                            Refresh
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowSettings(true)}
                            style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                            <Settings size={14} />
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
                                <img src="/icon-512.jpg" alt="XRGE" style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                }} />
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
                                        to={`/track/${nft.collectionId}_${nft.tokenId}`}
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

            {/* Settings Modal */}
            {showSettings && (
                <div className="sidebar-overlay" style={{
                    zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => { setShowSettings(false); setShowSeedReveal(false); }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', padding: 0, maxWidth: 520, width: '90%',
                        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                <Settings size={18} /> Wallet Settings
                            </h3>
                            <button onClick={() => { setShowSettings(false); setShowSeedReveal(false); }}
                                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}>
                                ✕
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

                            {/* Keystore section (hidden for extension wallets) */}
                            {!isExtensionWallet && (
                                <div style={{ marginBottom: 24 }}>
                                    <h4 className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)', marginBottom: 12 }}>Keystore Backup</h4>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                                            onClick={() => { setShowSettings(false); setShowExportModal(true); }}>
                                            <Download size={14} /> Export Keystore
                                        </button>
                                        <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                                            onClick={() => { setShowSettings(false); setShowImportModal(true); }}>
                                            <Upload size={14} /> Import Keystore
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Seed phrase section */}
                            {mnemonic && (
                                <div style={{ marginBottom: 24 }}>
                                    <h4 className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)', marginBottom: 12 }}>Seed Phrase</h4>
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                                        onClick={() => setShowSeedReveal(!showSeedReveal)}>
                                        {showSeedReveal ? <EyeOff size={14} /> : <Eye size={14} />}
                                        {showSeedReveal ? 'Hide' : 'Reveal'} Seed Phrase
                                    </button>
                                    {showSeedReveal && (
                                        <div style={{
                                            marginTop: 12, padding: 16,
                                            background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.04))',
                                            border: '1px solid rgba(168,85,247,0.15)',
                                            borderRadius: 'var(--radius)',
                                        }}>
                                            <p className="text-xs" style={{ color: '#f87171', marginBottom: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <AlertCircle size={12} /> Never share your seed phrase. Anyone with these words can steal your wallet.
                                            </p>
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                                gap: 6,
                                            }}>
                                                {mnemonic.split(' ').map((word, i) => (
                                                    <div key={i} style={{
                                                        padding: '6px 10px', background: 'var(--surface)',
                                                        borderRadius: 6, border: '1px solid var(--border)',
                                                        fontFamily: 'monospace', fontSize: '0.75rem',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                    }}>
                                                        <span style={{ color: 'var(--fg-muted)', fontSize: '0.65rem', minWidth: 18, textAlign: 'right' }}>{i + 1}.</span>
                                                        <span style={{ fontWeight: 600 }}>{word}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="btn btn-secondary" style={{
                                                marginTop: 10, fontSize: '0.75rem', padding: '6px 12px',
                                            }} onClick={() => navigator.clipboard.writeText(mnemonic)}>
                                                <Copy size={12} /> Copy All Words
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Danger zone */}
                            <div style={{
                                paddingTop: 16, borderTop: '1px solid var(--border)',
                            }}>
                                <h4 className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f87171', marginBottom: 12 }}>Danger Zone</h4>
                                <button className="btn btn-secondary" style={{
                                    fontSize: '0.8rem', padding: '8px 14px',
                                    color: '#f87171', borderColor: 'rgba(248,113,113,0.3)',
                                }} onClick={() => { setShowSettings(false); disconnect(); }}>
                                    <LogOut size={14} /> Disconnect Wallet
                                </button>
                                <p className="text-xs text-muted" style={{ marginTop: 8, lineHeight: 1.4 }}>
                                    This will clear your keys from this session. Make sure you've backed up your keystore or seed phrase first.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Setup Modal (after new wallet creation) */}
            {showPasswordSetup && (
                <div className="sidebar-overlay" style={{
                    zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', padding: 28, maxWidth: 420, width: '90%',
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
                                background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <KeyRound size={24} style={{ color: '#a855f7' }} />
                            </div>
                            <h3 style={{ color: 'var(--fg)', fontWeight: 700, fontSize: '1.1rem' }}>Set a Password</h3>
                            <p className="text-xs text-muted" style={{ marginTop: 6, lineHeight: 1.4 }}>
                                Create a password to encrypt your wallet keystore. You'll need this to import your wallet later.
                            </p>
                        </div>
                        <input type="password" placeholder="Create password (min 6 characters)"
                            value={newWalletPassword}
                            onChange={e => { setNewWalletPassword(e.target.value); setNewWalletPwdError(''); }}
                            style={{
                                width: '100%', padding: '10px 14px', background: 'var(--surface)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                color: 'var(--fg)', fontSize: '0.85rem', marginBottom: 8,
                            }}
                        />
                        <input type="password" placeholder="Confirm password"
                            value={newWalletConfirm}
                            onChange={e => { setNewWalletConfirm(e.target.value); setNewWalletPwdError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleNewWalletPassword()}
                            style={{
                                width: '100%', padding: '10px 14px', background: 'var(--surface)',
                                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                color: 'var(--fg)', fontSize: '0.85rem', marginBottom: 8,
                            }}
                        />
                        {newWalletPwdError && (
                            <p style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', marginBottom: 8 }}>{newWalletPwdError}</p>
                        )}
                        <button className="btn btn-primary" disabled={!newWalletPassword || !newWalletConfirm || newWalletPwdBusy}
                            onClick={handleNewWalletPassword}
                            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', gap: 6, marginBottom: 8 }}>
                            {newWalletPwdBusy ? 'Encrypting...' : 'Set Password & Export Keystore'}
                        </button>
                        <button onClick={() => setShowPasswordSetup(false)}
                            style={{
                                width: '100%', padding: '8px', fontSize: '0.8rem', gap: 6,
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer',
                            }}>
                            Skip for now
                        </button>
                        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 12, lineHeight: 1.4 }}>
                            Your keystore file is encrypted with AES-256-GCM (PBKDF2, 600K iterations).
                        </p>
                    </div>
                </div>
            )}

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

            {/* Send/Transfer Modal */}
            {showSendModal && (
                <div className="sidebar-overlay" style={{
                    zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => setShowSendModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 440, width: '90%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}>
                        <h3 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Send size={18} /> Send Tokens
                        </h3>
                        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                            Transfer XRGE or song tokens to another wallet.
                        </p>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Recipient Address</label>
                            <input type="text" className="form-input" placeholder="rouge1... address or public key"
                                value={sendTo} onChange={e => setSendTo(e.target.value)}
                                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Token</label>
                            <select className="form-input" value={sendToken}
                                onChange={e => setSendToken(e.target.value)}>
                                <option value="XRGE">XRGE (native)</option>
                                {tokens.map(t => (
                                    <option key={t.symbol} value={t.symbol}>
                                        {t.symbol} (bal: {t.balance.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount</label>
                            <input type="number" className="form-input" placeholder="0.00"
                                value={sendAmount} onChange={e => setSendAmount(e.target.value)}
                                min={0} step="0.01" />
                        </div>
                        {sendError && (
                            <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={12} /> {sendError}
                            </p>
                        )}
                        {sendSuccess && (
                            <p style={{ color: '#4ade80', fontSize: '0.75rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={12} /> {sendSuccess}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }}
                                onClick={handleSend}
                                disabled={sendLoading || !sendTo || !sendAmount}>
                                {sendLoading ? 'Sending...' : 'Send'}
                            </button>
                            <button className="btn btn-secondary"
                                onClick={() => setShowSendModal(false)}>
                                Cancel
                            </button>
                        </div>
                        <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                            Signed with ML-DSA-65 · Fee: ~0.5 XRGE
                        </p>
                    </div>
                </div>
            )}

            {/* Seed Phrase Import Modal */}
            {showSeedImportModal && (
                <div className="sidebar-overlay" style={{
                    zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => setShowSeedImportModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 480, width: '90%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}>
                        <h3 style={{ marginBottom: 4 }}>Import from Seed Phrase</h3>
                        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                            Enter your 24-word BIP-39 seed phrase to restore your wallet.
                        </p>
                        <div style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Seed Phrase</label>
                            <textarea
                                className="form-input"
                                placeholder="Enter your 24 words separated by spaces..."
                                value={seedInput}
                                onChange={e => setSeedInput(e.target.value)}
                                rows={3}
                                style={{ fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical' }}
                            />
                        </div>
                        {seedError && (
                            <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={12} /> {seedError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }}
                                disabled={!seedInput.trim()}
                                onClick={async () => {
                                    setSeedError('');
                                    const words = seedInput.trim().toLowerCase().split(/\s+/);
                                    if (words.length !== 12 && words.length !== 24) {
                                        setSeedError('Seed phrase must be 12 or 24 words');
                                        return;
                                    }
                                    try {
                                        await connectFromMnemonic(words.join(' '));
                                        setShowSeedImportModal(false);
                                        setSeedInput('');
                                        setShowPasswordSetup(true);
                                    } catch {
                                        setSeedError('Invalid seed phrase — check your words');
                                    }
                                }}
                            >
                                Import Wallet
                            </button>
                            <button className="btn btn-secondary"
                                onClick={() => { setShowSeedImportModal(false); setSeedError(''); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
