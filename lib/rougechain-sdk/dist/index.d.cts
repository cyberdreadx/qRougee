interface WalletKeys {
    publicKey: string;
    privateKey: string;
    mnemonic?: string;
    /**
     * Network this wallet signs for (the exact chain id, e.g. "rougechain-mainnet-1"). When set,
     * every payload built by the SDK's signers carries it as `chainId`, inside the signed bytes.
     * The `RougeChain` client sets it for you (see `RougeChainOptions.chainId`).
     */
    chainId?: string;
}
interface ApiResponse<T = unknown> {
    success: boolean;
    error?: string;
    data?: T;
}
type TransactionType = "transfer" | "create_token" | "mint_tokens" | "swap" | "create_pool" | "add_liquidity" | "remove_liquidity" | "stake" | "unstake" | "faucet" | "nft_create_collection" | "nft_mint" | "nft_batch_mint" | "nft_transfer" | "nft_burn" | "nft_lock" | "nft_freeze_collection" | "bridge_withdraw" | "update_token_metadata" | "claim_token_metadata" | "approve" | "transfer_from" | "shield" | "shielded_transfer" | "unshield" | "contract_deploy" | "contract_call";
interface TransactionPayload {
    type: TransactionType;
    from: string;
    to?: string;
    amount?: number;
    fee?: number;
    token?: string;
    tokenSymbol?: string;
    evmAddress?: string;
    timestamp: number;
    nonce: string;
    /** Exact chain id of the network this payload is signed for (inside the signed bytes). */
    chainId?: string;
    token_name?: string;
    token_symbol?: string;
    initial_supply?: number;
    /** create_token (TOKEN_MINTING): `true` makes the token mintable by its creator; omitted otherwise. */
    mintable?: boolean;
    /** create_token (TOKEN_MINTING): optional supply cap, only with `mintable: true`. */
    max_supply?: number;
    token_in?: string;
    token_out?: string;
    amount_in?: number;
    min_amount_out?: number;
    pool_id?: string;
    token_a?: string;
    token_b?: string;
    amount_a?: number;
    amount_b?: number;
    lp_amount?: number;
    symbol?: string;
    name?: string;
    collectionId?: string;
    description?: string;
    image?: string;
    maxSupply?: number;
    royaltyBps?: number;
    royaltyRecipient?: string;
    tokenId?: number;
    metadataUri?: string;
    attributes?: unknown;
    locked?: boolean;
    frozen?: boolean;
    salePrice?: number;
    names?: string[];
    uris?: string[];
    /** @deprecated Ignored by the node; batch mints sign per-NFT attributes as `attributes`. */
    batchAttributes?: unknown[];
    website?: string;
    twitter?: string;
    discord?: string;
    publicMint?: boolean;
    mintPrice?: number;
    tokenGateSymbol?: string;
    tokenGateAmount?: number;
    discountPct?: number;
    spender?: string;
    owner?: string;
}
interface SignedTransaction {
    payload: TransactionPayload;
    signature: string;
    public_key: string;
    /**
     * Optional hex of the exact bytes that were signed. When present the node verifies the
     * signature over these bytes (and checks they parse to `payload`) instead of re-serializing.
     */
    payload_bytes_hex?: string;
}
interface BlockHeader {
    version: number;
    chain_id: string;
    height: number;
    time: number;
    prev_hash: string;
    tx_hash: string;
    proposer_pub_key: string;
}
interface Transaction {
    version: number;
    tx_type: string;
    from_pub_key: string;
    target_pub_key?: string | null;
    amount: number;
    fee: number;
    sig: string;
    token_name?: string | null;
    token_symbol?: string | null;
    token_decimals?: number | null;
    token_total_supply?: number | null;
    pool_id?: string | null;
    token_a_symbol?: string | null;
    token_b_symbol?: string | null;
    amount_a?: number | null;
    amount_b?: number | null;
    min_amount_out?: number | null;
    swap_path?: string[] | null;
    lp_amount?: number | null;
    faucet?: boolean;
    signed_payload?: string | null;
}
interface Block {
    version: number;
    header: BlockHeader;
    txs: Transaction[];
    proposer_sig: string;
    hash: string;
}
interface NodeStats {
    height: number;
    peers: number;
    network_height: number;
    mining: boolean;
    total_fees: number;
    last_block_fees: number;
    finalized_height: number;
    ws_clients: number;
    /** Current EIP-1559 base fee (XRGE) */
    base_fee: number;
    /** Total fees burned via EIP-1559 mechanism */
    total_fees_burned: number;
    /** Upgrade heights the node enforces (`null` = not scheduled on this network). */
    upgrade_schedule?: UpgradeSchedule;
}
/** `/api/stats` → `upgrade_schedule`: activation height per protocol upgrade, `null` = not scheduled. */
interface UpgradeSchedule {
    network?: string;
    tx_uniqueness?: number | null;
    proposer_selection?: number | null;
    finality_v2?: number | null;
    game_ready?: number | null;
    game_ready_2?: number | null;
    game_ready_3?: number | null;
    payable_calls?: number | null;
    /** TOKEN_MINTING: mintable custom tokens + creator-only capped `mint_tokens`. */
    token_minting?: number | null;
    /** CONTRACT_NFT_ROYALTY: contracts can read a collection's royalty (`host_nft_royalty_bps` / `host_nft_royalty_recipient`). */
    contract_nft_royalty?: number | null;
    [upgrade: string]: unknown;
}
interface TokenMetadata {
    symbol: string;
    name: string;
    creator: string;
    image?: string;
    description?: string;
    website?: string;
    twitter?: string;
    discord?: string;
    created_at: number;
    updated_at: number;
    decimals?: number;
    frozen?: boolean;
    /** TOKEN_MINTING: the creator can mint more of this token (created mintable by a block). */
    mintable?: boolean;
    /** TOKEN_MINTING: cap on initial + minted supply; `null` = uncapped. */
    max_supply?: number | null;
    /** TOKEN_MINTING: total minted after creation. */
    total_minted?: number;
    /** TOKEN_MINTING: supply credited at creation (mintable tokens only). */
    initial_supply?: number | null;
    /** TOKEN_MINTING: height of the block that created the token mintable. */
    mint_enabled_height?: number | null;
}
interface TokenHolder {
    address: string;
    balance: number;
}
interface BalanceResponse {
    balance: number;
    token_balances: Record<string, number>;
    lp_balances: Record<string, number>;
}
interface LiquidityPool {
    pool_id: string;
    token_a_symbol: string;
    token_b_symbol: string;
    reserve_a: number;
    reserve_b: number;
    total_lp: number;
    fee_rate: number;
    created_at: number;
}
interface SwapQuote {
    amount_out: number;
    price_impact: number;
    path: string[];
}
interface PoolEvent {
    event_type: string;
    pool_id: string;
    actor: string;
    token_a_amount?: number;
    token_b_amount?: number;
    lp_amount?: number;
    timestamp: number;
}
interface PoolStats {
    pool_id: string;
    volume_24h: number;
    trades_24h: number;
    tvl: number;
}
interface PriceSnapshot {
    pool_id: string;
    timestamp: number;
    block_height: number;
    reserve_a: number;
    reserve_b: number;
    price_a_in_b: number;
    price_b_in_a: number;
}
interface NftCollection {
    collection_id: string;
    symbol: string;
    name: string;
    creator: string;
    description?: string;
    image?: string;
    max_supply?: number;
    minted: number;
    royalty_bps: number;
    royalty_recipient: string;
    frozen: boolean;
    created_at: number;
    public_mint?: boolean;
    mint_price?: number;
    token_gate_symbol?: string;
    token_gate_amount?: number;
    discount_pct?: number;
}
interface NftToken {
    collection_id: string;
    token_id: number;
    owner: string;
    creator: string;
    name: string;
    metadata_uri?: string;
    attributes?: unknown;
    locked: boolean;
    minted_at: number;
    transferred_at: number;
}
interface Validator {
    public_key: string;
    stake: number;
    status: string;
    jailed_until: number;
    uptime: number;
}
/** One-shot validator health for a key (see RougeChain.getValidatorStatus). */
interface ValidatorStatus {
    publicKey: string;
    /** Liquid XRGE balance held by the key. */
    balance: number;
    /** XRGE currently staked by this key. */
    staked: number;
    /** Tier derived from stake: none (<10k) · standard (10k) · operator (100k) · genesis (1M). */
    tier: "none" | "standard" | "operator" | "genesis";
    /** Validator-set status: "active" | "jailed" | "inactive" | "not registered". */
    status: string;
    inActiveSet: boolean;
    blocksProposed: number;
    /** True once staked >= the 10,000 XRGE minimum. */
    meetsMinimum: boolean;
}
interface BridgeConfig {
    enabled: boolean;
    custodyAddress?: string;
    chainId: number;
    supportedTokens?: string[];
}
/** Relayer release lifecycle of a bridge withdrawal. */
type WithdrawalStatus = "pending" | "fulfilled" | "failed" | "refunded";
interface BridgeWithdrawal {
    txId: string;
    evmAddress: string;
    /** ETH/qETH are micro-units (1e-6); XRGE is whole tokens. */
    amountUnits: number;
    createdAt: number;
    /** RougeChain L1 public key of the withdrawer (refund recipient). */
    ownerPubkey: string;
    /** "XRGE", "qETH", "qUSDC", … — authoritative token discriminator. */
    tokenSymbol: string;
    status: WithdrawalStatus;
    /** Failed relayer release attempts so far. */
    attempts: number;
    lastError?: string;
}
interface XrgeBridgeConfig {
    enabled: boolean;
    vaultAddress?: string;
    tokenAddress?: string;
    chainId: number;
}
interface NameEntry {
    name: string;
    wallet_id: string;
    registered_at: string;
}
interface ResolvedName {
    entry?: NameEntry;
    wallet?: {
        id: string;
        display_name: string;
        signing_public_key: string;
        encryption_public_key: string;
    };
}
interface MailMessage {
    id: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    encrypted_subject?: string;
    encrypted_body?: string;
    attachment_encrypted?: string;
    attachmentEncrypted?: string;
    has_attachment?: boolean;
    hasAttachment?: boolean;
    reply_to_id?: string;
    replyToId?: string;
    signature?: string;
    contentSignature?: string;
    read: boolean;
    folder: "inbox" | "sent" | "trash";
    created_at: number;
    createdAt?: string;
    fromWalletId?: string;
    from_wallet_id?: string;
    toWalletIds?: string[];
    to_wallet_ids?: string[];
    subjectEncrypted?: string;
    subject_encrypted?: string;
    bodyEncrypted?: string;
    body_encrypted?: string;
}
interface SendMailParams {
    from: string;
    to: string;
    subject?: string;
    body?: string;
    encrypted_subject: string;
    encrypted_body: string;
    encrypted_attachment?: string;
    content_signature?: string;
    reply_to_id?: string;
}
interface MessengerWallet {
    id: string;
    displayName: string;
    signingPublicKey: string;
    encryptionPublicKey: string;
    created_at: number;
    /** Directory-shared avatar (base64 data URI), when the wallet set one. Snake_case on the wire. */
    avatarUrl?: string;
    avatar_url?: string;
}
/** Messenger conversation list folder. */
type MessengerFolder = "inbox" | "trash" | "all";
/** Private real-time event, delivered only to an authenticated participant's socket. */
interface MessengerNewMessageEvent {
    type: "new_message";
    conversation_id: string;
    message_id: string;
    created_at: string;
    /** Sender's signing public key. */
    sender_wallet_id: string;
    /** Participants' signing public keys. */
    participant_ids: string[];
}
interface MessengerConversation {
    id: string;
    /** Participant ids exactly as the node returns them (signing keys or wallet UUIDs). */
    participant_ids: string[];
    /**
     * Same list as `participant_ids`. The node never sends this field; the SDK fills it in
     * so code written against earlier SDK types keeps working.
     */
    participants: string[];
    created_by?: string;
    name?: string | null;
    is_group?: boolean;
    /** RFC 3339 timestamp. */
    created_at: string;
    /** Canonical wallet id -> time, for each participant who moved the thread to trash. */
    deleted_by?: Record<string, string>;
    last_message_at?: string;
    last_sender_id?: string;
    last_message_preview?: string | null;
    unread_count?: number;
}
interface MessengerMessage {
    id: string;
    conversation_id: string;
    sender_wallet_id: string;
    /** @deprecated Use sender_wallet_id */
    sender?: string;
    encrypted_content: string;
    signature: string;
    self_destruct: boolean;
    destruct_after_seconds?: number;
    created_at: number | string;
    is_read: boolean;
    read_at?: string;
    message_type: string;
    spoiler: boolean;
    /** Legacy — some old messages may have these */
    media_type?: string;
    media_data?: string;
}
interface TransferParams {
    to: string;
    amount: number;
    fee?: number;
    token?: string;
}
interface CreateTokenParams {
    name: string;
    symbol: string;
    totalSupply: number;
    fee?: number;
    /** Token logo — URL or data URI (base64). Stored on-chain in token metadata. */
    image?: string;
    /** Token description (signed with the payload). */
    description?: string;
    /**
     * Make the token mintable by its creator (node TOKEN_MINTING upgrade). Sent as `mintable: true`
     * only when true; the node refuses it before the upgrade is active ({@link RougeChain.isTokenMintingActive}).
     */
    mintable?: boolean;
    /** Optional cap on initial + minted supply. Only with `mintable: true`; integer ≥ totalSupply, ≤ 2^53-1. */
    maxSupply?: number;
}
interface MintTokenParams {
    /** Token symbol (the token must be mintable and the wallet its creator). */
    symbol: string;
    /** Positive integer, ≤ 2^53-1; initial + minted + amount must stay ≤ max supply. */
    amount: number;
    /** Signed fee (informational — the node charges 1 XRGE). */
    fee?: number;
    /** Optional durable replay protection (the account's next nonce). */
    accountNonce?: number;
}
interface FeeInfo {
    success: boolean;
    base_fee: number;
    priority_fee_suggestion: number;
    total_fee_suggestion: number;
    total_fees_burned: number;
    target_txs_per_block: number;
    fee_floor: number;
}
interface VoteMessage {
    vote_type: string;
    height: number;
    round: number;
    block_hash: string;
    voter_pub_key: string;
    signature: string;
}
interface FinalityProof {
    height: number;
    block_hash: string;
    total_stake: number;
    voting_stake: number;
    quorum_threshold: number;
    precommit_votes: VoteMessage[];
    created_at: number;
}
interface WsSubscribeMessage {
    subscribe?: string[];
    unsubscribe?: string[];
}
interface SwapParams {
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    minAmountOut: number;
}
interface CreatePoolParams {
    tokenA: string;
    tokenB: string;
    amountA: number;
    amountB: number;
}
interface AddLiquidityParams {
    poolId: string;
    amountA: number;
    amountB: number;
}
interface RemoveLiquidityParams {
    poolId: string;
    lpAmount: number;
}
interface StakeParams {
    amount: number;
    fee?: number;
}
interface CreateNftCollectionParams {
    symbol: string;
    name: string;
    maxSupply?: number;
    royaltyBps?: number;
    /** Wallet or contract address that receives secondary-sale royalties. Defaults to the creator when omitted. */
    royaltyRecipient?: string;
    image?: string;
    description?: string;
    publicMint?: boolean;
    mintPrice?: number;
    tokenGateSymbol?: string;
    tokenGateAmount?: number;
    discountPct?: number;
}
interface MintNftParams {
    collectionId: string;
    name: string;
    metadataUri?: string;
    attributes?: unknown;
}
interface BatchMintNftParams {
    collectionId: string;
    names: string[];
    uris?: string[];
    /** Per-NFT attributes, one entry per name. */
    attributes?: unknown[];
    /** @deprecated Alias of `attributes` (SDK ≤ 1.10.0 sent these under a field the node ignored). */
    batchAttributes?: unknown[];
}
interface TransferNftParams {
    collectionId: string;
    tokenId: number;
    to: string;
    salePrice?: number;
}
interface BurnNftParams {
    collectionId: string;
    tokenId: number;
}
interface LockNftParams {
    collectionId: string;
    tokenId: number;
    locked: boolean;
}
interface FreezeCollectionParams {
    collectionId: string;
    frozen: boolean;
}
interface BridgeWithdrawParams {
    amount: number;
    evmAddress: string;
    fee?: number;
    tokenSymbol?: string;
}
interface BridgeClaimParams {
    evmTxHash: string;
    evmAddress: string;
    evmSignature: string;
    recipientPubkey: string;
    token?: "ETH" | "USDC";
}
interface XrgeBridgeClaimParams {
    evmTxHash: string;
    evmAddress: string;
    amount: string;
    recipientPubkey: string;
}
interface XrgeBridgeWithdrawParams {
    amount: number;
    evmAddress: string;
}
interface SwapQuoteParams {
    poolId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
}
interface TokenMetadataUpdateParams {
    symbol: string;
    image?: string;
    description?: string;
    website?: string;
    twitter?: string;
    discord?: string;
}
interface ApproveParams {
    spender: string;
    tokenSymbol: string;
    amount: number;
}
interface TransferFromParams {
    owner: string;
    to: string;
    tokenSymbol: string;
    amount: number;
}
interface ShieldParams {
    /** Amount to shield (integer XRGE) */
    amount: number;
}
interface ShieldedTransferParams {
    /** Nullifiers of consumed input notes (hex) */
    nullifiers: string[];
    /** Commitments for output notes (hex) */
    outputCommitments: string[];
    /** STARK proof bytes (hex) */
    proof: string;
    /** Fee paid from the shielded pool */
    shieldedFee?: number;
}
interface UnshieldParams {
    /** Nullifiers of consumed notes (hex) */
    nullifiers: string[];
    /** Amount to unshield (integer XRGE) */
    amount: number;
    /** STARK proof bytes (hex) */
    proof: string;
}
interface ShieldedStats {
    success: boolean;
    commitment_count: number;
    nullifier_count: number;
    active_notes: number;
}
interface RollupStatus {
    pending_transfers: number;
    completed_batches: number;
    next_batch_id: number;
    max_batch_size: number;
    batch_timeout_secs: number;
    current_state_root: string;
    accounts_tracked: number;
}
interface RollupBatchResult {
    batch_id: number;
    transfer_count: number;
    total_fees: number;
    pre_state_root: string;
    post_state_root: string;
    proof_size_bytes: number;
    proof_time_ms: number;
    verified: boolean;
}
interface RollupSubmitParams {
    sender: string;
    receiver: string;
    amount: number;
    fee?: number;
}
interface RollupSubmitResult {
    success: boolean;
    queued: boolean;
    batch_completed: boolean;
    batch?: RollupBatchResult;
    pending_transfers?: number;
    max_batch_size?: number;
}
/** Contract metadata as returned by `GET /api/contract/:addr` and `GET /api/contracts`. */
interface ContractMetadata {
    /** 40-hex-char contract address. */
    address: string;
    /** Deployer's signing public key. */
    deployer: string;
    /** sha256 of the WASM bytecode (hex). */
    code_hash: string;
    /** Block height (or time, on legacy deployments) recorded at install. */
    created_at: number;
    wasm_size: number;
    [extra: string]: unknown;
}
/** An event a contract emitted with `host_emit_event` (node wire format). */
interface ContractEvent {
    contract_addr: string;
    topic: string;
    data: string;
    block_height: number;
    tx_hash: string;
}
/** WebSocket frame pushed to `contract:<addr>` subscribers once the block is accepted. */
interface ContractEventFrame extends ContractEvent {
    type: "contract_event";
}
/** Result of a read-only query (`POST /api/contract/:addr/query`) or an execute preview. */
interface ContractCallResult {
    success: boolean;
    returnData?: unknown;
    gasUsed: number;
    events: ContractEvent[];
    error?: string;
}
type ContractQueryResult = ContractCallResult;
interface PublishContractOptions {
    /** Signed nonce that seeds the address (≥ 8 chars). Random if omitted. */
    nonce?: string;
}
interface PublishContractResult {
    success: boolean;
    error?: string;
    txId?: string;
    /** Address reported by the node. */
    address?: string;
    /** Address computed locally from (from, nonce, wasm) — equal to `address` on success. */
    predictedAddress: string;
    /** The nonce that was signed (needed to re-derive the address). */
    nonce: string;
    /** Fee charged in XRGE (10 XRGE flat). */
    fee?: number;
}
/**
 * A payment attached to a contract call (payable calls, from the payable-calls upgrade).
 * `amount` is an INTEGER: quanta for XRGE (1 XRGE = 1_000_000_000 quanta — use
 * `xrgeToQuanta("0.5")`), raw units for tokens. It is signed as a JSON integer, so it must be
 * a positive safe integer (≤ `Number.MAX_SAFE_INTEGER`).
 *
 * The payment moves to the contract only if the call succeeds; a failing or trapping call leaves
 * it with the caller (the gas fee is still charged).
 */
