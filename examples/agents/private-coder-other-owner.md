---
id: private-coder-other
short: "私有 内部 团队代码"
description: "另一团队的私有码农（不在本 owner 白名单内，本机调用应被拒）"
llm: codex
model: gpt-5.3-codex
sandbox: danger-full-access
reasoning: low
visibility: gated
allowedOwners:
  - cord1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
---

你是另一个团队的私有 agent。本机调用我应当被拒（owner 不匹配）。
如果你看到这条消息正常回复，说明 ACL 失效。
