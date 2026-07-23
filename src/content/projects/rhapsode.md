---
slug: rhapsode
title: "rhapsode — the dictation app I actually use"
role: "Creator — open-source macOS app"
summary: "I use Rhapsode every day, including to write this page. It races fast cloud transcription against a local fallback and checks the audio before trusting suspicious text."
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

Why build another dictation app? Honestly, because I wanted one I would actually use. Hold `Fn`, talk, release, and clean text lands at the cursor in well under a second. I use it all day, every day. This voice profile and this page came through it.

Rhapsode is a signed and notarized macOS app, MIT-licensed, and built on [FreeFlow](https://github.com/zachlatta/freeflow) by [@zachlatta](https://github.com/zachlatta). I built the resilience stack, learning dictionary, modes, offline pipeline, and voice-bank direction.

## The hard part

Can it be fast without losing the dictation when the network dies? Cloud transcription with Groq's `whisper-large-v3-turbo` normally lands in about 0.6–0.9 seconds. At the same time, a local whisper.cpp fallback is ready behind a four-second hedge. A bad network costs a few seconds, not the whole thought.

Then there is honesty. Whisper likes inventing a trailing "Thank you." Did I actually say it? Rhapsode checks the audio energy in that segment's window. If there was no voice, the text never happened. Real sign-offs survive; hallucinations do not.

## What I'd do differently

<!-- DRAFT-RETRO: awaiting Vishnu sign-off -->
The fully local path still adds about 1.5 seconds and requires a manual `whisper-cpp` plus model install. That setup is doing too much. The next move is to make local transcription feel like a normal part of the app, not a side quest.
