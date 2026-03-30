import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { sha256 } from '@noble/hashes/sha2';
import { generateMnemonic as generateMnemonic$1, validateMnemonic as validateMnemonic$1, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 as sha256$1 } from '@noble/hashes/sha2.js';

// src/signer.ts

// src/utils.ts
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(bytes);
}

// src/signer.ts
var BURN_ADDRESS = "XRGE_BURN_0x000000000000000000000000000000000000000000000000000000000000DEAD";
function sortKeysDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj !== null && typeof obj === "object") {
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep(obj[key]);
    }
    return sorted;
  }
  return obj;
}
function serializePayload(payload) {
  const json = JSON.stringify(sortKeysDeep(payload));
  return new TextEncoder().encode(json);
}
function signTransaction(payload, privateKey, publicKey) {
  const payloadBytes = serializePayload(payload);
  const signature = ml_dsa65.sign(payloadBytes, hexToBytes(privateKey));
  return {
    payload,
    signature: bytesToHex(signature),
    public_key: publicKey
  };
}
function verifyTransaction(signedTx) {
  try {
    const payloadBytes = serializePayload(signedTx.payload);
    return ml_dsa65.verify(
      hexToBytes(signedTx.signature),
      payloadBytes,
      hexToBytes(signedTx.public_key)
    );
  } catch {
    return false;
  }
}
function isBurnAddress(address) {
  return address === BURN_ADDRESS;
}
function buildAndSign(wallet, payload) {
  const full = {
    ...payload,
    from: wallet.publicKey,
    timestamp: Date.now(),
    nonce: generateNonce()
  };
  return signTransaction(full, wallet.privateKey, wallet.publicKey);
}
function createSignedTransfer(wallet, to, amount, fee = 1, token = "XRGE") {
  return buildAndSign(wallet, { type: "transfer", to, amount, fee, token });
}
function createSignedTokenCreation(wallet, tokenName, tokenSymbol, initialSupply, fee = 10, image) {
  return buildAndSign(wallet, {
    type: "create_token",
    token_name: tokenName,
    token_symbol: tokenSymbol,
    initial_supply: initialSupply,
    fee,
    ...image ? { image } : {}
  });
}
function createSignedTokenMetadataUpdate(wallet, tokenSymbol, metadata) {
  return buildAndSign(wallet, {
    type: "update_token_metadata",
    token_symbol: tokenSymbol,
    ...metadata.image !== void 0 ? { image: metadata.image } : {},
    ...metadata.description !== void 0 ? { description: metadata.description } : {},
    ...metadata.website !== void 0 ? { website: metadata.website } : {},
    ...metadata.twitter !== void 0 ? { twitter: metadata.twitter } : {},
    ...metadata.discord !== void 0 ? { discord: metadata.discord } : {}
  });
}
function createSignedTokenMetadataClaim(wallet, tokenSymbol) {
  return buildAndSign(wallet, {
    type: "claim_token_metadata",
    token_symbol: tokenSymbol
  });
}
function createSignedTokenApproval(wallet, spender, tokenSymbol, amount) {
  return buildAndSign(wallet, {
    type: "approve",
    spender,
    token_symbol: tokenSymbol,
    amount
  });
}
function createSignedTokenTransferFrom(wallet, owner, to, tokenSymbol, amount) {
  return buildAndSign(wallet, {
    type: "transfer_from",
    owner,
    to,
    token_symbol: tokenSymbol,
    amount
  });
}
function createSignedSwap(wallet, tokenIn, tokenOut, amountIn, minAmountOut) {
  return buildAndSign(wallet, {
    type: "swap",
    token_in: tokenIn,
    token_out: tokenOut,
    amount_in: amountIn,
    min_amount_out: minAmountOut
  });
}
function createSignedPoolCreation(wallet, tokenA, tokenB, amountA, amountB) {
  return buildAndSign(wallet, {
    type: "create_pool",
    token_a: tokenA,
    token_b: tokenB,
    amount_a: amountA,
    amount_b: amountB
  });
}
function createSignedAddLiquidity(wallet, poolId, amountA, amountB) {
  return buildAndSign(wallet, {
    type: "add_liquidity",
    pool_id: poolId,
    amount_a: amountA,
    amount_b: amountB
  });
}
function createSignedRemoveLiquidity(wallet, poolId, lpAmount) {
  return buildAndSign(wallet, {
    type: "remove_liquidity",
    pool_id: poolId,
    lp_amount: lpAmount
  });
}
function createSignedStake(wallet, amount, fee = 1) {
  return buildAndSign(wallet, { type: "stake", amount, fee });
}
function createSignedUnstake(wallet, amount, fee = 1) {
  return buildAndSign(wallet, { type: "unstake", amount, fee });
}
function createSignedFaucetRequest(wallet) {
  return buildAndSign(wallet, { type: "faucet" });
}
function createSignedBurn(wallet, amount, fee = 1, token = "XRGE") {
  return buildAndSign(wallet, {
    type: "transfer",
    to: BURN_ADDRESS,
    amount,
    fee,
    token
  });
}
function createSignedBridgeWithdraw(wallet, amount, evmAddress, tokenSymbol = "qETH", fee = 0.1) {
  const evm = evmAddress.startsWith("0x") ? evmAddress : `0x${evmAddress}`;
  return buildAndSign(wallet, {
    type: "bridge_withdraw",
    amount,
    fee,
    tokenSymbol,
    evmAddress: evm
  });
}
function createSignedNftCreateCollection(wallet, symbol, name, opts = {}) {
  return buildAndSign(wallet, {
    type: "nft_create_collection",
    symbol,
    name,
    fee: 50,
    maxSupply: opts.maxSupply,
    royaltyBps: opts.royaltyBps,
    image: opts.image,
    description: opts.description
  });
}
function createSignedNftMint(wallet, collectionId, name, opts = {}) {
  return buildAndSign(wallet, {
    type: "nft_mint",
    collectionId,
    name,
    fee: 5,
    metadataUri: opts.metadataUri,
    attributes: opts.attributes
  });
}
function createSignedNftBatchMint(wallet, collectionId, names, opts = {}) {
  return buildAndSign(wallet, {
    type: "nft_batch_mint",
    collectionId,
    names,
    fee: 5 * names.length,
    uris: opts.uris,
    batchAttributes: opts.batchAttributes
  });
}
function createSignedNftTransfer(wallet, collectionId, tokenId, to, salePrice) {
  return buildAndSign(wallet, {
    type: "nft_transfer",
    collectionId,
    tokenId,
    to,
    fee: 1,
    salePrice
  });
}
function createSignedNftBurn(wallet, collectionId, tokenId) {
  return buildAndSign(wallet, {
    type: "nft_burn",
    collectionId,
    tokenId,
    fee: 0.1
  });
}
function createSignedNftLock(wallet, collectionId, tokenId, locked) {
  return buildAndSign(wallet, {
    type: "nft_lock",
    collectionId,
    tokenId,
    locked,
    fee: 0.1
  });
}
function createSignedNftFreezeCollection(wallet, collectionId, frozen) {
  return buildAndSign(wallet, {
    type: "nft_freeze_collection",
    collectionId,
    frozen,
    fee: 0.1
  });
}
function createSignedShield(wallet, amount, commitment) {
  return buildAndSign(wallet, {
    type: "shield",
    amount,
    commitment
  });
}
function createSignedShieldedTransfer(wallet, nullifiers, outputCommitments, proof, shieldedFee) {
  return buildAndSign(wallet, {
    type: "shielded_transfer",
    nullifiers,
    output_commitments: outputCommitments,
    proof,
    fee: shieldedFee ?? 0
  });
}
function createSignedUnshield(wallet, nullifiers, amount, proof) {
  return buildAndSign(wallet, {
    type: "unshield",
    nullifiers,
    amount,
    proof
  });
}
function createSignedPushRegister(wallet, pushToken, platform = "expo") {
  return buildAndSign(wallet, {
    type: "push_register",
    pushToken,
    platform
  });
}
function createSignedPushUnregister(wallet) {
  return buildAndSign(wallet, {
    type: "push_unregister"
  });
}
function signRequest(wallet, payload) {
  return buildAndSign(wallet, payload);
}
var COMMITMENT_DOMAIN = new TextEncoder().encode("ROUGECHAIN_COMMITMENT_V1");
var NULLIFIER_DOMAIN = new TextEncoder().encode("ROUGECHAIN_NULLIFIER_V1");
function generateRandomness() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}
function u64ToBytes(value) {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, BigInt(value), false);
  return buf;
}
function hexToU8(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
function computeCommitment(value, ownerPubKey, randomness) {
  const valueBytes = u64ToBytes(value);
  const pubkeyBytes = hexToU8(ownerPubKey);
  const randBytes = hexToU8(randomness);
  const input = new Uint8Array(
    COMMITMENT_DOMAIN.length + valueBytes.length + pubkeyBytes.length + randBytes.length
  );
  let offset = 0;
  input.set(COMMITMENT_DOMAIN, offset);
  offset += COMMITMENT_DOMAIN.length;
  input.set(valueBytes, offset);
  offset += valueBytes.length;
  input.set(pubkeyBytes, offset);
  offset += pubkeyBytes.length;
  input.set(randBytes, offset);
  return bytesToHex(sha256(input));
}
function computeNullifier(randomness, commitment) {
  const randBytes = hexToU8(randomness);
  const commitBytes = hexToU8(commitment);
  const input = new Uint8Array(
    NULLIFIER_DOMAIN.length + randBytes.length + commitBytes.length
  );
  let offset = 0;
  input.set(NULLIFIER_DOMAIN, offset);
  offset += NULLIFIER_DOMAIN.length;
  input.set(randBytes, offset);
  offset += randBytes.length;
  input.set(commitBytes, offset);
  return bytesToHex(sha256(input));
}
function createShieldedNote(value, ownerPubKey) {
  const randomness = generateRandomness();
  const commitment = computeCommitment(value, ownerPubKey, randomness);
  const nullifier = computeNullifier(randomness, commitment);
  return { commitment, nullifier, value, randomness, ownerPubKey };
}

// src/client.ts
var RougeChain = class {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.headers = { "Content-Type": "application/json" };
    if (options.apiKey) {
      this.headers["X-API-Key"] = options.apiKey;
    }
    this.nft = new NftClient(this);
    this.dex = new DexClient(this);
    this.bridge = new BridgeClient(this);
    this.mail = new MailClient(this);
    this.messenger = new MessengerClient(this);
    this.shielded = new ShieldedClient(this);
    this.social = new SocialClient(this);
  }
  // ===== Internal helpers =====
  /** @internal */
  async get(path) {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      headers: this.headers
    });
    if (!res.ok) {
      throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
  /** @internal */
  async post(path, body) {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `POST ${path} failed: ${res.status} ${res.statusText} ${text}`
      );
    }
    return res.json();
  }
  /** @internal */
  async submitTx(endpoint, signedTx) {
    try {
      const raw = await this.post(endpoint, signedTx);
      const { success, error, ...rest } = raw;
      return {
        success,
        error,
        data: Object.keys(rest).length > 0 ? rest : void 0
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }
  // ===== Stats & Health =====
  async getStats() {
    return this.get("/stats");
  }
  async getHealth() {
    return this.get("/health");
  }
  // ===== Blocks =====
  async getBlocks(opts = {}) {
    const q = opts.limit ? `?limit=${opts.limit}` : "";
    const data = await this.get(`/blocks${q}`);
    return data.blocks;
  }
  async getBlocksSummary(range = "24h") {
    return this.get(`/blocks/summary?range=${range}`);
  }
  // ===== Balance =====
  async getBalance(publicKey) {
    return this.get(`/balance/${publicKey}`);
  }
  async getTokenBalance(publicKey, token) {
    const data = await this.get(
      `/balance/${publicKey}/${token}`
    );
    return data.balance;
  }
  // ===== Transactions =====
  async getTransactions(opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.offset) params.set("offset", String(opts.offset));
    const q = params.toString();
    return this.get(`/txs${q ? `?${q}` : ""}`);
  }
  // ===== Tokens =====
  async getTokens() {
    const data = await this.get(
      "/tokens"
    );
    return data.tokens;
  }
  async getTokenMetadata(symbol) {
    return this.get(`/token/${symbol}/metadata`);
  }
  async getTokenHolders(symbol) {
    const data = await this.get(
      `/token/${symbol}/holders`
    );
    return data.holders;
  }
  async getTokenTransactions(symbol) {
    return this.get(`/token/${symbol}/transactions`);
  }
  // ===== Validators =====
  async getValidators() {
    const data = await this.get("/validators");
    return data.validators;
  }
  async getValidatorStats() {
    return this.get("/validators/stats");
  }
  async getFinality() {
    return this.get("/finality");
  }
  // ===== EIP-1559 Fee Info =====
  /** Get current EIP-1559 fee information including base fee and suggestions. */
  async getFeeInfo() {
    return this.get("/fee");
  }
  // ===== BFT Finality Proofs =====
  /**
   * Get a BFT finality proof for a specific block height.
   * Returns the aggregated precommit votes that prove ≥2/3 validator stake agreed.
   */
  async getFinalityProof(height) {
    return this.get(`/finality/${height}`);
  }
  // ===== Peers =====
  async getPeers() {
    const data = await this.get("/peers");
    return data.peers;
  }
  // ===== Burned =====
  async getBurnedTokens() {
    return this.get("/burned");
  }
  // ===== Address Resolution =====
  /**
   * Resolve a rouge1… address to its public key, or a public key to its rouge1 address.
   * Uses the persistent on-chain address index for O(1) lookups.
   */
  async resolveAddress(input) {
    return this.get(`/resolve/${encodeURIComponent(input)}`);
  }
  // ===== Nonce =====
  /** Get the current sequential nonce for an account. */
  async getNonce(publicKey) {
    return this.get(`/account/${encodeURIComponent(publicKey)}/nonce`);
  }
  // ===== Push Notifications (PQC-signed) =====
  /** Register an Expo push token — signed by wallet to prove ownership. */
  async registerPushToken(wallet, pushToken, platform = "expo") {
    const tx = createSignedPushRegister(wallet, pushToken, platform);
    return this.submitTx("/push/register", tx);
  }
  /** Unregister push notifications — signed by wallet to prove ownership. */
  async unregisterPushToken(wallet) {
    const tx = createSignedPushUnregister(wallet);
    return this.submitTx("/push/unregister", tx);
  }
  // ===== Write operations =====
  async transfer(wallet, params) {
    const tx = createSignedTransfer(
      wallet,
      params.to,
      params.amount,
      params.fee,
      params.token
    );
    return this.submitTx("/v2/transfer", tx);
  }
  async createToken(wallet, params) {
    const tx = createSignedTokenCreation(
      wallet,
      params.name,
      params.symbol,
      params.totalSupply,
      params.fee,
      params.image
    );
    return this.submitTx("/v2/token/create", tx);
  }
  async stake(wallet, params) {
    const tx = createSignedStake(wallet, params.amount, params.fee);
    return this.submitTx("/v2/stake", tx);
  }
  async unstake(wallet, params) {
    const tx = createSignedUnstake(wallet, params.amount, params.fee);
    return this.submitTx("/v2/unstake", tx);
  }
  async faucet(wallet) {
    const tx = createSignedFaucetRequest(wallet);
    return this.submitTx("/v2/faucet", tx);
  }
  async burn(wallet, amount, fee = 1, token = "XRGE") {
    const tx = createSignedBurn(wallet, amount, fee, token);
    return this.submitTx("/v2/transfer", tx);
  }
  async updateTokenMetadata(wallet, params) {
    const tx = createSignedTokenMetadataUpdate(wallet, params.symbol, {
      image: params.image,
      description: params.description,
      website: params.website,
      twitter: params.twitter,
      discord: params.discord
    });
    return this.submitTx("/v2/token/metadata/update", tx);
  }
  async claimTokenMetadata(wallet, tokenSymbol) {
    const tx = createSignedTokenMetadataClaim(wallet, tokenSymbol);
    return this.submitTx("/v2/token/metadata/claim", tx);
  }
  /**
   * Mint additional tokens for a mintable token (creator only).
   * The token must have been created with `mintable: true`.
   */
  async mintTokens(wallet, params) {
    return this.post("/v2/token/mint", {
      public_key: wallet.publicKey,
      symbol: params.symbol,
      amount: params.amount,
      fee: params.fee ?? 1,
      signature: ""
      // Will be signed server-side via PQC verification
    });
  }
  // ===== WebSocket =====
  /**
   * Connect to the node's WebSocket and optionally subscribe to specific topics.
   * Topics: "blocks", "transactions", "stats", "account:<pubkey>", "token:<symbol>"
   *
   * @example
   * const ws = client.connectWebSocket(["blocks", "account:abc123"]);
   * ws.onmessage = (e) => console.log(JSON.parse(e.data));
   */
  connectWebSocket(topics) {
    const wsUrl = this.baseUrl.replace(/^http/, "ws") + "/ws";
    const ws = new WebSocket(wsUrl);
    if (topics && topics.length > 0) {
      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ subscribe: topics }));
      });
    }
    return ws;
  }
  // ===== Rollup =====
  /** Get the current rollup accumulator status. */
  async getRollupStatus() {
    const data = await this.get("/v2/rollup/status");
    return data.rollup;
  }
  /** Submit a transfer into the rollup batch accumulator. */
  async submitRollupTransfer(params) {
    return this.post("/v2/rollup/submit", params);
  }
  /** Get the result of a completed rollup batch by ID. */
  async getRollupBatch(batchId) {
    const data = await this.get(
      `/v2/rollup/batch/${batchId}`
    );
    return data.batch;
  }
};
var NftClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  // Queries
  async getCollections() {
    const data = await this.rc.get(
      "/nft/collections"
    );
    return data.collections;
  }
  async getCollection(collectionId) {
    return this.rc.get(
      `/nft/collection/${encodeURIComponent(collectionId)}`
    );
  }
  /**
   * Poll until a collection exists on-chain (i.e. the create tx has been mined).
   * Useful after `createCollection` since the tx goes to the mempool first.
   * @returns the collection once found, or throws after the timeout.
   */
  async waitForCollection(collectionId, opts = {}) {
    const timeout = opts.timeoutMs ?? 3e4;
    const poll = opts.pollMs ?? 1e3;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      try {
        return await this.getCollection(collectionId);
      } catch {
        await new Promise((r) => setTimeout(r, poll));
      }
    }
    throw new Error(
      `Collection "${collectionId}" not found after ${timeout}ms \u2014 the create transaction may not have been mined yet`
    );
  }
  async getTokens(collectionId, opts = {}) {
    const params = new URLSearchParams();
    if (opts.limit !== void 0) params.set("limit", String(opts.limit));
    if (opts.offset !== void 0) params.set("offset", String(opts.offset));
    const q = params.toString();
    return this.rc.get(
      `/nft/collection/${encodeURIComponent(collectionId)}/tokens${q ? `?${q}` : ""}`
    );
  }
  async getToken(collectionId, tokenId) {
    return this.rc.get(
      `/nft/token/${encodeURIComponent(collectionId)}/${tokenId}`
    );
  }
  async getByOwner(pubkey) {
    const data = await this.rc.get(
      `/nft/owner/${encodeURIComponent(pubkey)}`
    );
    return data.nfts;
  }
  // Write operations
  async createCollection(wallet, params) {
    const tx = createSignedNftCreateCollection(wallet, params.symbol, params.name, {
      maxSupply: params.maxSupply,
      royaltyBps: params.royaltyBps,
      image: params.image,
      description: params.description
    });
    return this.rc.submitTx("/v2/nft/collection/create", tx);
  }
  async mint(wallet, params) {
    const tx = createSignedNftMint(wallet, params.collectionId, params.name, {
      metadataUri: params.metadataUri,
      attributes: params.attributes
    });
    return this.rc.submitTx("/v2/nft/mint", tx);
  }
  async batchMint(wallet, params) {
    const tx = createSignedNftBatchMint(
      wallet,
      params.collectionId,
      params.names,
      { uris: params.uris, batchAttributes: params.batchAttributes }
    );
    return this.rc.submitTx("/v2/nft/batch-mint", tx);
  }
  async transfer(wallet, params) {
    const tx = createSignedNftTransfer(
      wallet,
      params.collectionId,
      params.tokenId,
      params.to,
      params.salePrice
    );
    return this.rc.submitTx("/v2/nft/transfer", tx);
  }
  async burn(wallet, params) {
    const tx = createSignedNftBurn(wallet, params.collectionId, params.tokenId);
    return this.rc.submitTx("/v2/nft/burn", tx);
  }
  async lock(wallet, params) {
    const tx = createSignedNftLock(
      wallet,
      params.collectionId,
      params.tokenId,
      params.locked
    );
    return this.rc.submitTx("/v2/nft/lock", tx);
  }
  async freezeCollection(wallet, params) {
    const tx = createSignedNftFreezeCollection(
      wallet,
      params.collectionId,
      params.frozen
    );
    return this.rc.submitTx("/v2/nft/freeze-collection", tx);
  }
};
var DexClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  // Queries
  async getPools() {
    const data = await this.rc.get("/pools");
    return data.pools;
  }
  async getPool(poolId) {
    return this.rc.get(`/pool/${poolId}`);
  }
  async getPoolEvents(poolId) {
    const data = await this.rc.get(
      `/pool/${poolId}/events`
    );
    return data.events;
  }
  async getPriceHistory(poolId) {
    const data = await this.rc.get(
      `/pool/${poolId}/prices`
    );
    return data.prices;
  }
  async getPoolStats(poolId) {
    return this.rc.get(`/pool/${poolId}/stats`);
  }
  async quote(params) {
    return this.rc.post("/swap/quote", {
      pool_id: params.poolId,
      token_in: params.tokenIn,
      token_out: params.tokenOut,
      amount_in: params.amountIn
    });
  }
  // Write operations
  async swap(wallet, params) {
    const tx = createSignedSwap(
      wallet,
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.minAmountOut
    );
    return this.rc.submitTx("/v2/swap/execute", tx);
  }
  async createPool(wallet, params) {
    const tx = createSignedPoolCreation(
      wallet,
      params.tokenA,
      params.tokenB,
      params.amountA,
      params.amountB
    );
    return this.rc.submitTx("/v2/pool/create", tx);
  }
  async addLiquidity(wallet, params) {
    const tx = createSignedAddLiquidity(
      wallet,
      params.poolId,
      params.amountA,
      params.amountB
    );
    return this.rc.submitTx("/v2/pool/add-liquidity", tx);
  }
  async removeLiquidity(wallet, params) {
    const tx = createSignedRemoveLiquidity(wallet, params.poolId, params.lpAmount);
    return this.rc.submitTx("/v2/pool/remove-liquidity", tx);
  }
};
var BridgeClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  async getConfig() {
    try {
      const data = await this.rc.get("/bridge/config");
      return {
        enabled: data.enabled === true,
        custodyAddress: data.custodyAddress,
        chainId: data.chainId ?? 84532,
        supportedTokens: data.supportedTokens
      };
    } catch {
      return { enabled: false, chainId: 84532 };
    }
  }
  async getWithdrawals() {
    const data = await this.rc.get(
      "/bridge/withdrawals"
    );
    return data.withdrawals;
  }
  /** Withdraw qETH/qUSDC — signed client-side, private key never sent to server */
  async withdraw(wallet, params) {
    try {
      const tokenSymbol = params.tokenSymbol ?? "qETH";
      const signed = createSignedBridgeWithdraw(
        wallet,
        params.amount,
        params.evmAddress,
        tokenSymbol,
        params.fee
      );
      const data = await this.rc.post(
        "/bridge/withdraw",
        {
          fromPublicKey: wallet.publicKey,
          amountUnits: params.amount,
          evmAddress: signed.payload.evmAddress,
          signature: signed.signature,
          payload: signed.payload
        }
      );
      return {
        success: data.success === true,
        error: data.error,
        data
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }
  /** Claim qETH or qUSDC after depositing on Base Sepolia */
  async claim(params) {
    try {
      const data = await this.rc.post(
        "/bridge/claim",
        {
          evmTxHash: params.evmTxHash.startsWith("0x") ? params.evmTxHash : `0x${params.evmTxHash}`,
          evmAddress: params.evmAddress.startsWith("0x") ? params.evmAddress : `0x${params.evmAddress}`,
          evmSignature: params.evmSignature,
          recipientRougechainPubkey: params.recipientPubkey,
          token: params.token ?? "ETH"
        }
      );
      return {
        success: data.success === true,
        error: data.error,
        data
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }
  // ── XRGE Bridge ──
  async getXrgeConfig() {
    try {
      const data = await this.rc.get("/bridge/xrge/config");
      return {
        enabled: data.enabled === true,
        vaultAddress: data.vaultAddress,
        tokenAddress: data.tokenAddress,
        chainId: data.chainId ?? 84532
      };
    } catch {
      return { enabled: false, chainId: 84532 };
    }
  }
  async claimXrge(params) {
    try {
      const data = await this.rc.post(
        "/bridge/xrge/claim",
        {
          evmTxHash: params.evmTxHash.startsWith("0x") ? params.evmTxHash : `0x${params.evmTxHash}`,
          evmAddress: params.evmAddress.startsWith("0x") ? params.evmAddress : `0x${params.evmAddress}`,
          amount: params.amount,
          recipientRougechainPubkey: params.recipientPubkey
        }
      );
      return {
        success: data.success === true,
        error: data.error,
        data
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  async withdrawXrge(wallet, params) {
    try {
      const signed = createSignedBridgeWithdraw(
        wallet,
        params.amount,
        params.evmAddress,
        "XRGE",
        0.1
      );
      const data = await this.rc.post(
        "/bridge/xrge/withdraw",
        {
          fromPublicKey: wallet.publicKey,
          amount: params.amount,
          evmAddress: signed.payload.evmAddress,
          signature: signed.signature,
          payload: signed.payload
        }
      );
      return {
        success: data.success === true,
        error: data.error,
        data
      };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  async getXrgeWithdrawals() {
    try {
      const data = await this.rc.get(
        "/bridge/xrge/withdrawals"
      );
      return data.withdrawals;
    } catch {
      return [];
    }
  }
};
var MailClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  // --- Name Registry (signed) ---
  async registerName(wallet, name, walletId) {
    const signed = signRequest(wallet, { name, walletId });
    return this.rc.submitTx("/v2/names/register", signed);
  }
  async resolveName(name) {
    try {
      const data = await this.rc.get(
        `/names/resolve/${encodeURIComponent(name.toLowerCase())}`
      );
      if (!data.success) return null;
      return { entry: data.entry, wallet: data.wallet };
    } catch {
      return null;
    }
  }
  async reverseLookup(walletId) {
    try {
      const data = await this.rc.get(
        `/names/reverse/${encodeURIComponent(walletId)}`
      );
      return data.name || null;
    } catch {
      return null;
    }
  }
  async releaseName(wallet, name) {
    const signed = signRequest(wallet, { name });
    return this.rc.submitTx("/v2/names/release", signed);
  }
  // --- Mail (signed) ---
  async send(wallet, params) {
    const sigPayload = params.encrypted_subject + "|" + params.encrypted_body + (params.encrypted_attachment ? "|" + params.encrypted_attachment : "");
    let contentSig = params.content_signature || "";
    if (!contentSig && wallet.privateKey) {
      try {
        const { ml_dsa65: ml_dsa654 } = await import('@noble/post-quantum/ml-dsa.js');
        const privKey = typeof wallet.privateKey === "string" ? hexToBytes(wallet.privateKey) : wallet.privateKey;
        const sigBytes = ml_dsa654.sign(
          new TextEncoder().encode(sigPayload),
          privKey
        );
        contentSig = bytesToHex(sigBytes);
      } catch {
      }
    }
    const signed = signRequest(wallet, {
      fromWalletId: params.from,
      toWalletIds: [params.to],
      subjectEncrypted: params.encrypted_subject,
      bodyEncrypted: params.encrypted_body,
      attachmentEncrypted: params.encrypted_attachment,
      contentSignature: contentSig,
      replyToId: params.reply_to_id,
      hasAttachment: !!params.encrypted_attachment
    });
    return this.rc.submitTx("/v2/mail/send", signed);
  }
  async getInbox(wallet) {
    const signed = signRequest(wallet, { folder: "inbox" });
    try {
      const data = await this.rc.post("/v2/mail/folder", signed);
      return data.messages ?? [];
    } catch {
      return [];
    }
  }
  async getSent(wallet) {
    const signed = signRequest(wallet, { folder: "sent" });
    try {
      const data = await this.rc.post("/v2/mail/folder", signed);
      return data.messages ?? [];
    } catch {
      return [];
    }
  }
  async getTrash(wallet) {
    const signed = signRequest(wallet, { folder: "trash" });
    try {
      const data = await this.rc.post("/v2/mail/folder", signed);
      return data.messages ?? [];
    } catch {
      return [];
    }
  }
  async getMessage(wallet, messageId) {
    const signed = signRequest(wallet, { messageId });
    try {
      const data = await this.rc.post("/v2/mail/message", signed);
      return data.message ?? null;
    } catch {
      return null;
    }
  }
  async move(wallet, messageId, folder) {
    const signed = signRequest(wallet, { messageId, folder });
    return this.rc.submitTx("/v2/mail/move", signed);
  }
  async markRead(wallet, messageId) {
    const signed = signRequest(wallet, { messageId });
    return this.rc.submitTx("/v2/mail/read", signed);
  }
  async delete(wallet, messageId) {
    const signed = signRequest(wallet, { messageId });
    return this.rc.submitTx("/v2/mail/delete", signed);
  }
};
var MessengerClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  async getWallets() {
    const data = await this.rc.get("/messenger/wallets");
    return data.wallets ?? [];
  }
  async registerWallet(wallet, opts) {
    const signed = signRequest(wallet, {
      id: opts.id,
      displayName: opts.displayName,
      signingPublicKey: opts.signingPublicKey,
      encryptionPublicKey: opts.encryptionPublicKey,
      discoverable: opts.discoverable ?? true
    });
    return this.rc.submitTx("/v2/messenger/wallets/register", signed);
  }
  async getConversations(wallet) {
    const signed = signRequest(wallet, {});
    try {
      const data = await this.rc.post(
        "/v2/messenger/conversations/list",
        signed
      );
      return data.conversations ?? [];
    } catch {
      return [];
    }
  }
  async createConversation(wallet, participantIds, opts = {}) {
    const signed = signRequest(wallet, {
      participantIds,
      name: opts.name,
      isGroup: opts.isGroup ?? false
    });
    return this.rc.submitTx("/v2/messenger/conversations", signed);
  }
  async getMessages(wallet, conversationId) {
    const signed = signRequest(wallet, { conversationId });
    try {
      const data = await this.rc.post(
        "/v2/messenger/messages/list",
        signed
      );
      return data.messages ?? [];
    } catch {
      return [];
    }
  }
  async sendMessage(wallet, conversationId, encryptedContent, opts = {}) {
    const signed = signRequest(wallet, {
      conversationId,
      encryptedContent,
      contentSignature: opts.contentSignature ?? "",
      messageType: opts.messageType ?? "text",
      selfDestruct: opts.selfDestruct ?? false,
      destructAfterSeconds: opts.destructAfterSeconds,
      spoiler: opts.spoiler ?? false
    });
    return this.rc.submitTx("/v2/messenger/messages", signed);
  }
  async deleteMessage(wallet, messageId, conversationId) {
    const signed = signRequest(wallet, { messageId, conversationId });
    return this.rc.submitTx("/v2/messenger/messages/delete", signed);
  }
  async deleteConversation(wallet, conversationId) {
    const signed = signRequest(wallet, { conversationId });
    return this.rc.submitTx("/v2/messenger/conversations/delete", signed);
  }
  async markRead(wallet, messageId, conversationId) {
    const signed = signRequest(wallet, { messageId, conversationId });
    return this.rc.submitTx("/v2/messenger/messages/read", signed);
  }
};
var ShieldedClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  // Queries
  async getStats() {
    return this.rc.get("/shielded/stats");
  }
  async isNullifierSpent(nullifierHex) {
    return this.rc.get(
      `/shielded/nullifier/${encodeURIComponent(nullifierHex)}`
    );
  }
  // Write operations
  /**
   * Shield public XRGE into a private note.
   * Creates the commitment client-side, submits to the chain.
   *
   * @returns The ShieldedNote (keep this locally — it's the only way to spend the note)
   */
  async shield(wallet, params) {
    const note = createShieldedNote(params.amount, wallet.publicKey);
    const tx = createSignedShield(wallet, params.amount, note.commitment);
    const result = await this.rc.submitTx("/v2/shielded/shield", tx);
    if (result.success) {
      return { ...result, note };
    }
    return result;
  }
  /**
   * Transfer between shielded notes (private → private).
   * Requires a pre-generated STARK proof.
   */
  async transfer(wallet, params) {
    const tx = createSignedShieldedTransfer(
      wallet,
      params.nullifiers,
      params.outputCommitments,
      params.proof,
      params.shieldedFee
    );
    return this.rc.submitTx("/v2/shielded/transfer", tx);
  }
  /**
   * Unshield a private note back to public XRGE.
   * Requires a STARK proof of note ownership.
   */
  async unshield(wallet, params) {
    const tx = createSignedUnshield(
      wallet,
      params.nullifiers,
      params.amount,
      params.proof
    );
    return this.rc.submitTx("/v2/shielded/unshield", tx);
  }
  // ─── WASM Smart Contracts ──────────────────────────────────────────
  /** Deploy a WASM smart contract */
  async deployContract(params) {
    return this.rc.post("/v2/contract/deploy", params);
  }
  /** Call a WASM smart contract method (mutating) */
  async callContract(params) {
    return this.rc.post("/v2/contract/call", params);
  }
  /** Get contract metadata */
  async getContract(addr) {
    return this.rc.get(`/contract/${addr}`);
  }
  /** Read contract storage. Omit key for full state dump. */
  async getContractState(addr, key) {
    const q = key ? `?key=${encodeURIComponent(key)}` : "";
    return this.rc.get(`/contract/${addr}/state${q}`);
  }
  /** Get contract events */
  async getContractEvents(addr, limit) {
    const q = limit ? `?limit=${limit}` : "";
    return this.rc.get(`/contract/${addr}/events${q}`);
  }
  /** List all deployed contracts */
  async listContracts() {
    return this.rc.get("/contracts");
  }
};
var SocialClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  async recordPlay(wallet, trackId) {
    const signed = signRequest(wallet, { trackId });
    return this.rc.submitTx("/v2/social/play", signed);
  }
  async toggleLike(wallet, trackId) {
    const signed = signRequest(wallet, { trackId });
    return this.rc.submitTx("/v2/social/like", signed);
  }
  async postComment(wallet, trackId, body) {
    const signed = signRequest(wallet, { trackId, body });
    return this.rc.submitTx("/v2/social/comment", signed);
  }
  async deleteComment(wallet, commentId) {
    const signed = signRequest(wallet, { commentId });
    return this.rc.submitTx("/v2/social/comment/delete", signed);
  }
  async toggleFollow(wallet, artistPubkey) {
    const signed = signRequest(wallet, { artistPubkey });
    return this.rc.submitTx("/v2/social/follow", signed);
  }
  async getTrackStats(trackId, viewerPubkey) {
    const q = viewerPubkey ? `?viewer=${encodeURIComponent(viewerPubkey)}` : "";
    return this.rc.get(`/social/track/${encodeURIComponent(trackId)}/stats${q}`);
  }
  async getComments(trackId, limit = 50, offset = 0) {
    const data = await this.rc.get(
      `/social/track/${encodeURIComponent(trackId)}/comments?limit=${limit}&offset=${offset}`
    );
    return data.comments ?? [];
  }
  async getArtistStats(pubkey, viewerPubkey) {
    const q = viewerPubkey ? `?viewer=${encodeURIComponent(viewerPubkey)}` : "";
    return this.rc.get(`/social/artist/${encodeURIComponent(pubkey)}/stats${q}`);
  }
  async getUserLikes(pubkey) {
    const data = await this.rc.get(`/social/user/${encodeURIComponent(pubkey)}/likes`);
    return data.trackIds ?? [];
  }
  async getUserFollowing(pubkey) {
    const data = await this.rc.get(`/social/user/${encodeURIComponent(pubkey)}/following`);
    return data.artists ?? [];
  }
  // ── Posts ──────────────────────────────────────────────
  async createPost(wallet, body, replyToId) {
    const payload = { body };
    if (replyToId) payload.replyToId = replyToId;
    const signed = signRequest(wallet, payload);
    return this.rc.submitTx("/v2/social/post", signed);
  }
  async deletePost(wallet, postId) {
    const signed = signRequest(wallet, { postId });
    return this.rc.submitTx("/v2/social/post/delete", signed);
  }
  async toggleRepost(wallet, postId) {
    const signed = signRequest(wallet, { postId });
    return this.rc.submitTx("/v2/social/repost", signed);
  }
  async getPost(postId, viewerPubkey) {
    const q = viewerPubkey ? `?viewer=${encodeURIComponent(viewerPubkey)}` : "";
    try {
      return await this.rc.get(`/social/post/${encodeURIComponent(postId)}${q}`);
    } catch {
      return null;
    }
  }
  async getPostStats(postId, viewerPubkey) {
    const q = viewerPubkey ? `?viewer=${encodeURIComponent(viewerPubkey)}` : "";
    return this.rc.get(`/social/post/${encodeURIComponent(postId)}/stats${q}`);
  }
  async getPostReplies(postId, limit = 50, offset = 0) {
    const data = await this.rc.get(
      `/social/post/${encodeURIComponent(postId)}/replies?limit=${limit}&offset=${offset}`
    );
    return data.replies ?? [];
  }
  async getUserPosts(pubkey, limit = 50, offset = 0) {
    return this.rc.get(
      `/social/user/${encodeURIComponent(pubkey)}/posts?limit=${limit}&offset=${offset}`
    );
  }
  async getGlobalTimeline(limit = 50, offset = 0) {
    const data = await this.rc.get(
      `/social/timeline?limit=${limit}&offset=${offset}`
    );
    return data.posts ?? [];
  }
  async getFollowingFeed(wallet, limit = 50, offset = 0) {
    const signed = signRequest(wallet, { limit, offset });
    try {
      const data = await this.rc.submitTx("/v2/social/feed", signed);
      return data.posts ?? [];
    } catch {
      return [];
    }
  }
};

// src/address.ts
var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var BECH32M_CONST = 734539939;
var HRP = "rouge";
function hrpExpand(hrp) {
  const ret = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}
function polymod(values) {
  const GEN = [996825010, 642813549, 513874426, 1027748829, 705979059];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = (chk & 33554431) << 5 ^ v;
    for (let i = 0; i < 5; i++) {
      if (b >> i & 1) chk ^= GEN[i];
    }
  }
  return chk;
}
function createChecksum(hrp, data) {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const pm = polymod(values) ^ BECH32M_CONST;
  const ret = [];
  for (let i = 0; i < 6; i++) ret.push(pm >> 5 * (5 - i) & 31);
  return ret;
}
function verifyChecksum(hrp, data) {
  return polymod(hrpExpand(hrp).concat(data)) === BECH32M_CONST;
}
function convertBits(data, fromBits, toBits, pad) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = acc << fromBits | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push(acc >> bits & maxv);
    }
  }
  {
    if (bits > 0) ret.push(acc << toBits - bits & maxv);
  }
  return ret;
}
function bech32mEncode(hrp, data) {
  const data5bit = convertBits(data, 8, 5);
  const checksum = createChecksum(hrp, data5bit);
  const combined = data5bit.concat(checksum);
  let result = hrp + "1";
  for (const d of combined) result += CHARSET[d];
  return result;
}
function bech32mDecode(str) {
  const lower = str.toLowerCase();
  const pos = lower.lastIndexOf("1");
  if (pos < 1 || pos + 7 > lower.length) throw new Error("Invalid bech32m string");
  const hrp = lower.slice(0, pos);
  const data5bit = [];
  for (let i = pos + 1; i < lower.length; i++) {
    const d = CHARSET.indexOf(lower[i]);
    if (d === -1) throw new Error(`Invalid character: ${lower[i]}`);
    data5bit.push(d);
  }
  if (!verifyChecksum(hrp, data5bit)) throw new Error("Invalid bech32m checksum");
  const payload = data5bit.slice(0, data5bit.length - 6);
  const ret = [];
  let acc = 0, bits = 0;
  for (const value of payload) {
    acc = acc << 5 | value;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      ret.push(acc >> bits & 255);
    }
  }
  return { hrp, data: new Uint8Array(ret) };
}
function hexToBytes2(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
function bytesToHex2(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha2562(data) {
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}
async function pubkeyToAddress(publicKeyHex) {
  const pkBytes = hexToBytes2(publicKeyHex);
  const hash = await sha2562(pkBytes);
  return bech32mEncode(HRP, hash);
}
function addressToHash(address) {
  const { data } = bech32mDecode(address);
  return bytesToHex2(data);
}
function isRougeAddress(input) {
  if (!input.toLowerCase().startsWith("rouge1") || input.length < 10) return false;
  try {
    bech32mDecode(input);
    return true;
  } catch {
    return false;
  }
}
function formatAddress(address, prefixLen = 12, suffixLen = 4) {
  if (address.length <= prefixLen + suffixLen + 3) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}
var DOMAIN_INFO = new TextEncoder().encode("rougechain-ml-dsa-65-v1");
function generateMnemonic(strength = 256) {
  return generateMnemonic$1(wordlist, strength);
}
function validateMnemonic(mnemonic) {
  return validateMnemonic$1(mnemonic, wordlist);
}
function mnemonicToMLDSASeed(mnemonic, passphrase) {
  const bip39Seed = mnemonicToSeedSync(mnemonic, passphrase);
  return hkdf(sha256$1, bip39Seed, void 0, DOMAIN_INFO, 32);
}
function keypairFromMnemonic(mnemonic, passphrase) {
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic phrase");
  }
  const seed = mnemonicToMLDSASeed(mnemonic, passphrase);
  const keypair = ml_dsa65.keygen(seed);
  return {
    publicKey: bytesToHex(keypair.publicKey),
    secretKey: bytesToHex(keypair.secretKey)
  };
}

// src/wallet.ts
var Wallet = class _Wallet {
  constructor(publicKey, privateKey, mnemonic) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.mnemonic = mnemonic;
  }
  /**
   * Generate a new ML-DSA-65 keypair with a BIP-39 mnemonic.
   * The mnemonic is stored on the wallet for backup/recovery.
   * @param strength 256 = 24 words (default, post-quantum safe), 128 = 12 words
   */
  static generate(strength = 256) {
    const mnemonic = generateMnemonic(strength);
    const { publicKey, secretKey } = keypairFromMnemonic(mnemonic);
    return new _Wallet(publicKey, secretKey, mnemonic);
  }
  /**
   * Generate a wallet using pure random entropy (no mnemonic).
   * Keys cannot be recovered from a seed phrase.
   */
  static generateRandom() {
    const keypair = ml_dsa65.keygen();
    return new _Wallet(
      bytesToHex(keypair.publicKey),
      bytesToHex(keypair.secretKey)
    );
  }
  /**
   * Restore a wallet from a BIP-39 mnemonic seed phrase.
   * @param mnemonic 12 or 24 word BIP-39 mnemonic
   * @param passphrase Optional BIP-39 passphrase (25th word)
   */
  static fromMnemonic(mnemonic, passphrase) {
    if (!validateMnemonic(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }
    const { publicKey, secretKey } = keypairFromMnemonic(mnemonic, passphrase);
    return new _Wallet(publicKey, secretKey, mnemonic);
  }
  /**
   * Restore a wallet from existing hex-encoded keys.
   */
  static fromKeys(publicKey, privateKey) {
    return new _Wallet(publicKey, privateKey);
  }
  /**
   * Export keys as a plain object (for serialization/storage).
   */
  toJSON() {
    return {
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      ...this.mnemonic ? { mnemonic: this.mnemonic } : {}
    };
  }
  /**
   * Derive the compact Bech32m address from the public key.
   * Returns a ~63-character `rouge1...` string.
   */
  async address() {
    return pubkeyToAddress(this.publicKey);
  }
  /**
   * Verify that the keypair is valid by signing and verifying a test message.
   */
  verify() {
    try {
      const msg = new TextEncoder().encode("rougechain-verify");
      const sig = ml_dsa65.sign(msg, hexToBytes(this.privateKey));
      return ml_dsa65.verify(sig, msg, hexToBytes(this.publicKey));
    } catch {
      return false;
    }
  }
};

export { BURN_ADDRESS, RougeChain, Wallet, addressToHash, bytesToHex, computeCommitment, computeNullifier, createShieldedNote, createSignedBridgeWithdraw, createSignedShield, createSignedShieldedTransfer, createSignedTokenApproval, createSignedTokenMetadataClaim, createSignedTokenMetadataUpdate, createSignedTokenTransferFrom, createSignedUnshield, formatAddress, generateMnemonic, generateNonce, generateRandomness, hexToBytes, isBurnAddress, isRougeAddress, keypairFromMnemonic, mnemonicToMLDSASeed, pubkeyToAddress, serializePayload, signRequest, signTransaction, validateMnemonic, verifyTransaction };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map