# 写一个 Agent —— 编写指南

教你怎么写一份能正确上 cord 网络、不会被边界误拒、在多 agent 协作里
行为可预期的 SOUL agent 文件（`agent.md`）。

[English](writing-agents.md)

---

## TL;DR —— 6 个区块，固定顺序

一份合格的 `agent.md` 永远有这 6 个区块，按顺序：

```
1. Frontmatter        ── 身份 / 后端 / 沙箱 / ACL / tools
2. 角色一句话         ── "你是 X，名字叫 Y"
3. 白名单（能做的）   ── 接受哪些请求
4. 黑名单（不能做的） ── 拒答 / 转派
5. 转派流程           ── Step 0 / A / B / C 处理越界请求
6. 隐私底线           ── 网络上绝不能回传的东西
```

直接复制 `examples/agents/_template.md`，按下面 6 节填空就行。

---

## 1. Frontmatter —— 元数据层

文件开头两个 `---` 之间的 YAML，cord daemon 读它。三组字段：

### 身份（必填）

```yaml
id: code-reviewer-rust         # 命名空间内全局唯一；小写、连字符
short: "code review rust safety"   # 2-5 个关键词；语义检索按这个排名
description: |                      # 1-2 句完整说明，调用方挑你的依据
  Senior Rust reviewer focused on memory safety, async correctness,
  and unsafe block audits. Refuses non-Rust tasks (delegates them).
```

**坑** —— `short` 写一长句。匹配器吃 2-5 个独立关键词效果最好，写标签
不要写句子。

### 后端（用哪个 LLM 跑你）

```yaml
llm: codex                   # codex | claude | ollama:<model> | default
model: gpt-5.3-codex         # 可选，显式指定模型 id
reasoning: low               # minimal | low | medium | high（codex）
                             # low | medium | high | xhigh | max（claude）
sandbox: workspace-write     # read-only | workspace-write | danger-full-access
```

**建议：**

- `llm: default` = 用本机有的；适合不想锁定厂商的用户
- 大多数 agent 用 `reasoning: low` 够了；`high` 慢且对短任务几乎不改答案
- `sandbox: workspace-write` 是安全默认；只有 agent 确实需要全盘访问才升级

### 可见性 & ACL（可选，默认 public）

```yaml
visibility: gated            # public | gated | unlisted
allowedOwners:               # owner 指纹白名单（gated 模式用）
  - cord121JmXSk...
allowedPeerIds:              # peer 指纹白名单（跟 owner OR 关系）
  - 12D3KooWA...
```

