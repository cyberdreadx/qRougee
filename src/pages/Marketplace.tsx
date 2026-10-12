import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Tag, Loader, RefreshCw, X } from 'lucide-react';
import { useMarketplace, type Listing } from '../hooks/useMarketplace';
import { useNftTracks } from '../hooks/useNftTracks';
import { getNetwork } from '../config/network';

function shortKey(k: string): string {
    if (!k) return '';
    if (k.startsWith('rouge1')) return k.slice(0, 10) + '…' + k.slice(-4);
    return k.slice(0, 6) + '…' + k.slice(-4);
}

export default function Marketplace() {
    const navigate = useNavigate();
    const { market, listings, loading, error, refresh, buy, cancel, canWrite } = useMarketplace();
    const { allTracksUnfiltered: tracks } = useNftTracks();

    const [busyId, setBusyId] = useState<number | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    const trackFor = (l: Listing) => tracks.find((t) => t.id === `${l.collection}_${l.tokenId}`);

    const onBuy = async (l: Listing) => {
        setBusyId(l.id);
        setMsg(null);
        try {
            await buy(l);
            setMsg(`Bought "${trackFor(l)?.title ?? 'NFT'}" for ${l.priceXrge} XRGE 🎉`);
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Purchase failed');
        } finally {
            setBusyId(null);
        }
    };

    const onCancel = async (l: Listing) => {
        setBusyId(l.id);
        setMsg(null);
        try {
            await cancel(l);
            setMsg('Listing cancelled — NFT returned.');
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
                        The marketplace isn’t deployed on <strong>{getNetwork().label}</strong> yet.
                    </p>
                    <p className="text-sm text-muted">Switch to a network where the contract is live.</p>
                </div>
            </div>
        );
    }

    const active = listings.filter((l) => l.buyable || l.mine);

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h1>Marketplace</h1>
                <button className="btn btn-secondary" onClick={() => refresh()} disabled={loading} aria-label="Refresh">
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                Album-cover NFTs listed for sale. Buying pays the creator’s royalty and the seller in one on-chain call.
            </p>

            {!canWrite && (
                <div className="badge" style={{ marginBottom: 16 }}>Connect a wallet to buy or list.</div>
            )}

            {msg && (
                <div className="badge" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {msg}
                    <button className="btn-icon" onClick={() => setMsg(null)} aria-label="Dismiss">
                        <X size={14} />
                    </button>
                </div>
            )}

            {error && <div className="text-sm" style={{ color: 'var(--error, #f66)', marginBottom: 16 }}>{error}</div>}

            {loading && listings.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <Loader size={28} className="spin" />
                    <p style={{ marginTop: 12 }}>Loading listings…</p>
                </div>
            ) : active.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <ShoppingCart size={40} className="text-muted" />
                    <p style={{ marginTop: 12 }}>No active listings yet.</p>
                    <p className="text-sm text-muted">List one of your NFTs from its track page.</p>
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 16,
                    }}
                >
                    {active.map((l) => {
                        const track = trackFor(l);
                        const busy = busyId === l.id;
                        return (
                            <div key={l.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                                        {track?.title ?? `NFT #${l.tokenId}`}
                                    </div>
                                    <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {track?.artist ?? shortKey(l.sellerAddress || l.seller)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span className="badge">{l.priceXrge} XRGE</span>
                                    {!l.escrowed && l.mine && <span className="text-xs text-muted">pending escrow</span>}
                                </div>
                                {l.mine ? (
                                    <button className="btn btn-secondary" disabled={busy || !canWrite} onClick={() => onCancel(l)}>
                                        {busy ? <Loader size={14} className="spin" /> : <X size={14} />} Cancel
                                    </button>
                                ) : (
                                    <button className="btn btn-primary" disabled={busy || !canWrite || !l.buyable} onClick={() => onBuy(l)}>
                                        {busy ? <Loader size={14} className="spin" /> : <ShoppingCart size={14} />}{' '}
                                        {l.buyable ? `Buy · ${l.priceXrge}` : 'Unavailable'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