interface ContractAttach {
    /** `"XRGE"` or a token symbol (sent upper-cased). */
    symbol: string;
    /** Positive integer: quanta for XRGE, raw units for tokens. */
    amount: bigint | number | string;
}
/** An attachment as it is signed and sent to the node. */
interface NormalizedContractAttach {
    symbol: string;
    amount: number;
}
interface ExecuteContractOptions {
    /**
     * Gas limit (1..10,000,000). The fee is `gasLimit × 0.000001` XRGE, charged up front.
     * If omitted, the SDK queries first (with the attachment) and uses
     * `ceil(gasUsed × 1.5) + 1000`, capped at 10M.
     */
    gasLimit?: number;
    /** Optional durable replay protection: must equal the account's next nonce. */
    accountNonce?: number;
    /** Pay the contract: XRGE (in quanta) or token units, moved only if the call succeeds. */
    attach?: ContractAttach;
}
interface QueryContractOptions {
    /** Preview a paid call. Requires `caller`. */
    attach?: ContractAttach;
}
interface ExecuteContractResult {
    success: boolean;
    error?: string;
    txId?: string;
    /** Fee charged in XRGE (`gasLimit × 0.000001`). */
    fee?: number;
    /** The gas limit that was signed. */
    gasLimit?: number;
    /** The attachment that was signed, if any. */
    attach?: NormalizedContractAttach;
    /** The node's dry run of the call (return data, gas used, events). */
    preview?: {
        returnData?: unknown;
        gasUsed: number;
        events: ContractEvent[];
    };
}
interface ContractStateValue {
    key: string;
    /** Hex of the stored bytes, or null if unset. */
    value: string | null;
    /** Lossy UTF-8 view of the stored bytes. */
    valueUtf8?: string;
}
interface ContractEventsQuery {
    limit?: number;
    /** Only events from blocks strictly below this height (paging). */
    before?: number;
    /** Only events emitted by this transaction (tx hash). */
    tx?: string;
}
type TxReceiptStatus = "Success" | {
    Failed: string;
};
interface TxReceipt {
    tx_hash: string;
    block_height: number;
    block_hash: string;
    index: number;
    tx_type: string;
    from: string;
    status: TxReceiptStatus;
    fee_paid: number;
    logs: {
        event_type: string;
        data: unknown;
    }[];
    timestamp: number;
}
/** @deprecated Node-signed `/v2/contract/deploy` is disabled since GAME_READY; use `rc.contracts.publish`. */
interface DeployContractParams {
    /** Base64-encoded WASM bytecode */
    wasm: string;
    /** Deployer's public key */
    deployer: string;
    /** Nonce for deterministic address */
    nonce?: number;
}
/** @deprecated `/v2/contract/call` is preview-only since GAME_READY; use `rc.contracts.execute` / `query`. */
interface CallContractParams {
    /** Contract address (hex) */
    contractAddr: string;
    /** Method name to call */
    method: string;
    /** Caller's public key */
    caller?: string;
    /** JSON arguments */
    args?: unknown;
    /** Gas limit (default 10M) */
    gasLimit?: number;
}

