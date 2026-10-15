import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Tag, Loader, RefreshCw, X } from 'lucide-react';
import { useRougeChain } from '../hooks/useRougeChain';
import { useWallet } from '../hooks/useWallet';
import { useNftTracks } from '../hooks/useNftTracks';
import { getNetwork } from '../config/network';
import { getMarketplaceAddress } from '../config/marketplace';
import {
    listingCount,
    getListing,
    buyListing,
    cancelListing,
    formatPriceXrge,
    type Listing,
} from '../utils/marketplace';
import { getMarketplaceSales, saleStats, enrichSale, type Sale } from '../utils/marketplaceActivity';

// Only scan this many recent listings for the browse grid.
const MAX_SCAN = 200;

function shortKey(k?: string): string {
    if (!k) return '';
    return k.length > 14 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k;
}

export default function Marketplace() {
    const navigate = useNavigate();
    const rc = useRougeChain();
    const { walletKeys, isExtensionWallet, publicKey } = useWallet();
    const { allTracksUnfiltered: tracks } = useNftTracks();
    const market = getMarketplaceAddress();

    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [sales, setSales] = useState<Sale[]>([]);

    // Load completed-sale history (for market stats + a recent-sales feed).
    useEffect(() => {
        if (!market) { setSales([]); return; }
        let cancelled = false;
        (async () => {
            try {
                const all = await getMarketplaceSales(rc);
                const enriched = await Promise.all(all.slice(0, 20).map(enrichSale));
                if (!cancelled) setSales(enriched);
            } catch { /* leave empty */ }
        })();
        return () => { cancelled = true; };
    }, [market, rc]);

    const canWrite = Boolean(walletKeys);
    const signer = walletKeys
        ? { publicKey: walletKeys.publicKey, walletKeys, isExtension: isExtensionWallet }
        : null;

    const refresh = useCallback(async () => {
        if (!market) {
            setListings([]);
            return;
        }
        setLoading(true);
        try {
            const next = await listingCount(rc);
            const stop = Math.max(1, next - MAX_SCAN + 1);
            const out: Listing[] = [];
            for (let id = next; id >= stop; id--) {
                try {
                    const l = await getListing(rc, id);
                    if (l?.exists) out.push({ ...l, listing: id });
                } catch { /* skip a bad read */ }
            }
            setListings(out);
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Failed to load listings');
        } finally {
            setLoading(false);
        }
    }, [rc, market]);

    useEffect(() => { refresh(); }, [refresh]);

    const trackFor = (l: Listing) => tracks.find((t) => t.id === `${l.collection}_${Number(l.token_id)}`);
    const isMine = (l: Listing) => Boolean(publicKey) && l.seller === publicKey;
    const buyable = (l: Listing) => Boolean(l.exists && l.active && l.escrowed);

    const onBuy = async (l: Listing) => {
        if (!signer) return;
        setBusyId(l.listing);
        setMsg(null);
        try {
            await buyListing(rc, signer, l);
            setMsg(`Purchased "${trackFor(l)?.title ?? 'NFT'}" — it's now in your wallet.`);
            await refresh();
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Purchase failed');
        } finally {
            setBusyId(null);
        }
    };

    const onCancel = async (l: Listing) => {
        if (!signer) return;
        setBusyId(l.listing);
        setMsg(null);
        try {
            await cancelListing(rc, signer, l.listing);
            setMsg('Listing cancelled — NFT returned.');
            await refresh();
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Cancel failed');
        } finally {
            setBusyId(null);
        }
    };

    if (!market) {
        return (
            <div className="page-container">
                <h1 style={{ marginBottom: 8 }}>Marketplace</h1>
                <div className="empty-state" style={{ paddingTop: 80 }}>
                    <Tag size={40} className="text-muted" />
                    <p style={{ marginTop: 12 }}>
                        The marketplace isn’t available on <strong>{getNetwork().label}</strong> yet.
                    </p>
                    <p className="text-sm text-muted">Switch to a network where the contract is deployed.</p>
                </div>
            </div>
        );
    }

    const shown = listings.filter((l) => buyable(l) || isMine(l));

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h1>Marketplace</h1>
                <button className="btn btn-secondary" onClick={() => refresh()} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                Album-cover NFTs listed for sale. A purchase pays the creator’s royalty and the seller in one
                on-chain call.
            </p>

            {(() => {
                const stats = saleStats(sales);
                const buyables = listings.filter(buyable);
                const floor = buyables.length ? Math.min(...buyables.map((l) => Number(l.price))) : null;
                const cards: [string, string][] = [
                    ['Floor', floor != null ? `${formatPriceXrge(floor)} XRGE` : '—'],
                    ['Volume', `${formatPriceXrge(stats.volumeQuanta)} XRGE`],
                    ['Sales', String(stats.count)],
                    ['Listed', String(buyables.length)],
                ];
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 16 }}>
                        {cards.map(([label, value]) => (
                            <div key={label} className="card" style={{ padding: 12 }}>
                                <div className="text-xs text-muted">{label}</div>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{value}</div>
                            </div>
                        ))}
                    </div>
                );
            })()}

            {!canWrite && (
                <div className="badge" style={{ marginBottom: 16 }}>Connect a wallet to buy or list.</div>
            )}

            {msg && (
                <div className="badge" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {msg}
                    <button className="btn-icon" onClick={() => setMsg(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {loading && listings.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <Loader size={28} className="spin" />
                    <p style={{ marginTop: 12 }}>Loading listings…</p>
                </div>
            ) : shown.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <ShoppingCart size={40} className="text-muted" />
                    <p style={{ marginTop: 12 }}>No active listings yet.</p>
                    <p className="text-sm text-muted">List one of your NFTs from its track page.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                    {shown.map((l) => {
                        const track = trackFor(l);
                        const busy = busyId === l.listing;
                        const mine = isMine(l);
                        return (
                            <div key={l.listing} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => track && navigate(`/track/${track.id}`)}
                                    onKeyDown={(e) => e.key === 'Enter' && track && navigate(`/track/${track.id}`)}
                                    style={{ cursor: track ? 'pointer' : 'default', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#111' }}
                                >
                                    {track?.coverUrl ? (
                                        <img src={track.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <Tag size={28} className="text-muted" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {track?.title ?? `NFT #${Number(l.token_id)}`}
                                    </div>
                                    <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {track?.artist ?? shortKey(l.seller)}
                                    </div>
                                </div>
                                <span className="badge" style={{ alignSelf: 'flex-start' }}>{formatPriceXrge(l.price)} XRGE</span>
                                {mine ? (
                                    <button className="btn btn-secondary" disabled={busy || !canWrite} onClick={() => onCancel(l)}>
                                        {busy ? <Loader size={14} className="spin" /> : <X size={14} />} Cancel
                                    </button>
                                ) : (
                                    <button className="btn btn-primary" disabled={busy || !canWrite || !buyable(l)} onClick={() => onBuy(l)}>
                                        {busy ? <Loader size={14} className="spin" /> : <ShoppingCart size={14} />}{' '}
                                        {buyable(l) ? `Buy · ${formatPriceXrge(l.price)}` : 'Unavailable'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {sales.length > 0 && (
                <div style={{ marginTop: 28 }}>
                    <h2 style={{ marginBottom: 12 }}>Recent sales</h2>
                    <div className="chain-info">
                        {sales.map((s) => {
                            const track = tracks.find((t) => t.id === `${s.collection}_${Number(s.tokenId)}`);
                            return (
                                <div key={s.txHash} className="chain-info-row" style={{ alignItems: 'center' }}>
                                    <span className="chain-info-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {track?.coverUrl && (
                                            <img src={track.coverUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                                        )}
                                        <span>
                                            <div style={{ fontWeight: 600 }}>{track?.title ?? `NFT #${Number(s.tokenId)}`}</div>
                                            <div className="text-xs text-muted">
                                                {s.at ? new Date(s.at).toLocaleDateString() : `block ${s.blockHeight}`}
                                            </div>
                                        </span>
                                    </span>
                                    <span className="chain-info-value" style={{ textAlign: 'right' }}>
                                        <strong>{formatPriceXrge(s.priceQuanta)} XRGE</strong>
                                        <div className="text-xs text-muted">{s.buyer ? `buyer ${shortKey(s.buyer)}` : ''}</div>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
