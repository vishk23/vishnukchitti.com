# Sensor data (build-time only)

Raw sensor recordings live here as JSON and are consumed **at build time** by
`src/lib/sensor.ts`. They are downsampled (`src/lib/downsample.ts`) before any
bytes reach the browser, so a multi-megabyte recording ships as a small
display-sized envelope.

## Files

All five real captures are present (real WHOOP sensor data — see
`PROVENANCE.md` for how each was extracted and its privacy footprint):

| File                | Purpose                        | Real shape                                    |
| ------------------- | ------------------------------ | --------------------------------------------- |
| `ppg-hero.json`     | Decoded optical PPG burst      | `{ primary: { segments: [{ samples }] } }`    |
| `imu-segment.json`  | 6-channel IMU toggle figure    | `{ channel_labels[6], samples: number[][] }`  |
| `hr-day.json`       | Heart-rate over a day          | `{ points: [{ bpm_avg, … }] }`                |
| `hrv-series.json`   | Nightly HRV (RMSSD)            | `{ sessions: [{ rmssd_ms, … }] }`             |
| `hypnogram.json`    | One night's sleep stages       | `{ stages: [{ start_unix, end_unix, stage }] }` |

The real captures do **not** all share one flat shape. `src/lib/sensor.ts`
dispatches on document structure in `normalizeSensorFile` (points → hr-day,
sessions → hrv, `primary.segments` → ppg, otherwise the flat/IMU schema), and
the IMU file is sample-major so it is transposed to channel-major on load. The
categorical/short figures (PPG burst, hypnogram, HRV trend) are read by the
dedicated `loadPpgBurst` / `loadHypnogram` / `loadHrvSeries` loaders instead of
the downsample path. `PROVENANCE.md` is repo documentation and is not rendered
on any page.

## Placeholder file shape (still accepted by the loader)

```jsonc
{
  "placeholder": false,           // optional; true marks synthetic stand-ins
  "sample_rate_hz": 64,           // samples per second
  "start_iso": "2026-01-01T00:00:00Z",
  "channel_labels": ["ppg_green"],
  // single channel: flat number[]; multi-channel: number[][] (one row/label)
  "samples": [0.12, 0.34, ...]
}
```

## Consuming the data

```ts
import { loadSensor } from '../lib/sensor';
import { minMaxDownsample, normalizeToClip } from '../lib/downsample';

const series = loadSensor('ppg-hero');        // null if the file is absent
if (series) {
  const envelope = minMaxDownsample(series.channels[0], 1200); // build time
  const clip = normalizeToClip(envelope);      // -> [-1, 1] for webgl-plot
}
```

`loadSensor` returns `null` when a file is missing, so pages fall back to
`src/lib/synthetic.ts` placeholder generators until the real data exists.