/**
 * Client-side shielded transaction crypto primitives.
 *
 * Mirrors the Rust commitment.rs exactly:
 *   commitment = SHA-256("ROUGECHAIN_COMMITMENT_V1" || value || pubkey || randomness)
 *   nullifier  = SHA-256("ROUGECHAIN_NULLIFIER_V1"  || randomness || commitment)
 */
/** Generate 32 bytes of cryptographically secure randomness (hex-encoded). */
declare function generateRandomness(): string;
/**
 * Compute a shielded note commitment.
 *
 * @param value       - Note value in XRGE (integer)
 * @param ownerPubKey - Owner's ML-DSA-65 public key (hex)
 * @param randomness  - 32-byte blinding factor (hex)
 * @returns 32-byte commitment hash (hex)
 */
declare function computeCommitment(value: number, ownerPubKey: string, randomness: string): string;
/**
 * Compute a nullifier for a shielded note.
 *
 * @param randomness - The note's blinding factor (hex)
 * @param commitment - The note's commitment hash (hex)
 * @returns 32-byte nullifier hash (hex)
 */
declare function computeNullifier(randomness: string, commitment: string): string;
/** A shielded note — kept locally by the owner (never sent to chain). */
interface ShieldedNote {
    commitment: string;
    nullifier: string;
    value: number;
    randomness: string;
    ownerPubKey: string;
}
/**
 * Create a new shielded note for a given value.
 *
 * @param value       - XRGE amount (integer)
 * @param ownerPubKey - Owner's public key (hex)
 * @returns A ShieldedNote with all derived fields
 */
declare function createShieldedNote(value: number, ownerPubKey: string): ShieldedNote;

/** Max gas per call (the node's `DEFAULT_FUEL_LIMIT`). */
declare const CONTRACT_MAX_GAS = 10000000;
/** XRGE charged per unit of signed gas limit. */
declare const CONTRACT_GAS_PRICE_XRGE = 0.000001;
/** Flat XRGE fee for publishing a contract. */
declare const CONTRACT_DEPLOY_FEE_XRGE = 10;
/** Standard (padded) base64 of `bytes`. */
declare function bytesToBase64(bytes: Uint8Array): string;
/** Decode standard base64 (whitespace ignored). Throws on invalid input. */
declare function base64ToBytes(b64: string): Uint8Array;
/**
 * The address a signed deployment will get:
 * `hex(sha256("rougechain/contract/v2" ‖ from ‖ 0x00 ‖ nonce ‖ 0x00 ‖ sha256(wasm))[..20])`.
 * Every input is inside the deployer's signature, so nobody else can claim the address.
 *
 * @param from  deployer's signing public key (hex, exactly as signed)
 * @param nonce the signed payload nonce
 * @param wasm  bytecode (bytes or base64)
 */
declare function predictContractAddress(from: string, nonce: string, wasm: Uint8Array | ArrayBuffer | string): string;
/** Gas limit the SDK signs when none is given: 1.5× the dry run plus headroom, capped at 10M. */
declare function suggestGasLimit(gasUsed: number): number;
/** Max fee in XRGE for a gas limit. */
declare function contractCallFee(gasLimit: number): number;
/** Quanta per XRGE (XRGE has 9 decimals). */
declare const QUANTA_PER_XRGE = 1000000000n;
/**
 * Convert an XRGE amount to integer quanta exactly (decimal string arithmetic, no float math).
 * Accepts `"1.5"`, `"0.000000001"`, `2`, `0.1`, `"1e-3"`. At most 9 decimal places; negative,
 * non-finite and malformed input throws.
 *
 * @example xrgeToQuanta("0.5") === 500_000_000n
 */
declare function xrgeToQuanta(xrge: number | string): bigint;
/**
 * Format integer quanta as an exact XRGE decimal string (no trailing zeros), e.g.
 * `quantaToXrge(1_500_000_000n) === "1.5"`.
 */
declare function quantaToXrge(quanta: bigint | number | string): string;
/**
 * Validate an attachment and normalize it to what is signed: an upper-cased symbol and a
 * positive integer amount that fits a JSON number exactly (≤ `Number.MAX_SAFE_INTEGER`).
 * Throws a descriptive error otherwise.
 */
declare function normalizeContractAttach(attach: ContractAttach): NormalizedContractAttach;
/**
 * Build a signed `contract_deploy` request (`POST /api/v2/contract/publish`).
 * Exposed for apps that submit on their own.
 */
declare function createSignedContractPublish(wallet: WalletKeys, wasm: Uint8Array | ArrayBuffer | string, opts?: PublishContractOptions): {
    signed: {
        payload_bytes_hex: string;
        payload: TransactionPayload;
        signature: string;
        public_key: string;
    };
    predictedAddress: string;
    nonce: string;
};
/**
 * Build a signed `contract_call` request (`POST /api/v2/contract/execute`).
 * `args` defaults to `{}` (what the block executor uses when none are signed).
 * `attach` (payable calls) is validated with {@link normalizeContractAttach} and signed as
 * `{"symbol": "XRGE", "amount": <integer>}`; this throws on an invalid attachment.
 */
declare function createSignedContractCall(wallet: WalletKeys, contractAddr: string, method: string, args: unknown, gasLimit: number, accountNonce?: number, attach?: ContractAttach): {
    payload_bytes_hex: string;
    payload: TransactionPayload;
    signature: string;
    public_key: string;
};
/** A game-dev-friendly handle on one contract. See {@link ContractsClient.game}. */
interface GameContract {
    readonly address: string;
    /** Signed, fee-paying call (requires the wallet given to `game()`). Pay with `{ attach }`. */
    call(method: string, args?: unknown, opts?: ExecuteContractOptions): Promise<ExecuteContractResult>;
    /** Free read-only call. The caller is the game wallet's key when one was given. */
    query(method: string, args?: unknown, opts?: QueryContractOptions): Promise<ContractQueryResult>;
    /** Whole storage (no key) or one key. */
    state(): Promise<Record<string, string>>;
    state(key: string | Uint8Array): Promise<ContractStateValue>;
    /** Live events for one topic, or `'*'` for all. Returns an unsubscribe function. */
    on(topic: string, cb: (event: ContractEvent) => void): () => void;
}
/** WASM smart contracts: signed publish/execute, free queries, state, events. */
declare class ContractsClient {
    private readonly rc;
    private stream;
    constructor(rc: RougeChain);
    /** @see predictContractAddress */
    predictContractAddress(from: string, nonce: string, wasm: Uint8Array | ArrayBuffer | string): string;
    /**
     * Publish (deploy) WASM bytecode signed by `wallet`. Costs 10 XRGE. The contract is installed
     * when the tx is mined; its address is known now (`predictedAddress`).
     */
    publish(wallet: WalletKeys, wasm: Uint8Array | ArrayBuffer | string, opts?: PublishContractOptions): Promise<PublishContractResult>;
    /**
     * Call a contract method as `wallet` (the contract sees it via `host_get_caller`). The node
     * dry-runs the call and refuses it if it would fail, so a failing call costs nothing.
     * Without `opts.gasLimit`, the SDK queries first and signs `ceil(gasUsed × 1.5) + 1000`.
     *
     * `opts.attach` pays the contract (payable calls): `{ symbol: "XRGE", amount: xrgeToQuanta("0.5") }`
     * or `{ symbol: "TOKEN", amount: <raw units> }`. The payment moves only if the call succeeds; a
     * failing call keeps it with the caller (the gas fee is still charged). The node refuses the call
     * up front if `wallet` can't cover the gas fee plus an XRGE payment (or the token amount).
     */
    execute(wallet: WalletKeys, contractAddr: string, method: string, args?: unknown, opts?: ExecuteContractOptions): Promise<ExecuteContractResult>;
    /**
     * Read-only call: no signature, no fee, nothing is committed. With `opts.attach` (and a
     * `caller`) it previews a paid call: the contract sees the payment as it would in a block.
     */
    query(contractAddr: string, method: string, args?: unknown, caller?: string, opts?: QueryContractOptions): Promise<ContractQueryResult>;
    /** Contract metadata, or null if no contract lives at `addr`. */
    get(contractAddr: string): Promise<ContractMetadata | null>;
    /**
     * Contract storage. With no key: every entry (keys and values as UTF-8 when valid, else hex).
     * With a key: that entry. A string key is sent as-is and the node reads it as hex when it
     * parses as hex, else as UTF-8; pass a `Uint8Array` to be unambiguous.
     */
    state(contractAddr: string): Promise<Record<string, string>>;
    state(contractAddr: string, key: string | Uint8Array): Promise<ContractStateValue>;
    /** Stored events, newest first as the node returns them. Page with `before` (block height). */
    events(contractAddr: string, q?: ContractEventsQuery): Promise<ContractEvent[]>;
    /** Every deployed contract. */
    list(): Promise<ContractMetadata[]>;
    /**
     * Live events from `contractAddr`, delivered after their block is accepted. All subscriptions
     * of this client share one WebSocket that reconnects and resubscribes on its own.
     * Returns a function that stops this subscription.
     */
    subscribe(contractAddr: string, onEvent: (event: ContractEvent) => void, opts?: {
        onStatus?: (live: boolean) => void;
    }): () => void;
    /**
     * Wait until `txId` is in a block and return its receipt. A `contract_call` whose contract
     * reverted in the block is still included (the fee is charged) and its receipt reports
     * `status: { Failed: "<error>" }`; a call that ran to completion reports `"Success"`.
     */
    waitForReceipt(txId: string, opts?: {
        timeoutMs?: number;
        intervalMs?: number;
    }): Promise<TxReceipt>;
    /**
     * A small handle for game code: `call` (signed), `query` (free), `state`, and `on(topic)`.
     *
     * @example
     * const g = rc.contracts.game(addr, wallet);
     * const off = g.on("move", (e) => render(JSON.parse(e.data)));
     * await g.call("move", { x: 1, y: 2 });
     * await g.call("roll", {}, { attach: { symbol: "XRGE", amount: xrgeToQuanta("0.5") } }); // paid
     */
    game(contractAddr: string, wallet?: WalletKeys): GameContract;
    /** POST that returns the node's JSON body on 4xx too (the node explains refusals there). */
    private send;
}

/**
 * Whether the node's TOKEN_MINTING upgrade applies to the next block, from `/api/stats`
 * (`upgrade_schedule.token_minting` = activation height, `null` = not scheduled). Mintable
 * `create_token` fields and `mint_tokens` are refused by the node until this is true.
 */
declare function tokenMintingActive(stats: {
    network_height?: number;
    upgrade_schedule?: {
        token_minting?: number | null;
    } | null;
} | null | undefined): boolean;

