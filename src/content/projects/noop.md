---
slug: noop
title: "noop — reverse-engineering a wearable's Bluetooth"
role: "Open-source contributor — 13 merged PRs into ryanbr/noop"
summary: "13 merged PRs into a 216★ offline WHOOP client — reverse-engineering the strap's raw Bluetooth internals."
stack:
  - "Swift + Kotlin"
  - "BLE protocol reverse-engineering"
  - "WHOOP 5.0/MG"
links:
  - label: "13 merged PRs"
    href: "https://github.com/ryanbr/noop/pulls?q=is%3Apr+author%3Avishk23+is%3Amerged"
  - label: "fork"
    href: "https://github.com/vishk23/noop"
---

## What it is

NOOP is an offline, on-device WHOOP companion app by [@ryanbr](https://github.com/ryanbr) and contributors — your strap, your data, your machine, no cloud. I don't own the base app; I work in its sensor-protocol and analytics layers. My contribution is 13 pull requests merged into `ryanbr/noop`, concentrated where the raw bytes come off the strap and turn into physiology.

## The hard part

The WHOOP 5.0/MG speaks a Bluetooth Low Energy protocol nobody documents. The interesting work was decoding it from captured buffers:

- **IMU offload buffer** — decoded the raw 6-axis accelerometer/gyro offload buffer into activity features (#455), and captured the high-rate R22 deep buffers the strap uses for research-grade motion (#454).
- **PPG waveform persistence** — persisted the WHOOP 5.0 v26 raw photoplethysmography waveform so the optical signal survives past a single reading (#415).
- **Motion-corroborated sleep scoring** — elevated heart rate on a motionless wrist used to score as WAKE. I cross-referenced the IMU evidence so a still wrist stays asleep (#465, #402) — this is the beat you watch on the interactive visualization.
- **Analytics and import correctness** — added Recovery Index and Activity Balance terms to the Charge score (#417), an opt-in coarse workout-type classifier (#414), and fixed a cluster of Oura import unit bugs where a 0–100 readiness score was being stored as bpm and efficiency wasn't a 0–1 fraction, across both the Swift and Kotlin codebases (#365, #368, #376). Also shipped a predictive low-battery alert (#250), Apple Health writeback for sleep stages / heart rate / workouts (#249), and a German-i18n CI fix (#303).

## What I'd do differently

<!-- DRAFT-RETRO: awaiting Vishnu sign-off -->
The BLE decoding was reverse-engineered from captured buffers without official protocol docs, so a replayable capture-and-decode test harness would make the next strap firmware revision far cheaper to chase.
