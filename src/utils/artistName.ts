import type { RougeChain } from '@rougechain/sdk';

/**
 * On-chain artist identity.
 *
 * Creators are stored as raw wallet ids / public keys. When a creator has
 * registered a RougeChain name (rc.mail.reverseLookup → /names/reverse), we show
 * that human name instead of hex. Results (including "no name" nulls) are cached
 * for the session and in-flight requests are de-duped, so a creator is resolved
 * at most once no matter how many cards reference it.
 */

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/** The shape useNftTracks' truncateCreator produces: `12345678...abcdef`. */
export const HEX_HANDLE = /^[0-9a-f]{8}\.\.\.[0-9a-f]{6}$/i;

export async function resolveArtistName(rc: RougeChain, creatorId: string): Promise<string | null> {
    if (!creatorId) return null;
    if (cache.has(creatorId)) return cache.get(creatorId)!;
    if (inflight.has(creatorId)) return inflight.get(creatorId)!;

    const p = (async () => {
        try {
            const name = await rc.mail.reverseLookup(creatorId);
            cache.set(creatorId, name ?? null);
            return name ?? null;
        } catch {
            cache.set(creatorId, null);
            return null;
        } finally {
            inflight.delete(creatorId);
        }
    })();
    inflight.set(creatorId, p);
    return p;
}

/** Synchronous peek at the cache (for first paint without a flash). */
export function cachedArtistName(creatorId: string): string | null | undefined {
    return cache.get(creatorId);
}
