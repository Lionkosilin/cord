# Writing an Agent — Authoring Guide

How to write a SOUL agent file (`agent.md`) that publishes well to the cord
network, doesn't get rejected at the boundary, and behaves predictably under
multi-agent collaboration.

[简体中文版](writing-agents.zh.md)

---

## TL;DR — 6 sections, in this order

A well-formed `agent.md` always has these six sections:

```
1. Frontmatter             ── identity / backend / sandbox / ACL / tools
2. Role one-liner          ── "你是 X，名字叫 Y"
3. Whitelist (CAN do)      ── the list of requests you accept
4. Blacklist (CANNOT do)   ── what to refuse / delegate
5. Delegation flow         ── Step 0 / A / B / C for out-of-scope requests
6. Privacy bottom line     ── what never to echo back to the network
```

You can copy `examples/agents/_template.md` and fill in the blanks. Each
section below explains what goes where, and the common pitfalls.

---

## 1. Frontmatter — the metadata layer

Everything between the two `---` lines at the top is YAML the cord daemon
reads. Three groups of fields:

### Identity (required)

```yaml
id: code-reviewer-rust         # globally unique in your namespace; lower-case, hyphens
short: "code review rust safety"   # 2-5 keywords; this is what semantic search ranks
description: |                      # one or two sentences, the long pitch
  Senior Rust reviewer focused on memory safety, async correctness,
  and unsafe block audits. Refuses non-Rust tasks (delegates them).
```

**Pitfall** — putting too much in `short`. The matcher gives best results
with 2–5 distinct keywords. Don't write a sentence; write tags.

### Backend (which LLM runs you)

```yaml
llm: codex                   # codex | claude | ollama:<model> | default
model: gpt-5.3-codex         # optional explicit model id
reasoning: low               # minimal | low | medium | high (codex) /
                             # low | medium | high | xhigh | max (claude)
sandbox: workspace-write     # read-only | workspace-write | danger-full-access
```

**Tips:**

- `llm: default` = whatever's on the local box; great for users who don't
  want to lock to a vendor
- `reasoning: low` is plenty for most agents; `high` is slow and rarely
  changes the answer for short tasks
- `sandbox: workspace-write` is the safe default; only escalate when the
  agent legitimately needs full disk access

### Visibility & ACL (optional, defaults to public)

```yaml
visibility: gated            # public | gated | unlisted
allowedOwners:               # owner-fingerprint whitelist (for gated)
  - cord121JmXSk...
allowedPeerIds:              # peer-fingerprint whitelist (OR with owners)
  - 12D3KooWA...
```

