---
slug: mcp
title: "MCP tooling — noop-cloud & screencp"
role: "Creator — self-hostable MCP servers"
summary: "Two self-hostable MCP servers that put my own data behind Claude/ChatGPT — health metrics I can read and correct, screen time I have to talk my way past."
stack:
  - "Node 20 + Express"
  - "Streamable HTTP MCP"
  - "Fly.io + SQLite"
links:
  - label: "noop-cloud"
    href: "https://github.com/vishk23/noop-cloud"
  - label: "screencp"
    href: "https://github.com/vishk23/screencp"
---

Both are the same shape — a Node/TypeScript MCP server over Streamable HTTP on a small Fly machine, bearer-token auth, paired with a device (an iPhone, an Apple Health backup) that the server never fully controls. They demonstrate the same skill — designing safe, auditable AI-facing tool surfaces — in two domains, so one combined study is tighter than two thin ones.

The hard part in both is the same: letting an AI touch real data without letting it break anything.

## noop-cloud

A self-hostable MCP server that mirrors my WHOOP/Oura/Apple Health data and exposes 20 read tools and 3 prompts to any MCP client. Ask "how did I sleep this week?" in natural language; drill into beat-to-beat heart rate, the full hypnogram, R-R-interval HRV, and IMU motion. Node 20 + Express + SQLite, a couple dollars a month on Fly.

Edits go through a propose → confirm → journal → undo rail. The AI can only *propose*; nothing changes until you confirm with the write token. The uploaded mirror is never mutated — confirmed edits live in an append-only overlay with a before-snapshot, so the audit trail is complete forever. A read/write token split means shared agents and cron can propose but never confirm.

<!-- DRAFT-RETRO: awaiting Vishnu sign-off -->
The Path A / Path B split (backup-upload vs live two-way sync) adds real conceptual overhead, and whether that seam was worth it is his call.

## screencp

A self-hosted MCP server plus a native iOS app holding Apple's Family Controls entitlement. The phone blocks the apps; an LLM decides when to let you back in. 14 tools; the unlock requires talking to something that remembers your goal, logs the reason, and can say "you've asked three times today."

Apple hands the app an opaque `ApplicationToken` — the server literally cannot see which apps are in a group, by design, so a compromised server can't exfiltrate your app list. The whole UX is built around that constraint: the LLM knows a group's name and nothing else, and is instructed to say so.

screencp is single-user by design and, as its README says plainly, not safe to multi-tenant — every row is `user_id='default'` and one device token is compiled into the binary. Making it multi-user means per-device credentials minted at registration and threading `user_id` through every query.
