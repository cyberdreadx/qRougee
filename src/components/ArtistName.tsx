import { useState, useEffect } from 'react';
import { useRougeChain } from '../hooks/useRougeChain';
import { resolveArtistName, cachedArtistName, HEX_HANDLE } from '../utils/artistName';

/**
 * Renders an artist's display name, upgrading a raw hex handle to the creator's
 * registered on-chain name when one exists. If the fallback is already a real
 * name (set by the creator in the track metadata), it's shown as-is.
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
    const [name, setName] = useState<string | null>(() =>
        resolvable ? (cachedArtistName(creator!) ?? null) : null,
    );

    useEffect(() => {
        if (!resolvable) return;
        let cancelled = false;
        resolveArtistName(rc, creator!).then(n => { if (!cancelled && n) setName(n); });
        return () => { cancelled = true; };
    }, [rc, creator, resolvable]);

    return <span className={className} style={style}>{name || fallback}</span>;
}
