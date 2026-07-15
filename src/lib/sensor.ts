// -----------------------------------------------------------------------------
// Typed sensor-data loader. Runs at BUILD TIME (imported from .astro frontmatter
// or getStaticPaths), so raw multi-megabyte sample arrays never reach the client.
//
// Real files arrive later in `src/data/` as: ppg-hero.json, imu-segment.json,
// hr-day.json, hrv-series.json, hypnogram.json — each with the shape below.
// A placeholder file (src/data/ppg-hero.json) exercises this path today.
// -----------------------------------------------------------------------------

import { z } from 'astro:content';

/**
 * On-disk sensor file shape. `samples` is either a flat array (single channel)
 * or an array-of-arrays (one inner array per channel, aligned to
 * `channel_labels`). Values are raw sensor units.
 */
export const SensorFileSchema = z.object({
  sample_rate_hz: z.number().positive(),
  start_iso: z.string(),
  channel_labels: z.array(z.string()).min(1),
  samples: z.union([z.array(z.number()), z.array(z.array(z.number()))]),
  // Optional marker so build logs make clear when placeholder data is in play.
  placeholder: z.boolean().optional(),
});

export type SensorFile = z.infer<typeof SensorFileSchema>;

/** Normalized in-memory representation: always channel-major Float32Arrays. */
export interface SensorSeries {
  sampleRateHz: number;
  startIso: string;
  channelLabels: string[];
  /** channels[i] is the Float32Array for channel_labels[i]. */
  channels: Float32Array[];
  /** Number of samples per channel. */
  length: number;
  placeholder: boolean;
}

/**
 * Validate a parsed JSON object and normalize it into channel-major
 * Float32Arrays. Throws (with the sensor key for context) on malformed input.
 */
export function normalizeSensorFile(raw: unknown, key: string): SensorSeries {
  const parsed = SensorFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `sensor "${key}": malformed sensor file — ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }
  const file = parsed.data;

  // Detect single- vs multi-channel by inspecting the first element.
  const isMultiChannel =
    Array.isArray(file.samples[0]) && file.channel_labels.length > 1;

  let channels: Float32Array[];
  if (isMultiChannel) {
    const rows = file.samples as number[][];
    if (rows.length !== file.channel_labels.length) {
      throw new Error(
        `sensor "${key}": ${rows.length} sample rows but ${file.channel_labels.length} channel labels`,
      );
    }
    channels = rows.map((row) => Float32Array.from(row));
  } else {
    channels = [Float32Array.from(file.samples as number[])];
  }

  return {
    sampleRateHz: file.sample_rate_hz,
    startIso: file.start_iso,
    channelLabels: file.channel_labels,
    channels,
    length: channels[0]?.length ?? 0,
    placeholder: file.placeholder ?? false,
  };
}

/**
 * Build-time loader. Eagerly imports every JSON under `src/data/` via Vite's
 * import.meta.glob and returns the requested key (filename without extension).
 * Returns `null` when the file is absent, so pages can fall back to synthetic
 * placeholder data before the real recordings land.
 */
const dataModules = import.meta.glob<{ default: unknown }>('../data/*.json', {
  eager: true,
});

export function loadSensor(key: string): SensorSeries | null {
  const match = Object.entries(dataModules).find(([path]) =>
    path.endsWith(`/${key}.json`),
  );
  if (!match) return null;
  return normalizeSensorFile(match[1].default, key);
}
