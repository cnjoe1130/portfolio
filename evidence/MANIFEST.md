# MANIFEST · ai-portfolio-core

> 组织原则：**可验证数字 → 对应文件**。每个数字后面都能打开原始文件核对。
> 包内共 570 个文件 / 16MB。脱敏执行记录见文末。

## 一、可验证数字总表

| 数字 | 证据文件（包内路径） | 面试时怎么用 |
|---|---|---|
| **119 个亲手编写技能**（收录现存 99 + 归档 19） | `01-agent-system/skills/` 与 `skills-archive/`（每个目录含 SKILL.md 原文） | 现场任选一个打开：frontmatter + 工作流 + references 踩坑记录，全部本机实跑沉淀 |
| **22 个在跑定时任务** | `01-agent-system/cron/jobs.json`（完整 prompt 原文，已脱敏） | 讲"把 AI 用法产品化"：从采集命令到发布规则全在 prompt 里声明 |
| **28 个配套脚本** | `01-agent-system/scripts/`（采集/监控/合并/校验） | 讲 no_agent 任务设计：能用脚本的不付 token |
| **累计 100+ 期，盘前速递 #114**（2026-06-02 起算） | `06-market-signal/cards/` 4 张当日真实产出 + `01-agent-system/logs/sample-normal-cron-output.md` | 证明"无人值守日更"是现状不是宣传 |
| **食物库 568 条** | `03-chileme/food-db-sample-20.json`（全量在源，样例可核对字段结构） | 讲数据规范与自我对比约束 |
| **1830 帧硬校验闭环**（10-18 事故） | `01-agent-system/logs/incident-1018-*.log` 三连（fail 1710→fail 1785→pass 1830） | "跑崩过吗"的字面答案 |
| **429 重试链 / 504 告警** | `01-agent-system/logs/sample-retry-429.log`、`sample-alert-504.log` | 失败处理链路有原始日志，不是转述 |
| **角色一致性三时间线** | `05-narrative/5-2-consistency-*.png`（1999/2003/2019 并排×2 角色） | 阅文类 JD 追问一致性时的实物 |
| **像素级隐写肉眼无差**（diff 均值 0.0012/通道） | `02-redsecret/shots/2-1-qim-before-after.png` | QIM 并排对比，本机引擎真实生成 |
| **随驾 iOS 全链路源码**（ReplayKit+OCR+键盘扩展） | `04-suijia/`（App/Broadcast/Keyboard 三模块，14MB 全量） | 枢宇类"提供可运行原型"的底层；录屏待本人出镜 |

## 二、目录明细

```
ai-portfolio-core/
├── MANIFEST.md                        # 本文件
├── 01-agent-system/                   # ⭐ 多 Agent 活系统（481 文件）
│   ├── README.md                      # 资产层边界声明+结构+热插拔/记忆/调度说明 ← 先读这个
│   ├── skills/ ×99                    # 亲手技能（SKILL.md+references+templates+scripts）
│   ├── skills-archive/ ×19            # 退役技能（演化痕迹）
│   ├── cron/jobs.json                 # 22 任务完整定义（已脱敏）
│   ├── scripts/ ×28                   # 配套脚本
│   ├── config/config.yaml             # 配置结构件（密钥字段已删）
│   └── logs/ ×6                       # 正常产出/429重试/504告警/10-18事故三连——全部原始日志未美化
├── 02-redsecret/                      # 开源隐写工具
│   ├── README.md
│   ├── shots/ ×4                      # QIM前后对比/零宽演示/QR角标/封面
│   └── references/ ×5                 # DCT引擎/可微噪声层/QR压缩实测等算法文档
├── 03-chileme/                        # 吃了么
│   ├── README.md
│   ├── food-db-sample-20.json         # 前20条脱敏样例（个人字段已删）
│   ├── recommend-engine-weekly_review.py  # 习惯内推荐+TDEE自校准引擎（151行）
│   └── MACROS_SPEC.md
├── 04-suijia/                         # 随驾 iOS 副驾（源码全量）
│   └── suijia/                        # App+Broadcast+Keyboard+Shared+docs；⚠️ suijia-demo.mp4 待本人录屏放入
├── 05-narrative/                      # 织梦引擎
│   ├── README.md
│   ├── engine-core.js / player.html / theme.css   # 浏览器直接可运行
│   └── 5-*.png/jpg ×6                 # 一致性对比×2、启动器/玩家端/关系图/调试台实机截图
├── 06-market-signal/                  # A股流水线
│   ├── README.md
│   ├── cards/ ×4                      # 2026-10-21/22 真实产出（小红书版+公众号版）
│   └── pipeline-template-after-market-card.html
├── 07-soccer-column/                  # AI吵个球
│   ├── README.md                      # 含栏目 SOP 要点清单
│   └── 7-1-app-preview.png + main.py + config.example.yaml + README-project.md
└── 08-qa/
    ├── README.md
    └── ANSWERS.md                     # 8.1/8.3/8.4/8.5 写实 + 8.2 方法论框架 + 8.6 留白
```

## 三、诚实条款（包里主动声明的短板/边界）

- 框架（Hermes/OpenClaw）非本人编写，见 `01-agent-system/README.md` 边界声明
- 随驾录屏缺失（需本人 iPhone 出镜），`04-suijia/` 只有源码
- 8.6 转型叙事未答（个人题），`08-qa/ANSWERS.md` 留白并附时间锚点
- 《生吞》改编剧本未打包（改编权属），只放引擎与结构
- QIM 对比图真实 diff 占比约 1/3 行（payload 区），不宣称"全图逐像素无差"
- "7 个月"口径：2026-03 起含 OpenClaw 阶段；本打包机可查最早留档为 OpenClaw 会话 2026-04-06 / Hermes 迁移 2026-06-04，03-19 记录在另一设备——答辩时如无法出示原件，用"本机留档 6 个月+"兜底更稳

## 四、脱敏执行记录（发布前自查）

已扫 480+ 文本文件，四轮：① 密钥形态（Bearer/sk-/cpk-/wk-/sk_tr_/agent-world）→ 0 残留 ② `/Users/joe` 绝对路径 → 0 残留 ③ 手机号/邮箱/飞书会话 ID → 已置换（剩余 4 处匹配为时间戳/线程 ID 误报，逐条人工核对无害）④ 隐私词（持仓哨兵票名/getrich 密语/用药记录）→ 已占位符化，含 `cron/jobs.json` 与 `02-redsecret/references/`。未打包项：state.db、memories/、auth.json、完整会话日志。
