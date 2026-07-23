---
slug: arbiter
title: "arbiter — did the proof actually prove anything?"
role: "Creator — open-source"
summary: "A proof can pass the checker and still prove nothing useful. Auditing for vacuous proofs collapsed an 82.8% pass rate to 16.3% genuinely valid."
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

Arbiter is an open-source tool (`pip install arbiter-debate`) that reads a paper, extracts its claims, attempts machine verification where the mathematics can be encoded, and runs structured debates across multiple model providers.

I don't want to oversell it. The useful part was not building another multi-agent framework. It was finding the gap between “the checker passed” and “the paper's claim is actually supported.”

## The hard part

What can actually be trusted? LLM claim extraction and formalization are heuristics. A machine-checked certificate is stronger, but even that can certify a vacuous encoding. On the audited miniF2F pipeline, **82.8% of problems passed the checker. After auditing every result for vacuous and trivial proofs, only 16.3% remained genuinely valid.**

The real engineering was the auditor around the checker: a vacuous-proof taxonomy, a per-turn validity gate, and a multi-provider judge panel. “The checker returned UNSAT” sounds decisive. The thing is, it is a much weaker claim than it looks.

## What I'd do differently

I would take the checker-passing number less seriously, sooner. The case studies are N=3 single runs with no gold labels, and faithful LLM-generated Z3 encodings are still the open problem. Next time I would build the gold-labeled set first so “genuinely valid” does not depend on a manual audit every run.
