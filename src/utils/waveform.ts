import type { Track } from '../data/mockData';

/**
 * Waveform peaks for a track. Uses the real peaks captured at mint when present;
 * otherwise synthesizes a stable, organic-looking waveform from the track id so
 * every row reads as SoundCloud-style audio. Deterministic → the same track
 * always draws the same shape.
 */

function seededRand(seed: string): () => number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function synthesize(seed: string, n: number): number[] {
    const rand = seededRand(seed);
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
        const x = i / n;
        // Gentle arch envelope + layered noise → looks like a real track.
        const env = 0.4 + 0.6 * Math.sin(Math.PI * x);
        const detail = 0.5 * rand() + 0.3 * rand() + 0.2 * rand();
        out.push(Math.max(0.08, Math.min(1, env * (0.35 + 0.75 * detail))));
    }
    return out;
}

const cache = new Map<string, number[]>();

export function getWaveform(track: Pick<Track, 'id' | 'waveform'>, bars = 80): number[] {
    if (track.waveform && track.waveform.length > 4) return resample(track.waveform, bars);
    const key = `${track.id}:${bars}`;
    let w = cache.get(key);
    if (!w) { w = synthesize(track.id, bars); cache.set(key, w); }
    return w;
}

/** Down/up-sample an arbitrary-length peak array to `bars` buckets. */
function resample(peaks: number[], bars: number): number[] {
    if (peaks.length === bars) return peaks;
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
        const idx = Math.floor((i / bars) * peaks.length);
        out.push(Math.max(0.08, Math.min(1, peaks[idx] ?? 0.1)));
    }
    return out;
}