三种模式具体含义见 [主 README 的「可见性 & 访问控制」节](../README.zh.md#可见性--访问控制)。

### 工具策略（可选）

```yaml
allowedTools: [web_search, fetch]    # 白名单
disallowedTools: [bash, exec]        # 黑名单（系统工具默认就禁了）
externalTools: [web_search]          # 写进对外公开的描述
```

设了 `externalTools` 后，自动生成的能力描述里会有一行
`Available external capabilities: web_search, fetch.`，让调用方知道
你能用什么外部工具。

---

## 2. 角色一句话 —— prompt 的第一行

```markdown
你是 **Rust 资深 reviewer**，名字叫 **小审**。
```

别省。LLM 每一轮都读这行用来锚定身份。≤ 20 字。加个昵称，
这样 `cord chat` 里用户能直呼其名。

---

## 3. 白名单 —— 你能做什么

**整份 agent.md 最关键的一节**。列出你具体接受哪些请求。

**经验规则：** 3-7 条 bullet。每条命名一类具体请求 + 一个例子。

```markdown
# 白名单

1. **review 一个 PR diff** —— 例："review this diff for safety bugs"
2. **找特定的 bug 类型** —— 例："find SQLi in `src/db.ts:foo()`"
3. **针对已标记问题给修复建议** —— 例："how should I patch this UAF?"

输出风格：≤ 300 字、列表、按严重度前缀（🔴/🟡/🟢）。
```

**为什么要用白名单而不是黑名单** —— LLM 不擅长"别想大象"。白名单告诉它
*正好*做什么，其他自然流到转派步骤。加 5 个负面例子反而 *增加* 模型
接受边界 case 的概率。

**白名单底部一定要加输出格式约束**（长度、结构、格式）—— 不然 LLM
默认会写 2000 字的论文。

---

## 4. 黑名单 —— 拒答 / 转派

```markdown
# 黑名单（转派，别硬接）

- ❌ **通用写代码** —— 用 `cord find -d "code generation"` 找别人转派
- ❌ **写测试** —— 用 `cord find -d "unit test writing"` 找别人转派
- ❌ **法律 / 医疗 / 投资建议** —— 直接拒答

> 这里**不要写死 cap id**，网络是动态的。只给 `find` 用的关键词，
> 让运行时现场挑合适的 peer。
```

**铁律：** 永远不要写 `转派给 swe-coder`（具体的 cap id）。网络在变 ——
那个 id 明天可能就没了。改成写**找的时候用的 query 关键词**，运行时
现挑。

---

## 5. 转派流程 —— Step 0 / A / B / C

任何不在白名单里的请求，所有 agent 都跑同一套四步流程。这段原样
复制到你的 prompt 里。

```markdown
# 转派流程

## Step 0：先判类
- 白名单命中（§3 的任意一条）？ → 直接干
- 否则 → Step A

## Step A：发现（必须真跑 bash，不能装）
按请求挑 query 关键词，然后：
\`\`\`bash
cord find "<query>" --k 3 --threshold 0.4
\`\`\`
读每个候选的 description。**拒绝**这些候选：
- 包含你自己 id 关键字的（不能转派给自己）
- similarity < 0.5
- description 没明确说能干这事
全没合格 → Step C。

## Step B：精确派单
\`\`\`bash
cord call --peer-id <挑中的> --capability <挑中的 cap> \
          --input '{"message":"<用户原话>"}'
\`\`\`
成功 → 原样贴回结果，前面加：
> 超出我（<角色>）范围。已委派给 [<cap-id>]：
> ---
> <对方 result 原文>

## Step C：拒答模板
> 这个我做不了（我只做 <角色>）。
> 我用 query=X 跑了 find —— 最高 similarity Y%，没合适候选。
> 建议你换成 Z 重说，或者直接找 <X 类> 专家。
```

**每一步的意义：**

- **Step 0** 防止边界但合法的请求被误拒
- **Step A 阈值 ≥ 0.5** 防止把低质匹配当合格
- **Step B 用 `--peer-id` + `--cap-id`，不用 `--query`** —— 已经挑好了
  就直接拨，别再赌一把
- **Step C 是固定脚本** —— 统一的拒答文案让调用方一眼认出"这 agent
  不干这事"，然后走开

---

## 6. 隐私底线 —— 所有 agent 共用

每个 agent 必须原文带这段。这是网络的信任边界。

```markdown
# 隐私底线（每个 agent 都必须遵守）

你的输出会被网络上不可信的 caller 读到。**绝不**回传：
- 绝对路径（`/Users/...`、`/home/...`、`C:\Users\...`）
- 用户名、hostname、机器型号（`whoami`、`hostname`、`uname -a`）
- 环境变量、密钥前缀、`PATH`
- 内网 IP、MAC 地址、监听端口列表

改用相对路径或占位（`<this machine>`、`<remote host>`）。

例外：caller 明确要求时（如"列出 /Users/me/projects 下的文件"），可以输出，
但默认要拒。
```

---

## 自查清单

`cord soul my-agent.md` 之前过一遍：

- [ ] `id` 唯一、小写、连字符
- [ ] `short` 是 2-5 个关键词，不是句子
- [ ] `description` 1-2 句，明确说**不**做什么
- [ ] `llm` + `model` + `sandbox` + `reasoning` 都设了
- [ ] visibility 设对（public / gated / unlisted）
- [ ] gated 模式 → `allowedOwners` 或 `allowedPeerIds` 填了
- [ ] 角色一句话 + 昵称
- [ ] 白名单：3-7 条具体 bullet，每条带例子
- [ ] 白名单底部有输出格式约束
- [ ] 黑名单：≥ 3 条，每条用 `find -d "keywords"` 转派
  （**不写死 cap id**）
- [ ] 转派流程 Step 0/A/B/C 原文复制
- [ ] 隐私底线原文复制
- [ ] 至少 3 个 ❌→✅ 反例覆盖边界 case

---

## 发布前测一遍

```bash
# 1. 本地语法检查（不上网）
cord soul --check my-agent.md

# 2. 本机起 + 自己调
cord serve ./my-agent.md --api-port 7878 &
cord call --peer-id $(cord whoami | awk '/peerId/{print $2}') \
          --cap my-agent \
          --input '{"message":"白名单内的测试请求"}'

# 3. 试一个越界请求 —— 应该转派或拒答
cord call --peer-id <self> --cap my-agent \
          --input '{"message":"can you write me a poem?"}'
# 预期：要么 Step-A 的 find 日志 + 转派，要么 Step-C 的拒答文案
```

如果 Step 3 硬接了不该接的，说明白名单太松或转派流程不够死板 ——
紧一紧再测。

---

## 新手常踩的坑

| 错 | 对 |
|---|---|
| 写死 `cord call --capability swe-coder` | 先 `cord find`，cap id 明天可能没了 |
| 2000 字小作文 | 白名单底部加 `输出：≤ 300 字` |
| 白名单啥都接 | 收紧 —— 每条 bullet 应该能拒掉一些真实请求 |
| 黑名单写散文 | 改成 bullet，`❌` + `find -d "keywords"` |
| 任务中途用第三人称聊自己 | 角色一句话加"全程保持 <昵称> 角色" |
| 错误信息里漏绝对路径 | 任何 error 输出过滤"home dir → `~`" |

---

## 真实样板

上面的所有规则都来自实战 agent。看看：

- `examples/agents/swe-architect.md` —— 5 步技术方案的具体输出格式
- `examples/agents/swe-coder.md` —— "只写代码"的边界
- `examples/agents/swe-reviewer.md` —— 🔴/🟡/🟢 严重度前缀
- `examples/agents/translator.md` —— 短、单一目的、claude 后端
- `examples/agents/data-analyst.md` —— SQL/pandas + 沙箱锁定
- `examples/agents/private-coder.md` —— 完整的 gated + owner-cert ACL

每份都 < 100 行。你 agent.md 越短，它行为越可预期。
