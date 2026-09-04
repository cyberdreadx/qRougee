/**
 * Secure session storage for the wallet's raw private key.
 *
 * Threat model: an XSS payload (or a compromised dependency) that scrapes web
 * storage and beacons it out. Previously the raw private key + mnemonic sat in
 * sessionStorage as plaintext JSON, so a single storage dump leaked everything.
 *
 * Mitigation: the key blob is encrypted with a NON-EXTRACTABLE AES-GCM CryptoKey
 * that lives in IndexedDB. Because the key is generated with `extractable=false`,
 * its raw bytes can never be read back out by script — so a storage dump yields
 * only ciphertext, and even reading the IndexedDB entry gives an opaque key
 * handle, not key material. The ciphertext stays in sessionStorage, preserving
 * the existing "auto-clears when the tab closes" property.
 *
 * Honest limits: this does NOT stop active in-page code that deliberately calls
 * crypto.subtle.decrypt() with the IndexedDB key handle — an attacker running
 * script in the page at the moment of use can still get the plaintext. What it
 * defeats is the common "exfiltrate all of localStorage/sessionStorage" class of
 * attack, and it keeps raw key material out of readable storage. It is a
 * mitigation, not a substitute for preventing XSS. For durable at-rest
 * protection across machines, users export a passphrase-encrypted keystore
 * (see useKeystore).
 */

import type { WalletKeys } from '@rougechain/sdk';

const DB_NAME = 'qrougee-secure';
const STORE = 'wrapkeys';
const WRAP_ID = 'session-wrap-key';

// sessionStorage keys: CT_KEY holds the encrypted blob; LEGACY_KEY is the old
// plaintext location, read once for migration and used as a last-resort fallback
// when the Web Crypto / IndexedDB path is unavailable.
const CT_KEY = 'qrougee_session_ct';
const LEGACY_KEY = 'qrougee_session_keys';

// ── IndexedDB (tiny promise wrapper, no dependency) ───────────────────
function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE)) {
                req.result.createObjectStore(STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbGet<T>(key: string): Promise<T | undefined> {
    return openDb().then(db => new Promise<T | undefined>((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
    }));
}

function idbPut(key: string, value: unknown): Promise<void> {
    return openDb().then(db => new Promise<void>((resolve, reject) => {
        const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

function idbDelete(key: string): Promise<void> {
    return openDb().then(db => new Promise<void>((resolve, reject) => {
        const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

// ── Wrap key ──────────────────────────────────────────────────────────
// Reuses an existing non-extractable AES-GCM key if one is stored, otherwise
// generates and persists one. Storing a CryptoKey via structured clone keeps it
// non-extractable — the raw bytes are never exposed to JS.
async function getWrapKey(): Promise<CryptoKey> {
    const existing = await idbGet<CryptoKey>(WRAP_ID);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false, // non-extractable
        ['encrypt', 'decrypt'],
    );
    await idbPut(WRAP_ID, key);
    return key;
}

// ── base64 helpers ────────────────────────────────────────────────────
function toB64(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s: string): Uint8Array<ArrayBuffer> {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function secureAvailable(): boolean {
    return typeof indexedDB !== 'undefined'
        && typeof crypto !== 'undefined'
        && !!crypto.subtle;
}

// ── Public API ────────────────────────────────────────────────────────

/** Encrypt and persist the wallet keys for the life of the tab. */
export async function secureSet(keys: WalletKeys): Promise<void> {
    const json = JSON.stringify(keys);
    if (secureAvailable()) {
        try {
            const wrapKey = await getWrapKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ct = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                wrapKey,
                new TextEncoder().encode(json),
            );
            sessionStorage.setItem(CT_KEY, JSON.stringify({ iv: toB64(iv.buffer), ct: toB64(ct) }));
            sessionStorage.removeItem(LEGACY_KEY); // never leave a plaintext copy behind
            return;
        } catch (e) {
            console.warn('[secureSession] encrypted storage failed, falling back to plaintext', e);
        }
    }
    // Fallback: crypto/IndexedDB genuinely unavailable. Keep the wallet working,
    // but this path is as exposed as the old behavior — real (HTTPS) deployments
    // never hit it.
    sessionStorage.setItem(LEGACY_KEY, json);
}

/** Decrypt and return the wallet keys stored for this tab, or null. */
export async function secureGet(): Promise<WalletKeys | null> {
    const raw = sessionStorage.getItem(CT_KEY);
    if (raw && secureAvailable()) {
        try {
            const { iv, ct } = JSON.parse(raw) as { iv: string; ct: string };
            const wrapKey = await getWrapKey();
            const pt = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: fromB64(iv) },
                wrapKey,
                fromB64(ct),
            );
            const keys = JSON.parse(new TextDecoder().decode(pt)) as WalletKeys;
            return keys.publicKey ? keys : null;
        } catch (e) {
            console.warn('[secureSession] failed to decrypt session key', e);
            // fall through to legacy check
        }
    }
    // Legacy plaintext (older sessions, or the no-crypto fallback above).
    const legacy = sessionStorage.getItem(LEGACY_KEY);
    if (legacy) {
        try {
            const keys = JSON.parse(legacy) as WalletKeys;
            return keys.publicKey ? keys : null;
        } catch {
            return null;
        }
    }
    return null;
}

/** Wipe all stored session key material (ciphertext, legacy blob, wrap key). */
export async function secureClear(): Promise<void> {
    try { sessionStorage.removeItem(CT_KEY); } catch { /* ignore */ }
    try { sessionStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
    try { await idbDelete(WRAP_ID); } catch { /* ignore */ }
}
