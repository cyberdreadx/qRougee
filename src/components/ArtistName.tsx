import { useState, useEffect } from 'react';
import { useRougeChain } from '../hooks/useRougeChain';
import { resolveArtistName, cachedArtistName, HEX_HANDLE } from '../utils/artistName';
import { getOverride, ARTIST_OVERRIDE_EVENT } from '../utils/artistProfile';

/**
 * Renders an artist's display name. Resolution when the fallback is a raw hex
 * handle (i.e. the track had no artist name set at mint):
 *   1. local artist display-name override (the creator's chosen name)
 *   2. registered on-chain name (rc.mail.reverseLookup)
 *   3. the hex handle itself
 * A real per-track artist name (non-hex fallback) is always shown as-is.
 */
export default function ArtistName({
    creator, fallback, className, style,
}: {
    creator?: string;
    fallback: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    const rc = useRougeChain();
    const resolvable = !!creator && HEX_HANDLE.test(fallback);

    const [override, setOverrideState] = useState<string | null>(() => resolvable ? getOverride(creator) : null);
    const [name, setName] = useState<string | null>(() => resolvable ? (cachedArtistName(creator!) ?? null) : null);

    // Keep the local override in sync when the artist edits it.
    useEffect(() => {
        if (!resolvable) return;
        const sync = () => setOverrideState(getOverride(creator));
        window.addEventListener(ARTIST_OVERRIDE_EVENT, sync);
        return () => window.removeEventListener(ARTIST_OVERRIDE_EVENT, sync);
    }, [creator, resolvable]);

    // Resolve the on-chain name only if there's no local override.
    useEffect(() => {
        if (!resolvable || override) return;
        let cancelled = false;
        resolveArtistName(rc, creator!).then(n => { if (!cancelled && n) setName(n); });
        return () => { cancelled = true; };
    }, [rc, creator, resolvable, override]);

    return <span className={className} style={style}>{override || name || fallback}</span>;
}
