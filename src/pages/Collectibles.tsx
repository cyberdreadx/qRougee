import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, Loader, RefreshCw, X } from 'lucide-react';
import { useRougeChain } from '../hooks/useRougeChain';
import { useWallet } from '../hooks/useWallet';
import { useNftTracks } from '../hooks/useNftTracks';
import { getApiBase } from '../config/network';
import * as ext from '../utils/extensionSigner';

/**
 * Fan-facing collectibles page: browse every public-mint collectible album-cover
 * collection and mint an edition. (The per-track page also has a mint section,
 * but this is the discoverable "mint as a fan" destination.) Public-mint
 * collections charge their mint_price to the minter on the chain, so any wallet
 * can mint — creator or fan.
 */
interface Collectible {
    collection_id: string;
    symbol: string;
    name: string;
    creator: string;
    image?: string | null;
    minted: number;
    max_supply?: number;
    mint_price?: number;
    public_mint?: boolean;
}

export default function Collectibles() {
    const navigate = useNavigate();
    const rc = useRougeChain();
    const { walletKeys, isExtensionWallet, publicKey } = useWallet();
    const { allTracksUnfiltered: tracks } = useNftTracks();

    const [cols, setCols] = useState<Collectible[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${getApiBase()}/nft/collections`);
            const data = await res.json();
            const all = (data?.collections ?? (Array.isArray(data) ? data : [])) as Record<string, unknown>[];
            const mintable: Collectible[] = all
                .filter((c) => c.public_mint && String(c.symbol || '').toUpperCase().endsWith('COL'))
                .map((c) => ({
                    collection_id: String(c.collection_id || ''),
                    symbol: String(c.symbol || ''),
                    name: String(c.name || ''),
                    creator: String(c.creator || ''),
                    image: (c.image as string) || null,
                    minted: Number(c.minted ?? c.total_minted ?? 0),
                    max_supply: c.max_supply != null ? Number(c.max_supply) : undefined,
                    mint_price: c.mint_price != null ? Number(c.mint_price) : undefined,
                    public_mint: Boolean(c.public_mint),
                }));
            setCols(mintable);
        } catch {
            setMsg('Failed to load collectibles');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const trackFor = (c: Collectible) => tracks.find((t) => t.creator === c.creator && c.name.startsWith(t.title));
    const titleOf = (c: Collectible) => trackFor(c)?.title || c.name;
    const coverOf = (c: Collectible) => trackFor(c)?.coverUrl || c.image || '';
    const soldOut = (c: Collectible) => c.max_supply != null && c.minted >= c.max_supply;
    const canMint = Boolean(walletKeys);

    const onMint = async (c: Collectible) => {
        if (!walletKeys || !publicKey) return;
        setBusyId(c.collection_id);
        setMsg(null);
        try {
            const title = titleOf(c);
            const mintOpts = {
                collectionId: c.collection_id,
                name: `${title} — Collectible #${c.minted + 1}`,
                metadataUri: coverOf(c),
                attributes: { type: 'album_cover_collectible' },
            };
            const res = isExtensionWallet
                ? await ext.nftMint(publicKey, mintOpts)
                : await rc.nft.mint(walletKeys, mintOpts);
            if (res.success) {
                setMsg(`Minted "${title}" — it's in your wallet.`);
                await refresh();
            } else {
                setMsg((res as { error?: string }).error || 'Mint failed');
            }
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Mint failed');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h1>Collectibles</h1>
                <button className="btn btn-secondary" onClick={() => refresh()} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                Limited-edition album-cover NFTs anyone can mint. Each mint pays the creator.
            </p>

            {!canMint && (
                <div className="badge" style={{ marginBottom: 16 }}>Connect a wallet to mint.</div>
            )}

            {msg && (
                <div className="badge" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {msg}
                    <button onClick={() => setMsg(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {loading && cols.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <Loader size={28} className="spin" />
                    <p style={{ marginTop: 12 }}>Loading collectibles…</p>
                </div>
            ) : cols.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                    <Gem size={40} className="text-muted" />
                    <p style={{ marginTop: 12 }}>No collectibles available yet.</p>
                    <p className="text-sm text-muted">Creators can enable collectibles when minting a track.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                    {cols.map((c) => {
                        const track = trackFor(c);
                        const busy = busyId === c.collection_id;
                        const out = soldOut(c);
                        const cover = coverOf(c);
                        return (
                            <div key={c.collection_id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => track && navigate(`/track/${track.id}`)}
                                    onKeyDown={(e) => e.key === 'Enter' && track && navigate(`/track/${track.id}`)}
                                    style={{ cursor: track ? 'pointer' : 'default', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#111' }}
                                >
                                    {cover ? (
                                        <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <Gem size={28} className="text-muted" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {titleOf(c)}
                                    </div>
                                    <div className="text-xs text-muted">
                                        {c.minted}{c.max_supply != null ? ` / ${c.max_supply}` : ''} minted
                                    </div>
                                </div>
                                <span className="badge" style={{ alignSelf: 'flex-start' }}>
                                    {c.mint_price != null ? `${c.mint_price} XRGE` : 'Free'}
                                </span>
                                <button
                                    className="btn btn-primary"
                                    disabled={busy || !canMint || out}
                                    onClick={() => onMint(c)}
                                >
                                    {busy ? <Loader size={14} className="spin" /> : <Gem size={14} />}{' '}
                                    {out ? 'Sold out' : c.mint_price != null ? `Mint · ${c.mint_price} XRGE` : 'Mint'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
