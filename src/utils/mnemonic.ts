/**
 * BIP-39 Mnemonic Seed Phrase for RougeChain ML-DSA-65 Wallets
 *
 * Uses the same derivation as the SDK source (sdk/src/mnemonic.ts):
 *   Mnemonic → PBKDF2 (BIP-39) → 512-bit seed
 *   → HKDF-SHA256(seed, info="rougechain-ml-dsa-65-v1") → 32-byte seed
 *   → ml_dsa65.keygen(seed) → deterministic keypair
 */

import { generateMnemonic as _gen, mnemonicToSeedSync, validateMnemonic as _val } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { bytesToHex } from '@rougechain/sdk';

const DOMAIN = new TextEncoder().encode('rougechain-ml-dsa-65-v1');

export function generateMnemonic(strength: 128 | 256 = 128): string {
  return _gen(wordlist, strength);
}

export function validateMnemonic(m: string): boolean {
  return _val(m, wordlist);
}

export function keypairFromMnemonic(
  mnemonic: string,
  passphrase?: string,
): { publicKey: string; privateKey: string } {
  if (!validateMnemonic(mnemonic)) throw new Error('Invalid mnemonic');
  const bip39Seed = mnemonicToSeedSync(mnemonic, passphrase);
  const seed = hkdf(sha256, bip39Seed, undefined, DOMAIN, 32);
  const kp = ml_dsa65.keygen(seed);
  return { publicKey: bytesToHex(kp.publicKey), privateKey: bytesToHex(kp.secretKey) };
}
