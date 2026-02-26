import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface WalletState {
    address: string | null;
    publicKey: string | null;
    balance: string;
    isConnected: boolean;
    isLoading: boolean;
}

interface WalletContextType extends WalletState {
    connect: () => Promise<void>;
    disconnect: () => void;
    requestFaucet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Generate a pseudo-random RougeChain address
function generateAddress(): string {
    const chars = '0123456789abcdef';
    let addr = 'rouge1';
    for (let i = 0; i < 38; i++) {
        addr += chars[Math.floor(Math.random() * chars.length)];
    }
    return addr;
}

function truncateAddress(addr: string): string {
    return addr.slice(0, 10) + '...' + addr.slice(-4);
}

const STORAGE_KEY = 'qrougee_wallet';

export function WalletProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<WalletState>({
        address: null,
        publicKey: null,
        balance: '0',
        isConnected: false,
        isLoading: false,
    });

    // Restore wallet from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                setState({
                    address: data.address,
                    publicKey: data.publicKey,
                    balance: data.balance || '1,000.00',
                    isConnected: true,
                    isLoading: false,
                });
            }
        } catch { /* ignore */ }
    }, []);

    const connect = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));

        // Simulate wallet generation delay
        await new Promise(r => setTimeout(r, 800));

        const address = generateAddress();
        const publicKey = 'pk_' + address.slice(6);
        const balance = '1,000.00';

        const walletData = { address, publicKey, balance };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));

        setState({
            address,
            publicKey,
            balance,
            isConnected: true,
            isLoading: false,
        });
    }, []);

    const disconnect = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState({
            address: null,
            publicKey: null,
            balance: '0',
            isConnected: false,
            isLoading: false,
        });
    }, []);

    const requestFaucet = useCallback(async () => {
        if (!state.isConnected) return;
        setState(prev => ({ ...prev, isLoading: true }));
        await new Promise(r => setTimeout(r, 1200));
        const newBalance = (parseFloat(state.balance.replace(',', '')) + 100).toLocaleString('en-US', {
            minimumFractionDigits: 2,
        });
        setState(prev => ({ ...prev, balance: newBalance, isLoading: false }));
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            data.balance = newBalance;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    }, [state.isConnected, state.balance]);

    return (
        <WalletContext.Provider
            value={{
                ...state,
                connect,
                disconnect,
                requestFaucet,
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

export { truncateAddress };
