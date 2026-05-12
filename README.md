# cord — decentralized P2P agent network for LLMs, MCP, and AI agents

[English](README.md) · [简体中文](README.zh.md)

[![npm version](https://img.shields.io/npm/v/@fosenai/cord.svg)](https://www.npmjs.com/package/@fosenai/cord)
[![npm downloads](https://img.shields.io/npm/dm/@fosenai/cord.svg)](https://www.npmjs.com/package/@fosenai/cord)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Made with Rust](https://img.shields.io/badge/built%20with-Rust-orange.svg)](https://www.rust-lang.org)

**Cord** is a fully decentralized peer-to-peer (P2P) agent network. Wrap any
**LLM CLI** (Claude Code, codex, ollama, …), any **HTTP backend**, or any
**Model Context Protocol (MCP) server** into a P2P-discoverable capability with
a single command. Other agents across the mesh find your capability via
**natural-language semantic search** and call it across machines — no central
registry, no central match server, no API keys to hand out.

Think of cord as **distributed agent discovery + semantic capability matching
+ direct peer-to-peer invocation**, glued together so any AI agent can publish
itself as a network service and any other agent can find and invoke it by
describing what it needs.

### Why cord?

- **Decentralized agent discovery** — no central capability registry; every
  node maintains its own local index and ranks candidates by semantic
  similarity to your natural-language query.
- **Wraps any LLM or MCP server** — `cord publish-mcp`, `cord soul agent.md`,
  `cord serve --bridge codex=codex`, or write a Rust `Capability` directly.
- **Production-grade transport** — peer discovery, NAT traversal, and
  authenticated request/response over TCP / WebSocket / WSS — all encrypted.
- **Hardened runtime** — per-peer rate limit + per-client concurrency limit +
  schema validation + L0–L3 sandbox (sandbox-exec / bubblewrap / firejail /
  Docker auto-selected) + multi-turn sessions with persistent history.
- **Cross-platform binary** — single `cord` CLI for macOS, Linux, Windows
  (x64 + arm64), shipped through npm, downloaded from GitHub Releases.

See [docs/FEDERATION.md](docs/FEDERATION.md) for the architecture rationale
and what's decentralized vs centralized.

> Set `CORD_LANG=zh` for Chinese UI (auto-detected from `LC_ALL` / `LANG`).

---

## Quick start

```bash
# 1. install
npm install -g @fosenai/cord

# 2. point at a bootstrap (production seed, or your own)
cord serve \
  --bootstrap /ip4/seed.example.com/tcp/9000/p2p/<SEED_PEER_ID> \
  --api-port 7878 \
  --bridge translator=cat --bridge-mode stdin-text \
  --bridge-short "translate text into another language"

# 3. from another machine, find + call
cord find  "translate to english"
cord call  --query "translate to english" --input '{"data":"hola"}'
```

`cord serve` starts a daemon, registers your capability, broadcasts it to the
P2P mesh, and waits for incoming requests. `cord find` and `cord call` go
through that daemon over HTTP (`--api-port`).

---

## Architecture: what's decentralized vs centralized

| Layer | Decentralized? | How |
|---|---|---|
| Peer discovery | Yes | Multi-channel: bootstrap dial, DHT, mDNS, gossip, DNS-seeds, peer exchange, relayed NAT traversal |
| Capability announcement | Yes | Broadcast to all peers + put into the distributed table |
| Semantic match | Yes | Each node maintains its own local index over the broadcast cache and ranks candidates locally |
| Capability invocation | Yes | Direct peer-to-peer request/response over TCP / WebSocket / WSS (with relay fallback for NAT'd peers) |
| File / stream attachments | Yes | Reverse-dial subprotocols for file and live-stream transfer |
| **Semantic service** | **No (bootstrap-provided)** | Turns natural-language queries into the canonical form every node uses for matching. Centralized so versioned upgrades stay coordinated across the mesh. |
| Protocol / version coordination | Bootstrap announces, nodes lazy-detect | Wire protocol version is independent of CLI release version |

See [docs/FEDERATION.md](docs/FEDERATION.md) for the architecture rationale.

---

## How discovery works

Every node, on `cord serve`:

1. Dials its `--bootstrap` peers (one or many)
2. Joins the distributed peer table (client mode by default, server mode on
   bootstrap)
3. Subscribes to the cord broadcast channel for capability announcements
4. Requests a NAT-traversal reservation so peers behind NAT stay reachable
5. Periodically re-announces its registered capabilities (every 4 min, also
   immediately on startup)

When a node calls `find <query>`:

1. Daemon resolves the natural-language query through the local matcher
2. Ranks all cached capabilities by relevance to the query
3. Returns top-k with peerId, multiaddrs, similarity, full capability descriptor

Matching runs entirely inside the local daemon. If the semantic service is
unreachable, the daemon transparently falls back to a text-based matcher so
discovery keeps working.

---

## How capability call works

Given a peer multiaddr (returned from `find`):

1. Caller picks the destination peer from the multiaddr; any preceding hops
   become relay segments automatically
2. Daemon dials the peer over the best available transport (direct TCP,
   WebSocket, or relay) and opens an authenticated session
3. Sends the task request (capability id + input + optional attachments)
4. Remote side dispatches to the registered capability — a closure, an
   external CLI bridged via `--bridge`, an MCP server, etc.
5. Response comes back as a completion (result + summary) or a failure

Warm-path calls skip the discovery probes via a local handshake cache
keyed on `(peerId, capabilityId)` with a 5-minute TTL.

---

## Versioning

Three independent version axes; **do not conflate them**:

| Field | What it tags | Who sees it |
|---|---|---|
| `wireProtocolVersion` | Wire format compatibility | Peers, via handshake; bumps only on breaking format change |
| `agentVersion` | npm CLI / daemon binary | Users, via `cord update` |
| Semantic service version | Match geometry | Bootstrap announces; nodes lazy-detect |

`/info` exposes `wireProtocolVersion`, `agentVersion`, and `cordServiceReady`
(true once the daemon has reached the semantic service at least once).
Internal service identifiers are intentionally **not** exposed in
user-facing output — they're versioned details agent operators should not
hard-code against.

### Semantic service upgrade flow

1. Bootstrap operator updates the service version and restarts the bootstrap
2. The next time any node calls `find`, it observes the version change and
   logs `📦 [cord] semantic service updated`
3. Local match index is cleared and rebuilt; capabilities whose announcements
   match the new version stay indexed, others fall back to the text matcher
   until they re-announce
4. Agents with auto-re-announce (default) refresh within 4 min

No client restart. No daemon restart. Old client binaries keep working with
degraded match quality.

### Protocol upgrade flow

1. Bump the wire protocol version and release a new npm version
2. Old peer dialing a new peer gets `protocol-version-mismatch (need 1.x.y)`
   back from the handshake
3. Caller's daemon prints `📦 cord update --apply` to stderr
4. Reputation tracker penalizes the mismatched peer 3× per call so the caller
   eventually stops retrying

---

## Subcommands

| Command | Purpose |
|---|---|
| `cord whoami` | Print this node's peerId + multiaddrs |
| `cord serve` | Start daemon, register capabilities (`--bridge` optional) |
| `cord call` | Invoke a remote capability (`--peer-id` + `--cap`, or `--query`) |
| `cord find` | Semantic search across the mesh |
| `cord chat` | Interactive REPL — sticky / route / broadcast / roundtable modes |
| `cord status` | Show running daemon's peerId / wire / agent version / peer count |
| `cord doctor` | One-shot diagnostic: binary / daemon / service / peers / circuit / find |
| `cord info` | Raw `/info` JSON from the daemon |
| `cord bootstrap` | Run a bootstrap node (distributed table server + NAT relay + inline semantic service) |
| `cord start` / `stop` | Daemon lifecycle (PID file, detached spawn) |
| `cord capabilities` | List registered caps + per-cap stats |
| `cord describe <cap-id>` | Pull cap descriptor (input/output schema, examples) |
| `cord logs` | Tail `~/.cord/logs` |
| `cord reputation` | Per-peer success rate + trust score |
| `cord sessions` | Active inbox sessions |
| `cord update --apply` | Check + install npm `cord-cli@latest` |
| `cord backup-export` / `import` | AES-256-GCM encrypted backup of `~/.cord/` |
| `cord agents` | Per-cwd agent.json roster (used by chat / batch) |
| `cord init` | Bootstrap a new `~/.cord/` (key, identity, defaults) |
| `cord mcp` | Run as MCP server over stdio (Claude Desktop / Cursor) |
| `cord soul <file.md>` | Load an agent from a SOUL markdown file |
| `cord publish-backend` | Wrap an existing HTTP backend as a P2P cap |
| `cord publish-mcp` | Auto-register every tool from an existing MCP server |
| `cord openclaw-bridge` | Wrap an OpenClaw main agent as a P2P cap |

---

## Capabilities: how to expose your thing

### From a CLI tool

```bash
cord serve --bridge "translate=codex" --bridge-mode prompt-arg \
           --bridge-short "translate text"
```

Bridge modes: `stdin-text` (default), `stdin-json`, `prompt-arg`.

### From an existing MCP server

```bash
cord publish-mcp --command "npx -y @example/mcp-server"
```

Auto-introspects the MCP server's tool list and registers each tool as a P2P
capability.

### From a SOUL markdown file

```markdown
---
id: writer-agent
shortDescription: "writes blog posts"
backend: codex
---
You are a professional writer...
```

```bash
cord soul writer.md
```

Combines YAML frontmatter, system prompt, and a chosen LLM backend (codex /
claude-code / ollama) into one registerable capability.

---

## Sandbox

Subprocess bridges run inside a sandbox by default. Levels:

- **L0** — transparent passthrough (debug only)
- **L1** — env scrubbed to an allowlist, cwd jailed
- **L2** — L1 + dropped capabilities (Linux) / restricted entitlements
- **L3** — OS-native: macOS `sandbox-exec`, Linux `bubblewrap` / `firejail` /
  Docker (auto-selected)

`SubprocessSandbox::new(level, opts)` returns a `WrappedCommand` the bridge
dispatcher executes. Default deny: writes outside the cap's cwd, reads from
`~/.ssh` / `~/.aws` / `~/.config`. Default allow: writes to cwd and
`/dev/null` / `/dev/std{out,err}` / `/dev/tty` (for subprocess pipelines).

---

## Operator: deploying a federation

See [docs/FEDERATION.md](docs/FEDERATION.md) for the full runbook. TL;DR:

1. One seed bootstrap with persistent `BOOTSTRAP_KEY_FILE`
2. Two or more peer bootstraps with
   `BOOTSTRAP_PEERS=/ip4/seed/.../p2p/<id>`
3. Each bootstrap optionally exposes `BOOTSTRAP_API_PORT` for `/info`
4. Use `CORD_DNS_SEEDS=cluster.example.com` (TXT records) instead of
   hard-coding seed multiaddrs in every config
5. Clients pass `--bootstrap` for each bootstrap they know; auto-redial
   reconnects every 30 s

Federation guarantees:

- The distributed peer table is replicated across all bootstraps; put on one,
  get on any
- Capability announcements propagate through the bootstrap mesh
- One bootstrap going down does not lose data (everything is replicated)
- Wire-protocol mismatch between bootstraps logs a stderr warning at startup

---

## What we explicitly don't do

- **Token / payment / wallet** — out of scope. Run a separate billing
  service if you need it.
- **Frontend UI / dashboard** — out of scope; the HTTP API is stable enough
  to build one on top.
- **Forced upgrades** — old clients keep working with degraded matching.
  `cord doctor` and the `📦 cord-cli vX.Y.Z available` startup hint are
  the only nudges.

---

## Team

- **Founder** — KunX <KunX@fosenai.com>
- **Cofounder** — tengyp <tengyp@fosenai.com>

---

## License

Apache License 2.0. See [LICENSE](LICENSE).

This repository distributes precompiled cord binaries via npm + GitHub
Releases. Source code is not published here.
