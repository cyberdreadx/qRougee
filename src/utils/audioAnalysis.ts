// Client-side audio analysis for the upload flow — no server, no transcode.
//
// Decodes the dropped file once via Web Audio and derives three things stored in
// the track's NFT metadata:
//   • duration   — the real length (replaces the old hardcoded 210s fallback)
//   • waveform    — ~120 normalized peaks for a real scrubber / reel-align bar
//   • preview     — the loudest ~20s window, used as the free "hook" (token-gated
//                   plays can stream just this, holders get the full track)
//
// All of it is pure analysis of the existing file — nothing is re-encoded, so a
// FLAC/WAV master stays the collectible while we still get a hook + waveform.

export interface AudioAnalysis {
  /** Track length in whole seconds. */
  duration: number;
  /** Normalized amplitude peaks (0–1), one per bucket, length = PEAKS. */
  peaks: number[];
  /** Start of the auto-picked hook, in seconds. */
  previewStart: number;
  /** End of the auto-picked hook, in seconds. */
  previewEnd: number;
}

const PEAKS = 120;
const PREVIEW_LEN = 20; // seconds

type ACtor = typeof AudioContext;

/**
 * Analyze an audio File. Resolves with duration + waveform peaks + a hook window.
 * Falls back to an audio-element duration (peaks empty) if the browser can't
 * decode the format via Web Audio (e.g. some FLAC builds).
 */
export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  try {
    return await decodeAndAnalyze(file);
  } catch {
    const duration = await elementDuration(file);
    return { duration, peaks: [], previewStart: 0, previewEnd: Math.min(duration, PREVIEW_LEN) };
  }
}

async function decodeAndAnalyze(file: File): Promise<AudioAnalysis> {
  const AC: ACtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: ACtor }).webkitAudioContext;
  const ctx = new AC();
  try {
    const bytes = await file.arrayBuffer();
    // decodeAudioData detaches the buffer on some engines — decode a copy.
    const audio = await ctx.decodeAudioData(bytes.slice(0));
    const duration = Math.round(audio.duration);
    const ch = audio.getChannelData(0);
    const total = ch.length;
    const block = Math.max(1, Math.floor(total / PEAKS));

    const peaks: number[] = new Array(PEAKS).fill(0);
    let max = 0;
    for (let i = 0; i < PEAKS; i++) {
      const start = i * block;
      const end = Math.min(total, start + block);
      let peak = 0;
      for (let j = start; j < end; j++) {
        const v = Math.abs(ch[j]);
        if (v > peak) peak = v;
      }
      peaks[i] = peak;
      if (peak > max) max = peak;
    }
    const norm = max > 0 ? peaks.map((p) => Math.round((p / max) * 1000) / 1000) : peaks;

    // Hook = the PREVIEW_LEN-second window with the most energy (sliding sum over buckets).
    const secPerBucket = audio.duration / PEAKS;
    const win = Math.max(1, Math.min(PEAKS, Math.round(PREVIEW_LEN / secPerBucket)));
    let bestStart = 0;
    if (win < PEAKS) {
      let sum = 0;
      for (let i = 0; i < win; i++) sum += norm[i];
      let best = sum;
      for (let i = win; i < PEAKS; i++) {
        sum += norm[i] - norm[i - win];
        if (sum > best) {
          best = sum;
          bestStart = i - win + 1;
        }
      }
    }
    const previewStart = Math.round(bestStart * secPerBucket);
    const previewEnd = Math.min(duration, previewStart + PREVIEW_LEN);

    return { duration, peaks: norm, previewStart, previewEnd };
  } finally {
    // Best-effort close; some engines don't expose it.
    void ctx.close?.();
  }
}

/** Duration-only fallback via a throwaway <audio> element. */
function elementDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => {
      const d = a.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? Math.round(d) : 0);
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    a.src = url;
  });
}