type FetchFn = typeof globalThis.fetch;
interface RougeChainOptions {
    /** Custom fetch implementation (defaults to globalThis.fetch) */
    fetch?: FetchFn;
    /** Optional API key for authenticated endpoints */
    apiKey?: string;
    /**
     * WebSocket constructor for live subscriptions (defaults to globalThis.WebSocket).
     * Pass e.g. the `ws` package on Node versions without a global WebSocket.
     */
    WebSocket?: new (url: string) => unknown;
    /**
     * Exact chain id of the network you intend to sign for ("rougechain-mainnet-1" or
     * "rougechain-devnet-1"). Every payload this client signs carries it as `chainId`, inside the
     * signed bytes, so a signature is only valid on that network. Before the first signature the
     * client checks it once against the node's `GET /api/health` `chain_id` and refuses to sign
     * (`ChainIdMismatchError`, code `CHAIN_ID_MISMATCH`) if they differ.
     *
     * Strongly recommended. Without it the client adopts whatever chain id the node reports, which
     * still binds each signature to one network but cannot catch a client pointed at the wrong node.
     */
    chainId?: string;
}
declare class RougeChain {
    /** @internal */ readonly baseUrl: string;
    /** @internal */ readonly fetchFn: FetchFn;
    /** @internal */ readonly headers: Record<string, string>;
    /** @internal */ readonly wsCtor: (new (url: string) => unknown) | undefined;
    /** Chain id configured in the options (undefined = adopt the node's). */
    readonly configuredChainId: string | undefined;
    private chainIdCheck;
    private resolvedChainId;
    readonly nft: NftClient;
    readonly dex: DexClient;
    readonly bridge: BridgeClient;
    readonly mail: MailClient;
    readonly messenger: MessengerClient;
    readonly shielded: ShieldedClient;
    readonly social: SocialClient;
    readonly contracts: ContractsClient;
    constructor(baseUrl: string, options?: RougeChainOptions);
    /**
     * The chain id this client signs for. Checked against the node once per client instance
     * (`GET /health` → `chain_id`); rejects with {@link ChainIdMismatchError} when the node reports
     * a different chain id than `options.chainId`. Without `options.chainId` the node's is adopted.
     */
    getChainId(): Promise<string>;
    /** The chain id if already known (configured or checked), without a network round trip. */
    knownChainId(): string | undefined;
    private fetchReportedChainId;
    /** @internal `wallet` bound to this client's (checked) chain id, for the signers. */
    bind<W extends WalletKeys>(wallet: W): Promise<W & {
        chainId: string;
    }>;
    /** @internal */
    get<T = unknown>(path: string): Promise<T>;
    /** @internal */
    post<T = unknown>(path: string, body: unknown): Promise<T>;
    /** @internal */
    submitTx(endpoint: string, signedTx: SignedTransaction): Promise<ApiResponse>;
    getStats(): Promise<NodeStats>;
    getHealth(): Promise<{
        status: string;
        chain_id: string;
        height: number;
    }>;
    getBlocks(opts?: {
        limit?: number;
    }): Promise<Block[]>;
    getBlocksSummary(range?: "1h" | "24h" | "7d"): Promise<unknown>;
    getBalance(publicKey: string): Promise<BalanceResponse>;
    getTokenBalance(publicKey: string, token: string): Promise<number>;
    getTransactions(opts?: {
        limit?: number;
        offset?: number;
    }): Promise<unknown>;
    getTokens(): Promise<TokenMetadata[]>;
    getTokenMetadata(symbol: string): Promise<TokenMetadata>;
    getTokenHolders(symbol: string): Promise<TokenHolder[]>;
    getTokenTransactions(symbol: string): Promise<unknown>;
    getValidators(): Promise<Validator[]>;
    getValidatorStats(): Promise<unknown>;
    /**
     * One-shot validator health for a key: balance, stake (+tier), active-set
     * membership, and blocks proposed. Mirrors the `rougechain validator-status`
     * CLI diagnostic. Minimum stake is 10,000 XRGE. Reads camelCase fields from
     * /validators (tolerating snake_case too).
     */
    getValidatorStatus(publicKey: string): Promise<ValidatorStatus>;
    getFinality(): Promise<{
        finalized_height: number;
        tip_height: number;
        total_stake: number;
        finalized_stake: number;
    }>;
    /** Get current EIP-1559 fee information including base fee and suggestions. */
    getFeeInfo(): Promise<FeeInfo>;
    /**
     * Get a BFT finality proof for a specific block height.
     * Returns the aggregated precommit votes that prove ≥2/3 validator stake agreed.
     */
    getFinalityProof(height: number): Promise<{
        success: boolean;
        proof?: FinalityProof;
        error?: string;
    }>;
    getPeers(): Promise<string[]>;
    getBurnedTokens(): Promise<{
        burned: Record<string, number>;
        total_xrge_burned: number;
    }>;
    /**
     * Resolve a rouge1… address to its public key, or a public key to its rouge1 address.
     * Uses the persistent on-chain address index for O(1) lookups.
     */
    resolveAddress(input: string): Promise<{
        success: boolean;
        address?: string;
        publicKey?: string;
        balance?: number;
        error?: string;
    }>;
    /** Get the current sequential nonce for an account. */
    getNonce(publicKey: string): Promise<{
        nonce: number;
        next_nonce: number;
    }>;
    /** Register an Expo push token — signed by wallet to prove ownership. */
    registerPushToken(wallet: WalletKeys, pushToken: string, platform?: string): Promise<ApiResponse>;
    /** Unregister push notifications — signed by wallet to prove ownership. */
    unregisterPushToken(wallet: WalletKeys): Promise<ApiResponse>;
    transfer(wallet: WalletKeys, params: TransferParams): Promise<ApiResponse>;
    /**
     * Create a token (`create_token`, 100 XRGE). With `mintable: true` (and optional `maxSupply`)
     * the creator can mint more later with {@link mintTokens} — node TOKEN_MINTING upgrade only;
     * check {@link isTokenMintingActive} first. Invalid mint options resolve to `{ success: false }`.
     */
    createToken(wallet: WalletKeys, params: CreateTokenParams): Promise<ApiResponse>;
    stake(wallet: WalletKeys, params: StakeParams): Promise<ApiResponse>;
    unstake(wallet: WalletKeys, params: StakeParams): Promise<ApiResponse>;
    faucet(wallet: WalletKeys): Promise<ApiResponse>;
    burn(wallet: WalletKeys, amount: number, fee?: number, token?: string): Promise<ApiResponse>;
    updateTokenMetadata(wallet: WalletKeys, params: TokenMetadataUpdateParams): Promise<ApiResponse>;
    claimTokenMetadata(wallet: WalletKeys, tokenSymbol: string): Promise<ApiResponse>;
    /**
     * Mint more of a mintable token (`mint_tokens`, signed; node TOKEN_MINTING upgrade). Creator
     * only; the node enforces the max supply and charges 1 XRGE. Errors (not creator, not
     * mintable, exceeds max supply, not active yet) resolve to `{ success: false, error }`.
     */
    mintTokens(wallet: WalletKeys, params: MintTokenParams): Promise<ApiResponse>;
    /** Whether the node's TOKEN_MINTING upgrade is active for the next block (see {@link tokenMintingActive}). */
    isTokenMintingActive(): Promise<boolean>;
    /**
     * Connect to the node's WebSocket and optionally subscribe to specific topics.
     * Topics: "blocks", "transactions", "stats", "account:<pubkey>", "token:<symbol>"
     *
     * @example
     * const ws = client.connectWebSocket(["blocks", "account:abc123"]);
     * ws.onmessage = (e) => console.log(JSON.parse(e.data));
     */
    connectWebSocket(topics?: string[]): WebSocket;
    /** Get the current rollup accumulator status. */
    getRollupStatus(): Promise<RollupStatus>;
    /** Submit a transfer into the rollup batch accumulator. */
    submitRollupTransfer(params: RollupSubmitParams): Promise<RollupSubmitResult>;
    /** Get the result of a completed rollup batch by ID. */
    getRollupBatch(batchId: number): Promise<RollupBatchResult>;
}
declare class NftClient {
    private readonly rc;
    constructor(rc: RougeChain);
    getCollections(): Promise<NftCollection[]>;
    getCollection(collectionId: string): Promise<NftCollection>;
    /**
     * Poll until a collection exists on-chain (i.e. the create tx has been mined).
     * Useful after `createCollection` since the tx goes to the mempool first.
     * @returns the collection once found, or throws after the timeout.
     */
    waitForCollection(collectionId: string, opts?: {
        timeoutMs?: number;
        pollMs?: number;
    }): Promise<NftCollection>;
    getTokens(collectionId: string, opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        tokens: NftToken[];
        total: number;
    }>;
    getToken(collectionId: string, tokenId: number): Promise<NftToken>;
    getByOwner(pubkey: string): Promise<NftToken[]>;
    createCollection(wallet: WalletKeys, params: CreateNftCollectionParams): Promise<ApiResponse>;
    mint(wallet: WalletKeys, params: MintNftParams): Promise<ApiResponse>;
    batchMint(wallet: WalletKeys, params: BatchMintNftParams): Promise<ApiResponse>;
    transfer(wallet: WalletKeys, params: TransferNftParams): Promise<ApiResponse>;
    burn(wallet: WalletKeys, params: BurnNftParams): Promise<ApiResponse>;
    lock(wallet: WalletKeys, params: LockNftParams): Promise<ApiResponse>;
    freezeCollection(wallet: WalletKeys, params: FreezeCollectionParams): Promise<ApiResponse>;
}
declare class DexClient {
    private readonly rc;
    constructor(rc: RougeChain);
    getPools(): Promise<LiquidityPool[]>;
    getPool(poolId: string): Promise<LiquidityPool>;
    getPoolEvents(poolId: string): Promise<PoolEvent[]>;
    getPriceHistory(poolId: string): Promise<PriceSnapshot[]>;
    getPoolStats(poolId: string): Promise<PoolStats>;
    quote(params: SwapQuoteParams): Promise<SwapQuote>;
    swap(wallet: WalletKeys, params: SwapParams): Promise<ApiResponse>;
    createPool(wallet: WalletKeys, params: CreatePoolParams): Promise<ApiResponse>;
    addLiquidity(wallet: WalletKeys, params: AddLiquidityParams): Promise<ApiResponse>;
    removeLiquidity(wallet: WalletKeys, params: RemoveLiquidityParams): Promise<ApiResponse>;
}
declare class BridgeClient {
    private readonly rc;
    constructor(rc: RougeChain);
    getConfig(): Promise<BridgeConfig>;
    /** List pending ETH/qETH/qUSDC withdrawals with relayer release status. */
    getWithdrawals(): Promise<BridgeWithdrawal[]>;
    /** Withdraw qETH/qUSDC — signed client-side, private key never sent to server */
    withdraw(wallet: WalletKeys, params: BridgeWithdrawParams): Promise<ApiResponse>;
    /** Claim qETH or qUSDC after depositing on Base Sepolia */
    claim(params: BridgeClaimParams): Promise<ApiResponse>;
    getXrgeConfig(): Promise<XrgeBridgeConfig>;
    claimXrge(params: XrgeBridgeClaimParams): Promise<ApiResponse>;
    withdrawXrge(wallet: WalletKeys, params: XrgeBridgeWithdrawParams): Promise<ApiResponse>;
    /** List pending XRGE withdrawals with relayer release status. */
    getXrgeWithdrawals(): Promise<BridgeWithdrawal[]>;
}
declare class MailClient {
    private readonly rc;
    constructor(rc: RougeChain);
    registerName(wallet: WalletKeys, name: string, walletId: string): Promise<ApiResponse>;
    resolveName(name: string): Promise<ResolvedName | null>;
    reverseLookup(walletId: string): Promise<string | null>;
    releaseName(wallet: WalletKeys, name: string): Promise<ApiResponse>;
    send(wallet: WalletKeys, params: SendMailParams): Promise<ApiResponse>;
    getInbox(wallet: WalletKeys): Promise<MailMessage[]>;
    getSent(wallet: WalletKeys): Promise<MailMessage[]>;
    getTrash(wallet: WalletKeys): Promise<MailMessage[]>;
    getMessage(wallet: WalletKeys, messageId: string): Promise<MailMessage | null>;
    move(wallet: WalletKeys, messageId: string, folder: string): Promise<ApiResponse>;
    markRead(wallet: WalletKeys, messageId: string): Promise<ApiResponse>;
    delete(wallet: WalletKeys, messageId: string): Promise<ApiResponse>;
}
declare class MessengerClient {
    private readonly rc;
    constructor(rc: RougeChain);
    getWallets(): Promise<MessengerWallet[]>;
    registerWallet(wallet: WalletKeys, opts: {
        id: string;
        displayName: string;
        signingPublicKey: string;
        encryptionPublicKey: string;
        discoverable?: boolean;
        /** Optional base64 data-URI avatar shared via the directory so peers can render it. */
        avatarUrl?: string;
    }): Promise<ApiResponse>;
    /**
     * List your conversations. `folder`: "inbox" (default), "trash" (conversations you
     * deleted, recoverable for 30 days) or "all".
     */
    getConversations(wallet: WalletKeys, opts?: {
        folder?: MessengerFolder;
    }): Promise<MessengerConversation[]>;
    createConversation(wallet: WalletKeys, participantIds: string[], opts?: {
        name?: string;
        isGroup?: boolean;
    }): Promise<ApiResponse>;
    /** Rename a group conversation (or clear its name by passing ""). Any participant may rename. */
    updateConversation(wallet: WalletKeys, conversationId: string, opts?: {
        name?: string;
    }): Promise<ApiResponse>;
    /**
     * Add participants to an existing conversation. Any participant may add. Future messages
     * encrypt to the new members automatically; they don't receive prior history.
     */
    addParticipants(wallet: WalletKeys, conversationId: string, participantIds: string[]): Promise<ApiResponse>;
    getMessages(wallet: WalletKeys, conversationId: string): Promise<MessengerMessage[]>;
    sendMessage(wallet: WalletKeys, conversationId: string, encryptedContent: string, opts?: {
        contentSignature?: string;
        messageType?: string;
        selfDestruct?: boolean;
        destructAfterSeconds?: number;
        spoiler?: boolean;
    }): Promise<ApiResponse>;
    deleteMessage(wallet: WalletKeys, messageId: string, conversationId: string): Promise<ApiResponse>;
    /**
     * Delete a conversation for YOU only. It moves to your trash and can be restored for
     * 30 days; `purge: true` skips the recovery window. The thread is removed for good
     * only once every participant has deleted it.
     */
    deleteConversation(wallet: WalletKeys, conversationId: string, opts?: {
        purge?: boolean;
    }): Promise<ApiResponse>;
    /** Restore a conversation from your trash. */
    restoreConversation(wallet: WalletKeys, conversationId: string): Promise<ApiResponse>;
    /** Restore a message you deleted (sender only, within the recovery window). */
    restoreMessage(wallet: WalletKeys, messageId: string, conversationId: string): Promise<ApiResponse>;
    /**
     * Build the signed `{ auth }` frame that subscribes a WebSocket to this wallet's
     * private `new_message` events. Nonces are single-use: build a new one per connect.
     */
    realtimeAuth(wallet: WalletKeys): {
        auth: SignedTransaction;
    };
    /**
     * Receive this wallet's new-message events in real time. Events carry routing data
     * only (conversation/message ids, sender + participant signing keys), never content;
     * fetch the message with `getMessages`. Reconnects and re-authenticates with backoff.
     * Returns a function that stops the subscription.
     *
     * @example
     * const stop = rc.messenger.subscribe(wallet, (ev) => refresh(ev.conversation_id));
     */
    subscribe(wallet: WalletKeys, onMessage: (event: MessengerNewMessageEvent) => void, opts?: {
        onStatus?: (live: boolean, error?: string) => void;
    }): () => void;
    markRead(wallet: WalletKeys, messageId: string, conversationId: string): Promise<ApiResponse>;
}
declare class ShieldedClient {
    private readonly rc;
    constructor(rc: RougeChain);
    getStats(): Promise<ShieldedStats>;
    isNullifierSpent(nullifierHex: string): Promise<{
        spent: boolean;
    }>;
    /**
     * Shield public XRGE into a private note.
     * Creates the commitment client-side, submits to the chain.
     *
     * @returns The ShieldedNote (keep this locally — it's the only way to spend the note)
     */
    shield(wallet: WalletKeys, params: ShieldParams): Promise<ApiResponse & {
        note?: ShieldedNote;
    }>;
    /**
     * Transfer between shielded notes (private → private).
     * Requires a pre-generated STARK proof.
     */
    transfer(wallet: WalletKeys, params: ShieldedTransferParams): Promise<ApiResponse>;
    /**
     * Unshield a private note back to public XRGE.
     * Requires a STARK proof of note ownership.
     */
    unshield(wallet: WalletKeys, params: UnshieldParams): Promise<ApiResponse>;
    /**
     * Deploy a WASM smart contract (node-signed, legacy).
     * @deprecated Disabled on networks with player-signed contracts (410 Gone). Use `rc.contracts.publish`.
     */
    deployContract(params: {
        wasm: string;
        deployer: string;
        nonce?: number;
    }): Promise<ApiResponse>;
    /**
     * Call a WASM smart contract method (legacy, node-signed).
     * @deprecated Preview-only on networks with player-signed contracts. Use `rc.contracts.execute` / `rc.contracts.query`.
     */
    callContract(params: {
        contractAddr: string;
        method: string;
        caller?: string;
        args?: unknown;
        gasLimit?: number;
    }): Promise<ApiResponse>;
    /** Get contract metadata. @deprecated Use `rc.contracts.get`. */
    getContract(addr: string): Promise<ApiResponse>;
    /** Read contract storage. Omit key for full state dump. @deprecated Use `rc.contracts.state`. */
    getContractState(addr: string, key?: string): Promise<ApiResponse>;
    /** Get contract events. @deprecated Use `rc.contracts.events`. */
    getContractEvents(addr: string, limit?: number): Promise<ApiResponse>;
    /** List all deployed contracts. @deprecated Use `rc.contracts.list`. */
    listContracts(): Promise<ApiResponse>;
}
interface TrackStats {
    plays: number;
    likes: number;
    commentCount: number;
    liked: boolean;
}
interface ArtistStats {
    followers: number;
    following: number;
    isFollowing: boolean;
}
interface SocialComment {
    id: string;
    track_id: string;
    wallet_pubkey: string;
    body: string;
    timestamp: string;
}
interface SocialPost {
    id: string;
    author_pubkey: string;
    body: string;
    reply_to_id: string | null;
    created_at: string;
}
interface PostStats {
    likes: number;
    reposts: number;
    replies: number;
    liked: boolean;
    reposted: boolean;
}
declare class SocialClient {
    private readonly rc;
    constructor(rc: RougeChain);
    recordPlay(wallet: WalletKeys, trackId: string): Promise<ApiResponse>;
    toggleLike(wallet: WalletKeys, trackId: string): Promise<ApiResponse & {
        liked?: boolean;
        likes?: number;
    }>;
    postComment(wallet: WalletKeys, trackId: string, body: string): Promise<ApiResponse & {
        comment?: SocialComment;
    }>;
    deleteComment(wallet: WalletKeys, commentId: string): Promise<ApiResponse>;
    toggleFollow(wallet: WalletKeys, artistPubkey: string): Promise<ApiResponse & {
        following?: boolean;
        followers?: number;
    }>;
    getTrackStats(trackId: string, viewerPubkey?: string): Promise<TrackStats>;
    getComments(trackId: string, limit?: number, offset?: number): Promise<SocialComment[]>;
    getArtistStats(pubkey: string, viewerPubkey?: string): Promise<ArtistStats>;
    getUserLikes(pubkey: string): Promise<string[]>;
    getUserFollowing(pubkey: string): Promise<string[]>;
    /** Followers of a pubkey, paginated (default 50, max 200 server-side). */
    getUserFollowers(pubkey: string, limit?: number, offset?: number): Promise<string[]>;
    createPost(wallet: WalletKeys, body: string, replyToId?: string): Promise<ApiResponse & {
        post?: SocialPost;
    }>;
    deletePost(wallet: WalletKeys, postId: string): Promise<ApiResponse>;
    toggleRepost(wallet: WalletKeys, postId: string): Promise<ApiResponse & {
        reposted?: boolean;
        reposts?: number;
    }>;
    getPost(postId: string, viewerPubkey?: string): Promise<{
        post: SocialPost;
        stats: PostStats;
    } | null>;
    getPostStats(postId: string, viewerPubkey?: string): Promise<PostStats>;
    getPostReplies(postId: string, limit?: number, offset?: number): Promise<SocialPost[]>;
    getUserPosts(pubkey: string, limit?: number, offset?: number): Promise<{
        posts: SocialPost[];
        total: number;
    }>;
    getGlobalTimeline(limit?: number, offset?: number): Promise<SocialPost[]>;
    getFollowingFeed(wallet: WalletKeys, limit?: number, offset?: number): Promise<SocialPost[]>;
    hideTrack(wallet: WalletKeys, trackId: string, hidden?: boolean): Promise<ApiResponse & {
        hidden?: boolean;
    }>;
    getHiddenTracks(pubkey: string): Promise<string[]>;
}

