---
slug: add-mcp
title: "One bad deep merge bricked every Codex chat"
role: "Upstream contributor — add-mcp v2.0.0"
period: "July 2026"
summary: "Why did one setup command brick every Codex chat? I traced the failure across Codex, Firecrawl CLI, and add-mcp, then shipped the atomic fix upstream."
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

I ran `firecrawl setup mcp`, and afterward OpenAI Codex could not create a single chat. What did a Firecrawl setup command have to do with every Codex chat? The only clue was terse: `invalid configuration: url is not supported for stdio in mcp_servers.firecrawl`.

The Firecrawl entry in `~/.codex/config.toml` had become an impossible hybrid. It retained an old local `command`, `args`, and environment block while also gaining the new remote `type` and `url`. Codex classified it as stdio because `command` existed, rejected the remote URL, and treated the entire configuration file as invalid.

Removing the stale stdio fields brought Codex back. Cool, but that only fixed my machine. What had actually corrupted the file?

## Following the write path

Was Firecrawl writing bad TOML? Not directly. Its setup command invoked `add-mcp`, an installer used to configure MCP servers across roughly 15 coding agents and drawing about 200,000 weekly npm downloads at the time.

All three configuration writers did the same thing: deep-merge the incoming configuration into the existing file. That makes sense for unrelated settings. It makes no sense for two mutually exclusive server transports. Reinstalling a server under the same name kept both shapes instead of replacing the old one.

I reduced the incident to a deterministic two-command reproduction against the published package. The generated TOML matched the entry that had disabled Codex byte for byte. At that point it was not a theory anymore. The bug was also symmetric: either transport migration could leave fields from the other behind.

## Why the quiet version was worse

Codex failed loudly, which was almost the better outcome. What happens in a JSON-based client that accepts the hybrid? It can keep launching the old local command while the user believes the remote server was installed. Stale code and potentially stale credentials stay in use, and nothing errors.

The trigger was not some weird edge case. MCP servers are moving between local stdio packages and hosted endpoints. Reinstalling under the same familiar name is exactly what an upgrade command should do.

## The fix

The rule became simple: merge the file, replace the server. Before the normal merge, remove any same-named server entry the incoming configuration is about to write. Sibling servers, unrelated settings, and JSONC comments survive. Stale transport fields do not.

I wired that behavior through the TOML, JSON, and YAML writers. Then I proved the bug red on main and green with the fix for Codex, Cursor, and Goose. In addition, I found an existing unit-test file that was never registered in the package's CI scripts and fixed that too.

## Shipped upstream

I opened [PR #83](https://github.com/neon-solutions/add-mcp/pull/83) with the reproduction, implementation, tests, and the precise behavior change. The maintainer consolidated it into [PR #86](https://github.com/neon-solutions/add-mcp/pull/86), and the fix landed about two days later as the atomic-server-replacement change in add-mcp v2.0.0. The merged commit credits me as a co-author, the changelog links my original PR, and the closing comment thanks me by name.

The repository belongs to Neon, which is now part of Databricks. The thing is, a Firecrawl-only workaround would have protected one setup command. Fixing add-mcp protects every downstream installer and supported client using the same writer. Fix the layer that owns the bug.
