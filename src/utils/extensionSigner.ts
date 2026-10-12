/**
 * Extension signing bridge for qRougee.
 *
 * When connected via Qwalla dApp browser or the browser extension, the private
 * key stays in the extension. This module constructs transaction payloads,
 * routes signing through window.rougechain.signTransaction(), and submits
 * the signed transactions to the node API.
 *
 * Provides drop-in replacements for @rougechain/sdk write methods.
 */

import { getApiBase } from '../config/network';

// ── Helpers ───────────────────────────────────────────────────────

function sortKeysDeep(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(sortKeysDeep);
    if (obj !== null && typeof obj === 'object') {
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
            sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
        }
        return sorted;
    }
    return obj;
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateNonce(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return bytesToHex(bytes);
}

interface Payload {
    [key: string]: unknown;
    from: string;
    timestamp: number;
    nonce: string;
}

interface SignedTx {
    payload: Payload;
    signature: string;
    public_key: string;
    payload_bytes_hex?: string;
}

type ApiResult = { success: boolean; error?: string; data?: unknown };

function getProvider() {
    const p = (window as any).rougechain;
    return p?.isRougeChain ? p : null;
}

async function signPayload(payload: Payload, publicKey: string): Promise<SignedTx> {
    const provider = getProvider();
    if (!provider) throw new Error('RougeChain wallet extension not available');

    const serialized = JSON.stringify(sortKeysDeep(payload));
    const serializedHex = bytesToHex(new TextEncoder().encode(serialized));

    let result: any;
    try {
        result = await provider.signTransaction(payload);
    } catch (e: any) {
        throw new Error(`Wallet signing rejected: ${e?.message || e}`);
    }
    if (!result?.signature) {
        throw new Error('Wallet did not return a signature — was the request approved?');
    }

    return { payload, signature: result.signature, public_key: publicKey, payload_bytes_hex: serializedHex };
}

async function submitSigned(endpoint: string, signedTx: SignedTx): Promise<ApiResult> {
    let res: Response;
    try {
        res = await fetch(`${getApiBase()}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signedTx),
        });
    } catch (e: any) {
        throw new Error(`Network error: ${e?.message || 'could not reach node'}`);
    }
    let data: any;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Node returned ${res.status} with non-JSON response`);
    }
    if (!res.ok || !data.success) {
        return { success: false, error: data.error || `Node error (${res.status})`, data };
    }
    return { success: true, error: undefined, data };
}

async function signAndSubmit(endpoint: string, payload: Payload, publicKey: string): Promise<ApiResult> {
    const signedTx = await signPayload(payload, publicKey);
    return submitSigned(endpoint, signedTx);
}

// ── Smart contract calls (GAME_READY) ─────────────────────────────
//
// Contract calls are signed CLIENT-SIDE and submitted to /v2/contract/execute
// (the old node-signed /v2/contract/call is deprecated). We build the exact
// payload the SDK's createSignedContractCall produces — type "contract_call"
// plus the chainId applyChainId adds — have the extension sign it (identical
// sortKeysDeep+JSON serialization), and submit the signed tx. Payable calls
// (e.g. marketplace `buy`) carry an `attach` { symbol, amount }.

const CONTRACT_MAX_GAS = 10_000_000;

function suggestGasLimit(gasUsed: number): number {
    return Math.min(Math.ceil((Number(gasUsed) || 0) * 1.5) + 1000, CONTRACT_MAX_GAS);
}

let cachedChainId: string | undefined;
async function getChainId(): Promise<string | undefined> {
    if (cachedChainId) return cachedChainId;
    try {
        const res = await fetch(`${getApiBase()}/health`);
        const data = await res.json();
        if (typeof data?.chain_id === 'string' && data.chain_id) {
            cachedChainId = data.chain_id;
            return cachedChainId;
        }
    } catch { /* node unreachable — sign without chainId and let the node decide */ }
    return undefined;
}

export interface ContractAttach {
    symbol: string;
    amount: number | bigint | string;
}

function normalizeAttach(attach: ContractAttach): { symbol: string; amount: number } {
    const symbol = String(attach.symbol).trim().toUpperCase();
    const amount = Number(attach.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error('Payment amount must be a positive integer (quanta for XRGE).');
    }
    return { symbol, amount };
}

export interface ContractQueryResult {
    success: boolean;
    error?: string | null;
    returnData?: unknown;
    gasUsed?: number;
    events?: unknown[];
}

