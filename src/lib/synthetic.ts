// -----------------------------------------------------------------------------
// Synthetic placeholder signal generators. PROOF-OF-PLUMBING ONLY — these exist
// so the WaveformScrub / ChannelToggle components have something to render
// before real recordings land in src/data/. Everything produced here is fake
// and clearly labeled placeholder in the UI. Delete callers once the loader is
// wired to real data.
// -----------------------------------------------------------------------------

/** Deterministic PRNG (mulberry32) so the placeholder looks identical across
 * builds and between server prerender and any client regeneration. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A single-channel sine-with-noise waveform in clip space [-1, 1], shaped to
 * loosely resemble a PPG pulse train. `n` samples, `cycles` full periods.
 */
export function syntheticWaveform(
  n = 2048,
  cycles = 12,
  seed = 1337,
): Float32Array {
  const rand = mulberry32(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const phase = (i / n) * cycles * Math.PI * 2;
    // Fundamental plus a second harmonic to fake the dicrotic notch, plus noise.
    const base = Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.15;
    const noise = (rand() - 0.5) * 0.12;
    out[i] = Math.max(-1, Math.min(1, base + noise));
  }
  return out;
}

/**
 * Six synthetic channels (fake 3-axis accelerometer + 3-axis gyroscope) in clip
 * space, each with its own frequency/phase so the toggles are visually distinct.
 */
export function syntheticChannels(n = 2048): {
  labels: string[];
  channels: Float32Array[];
} {
  const labels = ['accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z'];
  const channels = labels.map((_, ch) => {
    const rand = mulberry32(4096 + ch * 101);
    const freq = 3 + ch * 1.5;
    const amp = 0.5 + ch * 0.05;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const phase = (i / n) * freq * Math.PI * 2 + ch;
      const noise = (rand() - 0.5) * 0.1;
      out[i] = Math.max(-1, Math.min(1, Math.sin(phase) * amp + noise));
    }
    return out;
  });
  return { labels, channels };
}