declare class Wallet implements WalletKeys {
    readonly publicKey: string;
    readonly privateKey: string;
    readonly mnemonic?: string;
    private constructor();
    /**
     * Generate a new ML-DSA-65 keypair with a BIP-39 mnemonic.
     * The mnemonic is stored on the wallet for backup/recovery.
     * @param strength 256 = 24 words (default, post-quantum safe), 128 = 12 words
     */
    static generate(strength?: 128 | 256): Wallet;
    /**
     * Generate a wallet using pure random entropy (no mnemonic).
     * Keys cannot be recovered from a seed phrase.
     */
    static generateRandom(): Wallet;
    /**
     * Restore a wallet from a BIP-39 mnemonic seed phrase.
     * @param mnemonic 12 or 24 word BIP-39 mnemonic
     * @param passphrase Optional BIP-39 passphrase (25th word)
     */
    static fromMnemonic(mnemonic: string, passphrase?: string): Wallet;
    /**
     * Restore a wallet from existing hex-encoded keys.
     */
    static fromKeys(publicKey: string, privateKey: string): Wallet;
    /**
     * Export keys as a plain object (for serialization/storage).
     */
    toJSON(): WalletKeys;
    /**
     * Derive the compact Bech32m address from the public key.
     * Returns a ~63-character `rouge1...` string.
     */
    address(): Promise<string>;
    /**
     * Verify that the keypair is valid by signing and verifying a test message.
     */
    verify(): boolean;
}

/**
 * BIP-39 Mnemonic Seed Phrase Support for RougeChain
 *
 * Derivation path:
 *   Mnemonic (12/24 words)
 *     → PBKDF2 (standard BIP-39) → 512-bit seed
 *     → HKDF-SHA256(seed, info="rougechain-ml-dsa-65-v1") → 32-byte ML-DSA seed
 *     → ml_dsa65.keygen(seed) → deterministic keypair
 *
 * The domain separator ensures the same mnemonic produces different keys
 * than Ethereum/Solana wallets, preventing cross-chain key reuse.
 */
