// -----------------------------------------------------------------------------
// Min-max bucket downsampling. Runs at BUILD TIME. Reduces a long signal to a
// display-sized envelope while preserving visual peaks/troughs (unlike naive
// stride sampling, which drops spikes between strides).
//
// For a target of N horizontal pixels we emit up to 2N points: each bucket
// contributes its min and its max, ordered by sample index, so the rendered
// polyline still traces the true extremes of the waveform.
// -----------------------------------------------------------------------------

/**
 * Min-max downsample a single channel to at most `2 * targetBuckets` points.
 * Returns the original array untouched when it already fits.
 */
export function minMaxDownsample(
  data: Float32Array,
  targetBuckets: number,
): Float32Array {
  if (targetBuckets <= 0) return new Float32Array(0);
  if (data.length <= targetBuckets * 2) return data;

  const bucketSize = data.length / targetBuckets;
  const out = new Float32Array(targetBuckets * 2);

  for (let b = 0; b < targetBuckets; b++) {
    const start = Math.floor(b * bucketSize);
    const end = Math.min(Math.floor((b + 1) * bucketSize), data.length);

    let min = data[start];
    let max = data[start];
    let minIdx = start;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const v = data[i];
      if (v < min) {
        min = v;
        minIdx = i;
      }
      if (v > max) {
        max = v;
        maxIdx = i;
      }
    }

    // Preserve temporal order of the two extremes within the bucket.
    if (minIdx <= maxIdx) {
      out[b * 2] = min;
      out[b * 2 + 1] = max;
    } else {
      out[b * 2] = max;
      out[b * 2 + 1] = min;
    }
  }

  return out;
}

/** Downsample every channel of a series to the same bucket count. */
export function minMaxDownsampleChannels(
  channels: Float32Array[],
  targetBuckets: number,
): Float32Array[] {
  return channels.map((c) => minMaxDownsample(c, targetBuckets));
}

/**
 * Normalize a Float32Array into the WebGL clip range [-1, 1] using its own
 * min/max. Returns a new array; leaves the input untouched. Flat signals map
 * to all-zeros to avoid divide-by-zero.
 */
export function normalizeToClip(data: Float32Array): Float32Array {
  const out = new Float32Array(data.length);
  if (data.length === 0) return out;

  let min = data[0];
  let max = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min;
  if (range === 0) return out; // already all-zeros

  for (let i = 0; i < data.length; i++) {
    out[i] = ((data[i] - min) / range) * 2 - 1;
  }
  return out;
}
