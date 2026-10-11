import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { generateMnemonic as generateMnemonic$1, validateMnemonic as validateMnemonic$1, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hkdf } from '@noble/hashes/hkdf.js';

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
var MAINNET_CHAIN_ID = "rougechain-mainnet-1";
var TESTNET_CHAIN_ID = "rougechain-devnet-1";
var ChainIdMismatchError = class extends Error {
  constructor(expected, actual) {
    super(`CHAIN_ID_MISMATCH: expected chain id "${expected}", got "${actual}" \u2014 refusing to sign`);
    this.expected = expected;
    this.actual = actual;
    this.code = "CHAIN_ID_MISMATCH";
    this.name = "ChainIdMismatchError";
  }
};
function bindWalletToChain(wallet, chainId) {
  if (!chainId) throw new Error("chainId is required");
  if (wallet.chainId !== void 0 && wallet.chainId !== chainId) {
    throw new ChainIdMismatchError(chainId, wallet.chainId);
  }
  return Object.assign(Object.create(Object.getPrototypeOf(wallet)), wallet, { chainId });
}
function applyChainId(wallet, payload) {
  if (wallet.chainId === void 0) return payload;
  const existing = payload.chainId;
  if (existing !== void 0 && existing !== wallet.chainId) {
    throw new ChainIdMismatchError(wallet.chainId, String(existing));
  }
  return { ...payload, chainId: wallet.chainId };
}
function buildAndSign(wallet, payload, accountNonce) {
  const full = {
    ...payload,
    from: wallet.publicKey,
    timestamp: Date.now(),
    nonce: generateNonce(),
    // Optional durable replay protection: the node enforces that this equals the account's next
    // nonce, so a captured signed tx cannot be re-executed once the account advances (independent
    // of the timestamp/replay window). Omit it and the node falls back to legacy behavior.
    ...accountNonce !== void 0 ? { account_nonce: accountNonce } : {}
  };
  const bound = applyChainId(wallet, full);
  return signTransaction(bound, wallet.privateKey, wallet.publicKey);
}
function createSignedTransfer(wallet, to, amount, fee = 1, token = "XRGE", accountNonce) {
  return buildAndSign(wallet, { type: "transfer", to, amount, fee, token }, accountNonce);
}
var TOKEN_MINT_MAX_AMOUNT = 9007199254740991;
var TOKEN_MINT_FEE_XRGE = 1;
var TOKEN_CREATE_FEE_XRGE = 100;
function isWholeAmount(n) {
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0;
}
function tokenMintFields(initialSupply, options = {}) {
  const { mintable, maxSupply } = options;
  if (mintable !== void 0 && typeof mintable !== "boolean") {
    throw new Error("mintable must be a boolean");
  }
  if (!mintable) {
    if (maxSupply !== void 0 && maxSupply !== null) {
      throw new Error("maxSupply requires mintable: true");
    }
    return {};
  }
  if (!isWholeAmount(initialSupply) || initialSupply > TOKEN_MINT_MAX_AMOUNT) {
    throw new Error(`a mintable token's initial supply must be a positive integer at most ${TOKEN_MINT_MAX_AMOUNT}`);
  }
  if (maxSupply === void 0 || maxSupply === null) {
    return { mintable: true };
  }
  if (!isWholeAmount(maxSupply) || maxSupply > TOKEN_MINT_MAX_AMOUNT) {
    throw new Error(`maxSupply must be a positive integer at most ${TOKEN_MINT_MAX_AMOUNT}`);
  }
  if (maxSupply < initialSupply) {
    throw new Error(`maxSupply ${maxSupply} is below the initial supply ${initialSupply}`);
  }
  return { mintable: true, max_supply: maxSupply };
}
function createSignedTokenCreation(wallet, tokenName, tokenSymbol, initialSupply, fee = TOKEN_CREATE_FEE_XRGE, image, options = {}) {
  const mintFields = tokenMintFields(initialSupply, options);
  return buildAndSign(wallet, {
    type: "create_token",
    token_name: tokenName,
    token_symbol: tokenSymbol,
    initial_supply: initialSupply,
    fee,
    ...image ? { image } : {},
    ...options.description ? { description: options.description } : {},
    ...mintFields
  });
}
function createSignedTokenMint(wallet, tokenSymbol, amount, fee = TOKEN_MINT_FEE_XRGE, accountNonce) {
  const symbol = String(tokenSymbol ?? "").trim().toUpperCase();
  if (!symbol) throw new Error("token symbol is required");
  if (!isWholeAmount(amount) || amount > TOKEN_MINT_MAX_AMOUNT) {
    throw new Error(`mint amount must be a positive integer at most ${TOKEN_MINT_MAX_AMOUNT}`);
  }
  return buildAndSign(
    wallet,
    { type: "mint_tokens", token_symbol: symbol, amount, fee },
    accountNonce
  );
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
    royaltyRecipient: opts.royaltyRecipient,
    image: opts.image,
    description: opts.description,
    publicMint: opts.publicMint,
    mintPrice: opts.mintPrice,
    tokenGateSymbol: opts.tokenGateSymbol,
    tokenGateAmount: opts.tokenGateAmount,
    discountPct: opts.discountPct
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
    // The node reads per-NFT batch attributes only from `attributes` (v2_binding nft_batch_mint).
    attributes: opts.attributes ?? opts.batchAttributes
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
var CONTRACT_MAX_GAS = 1e7;
var CONTRACT_GAS_PRICE_XRGE = 1e-6;
var CONTRACT_DEPLOY_FEE_XRGE = 10;
var ADDRESS_DOMAIN = new TextEncoder().encode("rougechain/contract/v2");
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function bytesToBase64(bytes) {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + "==";
  } else if (rem === 2) {
    const n = bytes[i] << 16 | bytes[i + 1] << 8;
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + "=";
  }
  return out;
}
function base64ToBytes(b64) {
  const clean = b64.replace(/\s+/g, "");
  if (clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
    throw new Error("invalid base64");
  }
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const out = new Uint8Array(clean.length / 4 * 3 - pad);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = B64.indexOf(clean[i]) << 18 | B64.indexOf(clean[i + 1]) << 12 | (clean[i + 2] === "=" ? 0 : B64.indexOf(clean[i + 2])) << 6 | (clean[i + 3] === "=" ? 0 : B64.indexOf(clean[i + 3]));
    if (o < out.length) out[o++] = n >> 16 & 255;
    if (o < out.length) out[o++] = n >> 8 & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}
