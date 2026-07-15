// -----------------------------------------------------------------------------
// Typed sensor-data loader. Runs at BUILD TIME (imported from .astro frontmatter
// or getStaticPaths), so raw multi-megabyte sample arrays never reach the client.
//
// Real files arrive later in `src/data/` as: ppg-hero.json, imu-segment.json,
// hr-day.json, hrv-series.json, hypnogram.json — each with the shape below.
// A placeholder file (src/data/ppg-hero.json) exercises this path today.
// -----------------------------------------------------------------------------

import { z } from 'astro/zod';

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
 *
 * The real WHOOP captures do not all share the placeholder's flat
 * `{sample_rate_hz, channel_labels, samples}` shape, so this dispatches on the
 * document structure before falling back to `SensorFileSchema`:
 *   - `{ points: [{ bpm_avg, … }] }`   → hr-day    (heart-rate/min, one channel)
 *   - `{ sessions: [{ rmssd_ms, … }] }`→ hrv-series (nightly RMSSD, one channel)
 *   - `{ primary: { segments: [...] }}`→ ppg-hero  (raw optical bursts, one channel)
 *   - `SensorFileSchema`               → placeholder + imu-segment (6-axis)
 * The IMU file is sample-major (`samples[i]` = one timestep across all axes),
 * so it is transposed to channel-major here.
 */
