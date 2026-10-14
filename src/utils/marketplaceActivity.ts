/**
 * Marketplace activity & stats, reconstructed from the escrow contract's events.
 *
 * The contract emits:
 *   listed    {listing, seller, collection, token_id, price}
 *   sold      {listing, price, royalty, seller_proceeds}
 *   cancelled {listing, returned}
 *
 * `sold` doesn't carry the collection/token_id (or buyer), so we join each sale
 * to its `listed` event by listing id, and resolve the buyer + timestamp from
 * the sale's transaction (its sender is the buyer). All amounts are quanta.
 */
import type { RougeChain } from '@rougechain/sdk';
import { getApiBase } from '../config/network';
import { getMarketplaceAddress } from '../config/marketplace';

export interface Sale {
    listing: number;
    collection?: string;
    tokenId?: number;
    seller?: string;
    priceQuanta: number;
    royaltyQuanta: number;
    proceedsQuanta: number;
    txHash: string;
    blockHeight: number;
    buyer?: string; // resolved lazily from the tx
    at?: number; // epoch ms, resolved lazily from the tx
}

interface RawEvent {
    topic: string;
    data: string;
    block_height: number;
    tx_hash: string;
}

/** All completed sales, newest first (joined listed↔sold). */
export async function getMarketplaceSales(rc: RougeChain): Promise<Sale[]> {
    const market = getMarketplaceAddress();
    if (!market) return [];
    let events: RawEvent[] = [];
    try {
        events = (await rc.contracts.events(market)) as unknown as RawEvent[];
    } catch {
        // Fall back to the REST endpoint if the SDK build lacks events().
        try {
            const res = await fetch(`${getApiBase()}/contract/${market}/events`);
            const data = await res.json();
            events = data?.events ?? [];
        } catch {
            return [];
        }
    }

    const listed = new Map<number, { collection: string; tokenId: number; seller: string }>();
    for (const e of events) {
        if (e.topic !== 'listed') continue;
        try {
            const d = JSON.parse(e.data);
            listed.set(Number(d.listing), {
                collection: String(d.collection ?? ''),
                tokenId: Number(d.token_id ?? 0),
                seller: String(d.seller ?? ''),
            });
        } catch { /* skip malformed */ }
    }

    const sales: Sale[] = [];
    for (const e of events) {
        if (e.topic !== 'sold') continue;
        try {
            const d = JSON.parse(e.data);
            const base = listed.get(Number(d.listing));
            sales.push({
                listing: Number(d.listing),
                collection: base?.collection,
                tokenId: base?.tokenId,
                seller: base?.seller,
                priceQuanta: Number(d.price ?? 0),
                royaltyQuanta: Number(d.royalty ?? 0),
                proceedsQuanta: Number(d.seller_proceeds ?? 0),
                txHash: e.tx_hash,
                blockHeight: e.block_height,
            });
        } catch { /* skip malformed */ }
    }
    return sales.sort((a, b) => b.blockHeight - a.blockHeight);
}

/** Sales of a specific set of collections (e.g. a track's master + collectible). */
export function salesForCollections(sales: Sale[], collectionIds: (string | undefined)[]): Sale[] {
    const want = new Set(collectionIds.filter(Boolean) as string[]);
    if (!want.size) return [];
    return sales.filter((s) => s.collection && want.has(s.collection));
}

export interface SaleStats {
    count: number;
    volumeQuanta: number;
    royaltiesQuanta: number;
    lastPriceQuanta: number | null;
}

export function saleStats(sales: Sale[]): SaleStats {
    let volume = 0;
    let royalties = 0;
    for (const s of sales) {
        volume += s.priceQuanta;
        royalties += s.royaltyQuanta;
    }
    return {
        count: sales.length,
        volumeQuanta: volume,
        royaltiesQuanta: royalties,
        lastPriceQuanta: sales.length ? sales[0].priceQuanta : null, // sales are newest-first
    };
}

/** Resolve a sale's buyer (tx sender) + timestamp. Best-effort. */
export async function enrichSale(sale: Sale): Promise<Sale> {
    if (sale.buyer !== undefined) return sale;
    try {
        const res = await fetch(`${getApiBase()}/tx/${sale.txHash}`);
        const data = await res.json();
        const tx = data?.tx;
        return {
            ...sale,
            buyer: tx?.from_pub_key ? String(tx.from_pub_key) : '',
            at: Number(data?.blockTime) || undefined,
        };
    } catch {
        return { ...sale, buyer: '' };
    }
}
