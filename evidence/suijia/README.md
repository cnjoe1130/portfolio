# 随驾 SuiJia · iOS 实时聊天副驾

> 你聊天，它在旁边看着，回话前递条子。

**基于 [jev-chat-jarvis-ios](https://github.com/jev-chat/jev-chat-jarvis-ios)（MIT）二次开发** —— 感谢 jev-chat 与所有贡献者。判断内核与键盘管线源自上游，本项目新增实时读屏上下文层。

**随驾 = iOS 上第一个"实时副驾"**：桌面端 JARVIS 读屏帮回消息（详见 Jev 生态报道），但复制单条消息丢了上下文；随驾用 ReplayKit 屏幕广播 + 本机 OCR，**持续读整场对话**，回复候选带着完整上下文来。

## 三代对比

| | 一代：单条复制（jev-jarvis iOS 键盘版） | 二代：截图 OCR | 三代：实时副驾（随驾） |
|---|---|---|---|
| 上下文 | 复制的那一条 | 一屏快照 | **持续累积整场对话，不丢帧** |
| 操作 | 长按复制 → 切键盘 → 分析 | 截图 → 分享 → 等 | **开播一次，全程在场** |
| 语音/图片 | 需手动复制 | OCR 不出 | 暂不支持（见路线图） |

## 怎么工作

```
控制中心开播（系统红点提示，隐私底线）
   ↓ ReplayKit Broadcast Upload Extension
屏幕帧 → 32×32 帧指纹去重（画面不变不烧 OCR）
   ↓ 仅变化帧
Vision 本机 OCR（zh-Hans）→ 左右气泡分侧 = 说话人归属
   ↓ 增量写入 App Group（全程不出网）
键盘显示「副驾在岗 · 已捕获 N 条」
   ↓ 点一下（此刻才出网，发往你自己配置的 API）
Jev 判断（意图/风险 0-9）→ 按话术生成候选 → 点选填入输入框
```

**隐私边界（与上游一致并更进一步）**：
- 识别**全程本机**（Vision 框架，无第三方 OCR 云）
- 聊天内容只在点「分析」那一刻发往**你自己配置的模型接口**
- 无自建服务器、不落盘、不进日志；API Key 存本机 App Group
- 键盘不监听按键；广播随开随关，红点状态系统强制可见

## 安装

需要一台 Mac（Xcode 15+）+ iPhone，**无需越狱、无需付费开发者账号**：

```bash
git clone https://github.com/cnjoe1130/suijia.git
cd suijia
brew install xcodegen && xcodegen generate
open SuiJia.xcodeproj
# 两个 target 的 Team 换成你的 Apple ID（免费账号即可）→ 插手机 Cmd+R
```

免费个人签名 7 天过期，到期重跑一次。详细步骤见 [docs/INSTALL.md](docs/INSTALL.md)。

配置（App 内完成）：
- **判断层**：TypeSafe Jev（api.typesafe.ai，jev-latest）——出意图概率 + 风险分布 + 候选排序
- **生成层**：任意 OpenAI 兼容端点（DeepSeek / GLM / OpenRouter 通吃）

## 诚实条款（v0.1 已知边界）

- 语音消息无转写、图片消息 OCR 不出文字（广播只含视频流）
- 气泡分侧在深色模式/特殊主题下可能误判说话人
- 系统 UI 小字可能混入（有居中过滤规则，漏网样本欢迎提 issue）
- 判断准确率受限于 Jev 本体（上游实测 64-70%），上下文补全改善的是"答非所问"，不改变模型上限

## 路线图

- [ ] 误判样本收集 → OCR 过滤参数调优
- [ ] 语音消息本机转写（广播音频流 + SpeechAnalyzer）
- [ ] 新消息实时预分析（键盘点开直接看结果）
- [ ] Watch 递条子（候选在手腕上过目）

## License

MIT（继承上游）。分发请保留 [NOTICE](NOTICE) —— 内含对上游的署名要求与使用风险告知。

**严禁用于诈骗、冒充他人、骚扰等违法用途。本项目只读屏幕、只填不发，最终发送永远由你亲手完成。**
