/**
 * RougeChain network configuration.
 *
 * The selected network is persisted to localStorage and read by both the SDK
 * client (useRougeChain) and the extension-wallet signing bridge
 * (extensionSigner). Switching networks reloads the app so both paths and any
 * cached page data are rebuilt against the new endpoint.
 */

export type NetworkId = 'testnet' | 'mainnet';

export interface NetworkInfo {
    id: NetworkId;
    label: string;
    apiBase: string;
}

export const NETWORKS: Record<NetworkId, NetworkInfo> = {
    mainnet: { id: 'mainnet', label: 'Mainnet', apiBase: 'https://api.rougechain.io/api' },
    testnet: { id: 'testnet', label: 'Testnet', apiBase: 'https://testnet.rougechain.io/api' },
};

const STORAGE_KEY = 'rougechain:network';
const DEFAULT_NETWORK: NetworkId = 'mainnet';

export function getNetworkId(): NetworkId {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'testnet' || stored === 'mainnet') return stored;
    } catch { /* localStorage unavailable */ }
    return DEFAULT_NETWORK;
}

export function getNetwork(): NetworkInfo {
    return NETWORKS[getNetworkId()];
}

export function getApiBase(): string {
    return getNetwork().apiBase;
}

export function setNetworkId(id: NetworkId): void {
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch { /* localStorage unavailable */ }
}
