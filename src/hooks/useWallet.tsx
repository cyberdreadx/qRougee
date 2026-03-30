import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { type WalletKeys } from '@rougechain/sdk';
import { useRougeChain } from './useRougeChain';
import { pubkeyToAddress, formatAddress } from '../utils/address';
import { generateMnemonic, validateMnemonic, keypairFromMnemonic } from '../utils/mnemonic';

interface WalletState {
    publicKey: string | null;
    /** rouge1... bech32m address derived from pubkey */
    address: string | null;
    /** 12-word BIP-39 mnemonic (only available for wallets created via New Wallet) */
    mnemonic: string | null;
    balance: string;
    isConnected: boolean;
    isLoading: boolean;
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

function truncateKey(key: string): string {
    // rouge1 addresses get special formatting
    if (key.startsWith('rouge1')) return formatAddress(key, 12, 4);
    if (key.length <= 16) return key;
    return key.slice(0, 8) + '...' + key.slice(-6);
}

// Session-scoped storage keys — sessionStorage persists across page refresh
// but auto-clears when the browser tab is closed. This gives us persistence
// during a session without long-term plaintext storage on disk.
const SESSION_KEYS = 'qrougee_session_keys';
const PUB_KEY_STORAGE = 'qrougee_pubkey';

function saveSessionKeys(keys: WalletKeys) {
    sessionStorage.setItem(SESSION_KEYS, JSON.stringify(keys));
    localStorage.setItem(PUB_KEY_STORAGE, keys.publicKey);
}

function loadSessionKeys(): WalletKeys | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEYS);
        if (!raw) return null;
        const keys = JSON.parse(raw) as WalletKeys;
        if (keys.publicKey) return keys;
        return null;
    } catch {
        return null;
    }
}

function clearSessionKeys() {
    sessionStorage.removeItem(SESSION_KEYS);
    localStorage.removeItem(PUB_KEY_STORAGE);
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const rc = useRougeChain();

    const [walletKeys, setWalletKeys] = useState<WalletKeys | null>(null);
    const [extensionDetected, setExtensionDetected] = useState(false);
    const [isExtensionWallet, setIsExtensionWallet] = useState(false);

    // Detect RougeChain Wallet browser extension / Qwalla dApp browser provider
    // and auto-connect if available (e.g. when opened inside Qwalla's built-in browser)
    const autoConnectAttempted = useRef(false);

    useEffect(() => {
        const check = () => {
            const detected = !!(window as any).rougechain?.isRougeChain;
            setExtensionDetected(detected);
            if (detected && !autoConnectAttempted.current) {
                autoConnectAttempted.current = true;
                const existing = loadSessionKeys();
                if (!existing) {
                    void connectExtensionInternal();
                }
            }
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

    // On mount, restore wallet from sessionStorage (survives page refresh)
    useEffect(() => {
        const keys = loadSessionKeys();
        if (keys) {
            setWalletKeys(keys);
            const wasExtension = sessionStorage.getItem('qrougee_ext_wallet') === 'true';
            if (wasExtension) setIsExtensionWallet(true);
            const mnemonic = (keys as any).mnemonic || null;
            setState({
                publicKey: keys.publicKey,
                address: null,
                mnemonic,
                balance: '0',
                isConnected: true,
                isLoading: false,
            });
            pubkeyToAddress(keys.publicKey).then(addr => {
                setState(prev => ({ ...prev, address: addr }));
            });
            fetchBalance(keys.publicKey);
        }
    }, [fetchBalance]);

    const connect = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const mnemonic = generateMnemonic();
            const { publicKey, privateKey } = keypairFromMnemonic(mnemonic);
            const keys: WalletKeys = { publicKey, privateKey };

            setWalletKeys(keys);
            saveSessionKeys({ ...keys, mnemonic } as any);

            const addr = await pubkeyToAddress(keys.publicKey);

            setState({
                publicKey: keys.publicKey,
                address: addr,
                mnemonic,
                balance: '0',
                isConnected: true,
                isLoading: false,
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
            saveSessionKeys({ ...keys, mnemonic } as any);

            const addr = await pubkeyToAddress(keys.publicKey);

            setState({
                publicKey: keys.publicKey,
                address: addr,
                mnemonic,
                balance: '0',
                isConnected: true,
                isLoading: false,
            });

            await fetchBalance(keys.publicKey);
        } catch {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [fetchBalance]);

    const connectFromKeys = useCallback(async (keys: WalletKeys) => {
        setState(prev => ({ ...prev, isLoading: true }));

        setWalletKeys(keys);
        saveSessionKeys(keys);

        const addr = await pubkeyToAddress(keys.publicKey);

        setState({
            publicKey: keys.publicKey,
            address: addr,
            mnemonic: null,
            balance: '0',
            isConnected: true,
            isLoading: false,
        });

        await fetchBalance(keys.publicKey);
    }, [fetchBalance]);

    const connectExtensionInternal = async () => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const provider = (window as any).rougechain;
            if (!provider?.isRougeChain) {
                throw new Error('RougeChain Wallet extension not found');
            }
            const result = await provider.connect() as { publicKey: string };
            if (!result?.publicKey) throw new Error('Extension did not return a public key');

            const keys: WalletKeys = { publicKey: result.publicKey, privateKey: '' };
            setWalletKeys(keys);
            setIsExtensionWallet(true);
            saveSessionKeys(keys);
            sessionStorage.setItem('qrougee_ext_wallet', 'true');

            const addr = await pubkeyToAddress(result.publicKey);

            setState({
                publicKey: result.publicKey,
                address: addr,
                mnemonic: null,
                balance: '0',
                isConnected: true,
                isLoading: false,
            });

            await fetchBalance(result.publicKey);
        } catch {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    };

    const connectExtension = useCallback(connectExtensionInternal, [fetchBalance]);

    const signViaExtension = useCallback(async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
        const provider = (window as any).rougechain;
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
        clearSessionKeys();
        setIsExtensionWallet(false);
        sessionStorage.removeItem('qrougee_ext_wallet');
        setState({
            publicKey: null,
            address: null,
            mnemonic: null,
            balance: '0',
            isConnected: false,
            isLoading: false,
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

export function useWallet() {
    const ctx = useContext(WalletContext);
    if (!ctx) throw new Error('useWallet must be used within WalletProvider');
    return ctx;
}

export { truncateKey };
