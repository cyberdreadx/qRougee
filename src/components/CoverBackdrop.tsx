/**
 * Ambient blurred album-cover backdrop. Drop it inside a positioned container
 * (or a fixed/overlay root) to wash the page with colour pulled from the art.
 * The image is heavily blurred + saturated and fades into the page background
 * (theme-aware via var(--bg)) so foreground text stays readable.
 */
export default function CoverBackdrop({
    image,
    opacity = 0.5,
    blur = 70,
    fade = 'bottom',
}: {
    image?: string;
    opacity?: number;
    blur?: number;
    /** Edge the backdrop fades toward the page bg. */
    fade?: 'bottom' | 'full';
}) {
    if (!image) return null;
    const mask = fade === 'full'
        ? 'radial-gradient(120% 90% at 50% 0%, var(--bg) 0%, transparent 55%, var(--bg) 100%)'
        : 'linear-gradient(to bottom, transparent 0%, var(--bg) 92%)';
    return (
        <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
            <div
                style={{
                    position: 'absolute', inset: '-15%',
                    backgroundImage: `url("${image}")`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: `blur(${blur}px) saturate(1.5)`,
                    transform: 'scale(1.25)',
                    opacity,
                }}
            />
            <div style={{ position: 'absolute', inset: 0, background: mask }} />
        </div>
    );
}
