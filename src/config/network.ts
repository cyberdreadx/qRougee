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

/**
 * Deployed NFT-marketplace escrow contract per network (see
 * quantum-vault/contracts/nft_marketplace). Empty = not deployed there yet, so
 * the Marketplace is hidden/disabled on that network.
 */
export const MARKETPLACE_CONTRACTS: Record<NetworkId, string> = {
    testnet: 'c05cd63141da72a84f905065dd02acb3a55df991',
    mainnet: '', // not deployed to mainnet yet
};

export function getMarketplaceAddress(): string {
    return MARKETPLACE_CONTRACTS[getNetworkId()] || '';
}

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
