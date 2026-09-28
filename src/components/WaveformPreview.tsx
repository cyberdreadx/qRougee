import { useEffect, useRef } from 'react';

/**
 * Renders a track's waveform peaks as a bar graph, with the auto-picked hook
 * window highlighted in the accent color. Peaks are normalized 0–1 (see
 * utils/audioAnalysis). Purely presentational.
 */
export default function WaveformPreview({
  peaks,
  duration,
  previewStart,
  previewEnd,
  height = 56,
}: {
  peaks: number[];
  duration: number;
  previewStart?: number;
  previewEnd?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || peaks.length === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 320;
    canvas.width = cssW * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, height);

    const style = getComputedStyle(canvas);
    const accent = style.getPropertyValue('--accent').trim() || '#ff3d92';
    const dim = 'rgba(148, 138, 160, 0.45)';

    const n = peaks.length;
    const gap = cssW / n;
    const bw = Math.max(1, gap * 0.62);
    const mid = height / 2;

    // Map the hook window (seconds) to peak indices.
    let hookA = -1;
    let hookB = -1;
    if (duration > 0 && previewStart != null && previewEnd != null && previewEnd > previewStart) {
      hookA = Math.floor((previewStart / duration) * n);
      hookB = Math.ceil((previewEnd / duration) * n);
    }

    for (let i = 0; i < n; i++) {
      const inHook = i >= hookA && i < hookB;
      ctx.fillStyle = inHook ? accent : dim;
      const h = Math.max(2, peaks[i] * (height - 4));
      ctx.fillRect(i * gap + (gap - bw) / 2, mid - h / 2, bw, h);
    }
  }, [peaks, duration, previewStart, previewEnd, height]);

  if (peaks.length === 0) return null;

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height, display: 'block' }}
      aria-label="Track waveform with the preview hook highlighted"
      role="img"
    />
  );
}