function wasmBytes(wasm) {
  if (typeof wasm === "string") return base64ToBytes(wasm);
  return wasm instanceof Uint8Array ? wasm : new Uint8Array(wasm);
}
function predictContractAddress(from, nonce, wasm) {
  const enc = new TextEncoder();
  const fromB = enc.encode(from);
  const nonceB = enc.encode(nonce);
  const codeHash = sha256(wasmBytes(wasm));
  const buf = new Uint8Array(ADDRESS_DOMAIN.length + fromB.length + 1 + nonceB.length + 1 + codeHash.length);
  let o = 0;
  buf.set(ADDRESS_DOMAIN, o);
  o += ADDRESS_DOMAIN.length;
  buf.set(fromB, o);
  o += fromB.length;
  buf[o++] = 0;
  buf.set(nonceB, o);
  o += nonceB.length;
  buf[o++] = 0;
  buf.set(codeHash, o);
  return bytesToHex(sha256(buf).slice(0, 20));
}
function suggestGasLimit(gasUsed) {
  return Math.min(Math.ceil(gasUsed * 1.5) + 1e3, CONTRACT_MAX_GAS);
}
function contractCallFee(gasLimit) {
  return gasLimit * CONTRACT_GAS_PRICE_XRGE;
}
var QUANTA_PER_XRGE = 1000000000n;
var XRGE_DECIMALS = 9;
function xrgeToQuanta(xrge) {
  let str;
  if (typeof xrge === "number") {
    if (!Number.isFinite(xrge)) throw new Error(`invalid XRGE amount: ${xrge}`);
    str = String(xrge);
  } else if (typeof xrge === "string") {
    str = xrge.trim().replace(/_/g, "");
  } else {
    throw new Error("XRGE amount must be a number or a decimal string");
  }
  const m = /^(\+)?(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(str);
  if (!m || m[2] === "" && (m[3] ?? "") === "") {
    throw new Error(`invalid XRGE amount: "${str}"${str.startsWith("-") ? " (must not be negative)" : ""}`);
  }
  let digits = m[2] + (m[3] ?? "");
  let scale = (m[3] ?? "").length - (m[4] ? parseInt(m[4], 10) : 0);
  while (scale > 0 && digits.length > 0 && digits.endsWith("0")) {
    digits = digits.slice(0, -1);
    scale--;
  }
  if (scale > XRGE_DECIMALS) throw new Error(`XRGE amount "${str}" has more than ${XRGE_DECIMALS} decimal places`);
  if (scale < -1e3) throw new Error(`XRGE amount "${str}" is too large`);
  const n = BigInt(digits === "" ? "0" : digits);
  return n * 10n ** BigInt(XRGE_DECIMALS - scale);
}
function quantaToXrge(quanta) {
  const q = toBigIntStrict(quanta, "quanta");
  const neg = q < 0n;
  const a = neg ? -q : q;
  const whole = a / QUANTA_PER_XRGE;
  const frac = (a % QUANTA_PER_XRGE).toString().padStart(XRGE_DECIMALS, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}
function toBigIntStrict(v, what) {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isInteger(v)) throw new Error(`${what} must be an integer, got ${v}`);
    if (!Number.isSafeInteger(v)) throw new Error(`${what} ${v} is not a safe integer; pass a bigint or string`);
    return BigInt(v);
  }
  if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return BigInt(v.trim());
  throw new Error(`${what} must be an integer, got ${JSON.stringify(v)}`);
}
var MAX_ATTACH = BigInt(Number.MAX_SAFE_INTEGER);
function normalizeContractAttach(attach) {
  if (!attach || typeof attach !== "object") throw new Error("attach must be { symbol, amount }");
  const symbol = typeof attach.symbol === "string" ? attach.symbol.trim().toUpperCase() : "";
  if (!/^[A-Z0-9_-]{1,32}$/.test(symbol)) {
    throw new Error('attach.symbol must be "XRGE" or a token symbol (1-32 letters, digits, _ or -)');
  }
  const raw = attach.amount;
  let amount;
  if (typeof raw === "bigint") {
    amount = raw;
  } else if (typeof raw === "number") {
    if (!Number.isInteger(raw)) {
      throw new Error(`attach.amount must be an integer (${symbol === "XRGE" ? "quanta \u2014 use xrgeToQuanta()" : "raw token units"}), got ${raw}`);
    }
    if (!Number.isSafeInteger(raw)) throw new Error(`attach.amount ${raw} exceeds Number.MAX_SAFE_INTEGER`);
    amount = BigInt(raw);
  } else if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    amount = BigInt(raw.trim());
  } else {
    throw new Error(`attach.amount must be a positive integer (${symbol === "XRGE" ? "quanta \u2014 use xrgeToQuanta()" : "raw token units"}), got ${JSON.stringify(raw)}`);
  }
  if (amount <= 0n) throw new Error("attach.amount must be greater than 0");
  if (amount > MAX_ATTACH) {
    throw new Error(`attach.amount ${amount} exceeds Number.MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}); the node needs it as an exact JSON integer`);
  }
  return { symbol, amount: Number(amount) };
}
function normAddr(addr) {
  return addr.trim().toLowerCase();
}
function signWithBytes(wallet, payload) {
  const bound = applyChainId(wallet, payload);
  const tx = signTransaction(bound, wallet.privateKey, wallet.publicKey);
  return { ...tx, payload_bytes_hex: bytesToHex(serializePayload(tx.payload)) };
}
function createSignedContractPublish(wallet, wasm, opts = {}) {
  const bytes = wasmBytes(wasm);
  const nonce = opts.nonce ?? generateNonce();
  if (nonce.length < 8) throw new Error("contract publish nonce must be at least 8 characters");
  const payload = {
    type: "contract_deploy",
    from: wallet.publicKey,
    wasm: typeof wasm === "string" ? wasm.replace(/\s+/g, "") : bytesToBase64(bytes),
    timestamp: Date.now(),
    nonce
  };
  return {
    signed: signWithBytes(wallet, payload),
    predictedAddress: predictContractAddress(wallet.publicKey, nonce, bytes),
    nonce
  };
}
function createSignedContractCall(wallet, contractAddr, method, args, gasLimit, accountNonce, attach) {
  if (!Number.isInteger(gasLimit) || gasLimit < 1 || gasLimit > CONTRACT_MAX_GAS) {
    throw new Error(`gasLimit must be an integer between 1 and ${CONTRACT_MAX_GAS}`);
  }
  const att = attach === void 0 ? void 0 : normalizeContractAttach(attach);
  const payload = {
    type: "contract_call",
    from: wallet.publicKey,
    contractAddr: normAddr(contractAddr),
    method,
    args: args === void 0 ? {} : args,
    gasLimit,
    timestamp: Date.now(),
    nonce: generateNonce()
  };
  if (accountNonce !== void 0) payload.account_nonce = accountNonce;
  if (att) payload.attach = att;
  return signWithBytes(wallet, payload);
}
var ContractEventStream = class {
  constructor(rc) {
    this.rc = rc;
    this.ws = null;
    this.listeners = /* @__PURE__ */ new Map();
    this.statusListeners = /* @__PURE__ */ new Set();
    this.attempt = 0;
    this.timer = null;
  }
  add(addr, cb, onStatus) {
    const key = normAddr(addr);
    let set = this.listeners.get(key);
    const isNew = !set;
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.listeners.set(key, set);
    }
    set.add(cb);
    if (onStatus) this.statusListeners.add(onStatus);
    if (!this.ws && !this.timer) this.open();
    else if (isNew && this.ws?.readyState === 1) this.ws.send(JSON.stringify({ subscribe: [`contract:${key}`] }));
    let done = false;
    return () => {
      if (done) return;
      done = true;
      if (onStatus) this.statusListeners.delete(onStatus);
      const s = this.listeners.get(key);
      if (!s) return;
      s.delete(cb);
      if (s.size === 0) {
        this.listeners.delete(key);
        if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ unsubscribe: [`contract:${key}`] }));
      }
      if (this.listeners.size === 0) this.shutdown();
    };
  }
  open() {
    this.timer = null;
    if (this.listeners.size === 0) return;
    const Ctor = this.rc.wsCtor;
    if (!Ctor) throw new Error("No WebSocket implementation: pass { WebSocket } in RougeChainOptions");
    const ws = new Ctor(this.rc.baseUrl.replace(/^http/, "ws") + "/ws");
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      const topics = [...this.listeners.keys()].map((a) => `contract:${a}`);
      if (topics.length) ws.send(JSON.stringify({ subscribe: topics }));
      this.statusListeners.forEach((f) => f(true));
    };
    ws.onmessage = (e) => {
      let d;
      try {
        d = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (d.type !== "contract_event" || typeof d.contract_addr !== "string") return;
      const set = this.listeners.get(normAddr(d.contract_addr));
      if (!set) return;
      const ev = {
        contract_addr: d.contract_addr,
        topic: String(d.topic ?? ""),
        data: String(d.data ?? ""),
        block_height: Number(d.block_height ?? 0),
        tx_hash: String(d.tx_hash ?? "")
      };
      set.forEach((cb) => {
        try {
          cb(ev);
        } catch {
        }
      });
    };
    ws.onerror = () => {
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.statusListeners.forEach((f) => f(false));
      if (this.listeners.size === 0) return;
      this.timer = setTimeout(() => this.open(), Math.min(1e3 * 2 ** this.attempt++, 3e4));
    };
  }
  shutdown() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const ws = this.ws;
    this.ws = null;
    this.attempt = 0;
    ws?.close();
  }
};
var ContractsClient = class {
  constructor(rc) {
    this.rc = rc;
    this.stream = new ContractEventStream(rc);
  }
  /** @see predictContractAddress */
  predictContractAddress(from, nonce, wasm) {
    return predictContractAddress(from, nonce, wasm);
  }
  /**
   * Publish (deploy) WASM bytecode signed by `wallet`. Costs 10 XRGE. The contract is installed
   * when the tx is mined; its address is known now (`predictedAddress`).
   */
  async publish(wallet, wasm, opts = {}) {
    const { signed, predictedAddress, nonce } = createSignedContractPublish(await this.rc.bind(wallet), wasm, opts);
    const r = await this.send("/v2/contract/publish", signed);
    return {
      success: r.success === true,
      error: r.error,
      txId: r.txId,
      address: r.address,
      fee: r.fee,
      predictedAddress,
      nonce
    };
  }
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
  async execute(wallet, contractAddr, method, args = {}, opts = {}) {
    let attach;
    try {
      attach = opts.attach === void 0 ? void 0 : normalizeContractAttach(opts.attach);
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
    let gasLimit = opts.gasLimit;
    if (gasLimit === void 0) {
      const q = await this.query(contractAddr, method, args, wallet.publicKey, { attach });
      if (!q.success) {
        return {
          success: false,
          error: q.error || "call would fail",
          preview: { returnData: q.returnData, gasUsed: q.gasUsed, events: q.events }
        };
      }
      gasLimit = suggestGasLimit(q.gasUsed);
    }
    let signed;
    try {
      signed = createSignedContractCall(await this.rc.bind(wallet), contractAddr, method, args, gasLimit, opts.accountNonce, attach);
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e), gasLimit, attach };
    }
    const r = await this.send("/v2/contract/execute", signed);
    return {
      success: r.success === true,
      error: r.error,
      txId: r.txId,
      fee: r.fee,
      gasLimit,
      attach,
      preview: r.preview
    };
  }
  /**
   * Read-only call: no signature, no fee, nothing is committed. With `opts.attach` (and a
   * `caller`) it previews a paid call: the contract sees the payment as it would in a block.
   */
  async query(contractAddr, method, args = {}, caller, opts = {}) {
    const body = { method, args };
    if (caller) body.caller = caller;
    if (opts.attach !== void 0) {
      try {
        if (!caller) throw new Error("previewing an attached payment needs the caller");
        body.attach = normalizeContractAttach(opts.attach);
      } catch (e) {
        return { success: false, gasUsed: 0, events: [], error: e instanceof Error ? e.message : String(e) };
      }
    }
    const r = await this.send(`/contract/${encodeURIComponent(normAddr(contractAddr))}/query`, body);
    return {
      success: r.success === true,
      returnData: r.returnData,
      gasUsed: Number(r.gasUsed ?? 0),
      events: r.events ?? [],
      error: r.error
    };
  }
  /** Contract metadata, or null if no contract lives at `addr`. */
  async get(contractAddr) {
    const r = await this.rc.get(
      `/contract/${encodeURIComponent(normAddr(contractAddr))}`
    );
    return r.success && r.contract ? r.contract : null;
  }
  async state(contractAddr, key) {
    const base = `/contract/${encodeURIComponent(normAddr(contractAddr))}/state`;
    if (key === void 0) {
      const r2 = await this.rc.get(base);
      if (!r2.success) throw new Error(r2.error || "state read failed");
      return r2.state ?? {};
    }
    const k = typeof key === "string" ? key : bytesToHex(key);
    const r = await this.rc.get(
      `${base}?key=${encodeURIComponent(k)}`
    );
    if (!r.success) throw new Error(r.error || "state read failed");
    return { key: r.key, value: r.value ?? null, valueUtf8: r.valueUtf8 };
  }
  /** Stored events, newest first as the node returns them. Page with `before` (block height). */
  async events(contractAddr, q = {}) {
    const params = new URLSearchParams();
    if (q.limit !== void 0) params.set("limit", String(q.limit));
    if (q.before !== void 0) params.set("before", String(q.before));
    if (q.tx !== void 0) params.set("tx", q.tx);
    const qs = params.toString();
    const r = await this.rc.get(
      `/contract/${encodeURIComponent(normAddr(contractAddr))}/events${qs ? `?${qs}` : ""}`
    );
    if (!r.success) throw new Error(r.error || "events read failed");
    return r.events ?? [];
  }
  /** Every deployed contract. */
  async list() {
    const r = await this.rc.get("/contracts");
    return r.contracts ?? [];
  }
  /**
   * Live events from `contractAddr`, delivered after their block is accepted. All subscriptions
   * of this client share one WebSocket that reconnects and resubscribes on its own.
   * Returns a function that stops this subscription.
   */
  subscribe(contractAddr, onEvent, opts = {}) {
    return this.stream.add(contractAddr, onEvent, opts.onStatus);
  }
  /**
   * Wait until `txId` is in a block and return its receipt. A `contract_call` whose contract
   * reverted in the block is still included (the fee is charged) and its receipt reports
   * `status: { Failed: "<error>" }`; a call that ran to completion reports `"Success"`.
   */
  async waitForReceipt(txId, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? 6e4;
    const intervalMs = opts.intervalMs ?? 1500;
    const deadline = Date.now() + timeoutMs;
    for (; ; ) {
      const res = await this.rc.fetchFn(`${this.rc.baseUrl}/tx/${encodeURIComponent(txId)}/receipt`, {
        headers: this.rc.headers
      });
      if (res.ok) {
        const d = await res.json();
        if (d.receipt) return d.receipt;
      } else if (res.status !== 404) {
        throw new Error(`GET /tx/${txId}/receipt failed: ${res.status}`);
      }
      if (Date.now() + intervalMs > deadline) {
        throw new Error(`transaction ${txId} was not included within ${timeoutMs} ms`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  /**
   * A small handle for game code: `call` (signed), `query` (free), `state`, and `on(topic)`.
   *
   * @example
   * const g = rc.contracts.game(addr, wallet);
   * const off = g.on("move", (e) => render(JSON.parse(e.data)));
   * await g.call("move", { x: 1, y: 2 });
   * await g.call("roll", {}, { attach: { symbol: "XRGE", amount: xrgeToQuanta("0.5") } }); // paid
   */
  game(contractAddr, wallet) {
    const address = normAddr(contractAddr);
    const self = this;
    return {
      address,
      call(method, args = {}, opts) {
        if (!wallet) return Promise.reject(new Error("game(): pass a wallet to make signed calls"));
        return self.execute(wallet, address, method, args, opts);
      },
      query(method, args = {}, opts) {
        return self.query(address, method, args, wallet?.publicKey, opts);
      },
      state(key) {
        return key === void 0 ? self.state(address) : self.state(address, key);
      },
      on(topic, cb) {
        return self.subscribe(address, (e) => {
          if (topic === "*" || e.topic === topic) cb(e);
        });
      }
    };
  }
  /** POST that returns the node's JSON body on 4xx too (the node explains refusals there). */
  async send(path, body) {
    let res;
    try {
      res = await this.rc.fetchFn(`${this.rc.baseUrl}${path}`, {
        method: "POST",
        headers: this.rc.headers,
        body: JSON.stringify(body)
      });
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
    const text = await res.text().catch(() => "");
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
    }
    if (data && typeof data === "object") {
      if (!res.ok && data.success === void 0) data.success = false;
      if (!res.ok && !data.error) data.error = `POST ${path} failed: ${res.status}`;
      return data;
    }
    return {
      success: false,
      error: `POST ${path} failed: ${res.status} ${res.statusText} ${text}`.trim()
    };
  }
};

// src/client.ts
function tokenMintingActive(stats) {
  const at = stats?.upgrade_schedule?.token_minting;
  if (typeof at !== "number" || !Number.isFinite(at)) return false;
  const height = typeof stats?.network_height === "number" ? stats.network_height : -1;
  if (height < 0) return false;
  return height + 1 >= at;
}
var RougeChain = class {
  constructor(baseUrl, options = {}) {
    this.chainIdCheck = null;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.headers = { "Content-Type": "application/json" };
    this.wsCtor = options.WebSocket ?? (typeof globalThis.WebSocket === "function" ? globalThis.WebSocket : void 0);
    if (options.apiKey) {
      this.headers["X-API-Key"] = options.apiKey;
    }
    this.configuredChainId = options.chainId || void 0;
    this.nft = new NftClient(this);
    this.dex = new DexClient(this);
    this.bridge = new BridgeClient(this);
    this.mail = new MailClient(this);
    this.messenger = new MessengerClient(this);
    this.shielded = new ShieldedClient(this);
    this.social = new SocialClient(this);
    this.contracts = new ContractsClient(this);
  }
  // ===== Network binding =====
  /**
   * The chain id this client signs for. Checked against the node once per client instance
   * (`GET /health` → `chain_id`); rejects with {@link ChainIdMismatchError} when the node reports
   * a different chain id than `options.chainId`. Without `options.chainId` the node's is adopted.
   */
  async getChainId() {
    if (this.resolvedChainId !== void 0) return this.resolvedChainId;
    if (!this.chainIdCheck) {
      this.chainIdCheck = this.fetchReportedChainId().then((reported) => {
        const want = this.configuredChainId;
        if (want !== void 0 && reported !== null && reported !== want) {
          throw new ChainIdMismatchError(want, reported);
        }
        const id = want ?? reported;
        if (!id) {
          throw new Error("CHAIN_ID_UNKNOWN: the node did not report a chain id; pass `chainId` in the RougeChain options");
        }
        this.resolvedChainId = id;
        return id;
      });
      this.chainIdCheck.catch((e) => {
        if (!(e instanceof ChainIdMismatchError)) this.chainIdCheck = null;
      });
    }
    return this.chainIdCheck;
  }
  /** The chain id if already known (configured or checked), without a network round trip. */
  knownChainId() {
    return this.resolvedChainId ?? this.configuredChainId;
  }
  async fetchReportedChainId() {
    for (const path of ["/health", "/stats"]) {
      try {
        const res = await this.fetchFn(`${this.baseUrl}${path}`, { headers: this.headers });
        if (!res.ok) continue;
        const data = await res.json();
        if (typeof data?.chain_id === "string" && data.chain_id) return data.chain_id;
      } catch {
      }
    }
    return null;
  }
  /** @internal `wallet` bound to this client's (checked) chain id, for the signers. */
  async bind(wallet) {
    return bindWalletToChain(wallet, await this.getChainId());
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
  /**
   * One-shot validator health for a key: balance, stake (+tier), active-set
   * membership, and blocks proposed. Mirrors the `rougechain validator-status`
   * CLI diagnostic. Minimum stake is 10,000 XRGE. Reads camelCase fields from
   * /validators (tolerating snake_case too).
   */
  async getValidatorStatus(publicKey) {
    const [bal, vals] = await Promise.all([
      this.getBalance(publicKey),
      this.get("/validators")
    ]);
    const entry = (vals.validators ?? []).find(
      (v) => (v.publicKey ?? v.public_key) === publicKey
    );
    const staked = entry ? Number(entry.stake ?? 0) : 0;
    const tier = staked >= 1e6 ? "genesis" : staked >= 1e5 ? "operator" : staked >= 1e4 ? "standard" : "none";
    const status = entry ? String(entry.status ?? "unknown") : "not registered";
    return {
      publicKey,
      balance: bal.balance,
      staked,
      tier,
      status,
      inActiveSet: status === "active",
      blocksProposed: entry ? Number(entry.blocksProposed ?? entry.blocks_proposed ?? 0) : 0,
      meetsMinimum: staked >= 1e4
    };
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
    const tx = createSignedPushRegister(await this.bind(wallet), pushToken, platform);
    return this.submitTx("/push/register", tx);
  }
  /** Unregister push notifications — signed by wallet to prove ownership. */
  async unregisterPushToken(wallet) {
    const tx = createSignedPushUnregister(await this.bind(wallet));
    return this.submitTx("/push/unregister", tx);
  }
  // ===== Write operations =====
  async transfer(wallet, params) {
    const tx = createSignedTransfer(
      await this.bind(wallet),
      params.to,
      params.amount,
      params.fee,
      params.token
    );
    return this.submitTx("/v2/transfer", tx);
  }
  /**
   * Create a token (`create_token`, 100 XRGE). With `mintable: true` (and optional `maxSupply`)
   * the creator can mint more later with {@link mintTokens} — node TOKEN_MINTING upgrade only;
   * check {@link isTokenMintingActive} first. Invalid mint options resolve to `{ success: false }`.
   */
  async createToken(wallet, params) {
    let tx;
    try {
      tx = createSignedTokenCreation(
        await this.bind(wallet),
        params.name,
        params.symbol,
        params.totalSupply,
        params.fee,
        params.image,
        { mintable: params.mintable, maxSupply: params.maxSupply, description: params.description }
      );
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
    return this.submitTx("/v2/token/create", tx);
  }
  async stake(wallet, params) {
    const tx = createSignedStake(await this.bind(wallet), params.amount, params.fee);
    return this.submitTx("/v2/stake", tx);
  }
  async unstake(wallet, params) {
    const tx = createSignedUnstake(await this.bind(wallet), params.amount, params.fee);
    return this.submitTx("/v2/unstake", tx);
  }
  async faucet(wallet) {
    const tx = createSignedFaucetRequest(await this.bind(wallet));
    return this.submitTx("/v2/faucet", tx);
  }
  async burn(wallet, amount, fee = 1, token = "XRGE") {
    const tx = createSignedBurn(await this.bind(wallet), amount, fee, token);
    return this.submitTx("/v2/transfer", tx);
  }
  async updateTokenMetadata(wallet, params) {
    const tx = createSignedTokenMetadataUpdate(await this.bind(wallet), params.symbol, {
      image: params.image,
      description: params.description,
      website: params.website,
      twitter: params.twitter,
      discord: params.discord
    });
    return this.submitTx("/v2/token/metadata/update", tx);
  }
  async claimTokenMetadata(wallet, tokenSymbol) {
    const tx = createSignedTokenMetadataClaim(await this.bind(wallet), tokenSymbol);
    return this.submitTx("/v2/token/metadata/claim", tx);
  }
  /**
   * Mint more of a mintable token (`mint_tokens`, signed; node TOKEN_MINTING upgrade). Creator
   * only; the node enforces the max supply and charges 1 XRGE. Errors (not creator, not
   * mintable, exceeds max supply, not active yet) resolve to `{ success: false, error }`.
   */
  async mintTokens(wallet, params) {
    let tx;
    try {
      tx = createSignedTokenMint(await this.bind(wallet), params.symbol, params.amount, params.fee, params.accountNonce);
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
    return this.submitTx("/v2/token/mint", tx);
  }
  /** Whether the node's TOKEN_MINTING upgrade is active for the next block (see {@link tokenMintingActive}). */
  async isTokenMintingActive() {
    return tokenMintingActive(await this.getStats());
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
    const tx = createSignedNftCreateCollection(await this.rc.bind(wallet), params.symbol, params.name, {
      maxSupply: params.maxSupply,
      royaltyBps: params.royaltyBps,
      royaltyRecipient: params.royaltyRecipient,
      image: params.image,
      description: params.description,
      publicMint: params.publicMint,
      mintPrice: params.mintPrice,
      tokenGateSymbol: params.tokenGateSymbol,
      tokenGateAmount: params.tokenGateAmount,
      discountPct: params.discountPct
    });
    return this.rc.submitTx("/v2/nft/collection/create", tx);
  }
  async mint(wallet, params) {
    const tx = createSignedNftMint(await this.rc.bind(wallet), params.collectionId, params.name, {
      metadataUri: params.metadataUri,
      attributes: params.attributes
    });
    return this.rc.submitTx("/v2/nft/mint", tx);
  }
  async batchMint(wallet, params) {
    const tx = createSignedNftBatchMint(
      await this.rc.bind(wallet),
      params.collectionId,
      params.names,
      { uris: params.uris, attributes: params.attributes ?? params.batchAttributes }
    );
    return this.rc.submitTx("/v2/nft/batch-mint", tx);
  }
  async transfer(wallet, params) {
    const tx = createSignedNftTransfer(
      await this.rc.bind(wallet),
      params.collectionId,
      params.tokenId,
      params.to,
      params.salePrice
    );
    return this.rc.submitTx("/v2/nft/transfer", tx);
  }
  async burn(wallet, params) {
    const tx = createSignedNftBurn(await this.rc.bind(wallet), params.collectionId, params.tokenId);
    return this.rc.submitTx("/v2/nft/burn", tx);
  }
  async lock(wallet, params) {
    const tx = createSignedNftLock(
      await this.rc.bind(wallet),
      params.collectionId,
      params.tokenId,
      params.locked
    );
    return this.rc.submitTx("/v2/nft/lock", tx);
  }
  async freezeCollection(wallet, params) {
    const tx = createSignedNftFreezeCollection(
      await this.rc.bind(wallet),
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
      await this.rc.bind(wallet),
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.minAmountOut
    );
    return this.rc.submitTx("/v2/swap/execute", tx);
  }
  async createPool(wallet, params) {
    const tx = createSignedPoolCreation(
      await this.rc.bind(wallet),
      params.tokenA,
      params.tokenB,
      params.amountA,
      params.amountB
    );
    return this.rc.submitTx("/v2/pool/create", tx);
  }
  async addLiquidity(wallet, params) {
    const tx = createSignedAddLiquidity(
      await this.rc.bind(wallet),
      params.poolId,
      params.amountA,
      params.amountB
    );
    return this.rc.submitTx("/v2/pool/add-liquidity", tx);
  }
  async removeLiquidity(wallet, params) {
    const tx = createSignedRemoveLiquidity(await this.rc.bind(wallet), params.poolId, params.lpAmount);
    return this.rc.submitTx("/v2/pool/remove-liquidity", tx);
  }
};
function normalizeBridgeWithdrawal(raw) {
  const pick = (camel, snake) => raw[camel] ?? raw[snake];
  return {
    txId: pick("txId", "tx_id") ?? "",
    evmAddress: pick("evmAddress", "evm_address") ?? "",
    amountUnits: pick("amountUnits", "amount_units") ?? raw.amount ?? 0,
    createdAt: pick("createdAt", "created_at") ?? 0,
    ownerPubkey: pick("ownerPubkey", "owner_pubkey") ?? "",
    tokenSymbol: pick("tokenSymbol", "token_symbol") ?? "qETH",
    status: raw.status ?? "pending",
    attempts: raw.attempts ?? 0,
    lastError: pick("lastError", "last_error")
  };
}
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
  /** List pending ETH/qETH/qUSDC withdrawals with relayer release status. */
  async getWithdrawals() {
    const data = await this.rc.get(
      "/bridge/withdrawals"
    );
    return (data.withdrawals ?? []).map(normalizeBridgeWithdrawal);
  }
  /** Withdraw qETH/qUSDC — signed client-side, private key never sent to server */
  async withdraw(wallet, params) {
    try {
      const tokenSymbol = params.tokenSymbol ?? "qETH";
      const signed = createSignedBridgeWithdraw(
        await this.rc.bind(wallet),
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
        await this.rc.bind(wallet),
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
  /** List pending XRGE withdrawals with relayer release status. */
  async getXrgeWithdrawals() {
    try {
      const data = await this.rc.get(
        "/bridge/xrge/withdrawals"
      );
      return (data.withdrawals ?? []).map(normalizeBridgeWithdrawal);
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
    const signed = signRequest(await this.rc.bind(wallet), { name, walletId });
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
    const signed = signRequest(await this.rc.bind(wallet), { name });
    return this.rc.submitTx("/v2/names/release", signed);
  }
  // --- Mail (signed) ---
  async send(wallet, params) {
    const sigPayload = params.encrypted_subject + "|" + params.encrypted_body + (params.encrypted_attachment ? "|" + params.encrypted_attachment : "");
    let contentSig = params.content_signature || "";
    if (!contentSig && wallet.privateKey) {
      try {
        const { ml_dsa65: ml_dsa656 } = await import('@noble/post-quantum/ml-dsa.js');
        const privKey = typeof wallet.privateKey === "string" ? hexToBytes(wallet.privateKey) : wallet.privateKey;
        const sigBytes = ml_dsa656.sign(
          new TextEncoder().encode(sigPayload),
          privKey
        );
        contentSig = bytesToHex(sigBytes);
      } catch {
      }
    }
    const signed = signRequest(await this.rc.bind(wallet), {
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
    const signed = signRequest(await this.rc.bind(wallet), { folder: "inbox" });
    try {
      const data = await this.rc.post("/v2/mail/folder", signed);
      return data.messages ?? [];
    } catch {
      return [];
    }
  }
  async getSent(wallet) {
    const signed = signRequest(await this.rc.bind(wallet), { folder: "sent" });
    try {
      const data = await this.rc.post("/v2/mail/folder", signed);
      return data.messages ?? [];
    } catch {
      return [];
    }
  }
  async getTrash(wallet) {
    const signed = signRequest(await this.rc.bind(wallet), { folder: "trash" });
    try {
      const data = await this.rc.post("/v2/mail/folder", signed);
      return data.messages ?? [];
    } catch {
      return [];
    }
  }
  async getMessage(wallet, messageId) {
    const signed = signRequest(await this.rc.bind(wallet), { messageId });
    try {
      const data = await this.rc.post("/v2/mail/message", signed);
      return data.message ?? null;
    } catch {
      return null;
    }
  }
  async move(wallet, messageId, folder) {
    const signed = signRequest(await this.rc.bind(wallet), { messageId, folder });
    return this.rc.submitTx("/v2/mail/move", signed);
  }
  async markRead(wallet, messageId) {
    const signed = signRequest(await this.rc.bind(wallet), { messageId });
    return this.rc.submitTx("/v2/mail/read", signed);
  }
  async delete(wallet, messageId) {
    const signed = signRequest(await this.rc.bind(wallet), { messageId });
    return this.rc.submitTx("/v2/mail/delete", signed);
  }
};
function normalizeConversation(c) {
  const ids = c.participant_ids ?? c.participants ?? [];
  return { ...c, participant_ids: ids, participants: ids };
}
var MessengerClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  async getWallets() {
    const data = await this.rc.get("/messenger/wallets");
    return data.wallets ?? [];
  }
  async registerWallet(wallet, opts) {
    const signed = signRequest(await this.rc.bind(wallet), {
      id: opts.id,
      displayName: opts.displayName,
      signingPublicKey: opts.signingPublicKey,
      encryptionPublicKey: opts.encryptionPublicKey,
      discoverable: opts.discoverable ?? true,
      ...opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}
    });
    return this.rc.submitTx("/v2/messenger/wallets/register", signed);
  }
  /**
   * List your conversations. `folder`: "inbox" (default), "trash" (conversations you
   * deleted, recoverable for 30 days) or "all".
   */
  async getConversations(wallet, opts = {}) {
    const signed = signRequest(await this.rc.bind(wallet), opts.folder ? { folder: opts.folder } : {});
    try {
      const data = await this.rc.post(
        "/v2/messenger/conversations/list",
        signed
      );
      return (data.conversations ?? []).map(normalizeConversation);
    } catch {
      return [];
    }
  }
  async createConversation(wallet, participantIds, opts = {}) {
    const signed = signRequest(await this.rc.bind(wallet), {
      participantIds,
      name: opts.name,
      isGroup: opts.isGroup ?? false
    });
    return this.rc.submitTx("/v2/messenger/conversations", signed);
  }
  /** Rename a group conversation (or clear its name by passing ""). Any participant may rename. */
  async updateConversation(wallet, conversationId, opts = {}) {
    const signed = signRequest(await this.rc.bind(wallet), {
      conversationId,
      name: opts.name
    });
    return this.rc.submitTx("/v2/messenger/conversations/update", signed);
  }
  /**
   * Add participants to an existing conversation. Any participant may add. Future messages
   * encrypt to the new members automatically; they don't receive prior history.
   */
  async addParticipants(wallet, conversationId, participantIds) {
    const signed = signRequest(await this.rc.bind(wallet), {
      conversationId,
      participantIds
    });
    return this.rc.submitTx("/v2/messenger/conversations/participants", signed);
  }
  async getMessages(wallet, conversationId) {
    const signed = signRequest(await this.rc.bind(wallet), { conversationId });
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
    const signed = signRequest(await this.rc.bind(wallet), {
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
    const signed = signRequest(await this.rc.bind(wallet), { messageId, conversationId });
    return this.rc.submitTx("/v2/messenger/messages/delete", signed);
  }
  /**
   * Delete a conversation for YOU only. It moves to your trash and can be restored for
   * 30 days; `purge: true` skips the recovery window. The thread is removed for good
   * only once every participant has deleted it.
   */
  async deleteConversation(wallet, conversationId, opts = {}) {
    const signed = signRequest(await this.rc.bind(wallet), opts.purge ? { conversationId, purge: true } : { conversationId });
    return this.rc.submitTx("/v2/messenger/conversations/delete", signed);
  }
  /** Restore a conversation from your trash. */
  async restoreConversation(wallet, conversationId) {
    const signed = signRequest(await this.rc.bind(wallet), { conversationId });
    return this.rc.submitTx("/v2/messenger/conversations/restore", signed);
  }
  /** Restore a message you deleted (sender only, within the recovery window). */
  async restoreMessage(wallet, messageId, conversationId) {
    const signed = signRequest(await this.rc.bind(wallet), { messageId, conversationId });
    return this.rc.submitTx("/v2/messenger/messages/restore", signed);
  }
  /**
   * Build the signed `{ auth }` frame that subscribes a WebSocket to this wallet's
   * private `new_message` events. Nonces are single-use: build a new one per connect.
   */
  realtimeAuth(wallet) {
    const chainId = this.rc.knownChainId();
    const w = chainId ? bindWalletToChain(wallet, chainId) : wallet;
    return { auth: signRequest(w, { action: "messenger_ws_subscribe" }) };
  }
  /**
   * Receive this wallet's new-message events in real time. Events carry routing data
   * only (conversation/message ids, sender + participant signing keys), never content;
   * fetch the message with `getMessages`. Reconnects and re-authenticates with backoff.
   * Returns a function that stops the subscription.
   *
   * @example
   * const stop = rc.messenger.subscribe(wallet, (ev) => refresh(ev.conversation_id));
   */
  subscribe(wallet, onMessage, opts = {}) {
    const url = this.rc.baseUrl.replace(/^http/, "ws") + "/ws";
    let ws = null;
    let stopped = false;
    let attempt = 0;
    let timer = null;
    const open = () => {
      if (stopped) return;
      ws = new WebSocket(url);
      ws.onopen = () => {
        attempt = 0;
        ws?.send(JSON.stringify(this.realtimeAuth(wallet)));
      };
      ws.onmessage = (e) => {
        let d;
        try {
          d = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (d.type === "subscribed") opts.onStatus?.(true);
        else if (d.type === "auth_error") opts.onStatus?.(false, d.error);
        else if (d.type === "new_message") onMessage(d);
      };
      ws.onclose = () => {
        opts.onStatus?.(false);
        if (stopped) return;
        timer = setTimeout(open, Math.min(1e3 * 2 ** attempt++, 3e4));
      };
    };
    this.rc.getChainId().then(open, (e) => {
      if (e instanceof ChainIdMismatchError) opts.onStatus?.(false, e.message);
      else open();
    });
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }
  async markRead(wallet, messageId, conversationId) {
    const signed = signRequest(await this.rc.bind(wallet), { messageId, conversationId });
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
    const tx = createSignedShield(await this.rc.bind(wallet), params.amount, note.commitment);
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
      await this.rc.bind(wallet),
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
      await this.rc.bind(wallet),
      params.nullifiers,
      params.amount,
      params.proof
    );
    return this.rc.submitTx("/v2/shielded/unshield", tx);
  }
  // ─── WASM Smart Contracts ──────────────────────────────────────────
  /**
   * Deploy a WASM smart contract (node-signed, legacy).
   * @deprecated Disabled on networks with player-signed contracts (410 Gone). Use `rc.contracts.publish`.
   */
  async deployContract(params) {
    return this.rc.post("/v2/contract/deploy", params);
  }
  /**
   * Call a WASM smart contract method (legacy, node-signed).
   * @deprecated Preview-only on networks with player-signed contracts. Use `rc.contracts.execute` / `rc.contracts.query`.
   */
  async callContract(params) {
    return this.rc.post("/v2/contract/call", params);
  }
  /** Get contract metadata. @deprecated Use `rc.contracts.get`. */
  async getContract(addr) {
    return this.rc.get(`/contract/${addr}`);
  }
  /** Read contract storage. Omit key for full state dump. @deprecated Use `rc.contracts.state`. */
  async getContractState(addr, key) {
    const q = key ? `?key=${encodeURIComponent(key)}` : "";
    return this.rc.get(`/contract/${addr}/state${q}`);
  }
  /** Get contract events. @deprecated Use `rc.contracts.events`. */
  async getContractEvents(addr, limit) {
    const q = limit ? `?limit=${limit}` : "";
    return this.rc.get(`/contract/${addr}/events${q}`);
  }
  /** List all deployed contracts. @deprecated Use `rc.contracts.list`. */
  async listContracts() {
    return this.rc.get("/contracts");
  }
};
var SocialClient = class {
  constructor(rc) {
    this.rc = rc;
  }
  async recordPlay(wallet, trackId) {
    const signed = signRequest(await this.rc.bind(wallet), { trackId });
    return this.rc.submitTx("/v2/social/play", signed);
  }
  async toggleLike(wallet, trackId) {
    const signed = signRequest(await this.rc.bind(wallet), { trackId });
    return this.rc.submitTx("/v2/social/like", signed);
  }
  async postComment(wallet, trackId, body) {
    const signed = signRequest(await this.rc.bind(wallet), { trackId, body });
    return this.rc.submitTx("/v2/social/comment", signed);
  }
  async deleteComment(wallet, commentId) {
    const signed = signRequest(await this.rc.bind(wallet), { commentId });
    return this.rc.submitTx("/v2/social/comment/delete", signed);
  }
  async toggleFollow(wallet, artistPubkey) {
    const signed = signRequest(await this.rc.bind(wallet), { artistPubkey });
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
  /** Followers of a pubkey, paginated (default 50, max 200 server-side). */
  async getUserFollowers(pubkey, limit = 50, offset = 0) {
    const q = `?limit=${limit}&offset=${offset}`;
    const data = await this.rc.get(
      `/social/user/${encodeURIComponent(pubkey)}/followers${q}`
    );
    return data.followers ?? [];
  }
  // ── Posts ──────────────────────────────────────────────
  async createPost(wallet, body, replyToId) {
    const payload = { body };
    if (replyToId) payload.replyToId = replyToId;
    const signed = signRequest(await this.rc.bind(wallet), payload);
    return this.rc.submitTx("/v2/social/post", signed);
  }
  async deletePost(wallet, postId) {
    const signed = signRequest(await this.rc.bind(wallet), { postId });
    return this.rc.submitTx("/v2/social/post/delete", signed);
  }
  async toggleRepost(wallet, postId) {
    const signed = signRequest(await this.rc.bind(wallet), { postId });
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
    const signed = signRequest(await this.rc.bind(wallet), { limit, offset });
    try {
      const data = await this.rc.submitTx("/v2/social/feed", signed);
      return data.posts ?? [];
    } catch {
      return [];
    }
  }
  // ── Hidden Tracks ─────────────────────────────────────
  async hideTrack(wallet, trackId, hidden = true) {
    const signed = signRequest(await this.rc.bind(wallet), { trackId, hidden });
    return this.rc.submitTx("/v2/social/hide-track", signed);
  }
  async getHiddenTracks(pubkey) {
    const data = await this.rc.get(`/social/hidden-tracks/${encodeURIComponent(pubkey)}`);
    return data.trackIds ?? [];
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
async function sha2563(data) {
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}
async function pubkeyToAddress(publicKeyHex) {
  const pkBytes = hexToBytes2(publicKeyHex);
  const hash = await sha2563(pkBytes);
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
  return hkdf(sha256, bip39Seed, void 0, DOMAIN_INFO, 32);
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
var SIGNED_MESSAGE_PREFIX = "RougeChain Signed Message:\n";
var MAX_SIGN_MESSAGE_BYTES = 4096;
var ML_DSA_65_PUBLIC_KEY_BYTES = 1952;
var ML_DSA_65_SIGNATURE_BYTES = 3309;
var utf8 = new TextEncoder();
function strictHexToBytes(hex, expectedBytes) {
  if (typeof hex !== "string" || hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
  if (expectedBytes !== void 0 && hex.length !== expectedBytes * 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function toHex(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}
function isWellFormedString(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 55296 && c <= 56319) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 56320 && next <= 57343)) return false;
      i++;
    } else if (c >= 56320 && c <= 57343) {
      return false;
    }
  }
  return true;
}
function messageToBytes(message) {
  if (typeof message === "string") {
    if (!isWellFormedString(message)) throw new Error("message is not well-formed Unicode (lone surrogate)");
    return utf8.encode(message);
  }
  if (message instanceof Uint8Array) return message;
  throw new Error("message must be a string or a Uint8Array");
}
function messageSigningBytes(message) {
  const body = messageToBytes(message);
  const head = utf8.encode(`${SIGNED_MESSAGE_PREFIX}${body.length}
`);
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
}
function signMessage(privateKeyHex, message) {
  const sk = strictHexToBytes(privateKeyHex);
  if (!sk || sk.length === 0) throw new Error("privateKeyHex must be a hex string");
  return toHex(ml_dsa65.sign(messageSigningBytes(message), sk));
}
function verifyMessage(publicKeyHex, message, signatureHex) {
  try {
    const pk = strictHexToBytes(publicKeyHex, ML_DSA_65_PUBLIC_KEY_BYTES);
    const sig = strictHexToBytes(signatureHex, ML_DSA_65_SIGNATURE_BYTES);
    if (!pk || !sig) return false;
    return ml_dsa65.verify(sig, messageSigningBytes(message), pk) === true;
  } catch {
    return false;
  }
}
var SIGN_IN_HEADER_SUFFIX = " wants you to sign in with your RougeChain account:";
var SIGN_IN_VERSION = "1";
var SIGN_IN_MIN_NONCE_LENGTH = 16;
var DOMAIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?$/;
var NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/;
var CHAIN_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
var ISO_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
var URI_RE = /^[\x21-\x7e]{1,2048}$/;
var STATEMENT_RE = /^[^\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]{1,1024}$/;
function isoToMs(s) {
  return ISO_TIME_RE.test(s) ? Date.parse(s) : NaN;
}
function signInFieldError(f) {
  if (!f || typeof f !== "object") return "fields must be an object";
  if (typeof f.domain !== "string" || !DOMAIN_RE.test(f.domain)) return "domain must be a host name with an optional port (no scheme, no path)";
  if (typeof f.address !== "string" || f.address !== f.address.toLowerCase() || !isRougeAddress(f.address)) return "address must be a lower-case rouge1\u2026 address";
  if (typeof f.uri !== "string" || !URI_RE.test(f.uri)) return "uri must be a URI without whitespace";
  if (f.statement !== void 0 && (typeof f.statement !== "string" || !STATEMENT_RE.test(f.statement) || f.statement !== f.statement.trim())) {
    return "statement must be one line of text";
  }
  if (typeof f.nonce !== "string" || !NONCE_RE.test(f.nonce)) return `nonce must be ${SIGN_IN_MIN_NONCE_LENGTH}\u2013128 characters of A-Z a-z 0-9 - _`;
  if (typeof f.issuedAt !== "string" || Number.isNaN(isoToMs(f.issuedAt))) return "issuedAt must be an ISO 8601 time with a time zone";
  if (f.expirationTime !== void 0 && (typeof f.expirationTime !== "string" || Number.isNaN(isoToMs(f.expirationTime)))) {
    return "expirationTime must be an ISO 8601 time with a time zone";
  }
  if (typeof f.chainId !== "string" || !CHAIN_ID_RE.test(f.chainId)) return "chainId must be a chain id such as rougechain-mainnet-1";
  if (f.resources !== void 0) {
    if (!Array.isArray(f.resources) || f.resources.length > 32) return "resources must be an array of at most 32 URIs";
    for (const r of f.resources) if (typeof r !== "string" || !URI_RE.test(r)) return "each resource must be a URI without whitespace";
  }
  return null;
}
function createSignInMessage(fields) {
  const err = signInFieldError(fields);
  if (err) throw new Error(`createSignInMessage: ${err}`);
  const lines = [
    `${fields.domain}${SIGN_IN_HEADER_SUFFIX}`,
    fields.address,
    ""
  ];
  if (fields.statement !== void 0) lines.push(fields.statement);
  lines.push("");
  lines.push(`URI: ${fields.uri}`);
  lines.push(`Version: ${SIGN_IN_VERSION}`);
  lines.push(`Chain ID: ${fields.chainId}`);
  lines.push(`Nonce: ${fields.nonce}`);
  lines.push(`Issued At: ${fields.issuedAt}`);
  if (fields.expirationTime !== void 0) lines.push(`Expiration Time: ${fields.expirationTime}`);
  if (fields.resources !== void 0) {
    lines.push("Resources:");
    for (const r of fields.resources) lines.push(`- ${r}`);
  }
  return lines.join("\n");
}
function parseSignInMessage(text) {
  try {
    if (typeof text !== "string" || text.length > 16384) return null;
    const lines = text.split("\n");
    if (lines.length < 9) return null;
    if (!lines[0].endsWith(SIGN_IN_HEADER_SUFFIX)) return null;
    const fields = {
      domain: lines[0].slice(0, -SIGN_IN_HEADER_SUFFIX.length),
      address: lines[1],
      uri: "",
      nonce: "",
      issuedAt: "",
      chainId: ""
    };
    if (lines[2] !== "") return null;
    let i = 3;
    if (lines[3] !== "") {
      fields.statement = lines[3];
      i = 4;
    }
    if (lines[i] !== "") return null;
    i++;
    const take = (label) => {
      const line = lines[i];
      if (line === void 0 || !line.startsWith(`${label}: `)) return null;
      i++;
      return line.slice(label.length + 2);
    };
    const uri = take("URI");
    const version = take("Version");
    const chainId = take("Chain ID");
    const nonce = take("Nonce");
    const issuedAt = take("Issued At");
    if (uri === null || version !== SIGN_IN_VERSION || chainId === null || nonce === null || issuedAt === null) return null;
    fields.uri = uri;
    fields.chainId = chainId;
    fields.nonce = nonce;
    fields.issuedAt = issuedAt;
    if (lines[i] !== void 0 && lines[i].startsWith("Expiration Time: ")) {
      fields.expirationTime = lines[i].slice("Expiration Time: ".length);
      i++;
    }
    if (lines[i] === "Resources:") {
      i++;
      fields.resources = [];
      while (lines[i] !== void 0 && lines[i].startsWith("- ")) {
        fields.resources.push(lines[i].slice(2));
        i++;
      }
    }
    if (i !== lines.length) return null;
    if (signInFieldError(fields)) return null;
    return createSignInMessage(fields) === text ? fields : null;
  } catch {
    return null;
  }
}
function claimedSignInDomain(text) {
  if (typeof text !== "string") return null;
  const first = text.split("\n", 1)[0].replace(/\r$/, "");
  if (!first.endsWith(SIGN_IN_HEADER_SUFFIX)) return null;
  return first.slice(0, -SIGN_IN_HEADER_SUFFIX.length);
}
async function verifySignIn(params) {
  const fail = (error) => ({ valid: false, error });
  try {
    if (!params || typeof params !== "object") return fail("malformed_message");
    const fields = parseSignInMessage(params.message);
    if (!fields) return fail("malformed_message");
    if (!verifyMessage(params.publicKey, params.message, params.signature)) return fail("invalid_signature");
    const address = await pubkeyToAddress(params.publicKey.toLowerCase());
    if (address !== fields.address) return fail("address_mismatch");
    if (typeof params.expectedDomain !== "string" || params.expectedDomain === "" || fields.domain.toLowerCase() !== params.expectedDomain.toLowerCase()) return fail("domain_mismatch");
    if (typeof params.expectedNonce !== "string" || fields.nonce !== params.expectedNonce) return fail("nonce_mismatch");
    if (typeof params.expectedChainId !== "string" || fields.chainId !== params.expectedChainId) return fail("chain_id_mismatch");
    const now = params.now instanceof Date ? params.now.getTime() : params.now ?? Date.now();
    if (typeof now !== "number" || !Number.isFinite(now)) return fail("malformed_message");
    const skew = params.maxClockSkewMs ?? 6e4;
    const issued = isoToMs(fields.issuedAt);
    if (issued > now + skew) return fail("issued_in_future");
    if (fields.expirationTime !== void 0 && now >= isoToMs(fields.expirationTime)) return fail("expired");
    if (params.maxAgeMs !== void 0 && now - issued > params.maxAgeMs) return fail("too_old");
    return { valid: true, address, publicKey: params.publicKey.toLowerCase(), fields };
  } catch {
    return fail("malformed_message");
  }
}
function looksLikeTransactionPayload(message) {
  if (typeof message !== "string") return false;
  const trimmed = message.replace(/^[\s\ufeff]+|[\s\ufeff]+$/g, "");
  if (!trimmed.startsWith("{")) return false;
  try {
    const v = JSON.parse(trimmed);
    if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
    const has = (k) => Object.prototype.hasOwnProperty.call(v, k);
    return has("type") || has("tx_type") || has("from") && has("timestamp");
  } catch {
    return false;
  }
}
function visibleMessageText(message) {
  let out = "";
  for (const ch of message) {
    const c = ch.codePointAt(0);
    if (c === 10) out += "\n";
    else if (c < 32) out += String.fromCharCode(9216 + c);
    else if (c === 127) out += "\u2421";
    else if (c >= 128 && c <= 159 || c === 173 || c === 1564 || c === 6158 || c >= 8203 && c <= 8207 || c >= 8232 && c <= 8238 || c >= 8288 && c <= 8303 || c === 65279 || c >= 65529 && c <= 65531 || c >= 917504 && c <= 917631) out += `\u27E8U+${c.toString(16).toUpperCase().padStart(4, "0")}\u27E9`;
    else out += ch;
  }
  return out;
}
var SIGN_MESSAGE_USE_SIGN_TRANSACTION_ERROR = "signMessage refuses a message that looks like a transaction payload. Use signTransaction to sign a transaction.";
function reviewSignMessageRequest(message, origin, walletAddress, now = Date.now()) {
  if (typeof message !== "string") return { error: "signMessage requires { message: string }" };
  if (message.length === 0) return { error: "signMessage requires a non-empty message" };
  if (!isWellFormedString(message)) return { error: "message is not well-formed Unicode" };
  const byteLength = utf8.encode(message).length;
  if (byteLength > MAX_SIGN_MESSAGE_BYTES) {
    return { error: `message is too long (${byteLength} bytes; the limit is ${MAX_SIGN_MESSAGE_BYTES})` };
  }
  if (looksLikeTransactionPayload(message)) return { error: SIGN_MESSAGE_USE_SIGN_TRANSACTION_ERROR };
  let originHost = "";
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    originHost = "";
  }
  const signIn = parseSignInMessage(message);
  const claimedDomain = signIn ? signIn.domain : claimedSignInDomain(message);
  const domainMismatch = claimedDomain !== null && (originHost === "" || claimedDomain.toLowerCase() !== originHost);
  const expiry = signIn?.expirationTime !== void 0 ? isoToMs(signIn.expirationTime) : NaN;
  return {
    message,
    display: visibleMessageText(message),
    byteLength,
    lineCount: message.split("\n").length,
    originHost,
    signIn,
    signInMalformed: signIn === null && claimedDomain !== null,
    domainMismatch,
    claimedDomain,
    addressMismatch: signIn !== null && walletAddress !== void 0 && signIn.address !== walletAddress,
    expired: !Number.isNaN(expiry) && now >= expiry
  };
}
var FINALITY_VOTE_DOMAIN_V2 = "ROUGECHAIN_FINALITY_VOTE_V2";
var FINALITY_ONLY_ROUND = 0;
var FINALITY_MAX_PROOF_VOTES = 1024;
var MAINNET_FINALITY_V2_HEIGHT = 150;
var JsonNumber = class {
  constructor(raw) {
    this.raw = raw;
  }
  toString() {
    return this.raw;
  }
};
var NUM_RE = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
function parseJsonLossless(text) {
  let i = 0;
  const ws = () => {
    while (i < text.length && (text[i] === " " || text[i] === "	" || text[i] === "\n" || text[i] === "\r")) i++;
  };
  const fail = (m) => {
    throw new Error(`JSON parse error at ${i}: ${m}`);
  };
  const str = () => {
    const start = i;
    i++;
    while (i < text.length) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        i++;
        return JSON.parse(text.slice(start, i));
      }
      if (c === 92) {
        i += 2;
        continue;
      }
      if (c < 32) fail("control character in string");
      i++;
    }
    return fail("unterminated string");
  };
  const val = (depth) => {
    if (depth > 256) fail("nesting too deep");
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      const o = /* @__PURE__ */ Object.create(null);
      ws();
      if (text[i] === "}") {
        i++;
        return o;
      }
      for (; ; ) {
        ws();
        if (text[i] !== '"') fail("expected key");
        const k = str();
        if (Object.prototype.hasOwnProperty.call(o, k)) fail(`duplicate key ${k}`);
        ws();
        if (text[i] !== ":") fail("expected ':'");
        i++;
        o[k] = val(depth + 1);
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return o;
        }
        fail("expected ',' or '}'");
      }
    }
    if (c === "[") {
      i++;
      const a = [];
      ws();
      if (text[i] === "]") {
        i++;
        return a;
      }
      for (; ; ) {
        a.push(val(depth + 1));
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return a;
        }
        fail("expected ',' or ']'");
      }
    }
    if (c === '"') return str();
    if (text.startsWith("true", i)) {
      i += 4;
      return true;
    }
    if (text.startsWith("false", i)) {
      i += 5;
      return false;
    }
    if (text.startsWith("null", i)) {
      i += 4;
      return null;
    }
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(text);
    if (!m) return fail("unexpected token");
    i += m[0].length;
    return new JsonNumber(m[0]);
  };
  const v = val(0);
  ws();
  if (i !== text.length) fail("trailing data");
  return v;
}
function stringifyLossless(v) {
  if (v === null) return "null";
  if (v instanceof JsonNumber) return v.raw;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stringifyLossless).join(",") + "]";
  return "{" + Object.keys(v).map((k) => JSON.stringify(k) + ":" + stringifyLossless(v[k])).join(",") + "}";
}
var EncodeError = class extends Error {
};
var bad = (m) => {
  throw new EncodeError(m);
};
var isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof JsonNumber);
function formatF64(x) {
  if (!Number.isFinite(x)) return bad("non-finite float");
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const sign = x < 0 ? "-" : "";
  const [mant, expStr] = Math.abs(x).toExponential().split("e");
  const digits = mant.replace(".", "");
  const e = parseInt(expStr, 10);
  const len = digits.length;
  if (e >= -5 && e <= 15) {
    if (len - 1 <= e) return sign + digits + "0".repeat(e - (len - 1)) + ".0";
    if (e >= 0) return sign + digits.slice(0, e + 1) + "." + digits.slice(e + 1);
    return sign + "0." + "0".repeat(-e - 1) + digits;
  }
  return sign + digits[0] + (len > 1 ? "." + digits.slice(1) : "") + "e" + (e < 0 ? "-" : "+") + Math.abs(e);
}
var U64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1);
var U128_MAX = (BigInt(1) << BigInt(128)) - BigInt(1);
var I64_MIN = -(BigInt(1) << BigInt(63));
function encUint(v, max, what) {
  if (!(v instanceof JsonNumber) || !/^(0|[1-9][0-9]*)$/.test(v.raw)) return bad(`${what}: not an unsigned integer`);
  if (BigInt(v.raw) > max) return bad(`${what}: out of range`);
  return v.raw;
}
function encF64(v, what) {
  if (!(v instanceof JsonNumber)) return bad(`${what}: not a number`);
  return formatF64(Number(v.raw));
}
function encStr(v, what) {
  if (typeof v !== "string") return bad(`${what}: not a string`);
  return JSON.stringify(v);
}
function encBool(v, what) {
  if (typeof v !== "boolean") return bad(`${what}: not a boolean`);
  return v ? "true" : "false";
}
function encValue(v) {
  if (v === null || typeof v === "boolean" || typeof v === "string") return stringifyLossless(v);
  if (v instanceof JsonNumber) {
    if (/^-?(0|[1-9][0-9]*)$/.test(v.raw) && v.raw !== "-0") {
      const n = BigInt(v.raw);
      if (n <= U64_MAX && n >= I64_MIN) return n.toString();
    }
    return formatF64(Number(v.raw));
  }
  if (Array.isArray(v)) return "[" + v.map(encValue).join(",") + "]";
  const keys = Object.keys(v).sort((a, b) => {
    const ca = Array.from(a), cb = Array.from(b);
    for (let k = 0; k < Math.min(ca.length, cb.length); k++) {
      const d = ca[k].codePointAt(0) - cb[k].codePointAt(0);
      if (d !== 0) return d;
    }
    return ca.length - cb.length;
  });
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + encValue(v[k])).join(",") + "}";
}
function encKind(kind, v, what) {
  switch (kind) {
    case "str":
      return encStr(v, what);
    case "u8":
      return encUint(v, BigInt(255), what);
    case "u16":
      return encUint(v, BigInt(65535), what);
    case "u32":
      return encUint(v, BigInt(4294967295), what);
    case "u64":
      return encUint(v, U64_MAX, what);
    case "u128":
      return encUint(v, U128_MAX, what);
    case "f64":
      return encF64(v, what);
    case "bool":
      return encBool(v, what);
    case "vstr":
      return Array.isArray(v) ? "[" + v.map((x, k) => encStr(x, `${what}[${k}]`)).join(",") + "]" : bad(`${what}: not an array`);
    case "vu64":
      return Array.isArray(v) ? "[" + v.map((x, k) => encUint(x, U64_MAX, `${what}[${k}]`)).join(",") + "]" : bad(`${what}: not an array`);
    case "value":
      return encValue(v);
    case "vvalue":
      return Array.isArray(v) ? "[" + v.map(encValue).join(",") + "]" : bad(`${what}: not an array`);
  }
}
function encStruct(v, fields, what) {
  if (!isObj(v)) return bad(`${what}: not an object`);
  const known = new Set(fields.map((f) => f[0]));
  for (const k of Object.keys(v)) if (!known.has(k)) bad(`${what}: unexpected field "${k}"`);
  const out = [];
  for (const [name, kind, mode] of fields) {
    const has = Object.prototype.hasOwnProperty.call(v, name);
    const x = has ? v[name] : void 0;
    if (mode === "req") {
      if (!has) bad(`${what}.${name}: missing`);
      out.push(JSON.stringify(name) + ":" + encKind(kind, x, `${what}.${name}`));
    } else if (x === void 0 || x === null) {
      if (mode === "null") out.push(JSON.stringify(name) + ":null");
    } else {
      out.push(JSON.stringify(name) + ":" + encKind(kind, x, `${what}.${name}`));
    }
  }
  return "{" + out.join(",") + "}";
}
var N = "null";
var S = "skip";
var R = "req";
var PAYLOAD_FIELDS = [
  ["to_pub_key_hex", "str", N],
  ["amount", "u64", N],
  ["faucet", "bool", N],
  ["target_pub_key", "str", N],
  ["reason", "str", N],
  ["token_name", "str", N],
  ["token_symbol", "str", N],
  ["token_decimals", "u8", N],
  ["token_total_supply", "u64", N],
  ["metadata_image", "str", N],
  ["metadata_description", "str", N],
  ["metadata_website", "str", N],
  ["metadata_twitter", "str", N],
  ["metadata_discord", "str", N],
  ["pool_id", "str", N],
  ["token_a_symbol", "str", N],
  ["token_b_symbol", "str", N],
  ["amount_a", "u64", N],
  ["amount_b", "u64", N],
  ["min_amount_out", "u64", N],
  ["swap_path", "vstr", N],
  ["lp_amount", "u64", N],
  ["evm_address", "str", N],
  ["nft_collection_symbol", "str", S],
  ["nft_collection_name", "str", S],
  ["nft_collection_id", "str", S],
  ["nft_description", "str", S],
  ["nft_image", "str", S],
  ["nft_max_supply", "u64", S],
  ["nft_royalty_bps", "u16", S],
  ["nft_royalty_recipient", "str", S],
  ["nft_token_id", "u64", S],
  ["nft_token_name", "str", S],
  ["nft_metadata_uri", "str", S],
  ["nft_attributes", "value", S],
  ["nft_locked", "bool", S],
  ["nft_public_mint", "bool", N],
  ["nft_mint_price", "f64", S],
  ["nft_token_gate_symbol", "str", S],
  ["nft_token_gate_amount", "f64", S],
  ["nft_discount_pct", "u32", S],
  ["nft_frozen", "bool", S],
  ["nft_batch_names", "vstr", S],
  ["nft_batch_uris", "vstr", S],
  ["nft_batch_attributes", "vvalue", S],
  ["shielded_nullifiers", "vstr", S],
  ["shielded_output_commitments", "vstr", S],
  ["shielded_proof", "str", S],
  ["shielded_fee", "u64", S],
  ["shielded_commitment", "str", S],
  ["shielded_value", "u64", S],
  ["shielded_randomness", "str", S],
  ["lock_until_height", "u64", S],
  ["lock_id", "str", S],
  ["staking_pool_id", "str", S],
  ["staking_reward_rate", "u64", S],
  ["proposal_id", "str", S],
  ["proposal_title", "str", S],
  ["proposal_description", "str", S],
  ["vote_option", "str", S],
  ["proposal_end_height", "u64", S],
  ["proposal_type", "str", S],
  ["proposal_action_payload", "value", S],
  ["proposal_quorum", "u64", S],
  ["proposal_timelock_blocks", "u64", S],
  ["delegate_to", "str", S],
  ["spender_pub_key", "str", S],
  ["allowance_amount", "u64", S],
  ["owner_pub_key", "str", S],
  ["airdrop_recipients", "vstr", S],
  ["airdrop_amounts", "vu64", S],
  ["contract_wasm", "str", S],
  ["contract_addr", "str", S],
  ["contract_method", "str", S],
  ["contract_args", "value", S],
  ["contract_gas_limit", "u64", S],
  ["contract_attach_symbol", "str", S],
  ["contract_attach_amount", "u64", S],
  ["multisig_wallet_id", "str", S],
  ["multisig_signers", "vstr", S],
  ["multisig_threshold", "u32", S],
  ["multisig_label", "str", S],
  ["multisig_proposal_id", "str", S],
  ["multisig_proposal_tx_type", "str", S],
  ["multisig_proposal_payload", "value", S],
  ["multisig_proposal_fee", "f64", S],
  ["multisig_approval_sig", "str", S],
  ["limit_order_id", "str", S],
  ["limit_order_expires", "u64", S],
  ["token_mintable", "bool", S],
  ["token_max_supply", "u64", S],
  ["shield_v2_body", "str", S],
  ["shield_v2_proof", "str", S]
];
var VOTE_FIELDS = [["vote_type", "str", R], ["height", "u64", R], ["round", "u32", R], ["block_hash", "str", R], ["voter_pub_key", "str", R], ["signature", "str", R]];
function encodeTxV1(tx) {
  if (!isObj(tx)) return bad("tx: not an object");
  const known = ["version", "tx_type", "from_pub_key", "nonce", "payload", "fee", "sig", "signed_payload"];
  for (const k of Object.keys(tx)) if (!known.includes(k)) bad(`tx: unexpected field "${k}"`);
  for (const k of known.slice(0, 7)) if (!(k in tx)) bad(`tx.${k}: missing`);
  let s = `{"version":${encUint(tx.version, BigInt(4294967295), "tx.version")},"tx_type":${encStr(tx.tx_type, "tx.tx_type")},"from_pub_key":${encStr(tx.from_pub_key, "tx.from_pub_key")},"nonce":${encUint(tx.nonce, U64_MAX, "tx.nonce")},"payload":${encStruct(tx.payload, PAYLOAD_FIELDS, "tx.payload")},"fee":${encF64(tx.fee, "tx.fee")},"sig":${encStr(tx.sig, "tx.sig")}`;
  if (tx.signed_payload !== void 0 && tx.signed_payload !== null) s += `,"signed_payload":${encStr(tx.signed_payload, "tx.signed_payload")}`;
  return s + "}";
}
function encodeFinalityProof(p) {
  if (!isObj(p)) return bad("parent_commit: not an object");
  const known = ["height", "block_hash", "total_stake", "voting_stake", "quorum_threshold", "precommit_votes", "created_at"];
  for (const k of Object.keys(p)) if (!known.includes(k)) bad(`parent_commit: unexpected field "${k}"`);
  for (const k of known) if (!(k in p)) bad(`parent_commit.${k}: missing`);
  if (!Array.isArray(p.precommit_votes)) return bad("parent_commit.precommit_votes: not an array");
  return `{"height":${encUint(p.height, U64_MAX, "parent_commit.height")},"block_hash":${encStr(p.block_hash, "parent_commit.block_hash")},"total_stake":${encUint(p.total_stake, U128_MAX, "parent_commit.total_stake")},"voting_stake":${encUint(p.voting_stake, U128_MAX, "parent_commit.voting_stake")},"quorum_threshold":${encUint(p.quorum_threshold, U128_MAX, "parent_commit.quorum_threshold")},"precommit_votes":[${p.precommit_votes.map((v, k) => encStruct(v, VOTE_FIELDS, `parent_commit.precommit_votes[${k}]`)).join(",")}],"created_at":${encUint(p.created_at, U64_MAX, "parent_commit.created_at")}}`;
}
function encodeHeaderV1(h) {
  if (!isObj(h)) return bad("header: not an object");
  const known = ["version", "chain_id", "height", "time", "prev_hash", "tx_hash", "proposer_pub_key", "state_root", "parent_commit"];
  for (const k of Object.keys(h)) if (!known.includes(k)) bad(`header: unexpected field "${k}"`);
  for (const k of known.slice(0, 7)) if (!(k in h)) bad(`header.${k}: missing`);
  let s = `{"version":${encUint(h.version, BigInt(4294967295), "header.version")},"chain_id":${encStr(h.chain_id, "header.chain_id")},"height":${encUint(h.height, U64_MAX, "header.height")},"time":${encUint(h.time, U64_MAX, "header.time")},"prev_hash":${encStr(h.prev_hash, "header.prev_hash")},"tx_hash":${encStr(h.tx_hash, "header.tx_hash")},"proposer_pub_key":${encStr(h.proposer_pub_key, "header.proposer_pub_key")}`;
  if (h.state_root !== void 0 && h.state_root !== null) s += `,"state_root":${encStr(h.state_root, "header.state_root")}`;
  if (h.parent_commit !== void 0 && h.parent_commit !== null) s += `,"parent_commit":${encodeFinalityProof(h.parent_commit)}`;
  return s + "}";
}
var utf82 = (s) => new TextEncoder().encode(s);
var toHex2 = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
function fromHex(h) {
  if (typeof h !== "string" || h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) return null;
  const out = new Uint8Array(h.length / 2);
  for (let k = 0; k < out.length; k++) out[k] = parseInt(h.slice(2 * k, 2 * k + 2), 16);
  return out;
}
var concat = (parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
var isHash = (s) => typeof s === "string" && /^[0-9a-f]{64}$/.test(s);
function computeSingleTxHash(tx) {
  return toHex2(sha256(utf82(encodeTxV1(tx))));
}
function computeTxListHash(txs) {
  return toHex2(sha256(concat(txs.map((t) => utf82(encodeTxV1(t))))));
}
function computeBlockHash(header, proposerSig) {
  return toHex2(sha256(concat([utf82(encodeHeaderV1(header)), utf82(proposerSig)])));
}
function voteSigningMessage(chainId, voteType, height, round, blockHash) {
  return `${FINALITY_VOTE_DOMAIN_V2}|chain=${chainId}|type=${voteType}|height=${height}|round=${round}|block=${blockHash}`;
}
function mlDsaVerify(pubHex, msg, sigHex) {
  const pk = fromHex(pubHex), sig = fromHex(sigHex);
  if (!pk || !sig || pk.length !== 1952 || sig.length !== 3309) return false;
  try {
    return ml_dsa65.verify(sig, msg, pk) === true;
  } catch {
    return false;
  }
}
var check = (checks, name, ok, detail, extra = {}) => {
  checks.push({ name, ok, critical: extra.critical ?? true, ...detail !== void 0 ? { detail } : {}, ...extra.node ? { node: extra.node } : {} });
  return ok;
};
function toStakeSet(entries, height) {
  const stakes = /* @__PURE__ */ new Map();
  for (const e of entries) {
    const s = BigInt(e.stake);
    if (s > BigInt(0)) stakes.set(e.publicKey, (stakes.get(e.publicKey) ?? BigInt(0)) + s);
  }
  let total = BigInt(0);
  for (const s of stakes.values()) total += s;
  return { stakes, total, quorum: total * BigInt(2) / BigInt(3) + BigInt(1), height };
}
function finalityQuorum(totalStake) {
  return totalStake * BigInt(2) / BigInt(3) + BigInt(1);
}
function verifyFinalityCertificate(cert, ctx) {
  const checks = [];
  const set = toStakeSet(ctx.validatorSet.validators, ctx.validatorSet.height);
  if (!isObj(cert)) {
    check(checks, "cert.shape", false, "certificate is not an object");
    return { ok: false, checks };
  }
  try {
    encodeFinalityProof(cert);
    check(checks, "cert.shape", true);
  } catch (e) {
    check(checks, "cert.shape", false, e.message);
    return { ok: false, checks };
  }
  const h = cert.height.raw;
  if (!check(checks, "cert.height", h === String(ctx.height), `certificate height ${h}, block height ${ctx.height}`)) return { ok: false, checks };
  if (!check(checks, "cert.block_hash", cert.block_hash === ctx.blockHash, `certificate is for ${String(cert.block_hash)}, block hash is ${ctx.blockHash}`)) return { ok: false, checks };
  if (!check(checks, "validator_set.nonempty", set.stakes.size > 0 && set.total > BigInt(0), `${set.stakes.size} validators, total stake ${set.total}`)) return { ok: false, checks };
  const votes = cert.precommit_votes;
  if (!check(checks, "cert.vote_count", votes.length <= FINALITY_MAX_PROOF_VOTES && votes.length <= set.stakes.size, `${votes.length} votes, ${set.stakes.size} validators`)) return { ok: false, checks };
  const voters = /* @__PURE__ */ new Set();
  let voting = BigInt(0);
  let allVotesOk = true;
  votes.forEach((raw, k) => {
    const v = raw;
    const who = typeof v.voter_pub_key === "string" ? v.voter_pub_key.slice(0, 16) : "?";
    const fail = (why) => {
      allVotesOk = false;
      check(checks, `cert.vote[${k}]`, false, `${who}\u2026: ${why}`);
    };
    if (v.vote_type !== "precommit") return fail("not a precommit");
    if (v.round.raw !== String(FINALITY_ONLY_ROUND)) return fail(`round ${v.round.raw}`);
    if (v.height.raw !== String(ctx.height)) return fail(`height ${v.height.raw}`);
    if (!isHash(v.block_hash) || v.block_hash !== ctx.blockHash) return fail("vote is for a different block hash");
    const pk = v.voter_pub_key;
    const stake = set.stakes.get(pk);
    if (stake === void 0) return fail("voter is not in the validator set");
    const msg = voteSigningMessage(ctx.chainId, "precommit", ctx.height, FINALITY_ONLY_ROUND, ctx.blockHash);
    if (!mlDsaVerify(pk, utf82(msg), v.signature)) return fail("ML-DSA-65 signature does not verify over the vote message");
    if (voters.has(pk)) return fail("duplicate voter");
    voters.add(pk);
    voting += stake;
    check(checks, `cert.vote[${k}]`, true, `${who}\u2026: signature valid, stake ${stake}`);
  });
  if (!allVotesOk) return { ok: false, checks };
  if (!check(checks, "cert.quorum", voting >= set.quorum, `voting stake ${voting} / quorum ${set.quorum} (total ${set.total})`)) return { ok: false, checks };
  const forHeight = set.height === ctx.height;
  const claims = [["voting_stake", voting], ["total_stake", set.total], ["quorum_threshold", set.quorum]];
  for (const [field, val] of claims) {
    const claimed = cert[field].raw;
    check(
      checks,
      `cert.claim.${field}`,
      claimed === val.toString(),
      claimed === val.toString() ? void 0 : `certificate claims ${claimed}, recomputed ${val}${forHeight ? "" : " (the set used is not declared to be the set for this height)"}`,
      { critical: forHeight }
    );
  }
  const critOk = checks.every((c) => c.ok || !c.critical);
  return { ok: critOk, checks, verified: critOk ? { height: ctx.height, blockHash: ctx.blockHash, votingStake: voting.toString(), totalStake: set.total.toString(), quorum: set.quorum.toString(), voters: [...voters] } : void 0 };
}
function apiBase(node) {
  const n = node.replace(/\/+$/, "");
  return /\/api$/.test(n) ? n : n + "/api";
}
async function getJson(net, url) {
  const ac = typeof AbortController !== "undefined" ? new AbortController() : void 0;
  const timer = ac ? setTimeout(() => ac.abort(), net.timeoutMs) : void 0;
  try {
    const res = await net.fetch(url, ac ? { signal: ac.signal } : void 0);
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    return { ok: true, body: parseJsonLossless(text) };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
var defaultFetch = () => {
  if (typeof fetch !== "function") throw new Error("no global fetch: pass options.fetch");
  return fetch;
};
function verifyBlock(raw, opts) {
  const checks = [];
  const node = opts.node;
  if (!isObj(raw) || !isObj(raw.header) || !Array.isArray(raw.txs) || typeof raw.proposer_sig !== "string") {
    check(checks, "block.shape", false, "not a BlockV1 {version, header, txs, proposer_sig, hash}", { node });
    return { ok: false, block: null, checks };
  }
  const header = raw.header;
  let headerBytes;
  let txHashes;
  try {
    headerBytes = encodeHeaderV1(header);
    txHashes = raw.txs.map((t) => computeSingleTxHash(t));
    check(checks, "block.shape", true, void 0, { node });
  } catch (e) {
    check(checks, "block.shape", false, e.message, { node });
    return { ok: false, block: null, checks };
  }
  const height = Number(header.height.raw);
  if (opts.height !== void 0 && !check(checks, "block.height", height === opts.height, `served height ${height}, requested ${opts.height}`, { node })) return { ok: false, block: null, checks };
  check(checks, "block.chain_id", header.chain_id === opts.chainId, `header chain_id ${JSON.stringify(header.chain_id)}, expected ${JSON.stringify(opts.chainId)}`, { node });
  const recomputedTxHash = computeTxListHash(raw.txs);
  check(checks, "block.tx_hash", recomputedTxHash === header.tx_hash, `recomputed ${recomputedTxHash} from ${raw.txs.length} transaction(s), header says ${String(header.tx_hash)}`, { node });
  const blockHash = toHex2(sha256(concat([utf82(headerBytes), utf82(raw.proposer_sig)])));
  check(checks, "block.hash", blockHash === raw.hash, `recomputed ${blockHash}, node says ${String(raw.hash)}`, { node });
  const proposer = header.proposer_pub_key;
  check(checks, "block.proposer_signature", mlDsaVerify(proposer, utf82(headerBytes), raw.proposer_sig), "ML-DSA-65 signature of header.proposer_pub_key over the serialized header", { node });
  const ok = checks.every((c) => c.ok || !c.critical);
  return { ok, block: ok ? { height, blockHash, chainId: opts.chainId, proposer, txHashes, raw } : null, checks };
}
async function fetchAndVerifyBlock(height, options) {
  const net = { fetch: options.fetch ?? defaultFetch(), timeoutMs: options.timeoutMs ?? 15e3 };
  const node = apiBase(options.node);
  const checks = [];
  const r = await getJson(net, `${node}/blocks?from_height=${height}&limit=2`);
  const blocks = r.ok && isObj(r.body) && Array.isArray(r.body.blocks) ? r.body.blocks : null;
  const first = blocks && blocks.length > 0 ? blocks[0] : void 0;
  if (!check(checks, "block.fetch", !!first, !r.ok ? r.error : first ? void 0 : `no block at height ${height}`, { node })) return { ok: false, block: null, next: null, checks };
  const v = verifyBlock(first, { chainId: options.chainId, height, node });
  checks.push(...v.checks);
  let next = null;
  const second = blocks && blocks.length > 1 ? blocks[1] : void 0;
  if (isObj(second) && isObj(second.header) && second.header.height instanceof JsonNumber && second.header.height.raw === String(height + 1)) next = second;
  return { ok: v.ok, block: v.block, next, checks };
}
async function verifyTxFinalized(options) {
  const checks = [];
  const net = { fetch: options.fetch ?? defaultFetch(), timeoutMs: options.timeoutMs ?? 15e3 };
  const trust = options.trustedValidatorSet ? "pinned validator set" : "node-reported validator set";
  const result = (status, extra = {}) => ({
    status,
    height: null,
    blockHash: null,
    txIndex: null,
    trust,
    proof: null,
    outcome: { source: "node receipt", verified: false, value: null },
    checks,
    ...extra
  });
  const txHash = typeof options.txHash === "string" ? options.txHash.toLowerCase() : "";
  const nodes = Array.from(new Set((options.nodes ?? []).map(apiBase)));
  if (!check(
    checks,
    "input",
    isHash(txHash) && nodes.length > 0 && typeof options.chainId === "string" && options.chainId.length > 0,
    "txHash must be 64 hex characters; at least one node and a chainId are required"
  )) return result("invalid");
  let hint = null;
  let hintNode = null;
  let receipt = null;
  for (const node of nodes) {
    const r = await getJson(net, `${node}/tx/${txHash}`);
    if (r.ok && isObj(r.body) && r.body.success === true && r.body.blockHeight instanceof JsonNumber) {
      hint = Number(r.body.blockHeight.raw);
      hintNode = node;
      receipt = isObj(r.body.receipt) ? r.body.receipt : null;
      break;
    }
  }
  const outcomeValue = isObj(receipt) && receipt.status !== void 0 ? receipt.status : null;
  const outcome = { source: "node receipt", verified: false, value: outcomeValue };
  if (!check(checks, "tx.lookup", hint !== null, hint !== null ? `node reports height ${hint} (hint only)` : "no node reports this transaction", { node: hintNode ?? void 0 }))
    return result("not-found", { outcome });
  let fb = null;
  let primary = hintNode;
  for (const node of [hintNode, ...nodes.filter((n) => n !== hintNode)]) {
    const r = await fetchAndVerifyBlock(hint, { node, chainId: options.chainId, fetch: net.fetch, timeoutMs: net.timeoutMs });
    checks.push(...r.checks);
    if (r.checks.some((c) => c.name === "block.fetch" && c.ok)) {
      fb = r;
      primary = node;
      break;
    }
  }
  const base = { outcome, height: hint };
  if (!fb) return result("not-found", base);
  if (!fb.ok || !fb.block) return result("invalid", base);
  const block = fb.block;
  const txIndex = block.txHashes.indexOf(txHash);
  const header = block.raw.header;
  const withBlock = { ...base, height: block.height, blockHash: block.blockHash };
  if (!check(checks, "tx.in_block", txIndex >= 0, txIndex >= 0 ? `transaction ${txIndex} of ${block.txHashes.length} (hash recomputed)` : `none of the ${block.txHashes.length} transaction(s) in block ${block.height} hashes to ${txHash}`, { node: primary }))
    return result("not-found", withBlock);
  const withTx = { ...withBlock, txIndex };
  let vset = options.trustedValidatorSet ?? null;
  if (vset) {
    check(checks, "validator_set", true, `pinned: ${vset.validators.length} validator(s)${vset.height !== void 0 ? ` for height ${vset.height}` : ""}`);
  } else {
    const r = await getJson(net, `${primary}/validators`);
    const list = r.ok && isObj(r.body) && Array.isArray(r.body.validators) ? r.body.validators : null;
    if (list) {
      vset = { validators: list.filter((v) => isObj(v) && v.status === "active" && typeof v.publicKey === "string" && v.stake instanceof JsonNumber).map((v) => {
        const o = v;
        return { publicKey: o.publicKey, stake: BigInt(o.stake.raw) };
      }) };
    }
    check(checks, "validator_set", !!vset, vset ? `node-reported CURRENT set from ${primary}: ${vset.validators.length} active validator(s). The node does not expose the set for a past height; this result trusts the node for the set.` : `could not fetch /validators: ${!r.ok ? r.error : "bad response"}`, { node: primary });
  }
  if (vset) {
    const inSet = vset.validators.some((v) => v.publicKey === block.proposer);
    check(checks, "block.proposer_in_set", inSet, inSet ? "the proposer is in the validator set used" : "the proposer is not in the validator set used", { critical: false });
  }
  let cert = null;
  let certSource = null;
  if (fb.next && isObj(fb.next.header) && isObj(fb.next.header.parent_commit)) {
    cert = fb.next.header.parent_commit;
    certSource = "parent_commit of the next block";
  } else {
    for (const node of [primary, ...nodes.filter((n) => n !== primary)]) {
      const r = await getJson(net, `${node}/finality/${block.height}`);
      if (r.ok && isObj(r.body) && r.body.success === true && isObj(r.body.proof)) {
        cert = r.body.proof;
        certSource = "/api/finality/:height";
        break;
      }
    }
  }
  let verifiedCert = null;
  const proofOf = () => ({
    chainId: options.chainId,
    header: { height: block.height, time: header.time.raw, prevHash: header.prev_hash, txHash: header.tx_hash, stateRoot: typeof header.state_root === "string" ? header.state_root : null, proposer: block.proposer },
    certificateSource: certSource,
    certificate: verifiedCert,
    validatorSetSource: trust,
    nodesAgreeing
  });
  const nodesAgreeing = [primary];
  if (!cert) {
    check(checks, "finality.certificate", false, `no finality certificate for height ${block.height} yet${options.chainId === "rougechain-mainnet-1" && block.height < MAINNET_FINALITY_V2_HEIGHT ? ` (FINALITY_V2 starts at mainnet height ${MAINNET_FINALITY_V2_HEIGHT})` : ""}`);
    return result("included-not-finalized", { ...withTx, proof: proofOf() });
  }
  check(checks, "finality.certificate", true, `from ${certSource}`);
  if (!vset) return result("included-not-finalized", { ...withTx, proof: proofOf() });
  const cv = verifyFinalityCertificate(cert, { chainId: options.chainId, height: block.height, blockHash: block.blockHash, validatorSet: vset });
  checks.push(...cv.checks);
  if (!cv.ok) return result("invalid", { ...withTx, proof: proofOf() });
  verifiedCert = cv.verified;
  let conflict = false;
  let answered = 1;
  for (const node of nodes) {
    if (node === primary) continue;
    const r = await getJson(net, `${node}/blocks?from_height=${block.height}&limit=1`);
    const b = r.ok && isObj(r.body) && Array.isArray(r.body.blocks) && r.body.blocks.length > 0 ? r.body.blocks[0] : null;
    if (!isObj(b) || !isObj(b.header) || !(b.header.height instanceof JsonNumber) || b.header.height.raw !== String(block.height) || typeof b.proposer_sig !== "string") {
      check(checks, "nodes.answer", false, !r.ok ? r.error : `no block at height ${block.height}`, { node, critical: false });
      continue;
    }
    answered++;
    let theirs;
    try {
      theirs = computeBlockHash(b.header, b.proposer_sig);
    } catch (e) {
      theirs = `unencodable (${e.message})`;
    }
    if (theirs === block.blockHash) {
      nodesAgreeing.push(node);
      check(checks, "nodes.same_block", true, `recomputed ${theirs}`, { node });
    } else {
      conflict = true;
      check(checks, "nodes.same_block", false, `serves a different block at height ${block.height}: recomputed ${theirs}, expected ${block.blockHash}`, { node });
    }
  }
  const majority = Math.floor(nodes.length / 2) + 1;
  if (conflict) return result("invalid", { ...withTx, proof: proofOf() });
  if (!check(
    checks,
    "nodes.majority",
    nodesAgreeing.length >= majority,
    `${nodesAgreeing.length} of ${nodes.length} node(s) serve this block (${answered} answered, need ${majority})${nodes.length === 1 ? "; a single node is not cross-checked" : ""}`
  ))
    return result("included-not-finalized", { ...withTx, proof: proofOf() });
  const minConf = options.minConfirmations ?? 1;
  if (minConf > 1) {
    const r = await getJson(net, `${primary}/stats`);
    const tip = r.ok && isObj(r.body) && r.body.network_height instanceof JsonNumber ? Number(r.body.network_height.raw) : null;
    const conf = tip === null ? 0 : tip - block.height + 1;
    if (!check(checks, "confirmations", conf >= minConf, tip === null ? "could not read the tip height" : `${conf} confirmation(s) (tip ${tip}), required ${minConf}`, { node: primary }))
      return result("included-not-finalized", { ...withTx, proof: proofOf() });
  }
  return result("finalized", { ...withTx, proof: proofOf() });
}

export { BURN_ADDRESS, CONTRACT_DEPLOY_FEE_XRGE, CONTRACT_GAS_PRICE_XRGE, CONTRACT_MAX_GAS, ChainIdMismatchError, ContractsClient, FINALITY_MAX_PROOF_VOTES, FINALITY_ONLY_ROUND, FINALITY_VOTE_DOMAIN_V2, JsonNumber, MAINNET_CHAIN_ID, MAINNET_FINALITY_V2_HEIGHT, MAX_SIGN_MESSAGE_BYTES, ML_DSA_65_PUBLIC_KEY_BYTES, ML_DSA_65_SIGNATURE_BYTES, QUANTA_PER_XRGE, RougeChain, SIGNED_MESSAGE_PREFIX, SIGN_IN_MIN_NONCE_LENGTH, TESTNET_CHAIN_ID, TOKEN_CREATE_FEE_XRGE, TOKEN_MINT_FEE_XRGE, TOKEN_MINT_MAX_AMOUNT, Wallet, addressToHash, applyChainId, base64ToBytes, bindWalletToChain, bytesToBase64, bytesToHex, claimedSignInDomain, computeBlockHash, computeCommitment, computeNullifier, computeSingleTxHash, computeTxListHash, contractCallFee, createShieldedNote, createSignInMessage, createSignedBridgeWithdraw, createSignedContractCall, createSignedContractPublish, createSignedShield, createSignedShieldedTransfer, createSignedTokenApproval, createSignedTokenCreation, createSignedTokenMetadataClaim, createSignedTokenMetadataUpdate, createSignedTokenMint, createSignedTokenTransferFrom, createSignedTransfer, createSignedUnshield, encodeFinalityProof, encodeHeaderV1, encodeTxV1, fetchAndVerifyBlock, finalityQuorum, formatAddress, formatF64, generateMnemonic, generateNonce, generateRandomness, hexToBytes, isBurnAddress, isRougeAddress, keypairFromMnemonic, looksLikeTransactionPayload, messageSigningBytes, mnemonicToMLDSASeed, normalizeContractAttach, parseJsonLossless, parseSignInMessage, predictContractAddress, pubkeyToAddress, quantaToXrge, reviewSignMessageRequest, serializePayload, signMessage, signRequest, signTransaction, stringifyLossless, suggestGasLimit, tokenMintFields, tokenMintingActive, validateMnemonic, verifyBlock, verifyFinalityCertificate, verifyMessage, verifySignIn, verifyTransaction, verifyTxFinalized, visibleMessageText, voteSigningMessage, xrgeToQuanta };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map