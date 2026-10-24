# 我的多 Agent 自动化系统 · 资产层说明

> 面试用法：本目录是"活系统"的证据包。**框架不是我写的，我的层才是作品**——打开顺序：本 README → `skills/` 里挑 2-3 个 SKILL.md → `cron/jobs.json` → `logs/` 三条样本。

## 边界声明（先说清，避免现场穿帮）

- **框架**：[Hermes Agent](https://github.com/NousResearch/hermes-agent)（Nous Research，开源）+ OpenClaw。工具执行器、会话循环、上下文压缩、cron 调度器、多通道投递这些底层机制都是上游代码，**本人未参与编写**。
- **本目录 = 我的资产层**，三层内容：
  1. `skills/` — **119 个由 agent 亲手沉淀的技能**（有 usage.json provenance 记录），本包收录 99 个现存目录 + 19 个已归档；另 1 个（`github-project-triage`）目录已合并清理，仅在 provenance 里留名。**不含** 164 个从技能库导入/共享的外部技能——分清哪些是我写的，本身就是工程判断的一部分。
  2. `cron/jobs.json` — 22 个定时任务的编排定义（含完整 prompt，这是"把 AI 用法产品化"的直接证据）。
  3. `scripts/` — 28 个为 cron 任务配套的数据采集/合并/校验脚本。
- **运行时长口径**：2026-03 起在 OpenClaw 上运行，2026-06-04 迁移到 Hermes 至今，累计约 7 个月不间断。

## 怎么跑起来

框架侧（非本人代码，仅需说明）：

```bash
hermes gateway run --replace     # 启动网关（消息通道 + cron 调度器）
hermes cron list                 # 查看 22 个任务台账
```

资产层侧（我写的部分）：cron 的 `no_agent` 任务直接执行 `scripts/*.py`（数据抓取→写 state→产出 md），`llm` 任务把 prompt 交给 agent 会话循环。两者都在 `jobs.json` 里声明。

## 目录结构

```
01-agent-system/
├── skills/            # 99 个亲手技能目录（每个含 SKILL.md，多数带 references/ templates/ scripts/）
│   ├── a-share-market-cards/    ← 代表：图卡流水线
│   ├── food-log-date-discipline/ ← 代表：数据纪律类
│   ├── ios-device-deploy/        ← 代表：真机管线类
│   └── ...                       # 完整 tree 见本目录
├── skills-archive/    # 19 个已退役技能（保留演化痕迹）
├── cron/jobs.json     # 22 个定时任务定义（已脱敏）
├── scripts/           # 28 个配套脚本（采集/监控/合并/校验）
├── config/            # config.yaml 结构件（密钥字段已删）
├── logs/              # 5 条真实运行样本（见下）
└── README.md          # 本文件
```

## 代表技能（各解决什么）

| 技能 | 一句话 |
|---|---|
| `a-share-market-cards` | A股盘后复盘+盘中验证图卡：HTML 暗金模板→无头浏览器截图→飞书推送+公众号发布，含公众号 40164 报错的发布史 |
| `hyperframes-video` | HTML→MP4 视频流水线：写渲染器 JSON 描述帧，程序化出片（10-18 事故就发生在这里，见 logs） |
| `ios-device-deploy` | 免费 Apple 证书命令行构建+真机侧载+7 天重签节奏（随驾 App 的分发管线） |
| `food-log-date-discipline` | 营养记录的日期纪律协议：`date` 命令为唯一真相，防 compaction/跨天记错账 |
| `regulatory-filing-scans` | 监管处罚扫描 cron：数据源选型、分级降噪、索赔新闻辨伪 |
| `hermes-session-management` | 会话生命周期+cron 配置+自动重置的运维规范 |
| `career-documents` | 简历/求职信管线：HTML→Chrome 无头出 PDF，岗位定制复用 |
| `eigenflux-agent-network` | Agent 间网络协议：私信/feed 广播，每日巡检任务 |

## 定时任务清单（22 个，摘 10）

| 任务 | cron 表达式 | 用途 |
|---|---|---|
| A股盘前速递 | `13 7 * * 1-5` | 7:13 生成 #001 起连续编号的盘前图卡 |
| A股盘中验证 | `17 12 * * 1-5` | 午间验证上午判断 |
| A股盘后分析 | `11 23 * * 1-5` | 收盘数据多源抓取+复盘卡+公众号 |
| A股周报特辑 | `23 23 * * 0` | 周度汇总 |
| 黄金价位监控 | `0 */3 * * 1-5` | 每 3 小时金油比价哨兵 |
| 每日邮箱扫描 | `0 9 * * *` | 收件箱 triage |
| 午餐/晚餐记录提醒 | `0 12/18 * * *` | 营养记录催办 |
| 吃了么周复盘 | `0 21 * * 0` | TDEE 自校准+周复盘卡 |
| 每周监管处罚扫描 | `37 21 * * 1` | 处罚公告扫描 |
| cron504看门狗 | 每 20 分钟 | 监控中转 504 高峰并选模避让 |

调度粒度：**每个任务独立 cron 表达式**，统一由框架调度器执行；任务体分 `no_agent`（纯脚本）和 `llm`（agent 会话）两类——脚本任务不付 token，这是成本设计。

## 记忆机制（双存储）

- `state.db`（SQLite）：`sessions`/`messages` 表存全部会话原文（本包**不打包**，含隐私），`messages_fts` + `messages_fts_trigram` 是 FTS5 索引，跨会话检索靠它；另有 `session_model_usage` 记 token/成本。
- `memories/MEMORY.md` + `USER.md`：注入每个会话上下文的长期记忆，条目以 `§` 分隔，纯文本声明式事实（非指令）。本包**不打包**（含健康/用药/关系隐私）。
- `skills/`：程序性记忆。技能=可复用工作流，agent 完成任务后主动 `skill_manage(patch)` 修订过时内容——**技能是自维护的**。

## 投递通道

`jobs.json` 里每个任务声明 `origin`（回到触发会话，即飞书 DM）/ `local`（只落 `cron/output/`）/ `email` / `feishu` 四类目标；同一产出可多投。实际送达样本见 `logs/sample-normal-cron-output.md`（飞书卡片+公众号双发）。

## 故障与恢复（真实日志，未美化）

- **10-18 渲染帧并发抢写事故**：`logs/incident-1018-framecheck-fail-1710.log` → `fail-1785.log` → `pass-1830.log`。多个僵尸渲染进程并发抢写同一帧序列，两次帧数硬校验失败（1710/1785 ≠ 1830）后 `pkill` 清进程重渲，以 1830 帧全量校验闭环。**帧数断言是故意设计的硬校验——宁可失败重启，不交付缺帧成片。**
- **中转 429 重试链**：`logs/sample-retry-429.log`。429 RATE_LIMITED → 退避 5s → attempt 2/3 → 恢复。
- **中转 504 告警**：`logs/sample-alert-504.log`（9-24 高峰 504 多条）。衍生出 `cron504看门狗` 任务与 504 时段选模策略（已沉淀进 hermes-session-management 技能）。
- 工具调用失败分级（重试 3 次→降级→放弃并告警）由框架 `tool_executor` 实现；我的层负责在技能里写降级路径（如行情 API 失败→缓存数据+模板化简报并标注）。

## 如果重写一遍最想改的

1. cron 任务加**节假日日历**（A股休市日仍会触发空跑，目前靠哨兵输出 [SILENT] 兜底）。
2. 会话 compaction 更激进地保留"结论+数字"而非全文摘要——超长任务里上下文超限是最大成本项。
