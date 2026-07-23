---
section: selected-work
order: 2
heading: "Selected work"
lede: "Open-source systems spanning wearable data, MCP infrastructure, local speech, and proof auditing."
items:
  - title: "noop + noop-cloud"
    meta: "the flagship — raw Bluetooth to AI agents"
    body: "Decode the bytes off a WHOOP, check them against Oura and Apple Watch, query the result over MCP. 17 PRs merged upstream."
    href: "/projects/noop"
  - title: "add-mcp v2.0.0"
    meta: "upstream debugging — installer infrastructure"
    body: "Traced a bug that bricked every Codex chat across three codebases, then shipped the atomic TOML/JSON/YAML fix in the installer used by roughly 15 coding agents."
    href: "/projects/add-mcp"
  - title: "rhapsode"
    meta: "open-source Mac dictation"
    body: "The dictation app I used to write this page. Cloud transcription racing a local whisper.cpp fallback, with hallucination stripping backed by audio evidence."
    href: "/projects/rhapsode"
  - title: "arbiter"
    meta: "proof-audited LLM claims"
    body: "82.8% of checker-passing miniF2F proofs collapse to 16.3% genuinely valid once you audit for vacuous proofs. The negative result was the point."
    href: "/projects/arbiter"
  - title: "MCP tooling"
    meta: "noop-cloud + screencp"
    body: "Self-hostable MCP servers that put my own data behind Claude and ChatGPT — health metrics an agent can flag but never silently change, screen time I have to talk my way past."
    href: "/projects/mcp"
---
