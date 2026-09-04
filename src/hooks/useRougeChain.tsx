import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { RougeChain } from '@rougechain/sdk';
import { getApiBase } from '../config/network';

interface RougeChainContextType {
    rc: RougeChain;
}

const RougeChainContext = createContext<RougeChainContextType | null>(null);

export function RougeChainProvider({ children }: { children: ReactNode }) {
    // Built once per load against the selected network; NetworkSwitcher reloads
    // the app on change so this re-instantiates against the new endpoint.
    const rc = useMemo(() => new RougeChain(getApiBase()), []);

    return (
        <RougeChainContext.Provider value={{ rc }}>
            {children}
        </RougeChainContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useRougeChain(): RougeChain {
    const ctx = useContext(RougeChainContext);
    if (!ctx) throw new Error('useRougeChain must be used within RougeChainProvider');
    return ctx.rc;
}
