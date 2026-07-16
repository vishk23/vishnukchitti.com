# WHOOP sensor data — provenance & privacy

Extracted 2026-07-15 for Vishnu's public personal-website visualizations, from his own
NOOP/Strand setup on his own machine. All values are real captured sensor data; nothing
is synthesized or fabricated. Timezone for all local-day reasoning: **America/Los_Angeles**.

## Where the data lives (what was investigated)

| Source | Result |
| --- | --- |
| **Local Mac store** `~/Library/Application Support/OpenWhoop/whoop.sqlite` (+ staging container copy) — the `WhoopStore` GRDB DB (schema per `Packages/WhoopStore/Sources/WhoopStore/Database.swift`, 31 migrations, tables `ppgWaveformSample`, `rawBatch`, `hrSample`, `gravitySample`, …) | **Empty of samples.** Only 1 `device` row (WHOOP 4.0 / "WHOOP"). Copied read-only (never opened the originals rw); the staging copy's data lived only in an uncheckpointed 804 KB WAL, which I reconstructed by replaying its 34 commit frames — still no sensor rows. **No raw PPG, IMU, or HR is persisted locally.** |
| **noop-cloud MCP mirror** (`vk-noop-cloud.fly.dev`) | Holds real `my-whoop` `hrSample`+`rrInterval` (through 2026-07-14), `my-whoop-noop` `sleepSession`, plus Oura/Apple `dailyMetric`. **Does not serve raw PPG waveform.** `imu_series` returns empty (no raw 6-axis offload for this strap). Source of `hr-day`, `hrv-series`, `hypnogram`. |
| **Repo capture fixtures** (`Packages/WhoopProtocol/Tests/…`) | Real hardware-captured decode fixtures. **Only source of raw PPG and 6-axis IMU.** Source of `ppg-hero` and `imu-segment`. |

### Raw PPG reality (updated 2026-07-16)
The note below was true through 2026-07-15: no *contiguous* raw-PPG waveform existed anywhere,
so `ppg-hero.json` used the real per-second **24-sample optical bursts** from the repo fixtures.
**As of 2026-07-14 that changed.** A fresh capture from Vishnu's own WHOOP **MG** offloaded the
strap's 2,140-byte raw optical deep buffers — a continuous multi-channel front-end at 25 Hz — over
a 13.7-hour session. That decode (workspace: `NOOP/optical-decode-2140/`) is the source of the
three new assets below (`optical-channels`, `ppg-continuous`, `hr-recovery`). The `ppg-hero.json`
burst is retained as the earliest optical beat in the story; the continuous PPG now sits beside it.
These are genuine ADC captures, byte-decoded, not decimated or interpolated or synthesized.

### `optical-channels.json` — raw 6-channel optical front-end (real, continuous)
- **Source**: WHOOP MG 2,140-byte raw optical offload buffer (record v20, type-0x2F), fw 50.40.1.0,
  captured 2026-07-14 from Vishnu's own strap. Decoded per `NOOP/optical-decode-2140/decode_findings.json`.
- **Shape**: 6 channels × **16 s @ 25 Hz** (400 samples/channel), sample-major.
- **Channels**: two green photodiodes, infrared, red, two ambient/dark references. Each AFE channel
  is 25 samples/buffer × 4-byte LE, 20-bit signed. **Optical channels inverted** to blood-volume
  convention (raw counts are light intensity; systole absorbs → counts drop). Each channel is
  auto-scaled independently on display, so DC offsets don't leak.
- **Caveat**: wavelength labels (green/IR/red) are **physics-inferred**, not proven (perfusion-index
  order + LED-coupling + MAX86171-class AFE); stated as inferred in the caption. Channel *count*,
  byte layout, and optical-vs-dark identity are byte-level proven.

### `ppg-continuous.json` — continuous recovered green PPG (real)
- **Source**: same 2,140-byte offload; the green channel R1 (offset 47), inverted.
- **Shape / span**: single channel, **45 s @ 25 Hz** (1,125 samples), from a calm, strong-pulse
  window (cardiac-band SNR selected). Downsampled at build time before reaching the browser.
