import { useState, useEffect, useCallback } from 'react';
import {
    Search, RefreshCw, ExternalLink, Coins, Image as ImageIcon,
    ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { useRougeChain } from '../hooks/useRougeChain';
import { useNftTracks } from '../hooks/useNftTracks';
import { explorerUrl, truncateHash } from '../utils/explorer';


interface ChainTx {
    hash: string;
    type: string;
    from: string;
    to?: string;
    amount?: number;
    token?: string;
    timestamp: number;
    fee?: number;
}

export default function Explorer() {
    const rc = useRougeChain();
    const { tracks, collections } = useNftTracks();


    const [txs, setTxs] = useState<ChainTx[]>([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'txs' | 'collections' | 'tokens'>('txs');
    const [tokens, setTokens] = useState<Record<string, unknown>[]>([]);

    const fetchExplorerData = useCallback(async () => {
        setLoading(true);
        try {
            // Helper to extract array from an API response (handles both bare arrays and wrapped)
            function extractArray(data: unknown): Record<string, unknown>[] {
                if (Array.isArray(data)) return data;
                if (data && typeof data === 'object') {
                    // Try common wrapper keys
                    const obj = data as Record<string, unknown>;
                    for (const key of Object.keys(obj)) {
                        if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
                    }
                }
                return [];
            }

            // Fetch recent transactions
            try {
                const txData = await rc.getTransactions({ limit: 30 });
                const txList = extractArray(txData);
                console.log('[Explorer] txs:', txList.length, 'raw keys:', txData && typeof txData === 'object' ? Object.keys(txData as Record<string, unknown>) : typeof txData);
                if (txList.length > 0) console.log('[Explorer] tx[0] keys:', Object.keys(txList[0]), 'sample:', txList[0]);
                setTxs(txList.map(item => {
                    // Structure: { txId, blockHeight, blockHash, blockTime, tx: { tx_type, from_pub_key, payload, signed_payload, ... } }
                    const inner = (item.tx || {}) as Record<string, unknown>;
                    const payload = (inner.payload || {}) as Record<string, unknown>;

                    // Try to parse signed_payload for more details
                    let signedData: Record<string, unknown> = {};
                    if (typeof inner.signed_payload === 'string') {
                        try { signedData = JSON.parse(inner.signed_payload); } catch { /* ignore */ }
                    }

                    const txType = String(inner.tx_type || signedData.type || item.type || '');
                    const from = String(inner.from_pub_key || signedData.from || item.from || '');
                    const to = (payload.to_pub_key_hex || signedData.to_pub_key_hex) ? String(payload.to_pub_key_hex || signedData.to_pub_key_hex) : undefined;
                    const amount = Number(payload.amount || signedData.amount || signedData.amount_in || 0) || undefined;
                    const token = String(signedData.token || signedData.token_in || signedData.symbol || payload.symbol || '') || undefined;

                    return {
                        hash: String(item.txId || item.hash || ''),
                        type: txType,
                        from,
                        to,
                        amount,
                        token,
                        timestamp: Number(item.blockTime || item.timestamp || 0),
                        fee: inner.fee ? Number(inner.fee) : undefined,
                    };
                }));
            } catch (e) { console.warn('[Explorer] txs failed:', e); setTxs([]); }


            // Fetch tokens
            try {
                const allTokens = await rc.getTokens();
                setTokens((allTokens || []).map(t => t as unknown as Record<string, unknown>));
            } catch { setTokens([]); }
        } finally {
            setLoading(false);
        }
    }, [rc]);

    useEffect(() => {
        fetchExplorerData();
    }, [fetchExplorerData]);

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

    const formatTxType = (type: string) => {
        const map: Record<string, string> = {
            transfer: 'Transfer',
            create_token: 'Create Token',
            faucet: 'Faucet',
            nft_create_collection: 'Create Collection',
            nft_mint: 'Mint NFT',
            nft_transfer: 'NFT Transfer',
            swap: 'Swap',
            stake: 'Stake',
            unstake: 'Unstake',
            create_pool: 'Create Pool',
            add_liquidity: 'Add Liquidity',
        };
        return map[type] || type;
    };

    const txTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            transfer: '#3b82f6',
            create_token: '#a855f7',
            faucet: '#22c55e',
            nft_create_collection: '#ec4899',
            nft_mint: '#f97316',
            swap: '#06b6d4',
            create_pool: '#eab308',
        };
        return colors[type] || 'var(--fg-muted)';
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h1>
                    <Search size={24} style={{ verticalAlign: -4, marginRight: 8 }} />
                    Explorer
                </h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <a
                        href="https://rougechain.io/explorer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '8px 14px', textDecoration: 'none' }}
                    >
                        <ExternalLink size={14} /> Full Explorer
                    </a>
                    <button className="btn btn-secondary" onClick={fetchExplorerData} disabled={loading}
                        style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                    </button>
                </div>
            </div>
            <p className="text-muted" style={{ marginBottom: 24 }}>
                RougeChain Testnet · Live on-chain data
            </p>

            {/* Stats Row */}
            <div className="stats-row" style={{ marginBottom: 24 }}>
                <div className="stat">
                    <div className="stat-value">{tracks.length}</div>
                    <div className="stat-label">NFTs Minted</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{collections.length}</div>
                    <div className="stat-label">Collections</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{tokens.length}</div>
                    <div className="stat-label">Tokens</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{txs.length}</div>
                    <div className="stat-label">Transactions</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20,
            }}>
                {(['txs', 'collections', 'tokens'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        background: 'none', border: 'none',
                        borderBottom: tab === t ? '2px solid var(--fg)' : '2px solid transparent',
                        color: tab === t ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer',
                        padding: '10px 20px', fontWeight: tab === t ? 600 : 400,
                        fontSize: '0.875rem', textTransform: 'capitalize',
                        transition: 'all 0.2s',
                    }}>
                        {t === 'txs' && <ArrowUpRight size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                        {t === 'collections' && <ImageIcon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                        {t === 'tokens' && <Coins size={14} style={{ verticalAlign: -2, marginRight: 6 }} />}
                        {t === 'txs' ? 'Transactions' : t}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ minHeight: 300 }}>

                {/* All Transactions */}
                {tab === 'txs' && (
                    <div>
                        {txs.length === 0 ? (
                            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 40 }}>
                                No transactions found
                            </p>
                        ) : txs.map((tx, i) => (
                            <a
                                key={i}
                                href={explorerUrl('tx', tx.hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="explorer-tx"
                            >
                                <div className="explorer-tx-icon" style={{
                                    background: `${txTypeColor(tx.type)}15`,
                                }}>
                                    {tx.to ? <ArrowDownLeft size={14} style={{ color: txTypeColor(tx.type) }} />
                                           : <ArrowUpRight size={14} style={{ color: txTypeColor(tx.type) }} />}
                                </div>
                                <div className="explorer-tx-info">
                                    <div className="explorer-tx-top">
                                        <span className="explorer-tx-badge" style={{
                                            background: `${txTypeColor(tx.type)}20`,
                                            color: txTypeColor(tx.type),
                                        }}>
                                            {formatTxType(tx.type)}
                                        </span>
                                        <span className="explorer-tx-hash">{tx.hash && truncateHash(tx.hash, 8)}</span>
                                    </div>
                                    <div className="text-xs text-muted explorer-tx-from">
                                        From: {truncateHash(tx.from, 6)}
                                        {tx.to && <span className="explorer-tx-to"> → {truncateHash(tx.to, 6)}</span>}
                                    </div>
                                </div>
                                <div className="explorer-tx-amount">
                                    {tx.amount !== undefined && (
                                        <div className="explorer-tx-value">
                                            {tx.amount.toLocaleString()} {tx.token || 'XRGE'}
                                        </div>
                                    )}
                                    <div className="text-xs text-muted">{formatTime(tx.timestamp)}</div>
                                </div>
                                <ExternalLink size={12} className="explorer-tx-link" />
                            </a>
                        ))}
                    </div>
                )}

                {/* Collections */}
                {tab === 'collections' && (
                    <div>
                        {collections.length === 0 ? (
                            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 40 }}>
                                No collections found
                            </p>
                        ) : (
                            <div className="explorer-grid">
                                {collections.map(col => {
                                    const colTracks = tracks.filter(t => t.collectionId === col.collection_id);
                                    return (
                                        <a
                                            key={col.collection_id}
                                            href={explorerUrl('collection', col.collection_id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="explorer-col-card"
                                        >
                                            <div className="explorer-col-img">
                                                {col.image ? (
                                                    <img src={col.image} alt={col.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <ImageIcon size={24} style={{ opacity: 0.3 }} />
                                                )}
                                            </div>
                                            <div style={{ padding: '12px 14px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>
                                                            {col.name}
                                                        </div>
                                                        <div className="text-xs text-muted">
                                                            {col.symbol} · {colTracks.length} token{colTracks.length !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                    <ExternalLink size={12} style={{ opacity: 0.4, marginTop: 4 }} />
                                                </div>
                                                <div className="text-xs text-muted" style={{ marginTop: 6 }}>
                                                    {truncateHash(col.creator)}
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tokens */}
                {tab === 'tokens' && (
                    <div>
                        {tokens.length === 0 ? (
                            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 40 }}>
                                No tokens found
                            </p>
                        ) : tokens.map((tok, i) => {
                            const sym = String(tok.symbol || '');
                            const name = String(tok.name || '');
                            const supply = Number(tok.total_supply || tok.totalSupply || tok.initial_supply || 0);
                            return (
                                <a
                                    key={i}
                                    href={explorerUrl('token', sym)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="explorer-tx"
                                >
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: sym === 'XRGE'
                                            ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                                            : 'var(--border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '0.65rem', flexShrink: 0,
                                        color: sym === 'XRGE' ? '#fff' : 'var(--fg)',
                                    }}>
                                        {tok.image ? (
                                            <img src={String(tok.image)} alt={sym}
                                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : sym.slice(0, 3)}
                                    </div>
                                    <div className="explorer-tx-info">
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sym}</div>
                                        <div className="text-xs text-muted">{name}</div>
                                    </div>
                                    <div className="explorer-tx-amount">
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                            {supply > 0 ? supply.toLocaleString() : '—'}
                                        </div>
                                        <div className="text-xs text-muted">supply</div>
                                    </div>
                                    <ExternalLink size={12} className="explorer-tx-link" />
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin { animation: spin 1s linear infinite; }

                /* Explorer transaction rows */
                .explorer-tx {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border);
                    text-decoration: none;
                    color: var(--fg);
                    transition: background 0.15s;
                }
                .explorer-tx:hover { background: var(--surface); }
                .explorer-tx-icon {
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .explorer-tx-info {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                }
                .explorer-tx-top {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                }
                .explorer-tx-badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .explorer-tx-hash {
                    font-weight: 500;
                    font-size: 0.8rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .explorer-tx-from {
                    margin-top: 2px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .explorer-tx-amount {
                    text-align: right;
                    flex-shrink: 0;
                }
                .explorer-tx-value {
                    font-weight: 600;
                    font-size: 0.85rem;
                    white-space: nowrap;
                }
                .explorer-tx-link {
                    opacity: 0.4;
                    flex-shrink: 0;
                }

                /* Explorer collection grid */
                .explorer-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 12px;
                }
                .explorer-col-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    text-decoration: none;
                    color: var(--fg);
                    transition: border-color 0.2s;
                }
                .explorer-col-card:hover { border-color: var(--fg-muted); }
                .explorer-col-img {
                    height: 100px;
                    background: var(--border);
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden;
                }

                /* Mobile responsive */
                @media (max-width: 600px) {
                    .explorer-tx {
                        gap: 8px;
                        padding: 10px 12px;
                        flex-wrap: wrap;
                    }
                    .explorer-tx-icon {
                        width: 28px;
                        height: 28px;
                    }
                    .explorer-tx-info {
                        flex: 1 1 calc(100% - 48px);
                        min-width: 0;
                    }
                    .explorer-tx-hash {
                        font-size: 0.72rem;
                    }
                    .explorer-tx-amount {
                        flex-basis: 100%;
                        text-align: left;
                        padding-left: 36px;
                        margin-top: -2px;
                    }
                    .explorer-tx-value {
                        font-size: 0.78rem;
                        display: inline;
                    }
                    .explorer-tx-amount .text-xs {
                        display: inline;
                        margin-left: 8px;
                    }
                    .explorer-tx-link {
                        display: none;
                    }
                    .explorer-tx-to {
                        display: none;
                    }
                    .explorer-grid {
                        grid-template-columns: 1fr;
                    }
                    .explorer-col-img {
                        height: 80px;
                    }
                }
            `}</style>
        </div>
    );
}
