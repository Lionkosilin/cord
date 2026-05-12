# Federation: 多 bootstrap 集群部署

cord 单 bootstrap 是单点。生产部署起 N 个 bootstrap 互联成 mesh，挂一个不中断。

## 1. 起种子 bootstrap

```bash
ANNOUNCE_IP=seed.example.com \
BOOTSTRAP_TCP_PORT=9000 \
BOOTSTRAP_KEY_FILE=/var/lib/cord/seed-key.json \
BOOTSTRAP_API_PORT=7878 \
EMBED_INLINE=1 \
MODEL_VERSION=bge-m3 \
cord bootstrap
```

打印的 PeerId 写死给后面的 bootstrap 当 seed。`BOOTSTRAP_API_PORT` 是给集群运维查 /info 用，**只听内网 ip**（生产用反代隔离）。

## 2. 起 N-1 个 peer bootstrap

```bash
ANNOUNCE_IP=bs2.example.com \
BOOTSTRAP_TCP_PORT=9000 \
BOOTSTRAP_KEY_FILE=/var/lib/cord/bs2-key.json \
BOOTSTRAP_API_PORT=7878 \
EMBED_INLINE=1 MODEL_VERSION=bge-m3 \
BOOTSTRAP_PEERS=/ip4/seed.example.com/tcp/9000/p2p/<SEED_PEER_ID> \
cord bootstrap
```

启动后 ~10s 自动 probe 同伴 `/info`，wire/model 不一致 stderr 红字告警。

## 3. DNS-seeds（推荐）

不想硬编码 seed PeerId 给所有 bootstrap？用 DNS TXT：

```dns
cluster.cord.example.com.  IN  TXT  "dnsaddr=/ip4/seed.example.com/tcp/9000/p2p/<SEED_PEER_ID>"
cluster.cord.example.com.  IN  TXT  "dnsaddr=/ip4/bs2.example.com/tcp/9000/p2p/<BS2_PEER_ID>"
```

每个 bootstrap 启动时只要 `CORD_DNS_SEEDS=cluster.cord.example.com`，自动 dig 拿全部同伴。新增节点改 DNS 即可，无需重启老节点（老节点本来就还有 BOOTSTRAP_PEERS 兜底）。

## 4. 客户端 (agent)

```bash
cord serve \
  --bootstrap /ip4/seed.example.com/tcp/9000/p2p/<SEED_PEER_ID> \
  --bootstrap /ip4/bs2.example.com/tcp/9000/p2p/<BS2_PEER_ID> \
  --bootstrap /ip4/bs3.example.com/tcp/9000/p2p/<BS3_PEER_ID> \
  --api-port 7878
```

agent 同时 dial N 个 bootstrap，任一在就行。auto-redial 每 30s tick 重连失联的。

## 5. 监控

bootstrap 暴露 `BOOTSTRAP_API_PORT` 后能 curl：

```bash
$ curl http://bs2.example.com:7878/info
{
  "peerId":  "12D3KooW...",
  "multiaddrs": [...],
  "wireProtocolVersion": "1.0.0",
  "agentVersion": "0.1.0-alpha.1",
  "cordServiceReady": true,
  "inboxSize": 0
}

$ curl http://bs2.example.com:7878/peers
{ "connected": 8, "peers": [...] }
```

健康检查脚本 watch `cordServiceReady: true` + `wireProtocolVersion` 等于集群约定值。

## 6. 升级运维

cord 不强制全集群同时升级。建议：

1. 先升 1 节点验证（蓝绿）；启动后自动 probe 其它 peer，wire 不一致就 stderr 告警，自己服务正常
2. 滚动升其它 bootstrap
3. agent 滚动升级（用户自决，agent 老版仍能跟新集群对话，只是不能 find 跨 model 的 cap）

**embedding model 升级**：换 `MODEL_VERSION` 环境变量。客户端下次 /find 自动 lazy detect → 红字提示 + LSH index 重建。**不重启 client，不丢 daemon**。详见 README "model versioning" 章节。

## 7. 故障注入演练（应该做）

- kill 1 个 bootstrap：客户端 `/peers` 减 1，30s 后试 redial；agent 继续可用
- bootstrap 升级（MODEL_VERSION 改）：客户端日志看 `📦 [cord] embedding service updated`
- 网络分区：分区两侧的 broadcast cache 互不可见，恢复后 next announce 自动同步
- DHT 跨 bootstrap：在分区一侧 put，恢复后另一侧能 get（Kademlia 自动复制到 K closest peers）

## 8. 已知限制

- bootstrap 间 gossipsub mesh 收敛需 ~30s（新 bootstrap 加进来到能收 broadcast）；DHT 路径更快但要知道 key
- 单 model 强一致只在每个 bootstrap 内；跨 bootstrap 模型升级时人工分批运维（自动 coordinated rollout 是 v2 backlog）
- 没有 leader election；运维通过 `/info` probe 自己判
