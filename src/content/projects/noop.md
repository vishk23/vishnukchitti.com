---
slug: noop
title: "Your health data, decoded and verified"
role: "noop (17 PRs merged upstream) + noop-cloud (creator)"
summary: "An open-source pipeline from raw Bluetooth to AI agents: decode the bytes off a WHOOP, check them against Oura and Apple Watch, query the result over MCP."
stack:
  - "BLE protocol reverse-engineering"
  - "Swift + Kotlin"
  - "MCP (Streamable HTTP)"
links:
  - label: "17 merged PRs"
    href: "https://github.com/ryanbr/noop/pulls?q=is%3Apr+author%3Avishk23+is%3Amerged"
  - label: "vishk23/noop"
    href: "https://github.com/vishk23/noop"
  - label: "vishk23/noop-cloud"
    href: "https://github.com/vishk23/noop-cloud"
---

## What it is

NOOP is an offline, on-device WHOOP companion app by [@ryanbr](https://github.com/ryanbr) and contributors. I work in its sensor-protocol and analytics layers, with 17 pull requests merged upstream — not a fork nobody runs. noop-cloud is mine: a self-hostable MCP server that mirrors the health database and serves it to Claude, ChatGPT, or any agent. Together they form a bring-your-own-device health stack: strap, ring, or watch, the data stays yours, and an agent can query it over MCP instead of you exporting CSVs.

## The hard parts

**Decoding.** The WHOOP 5.0 speaks an undocumented Bluetooth Low Energy protocol. I decoded the raw 6-axis IMU offload buffer into activity features (#455), captured the high-rate R22 deep buffers the strap uses for research-grade motion (#454), and persisted the raw optical PPG waveform so the signal survives past a single reading (#415). The IMU buffer rendered on this page streams at 100Hz — the number is the figure. Then I went a layer deeper into the optics: the strap's 2,140-byte raw optical offload resolves into six photodiode channels at 25 Hz — two green, red, infrared, and two dark references — which I decoded to the byte, down to the green LED drive current and the per-photodiode offset DACs. From that green channel I recovered a cardiac pulse that tracks the strap's own heart rate to within a beat at rest (median error 1 bpm), and pulled a respiration estimate off the pulse's amplitude. The figures below are that recovered signal, not a mockup.

**Cross-vendor verification.** No vendor is ground truth: WHOOP, Oura, and Apple measure with different sensors and different algorithms, so the work is making their signals comparable and catching when one is miscalibrated or misparsed. Nightly HRV that has to hold up night over night. Motion-corroborated sleep scoring: I only trust the heart-rate call when the IMU corroborates it, so a spike on a motionless wrist no longer scores as wake (#465, #402) — that's the beat you can watch in the figures below. And import fixes that sound trivial and were not: an Oura importer storing a 0–100 readiness score as bpm, found by corroborating Oura's numbers against the other vendors' signals, fixed across both the Swift and Kotlin codebases (#365, #368, #376).

**Writeback.** Clean data flows back out: Apple Health writeback for sleep stages, heart rate, and workouts (#249), so the verified result lands in the ecosystem people already use. Plus analytics upstream: Recovery Index and Activity Balance terms in the Charge score (#417), an opt-in workout-type classifier (#414), and a predictive low-battery alert (#250).

**Agent access.** noop-cloud exposes read tools and a propose/confirm/undo edit journal, split across read-only and read-write tokens. An agent can find and flag mis-scored data, but nothing changes without confirmation and nothing escapes the audit trail. The full server is its own study: [MCP tooling](/projects/mcp).

## What I'd do differently

<!-- DRAFT-RETRO: awaiting Vishnu sign-off -->
The BLE decoding was reverse-engineered from captured buffers without official protocol docs, so a replayable capture-and-decode test harness would make the next strap firmware revision far cheaper to chase.
