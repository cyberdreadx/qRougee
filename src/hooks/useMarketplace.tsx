import { useCallback, useEffect, useState } from 'react';
import { xrgeToQuanta, quantaToXrge, pubkeyToAddress } from '@rougechain/sdk';
import { useRougeChain } from './useRougeChain';
import { useWallet } from './useWallet';
import * as ext from '../utils/extensionSigner';
import { getMarketplaceAddress } from '../config/network';

/**
 * NFT marketplace backed by the on-chain escrow contract
 * (quantum-vault/contracts/nft_marketplace):
 *   - list   → records a listing (seller must own the NFT now)
 *   - escrow → transfer the NFT to the contract (ONLY after list)
 *   - buy    → payable call; contract pays royalty + seller and moves the NFT
 *   - cancel → seller gets the NFT back
 * Reads (listing / listing_count) are free unsigned queries, so browsing needs
 * no wallet. Writes sign client-side, so they need a local wallet — the
 * extension bridge has no contract-call path yet.
 */
export interface Listing {
    id: number;
    seller: string; // raw ML-DSA pubkey hex (as the contract stored it)
    sellerAddress: string; // rouge1… derived from seller
    collection: string;
    tokenId: number;
    price: number; // quanta
    priceXrge: string;
    active: boolean;
    escrowed: boolean;
    buyable: boolean; // exists && active && escrowed
    mine: boolean;
}

interface RawListing {
    exists?: boolean;
    seller?: string;
    collection?: string;
    token_id?: number;
    price?: number;
    active?: boolean;
    escrowed?: boolean;
}

export function useMarketplace() {
    const rc = useRougeChain();
    const { publicKey, walletKeys, isExtensionWallet } = useWallet();
    const market = getMarketplaceAddress();
    // Local wallets sign via the SDK; extension wallets sign contract calls via
    // the extension bridge (ext.contractCall). Either can buy/list/cancel.
    const canWrite = Boolean(walletKeys) || (isExtensionWallet && Boolean(publicKey));

    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!market) {
            setListings([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const countRes = await rc.contracts.query(market, 'listing_count', {});
            const next = Number((countRes.returnData as { next?: number })?.next ?? 0);
            const out: Listing[] = [];
            for (let id = 1; id <= next; id++) {
                const r = await rc.contracts.query(market, 'listing', { listing: id });
                const d = (r.returnData ?? {}) as RawListing;
                if (!d.exists) continue;
                const seller = String(d.seller ?? '');
                let sellerAddress = '';
                try {
                    sellerAddress = seller ? await pubkeyToAddress(seller) : '';
                } catch {
                    /* leave blank */
                }
                const price = Number(d.price ?? 0);
                out.push({
                    id,
                    seller,
                    sellerAddress,
                    collection: String(d.collection ?? ''),
                    tokenId: Number(d.token_id ?? 0),
                    price,
                    priceXrge: quantaToXrge(price),
                    active: Boolean(d.active),
                    escrowed: Boolean(d.escrowed),
                    buyable: Boolean(d.exists && d.active && d.escrowed),
                    mine: Boolean(publicKey) && seller === publicKey,
                });
            }
            setListings(out);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load listings');
        } finally {
            setLoading(false);
        }
    }, [rc, market, publicKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    /** Buy a listing — attaches the exact price; contract settles royalty + seller. */
    const buy = useCallback(
        async (listing: Listing) => {
            const attach = { symbol: 'XRGE', amount: listing.price };
            if (isExtensionWallet) {
                if (!publicKey) throw new Error('Connect your wallet to buy.');
                const r = await ext.contractCall(publicKey, market, 'buy', { listing: listing.id }, { attach });
                if (!r.success) throw new Error(r.error || 'Purchase failed');
                if (r.txId) await rc.contracts.waitForReceipt(r.txId).catch(() => undefined);
            } else {
                if (!walletKeys) throw new Error('Connect a wallet to buy.');
                const res = await rc.contracts.game(market, walletKeys).call('buy', { listing: listing.id }, { attach });
                if (res.txId) await rc.contracts.waitForReceipt(res.txId).catch(() => undefined);
            }
            await refresh();
        },
        [rc, market, walletKeys, isExtensionWallet, publicKey, refresh],
    );

    /** Cancel your own listing — returns the escrowed NFT. */
    const cancel = useCallback(
        async (listing: Listing) => {
            if (isExtensionWallet) {
                if (!publicKey) throw new Error('Connect your wallet to cancel.');
                const r = await ext.contractCall(publicKey, market, 'cancel', { listing: listing.id });
                if (!r.success) throw new Error(r.error || 'Cancel failed');
                if (r.txId) await rc.contracts.waitForReceipt(r.txId).catch(() => undefined);
            } else {
                if (!walletKeys) throw new Error('Connect a wallet to cancel.');
                const res = await rc.contracts.game(market, walletKeys).call('cancel', { listing: listing.id });
                if (res.txId) await rc.contracts.waitForReceipt(res.txId).catch(() => undefined);
            }
            await refresh();
        },
        [rc, market, walletKeys, isExtensionWallet, publicKey, refresh],
    );

    /**
     * List an NFT: record the listing, wait for it to mine, THEN escrow the NFT.
     * Order matters — never escrow before the listing exists (the README warns an
     * NFT sent to the contract without a listing is unrecoverable).
     */
    const list = useCallback(
        async (collectionId: string, tokenId: number, priceXrge: string) => {
            const priceQuanta = Number(xrgeToQuanta(priceXrge));
            if (!(priceQuanta > 0)) throw new Error('Enter a valid price.');
            if (isExtensionWallet) {
                if (!publicKey) throw new Error('Connect your wallet to list.');
                const r = await ext.contractCall(publicKey, market, 'list', { collection: collectionId, token_id: tokenId, price: priceQuanta });
                if (!r.success) throw new Error(r.error || 'Listing failed');
                if (r.txId) await rc.contracts.waitForReceipt(r.txId); // must mine before escrow
                const esc = await ext.nftTransfer(publicKey, collectionId, String(tokenId), market);
                if (!esc.success) throw new Error(esc.error || 'Escrow transfer failed');
            } else {
                if (!walletKeys) throw new Error('Connect a wallet to list.');
                const listed = await rc.contracts.game(market, walletKeys).call('list', { collection: collectionId, token_id: tokenId, price: priceQuanta });
                if (listed.txId) await rc.contracts.waitForReceipt(listed.txId); // must mine before escrow
                await rc.nft.transfer(walletKeys, { collectionId, tokenId, to: market });
            }
            await refresh();
        },
        [rc, market, walletKeys, isExtensionWallet, publicKey, refresh],
    );

    return { market, listings, loading, error, refresh, buy, cancel, list, canWrite };
}