/**
 * Generate a new BIP-39 mnemonic phrase.
 * @param strength 128 = 12 words (default), 256 = 24 words
 */
declare function generateMnemonic(strength?: 128 | 256): string;
/**
 * Validate a BIP-39 mnemonic phrase.
 */
declare function validateMnemonic(mnemonic: string): boolean;
/**
 * Derive a 32-byte ML-DSA-65 seed from a BIP-39 mnemonic.
 *
 * mnemonic → PBKDF2 → 512-bit BIP-39 seed → HKDF-SHA256 → 32-byte ML-DSA seed
 *
 * @param mnemonic  BIP-39 mnemonic (12 or 24 words)
 * @param passphrase  Optional BIP-39 passphrase (25th word)
 * @returns 32-byte seed suitable for ml_dsa65.keygen()
 */
declare function mnemonicToMLDSASeed(mnemonic: string, passphrase?: string): Uint8Array;
/**
 * Generate an ML-DSA-65 keypair from a BIP-39 mnemonic.
 *
 * Same mnemonic + passphrase always yields the same keypair.
 *
 * @param mnemonic  BIP-39 mnemonic (12 or 24 words)
 * @param passphrase  Optional BIP-39 passphrase (25th word)
 * @returns { publicKey, secretKey } as hex strings
 */
declare function keypairFromMnemonic(mnemonic: string, passphrase?: string): {
    publicKey: string;
    secretKey: string;
};

declare const BURN_ADDRESS = "XRGE_BURN_0x000000000000000000000000000000000000000000000000000000000000DEAD";
declare function serializePayload(payload: TransactionPayload): Uint8Array;
declare function signTransaction(payload: TransactionPayload, privateKey: string, publicKey: string): SignedTransaction;
declare function verifyTransaction(signedTx: SignedTransaction): boolean;
declare function isBurnAddress(address: string): boolean;
/** Chain id of RougeChain mainnet. */
declare const MAINNET_CHAIN_ID = "rougechain-mainnet-1";
/** Chain id of RougeChain testnet. */
declare const TESTNET_CHAIN_ID = "rougechain-devnet-1";
/**
 * Thrown when a signature would be made for a network other than the expected one: the node
 * reports another chain id than the client was configured with, or a payload / wallet already
 * names a different chain id. `code` is `"CHAIN_ID_MISMATCH"`.
 */
declare class ChainIdMismatchError extends Error {
    readonly expected: string;
    readonly actual: string;
    readonly code = "CHAIN_ID_MISMATCH";
    constructor(expected: string, actual: string);
}
/**
 * Return `wallet` bound to `chainId`: every payload the SDK signers build with the result carries
 * `chainId`, so the signature commits to that network. Throws {@link ChainIdMismatchError} if the
 * wallet is already bound to another chain id.
 */
declare function bindWalletToChain<W extends WalletKeys>(wallet: W, chainId: string): W & {
    chainId: string;
};
/** Add the wallet's chain id (if any) to a payload about to be signed. */
declare function applyChainId<P extends Record<string, unknown>>(wallet: WalletKeys, payload: P): P;
declare function createSignedTransfer(wallet: WalletKeys, to: string, amount: number, fee?: number, token?: string, accountNonce?: number): SignedTransaction;
/**
 * Largest integer the node accepts for a mint amount, a mintable token's initial supply and its
 * max supply (2^53 - 1, the largest integer JSON carries exactly). `TOKEN_MINT_MAX_AMOUNT` in
 * core/daemon/src/node.rs.
 */
declare const TOKEN_MINT_MAX_AMOUNT = 9007199254740991;
/** XRGE fee the node charges for a `mint_tokens` transaction (v2_binding). */
declare const TOKEN_MINT_FEE_XRGE = 1;
/** XRGE fee the node charges for a `create_token` transaction (v2_binding). */
declare const TOKEN_CREATE_FEE_XRGE = 100;
/** Extra options for {@link createSignedTokenCreation}. */
interface TokenCreationOptions {
    /**
     * Create the token mintable: its creator can mint more later with `mint_tokens`
     * (node TOKEN_MINTING upgrade — the node refuses this before the upgrade is active).
     */
    mintable?: boolean;
    /** Optional cap on initial + minted supply. Only with `mintable: true`; integer ≥ initial supply. */
    maxSupply?: number;
    /** Token description (signed with the payload). */
    description?: string;
}
/**
 * Validate the TOKEN_MINTING fields of a `create_token` and return the exact payload fields to sign:
 * `{}` for a fixed-supply token, `{ mintable: true }` or `{ mintable: true, max_supply }` for a
 * mintable one. Throws a clear error on invalid input (mirrors the node's checks).
 */
declare function tokenMintFields(initialSupply: number, options?: Pick<TokenCreationOptions, "mintable" | "maxSupply">): {
    mintable?: true;
    max_supply?: number;
};
declare function createSignedTokenCreation(wallet: WalletKeys, tokenName: string, tokenSymbol: string, initialSupply: number, fee?: number, // the node charges a fixed 100 XRGE for create_token (v2_binding)
image?: string, options?: TokenCreationOptions): SignedTransaction;
/**
 * Sign a `mint_tokens` (node TOKEN_MINTING upgrade): mint `amount` more of a mintable token to
 * its creator. Only the token's creator can mint; the node enforces the max supply and charges
 * {@link TOKEN_MINT_FEE_XRGE}. Submit to `POST /api/v2/token/mint`.
 */
declare function createSignedTokenMint(wallet: WalletKeys, tokenSymbol: string, amount: number, fee?: number, accountNonce?: number): SignedTransaction;
declare function createSignedTokenMetadataUpdate(wallet: WalletKeys, tokenSymbol: string, metadata: {
    image?: string;
    description?: string;
    website?: string;
    twitter?: string;
    discord?: string;
}): SignedTransaction;
declare function createSignedTokenMetadataClaim(wallet: WalletKeys, tokenSymbol: string): SignedTransaction;
declare function createSignedTokenApproval(wallet: WalletKeys, spender: string, tokenSymbol: string, amount: number): SignedTransaction;
declare function createSignedTokenTransferFrom(wallet: WalletKeys, owner: string, to: string, tokenSymbol: string, amount: number): SignedTransaction;
declare function createSignedBridgeWithdraw(wallet: WalletKeys, amount: number, evmAddress: string, tokenSymbol?: string, fee?: number): SignedTransaction;
declare function createSignedShield(wallet: WalletKeys, amount: number, commitment: string): SignedTransaction;
declare function createSignedShieldedTransfer(wallet: WalletKeys, nullifiers: string[], outputCommitments: string[], proof: string, shieldedFee?: number): SignedTransaction;
declare function createSignedUnshield(wallet: WalletKeys, nullifiers: string[], amount: number, proof: string): SignedTransaction;
declare function signRequest(wallet: WalletKeys, payload: Record<string, unknown>): SignedTransaction;

/**
 * Wallet message signing ("prove you control this wallet") and Sign-In with RougeChain.
 *
 * This file exists twice with the same body: `packages/core/src/message-signing.ts` (site,
 * extension) and `sdk/src/message-signing.ts` (published SDK). Only the import lines differ;
 * `packages/core/test/message-signing.test.ts` fails if the bodies drift apart.
 *
 * ## Signed bytes
 *
 *   UTF8("\x19RougeChain Signed Message:\n") ‖ decimal(len(message_bytes)) ‖ "\n" ‖ message_bytes
 *
 * signed with ML-DSA-65 (FIPS 204, empty context — the parameters every RougeChain wallet and
 * the node already use). A string message is encoded as UTF-8.
 *
 * ## Domain separation: a signed message is never a transaction signature, and vice versa
 *
 * The first signed byte is 0x19, and the signed bytes therefore are not a JSON document (RFC 8259
 * allows no raw control character below 0x20 anywhere except the whitespace 0x09 / 0x0A / 0x0D).
 * Every byte string the node verifies a transaction signature over IS a JSON document that
 * starts with `{` (0x7B), possibly after JSON whitespace — or (7) such a document behind a fixed
 * ASCII prefix:
 *
 *  1. V1 — `encode_tx_for_signing(tx)` (core/types/src/lib.rs): `serde_json::to_vec` of a struct
 *     `{"version":…,"tx_type":…,"from_pub_key":…,"nonce":…,"payload":…,"fee":…}`. First byte `{`.
 *  2. V1 legacy — `encode_tx_v1(tx)` with `sig` cleared: `serde_json::to_vec` of the `TxV1`
 *     struct. First byte `{`. (Block import only, node.rs `import_block`.)
 *  3. V2 `/api/v2/*` — `verify_signed_tx` (core/daemon/src/main.rs): the signed bytes are
 *     `payload_bytes_hex`, which must parse with `serde_json::from_slice` to a value equal to the
 *     request's `payload`, or `serde_json::to_string(payload)`; `payload` must be an object (a
 *     `timestamp` field is required). First byte `{` or JSON whitespace (0x20/0x09/0x0A/0x0D).
 *     The node keeps those bytes as the transaction's `signed_payload`.
 *  4. V2 from a peer or in a block — the signature is over `signed_payload`, and
 *     `verify_v2_binding_at` (core/daemon/src/v2_binding.rs) requires it to parse with
 *     `serde_json::from_str` as a JSON object: always in the mempool, and in consensus from
 *     TX_UNIQUENESS (mainnet height 90, testnet 1200). First byte `{` or JSON whitespace.
 *  5. CLI envelope — `{"tx_type","from","nonce","fee","payload":{…}}` canonical JSON posted to
 *     `/api/tx/broadcast`; it is a `signed_payload` and goes through (4). First byte `{`.
 *  6. Authority-cosigned `bridge_withdraw` — `encode_tx_for_signing(tx)` again. First byte `{`.
 *  7. Network-bound V1 (CHAIN_ID_BINDING, from its activation height; not scheduled) —
 *     `encode_tx_for_signing_chain(tx, chain_id)` (core/types/src/lib.rs, used through
 *     core/daemon/src/chain_binding.rs): the bytes `rougechain/tx-v1/chain`, 0x00, a length and the
 *     chain id, then (1). First byte `r` (0x72) — never 0x19.
 *
 * Every byte string above starts with `{`, JSON whitespace or `r`, never 0x19. None of them is
 * raw caller-chosen bytes. The same holds for the node's signed requests
 * (mail / messenger / names: same check as 3), block headers (`serde_json::to_vec`, `{`),
 * finality votes (`ROUGECHAIN_FINALITY_VOTE_V2|…`, first byte `R`) and the validator rate-limit
 * header (a decimal timestamp).
 *
 * The one place the node verified a signature over `signed_payload` without parsing it is block
 * import BELOW the TX_UNIQUENESS height. Those heights are fixed history on both networks (a
 * block is only accepted at tip + 1), so no new block can use it.
 *
 * In the other direction, wallets only produce a transaction signature over the canonical JSON
 * of an object (`serializePayload`), so a transaction signature never verifies as a message.
 * A wallet that accepts caller-supplied bytes for `signTransaction` must check they are that
 * JSON for the payload it shows (the extension and Qwalla do).
 */
