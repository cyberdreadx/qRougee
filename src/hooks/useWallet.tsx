import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type WalletKeys } from '@rougechain/sdk';
import { useRougeChain } from './useRougeChain';
import { pubkeyToAddress, formatAddress } from '../utils/address';
import { generateMnemonic, validateMnemonic, keypairFromMnemonic } from '../utils/mnemonic';
import { secureSet, secureGet, secureClear } from '../utils/secureSession';

interface WalletState {
    publicKey: string | null;
    /** rouge1... bech32m address derived from pubkey */
    address: string | null;
    /** 12-word BIP-39 mnemonic (only available for wallets created via New Wallet) */
    mnemonic: string | null;
    balance: string;
    isConnected: boolean;
    isLoading: boolean;
    /** Last connect/extension error surfaced to the UI (null when none) */
    connectError: string | null;
}

interface WalletContextType extends WalletState {
    /** Full wallet keys for signing — stored in sessionStorage (survives refresh, clears on tab close) */
    walletKeys: WalletKeys | null;
    /** Whether the RougeChain Wallet browser extension is detected */
    extensionDetected: boolean;
    /** Whether the current wallet is connected via extension (read-only, signing via extension) */
    isExtensionWallet: boolean;
    /**
     * Sign a transaction payload via the extension provider.
     * Returns the signed result, or throws if extension is unavailable.
     */
    signViaExtension: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
    connect: () => Promise<void>;
    connectExtension: () => Promise<void>;
    connectFromKeys: (keys: WalletKeys) => Promise<void>;
    connectFromMnemonic: (mnemonic: string) => Promise<void>;
    disconnect: () => void;
    requestFaucet: () => Promise<void>;
    refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

/** The wallet provider the extension / Qwalla dApp browser injects on window. */
interface InjectedProvider {
    isRougeChain?: boolean;
    connect(): Promise<{ publicKey: string }>;
    signTransaction?: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
    signAndSendTransaction?: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

function injectedProvider(): InjectedProvider | undefined {
    return (window as unknown as { rougechain?: InjectedProvider }).rougechain;
}

function errMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

function truncateKey(key: string): string {
    // rouge1 addresses get special formatting
    if (key.startsWith('rouge1')) return formatAddress(key, 12, 4);
    if (key.length <= 16) return key;
    return key.slice(0, 8) + '...' + key.slice(-6);
}

// Wallet session persistence. The private key survives a page refresh but
// auto-clears when the tab closes (ciphertext lives in sessionStorage). It is
// NOT stored in readable plaintext: secureSession encrypts it with a
// non-extractable AES-GCM key held in IndexedDB, so a storage dump yields only
// ciphertext — see src/utils/secureSession.ts for the threat model and its
// honest limits. Only the public key is written to localStorage (for cheap
// "is a wallet present" checks). Extension wallets never expose a private key
// here (privateKey stays '').
const PUB_KEY_STORAGE = 'qrougee_pubkey';

async function saveSessionKeys(keys: WalletKeys) {
    await secureSet(keys);
    try { localStorage.setItem(PUB_KEY_STORAGE, keys.publicKey); } catch { /* ignore */ }
}

function loadSessionKeys(): Promise<WalletKeys | null> {
    return secureGet();
}

async function clearSessionKeys() {
    await secureClear();
    try { localStorage.removeItem(PUB_KEY_STORAGE); } catch { /* ignore */ }
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const rc = useRougeChain();

    const [walletKeys, setWalletKeys] = useState<WalletKeys | null>(null);
    const [extensionDetected, setExtensionDetected] = useState(false);
    const [isExtensionWallet, setIsExtensionWallet] = useState(false);

    // Detect the RougeChain Wallet browser extension / Qwalla dApp browser
    // provider. We only flip `extensionDetected` here — we do NOT auto-call
    // provider.connect() on load. The extension only opens its approval popup
    // in response to a real user gesture, so an auto-fired connect() on page
    // load just rejects silently. Connection happens when the user clicks the
    // "Connect Wallet" button.
    useEffect(() => {
        const check = () => {
            setExtensionDetected(!!injectedProvider()?.isRougeChain);
        };
        check();
        window.addEventListener('rougechain#initialized', check);
        return () => window.removeEventListener('rougechain#initialized', check);
    }, []);

    const [state, setState] = useState<WalletState>({
        publicKey: null,
        address: null,
        mnemonic: null,
        balance: '0',
        isConnected: false,
        isLoading: false,
        connectError: null,
    });

    const fetchBalance = useCallback(async (pubKey: string) => {
        try {
            const resp = await rc.getBalance(pubKey);
            const formatted = resp.balance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            setState(prev => ({ ...prev, balance: formatted }));
        } catch {
            // Testnet may be unreachable — keep existing balance
        }
    }, [rc]);

    // On mount, restore wallet from the encrypted session store (survives refresh).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const keys = await loadSessionKeys();
            if (!keys || cancelled) return;
            setWalletKeys(keys);
            const wasExtension = sessionStorage.getItem('qrougee_ext_wallet') === 'true';
            if (wasExtension) setIsExtensionWallet(true);
            const mnemonic = keys.mnemonic || null;
            setState({
                publicKey: keys.publicKey,
                address: null,
                mnemonic,
                balance: '0',
                isConnected: true,
                isLoading: false,
                connectError: null,
            });
            pubkeyToAddress(keys.publicKey).then(addr => {
                if (!cancelled) setState(prev => ({ ...prev, address: addr }));
            });
            fetchBalance(keys.publicKey);
        })();
        return () => { cancelled = true; };
    }, [fetchBalance]);

    const connect = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const mnemonic = generateMnemonic();
            const { publicKey, privateKey } = keypairFromMnemonic(mnemonic);
            const keys: WalletKeys = { publicKey, privateKey };

            setWalletKeys(keys);
            await saveSessionKeys({ ...keys, mnemonic });

            const addr = await pubkeyToAddress(keys.publicKey);

            setState({
                publicKey: keys.publicKey,
                address: addr,
                mnemonic,
                balance: '0',
                isConnected: true,
                isLoading: false,
                connectError: null,
            });

            // Request initial faucet tokens
            try {
                await rc.faucet(keys);
                await fetchBalance(keys.publicKey);
            } catch {
                // Faucet may fail on testnet — not critical
            }
        } catch {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [rc, fetchBalance]);

    const connectFromMnemonic = useCallback(async (mnemonic: string) => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            if (!validateMnemonic(mnemonic)) {
                throw new Error('Invalid seed phrase');
            }
            const { publicKey, privateKey } = keypairFromMnemonic(mnemonic);
            const keys: WalletKeys = { publicKey, privateKey };

            setWalletKeys(keys);
            await saveSessionKeys({ ...keys, mnemonic });

            const addr = await pubkeyToAddress(keys.publicKey);

            setState({
                publicKey: keys.publicKey,
                address: addr,
                mnemonic,
                balance: '0',
                isConnected: true,
                isLoading: false,
                connectError: null,
            });

            await fetchBalance(keys.publicKey);
        } catch {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [fetchBalance]);

    const connectFromKeys = useCallback(async (keys: WalletKeys) => {
        setState(prev => ({ ...prev, isLoading: true }));

        setWalletKeys(keys);
        await saveSessionKeys(keys);

        const addr = await pubkeyToAddress(keys.publicKey);

        setState({
            publicKey: keys.publicKey,
            address: addr,
            mnemonic: null,
            balance: '0',
            isConnected: true,
            isLoading: false,
            connectError: null,
        });

        await fetchBalance(keys.publicKey);
    }, [fetchBalance]);

    const connectExtensionInternal = async () => {
        setState(prev => ({ ...prev, isLoading: true, connectError: null }));
        try {
            const provider = injectedProvider();
            if (!provider?.isRougeChain) {
                throw new Error('RougeChain Wallet extension not found');
            }
            const result = await provider.connect() as { publicKey: string };
            if (!result?.publicKey) throw new Error('Extension did not return a public key');

            const keys: WalletKeys = { publicKey: result.publicKey, privateKey: '' };
            setWalletKeys(keys);
            setIsExtensionWallet(true);
            await saveSessionKeys(keys);
            sessionStorage.setItem('qrougee_ext_wallet', 'true');

            const addr = await pubkeyToAddress(result.publicKey);

            setState({
                publicKey: result.publicKey,
                address: addr,
                mnemonic: null,
                balance: '0',
                isConnected: true,
                isLoading: false,
                connectError: null,
            });

            await fetchBalance(result.publicKey);
        } catch (e: unknown) {
            // Surface the extension's rejection (e.g. "Wallet is locked or not
            // set up") instead of failing silently.
            const message = errMessage(e) || 'Failed to connect the RougeChain Wallet extension';
            setState(prev => ({ ...prev, isLoading: false, connectError: message }));
        }
    };

    const connectExtension = useCallback(connectExtensionInternal, [fetchBalance]);

    const signViaExtension = useCallback(async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
        const provider = injectedProvider();
        if (!provider?.isRougeChain) {
            throw new Error('RougeChain Wallet extension not available');
        }
        if (typeof provider.signTransaction === 'function') {
            return await provider.signTransaction(payload);
        }
        if (typeof provider.signAndSendTransaction === 'function') {
            return await provider.signAndSendTransaction(payload);
        }
        throw new Error('Extension does not support transaction signing');
    }, []);

    const disconnect = useCallback(() => {
        setWalletKeys(null);
        void clearSessionKeys();
        setIsExtensionWallet(false);
        sessionStorage.removeItem('qrougee_ext_wallet');
        setState({
            publicKey: null,
            address: null,
            mnemonic: null,
            balance: '0',
            isConnected: false,
            isLoading: false,
            connectError: null,
        });
    }, []);

    const requestFaucet = useCallback(async () => {
        if (!walletKeys) return;
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            await rc.faucet(walletKeys);
            await fetchBalance(walletKeys.publicKey);
        } catch {
            // Faucet may fail
        }
        setState(prev => ({ ...prev, isLoading: false }));
    }, [walletKeys, rc, fetchBalance]);

    const refreshBalance = useCallback(async () => {
        if (!walletKeys) return;
        await fetchBalance(walletKeys.publicKey);
    }, [walletKeys, fetchBalance]);

    return (
        <WalletContext.Provider
            value={{
                ...state,
                walletKeys,
                extensionDetected,
                isExtensionWallet,
                signViaExtension,
                connect,
                connectExtension,
                connectFromKeys,
                connectFromMnemonic,
                disconnect,
                requestFaucet,
                refreshBalance,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) throw new Error('useWallet must be used within WalletProvider');
    return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- helper co-located with its provider
export { truncateKey };
