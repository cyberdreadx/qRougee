// Royalty splitter — RougeChain v2 on-chain royalty distribution for qRougee.
//
// Before v2, royalty payees were app-side metadata: royalties went to a single
// recipient and splitting was off-chain/manual. v2 contract XRGE custody lets a
// WASM contract *hold* royalties and fan them to collaborators on-chain. This
// module generates a per-collection splitter, deploys it, and triggers payouts.
//
// The VM has no call-args ABI, so payees are baked into the contract at build
// time. The browser can't compile Rust, so we generate WebAssembly Text (WAT)
// with the payees templated in and assemble it to wasm via `wabt` (lazy-loaded).
// The math mirrors contracts/royalty_splitter (integer quanta, single-hop,
// conserving): each payee gets floor(balance * weight / total); dust stays.

export interface Payee {
  /** Recipient public key / address exactly as it keys the on-chain ledger. */
  address: string;
  /** Relative weight (e.g. a percentage). Need not sum to any round number. */
  weight: number;
}

const SELF_BUF = 0; // memory offset for this contract's own address (<= 64 bytes)
const DATA_START = 128; // recipient strings start here, past the self-addr buffer

/** UTF-8 byte length of a string (addresses are ASCII hex, but be exact). */
function byteLen(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Escape a string for a WAT `(data ...)` literal. */
function watString(s: string): string {
  let out = '';
  for (const b of new TextEncoder().encode(s)) {
    out += b === 0x22 || b === 0x5c ? `\\${String.fromCharCode(b)}` : `\\${b.toString(16).padStart(2, '0')}`;
  }
  return out;
}

/**
 * Generate the splitter contract as WAT for the given payees. Weights are
 * integers; `total = sum(weights)`. Overflow-safe i64 math:
 * `cut = (b/total)*w + ((b%total)*w)/total`.
 */
export function buildSplitterWat(payees: Payee[]): string {
  if (payees.length === 0) throw new Error('at least one payee required');
  const weights = payees.map((p) => Math.trunc(p.weight));
  if (weights.some((w) => w <= 0)) throw new Error('weights must be positive');
  const total = weights.reduce((a, b) => a + b, 0);

  // Lay out recipient strings in memory, tracking (offset, len).
  let offset = DATA_START;
  const slots = payees.map((p) => {
    const len = byteLen(p.address);
    const slot = { off: offset, len };
    offset += len + 8 - (len % 8 || 8); // 8-byte align
    return slot;
  });
  const memBytes = offset;
  const pages = Math.max(1, Math.ceil(memBytes / 65536));

  const dataSegs = payees
    .map((p, i) => `  (data (i32.const ${slots[i].off}) "${watString(p.address)}")`)
    .join('\n');

  const transfers = payees
    .map((_, i) => {
      const w = weights[i];
      const { off, len } = slots[i];
      // cut = q*w + (r*w)/total
      return `    (drop (call $tr (i32.const ${off}) (i32.const ${len})
      (i64.add (i64.mul (local.get $q) (i64.const ${w}))
               (i64.div_s (i64.mul (local.get $r) (i64.const ${w})) (i64.const ${total})))))`;
    })
    .join('\n');

  return `(module
  (import "env" "host_get_self_addr" (func $self (param i32 i32) (result i32)))
  (import "env" "host_get_balance"   (func $bal  (param i32 i32) (result i64)))
  (import "env" "host_transfer"      (func $tr   (param i32 i32 i64) (result i32)))
  (memory (export "memory") ${pages})
${dataSegs}
  (func (export "split")
    (local $len i32) (local $b i64) (local $q i64) (local $r i64)
    (local.set $len (call $self (i32.const ${SELF_BUF}) (i32.const 64)))
    (local.set $b (call $bal (i32.const ${SELF_BUF}) (local.get $len)))
    (if (i64.le_s (local.get $b) (i64.const 0)) (then (return)))
    (local.set $q (i64.div_s (local.get $b) (i64.const ${total})))
    (local.set $r (i64.rem_s (local.get $b) (i64.const ${total})))
${transfers}
  ))`;
}

/** Assemble WAT to a wasm binary using wabt (lazy-loaded to keep it off the main bundle). */
export async function compileWat(wat: string): Promise<Uint8Array> {
  const wabtFactory = (await import('wabt')).default;
  const wabt = await wabtFactory();
  const mod = wabt.parseWat('royalty_splitter.wat', wat, { mutable_globals: true });
  const { buffer } = mod.toBinary({});
  mod.destroy();
  return buffer;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Compile + deploy a splitter for `payees`. Returns the deployed contract
 * address — use it as the NFT `royaltyRecipient`. Deploy is node-signed (no
 * wallet signature needed).
 */
export async function deploySplitter(
  apiBase: string,
  deployer: string,
  payees: Payee[],
  nonce = Math.floor(Date.now() / 1000),
): Promise<{ address: string; wasmSize: number }> {
  const wasm = await compileWat(buildSplitterWat(payees));
  const res = await fetch(`${apiBase}/v2/contract/deploy`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wasm: toBase64(wasm), deployer, nonce }),
  });
  const json = await res.json();
  if (!res.ok || !json.address) throw new Error(json.error || 'contract deploy failed');
  return { address: json.address as string, wasmSize: wasm.length };
}

/**
 * Trigger a payout: call `split` on a deployed splitter, distributing its
 * accrued XRGE balance to the baked-in payees on-chain.
 */
export async function distribute(
  apiBase: string,
  contractAddr: string,
  caller: string,
): Promise<{ success: boolean; gasUsed?: number; error?: string }> {
  const res = await fetch(`${apiBase}/v2/contract/call`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contractAddr, method: 'split', caller, args: {} }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'split call failed');
  return { success: !!json.success, gasUsed: json.gasUsed, error: json.error };
}