/** First bytes of every signed message. 0x19 can never start a transaction's signed bytes. */
declare const SIGNED_MESSAGE_PREFIX = "\u0019RougeChain Signed Message:\n";
/** Largest message (in UTF-8 bytes) a wallet shows and signs through `window.rougechain.signMessage`. */
declare const MAX_SIGN_MESSAGE_BYTES = 4096;
/** ML-DSA-65 sizes in bytes. */
declare const ML_DSA_65_PUBLIC_KEY_BYTES = 1952;
declare const ML_DSA_65_SIGNATURE_BYTES = 3309;
/**
 * The exact bytes that are signed for `message`:
 * `"\x19RougeChain Signed Message:\n" ‖ decimal(byte length) ‖ "\n" ‖ message bytes`.
 */
declare function messageSigningBytes(message: string | Uint8Array): Uint8Array;
/**
 * Sign a message with an ML-DSA-65 private key (hex). Returns the signature as hex (3,309 bytes).
 * The signature is over {@link messageSigningBytes}, never over the bare message, so it cannot
 * be used as a transaction signature.
 */
declare function signMessage(privateKeyHex: string, message: string | Uint8Array): string;
/**
 * Verify a {@link signMessage} signature. Returns `false` for anything that is not a valid
 * signature of exactly this message by this public key — including malformed input. Never throws.
 */
declare function verifyMessage(publicKeyHex: string, message: string | Uint8Array, signatureHex: string): boolean;
/** Fields of a sign-in message (modelled on EIP-4361, Sign-In with Ethereum). */
interface SignInFields {
    /** Host (and port, if not the default) of the site asking for the sign-in, e.g. `tickets.example.com`. */
    domain: string;
    /** The `rouge1…` address that signs. */
    address: string;
    /** The page or API the sign-in is for, e.g. `https://tickets.example.com/login`. */
    uri: string;
    /** Optional single-line human-readable sentence. */
    statement?: string;
    /** Server-issued, single-use, at least 16 characters of `A-Z a-z 0-9 - _`. */
    nonce: string;
    /** ISO 8601 time the message was created, e.g. `2026-10-06T12:00:00.000Z`. */
    issuedAt: string;
    /** Optional ISO 8601 time after which the message must be refused. */
    expirationTime?: string;
    /** RougeChain chain id, e.g. `rougechain-mainnet-1`. */
    chainId: string;
    /** Optional list of URIs the sign-in refers to. */
    resources?: string[];
}
declare const SIGN_IN_MIN_NONCE_LENGTH = 16;
/**
 * Build the canonical sign-in text. Throws on an invalid field.
 *
 * ```
 * tickets.example.com wants you to sign in with your RougeChain account:
 * rouge1…
 *
 * Sign in to see your tickets.
 *
 * URI: https://tickets.example.com/login
 * Version: 1
 * Chain ID: rougechain-mainnet-1
 * Nonce: 4f9c2d1e8a7b6c5d
 * Issued At: 2026-10-06T12:00:00.000Z
 * Expiration Time: 2026-10-06T12:10:00.000Z
 * Resources:
 * - https://tickets.example.com/events/42
 * ```
 *
 * Without a statement, the address is followed by two empty lines. `Expiration Time` and
 * `Resources` appear only when given. Lines end with "\n"; there is no trailing newline.
 */
declare function createSignInMessage(fields: SignInFields): string;
/**
 * Parse a sign-in message. Returns its fields, or `null` unless `text` is EXACTLY what
 * {@link createSignInMessage} produces for those fields (so there is one text per meaning and
 * nothing can hide in it). Never throws.
 */
declare function parseSignInMessage(text: string): SignInFields | null;
/**
 * The domain a text CLAIMS on its first line, if that line has the sign-in form — even when the
 * rest does not parse. Wallets use it to warn about a domain that is not the requesting site.
 */
declare function claimedSignInDomain(text: string): string | null;
type SignInFailure = "malformed_message" | "invalid_signature" | "address_mismatch" | "domain_mismatch" | "nonce_mismatch" | "chain_id_mismatch" | "issued_in_future" | "expired" | "too_old";
type VerifySignInResult = {
    valid: true;
    address: string;
    publicKey: string;
    fields: SignInFields;
} | {
    valid: false;
    error: SignInFailure;
};
interface VerifySignInParams {
    /** The exact text the wallet signed. */
    message: string;
    /** Hex signature returned by the wallet. */
    signature: string;
    /** Hex ML-DSA-65 public key returned by the wallet. */
    publicKey: string;
    /** Your site's host (and port, if not the default). Compared case-insensitively. */
    expectedDomain: string;
    /** The nonce your server issued for this login attempt. */
    expectedNonce: string;
    /** The chain id you accept, e.g. `rougechain-mainnet-1`. */
    expectedChainId: string;
    /** Current time (ms since epoch or a Date). Defaults to the system clock. */
    now?: number | Date;
    /** How far in the future `Issued At` may be (clock skew). Default 60 s. */
    maxClockSkewMs?: number;
    /** Refuse a message issued longer ago than this, even if it has no (or a later) expiry. */
    maxAgeMs?: number;
}
/**
 * Verify a sign-in: the text is a canonical sign-in message, the signature is valid for it, the
 * address in it is the address of `publicKey`, and its domain, nonce and chain id are the ones
 * you expect; `Issued At` is not in the future (beyond the skew) and it has not expired.
 *
 * Resolves to `{ valid: true, address, publicKey, fields }` or `{ valid: false, error }`. Never
 * throws or rejects. It cannot know whether the nonce was used before: mark `expectedNonce` as
 * used on your server before trusting the result.
 */
declare function verifySignIn(params: VerifySignInParams): Promise<VerifySignInResult>;
/**
 * True when `message` parses as a JSON object that looks like something the node authenticates:
 * a transaction payload (`type` / `tx_type`) or a signed request (`from` together with
 * `timestamp`). Wallets refuse to sign these as a message — the dApp must use `signTransaction`.
 * (The 0x19 prefix already makes such a signature useless to the node; this stops a dApp from
 * dressing a transaction up as "just a message".)
 */
declare function looksLikeTransactionPayload(message: string): boolean;
/**
 * The message as a wallet must display it: every character that could hide or reorder text is
 * replaced by a visible stand-in. "\n" stays a line break; other C0 controls become their
 * Unicode control picture (␉ ␍ ␛ …), and C1 controls, zero-width, bidi and separator characters
 * become `⟨U+XXXX⟩`. Nothing is removed or truncated.
 */
declare function visibleMessageText(message: string): string;
/** What the approval screen shows for a `signMessage` request. */
interface SignMessageReview {
    /** The exact string that will be signed. */
    message: string;
    /** {@link visibleMessageText} of it. */
    display: string;
    byteLength: number;
    lineCount: number;
    /** Host (with port) of the requesting origin. */
    originHost: string;
    /** Parsed fields when the message is a canonical sign-in message. */
    signIn: SignInFields | null;
    /** The first line has the sign-in form but the message is not a canonical sign-in message. */
    signInMalformed: boolean;
    /** RED: the message names a domain that is not the requesting site. */
    domainMismatch: boolean;
    /** The domain the message names (sign-in form only). */
    claimedDomain: string | null;
    /** RED: the sign-in message names an address that is not this wallet's. */
    addressMismatch: boolean;
    /** The sign-in message is already past its expiration time. */
    expired: boolean;
}
/**
 * Validate a dApp's `signMessage` request and prepare what the wallet shows. `origin` is the
 * requesting site's origin as the wallet (not the page) knows it; `walletAddress` is the signing
 * wallet's `rouge1…` address. Returns `{ error }` for a request that must be refused without
 * asking the user.
 */
declare function reviewSignMessageRequest(message: unknown, origin: string, walletAddress?: string, now?: number): {
    error: string;
} | SignMessageReview;

/** Domain tag of the FINALITY_V2 vote message (core/finality/src/lib.rs `VOTE_DOMAIN_V2`). */
declare const FINALITY_VOTE_DOMAIN_V2 = "ROUGECHAIN_FINALITY_VOTE_V2";
/** FINALITY_V2 has exactly one round. */
declare const FINALITY_ONLY_ROUND = 0;
/** Hard cap on votes in one certificate (core/finality `MAX_PROOF_VOTES`). */
declare const FINALITY_MAX_PROOF_VOTES = 1024;
/** Mainnet height from which FINALITY_V2 certificates exist. */
declare const MAINNET_FINALITY_V2_HEIGHT = 150;
/** A JSON number kept as its exact source text (u64 / u128 values exceed 2^53). */
declare class JsonNumber {
    readonly raw: string;
    constructor(raw: string);
    toString(): string;
}
type LosslessJson = null | boolean | string | JsonNumber | LosslessJson[] | {
    [key: string]: LosslessJson;
};
/**
 * Parse JSON keeping every number as its exact text. Objects get a null prototype; duplicate
 * keys are rejected. Throws on malformed input.
 */
declare function parseJsonLossless(text: string): LosslessJson;
/** Serialize a lossless value back to JSON (keys in insertion order, numbers verbatim). */
declare function stringifyLossless(v: LosslessJson): string;
/**
 * Format an f64 exactly as the node's serde_json does (zmij: shortest round-trip digits; fixed
 * notation for decimal exponents -5..=15 with a mandatory fractional part, otherwise
 * `d.ddde+X` / `d.ddde-X`).
 */
declare function formatF64(x: number): string;
/** `encode_tx_v1(tx)`: serde_json of `TxV1` (version, tx_type, from_pub_key, nonce, payload, fee, sig, signed_payload?). */
declare function encodeTxV1(tx: LosslessJson): string;
/** serde_json of `FinalityProof`. */
declare function encodeFinalityProof(p: LosslessJson): string;
/** `encode_header_v1(header)`: serde_json of `BlockHeaderV1` (state_root / parent_commit omitted when absent). */
declare function encodeHeaderV1(h: LosslessJson): string;
/** `compute_single_tx_hash(tx)` = hex(sha256(encode_tx_v1(tx))) — the hash receipts and `/api/tx/:hash` use. */
declare function computeSingleTxHash(tx: LosslessJson): string;
/** `compute_tx_hash(txs)` = hex(sha256(encode_tx_v1(tx_0) ‖ encode_tx_v1(tx_1) ‖ …)). */
declare function computeTxListHash(txs: LosslessJson[]): string;
/** `compute_block_hash` = hex(sha256(encode_header_v1(header) ‖ ascii(proposer_sig))). */
declare function computeBlockHash(header: LosslessJson, proposerSig: string): string;
/** The exact bytes a validator signs (core/finality `vote_signing_message`). */
declare function voteSigningMessage(chainId: string, voteType: string, height: number | bigint | string, round: number, blockHash: string): string;
interface FinalityCheck {
    /** stable identifier, e.g. "block.tx_hash" */
    name: string;
    ok: boolean;
    /** false = informational: a failure does not change `status` */
    critical: boolean;
    detail?: string;
    node?: string;
}
interface TrustedValidatorSet {
    /** eligible validators (non-jailed, stake > 0) and their stake in the node's raw stake units */
    validators: {
        publicKey: string;
        stake: bigint | number | string;
    }[];
    /** the block height this set applies to (the validator state after block `height - 1`), if known */
    height?: number;
}
/** floor(2·total/3)+1 — the FINALITY_V2 quorum. */
declare function finalityQuorum(totalStake: bigint): bigint;
interface VerifiedCertificate {
    height: number;
    blockHash: string;
    /** decimal strings (stake is u128 on the node) */
    votingStake: string;
    totalStake: string;
    quorum: string;
    voters: string[];
}
/**
 * Verify a FINALITY_V2 certificate (`FinalityProof`) for `height` / `blockHash` against a
 * validator set. Recomputes voting stake, total and quorum from verified votes; the aggregate
 * numbers written in the certificate are compared afterwards (critical only when the set is
 * declared to be the set for `height`).
 */
