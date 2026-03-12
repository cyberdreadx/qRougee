// RougeChain Explorer URL helpers
const EXPLORER_BASE = 'https://rougechain.io';

export function explorerUrl(type: 'collection' | 'token' | 'tx' | 'address' | 'pool', id: string): string {
    switch (type) {
        case 'collection':
            return `${EXPLORER_BASE}/nfts/${id}`;
        case 'token':
            return `${EXPLORER_BASE}/token/${id}`;
        case 'tx':
            return `${EXPLORER_BASE}/tx/${id}`;
        case 'address':
            return `${EXPLORER_BASE}/address/${id}`;
        case 'pool':
            return `${EXPLORER_BASE}/pool/${id}`;
    }
}

export function truncateHash(hash: string, chars = 8): string {
    if (hash.length <= chars * 2 + 3) return hash;
    return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}