- **Transformation**: byte-decode + negate (blood-volume convention). No filtering, no resampling.

### `hr-recovery.json` — optically-recovered HR vs strap ground truth (real)
- **Source**: HR tracked from the recovered green pulse (`NOOP/optical-decode-2140/trk_R1.npy`)
  vs the strap's own 1 Hz HR stream (`hr.csv`), same session.
- **Window**: one **5-minute resting window** (2026-07-14 evening PDT) where HR swings 53→102 bpm.
  `truth_bpm` = one strap reading per second; `recovered` = the tracker's ~1-per-10-s output.
- **Accuracy (computed over the window)**: **median abs error 1 bpm, 100% of recovered readings
  within 6 bpm.** Consistent with the decode's global rest-band figure (±2 bpm, README §3).
- **Honesty bounds**: optical HR is recovered **at rest only** (above ~104 bpm the pulse is
  physically swamped — a hardware wall, not a decode gap). Beat *counting* (mean HR) works;
  beat-to-beat **HRV/PRV is NOT recoverable** at 25 Hz and is not claimed anywhere.

---

## Files

### `ppg-hero.json` — raw optical PPG (real captured bursts)
- **primary**: WHOOP 5.0 **v26** verified-optical PPG (autocorrelation locks to heart rate; confirmed
  optical, not motion — see `Packages/WhoopProtocol/Tests/WhoopProtocolTests/Whoop5PpgWaveformTests.swift`).
  Two 24-sample bursts @ **24 Hz**, unix 1780917232 (2026-06-08T11:13:52Z) and 1780918392
  (2026-06-08T11:33:12Z). Decoded from the fixture frames' bytes `[27:75]` as i16-LE.
- **contiguous**: WHOOP 4.0 **v25** historical PPG — 3 consecutive-second records concatenated
  = **72 samples @ 24 Hz (~3 s)**, unix 1780958013 (2026-06-11T18:33:33Z). From
  `Whoop4HistoricalV25PpgTests.swift`, bytes `[25:73]` (pre-gravity@73).
- **Units**: raw AC-coupled ADC counts — PPG has no absolute unit; exposed verbatim.
- **Transformation**: none (no scaling, no resampling). These are repo test fixtures — real hardware
  captures, but **not necessarily from Vishnu's primary strap** (the v26 frames are WHOOP 5.0; his
  registered device is a 4.0). They carry no device name / serial / token.
- **Caveat**: for the v25 segment, the exact PPG byte-span is unpinned in-repo and HR must NOT be
  derived from it (a concatenation artifact manufactures a false 60 bpm). Use it as a waveform only.

### `imu-segment.json` — WHOOP 5.0 raw 6-axis IMU
- **Source**: `Whoop5RawImuTests.realFrameBytes` — one real 1244-byte type-0x2F offload buffer,
  fw 50.40.1.0 (`Packages/WhoopProtocol/Sources/WhoopProtocol/Whoop5RawImu.swift`).
- **Rate / span**: 100 Hz, **100 samples = 1.0 s**. baseTs 1784037165 = **2026-07-14T13:52:45Z**.
- **Channels**: `accel_x/y/z` in **g** (scale 1/4096 g per LSB), `gyro_x/y/z` in **deg/s**
  (scale 2000/32768). Columnar i16-LE at frame offsets ax@28 ay@228 az@428 / gx@640 gy@840 gz@1040.
- **Sanity**: median |accel| = 1.006 g (gravity shell — at/near rest), gyro near zero. Real, at-rest.
- **Transformation**: raw LSB × documented scale, rounded (accel 6 dp, gyro 4 dp). No filtering.
- **Note**: only **1 second** of real 6-axis IMU exists (the strap's live IMU stream is firmware-refused;
  this single offload buffer is the whole corpus). No 30–90 s IMU is available; not synthesized.

