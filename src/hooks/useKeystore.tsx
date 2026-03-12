import type { WalletKeys } from '@rougechain/sdk';

/**
 * Encrypted keystore utilities using Web Crypto API (PBKDF2 + AES-GCM).
 * Private keys are NEVER stored in plaintext — they are either in memory
 * or encrypted with a user-provided passphrase.
 */

interface KeystoreFile {
    version: 1;
    salt: string;      // hex
    iv: string;         // hex
    ciphertext: string; // hex
    pubkey: string;     // plaintext public key for identification
}

function hexEncode(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexDecode(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: 600_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt wallet keys with a passphrase and trigger a file download.
 */
export async function exportKeystore(wallet: WalletKeys, passphrase: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);

    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify({
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
    }));

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintext
    );

    const keystore: KeystoreFile = {
        version: 1,
        salt: hexEncode(salt.buffer as ArrayBuffer),
        iv: hexEncode(iv.buffer as ArrayBuffer),
        ciphertext: hexEncode(ciphertext),
        pubkey: wallet.publicKey,
    };

    // Trigger download
    const blob = new Blob([JSON.stringify(keystore, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrougee-keystore-${wallet.publicKey.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Decrypt a keystore file with a passphrase and return the wallet keys.
 * Throws if the passphrase is wrong or the file is corrupted.
 */
export async function importKeystore(file: File, passphrase: string): Promise<WalletKeys> {
    const text = await file.text();
    const keystore: KeystoreFile = JSON.parse(text);

    if (keystore.version !== 1) {
        throw new Error('Unsupported keystore version');
    }

    const salt = hexDecode(keystore.salt);
    const iv = hexDecode(keystore.iv);
    const ciphertext = hexDecode(keystore.ciphertext);

    const key = await deriveKey(passphrase, salt);

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        ciphertext.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    const keys: WalletKeys = JSON.parse(decoder.decode(plaintext));
    return keys;
}
