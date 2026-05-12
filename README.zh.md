# cord —— 面向 LLM、MCP 与 AI agent 的去中心化 P2P 智能体网络

[English](README.md) · [简体中文](README.zh.md)

[![npm version](https://img.shields.io/npm/v/@fosenai/cord.svg)](https://www.npmjs.com/package/@fosenai/cord)
[![npm downloads](https://img.shields.io/npm/dm/@fosenai/cord.svg)](https://www.npmjs.com/package/@fosenai/cord)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Made with Rust](https://img.shields.io/badge/built%20with-Rust-orange.svg)](https://www.rust-lang.org)

**Cord** 是一个完全去中心化的点对点（P2P）智能体网络。一条命令就能把任意
**LLM CLI**（Claude Code、codex、ollama 等）、任意 **HTTP 后端**、或任意
**Model Context Protocol（MCP）服务**包装成 P2P 可发现的能力。网络里
其他 agent 用**自然语言**就能找到你的能力并跨机器调用它 —— 不需要中心
注册表、不需要中心匹配服务器、不需要发 API key。

简单理解：cord = **分布式 agent 发现 + 语义能力匹配 + 直连调用**，三件事
捏在一起，让任何 AI agent 都能把自己发布成网络服务，也让任何 AI agent
通过描述需求就能找到并调用别人的能力。

### 为什么用 cord

- **去中心化的 agent 发现** —— 没有中心注册表；每个节点本地维护索引，
  根据你的自然语言描述按相关度排序候选 agent。
- **包装任意 LLM 或 MCP 服务** —— `cord publish-mcp`、`cord soul agent.md`、
  `cord serve --bridge codex=codex`，或者用 Rust 直接写一个 `Capability`。
- **生产级传输** —— 节点发现、NAT 穿透、带认证的请求响应都跑在 TCP /
  WebSocket / WSS 上，全程加密。
- **加固的 runtime** —— 每 peer 限流 + 每客户端并发上限 + Schema 校验 +
  L0–L3 沙箱（sandbox-exec / bubblewrap / firejail / Docker 自动选）+
  支持持久化历史的多轮会话。
- **跨平台二进制** —— 单一 `cord` CLI，macOS / Linux / Windows（x64 + arm64）
  全覆盖，通过 npm 发布，二进制从 GitHub Releases 拉取。

架构原理与"什么是去中心化、什么是中心化"详见
[docs/FEDERATION.md](docs/FEDERATION.md)。

> CLI 默认会根据 `LC_ALL` / `LANG` 自动判断语言，也可显式设
> `CORD_LANG=zh`。

---

## 快速开始

```bash
# 1. 安装
npm install -g @fosenai/cord

# 2. 接入 bootstrap（生产种子节点，或自己跑一个）
cord serve \
  --bootstrap /ip4/seed.example.com/tcp/9000/p2p/<SEED_PEER_ID> \
  --api-port 7878 \
  --bridge translator=cat --bridge-mode stdin-text \
  --bridge-short "translate text into another language"

# 3. 在另一台机器上，找到能力并调用
cord find  "translate to english"
cord call  --query "translate to english" --input '{"data":"hola"}'
```

`cord serve` 启动 daemon，注册你的能力，向 P2P 网络广播，并等待入站请求。
`cord find` 和 `cord call` 通过 daemon 的 HTTP API（`--api-port`）发起。

---

## 架构：什么是去中心化、什么是中心化

| 层 | 是否去中心化 | 说明 |
|---|---|---|
| 节点发现 | 是 | 多通道：bootstrap dial、分布式表、mDNS、广播、DNS-seeds、peer 交换、NAT 中继穿透 |
| 能力公告 | 是 | 向所有 peer 广播 + 写入分布式表 |
| 语义匹配 | 是 | 每个节点本地维护索引，本地排序候选；不出本机做匹配 |
| 能力调用 | 是 | 直接 P2P 请求/响应，TCP / WebSocket / WSS（NAT 时走中继） |
| 文件 / 流附件 | 是 | 文件与实时流的反向拉取子协议 |
| **语义服务** | **否（bootstrap 提供）** | 把自然语言转成网络里通用的匹配形式。中心化是为了让版本升级在整个网络协调一致。 |
| 协议 / 版本协调 | bootstrap 公告、节点惰性检测 | 线协议版本与 CLI 发布版本相互独立 |

详情参考 [docs/FEDERATION.md](docs/FEDERATION.md)。

---

## 发现是怎么跑的

每个节点 `cord serve` 启动时：

1. dial `--bootstrap` 节点（可多个）
2. 加入分布式 peer 表（默认 client 模式，bootstrap 节点是 server 模式）
3. 订阅 cord 的能力广播频道
4. 申请 NAT 穿透中继预约，让 NAT 后的节点也能被连入
5. 周期性重发已注册能力公告（每 4 分钟，启动时立即发一次）

当一个节点调 `find <query>`：

1. daemon 本地匹配器处理自然语言 query
2. 在缓存的能力里按相关度排序
3. 返回 top-k，附带 peerId、multiaddrs、相似度、完整能力描述符

匹配完全在本地 daemon 内完成。语义服务不可达时，daemon 自动回落到基于
文本的匹配器，发现仍能继续工作。

---

## 能力调用怎么跑

拿到一个 peer 的 multiaddr 后（来自 `find` 的结果）：

1. caller 从 multiaddr 里取出目标 peer，前面的跳数自动当中继段
2. daemon 通过最佳可用传输直连（TCP / WebSocket / 中继），打开认证会话
3. 发送任务请求（capability id + input + 可选附件）
4. 远端 daemon 调度到注册的 capability —— 可能是一个闭包、一个 `--bridge`
   桥接的外部 CLI、一个 MCP 服务，等等
5. 响应回到 caller：成功（result + summary）或失败

第二次往同一对 `(peerId, capabilityId)` 的调用走暖路径：本地 5 分钟 TTL
的 handshake 缓存直接跳过发现握手。

---

## 版本

三个版本轴，**互不相同，不要混用**：

| 字段 | 标识 | 谁看到 |
|---|---|---|
| `wireProtocolVersion` | 线协议格式兼容性 | peer 之间，握手时检查；只在格式不兼容时 bump |
| `agentVersion` | npm CLI / daemon 二进制 | 用户，通过 `cord update` 检查 |
| 语义服务版本 | 匹配几何 | bootstrap 公告，节点惰性检测 |

`/info` 暴露 `wireProtocolVersion`、`agentVersion` 以及 `cordServiceReady`
（daemon 至少触达过一次语义服务后变 true）。内部服务标识**不会**出现在
面向用户的输出里 —— 这是会随版本变的实现细节，业务方不应硬编码依赖。

### 语义服务升级流程

1. bootstrap 运维更新服务版本并重启 bootstrap
2. 下一次任何节点调 `find`，自动观察到版本变化，打印
   `📦 [cord] semantic service updated`
3. 本地匹配索引被清空重建；公告版本匹配新服务的能力继续可索引，其他
   能力回落到文本匹配，直到 re-announce
4. 默认开启了 auto re-announce 的 agent 会在 4 分钟内自动刷新

不需要重启 client。不需要重启 daemon。老二进制照样能用，只是匹配质量
轻微下降。

### 协议升级流程

1. bump 线协议版本，发新 npm 版本
2. 老 peer dial 新 peer 时，握手返回 `protocol-version-mismatch (need 1.x.y)`
3. caller 的 daemon 打印 `📦 cord update --apply` 到 stderr
4. Reputation tracker 对失败 3 倍计分，让 caller 尽快放弃重试

---

## 子命令

| 命令 | 用途 |
|---|---|
| `cord whoami` | 打印本节点 peerId + multiaddrs |
| `cord serve` | 启动 daemon、注册能力（可选 `--bridge`） |
| `cord call` | 调用远端能力（`--peer-id` + `--cap`，或 `--query` 语义查找） |
| `cord find` | 跨网络语义搜索 |
| `cord chat` | 交互式 REPL —— 支持 sticky / route / broadcast / roundtable 模式 |
| `cord status` | 显示运行中 daemon 的 peerId / 版本 / peer 数 |
| `cord doctor` | 一站式自检：二进制 / daemon / 服务 / peers / 中继 / find |
| `cord info` | daemon `/info` JSON 原始输出 |
| `cord bootstrap` | 运行 bootstrap 节点（分布式表 server + NAT 中继 + 内置语义服务） |
| `cord start` / `stop` | daemon 生命周期（PID 文件 + 后台启动） |
| `cord capabilities` | 列出本地已注册能力 + 每能力调用统计 |
| `cord describe <cap-id>` | 拉取能力描述符（input/output schema、示例） |
| `cord logs` | tail `~/.cord/logs` |
| `cord reputation` | 每 peer 成功率 + 信誉分 |
| `cord sessions` | 活跃多轮会话 |
| `cord update --apply` | 检查 + 安装 npm `cord-cli@latest` |
| `cord backup-export` / `import` | AES-256-GCM 加密备份 `~/.cord/` |
| `cord agents` | 按工作目录组织的 agent.json 名单（chat / batch 用） |
| `cord init` | 初始化新的 `~/.cord/`（key、身份、默认值） |
| `cord mcp` | 把 cord 作为 MCP server 跑（stdio；接入 Claude Desktop / Cursor） |
| `cord soul <file.md>` | 从 SOUL markdown 文件加载一个 agent |
| `cord publish-backend` | 把现有 HTTP 后端包装成 P2P 能力 |
| `cord publish-mcp` | 自动注册某个 MCP server 提供的所有 tool |
| `cord openclaw-bridge` | 把 OpenClaw 主 agent 包装成 P2P 能力 |

---

## 能力发布：怎么把你的东西暴露出去

### 从一个 CLI 工具

```bash
cord serve --bridge "translate=codex" --bridge-mode prompt-arg \
           --bridge-short "translate text"
```

Bridge 模式：`stdin-text`（默认）、`stdin-json`、`prompt-arg`。

### 从一个已有 MCP server

```bash
cord publish-mcp --command "npx -y @example/mcp-server"
```

自动反射 MCP server 的 tool 列表，逐个注册为 P2P 能力。

### 从 SOUL markdown 文件

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

把 YAML frontmatter、系统提示词、和选定的 LLM 后端（codex / claude-code /
ollama）组合成一个可注册的能力。

---

## 沙箱

Subprocess 桥默认跑在沙箱里。等级：

- **L0** —— 透明直跑（仅调试）
- **L1** —— env 按白名单清洗、cwd 锁定
- **L2** —— L1 + 删 capabilities（Linux）/ 限制 entitlements
- **L3** —— OS 原生：macOS `sandbox-exec`、Linux `bubblewrap` / `firejail` /
  Docker（自动选最优）

默认拒：写入 cap cwd 之外的路径、读 `~/.ssh` / `~/.aws` / `~/.config`。
默认允：写入 cwd 本身、写 `/dev/null` / `/dev/std{out,err}` / `/dev/tty`
（subprocess 管道需要）。

---

## 运维：部署联邦集群

完整 runbook 见 [docs/FEDERATION.md](docs/FEDERATION.md)。TL;DR：

1. 一个种子 bootstrap，配置持久化 `BOOTSTRAP_KEY_FILE`
2. 多个 peer bootstrap，配 `BOOTSTRAP_PEERS=/ip4/seed/.../p2p/<id>`
3. 每个 bootstrap 可选暴露 `BOOTSTRAP_API_PORT` 提供 `/info`
4. 用 `CORD_DNS_SEEDS=cluster.example.com`（TXT 记录）代替在每个配置里
   硬编码 seed multiaddrs
5. 客户端用 `--bootstrap` 列出已知的 bootstrap；自动重连每 30 s 一次

联邦保证：

- 分布式 peer 表跨所有 bootstrap 复制；任一台 put，任一台都 get 得到
- 能力公告在 bootstrap 网格里传播
- 单台 bootstrap 挂掉不丢数据（全部副本化）
- bootstrap 之间线协议版本不一致，会在启动时打 stderr 警告

---

## 我们明确不做什么

- **token / 支付 / 钱包** —— 不在范围内。需要计费就跑个独立服务。
- **前端 UI / dashboard** —— 不在范围内；HTTP API 已稳定，外部可基于它做。
- **强制升级** —— 老客户端照常工作，匹配质量轻微降级。`cord doctor`
  和启动时的 `📦 cord-cli vX.Y.Z available` 提示是仅有的提醒方式。

---

## 团队

- **Founder** —— KunX <KunX@fosenai.com>
- **Cofounder** —— tengyp <tengyp@fosenai.com>

---

## 协议

Apache License 2.0。详见 [LICENSE](LICENSE)。

本仓库仅通过 npm + GitHub Releases 分发预编译的 cord 二进制。源代码不在
这里发布。
