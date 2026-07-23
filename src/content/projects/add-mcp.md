---
slug: add-mcp
title: "One bad deep merge bricked every Codex chat"
role: "Upstream contributor — add-mcp v2.0.0"
period: "July 2026"
summary: "I traced a configuration-corruption failure across Codex, Firecrawl CLI, and add-mcp, then shipped the atomic replacement fix across its TOML, JSON, and YAML writers."
stack:
  - "TypeScript"
  - "TOML + JSON + YAML"
  - "MCP client configuration"
links:
  - label: "Original fix PR #83"
    href: "https://github.com/neon-solutions/add-mcp/pull/83"
  - label: "Merged upstream in #86"
    href: "https://github.com/neon-solutions/add-mcp/pull/86"
  - label: "Firecrawl advisory #163"
    href: "https://github.com/firecrawl/cli/issues/163"
---

## The failure

I ran `firecrawl setup mcp`, and afterward OpenAI Codex could not create a single chat. The only clue was terse: `invalid configuration: url is not supported for stdio in mcp_servers.firecrawl`.

The Firecrawl entry in `~/.codex/config.toml` had become an impossible hybrid. It retained an old local `command`, `args`, and environment block while also gaining the new remote `type` and `url`. Codex classified it as stdio because `command` existed, rejected the remote URL, and treated the entire configuration file as invalid.

Removing the stale stdio fields brought Codex back. That fixed my machine, but not the mechanism that corrupted it.

## Following the write path

Firecrawl CLI did not write the configuration itself. Its setup command invoked `add-mcp`, an installer used to configure MCP servers across roughly 15 coding agents and drawing about 200,000 weekly npm downloads at the time.

All three of its configuration writers used the same recursive operation: deep-merge the incoming configuration into the existing file. That behavior was appropriate for preserving unrelated settings, but wrong at the server-entry boundary. Reinstalling a server under the same name merged two mutually exclusive transport shapes instead of replacing the old server.

I reduced the incident to a deterministic two-command reproduction against the published package. The generated TOML was byte-for-byte equivalent to the entry that had disabled Codex. The bug was also symmetric: either transport migration could leave fields from the other behind.

## Why the quiet version was worse

Codex failed loudly. JSON-based clients could accept the hybrid and continue launching the old local command while the user believed the remote server had been installed. That leaves stale code paths and potentially stale credentials in use without an error.

The migration that triggered the bug was not unusual. MCP servers are moving between local stdio packages and hosted endpoints, and reinstalling under the same familiar name is exactly what an upgrade command should do.

## The fix

My patch made server replacement atomic: before the normal file merge, delete any same-named server entry that the incoming configuration is about to write. Unrelated settings, sibling servers, and JSONC comments still survive; incompatible fields inside the replaced server do not.

I wired the behavior through the TOML, JSON, and YAML writers and added red-on-main, green-with-fix regression coverage for Codex, Cursor, and Goose. While doing that, I found an existing unit-test file that was never registered in the package's CI scripts and fixed that path too.

## Shipped upstream

I opened [PR #83](https://github.com/neon-solutions/add-mcp/pull/83) with the reproduction, implementation, tests, and the precise behavior change. The maintainer consolidated it into [PR #86](https://github.com/neon-solutions/add-mcp/pull/86), and the fix landed about two days later as the atomic-server-replacement change in add-mcp v2.0.0. The merged commit credits me as a co-author, the changelog links my original PR, and the closing comment thanks me by name.

The repository belongs to Neon, which is now part of Databricks. The important part to me is still the engineering route: fix the shared layer that owns the bug. A Firecrawl-only workaround would have protected one setup command; changing add-mcp protects every downstream installer and supported client using the same writer.
