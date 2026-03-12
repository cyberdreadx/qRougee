import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { RougeChain } from '@rougechain/sdk';

const TESTNET_URL = 'https://testnet.rougechain.io/api';

interface RougeChainContextType {
    rc: RougeChain;
}

const RougeChainContext = createContext<RougeChainContextType | null>(null);

export function RougeChainProvider({ children }: { children: ReactNode }) {
    const rc = useMemo(() => new RougeChain(TESTNET_URL), []);

    return (
        <RougeChainContext.Provider value={{ rc }}>
            {children}
        </RougeChainContext.Provider>
    );
}

export function useRougeChain(): RougeChain {
    const ctx = useContext(RougeChainContext);
    if (!ctx) throw new Error('useRougeChain must be used within RougeChainProvider');
    return ctx.rc;
}
