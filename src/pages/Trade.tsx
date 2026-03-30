import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, Loader, Coins, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useRougeChain } from '../hooks/useRougeChain';
import * as ext from '../utils/extensionSigner';
import { useNftTracks } from '../hooks/useNftTracks';
import TokenChart from '../components/TokenChart';

interface SongToken {
    symbol: string;
    name: string;
    supply: number;
    myBalance: number;
    image?: string;
    creator?: string;
    hasPool?: boolean;
}

interface PoolInfo {
    poolId: string;
    tokenA: string;
    tokenB: string;
    reserveA: number;
    reserveB: number;
    price?: number;
}

export default function TradePage() {
    const [searchParams] = useSearchParams();
    const { isConnected, connect, balance, walletKeys, isExtensionWallet, refreshBalance } = useWallet();
    const rc = useRougeChain();
    const { tracks } = useNftTracks();
    const [tokenSymbol, setTokenSymbol] = useState(searchParams.get('token') || '');
    const [amount, setAmount] = useState('');
    const [direction, setDirection] = useState<'buy' | 'sell'>((searchParams.get('direction') as 'buy' | 'sell') || 'buy');
    const [isSwapping, setIsSwapping] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // On-chain data
    const [songTokens, setSongTokens] = useState<SongToken[]>([]);
    const [pools, setPools] = useState<PoolInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState<{ amountOut: number; price: number } | null>(null);
    const [poolTokenAmt, setPoolTokenAmt] = useState('');

    const fetchTokensAndPools = useCallback(async () => {
        setLoading(true);
        try {
            // Build song token symbols from NFT track metadata (inside callback to avoid stale closure)
            const knownSongTokens = new Set(
                tracks
                    .map(t => (t as unknown as Record<string, unknown>).tokenSymbol as string)
                    .filter(Boolean)
            );

            // Fetch user's token balances if connected
            let myTokenBals: Record<string, number> = {};
            if (walletKeys?.publicKey) {
                try {
                    const balResp = await rc.getBalance(walletKeys.publicKey) as Record<string, unknown>;
                    const tb = (balResp.token_balances || {}) as Record<string, number>;
                    myTokenBals = tb;
                } catch { /* ignore */ }
            }

            // Fetch all tokens on-chain
            const allTokens = await rc.getTokens();
            const tokens: SongToken[] = (allTokens || [])
                .filter((t: Record<string, unknown>) => {
                    const sym = t.symbol as string;
                    if (!sym || sym === 'XRGE') return false;
                    return knownSongTokens.size === 0 || knownSongTokens.has(sym);
                })
                .map((t: Record<string, unknown>) => {
                    const raw = t;
                    const sym = String(raw.symbol || '');
                    return {
                        symbol: sym,
                        name: String(raw.name || raw.token_name || raw.symbol || ''),
                        supply: Number(raw.total_supply || raw.totalSupply || raw.initial_supply || 0),
                        myBalance: myTokenBals[sym] || 0,
                        image: raw.image ? String(raw.image) : undefined,
                        creator: raw.creator ? String(raw.creator) : undefined,
                    };
                });

            // Fetch DEX pools
            try {
                const allPools = await rc.dex.getPools();
                const poolList: PoolInfo[] = (allPools || []).map((p: Record<string, unknown>) => {
                    const raw = p;
                    return {
                        poolId: String(raw.pool_id || raw.id || ''),
                        tokenA: String(raw.token_a || ''),
                        tokenB: String(raw.token_b || ''),
                        reserveA: Number(raw.reserve_a || raw.amount_a || 0),
                        reserveB: Number(raw.reserve_b || raw.amount_b || 0),
                    };
                });

                // Mark tokens that have pools and calculate prices
                for (const tok of tokens) {
                    const pool = poolList.find(
                        p => (p.tokenA === tok.symbol && p.tokenB === 'XRGE') ||
                             (p.tokenB === tok.symbol && p.tokenA === 'XRGE')
                    );
                    if (pool) {
                        tok.hasPool = true;
                        // Price = XRGE reserve / Token reserve
                        if (pool.tokenA === 'XRGE' && pool.reserveB > 0) {
                            (pool as PoolInfo).price = pool.reserveA / pool.reserveB;
                        } else if (pool.tokenB === 'XRGE' && pool.reserveA > 0) {
                            (pool as PoolInfo).price = pool.reserveB / pool.reserveA;
                        }
                    }
                }

                setPools(poolList);
            } catch {
                setPools([]);
            }

            setSongTokens(tokens);
        } catch {
            setSongTokens([]);
        } finally {
            setLoading(false);
        }
    }, [rc, tracks, walletKeys]);

    useEffect(() => {
        fetchTokensAndPools();
    }, [fetchTokensAndPools]);

    // Get quote when token/amount/direction changes
    useEffect(() => {
        const getQuote = async () => {
            if (!tokenSymbol || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                setQuote(null);
                return;
            }
            const pool = pools.find(
                p => (p.tokenA === tokenSymbol && p.tokenB === 'XRGE') ||
                     (p.tokenB === tokenSymbol && p.tokenA === 'XRGE') ||
                     (p.tokenA === 'XRGE' && p.tokenB === tokenSymbol) ||
                     (p.tokenB === 'XRGE' && p.tokenA === tokenSymbol)
            );
            if (!pool) { setQuote(null); return; }

            try {
                const resp = await rc.dex.quote({
                    poolId: pool.poolId,
                    tokenIn: direction === 'buy' ? 'XRGE' : tokenSymbol,
                    tokenOut: direction === 'buy' ? tokenSymbol : 'XRGE',
                    amountIn: parseFloat(amount),
                });
                const raw = resp as unknown as Record<string, unknown>;
                setQuote({
                    amountOut: Number(raw.amount_out || 0),
                    price: Number(raw.effective_price || raw.price || 0),
                });
            } catch {
                setQuote(null);
            }
        };
        const timer = setTimeout(getQuote, 300);
        return () => clearTimeout(timer);
    }, [tokenSymbol, amount, direction, pools, rc]);

    const selectedPool = pools.find(
        p => (p.tokenA === tokenSymbol && p.tokenB === 'XRGE') ||
             (p.tokenB === tokenSymbol && p.tokenA === 'XRGE') ||
             (p.tokenA === 'XRGE' && p.tokenB === tokenSymbol) ||
             (p.tokenB === 'XRGE' && p.tokenA === tokenSymbol)
    );

    const handleSwap = async () => {
        if (!walletKeys || !tokenSymbol || !amount) return;
        setIsSwapping(true);
        setError('');
        setSuccess('');

        try {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error('Invalid amount');
            }

            if (!selectedPool) {
                throw new Error(`No liquidity pool exists for ${tokenSymbol}/XRGE. The artist needs to create one first.`);
            }

            if (direction === 'buy') {
                const swapOpts = { tokenIn: 'XRGE', tokenOut: tokenSymbol, amountIn: amountNum, minAmountOut: 0 };
                const result = isExtensionWallet
                    ? await ext.dexSwap(walletKeys.publicKey, swapOpts)
                    : await rc.dex.swap(walletKeys, swapOpts);
                if (!result.success) throw new Error(result.error || 'Swap failed');
                setSuccess(`Bought ${tokenSymbol} for ${amount} XRGE`);
            } else {
                const swapOpts = { tokenIn: tokenSymbol, tokenOut: 'XRGE', amountIn: amountNum, minAmountOut: 0 };
                const result = isExtensionWallet
                    ? await ext.dexSwap(walletKeys.publicKey, swapOpts)
                    : await rc.dex.swap(walletKeys, swapOpts);
                if (!result.success) throw new Error(result.error || 'Swap failed');
                setSuccess(`Sold ${amount} ${tokenSymbol} for XRGE`);
            }

            setAmount('');
            setQuote(null);
            fetchTokensAndPools();
            refreshBalance();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setIsSwapping(false);
        }
    };

    const handleCreatePool = async () => {
        if (!walletKeys || !tokenSymbol) return;
        const xrgeAmt = parseFloat(amount) || 0;
        const tokenAmt = parseFloat(poolTokenAmt) || 0;
        if (xrgeAmt <= 0 || tokenAmt <= 0) {
            setError('Enter both XRGE and token amounts for the pool');
            return;
        }
        const tok = songTokens.find(t => t.symbol === tokenSymbol);
        const available = tok ? (tok.myBalance || tok.supply) : 0;
        if (tok && available > 0 && tokenAmt > available) {
            setError(`Can't seed more than your balance (${available.toLocaleString()} ${tokenSymbol})`);
            return;
        }
        setIsSwapping(true);
        setError('');
        setSuccess('');

        try {
            const poolOpts = { tokenA: 'XRGE', tokenB: tokenSymbol, amountA: xrgeAmt, amountB: tokenAmt };
            const result = isExtensionWallet
                ? await ext.dexCreatePool(walletKeys.publicKey, poolOpts)
                : await rc.dex.createPool(walletKeys, poolOpts);
            if (!result.success) throw new Error(result.error || 'Failed to create pool');
            setSuccess(`Pool created: ${xrgeAmt.toLocaleString()} XRGE + ${tokenAmt.toLocaleString()} ${tokenSymbol}`);
            setPoolTokenAmt('');
            fetchTokensAndPools();
            refreshBalance();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create pool');
        } finally {
            setIsSwapping(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="page-container">
                <div className="empty-state" style={{ paddingTop: 120 }}>
                    <ArrowLeftRight />
                    <h3>Connect to Trade</h3>
                    <p style={{ marginBottom: 20 }}>
                        Connect your wallet to buy and sell song tokens on the RougeChain DEX.
                    </p>
                    <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h1>Trade Song Tokens</h1>
                <button className="btn btn-secondary" onClick={fetchTokensAndPools} disabled={loading}
                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>
            <p className="text-muted" style={{ marginBottom: 32 }}>
                Buy and sell song tokens on the RougeChain DEX · Balance: {balance} XRGE
            </p>

            {/* Price Chart */}
            {tokenSymbol && selectedPool && (
                <TokenChart
                    symbol={tokenSymbol}
                    poolId={selectedPool.poolId}
                    isTokenA={selectedPool.tokenA === tokenSymbol}
                />
            )}

            <div className="trade-grid">
                {/* Swap Panel */}
                <div>
                    <h3 style={{ marginBottom: 16 }}>
                        <ArrowLeftRight size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                        Swap
                    </h3>

                    <div className="form-group">
                        <label className="form-label">Direction</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className={`btn ${direction === 'buy' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setDirection('buy')}
                                style={{ flex: 1 }}
                            >
                                Buy Tokens
                            </button>
                            <button
                                className={`btn ${direction === 'sell' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setDirection('sell')}
                                style={{ flex: 1 }}
                            >
                                Sell Tokens
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Song Token</label>
                        <select className="form-input" value={tokenSymbol}
                            onChange={e => setTokenSymbol(e.target.value)}>
                            <option value="">Select a token</option>
                            {songTokens.map(t => (
                                <option key={t.symbol} value={t.symbol}>
                                    {t.symbol} — {t.name}{t.hasPool ? '' : ' (no pool)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {direction === 'buy' ? 'Amount (XRGE to spend)' : `Amount (${tokenSymbol || 'tokens'} to sell)`}
                        </label>
                        <input type="number" className="form-input" placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            min={0} step="0.01" />
                    </div>

                    {/* Quote Preview */}
                    {quote && (
                        <div style={{
                            padding: '10px 14px', marginBottom: 16,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', fontSize: '0.8125rem',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span className="text-muted">You'll receive</span>
                                <span style={{ fontWeight: 600 }}>
                                    ~{quote.amountOut.toLocaleString(undefined, { maximumFractionDigits: 4 })} {direction === 'buy' ? tokenSymbol : 'XRGE'}
                                </span>
                            </div>
                            {quote.price > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="text-muted">Price</span>
                                    <span className="text-xs">
                                        1 {tokenSymbol} = {quote.price.toFixed(6)} XRGE
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pool Info */}
                    {tokenSymbol && selectedPool && (
                        <div style={{
                            padding: '10px 14px', marginBottom: 16,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', fontSize: '0.75rem',
                        }}>
                            <div className="text-muted" style={{ marginBottom: 4 }}>Pool Reserves</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{selectedPool.tokenA}: {selectedPool.reserveA.toLocaleString()}</span>
                                <span>{selectedPool.tokenB}: {selectedPool.reserveB.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px', marginBottom: 16,
                            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                            borderRadius: 'var(--radius)', color: '#f87171', fontSize: '0.8125rem',
                        }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px', marginBottom: 16,
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: 'var(--radius)', color: '#4ade80', fontSize: '0.8125rem',
                        }}>
                            <CheckCircle size={14} /> {success}
                        </div>
                    )}

                    {tokenSymbol && !selectedPool ? (
                        <div>
                            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
                                No liquidity pool exists for <strong>{tokenSymbol}</strong>/XRGE yet.
                                Seed one to enable trading.
                            </p>

                            <div className="form-group">
                                <label className="form-label">XRGE to pair</label>
                                <input type="number" className="form-input" placeholder="e.g. 500"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    min={1} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">{tokenSymbol} tokens to pair</label>
                                <input type="number" className="form-input"
                                    placeholder={`Max: ${(songTokens.find(t => t.symbol === tokenSymbol)?.myBalance || 0).toLocaleString()}`}
                                    value={poolTokenAmt}
                                    onChange={e => setPoolTokenAmt(e.target.value)}
                                    min={1} />
                                {(() => {
                                    const tok = songTokens.find(t => t.symbol === tokenSymbol);
                                    const available = tok ? (tok.myBalance || tok.supply) : 0;
                                    return tok && available > 0 ? (
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                            {[10, 25, 50].map(pct => (
                                                <button key={pct} className="btn btn-secondary"
                                                    style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                                                    onClick={() => setPoolTokenAmt(String(Math.floor(available * pct / 100)))}>
                                                    {pct}%
                                                </button>
                                            ))}
                                            <span className="text-xs text-muted" style={{ alignSelf: 'center', marginLeft: 4 }}>
                                                of {available.toLocaleString()} {tok.myBalance > 0 ? 'held' : 'supply'}
                                            </span>
                                        </div>
                                    ) : null;
                                })()}
                            </div>

                            {parseFloat(amount) > 0 && parseFloat(poolTokenAmt) > 0 && (
                                <div style={{
                                    padding: '10px 14px', marginBottom: 16,
                                    background: 'var(--surface)', border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)', fontSize: '0.8125rem',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span className="text-muted">Starting price</span>
                                        <span style={{ fontWeight: 600 }}>
                                            {(parseFloat(amount) / parseFloat(poolTokenAmt)).toFixed(6)} XRGE/{tokenSymbol}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className="text-muted">Fully diluted value</span>
                                        <span className="text-xs">
                                            {((parseFloat(amount) / parseFloat(poolTokenAmt)) * (songTokens.find(t => t.symbol === tokenSymbol)?.supply || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} XRGE
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                disabled={isSwapping || !amount || !poolTokenAmt}
                                onClick={handleCreatePool}
                                style={{ width: '100%', padding: '14px 20px' }}
                            >
                                {isSwapping ? (
                                    <><Loader size={16} className="spin" /> Creating Pool...</>
                                ) : (
                                    <>Seed {tokenSymbol}/XRGE Pool</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn btn-primary"
                            disabled={!tokenSymbol || !amount || isSwapping || !selectedPool}
                            onClick={handleSwap}
                            style={{ width: '100%', padding: '14px 20px' }}
                        >
                            {isSwapping ? (
                                <><Loader size={16} className="spin" /> Swapping...</>
                            ) : (
                                <>{direction === 'buy' ? 'Buy' : 'Sell'} {tokenSymbol || 'Token'}</>
                            )}
                        </button>
                    )}
                </div>

                {/* Token List */}
                <div>
                    <h3 style={{ marginBottom: 16 }}>
                        <Coins size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                        Song Tokens on Chain
                        {songTokens.length > 0 && (
                            <span className="text-xs text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                                ({songTokens.length})
                            </span>
                        )}
                    </h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Loader size={24} className="spin" style={{ opacity: 0.5 }} />
                            <p className="text-sm text-muted" style={{ marginTop: 8 }}>Loading tokens...</p>
                        </div>
                    ) : songTokens.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Coins size={32} style={{ opacity: 0.3 }} />
                            <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                                No song tokens yet. Mint a track to create one!
                            </p>
                        </div>
                    ) : (
                        <div className="token-list">
                            {songTokens.map(t => {
                                const pool = pools.find(
                                    p => (p.tokenA === t.symbol || p.tokenB === t.symbol)
                                );
                                return (
                                    <div
                                        key={t.symbol}
                                        className={`token-list-item${t.symbol === tokenSymbol ? ' selected' : ''}`}
                                        onClick={() => setTokenSymbol(t.symbol)}
                                    >
                                        <div className="token-list-cover">
                                            {t.image ? (
                                                <img src={t.image} alt={t.name} />
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    background: 'var(--border)', fontSize: '0.65rem',
                                                    fontWeight: 700, color: 'var(--fg-muted)',
                                                }}>{t.symbol.slice(0, 3)}</div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="font-medium" style={{ fontSize: '0.875rem' }}>{t.symbol}</div>
                                            <div className="text-xs text-muted">{t.name}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="text-xs" style={{ fontWeight: 600 }}>
                                                {t.myBalance > 0 ? t.myBalance.toLocaleString() : (t.supply > 0 ? t.supply.toLocaleString() : '—')}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {t.myBalance > 0 ? 'You hold' : t.supply > 0 ? 'Supply' : ''}
                                            </div>
                                            <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                                                {t.hasPool || pool ? (
                                                    <span style={{ color: '#22c55e' }}>● Pool</span>
                                                ) : (
                                                    <span style={{ opacity: 0.5 }}>No pool</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin { animation: spin 1s linear infinite; }
                .trade-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 32px;
                }
                @media (max-width: 700px) {
                    .trade-grid {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                }
            `}</style>
        </div>
    );
}
