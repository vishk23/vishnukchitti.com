# Sensor data (build-time only)

Raw sensor recordings live here as JSON and are consumed **at build time** by
`src/lib/sensor.ts`. They are downsampled (`src/lib/downsample.ts`) before any
bytes reach the browser, so a multi-megabyte recording ships as a small
display-sized envelope.

## Expected files

Real recordings arrive later. Expected keys (filename without `.json`):

| File                | Purpose                        | Channels                    |
| ------------------- | ------------------------------ | --------------------------- |
| `ppg-hero.json`     | Hero waveform scrub            | 1 (PPG)                     |
| `imu-segment.json`  | 6-channel IMU toggle figure    | 6 (accel xyz + gyro xyz)    |
| `hr-day.json`       | Heart-rate over a day          | 1                           |
| `hrv-series.json`   | HRV time series                | 1                           |
| `hypnogram.json`    | Sleep stages                   | 1 (stepped)                 |

Only `ppg-hero.json` exists right now, and it is a **placeholder**
(`"placeholder": true`, 512 synthetic samples). Replace it — and add the rest —
when the real recordings land.

## File shape

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
