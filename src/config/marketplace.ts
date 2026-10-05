import { getNetworkId, type NetworkId } from './network';

/**
 * Deployed NFT-marketplace contract address, per network.
 *
 * Left empty until the `CONTRACT_NFT_ROYALTY` upgrade activates and the
 * `contracts/nft_marketplace` contract is deployed (testnet after block 1360,
 * mainnet after the coordinated hard fork). While the address for the active
 * network is empty, the whole marketplace UI stays hidden — nothing renders and
 * no contract calls are made, so this is safe to ship ahead of activation.
 *
 * To turn it on: paste the deployed contract address for that network below.
 */
const MARKETPLACE_ADDRESS: Record<NetworkId, string> = {
    mainnet: '',
    testnet: 'c05cd63141da72a84f905065dd02acb3a55df991',
};

/** The market contract address for the current network, or null if not deployed yet. */
export function getMarketplaceAddress(): string | null {
    return MARKETPLACE_ADDRESS[getNetworkId()] || null;
}