export function normalizeSensorFile(raw: unknown, key: string): SensorSeries {
  const obj = (raw ?? {}) as Record<string, unknown>;

  // hr-day: one-channel bpm series bucketed per minute.
  if (Array.isArray(obj.points)) {
    const points = obj.points as Array<Record<string, number>>;
    const channel = Float32Array.from(points.map((p) => Number(p.bpm_avg)));
    const bucket =
      typeof obj.bucket_seconds === 'number' ? obj.bucket_seconds : 60;
    return {
      sampleRateHz: bucket > 0 ? 1 / bucket : 1,
      startIso: String(obj.start_iso ?? ''),
      channelLabels: ['bpm_avg'],
      channels: [channel],
      length: channel.length,
      placeholder: false,
    };
  }

  // hrv-series: one point per sleep session (nightly RMSSD).
  if (Array.isArray(obj.sessions)) {
    const sessions = obj.sessions as Array<Record<string, number | string>>;
    const channel = Float32Array.from(
      sessions.map((s) => Number(s.rmssd_ms)),
    );
    const rangeStart = Array.isArray(obj.range_iso)
      ? (obj.range_iso as string[])[0]
      : (obj.start_iso as string | undefined);
    return {
      sampleRateHz: 1,
      startIso: String(rangeStart ?? ''),
      channelLabels: ['rmssd_ms'],
      channels: [channel],
      length: channel.length,
      placeholder: false,
    };
  }

  // ppg-hero: nested raw optical bursts. Only the `primary` (WHOOP 5.0 v26)
  // channel is exposed; the disputed `contiguous` v25 segment is never read.
  if (obj.primary && typeof obj.primary === 'object') {
    const primary = obj.primary as Record<string, unknown>;
    const segments =
      (primary.segments as Array<{ start_iso?: string; samples: number[] }>) ??
      [];
    const flat: number[] = [];
    for (const seg of segments) flat.push(...seg.samples);
    const channel = Float32Array.from(flat);
    const labels = (primary.channel_labels as string[]) ?? ['ppg_adc'];
    return {
      sampleRateHz: Number(primary.sample_rate_hz ?? 24),
      startIso: String(segments[0]?.start_iso ?? ''),
      channelLabels: [labels[0] ?? 'ppg_adc'],
      channels: [channel],
      length: channel.length,
      placeholder: false,
    };
  }

  // Placeholder + IMU: the flat SensorFileSchema shape.
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
    if (rows.length === file.channel_labels.length) {
      // Channel-major: each row is a full channel.
      channels = rows.map((row) => Float32Array.from(row));
    } else if ((rows[0]?.length ?? 0) === file.channel_labels.length) {
      // Sample-major (e.g. imu-segment): each row is one timestep across all
      // channels — transpose into channel-major Float32Arrays.
      channels = file.channel_labels.map((_, ch) =>
        Float32Array.from(rows.map((row) => row[ch])),
      );
    } else {
      throw new Error(
        `sensor "${key}": ${rows.length}×${rows[0]?.length ?? 0} samples do not align to ${file.channel_labels.length} channel labels`,
      );
    }
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

/** Return the raw parsed JSON for a data key (build-time), or null if absent. */
function rawSensorJson(key: string): Record<string, unknown> | null {
  const match = Object.entries(dataModules).find(([path]) =>
    path.endsWith(`/${key}.json`),
  );
  if (!match) return null;
  return match[1].default as Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Structure-specific loaders for the small static figures (PPG burst, hypnogram,
// HRV trend). These shapes are categorical or too short to route through the
// downsample/normalize webgl-plot path, so each figure component reads its own
// typed slice of the raw JSON here.
// -----------------------------------------------------------------------------

/** A single decoded optical-PPG burst (the strap emits per-second bursts). */
export interface PpgBurst {
  startIso: string;
  sampleRateHz: number;
  label: string;
  /** Raw AC-coupled ADC counts (PPG has no absolute unit). */
  samples: number[];
}

/**
 * The FIRST `primary` (WHOOP 5.0 v26) burst from a ppg-hero-shaped file — a
 * ~1-second, 24-sample optical capture. The disputed v25 `contiguous` segment
 * is never returned.
 */
export function loadPpgBurst(key = 'ppg-hero'): PpgBurst | null {
  const raw = rawSensorJson(key);
  const primary = raw?.primary as
    | { sample_rate_hz?: number; label?: string; segments?: Array<{ start_iso?: string; samples: number[] }> }
    | undefined;
  const seg = primary?.segments?.[0];
  if (!seg) return null;
  return {
    startIso: String(seg.start_iso ?? ''),
    sampleRateHz: Number(primary?.sample_rate_hz ?? 24),
    label: String(primary?.label ?? 'optical PPG burst'),
    samples: seg.samples,
  };
}

/** One night of sleep-stage segments, for the hypnogram band figure. */
export interface HypnogramData {
  nightStartIso: string;
  nightEndIso: string;
  durationMin: number;
  stageTotalsMin: Record<string, number>;
  segments: Array<{ startUnix: number; endUnix: number; stage: string }>;
}

export function loadHypnogram(key = 'hypnogram'): HypnogramData | null {
  const raw = rawSensorJson(key);
  const stages = raw?.stages as
    | Array<{ start_unix: number; end_unix: number; stage: string }>
    | undefined;
  if (!stages) return null;
  return {
    nightStartIso: String(raw?.night_start_iso ?? ''),
    nightEndIso: String(raw?.night_end_iso ?? ''),
    durationMin: Number(raw?.duration_min ?? 0),
    stageTotalsMin: (raw?.stage_totals_min as Record<string, number>) ?? {},
    segments: stages.map((s) => ({
      startUnix: s.start_unix,
      endUnix: s.end_unix,
      stage: s.stage,
    })),
  };
}

/** Nightly HRV (RMSSD) points across a run of sleep sessions. */
export interface HrvPoint {
  startIso: string;
  rmssdMs: number;
  restingHrBpm: number;
}

export function loadHrvSeries(key = 'hrv-series'): { sessions: HrvPoint[] } | null {
  const raw = rawSensorJson(key);
  const sessions = raw?.sessions as
    | Array<{ start_iso: string; rmssd_ms: number; resting_hr_bpm: number }>
    | undefined;
  if (!sessions) return null;
  return {
    sessions: sessions.map((s) => ({
      startIso: s.start_iso,
      rmssdMs: s.rmssd_ms,
      restingHrBpm: s.resting_hr_bpm,
    })),
  };
}
