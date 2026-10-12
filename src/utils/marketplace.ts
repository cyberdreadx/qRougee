/**
 * Client wrapper around the on-chain NFT marketplace contract
 * (`contracts/nft_marketplace`). Mirrors the contract ABI exactly:
 *
 *   list   {collection, token_id, price}      → caller must own the NFT
 *   (then) nft_transfer to the market address  → escrow (no price)
 *   buy    {listing} + attach {XRGE, price}    → pays royalty + seller, hands over NFT
 *   cancel {listing}                           → seller only
 *   listing       {listing}  (free read)
 *   listing_count {}         (free read) → {next}; ids run 1..next
 *
 * Prices are in **quanta** end-to-end (the contract stores what `list` was
 * given, `listing` returns it, and `buy` attaches it back unchanged). The UI
 * works in XRGE and converts at the edges with xrgeToQuanta / quantaToXrge.
 *
 * NOTE: signed calls (list/buy/cancel) take a MarketSigner — a local wallet
 * (signed via the SDK) or an extension / Qwalla wallet (signed via the extension
 * bridge, ext.contractCall). All of this is inert until the market address is
 * configured (see config/marketplace) and the chain upgrade is active.
 */
import { xrgeToQuanta, quantaToXrge } from '@rougechain/sdk';
import type { RougeChain, WalletKeys } from '@rougechain/sdk';
import { getMarketplaceAddress } from '../config/marketplace';
import * as ext from './extensionSigner';

/**
 * Who signs a marketplace write. A local wallet signs via the SDK; an extension
 * (Qwalla) wallet signs the contract call through the extension bridge. Either
 * can list / buy / cancel.
 */
export interface MarketSigner {
    publicKey: string;
    walletKeys?: WalletKeys | null;
    isExtension: boolean;
}

export interface Listing {
    listing: number;
    exists: boolean;
    seller?: string;          // full public-key hex (not a rouge1 address)
    collection?: string;
    token_id?: number | string;
    price?: number | string;  // quanta
    active?: boolean;          // false = superseded by a newer listing of the same NFT
    escrowed?: boolean;        // buyable only when exists && active && escrowed
}

// Cap how far back we scan listings when locating one NFT's current listing.
const MAX_SCAN = 500;

function marketOrThrow(): string {
    const market = getMarketplaceAddress();
    if (!market) throw new Error('Marketplace is not available on this network yet');
    return market;
}

export async function listingCount(rc: RougeChain): Promise<number> {
    const market = marketOrThrow();
    const { returnData } = await rc.contracts.query(market, 'listing_count', {});
    return Number((returnData as { next?: number })?.next ?? 0);
}

export async function getListing(rc: RougeChain, id: number): Promise<Listing> {
    const market = marketOrThrow();
    const { returnData } = await rc.contracts.query(market, 'listing', { listing: id });
    return returnData as Listing;
}

/**
 * Find the authoritative listing for an NFT. Only the newest listing of a given
 * NFT can be active (an older one flips to active:false when replaced), so we
 * scan newest→oldest and return the first id whose collection+token_id match.
 * Capped at the MAX_SCAN most-recent listings.
 */
export async function findListingForNft(
    rc: RougeChain, collection: string, tokenId: number,
): Promise<Listing | null> {
    const next = await listingCount(rc);
    const stop = Math.max(1, next - MAX_SCAN + 1);
    for (let i = next; i >= stop; i--) {
        let l: Listing;
        try { l = await getListing(rc, i); } catch { continue; }
        if (!l?.exists) continue;
        if (l.collection === collection && Number(l.token_id) === tokenId) {
            return l; // newest listing for this NFT = authoritative
        }
    }
    if (next > MAX_SCAN) {
        console.warn(`Marketplace: scan capped at ${MAX_SCAN} listings; older ones not checked.`);
    }
    return null;
}

/** Register a listing, then escrow the NFT into the marketplace contract. */
export async function listNft(
    rc: RougeChain, signer: MarketSigner,
    collection: string, tokenId: number, priceXrge: string | number,
): Promise<void> {
    const market = marketOrThrow();
    if (signer.isExtension) {
        // 1) register — price must be a JSON integer (quanta) in the signed args
        const priceQuanta = Number(xrgeToQuanta(priceXrge));
        const listed = await ext.contractCall(signer.publicKey, market, 'list', {
            collection, token_id: tokenId, price: priceQuanta,
        });
        if (!listed.success) throw new Error(listed.error || 'Could not create listing');
        // 2) escrow the NFT into the contract (no price → not a sale, no royalty)
        const escrow = await ext.nftTransfer(signer.publicKey, collection, String(tokenId), market);
        if (!escrow.success) {
            throw new Error(escrow.error || 'Listing created but escrow transfer failed — cancel and retry');
        }
        return;
    }
    const wallet = signer.walletKeys as WalletKeys;
    const price = xrgeToQuanta(priceXrge); // quanta (bigint)
    // 1) register the listing — caller must own the NFT
    const listed = await rc.contracts.game(market, wallet).call('list', {
        collection, token_id: tokenId, price,
    });
    if (!listed.success) throw new Error(listed.error || 'Could not create listing');
    // 2) escrow the NFT into the contract (no price → not a sale, no royalty)
    const escrow = await rc.nft.transfer(wallet, { collectionId: collection, tokenId, to: market });
    if (!escrow.success) {
        throw new Error(escrow.error || 'Listing created but escrow transfer failed — cancel and retry');
    }
}

/** Buy an escrowed listing; payment is attached to the call in quanta. */
export async function buyListing(rc: RougeChain, signer: MarketSigner, listing: Listing): Promise<void> {
    const market = marketOrThrow();
    if (!listing.exists || !listing.active || !listing.escrowed) {
        throw new Error('This listing is not available to buy');
    }
    if (listing.price == null) throw new Error('Listing has no price');
    const attach = { symbol: 'XRGE', amount: Number(listing.price) };
    if (signer.isExtension) {
        const r = await ext.contractCall(signer.publicKey, market, 'buy', { listing: listing.listing }, { attach });
        if (!r.success) throw new Error(r.error || 'Purchase failed');
        return;
    }
    const res = await rc.contracts.game(market, signer.walletKeys as WalletKeys).call(
        'buy',
        { listing: listing.listing },
        { attach: { symbol: 'XRGE', amount: listing.price } },
    );
    if (!res.success) throw new Error(res.error || 'Purchase failed');
}

/** Cancel a listing (seller only); returns the NFT if it was escrowed. */
export async function cancelListing(rc: RougeChain, signer: MarketSigner, id: number): Promise<void> {
    const market = marketOrThrow();
    if (signer.isExtension) {
        const r = await ext.contractCall(signer.publicKey, market, 'cancel', { listing: id });
        if (!r.success) throw new Error(r.error || 'Cancel failed');
        return;
    }
    const res = await rc.contracts.game(market, signer.walletKeys as WalletKeys).call('cancel', { listing: id });
    if (!res.success) throw new Error(res.error || 'Cancel failed');
}

/** Format a quanta price for display in XRGE. */
export function formatPriceXrge(price: number | string | undefined): string {
    if (price == null) return '0';
    try { return quantaToXrge(price); } catch { return String(price); }
}
