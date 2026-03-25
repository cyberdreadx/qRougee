/**
 * RougeChain Bech32m Address System
 *
 * Derives compact, human-readable addresses from PQC public keys:
 *   address = bech32m("rouge", SHA-256(raw_pubkey_bytes))
 *
 * Result: ~63-char address like "rouge1q8f3x7k2m4n9p..."
 * vs the raw 3904-char hex public key.
 *
 * Matches the Rust implementation in core/crypto/src/lib.rs exactly.
 */

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32M_CONST = 0x2bc830a3;
const HRP = "rouge";

function hrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
}

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function createChecksum(hrp: string, data: number[]): number[] {
  const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const pm = polymod(values) ^ BECH32M_CONST;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) ret.push((pm >> (5 * (5 - i))) & 31);
  return ret;
}

function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  }
  return ret;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bech32mEncode(hrp: string, data: Uint8Array): string {
  const data5bit = convertBits(data, 8, 5, true);
  const checksum = createChecksum(hrp, data5bit);
  const combined = data5bit.concat(checksum);
  let result = hrp + "1";
  for (const d of combined) result += CHARSET[d];
  return result;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash);
}

/**
 * Derive a compact Bech32m address from an ML-DSA-65 public key (hex).
 * Returns a ~63-character string like "rouge1q8f3x7k2m4n9p..."
 */
export async function pubkeyToAddress(publicKeyHex: string): Promise<string> {
  const pkBytes = hexToBytes(publicKeyHex);
  const hash = await sha256(pkBytes);
  return bech32mEncode(HRP, hash);
}

/**
 * Check if a string is a valid RougeChain Bech32m address.
 */
export function isRougeAddress(input: string): boolean {
  return input.toLowerCase().startsWith("rouge1") && input.length > 10;
}

/**
 * Format a rouge1 address for compact display: "rouge1q8f3...k9m2"
 */
export function formatAddress(address: string, prefixLen = 12, suffixLen = 4): string {
  if (address.length <= prefixLen + suffixLen + 3) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}
