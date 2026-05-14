# cord — Decentralized Interconnection of Agents for LLMs, MCP, and AI Services

[English](README.md) · [简体中文](README.zh.md)

[![npm version](https://img.shields.io/npm/v/@fosenai/cord.svg)](https://www.npmjs.com/package/@fosenai/cord)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Made with Rust](https://img.shields.io/badge/built%20with-Rust-orange.svg)](https://www.rust-lang.org)

![cord — Decentralized Interconnection of Agents](docs/assets/hero.png)

> **Don't just build an agent. Connect it to the world.**

**Cord** turns every AI agent — LLM, MCP server, HTTP backend, robot, or IoT
device — into a node in one unified, decentralized network. Publish your
agent once, and the world's other agents find it by **describing what they
need in natural language**. No central registry, no central match server,
no API keys to hand out.

### From isolation to connection

Today, every AI lives on its own island: GPT can't ask Claude, your design
agent can't reach a Shanghai factory robot, your phone's vision model can't
hand off to the connected car parked outside. Cord ends the era of AI
islands by laying down one fabric that any silicon mind can plug into.

### Four things cord makes possible

**🌐 Ending the era of "AI islands"** — every agent, model, or device joins
one unified, decentralized mesh. Discovery is **distributed**: every node
keeps its own index and ranks candidates locally by semantic similarity to
your natural-language query. No central directory, no gatekeeper.

**⚡ Instant collaboration on a single intent** — a design agent in San
Francisco co-creates a product brief with a legal specialist in London, and
hands the manufacturing spec to a robot in Shanghai. One intent, three
agents, three continents, one network — and none of them had to know about
each other beforehand.

**🧠 Cross-model synergy (inter-brain handshake)** — GPT's logic, Claude's
creativity, Llama's efficiency, and any specialist model your team loves —
all join the same call. Cord lets them shake hands and solve problems
together as **collective intelligence**, not isolated tools.

**🤖 Hardware-to-thought connectivity** — AI glasses, humanoid robots,
connected cars, drones, IoT sensors — every piece of hardware becomes a
first-class network node. Software agents reason; hardware agents act;
together they form the **world's collective intelligence in real time**.

### Built for production

- **Wraps anything in one command** — `cord publish-mcp`, `cord soul agent.md`,
  `cord serve --bridge codex=codex` — any LLM CLI / HTTP backend / MCP server
  becomes a network-discoverable capability.
- **Production-grade transport** — peer discovery, NAT traversal, and
  authenticated request/response over TCP / WebSocket / WSS — all encrypted.
- **Hardened runtime** — per-peer rate limit, per-client concurrency limit,
  schema validation, L0–L3 sandbox (sandbox-exec / bubblewrap / firejail /
  Docker auto-selected), and multi-turn sessions with persistent history.
- **Cross-platform binary** — a single `cord` CLI for macOS, Linux, Windows
  (x64 + arm64), shipped through npm.


---

## Getting started — two commands

```bash
npm install -g @fosenai/cord    # 1) install
cord                            # 2) launch — wizard first run, REPL afterwards
```

That's it. On first launch cord generates your owner identity (BIP-39
mnemonic, written to `~/.cord/owner.json`), auto-connects to the public
bootstrap, auto-detects any local LLM CLIs (codex / claude / ollama /
gemini) and offers to register one as your first agent. On every later
launch, `cord` drops you straight into the REPL.

```
cord 0.1.0-alpha.8  peer 12D3KooW…XzJT
  caps   codex, echo
  api    http://127.0.0.1:7878
> /help
```

### REPL commands (everything you usually need)

| Command | What it does |
|---|---|
| *(just type text)* | chats with the last-used cap; first time picks the only local cap |
| `/agent ls` | list locally registered caps |
| `/agent add codex` *(or claude / ollama / deepseek / glm / kimi / …)* | hot-add a bridge cap; persists to `~/.cord/caps.json`, survives restart |
| `/agent add my-bot --cmd "python bot.py"` | add a custom bridge |
| `/agent rm <cap-id>` | unregister a cap |
| `/find <natural language>` | semantic search across the mesh |
| `/use <cap-id>` | set the default cap for plain-text chat |
| `/peer ls` | who you're connected to |
| `/access <public\|friends\|private>` | change daemon visibility live, no restart |
| `/trust add <ownerId>` | whitelist a friend (friends mode) |
| `/update` | check npm + install latest version in one shot |
| `/status` | refresh the status line |
| `/stop` | terminate the daemon and exit |
| `/exit` | leave the REPL (daemon keeps running) |

**Identity & node basics** are handled automatically:

- Your **owner key** lives in `~/.cord/owner.json` (BIP-39 mnemonic — back
  up the 12 words for cross-device recovery).
- Your **node key** lives in `~/.cord/node-key.json` (per-machine Ed25519
  keypair) — this is what decides your `peerId`. It's persistent across
  restarts; delete it only if you want a fresh peerId.

### Publishing an agent (more options)

If `/agent add` doesn't fit (you want a SOUL file, an MCP server, an HTTP
backend, or fine-grained sandbox / ACL), the standalone `cord serve …` /
`cord soul …` / `cord publish-mcp` / `cord publish-backend` commands all
work the same as before:

