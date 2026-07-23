---
slug: mcp
title: "MCP tooling — how much should an agent be allowed to do?"
role: "Creator — self-hostable MCP servers"
summary: "Two self-hostable MCP servers built around the same question: how do I let an agent touch real data without letting it quietly break anything?"
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

Both projects started with the same trust problem. I want an agent to do something useful with real personal data. I do not want it to silently change that data or invent authority it does not have. So what should it be allowed to see? What should require confirmation? What has to remain undoable?

The implementations are similar: Node and TypeScript over Streamable HTTP on a small Fly machine, bearer-token authentication, and a device or backup the server never fully controls. The hard part is the permission model.

## noop-cloud

A self-hostable MCP server mirrors my WHOOP, Oura, and Apple Health data and exposes 20 read tools and three prompts to any MCP client. I can ask, “How did I sleep this week?” and then drill into beat-to-beat heart rate, the full hypnogram, R-R interval HRV, and IMU motion. This is the agentic infrastructure for my biometrics.

Can the agent correct a bad score? It can propose one. It cannot confirm its own proposal. Confirmed edits live in an append-only overlay with a before-snapshot, and the uploaded mirror is never mutated. A read/write token split means shared agents and cron can flag a problem without gaining the authority to rewrite history.

The backup-upload path and live two-way sync path add real conceptual overhead. If I rebuilt it, I would make that split explicit much earlier instead of letting two ingestion models grow inside one mental model.

## screencp

A self-hosted MCP server pairs with a native iOS app holding Apple's Family Controls entitlement. The phone blocks the apps. To get back in, I have to talk to something that remembers the goal, logs the reason, and can say, “You have asked three times today.” The friction itself is the feature.

Apple gives the app an opaque `ApplicationToken`. Can the server see which apps are in the group? No, and that is good. A compromised server cannot exfiltrate the list. The model knows the group's name and nothing else, and it has to say so.

screencp is single-user by design and not safe to multi-tenant. Every row uses `user_id='default'`, and one device token is compiled into the binary. Making it multi-user is not that deep conceptually, but it has to be done completely: per-device credentials at registration and `user_id` threaded through every query.