/** Free, read-only contract query (no wallet / signature needed). */
export async function contractQuery(
    contractAddr: string,
    method: string,
    args: unknown = {},
    caller?: string,
    attach?: ContractAttach,
): Promise<ContractQueryResult> {
    const body: Record<string, unknown> = { method, args };
    if (caller) body.caller = caller;
    if (attach) body.attach = normalizeAttach(attach);
    try {
        const res = await fetch(
            `${getApiBase()}/contract/${encodeURIComponent(contractAddr.trim().toLowerCase())}/query`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        );
        const data = await res.json().catch(() => ({}));
        return {
            success: data.success === true,
            error: data.error,
            returnData: data.returnData,
            gasUsed: Number(data.gasUsed ?? 0),
            events: data.events ?? [],
        };
    } catch (e: any) {
        return { success: false, error: e?.message || 'query failed' };
    }
}

/** Signed contract call through the extension. Payable via `opts.attach`. */
export async function contractCall(
    publicKey: string,
    contractAddr: string,
    method: string,
    args: unknown = {},
    opts: { attach?: ContractAttach; gasLimit?: number } = {},
): Promise<ApiResult & { txId?: string }> {
    const addr = contractAddr.trim().toLowerCase();
    const attach = opts.attach ? normalizeAttach(opts.attach) : undefined;

    // Estimate gas + dry-run reject, mirroring the SDK (query with caller + attach).
    let gasLimit = opts.gasLimit;
    if (gasLimit === undefined) {
        const q = await contractQuery(addr, method, args, publicKey, opts.attach);
        if (!q.success) return { success: false, error: q.error || 'call would fail' };
        gasLimit = suggestGasLimit(q.gasUsed ?? 0);
    }

    const chainId = await getChainId();
    const payload: Payload = {
        type: 'contract_call',
        from: publicKey,
        contractAddr: addr,
        method,
        args: args ?? {},
        gasLimit,
        ...(attach ? { attach } : {}),
        ...(chainId ? { chainId } : {}),
        timestamp: Date.now(),
        nonce: generateNonce(),
    };
    const r = await signAndSubmit('/v2/contract/execute', payload, publicKey);
    return { ...r, txId: (r.data as { txId?: string } | undefined)?.txId };
}

// ── NFT Operations ────────────────────────────────────────────────

export async function nftCreateCollection(
    publicKey: string,
    opts: {
        symbol: string; name: string; maxSupply?: number; royaltyBps: number;
        description?: string; image?: string;
        publicMint?: boolean; mintPrice?: number;
        tokenGateSymbol?: string; tokenGateAmount?: number; discountPct?: number;
    }
): Promise<ApiResult> {
    const payload: Payload = {
        type: 'nft_create_collection',
        from: publicKey,
        symbol: opts.symbol,
        name: opts.name,
        fee: 50,
        ...(opts.maxSupply != null ? { maxSupply: opts.maxSupply } : {}),
        royaltyBps: opts.royaltyBps,
        ...(opts.description ? { description: opts.description } : {}),
        ...(opts.image ? { image: opts.image } : {}),
        ...(opts.publicMint != null ? { publicMint: opts.publicMint } : {}),
        ...(opts.mintPrice != null ? { mintPrice: opts.mintPrice } : {}),
        ...(opts.tokenGateSymbol ? { tokenGateSymbol: opts.tokenGateSymbol } : {}),
        ...(opts.tokenGateAmount != null ? { tokenGateAmount: opts.tokenGateAmount } : {}),
        ...(opts.discountPct != null ? { discountPct: opts.discountPct } : {}),
        timestamp: Date.now(),
        nonce: generateNonce(),
    };
    return signAndSubmit('/v2/nft/collection/create', payload, publicKey);
}

export async function nftMint(
    publicKey: string,
    opts: { collectionId: string; name: string; metadataUri: string; attributes?: Record<string, unknown> }
): Promise<ApiResult> {
    const payload: Payload = {
        type: 'nft_mint',
        from: publicKey,
        collectionId: opts.collectionId,
        name: opts.name,
        fee: 5,
        metadataUri: opts.metadataUri,
        ...(opts.attributes ? { attributes: opts.attributes } : {}),
        timestamp: Date.now(),
        nonce: generateNonce(),
    };
    return signAndSubmit('/v2/nft/mint', payload, publicKey);
}

// ── Token Operations ──────────────────────────────────────────────

export async function createToken(
    publicKey: string,
    opts: { name: string; symbol: string; totalSupply: number; image?: string }
): Promise<ApiResult> {
    const payload: Payload = {
        type: 'create_token',
        from: publicKey,
        token_name: opts.name,
        token_symbol: opts.symbol,
        initial_supply: Math.floor(opts.totalSupply),
        fee: 10,
        ...(opts.image ? { image: opts.image } : {}),
        timestamp: Date.now(),
        nonce: generateNonce(),
    };
    return signAndSubmit('/v2/token/create', payload, publicKey);
}

