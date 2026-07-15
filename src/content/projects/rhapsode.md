---
slug: rhapsode
title: "rhapsode — open-source Mac dictation"
role: "Creator — open-source macOS app"
summary: "The dictation app I used to write this page. Cloud-fast when the network's good, on-device when it isn't, and it talks back in your own voice."
stack:
  - "Swift (macOS)"
  - "Groq whisper-large-v3-turbo"
  - "whisper.cpp offline fallback"
links:
  - label: "repo"
    href: "https://github.com/vishk23/rhapsode"
  - label: "download Rhapsode.dmg"
    href: "https://github.com/vishk23/rhapsode/releases/latest"
---

## What it is

A macOS dictation app: hold `Fn`, talk, release, and clean text lands at your cursor in well under a second. Signed and notarized DMG, MIT-licensed, built on [FreeFlow](https://github.com/zachlatta/freeflow) by [@zachlatta](https://github.com/zachlatta) — the resilience stack, learning dictionary, modes, offline pipeline, and voice-bank direction are mine.

## The hard part

Latency and honesty at the same time. Cloud transcription (Groq `whisper-large-v3-turbo`, ~0.6–0.9s) races a local whisper.cpp fallback that kicks in after a 4-second hedge, so a slow or dead network costs seconds, not your dictation. And Whisper's infamous trailing "Thank you." is stripped using audio evidence — if there was no voice energy in that segment's window, it never happened — so deliberate sign-offs survive but hallucinations don't.

## What I'd do differently

<!-- DRAFT-RETRO: awaiting Vishnu sign-off -->
The offline path adds ~1.5s per dictation and requires a manual `whisper-cpp` + model install, so lowering the friction (or the latency) of the fully-local path is the obvious next lever.
