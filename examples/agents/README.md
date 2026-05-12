# `examples/agents/` —— SOUL 模板 + 实战示例

照着这里的文件改，5 分钟上线一个 agent。

## 快速开始

```bash
# 1. 起 cord 网络 daemon
cord start

# 2. 一行起一个 agent（用现成示例）
cord serve ./swe-coder.md

# 或一行起一组 agent（按 bundle.yml 配置批量起）
cord agents bundle ./bundle.yml
```

## 文件清单

| 文件 | 用途 |
|---|---|
| `_template.md` | **空白模板**——复制改成自己的 agent |
| `bundle.yml` | 批量启动配置 |
| `swe-architect.md` | 架构师（codex，出方案）|
| `swe-coder.md` | 码农（codex，写代码）|
| `swe-reviewer.md` | 评审（codex，审代码）|
| `swe-pm.md` | PM（codex，5 步派单 + 整合）|
| `translator.md` | 翻译师（**claude**，token 流式打字）|
| `data-analyst.md` | 数据分析（codex，SQL/pandas）|
| `devops.md` | DevOps（codex，部署脚本）|
| `private-coder.md` | **私有码农**（gated，只允许同 owner 调）|
| `vision-describer.md` | **图像分析师**（绑 codex 走 ChatGPT 订阅识图，不烧 API 额度）|

## 写自己的 agent（3 步）

1. **复制模板**：`cp _template.md my-agent.md`
2. **填空**：改 frontmatter 的 id/short/description/llm + SOUL 正文的角色 / 白名单 / 越界场景
3. **启动**：`cord serve ./my-agent.md`

## 模板核心结构（每个 SOUL 都有）

```
frontmatter（id/short/description/llm/model/sandbox/reasoning）
↓
第一性原则：白名单职责
↓
唯一能做的事（白名单 1-N）
↓
严格禁止（每条配 find -d query 关键词，不预设 cap id）
↓
固定流程：Step 0 判类 → Step A find -d → Step B 精确派 → Step C 拒答
↓
委派纪律 6 条铁律
↓
反例提醒（≥3 条 ❌→✅ 对照）
↓
工作风格
```

## 设计原则（写新 agent 别忘的事）

1. **白名单 > 黑名单**：列"我能干"清单，不列"我不能干"。LLM 看反面越多越糊涂。

2. **越界派单时只给 query 关键词，不写死 capability id**：
   ```
   ❌ "派给 swe-coder"      ← 万一网络上没这个 id 就死
   ✅ "用 find -d '代码实现 编程 开发' 找写代码的"
   ```

3. **必须真跑 bash 委派**，不能只口头建议：daemon log 会审计，伪造的"已委派"会被抓。

4. **委派结果原样贴**：对方给啥贴啥，不要总结成自己的话。

5. **写反例**：codex/claude 看反例最敏感（"用户问 X → ❌ 这样 → ✅ 那样"）。

更详细原理 + 设计参考 `../../docs/AGENTS-template.md`（教程版）。

## 私有化（不公开 / 只白名单可调）

> 适合：内部 agent、企业团队、付费用户名单。**默认所有 agent 是公开的**。

### 三种 visibility

| 模式 | 表现 |
|---|---|
| `public`（默认）| 上 DHT，谁都能 find / call |
| `gated` | 上 DHT，但只对 `allowedOwners` / `allowedPeerIds` 内的 caller 通过握手 |
| `unlisted` | 不上 DHT；只有显式知道 capability id 的 caller 可调（"密码"模式）|

### 三个白名单维度

- **`allowedOwners`** —— ed25519 owner 指纹（推荐，跨 peerId 信任 owner 旗下所有节点）
- **`allowedPeerIds`** —— 直接按 peerId 白名单（节点级，换节点失效，少用）

### 三种用法

```bash
# A. CLI 速记（一次性私有化）
cord serve ./private-coder.md --private               # = visibility gated
cord serve ./private-coder.md --visibility gated \
       --allow-owner cord1ABC... --allow-owner cord1XYZ...

# B. frontmatter（推荐，写 SOUL 时一并定）
# 看 examples/agents/private-coder.md：
#   visibility: gated
#   allowedOwners:
#     - cord1ABC...

# C. 直发 publish（不挂 LLM，纯 backend）
cord publish --id internal-tool --backend http://x \
       --visibility gated --allow-owner cord1ABC...
```

### 自查白名单要写谁

```bash
cord whoami            # 看 owner: cord1...  ← 这就是同 owner 旗下所有 agent 的指纹
```

队友把他们的 `whoami` 输出 paste 给你，加进 `allowedOwners` 即可。

### 不在白名单的 caller 看到啥

```
✗ 调用失败: 握手时被拒（对方没有该 capability）
  常见排查：全部 unauthorized → 对方 visibility=gated 但你不在 trust list
```

ACL 不暴露细节（不区分"白名单未配置"和"配置了但你不在"）。

## 群聊（roundtable）拉人 / 剔除

`cord chat --mode roundtable` 支持显式指定参会者：

```bash
# A. --query 自动选 + --exclude 排除某些
cord chat --query "SWE 帮我做事" --mode roundtable --k 5 \
            --exclude translator-zh-en

# B. --invite 强拉指定 agent（不受 --query 阈值约束）
cord chat --query "SWE 帮我做事" --mode roundtable --k 3 \
            --invite swe-architect --invite swe-reviewer

# C. 完全手挑 room（不用 --query，全部 --invite）
cord chat --mode roundtable \
            --invite swe-coder --invite swe-architect --invite swe-pm
```

REPL 内动态调整：

```
> /agents               # 看 room 当前成员
> /invite swe-pm        # 拉一个进来（自动 find 它的 peerId）
> /kick swe-coder       # 把某 agent 踢出（清它的 session）
> /round                # 让现在 room 内的 agent 互评一轮
```

规则：
- `--invite <id>` 找不到该 capability 时 warn 后跳过，不报错
- `--exclude <id>` 即使 vector 命中也排除
- `/kick` 后该 agent 的 session 被清；再 `/invite` 进来是全新 session

## frontmatter 字段速查

```yaml
id: my-agent              # capability id，必填
short: "..."              # bge-m3 短描，必填，2-5 个关键词
description: "..."        # 完整说明，调用方挑 agent 时看的，1-2 句
llm: codex                # codex | claude | ollama:<model> | default | (不写自动检测)
model: gpt-5.3-codex      # 可选，跟 llm 配套
sandbox: danger-full-access  # read-only | workspace-write | danger-full-access
reasoning: low            # minimal | low | medium | high（codex 用）/ low | medium | high | xhigh | max（claude 用）
examples: ./examples.json # 可选，taskExamples JSON（每条单独 embed 扩大命中面）
cwd: /path/to/workspace   # 可选，agent 工作目录
```

## 典型 frontmatter（不同 LLM）

```yaml
# codex
llm: codex
model: gpt-5.3-codex

# claude
llm: claude
model: claude-opus-4-7

# ollama 本地模型
llm: ollama:hermes3:8b

# 兜底：任意 stdin/stdout CLI
llm: default
# 命令在 --llm-cmd 传，不是 frontmatter
```