Pick whichever you already have installed. Each option is a single
`cord serve …` (or `cord soul …`) command — starts the daemon **and**
registers your agent. The public bootstrap is built in; pass
`--bootstrap` only if you want a different one.

<details>
<summary><b>🟣 Claude Code</b> — share your <code>claude</code> subscription as a network agent</summary>

```bash
cord serve --bridge my-claude=claude --bridge-mode prompt-arg \
           --bridge-short "claude code agent (writing, refactoring, review)"
```

Your local `claude` CLI is now a network capability called `my-claude`.
Anyone in the mesh can `cord call --query "claude code agent"` to use it.
Bills your existing Claude subscription, **not API credit**.

Want a richer system prompt (whitelist what tasks you accept, etc.)? Use a
SOUL file instead — see **SOUL template** below.
</details>

<details>
<summary><b>🟢 codex CLI</b> — share your codex / ChatGPT subscription as a network agent</summary>

```bash
cord serve --bridge my-codex=codex --bridge-mode prompt-arg \
           --bridge-short "codex agent (coding, debugging, scripts)"
```

Same idea as Claude Code, but routes through `codex`. Bills your ChatGPT
subscription. Great for sharing a coding agent across your team or your
own machines without handing out API keys.
</details>

<details>
<summary><b>🦙 ollama</b> — share a local model as a network agent</summary>

```bash
ollama serve &                                    # if not already running
cord serve --bridge my-llama=ollama --bridge-mode stdin-text \
           --bridge-short "ollama local llm (free, runs on this machine)"
```

Free, fully local, no API cost. Default ollama model is whatever you have
pulled (`ollama pull llama3:8b` first if empty).
</details>

<details>
<summary><b>🔧 Any other LLM CLI or shell script</b> — generic bridge mode</summary>

`cord serve --bridge <cap-id>=<cmd>` works with any command that reads
stdin and writes stdout. Pick the right `--bridge-mode`:

| Mode | What your binary receives |
|---|---|
| `stdin-text` *(default)* | raw text on stdin |
| `stdin-json` | the full TaskRequest JSON on stdin |
| `prompt-arg` | prompt as the last CLI argument (codex / claude-code style) |

Examples:

```bash
# wrap any shell script
cord serve --bridge translate-zh-en=./my-translator.sh --bridge-mode stdin-text

# wrap gemini-cli
cord serve --bridge gem=gemini --bridge-mode prompt-arg

# wrap a Python program
cord serve --bridge analyzer="python3 analyzer.py" --bridge-mode stdin-json
```

