/**
 * Deterministic placeholder cover art for tracks with no (or broken) artwork.
 *
 * Produces a self-contained SVG data URI: a two-tone gradient keyed off a stable
 * seed plus the track's initials. Same seed → same art every render, so a track
 * keeps a consistent look across the app instead of a generic music-note box.
 */

function escapeXml(s: string): string {
    return s.replace(/[&<>'"]/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c]!
    ));
}

function hashHue(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return h % 360;
}

/** Up to two uppercase initials from a title (falls back to a music note). */
function initialsOf(title: string): string {
    const words = (title || '').trim().split(/\s+/).filter(Boolean);
    const letters = words.slice(0, 2).map(w => w[0]).join('');
    return (letters || '♪').toUpperCase().slice(0, 2);
}

export function coverFallback(title: string, seed?: string | number): string {
    const hue = hashHue(String(seed ?? title ?? ''));
    const hue2 = (hue + 42) % 360;
    const initials = escapeXml(initialsOf(title));
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="hsl(${hue},62%,45%)"/>` +
        `<stop offset="1" stop-color="hsl(${hue2},58%,20%)"/>` +
        `</linearGradient></defs>` +
        `<rect width="400" height="400" fill="url(#g)"/>` +
        // soft highlight for depth
        `<circle cx="130" cy="110" r="220" fill="rgba(255,255,255,0.08)"/>` +
        `<text x="200" y="208" text-anchor="middle" dominant-baseline="central" ` +
        `fill="rgba(255,255,255,0.88)" font-family="-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" ` +
        `font-size="104" font-weight="600" letter-spacing="3">${initials}</text>` +
        `</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
