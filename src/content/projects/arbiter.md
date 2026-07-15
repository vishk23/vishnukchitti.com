---
slug: arbiter
title: "arbiter — formal verification for paper claims"
role: "Creator — open-source"
summary: "82.8% of checker-passing miniF2F proofs collapse to 16.3% genuinely valid once you audit for vacuous proofs. The negative result was the point."
stack:
  - "Python"
  - "Z3 / Knuckledragger"
  - "Multi-provider LLM debate"
links:
  - label: "repo"
    href: "https://github.com/vishk23/arbiter"
  - label: "pip install arbiter-debate"
    href: "https://pypi.org/project/arbiter-debate/"
---

## What it is

An open-source tool (`pip install arbiter-debate`) that points at a paper's PDF, extracts every claim, attempts machine verification of the encodable mathematical ones, and stages structured multi-agent debates across OpenAI, Anthropic, Google, and Grok to expose the gap between what a paper proves and what it claims. Includes a systems paper.

## The hard part

The trust boundary. LLM claim-extraction and formalization are untrusted heuristics; only machine-checked proof certificates are trusted — and the central finding is how far apart those two are. On the audited miniF2F pipeline, **82.8% of problems pass the checker, but auditing every proved result for vacuous and trivial proofs collapses that roughly 5x to 16.3% genuinely valid.** Building the auditor that surfaces that gap — the vacuous-proof taxonomy, the per-turn validity gate, the multi-provider judge panel — was the real engineering, because "the checker returned UNSAT" is a much weaker claim than it looks.

## What I'd do differently

Take the checker-passing number less seriously, sooner. The README is candid that the case studies are N=3 single runs with no gold labels and that the faithfulness of LLM-generated Z3 encodings is the open problem; I'd invest earlier in gold-labeled encodings so "genuinely valid" isn't a manual audit every time.
