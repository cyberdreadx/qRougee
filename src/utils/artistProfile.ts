/**
 * Local artist display-name overrides.
 *
 * Lets a creator choose an artist name that is NOT their wallet name. Stored
 * locally (per device) keyed by the creator id as it appears on their tracks
 * (`track.creator`), so it maps cleanly onto the identity resolution layer.
 *
 * This is deliberately a thin, swappable source: when an on-chain artist-profile
 * primitive exists, replace the body of getOverride/setOverride with a read/write
 * against that backend and the rest of the app (ArtistName) is unchanged.
 */

const KEY = 'qrougee:artistnames';
const EVENT = 'qrougee:artistnames-changed';

type Overrides = Record<string, string>;

function read(): Overrides {
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function write(map: Overrides): void {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* quota */ }
    // Notify live components (ArtistName) so the name updates without a reload.
    window.dispatchEvent(new Event(EVENT));
}

export const ARTIST_OVERRIDE_EVENT = EVENT;

export function getOverride(creatorId?: string): string | null {
    if (!creatorId) return null;
    return read()[creatorId] || null;
}

export function setOverride(creatorId: string, name: string): void {
    const map = read();
    const trimmed = name.trim();
    if (trimmed) map[creatorId] = trimmed; else delete map[creatorId];
    write(map);
}

export function clearOverride(creatorId: string): void {
    const map = read();
    delete map[creatorId];
    write(map);
}