declare function verifyFinalityCertificate(cert: LosslessJson, ctx: {
    chainId: string;
    height: number;
    blockHash: string;
    validatorSet: TrustedValidatorSet;
}): {
    ok: boolean;
    checks: FinalityCheck[];
    verified?: VerifiedCertificate;
};
type FetchLike = (url: string, init?: {
    signal?: AbortSignal;
}) => Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
}>;
interface VerifiedBlock {
    height: number;
    /** recomputed from header + proposer signature (never the node's `hash` field) */
    blockHash: string;
    chainId: string;
    proposer: string;
    /** recomputed hash of every transaction, in block order */
    txHashes: string[];
    /** the raw (lossless) block as served */
    raw: {
        [k: string]: LosslessJson;
    };
}
interface FetchAndVerifyBlockOptions {
    node: string;
    chainId: string;
    fetch?: FetchLike;
    timeoutMs?: number;
}
interface FetchAndVerifyBlockResult {
    ok: boolean;
    block: VerifiedBlock | null;
    /** block `height + 1` as served by the same node (unverified; its header carries the certificate of `height`), or null at the tip */
    next: {
        [k: string]: LosslessJson;
    } | null;
    checks: FinalityCheck[];
}
/**
 * Verify one raw `BlockV1` (as served by `/api/blocks?from_height=`): shape, chain id, the
 * header's `tx_hash` against the transaction list, the block hash, and the proposer's ML-DSA-65
 * signature over the header.
 */
declare function verifyBlock(raw: LosslessJson, opts: {
    chainId: string;
    height?: number;
    node?: string;
}): {
    ok: boolean;
    block: VerifiedBlock | null;
    checks: FinalityCheck[];
};
/** Fetch block `height` (and `height + 1`, for its parent certificate) from one node and verify it. */
declare function fetchAndVerifyBlock(height: number, options: FetchAndVerifyBlockOptions): Promise<FetchAndVerifyBlockResult>;
type FinalityStatus = "finalized" | "included-not-finalized" | "not-found" | "invalid";
type ValidatorSetTrust = "pinned validator set" | "node-reported validator set";
interface VerifyTxFinalizedOptions {
    txHash: string;
    /** one or more node API URLs (`https://host/api` or an origin; `/api` is appended if missing) */
    nodes: string[];
    /** e.g. "rougechain-mainnet-1"; must equal every verified header's chain_id and is part of every vote message */
    chainId: string;
    /** pin the validator set (strongly recommended). Without it the CURRENT set is fetched from the first node. */
    trustedValidatorSet?: TrustedValidatorSet;
    /** require tip - height + 1 ≥ this (default 1). Finality, not depth, is what makes a block final. */
    minConfirmations?: number;
    fetch?: FetchLike;
    timeoutMs?: number;
}
interface VerifyTxFinalizedResult {
    status: FinalityStatus;
    height: number | null;
    /** recomputed block hash */
    blockHash: string | null;
    txIndex: number | null;
    trust: ValidatorSetTrust;
    proof: {
        chainId: string;
        header: {
            height: number;
            time: string;
            prevHash: string;
            txHash: string;
            stateRoot: string | null;
            proposer: string;
        };
        certificateSource: "parent_commit of the next block" | "/api/finality/:height" | null;
        certificate: VerifiedCertificate | null;
        validatorSetSource: ValidatorSetTrust;
        nodesAgreeing: string[];
    } | null;
    /**
     * NOT VERIFIED. The node's receipt status ("Success" or { Failed: reason }). The outcome is
     * not committed in the block header, so a finalized transaction may still have failed.
     */
    outcome: {
        source: "node receipt";
        verified: false;
        value: LosslessJson | null;
    };
    checks: FinalityCheck[];
}
/**
 * Verify that `txHash` is included in a block that is FINALIZED under FINALITY_V2, recomputing
 * every hash it relies on and checking every signature, and cross-checking the block across
 * `nodes` (a strict majority must serve the same block hash; any conflicting block → "invalid").
 *
 * Returns every check performed (pass/fail), never just a boolean:
 *  - `finalized`: inclusion, block integrity, the finality certificate and the cross-node check passed.
 *  - `included-not-finalized`: the transaction is in a valid block but no certificate exists yet
 *    (e.g. the tip), finality is not active at that height, too few nodes answered, no validator
 *    set could be obtained, or
 *    `minConfirmations` is not met.
 *  - `not-found`: no node knows the transaction, or the block at the claimed height does not
 *    contain it, or the block could not be fetched.
 *  - `invalid`: data failed verification (hash, signature, chain id, certificate, conflicting nodes).
 *
 * IT DOES NOT PROVE THE TRANSACTION SUCCEEDED. Execution outcome is not committed in the block
 * header today: a transaction that failed (for example a transfer with insufficient balance) is
 * still included and finalized. `outcome` carries the node's receipt with `verified: false`.
 *
 * Without `trustedValidatorSet`, the validator set comes from a node (`trust: "node-reported
 * validator set"`), and that node is trusted for it. Nodes expose only the CURRENT set, not the
 * set for a past height; pin the set for real security.
 */
declare function verifyTxFinalized(options: VerifyTxFinalizedOptions): Promise<VerifyTxFinalizedResult>;

declare function hexToBytes(hex: string): Uint8Array;
declare function bytesToHex(bytes: Uint8Array): string;
declare function generateNonce(): string;

/**
 * RougeChain Bech32m Address Utilities for SDK
 *
 * Derives compact, human-readable addresses from PQC public keys:
 *   address = bech32m("rouge", SHA-256(raw_pubkey_bytes))
 *
 * Result: ~63-char address like "rouge1q8f3x7k2m4n9p..."
 * Matches the Rust implementation in core/crypto/src/lib.rs exactly.
 */
/**
 * Derive a compact Bech32m address from an ML-DSA-65 public key (hex).
 * Returns a ~63-character string like "rouge1q8f3x7k2m4n9p..."
 */
declare function pubkeyToAddress(publicKeyHex: string): Promise<string>;
/**
 * Decode a Bech32m address back to its 32-byte SHA-256 hash (hex).
 */
declare function addressToHash(address: string): string;
/**
 * Check if a string is a valid RougeChain Bech32m address.
 */
declare function isRougeAddress(input: string): boolean;
/**
 * Format an address for compact display: "rouge1q8f3...k9m2"
 */
declare function formatAddress(address: string, prefixLen?: number, suffixLen?: number): string;

export { type AddLiquidityParams, type ApiResponse, type ApproveParams, type ArtistStats, BURN_ADDRESS, type BalanceResponse, type BatchMintNftParams, type Block, type BlockHeader, type BridgeClaimParams, type BridgeConfig, type BridgeWithdrawParams, type BridgeWithdrawal, type BurnNftParams, CONTRACT_DEPLOY_FEE_XRGE, CONTRACT_GAS_PRICE_XRGE, CONTRACT_MAX_GAS, type CallContractParams, ChainIdMismatchError, type ContractAttach, type ContractCallResult, type ContractEvent, type ContractEventFrame, type ContractEventsQuery, type ContractMetadata, type ContractQueryResult, type ContractStateValue, ContractsClient, type CreateNftCollectionParams, type CreatePoolParams, type CreateTokenParams, type DeployContractParams, type ExecuteContractOptions, type ExecuteContractResult, FINALITY_MAX_PROOF_VOTES, FINALITY_ONLY_ROUND, FINALITY_VOTE_DOMAIN_V2, type FeeInfo, type FetchAndVerifyBlockOptions, type FetchAndVerifyBlockResult, type FetchLike, type FinalityCheck, type FinalityProof, type FinalityStatus, type FreezeCollectionParams, type GameContract, JsonNumber, type LiquidityPool, type LockNftParams, type LosslessJson, MAINNET_CHAIN_ID, MAINNET_FINALITY_V2_HEIGHT, MAX_SIGN_MESSAGE_BYTES, ML_DSA_65_PUBLIC_KEY_BYTES, ML_DSA_65_SIGNATURE_BYTES, type MailMessage, type MessengerConversation, type MessengerFolder, type MessengerMessage, type MessengerNewMessageEvent, type MessengerWallet, type MintNftParams, type MintTokenParams, type NameEntry, type NftCollection, type NftToken, type NodeStats, type NormalizedContractAttach, type PoolEvent, type PoolStats, type PostStats, type PriceSnapshot, type PublishContractOptions, type PublishContractResult, QUANTA_PER_XRGE, type QueryContractOptions, type RemoveLiquidityParams, type ResolvedName, type RollupBatchResult, type RollupStatus, type RollupSubmitParams, type RollupSubmitResult, RougeChain, type RougeChainOptions, SIGNED_MESSAGE_PREFIX, SIGN_IN_MIN_NONCE_LENGTH, type SendMailParams, type ShieldParams, type ShieldedNote, type ShieldedStats, type ShieldedTransferParams, type SignInFailure, type SignInFields, type SignMessageReview, type SignedTransaction, type SocialComment, type SocialPost, type StakeParams, type SwapParams, type SwapQuote, type SwapQuoteParams, TESTNET_CHAIN_ID, TOKEN_CREATE_FEE_XRGE, TOKEN_MINT_FEE_XRGE, TOKEN_MINT_MAX_AMOUNT, type TokenCreationOptions, type TokenHolder, type TokenMetadata, type TokenMetadataUpdateParams, type TrackStats, type Transaction, type TransactionPayload, type TransactionType, type TransferFromParams, type TransferNftParams, type TransferParams, type TrustedValidatorSet, type TxReceipt, type TxReceiptStatus, type UnshieldParams, type UpgradeSchedule, type Validator, type ValidatorSetTrust, type ValidatorStatus, type VerifiedBlock, type VerifiedCertificate, type VerifySignInParams, type VerifySignInResult, type VerifyTxFinalizedOptions, type VerifyTxFinalizedResult, type VoteMessage, Wallet, type WalletKeys, type WsSubscribeMessage, type XrgeBridgeClaimParams, type XrgeBridgeConfig, type XrgeBridgeWithdrawParams, addressToHash, applyChainId, base64ToBytes, bindWalletToChain, bytesToBase64, bytesToHex, claimedSignInDomain, computeBlockHash, computeCommitment, computeNullifier, computeSingleTxHash, computeTxListHash, contractCallFee, createShieldedNote, createSignInMessage, createSignedBridgeWithdraw, createSignedContractCall, createSignedContractPublish, createSignedShield, createSignedShieldedTransfer, createSignedTokenApproval, createSignedTokenCreation, createSignedTokenMetadataClaim, createSignedTokenMetadataUpdate, createSignedTokenMint, createSignedTokenTransferFrom, createSignedTransfer, createSignedUnshield, encodeFinalityProof, encodeHeaderV1, encodeTxV1, fetchAndVerifyBlock, finalityQuorum, formatAddress, formatF64, generateMnemonic, generateNonce, generateRandomness, hexToBytes, isBurnAddress, isRougeAddress, keypairFromMnemonic, looksLikeTransactionPayload, messageSigningBytes, mnemonicToMLDSASeed, normalizeContractAttach, parseJsonLossless, parseSignInMessage, predictContractAddress, pubkeyToAddress, quantaToXrge, reviewSignMessageRequest, serializePayload, signMessage, signRequest, signTransaction, stringifyLossless, suggestGasLimit, tokenMintFields, tokenMintingActive, validateMnemonic, verifyBlock, verifyFinalityCertificate, verifyMessage, verifySignIn, verifyTransaction, verifyTxFinalized, visibleMessageText, voteSigningMessage, xrgeToQuanta };