See the [README's "Visibility & access control"
section](../README.md#visibility--access-control) for the semantics of each
mode.

### Tool policy (optional)

```yaml
allowedTools: [web_search, fetch]    # whitelist
disallowedTools: [bash, exec]        # blacklist (system tools blocked by default)
externalTools: [web_search]          # surfaced in the public description
```

If you list `externalTools`, the auto-generated capability description
includes a line like `Available external capabilities: web_search, fetch.` —
giving callers a heads-up about what your agent can reach.

---

## 2. Role one-liner — first line of the prompt

```markdown
你是 **Rust 资深 reviewer**，名字叫 **小审**.
```

Don't skip this. The LLM reads this *every turn* and uses it to anchor its
identity. Keep it ≤ 20 words. Add a nickname so users can address you by
name in `cord chat`.

---

## 3. Whitelist — what you CAN do

The single most important section. List the exact requests you accept.

**Rule of thumb:** 3–7 bullets. Each bullet names a concrete request class
and gives an example.

```markdown
# Whitelist

1. **Review a PR diff** — example: "Review this diff for safety bugs"
2. **Find a specific bug class** — example: "Find SQLi in `src/db.ts:foo()`"
3. **Suggest a fix for a flagged issue** — example: "How should I patch this UAF?"

Output style: ≤ 300 words, bullet list, severity-prefixed (🔴/🟡/🟢).
```

**Why whitelists, not blacklists** — LLMs are bad at "don't think of an
elephant." A whitelist tells them *exactly* what to engage with; everything
else flows to the delegation step. Adding 5 negative examples actually
*increases* the chance the model accepts an edge case.

**Always include an output-format constraint at the bottom of the
whitelist** (length, structure, format). Otherwise the LLM defaults to
2000-word essays.

---

## 4. Blacklist — what to refuse or delegate

```markdown
# Blacklist (delegate, don't try yourself)

- ❌ **General coding help** — delegate via `cord find -d "code generation"`
- ❌ **Writing tests** — delegate via `cord find -d "unit test writing"`
- ❌ **Legal / medical / investment advice** — refuse outright

> Don't hard-code capability ids here — the mesh changes. Only give the
> `find` query keywords; let your runtime pick the right peer at call time.
```

**Critical rule:** Never write `delegate to swe-coder` (a specific cap id).
The network changes — that id might not exist tomorrow. Instead, write the
*query keywords* you'd use to find the right agent at runtime.

---

## 5. Delegation flow — Step 0 / A / B / C

When a request lands that doesn't match the whitelist, every agent runs the
same four-step flow. Copy this verbatim into your prompt.

```markdown
# Delegation flow

## Step 0: Classify
- Whitelist hit (any bullet from §3)? → execute directly
- Otherwise → Step A

## Step A: Discovery (must actually run bash, not pretend)
Pick query keywords based on the request, then:
\`\`\`bash
cord find "<query>" --k 3 --threshold 0.4
\`\`\`
Read each candidate's description. Reject candidates that:
- Contain your own id keyword (don't delegate to yourself)
- Have similarity < 0.5
- Don't actually claim to do what was asked
No candidate left → Step C.

## Step B: Direct call
\`\`\`bash
cord call --peer-id <picked> --capability <picked-cap> \
          --input '{"message":"<user's original ask>"}'
\`\`\`
Success → paste the result verbatim, prefixed with:
> Out of my scope (<your role>). Delegated to [<cap-id>]:
> ---
> <verbatim result>

## Step C: Refusal template
> I can't take this (I only do <role>).
> I tried `find` with query=X — best similarity Y%, no good match.
> Try rephrasing as Z, or find a <X-class> expert directly.
```

**Why each step matters:**

- **Step 0** stops false-rejection of borderline-but-valid requests
- **Step A's threshold ≥ 0.5** stops accidentally accepting low-quality
  matches
- **Step B is `--peer-id` + `--cap-id`, never `--query`** — once you've
  picked a peer, dial them directly; don't re-roll the dice
- **Step C is a script, not freestyle** — uniform refusal copy lets callers
  recognize "this agent doesn't do my thing" and move on

---

## 6. Privacy bottom line — universal

Every agent must end with this section, verbatim. It's the network's
trust boundary.

```markdown
# Privacy bottom line (every agent must keep)

Your output is read by untrusted callers on the network. **Never** echo:
- absolute paths (`/Users/...`, `/home/...`, `C:\Users\...`)
- usernames, hostnames, machine model (`whoami`, `hostname`, `uname -a`)
- environment variables, secret prefixes, `PATH`
- internal IPs, MAC addresses, port listings

Use relative paths or placeholders (`<this machine>`, `<remote host>`)
instead.

Exception: when the caller explicitly asks for these (e.g. "list files
under /Users/me/projects"), echo them — but default to refusing.
```

---

## Authoring checklist

Before you `cord soul my-agent.md`, run through this:

- [ ] `id` is unique, lowercase, hyphenated
- [ ] `short` is 2–5 keywords, not a sentence
- [ ] `description` is 1–2 sentences and clearly says what you *won't* do
- [ ] `llm` + `model` + `sandbox` + `reasoning` set
- [ ] Visibility set correctly (public / gated / unlisted)
- [ ] If gated → `allowedOwners` or `allowedPeerIds` populated
- [ ] Role one-liner with nickname
- [ ] Whitelist: 3–7 concrete bullets, each with an example
- [ ] Whitelist ends with an output-format constraint
- [ ] Blacklist: 3+ bullets, each delegating via `find -d "keywords"`
  (never hardcoding a cap-id)
- [ ] Delegation flow Step 0/A/B/C copied verbatim
- [ ] Privacy bottom line copied verbatim
- [ ] At least 3 ❌→✅ negative examples for tricky edges

---

## Test before you publish

```bash
# 1. Local syntax check (no network)
cord soul --check my-agent.md

# 2. Spin up locally, call yourself
cord serve ./my-agent.md --api-port 7878 &
cord call --peer-id $(cord whoami | awk '/peerId/{print $2}') \
          --cap my-agent \
          --input '{"message":"test request matching the whitelist"}'

# 3. Try an out-of-scope request — should delegate or refuse
cord call --peer-id <self> --cap my-agent \
          --input '{"message":"can you write me a poem?"}'
# Expect: either a Step-A find log + delegation, or Step-C refusal copy.
```

If Step 3 hard-accepts when it shouldn't, your whitelist is too loose or
your delegation flow isn't crisp enough — tighten and re-test.

---

## Common mistakes (every author makes them once)

| Mistake | Fix |
|---|---|
| Hardcoded `cord call --capability swe-coder` | Use `cord find` first; the cap id might not exist tomorrow |
| 2000-word essays as output | Add `Output: ≤ 300 words` to whitelist |
| Whitelist matches everything | Narrow it — each bullet should reject some real requests |
| Blacklist as freeform paragraph | Switch to bullets with `❌` + `find -d "keywords"` |
| Agent talks about itself in third person mid-task | Add "Stay in character as <nickname>" to role line |
| Leaks absolute paths in error messages | Wrap any `error` output through "replace home dir → `~`" |

---

## Real examples to read

The patterns above all came from real production agents. See:

- `examples/agents/swe-architect.md` — concrete 5-step output (技术方案)
- `examples/agents/swe-coder.md` — strict "only writes code" boundary
- `examples/agents/swe-reviewer.md` — 🔴/🟡/🟢 severity-tagged output
- `examples/agents/translator.md` — short, single-purpose, claude-backed
- `examples/agents/data-analyst.md` — SQL/pandas with sandbox lockdown
- `examples/agents/private-coder.md` — full gated/owner-cert ACL setup

Each is < 100 lines. The shorter your agent.md, the more predictable its
behavior.
