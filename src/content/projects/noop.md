---
slug: noop
title: "noop — what is the strap actually sending?"
role: "noop (17 PRs merged upstream) + noop-cloud (creator)"
summary: "Decode the bytes off a WHOOP, corroborate them against Oura and Apple Health, then make the result queryable by an agent without giving it silent write access."
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

NOOP is an offline, on-device WHOOP companion app by [@ryanbr](https://github.com/ryanbr) and contributors. I work in its sensor-protocol and analytics layers, with 17 pull requests merged upstream. This is not a fork nobody runs. noop-cloud is mine: a self-hostable MCP server that mirrors the health database and serves it to Claude, ChatGPT, or any agent.

Together they answer the question I actually cared about. Can I bring my own strap, ring, or watch, keep the data mine, and still have an agent reason over the full-resolution signals? Yes, but only if the signals first agree and the agent cannot silently rewrite them.

## The hard parts

**What are these bytes?** WHOOP 5.0 speaks an undocumented Bluetooth Low Energy protocol. I decoded the raw six-axis IMU offload into activity features (#455), captured the high-rate R22 deep buffers (#454), and persisted the raw optical PPG waveform (#415). Then I went a layer deeper. The strap's 2,140-byte optical record resolves into six photodiode channels at 25 Hz: two green, red, infrared, and two dark references. I decoded it down to the LED drive current and per-photodiode offset DACs. From the green channel I recovered a cardiac pulse that tracks the strap's own heart rate to a median error of 1 bpm at rest. The figures below are that signal, not a mockup.

**Which vendor is right?** None of them gets to be ground truth by default. WHOOP, Oura, and Apple use different sensors and algorithms, so I make the signals comparable and look for the contradiction. A heart-rate spike on a motionless wrist should not score as wake. I changed the sleep logic to require the IMU to corroborate it (#465, #402). An Oura importer was storing a 0–100 readiness score as beats per minute. Cross-device comparison exposed it, and I fixed the Swift and Kotlin twins (#365, #368, #376).

**Does the cleaned result go anywhere useful?** It writes back to Apple Health: sleep stages, heart rate, and workouts (#249). I also shipped Recovery Index and Activity Balance terms in the Charge score (#417), an opt-in workout classifier (#414), and a predictive low-battery alert (#250).

**Can an agent help without becoming another source of bad data?** noop-cloud separates read and write tokens and routes edits through propose, confirm, journal, and undo. The agent can find a bad score and propose a correction. Nothing changes until I confirm it, and nothing escapes the audit trail. The full server is its own study: [MCP tooling](/projects/mcp).

## What I'd do differently

<!-- DRAFT-RETRO: awaiting Vishnu sign-off -->
I reverse-engineered the BLE protocol from captured buffers without official docs. Next time, I would build the replayable capture-and-decode harness first. Firmware will change. I should be able to rerun the evidence instead of chasing the whole protocol again.