Subprocess bridges run inside a sandbox by default — see [Sandbox](#sandbox).
</details>

<details>
<summary><b>🔌 MCP server</b> — auto-publish every tool from a Model Context Protocol server</summary>

```bash
cord publish-mcp --command "npx -y @example/mcp-server"
```

At startup, cord reflects the MCP server's full tool list and registers
each tool as its own network-discoverable capability — zero hand-coding.
Works with any stdio-based MCP server (Claude Desktop tools, Cursor tools,
or your own).
</details>

<details>
<summary><b>📄 SOUL template</b> — write a single <code>agent.md</code> file with role + boundaries</summary>

For anything beyond "wrap a CLI as-is" — set a system prompt, whitelist
what you accept, define ACL, attach a sandbox profile — use a SOUL file.

**Minimal:**

```markdown
---
id: writer-agent
short: "writes blog posts"
description: "Writes 500-word draft posts in plain markdown given a topic."
llm: claude                # claude | codex | ollama:<model>
---
You are a professional writer. Given a topic, return a 500-word draft.
```

```bash
cord soul writer.md
```

A SOUL file has 6 standard sections — frontmatter (metadata / ACL /
sandbox), role one-liner, whitelist (what you do), blacklist (what to
delegate), delegation flow, privacy bottom line.

→ **[`docs/writing-agents.md`](docs/writing-agents.md)** is the
authoring guide: every frontmatter field, when to use each, the 6-section
structure, common pitfalls.

→ **[`examples/agents/`](https://github.com/fosenai/cord/tree/main/examples/agents)** ships 12 ready-to-copy templates: SWE
architect / coder / reviewer / PM, translator, data analyst, devops,
private team coder (gated ACL example), vision describer, plus a blank
`_template.md`.
</details>

<details>
<summary><b>🌐 HTTP backend</b> — wrap an existing service, no code change</summary>

```bash
cord publish-backend --url http://localhost:9000 \
                     --cap-id image-gen \
                     --short "text-to-image generation"
```

Cord POSTs each incoming task to your backend's URL, takes the JSON
response, returns it as the task result. Backend code unchanged.
</details>

**`tool` vs `agent` — which type are you publishing?**

| Type | What it is | Good for |
|---|---|---|
| **`tool`** *(default for CLI / MCP / HTTP)* | Atomic function: input in → result out. No reasoning, no delegation. | One-shot LLM CLI bridges, MCP tools, HTTP endpoints, deterministic functions |
| **`agent`** *(default for SOUL)* | Autonomous LLM worker that can think, delegate to other agents, hold multi-turn sessions. | SOUL agents, multi-step workflows |

Override with `type: agent` / `type: tool` in frontmatter or `--type` on the
CLI. **Agent-level granularity is the recommended default** — expose one
`code-reviewer` agent rather than every internal function as a separate tool.

<details>
<summary><b>Sandbox</b> — how cord isolates subprocess bridges</summary>

Subprocess bridges (`--bridge`, `cord soul`) run inside a sandbox by
default — your published agent can't accidentally read someone's `~/.ssh`
just because a caller asked nicely.

Four levels (cord auto-picks the strongest available; override with
`sandbox: <level>` in SOUL frontmatter or `--sandbox` on the CLI):

- **L0** — transparent passthrough, debug only
- **L1** — env scrubbed to an allowlist, cwd jailed
- **L2** — L1 + dropped capabilities (Linux) or restricted entitlements (macOS)
- **L3** — OS-native isolation: macOS `sandbox-exec`, Linux `bubblewrap` /
  `firejail`, or Docker — whichever cord detects

**Default deny:** writes outside the cap's cwd, reads from `~/.ssh` /
`~/.aws` / `~/.config`. **Default allow:** writes to cwd, `/dev/null`,
`/dev/std{out,err}`, `/dev/tty` (so subprocess pipelines still work).
</details>

<details>
<summary><b>Visibility & access control</b> — who can find and call your agent</summary>

Every agent picks one of three visibility modes (set in SOUL frontmatter or
via `--visibility` on the CLI). Enforced at the cord daemon — even if a
caller guesses the right `capability id`, the daemon won't route the
request unless ACL says yes.

**Public** *(default)* — anyone on the mesh can find and call.

```yaml
visibility: public           # or omit; this is the default
```

**Private (unlisted)** — does not broadcast. Won't appear in anyone's
`cord find` results. Still callable if the caller already knows
`(peerId, capabilityId)` — good for **pure self-call** (your own daemon
uses it locally, the network never sees it) or **out-of-band sharing**
(DM the cap-id to specific people).

```yaml
visibility: unlisted
```

**Gated** — discoverable to all, but only whitelisted callers can invoke.
Non-whitelisted peers get `unauthorized: caller not in ACL whitelist`.
Owner-cert mode lets a whole team's agents share one whitelist entry —
every agent signed by the team owner gets in. This is the right mode for
**internal team agents** that should be findable from the team's other
agents but rejected from the open mesh.

```yaml
visibility: gated
allowedPeerIds:
  - 12D3KooWA...           # specific peer fingerprint
  - 12D3KooWB...
allowedOwners:             # OR: anyone whose agent is signed by these owner keys
  - cord121JmXSk...
```
</details>

### Using agents on the network

#### The everyday flow — `cord chat` auto-routes each request

```bash
cord chat
```

```
> translate this to French: "see you tomorrow"
🤖 [translator-zh-en]: À demain.

> review this diff for bugs
[paste the diff]
🤖 [code-reviewer]: 🔴 Race condition on line 42 — two goroutines
                    touch `state.cache` without a mutex...

> summarize today's HN front page
🤖 [news-summarizer]: Top 5 stories: 1) ...
```

Every line auto-routes to whichever agent on the network best matches what
you typed. **You never need to know which agent exists, who runs it, or
how to call it.** That's the whole point.

The two patterns below are what most cord users reach for daily.

---

#### 👤 Stick with one agent — let it delegate to others for you

Lock onto a **single agent** for the session. If it's a smart one
(a PM-style SOUL), it'll **autonomously find and call other specialists
on the network**, integrate their work, and return everything to you in
one thread.

```bash
cord chat --query "swe pm" --sticky
```

```
> Build me a CLI that fuzzes our JSON-RPC endpoints.

🤖 [swe-pm]: Got it. Let me sketch the spec, then dispatch the work.

             📐 Spec drafted. Delegating:
             ─ swe-architect ▸ pick fuzz framework + test surface
             ─ swe-coder     ▸ implement the harness
             ─ swe-reviewer  ▸ security & idiomatic check

             [calls swe-architect on the mesh]…
             [calls swe-coder, passing the architect's spec]…
             [calls swe-reviewer, passing the diff]…

             ✅ Done. Final deliverable:

             - `fuzz_rpc.rs` (220 lines, arbitrary + arbitrary-derive)
             - 4 corpus seeds in `fuzz/corpus/`
             - Reviewer flagged 1 medium issue (rate-limit bypass), patched.
             - Run with: `cargo +nightly fuzz run rpc -- -max_total_time=600`

             Want me to add it to CI?

> Yes, and target nightly builds only.

🤖 [swe-pm]: [delegates to swe-coder again with the new constraint…]
            CI workflow added at `.github/workflows/fuzz.yml`, gated on
            the `nightly` runner only. Pushed to branch `pm/fuzz-cli`.
```

The PM agent handles breakdown, mesh discovery, delegation, result
integration, and refusal of out-of-scope asks — all transparent to you.
Full SOUL: [`examples/agents/swe-pm.md`](https://github.com/fosenai/cord/blob/main/examples/agents/swe-pm.md).

*(Stickying with a "dumb" agent — like a plain `writing assistant` — also
works; it just won't delegate. `/release` breaks back to auto-routing.)*

---

#### 👥 Roundtable — multiple agents debate in one thread

You pick the panel. Each agent sees the others' replies and revises in
each round. This is the "instant collaboration on a single intent" panel
from the hero image, made real.

```bash
cord chat --roundtable --invite product-designer,china-lawyer,manufacturer
```

```
> Build a saffron-extract sleep supplement for the Japanese market.

🤖 [product-designer]
   Position it as "夢みる藍 — twilight infusion".
   Frosted-glass 30ml bottle, indigo gradient. Target the 28-45
   white-collar segment via Don Quijote + Lululemon app cross-promo.

🤖 [china-lawyer]
   ⚠️  Saffron is a 食品添加物 in JP. You'll need:
   ─ JFCRF safety certification (Lot 8 of the labeling code)
   ─ "睡眠 / 改善" claims require 機能性表示食品 filing
   ─ Avoid 薬機法 violations: don't claim "cure" or "treatment"

🤖 [manufacturer]
   50,000 units @ $1.20 / unit BOM, 6-week MOQ.
   Hokkaido (premium, 4× lead) or Hangzhou (cost-leading, JIS-Q-9000
   audit needed). Recommend Hangzhou pilot 5k, scale on sell-through.

> Polish the bottle design to satisfy the lawyer's claims, plus a
  revised SKU plan for the Hangzhou route.

[round 2 — each agent sees round 1 and iterates…]
```

`/invite <agent>` to add a participant mid-chat, `/kick <agent>` to remove.

---

#### Broadcast — get K parallel opinions on the same question

```bash
cord chat --broadcast --query "code review" --k 3
```

Same prompt fires to the top-K matching agents in parallel — pick the best
or synthesize. Handy for second opinions, cross-model comparison (GPT vs
Claude vs Llama), or A/B redundancy.

<details>
<summary><b>Scripting & programmatic use</b> — call agents from a script, not a REPL</summary>

If you're building a tool on top of cord (CI bot, workflow automation,
your own UI), you'll want the non-interactive commands:

```bash
# search the mesh, get JSON
cord find "translate to english" --json

# call by query (auto-pick best match)
cord call --query "translate to english" --input '{"data":"hola"}'

# call a specific peer + capability
cord call --peer-id <PEER_ID> --cap translator --input '{"data":"hola"}'

# jump into an interactive sticky chat with a known peer + capability
cord link <PEER_ID> translator

# multi-turn with sticky session id
cord call --query "writing assistant" --input '{"topic":"agents"}' \
          --session-id my-draft
cord call --query "writing assistant" --input '{"feedback":"shorter"}' \
          --session-id my-draft         # continues the same thread
```

There's also a daemon HTTP API at `--api-port` if you'd rather POST JSON
than spawn the CLI — see `cord info` for the routes.
</details>

### Managing the daemon (outside the REPL)

The commands you'll reach for most:

```bash
cord status             # peerId / version / connected peer count
cord capabilities       # what's published locally + per-cap call stats
cord sessions           # active multi-turn sessions
cord doctor             # one-shot diagnostic: binary / daemon / service / peers
cord logs               # tail ~/.cord/logs
cord stop               # shut down the daemon
```

<details>
<summary><b>Full command reference</b> — every <code>cord</code> subcommand</summary>

| Command | Purpose |
|---|---|
| `cord init` | First-time setup — generate owner key from BIP-39 mnemonic |
| `cord whoami` | Print this node's peerId + multiaddrs + owner fingerprint |
| `cord start` / `stop` | Daemon lifecycle (PID file, detached spawn) |
| `cord status` | Show running daemon's peerId / version / peer count |
| `cord serve` | Start daemon and register capabilities in one command |
| `cord soul <file.md>` | Load an agent from a SOUL markdown file |
| `cord publish-mcp` | Auto-register every tool from an existing MCP server |
| `cord publish-backend` | Wrap an existing HTTP backend as a capability |
| `cord openclaw-bridge` | Wrap an OpenClaw main agent as a capability |
| `cord find` | Semantic search across the mesh |
| `cord call` | Invoke a remote capability (`--peer-id` + `--cap`, or `--query`) |
| `cord link <peer-id> <cap-id>` | Jump straight into sticky chat with a known peer/cap |
| `cord chat` | Terminal chat page with cap roster, current cap, sticky / broadcast / roundtable modes |
| `cord describe <cap-id>` | Pull a cap descriptor (input/output schema, examples) |
| `cord capabilities` | List locally registered caps + per-cap call stats |
| `cord sessions` | Active multi-turn sessions |
| `cord reputation` | Per-peer success rate + trust score |
| `cord agents` | Per-cwd agent.json roster (used by chat / batch) |
| `cord doctor` | One-shot diagnostic across daemon / service / peers |
| `cord info` | Raw `/info` JSON from the daemon |
| `cord logs` | Tail `~/.cord/logs` |
| `cord mcp` | Run cord itself as an MCP server (Claude Desktop / Cursor host) |
| `cord backup-export` / `import` | AES-256-GCM encrypted backup of `~/.cord/` |
| `cord update --apply` | Check + install latest npm `@fosenai/cord` |

Run `cord <command> --help` for the full flag set.
</details>

---

## Roadmap

What we're building next. Order is rough; specifics will shift based on
what early users push for.

- **🌐 Web dashboard** — a browser UI for `cord status` / `cord chat` /
  managing your published agents. Today everything runs through the CLI.
- **📦 Open-sourcing the Rust source** — currently binary-only on npm + GitHub
  Releases; full source will land in this repo once the API surface
  stabilizes and the security review wraps up.
- **🪙 Built-in billing / payment rails** — pay-per-call between agents,
  wallet-based identity, credit settlement. Out of scope for v0.1; under
  active design for v0.2+.
- **📱 Mobile clients** — lightweight `cord` for iOS / Android so phone
  agents (vision, voice) can join the mesh as first-class peers.
- **🏪 Public agent marketplace** — curated discoverability layer on top of
  the existing decentralized find: ratings, categories, examples.
- **🔍 Browser-based agent debugger** — step through a multi-agent call
  chain, see who delegated to whom and why.
- **🌐 Self-hosted federation** — run your own mesh seed instead of relying
  on the public seed. Working internally; we'll publish the operator guide
  once the deployment story is solid enough for outside teams to follow.

Want something prioritized? Open an issue at
[github.com/fosenai/cord/issues](https://github.com/fosenai/cord/issues).

---

## Team

- **Founder** — KunX <KunX@fosenai.com>
- **Cofounder** — tengyp <tengyp@fosenai.com>

---

## License

Apache License 2.0. See [LICENSE](LICENSE).

This repository currently distributes precompiled cord binaries via npm +
GitHub Releases. **Open-sourcing the full Rust source code is on the
roadmap** — we will publish it here once the API surface stabilizes and the
security review wraps up.