export async function transfer(
    publicKey: string,
    opts: { to: string; amount: number; token?: string }
): Promise<ApiResult> {
    const payload: Payload = {
        type: 'transfer',
        from: publicKey,
        to: opts.to,
        amount: opts.amount,
        fee: 1,
        token: opts.token || 'XRGE',
        timestamp: Date.now(),
        nonce: generateNonce(),
    };
    return signAndSubmit('/v2/transfer', payload, publicKey);
}

// ── DEX Operations ────────────────────────────────────────────────

export async function dexSwap(
    publicKey: string,
    opts: { tokenIn: string; tokenOut: string; amountIn: number; minAmountOut: number }
): Promise<ApiResult> {
    const payload: Payload = {
        type: 'swap',
        from: publicKey,
        token_in: opts.tokenIn,
        token_out: opts.tokenOut,
        amount_in: Math.floor(opts.amountIn),
        min_amount_out: Math.floor(opts.minAmountOut),
        timestamp: Date.now(),
        nonce: generateNonce(),
    };
    return signAndSubmit('/v2/swap/execute', payload, publicKey);
}

export async function dexCreatePool(
    publicKey: string,
    opts: { tokenA: string; tokenB: string; amountA: number; amountB: number }
): Promise<ApiResult> {
    const payload: Payload = {
        type: 'create_pool',
        from: publicKey,
        token_a: opts.tokenA,
        token_b: opts.tokenB,
        amount_a: Math.floor(opts.amountA),
        amount_b: Math.floor(opts.amountB),
        timestamp: Date.now(),
        nonce: generateNonce(),
    };
    return signAndSubmit('/v2/pool/create', payload, publicKey);
}

// ── Social Operations ─────────────────────────────────────────────

export async function socialRecordPlay(publicKey: string, trackId: string): Promise<ApiResult> {
    const payload: Payload = { from: publicKey, trackId, timestamp: Date.now(), nonce: generateNonce() };
    return signAndSubmit('/v2/social/play', payload, publicKey);
}

export async function socialToggleLike(publicKey: string, trackId: string): Promise<ApiResult> {
    const payload: Payload = { from: publicKey, trackId, timestamp: Date.now(), nonce: generateNonce() };
    return signAndSubmit('/v2/social/like', payload, publicKey);
}

export async function socialPostComment(publicKey: string, trackId: string, body: string): Promise<ApiResult> {
    const payload: Payload = { from: publicKey, trackId, body, timestamp: Date.now(), nonce: generateNonce() };
    return signAndSubmit('/v2/social/comment', payload, publicKey);
}

export async function socialDeleteComment(publicKey: string, commentId: string): Promise<ApiResult> {
    const payload: Payload = { from: publicKey, commentId, timestamp: Date.now(), nonce: generateNonce() };
    return signAndSubmit('/v2/social/comment/delete', payload, publicKey);
}

export async function socialToggleFollow(publicKey: string, artistPubkey: string): Promise<ApiResult> {
    const payload: Payload = { from: publicKey, artistPubkey, timestamp: Date.now(), nonce: generateNonce() };
    return signAndSubmit('/v2/social/follow', payload, publicKey);
}

export async function socialCreatePost(publicKey: string, body: string, replyToId?: string): Promise<ApiResult> {
    const payload: Payload = {
        from: publicKey, body, timestamp: Date.now(), nonce: generateNonce(),
        ...(replyToId ? { replyToId } : {}),
    };
    return signAndSubmit('/v2/social/post', payload, publicKey);
}

export async function socialDeletePost(publicKey: string, postId: string): Promise<ApiResult> {
    const payload: Payload = { from: publicKey, postId, timestamp: Date.now(), nonce: generateNonce() };
    return signAndSubmit('/v2/social/post/delete', payload, publicKey);
}

export async function socialHideTrack(publicKey: string, trackId: string, hidden: boolean): Promise<ApiResult> {
    const payload: Payload = { from: publicKey, trackId, hidden, timestamp: Date.now(), nonce: generateNonce() };
    return signAndSubmit('/v2/social/hide-track', payload, publicKey);
}

export async function nftBurn(publicKey: string, collectionId: string, tokenId: string): Promise<ApiResult> {
    const payload: Payload = {
        type: 'nft_burn', from: publicKey, collectionId, tokenId, fee: 1,
        timestamp: Date.now(), nonce: generateNonce(),
    };
    return signAndSubmit('/v2/nft/burn', payload, publicKey);
}

export async function nftTransfer(
    publicKey: string,
    collectionId: string,
    tokenId: string,
    to: string,
    salePrice?: number
): Promise<ApiResult> {
    const payload: Payload = {
        type: 'nft_transfer', from: publicKey, collectionId, tokenId, to, fee: 1,
        ...(salePrice != null ? { salePrice } : {}),
        timestamp: Date.now(), nonce: generateNonce(),
    };
    return signAndSubmit('/v2/nft/transfer', payload, publicKey);
}