### `hr-day.json` — one full day of heart rate
- **Source**: noop-cloud `hr_series`, deviceId `my-whoop` (WHOOP), **bucketed at 60 s** (raw is ~1 Hz
  and truncates at 5000 pts; 60 s buckets give a clean full day).
- **Span**: **2026-06-30 local day** (2026-06-30T07:00:00Z → 2026-07-01T07:00:00Z), **1441 points**.
- **Fields per point**: `bpm_avg`, `bpm_min`, `bpm_max`, `n` (raw samples in bucket).
- **Values**: avg-bpm min/mean/max = 47 / 74.7 / 144 (the 144 is a real daytime effort spike).
- **Transformation**: server-side 60 s mean/min/max; reflects confirmed HR deletions.

### `hrv-series.json` — nightly HRV (RMSSD)
- **Source**: noop-cloud `sleep_summary`, deviceId `my-whoop-noop` (WHOOP), per-sleep-session `avgHrv`.
- **Span**: **20 sleep sessions, 2026-06-27 → 2026-07-14** (~2.5 weeks; includes naps + main sleeps).
- **Metric**: `rmssd_ms` (RMSSD from beat-to-beat R-R), plus `resting_hr_bpm`, `efficiency`, `duration_min`.
- **Values**: RMSSD 72.5 – 112.2 ms; resting HR 46 – 59 bpm.
- **SDNN**: **not included** — the cloud mirror does not serve `avgSdnn` (column empty). Omitted, not fabricated.

### `hypnogram.json` — one night's sleep stages
- **Source**: noop-cloud `sleep_detail`, deviceId `my-whoop-noop`, startTs 1782793007.
- **Night**: 2026-06-30T04:16:47Z → 2026-06-30T12:15:31Z (i.e. night of 2026-06-29→30 local, ~21:16→05:15 PDT).
- **479 min, efficiency 0.573, resting HR 50, avg HRV 103.7 ms. 61 stage segments.**
- **Stages**: `awake` / `light` / `deep` / `rem`. Totals (min): awake 100.2, light 269.0, deep 43.5, rem 66.0.
- **Transformation**: stage segments verbatim (`start`/`end`/`stage`). `stagesEdited:true` — the user
  hand-corrected bounds on this session. Only the hypnogram was taken; the decimated in-sleep HR array
  was dropped to keep the file small.

---

## PRIVACY NOTE — review before publishing

What these windows reveal about Vishnu (nothing was compiled beyond the files above):

- **Sleep schedule**: `hypnogram.json` exposes a specific bedtime/wake (~21:16 → ~05:15 PDT, night of
  Jun 29–30). `hrv-series.json` exposes **sleep-onset times for 20 sessions across Jun 27 – Jul 14**,
  including naps — i.e. a ~2.5-week picture of when he sleeps.
- **Resting physiology**: nightly resting HR (46–59 bpm), HRV (72–112 ms), and sleep efficiency
  (0.37–0.96). These are health metrics; low resting HR + high HRV read as "fit," but they are personal.
- **Daily activity**: `hr-day.json` (2026-06-30) shows the day's HR curve and a **144 bpm effort spike**
  (a workout) — reveals he exercised that afternoon.
- **A single moment**: `imu-segment.json` is a 1-second wrist snapshot at **2026-07-14 06:52 PDT**,
  at rest.
- **Location hint**: timezone **America/Los_Angeles** is embedded throughout (implies US West Coast).
- **Recency**: HR + hypnogram are ~2 weeks old (good). But the **IMU buffer (2026-07-14)** and the
  **last HRV session (2026-07-14)** are only ~1 day old — only one real IMU buffer exists, so an older
  one isn't available. Veto these if 1-day-old data is too fresh to publish.
- **Not included / deliberately excluded**: no name, email, device MAC, strap serial, or session token
  (verified none leaked). The mirror's baseline notes reference a private "performance-supplement
  protocol" and a resting-HR calibration gap — **none of that is in these files.** No Oura/Apple raw
  data included. No medical diagnosis.

All timestamps are UTC in the JSON (`*_iso`) with unix companions; local interpretation is Pacific.
