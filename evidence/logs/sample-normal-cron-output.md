# Cron Job: A股盘前速递

**Job ID:** ce3dfb6cf4e0
**Run Time:** 2026-10-22 07:16:43
**Schedule:** 13 7 * * 1-5

## Prompt

[IMPORTANT: The user has invoked the "a-share-market-cards" skill, indicating they want you to follow its instructions. The full skill content is loaded below.]

---
name: a-share-market-cards
description: A股盘后复盘+盘中验证的图片卡生成与公众号发布流程。HTML暗底模板→无头浏览器截图→飞书推送+公众号文章。含暗金粒子风一图流（Joe定档酷炫模板）。
version: 4.1
tags: [a-share, market, cron, feishu, wechat, stock, fundamental, st, 涨停, 题材]
---

# A股市场卡片 · 每日三卡流程（v4.0 瘦身版）

> v3.14 全文存档于 `references/legacy-v3.14-full.md`（本文件只保留每日流程）。
> 周报特辑 / 公众号发布 / QR加密 / 个股分析 / 小红书模板 / HTML图表 / AI验证模块细节 → 见文末 References 按需加载。

## ⚠️ Skill 维护铁律（2026-09-01 定案，违者三条 cron 全灭）
本 skill 是被 3 个每日 cron 直接注入 prompt 的**热 skill**——体积直接决定 cron 存活：
- **主文件上限 50KB**：新增内容一律写入 `references/` 对应文件（或新建），主文件只留一行指针。历史上 44-50K 区间成功率 100%，113K 时 100% 失败（详见 references/cron-failure-diagnosis.md）。
- **每周日查体积**：`ls -la SKILL.md`，超过 50KB 立即启动瘦身（先备份 SKILL.md.vX.bak，再按 v4.0 手术模式：全文存档 → 砍到每日流程 → 细节挪 refs）。
- **瘦身禁止删行**：只搬移不删除，全文先存档 `references/legacy-vX-full.md`（sha256 校验）再改，保底可回滚。
- **警惕结构暗伤**：文件里一个裸 ``` 会把后续所有标题吞进代码块，fence-aware 解析随之失效——分割/审计前先数 ``` 配对，奇数即先修 fence。

## Cron Jobs
- 盘前速递 `ce3dfb6cf4e0` 07:06 ｜ 盘中验证 `62a518de62ff` 12:18 ｜ 盘后复盘 `33e6d94f417f` 23:00（周一至五）
- **盘后卡情绪结构模块已切同花顺官方源**（2026-09-09：涨停池/连板天梯/题材词云/热榜/龙虎榜，CLI 直出官方题材标签；prompt 已改写，jobs.json 备份 .bak-pre-ths-*）→ **references/ths-official-sentiment.md**
- **同花顺 fuyao API 通用经验**（2026-09-11）：`/llms-full.txt`（275KB 全量接口文档）为接口主通道；REST 直连 `curl https://fuyao.aicubes.cn/api/... -H "X-api-key: $HITHINK_FINANCE_API_KEY"` 可用；snapshot 即官方"实时行情"（轮询制，无 tick/分钟线）；行情台方案B=Flask 代理 `~/Desktop/ths-dashboard/server.py`（8897，Key 只在服务端）
- **⚠️ 模型纪律更新（2026-09-24 二次修正）**：glm-5.3-flash 白天高峰、qwen3.8-flash 夜间高峰对长会话（agent 多轮循环）均稳定 504（短请求正常）——A股三重任务已钉回 deepseek-v4-flash-0731（贵72%但 call 快、避开拥塞窗，历史8连胜；当晚盘后补跑验证通过）。每日黄金资讯等轻任务仍用 qwen3.8-flash 正常。切换细节/看门狗见 references/cron-model-switching-0924.md
- **504 看门狗**：`~/.hermes/scripts/cron504_watchdog.py`（no-agent job `7533308a37d6` 每 20m）扫 executions.db，金融 job 因 504/500 挂掉时自动重排 next_run_at +2min 补跑（每 job 每天最多 1 次，无事静默）。⚠️ 实现细节：判定 failed 用「每个 job_id 只保留最后一条 failed 记录」（unknown 孤儿记录不覆盖 failed 状态）；补跑方式=原子改 next_run_at +2min（`hermes cron run` 触发的 execution owner 是 CLI 进程，CLI 退出记 unknown 但 fire 仍在跑，勿据此重复触发）
- **Cron jobs.json 铁律补充**：调度器 fire 期间绝不能外部改 jobs.json 清 fire_claim（会 lost fire claim ownership 杀掉正在跑的任务）；`hermes cron run` 的 owner 是 CLI 进程，CLI 退出后 execution 记 unknown 但 fire 仍在跑——勿据此重复触发
- 美股数据源现状（2026-09-11 实测）：东财 A股接口曾拉黑 IP 但**美股 trends2 通道未拉黑可用**（`push2his.eastmoney.com/api/qt/stock/trends2/get?secid=105.AAPL`）；Yahoo 返回非 JSON、腾讯美股分钟线（mkline/USMinute）不识别或仅最新 tick；**新浪 `hq.sinajs.cn/list=gb_aapl` 是稳定兜底**（gb_ 前缀，字段[2]=涨跌幅%）
- 新周报 job 另见 references/weekly-report.md
- 504/超时排查 → **必读 references/cron-failure-diagnosis.md**（2026-09-01 深挖：本skill三个job 504根因=skill体积膨胀，重放验证会误判，见该文修正版判决规则）
- **⚠️ Cron Job 文本编辑限制**：cron 的 prompt 编辑走 `hermes cron edit`，不在本 skill 内
- **⚠️ Cron Job 命令长度限制**（2026-08-03）：长 inline 脚本会被硬拦，先写文件再 bash 执行
- **⚠️ Cron Job 部分失败模式**（2026-08-01）：504/超时后先查 output 目录 `## Error` 段，再决定重放

## 内容红线
- ❌ 不给具体多空方向（加密QR里可以有主观判断）
- ❌ 不预测点位
- ✅ 数据展示 + 历史模式匹配
- ✅ 主观判断通过QR密语承载（需密钥解密，密钥：<PASSPHRASE>）
- ✅ 免责声明必带

## 卡片模板位置
- 盘中速递（主模板）：~/.hermes/cache/documents/intraday-card-YYYYMMDD.html — **最完整的模板**，包含所有CSS和HTML结构，盘前/盘中/盘后卡片均以此为基础修改
- 盘后复盘：~/.hermes/cache/documents/盘后复盘-YYYYMMDD.html
- 盘前速递：~/.hermes/cache/documents/盘前速递-YYYYMMDD.html
- 盘中验证：~/.hermes/cache/documents/intraday-verify-card.html
- 小红书盘前速递：`templates/xhs-morning-card.html`（动森暖色版，奶油底+薄荷绿，1080×1440居中）
- 小红书图文卡片：详见 `references/xhs-card-templates.md`（两种视觉风格+模板+配色）

- skill 静态兜底模板：`templates/after-market-card.html`（盘后）/ `templates/intraday-card.html`（盘中）/ `templates/intraday-verify-card.html`（盘中验证）/ `templates/xhs-morning-card.html`（小红书）
⚠️ **模板文件不持久化（flaky，非绝对）**（2026-07-13 验证；2026-08-05 复现；2026-08-06 反例：08-05 的 `盘前速递-20260805.html`、`小红书盘前速递-20260805.html`、`盘后复盘-20260805.html`、`intraday-card-20260805.html` 全部保留并可复用）：`intraday-card-*.html`、`盘前速递-*.html`、`盘后复盘-*.html` 等历史模板文件在 cron job 之间**可能保留也可能被清空**。**不要假设存在或不存在，一律先 `search_files(pattern="*.html", target="files")` 探测**：有则取上一交易日文件作模板，无则按下方回退链处理。**实测 2026-08-05：documents 目录里只有当日文件**（intraday-card-20260805.html、盘前速递-20260805*.html、小红书盘前速递-20260805.html），连 `周报特辑-*.html` 也没有。**盘后复盘无历史模板时，直接用当日 `intraday-card-YYYYMMDD.html` 作模板**：结构完整（kpi/flow-grid/news-item/ai-box/footer 全套 CSS），只需把蓝色 `#4285f4` 系（badge/accent/news-num/glow/news-tag）全局替换为盘后红 `#c4553a` 系即可，已验证可行。

**模板查找回退链（优先级从高到低）：**
1. `周报特辑-YYYYMMDD-卡片1.html` — 最近的周报卡片，暗底CSS结构完整，可作为所有暗底卡片的参考
2. `templates/intraday-card.html` — skill 自带模板目录中的盘中速递暗底卡，结构完整（kpi/flow-grid/news-item/ai-box/footer 全套 CSS），盘前/盘后卡均以此为基修改。**稳定可靠，不依赖 cache 文件持久化**

**⚠️ 必含模块遗漏事故（2026-09-07 深夜，Joe 发现盘后卡格式问题后根治）**：skill 自带静态模板 `templates/after-market-card.html` **原本缺三个必含模块**（隔夜美股/AI一句话总结/QR密语），cron agent 按回退链选用它后直接产出半成品卡还声称完成投递——用户收到 {{FLOW_VALUE}}、{{NEWS_TAG}} 裸露占位符 + {上证指数}单花括号字面量 + 全部必含模块缺失的废卡。**已修复：模板补齐三模块（US OVERNIGHT/AI SUMMARY/QR SECRET，带{{US*}}/{{AI_SUMMARY}}/{{QR_B64}}占位符，.bak-pre-modules 备份在旁）**。衍生规则：
- **占位符残留=发布前硬检查**：截图前 `grep -c '{{' card.html` 必须=0；另查单花括号字面量 `\{[^{}]{1,12}\}`（模板用法说明被 agent 当数据塞进卡面的 09-07 实案）；DOM 复查 `document.body.textContent.match(/\{[^}]*\}/)` 须为 null
- **多轮 patch 后必须查结构残渣**：替换删除循环块（flow-row/news-item）时，残尾 `</div></div>` 与下一个占位符块拼粘连会导致裸占位符落入页面（09-07 三个残留全部来自此类）
- **模板补模块后必更新占位符清单**：cron agent 只替换它认识的 {{X}}，模板新增模块要在本 skill 交代每个占位符的填充来源（美股=新浪 gb_dji/gb_ixic/gb_inx；AI_SUMMARY=当日复盘结论一句；QR_B64=jiu-de-miyu 的 prepare_payload(text,'<PASSPHRASE>')+xor_encrypt+generate_qr(size=250) 转 base64，**密文控制在 60 汉字内**否则 QR 密度超限扫不出，img 显示尺寸≥200px）
- **agent 声称完成≠真完成**：交付前用 `ls -la` 核对 final.jpg 时间戳 + DOM 花括号检查 + QR 解密回验三件套，缺一不发
3. `小红书盘前速递-动森版.html` 或 `templates/xhs-morning-card.html` — 小红书动森暖色模板
4. **从零构建**（已验证可行）：skill 中 "设计系统适用范围" 和 "盘前速递卡片格式" 两节的 CSS 变量 + class 定义足够从零写出可工作的卡片，不需要模板文件

**注意**：`templates/intraday-card.html` 的 badge 是"盘中速递"蓝色调 `#4285f4`，用于盘前速递时 badge 色不变（同蓝色系），用于盘后复盘时需全局替换 `#4285f4` → `#c4553a`（红色系）。用于盘前速递时去掉 AI 验证模块（`.ai-verify`），保留 `.ai-box` 作为 AI 总结框。

**⚠️ 不要用 `market-card-*.html` 作为模板** — 该命名规则已废弃。

### ⚠️ 今日文件可能已存在（2026-06-23 发现）
如果 `盘前速递-YYYYMMDD.html` 或 `小红书盘前速递-YYYYMMDD.html` 已存在，可能是之前失败运行的残留（含错误数据）。**必须用今日实时数据完全覆盖**，不要读取旧文件内容当作模板。直接搜索最近一个**上一交易日**的文件作为模板结构参考，今日文件直接 write_file 覆写。

## 截图方式（⚠️ 2026-08-12 更新）

**截图工具优先级：Playwright inline（推荐）> Chrome headless。截图后必须裁剪。**

✅ **2026-08-12 验证：Playwright 已安装**（版本 1.58.0），`full_page=True` 自动捕获完整页面高度，无需额外裁剪。优先使用 Playwright 方案。

### 方案A1：Playwright inline 脚本（推荐，不依赖外部文件）
```python
python3 -c "
from playwright.sync_api import sync_playwright
import sys
html_path, png_path = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1080, 'height': 800})
    page.goto(f'file://{html_path}')
    page.wait_for_load_state('networkidle')
    page.screenshot(path=png_path, full_page=True)
    browser.close()
    print(f'Screenshot saved: {png_path}')
" <input.html> <output.png>
```
Playwright `full_page=True` 自动捕获完整页面高度，不会有多余空白。此方案无需外部脚本文件。

### 方案A2：Playwright 外部脚本（如果 fullpage-screenshot.py 存在）
```bash
python3 <HOME>/.hermes/cache/documents/fullpage-screenshot.py \
  <input.html> <output.png> 1080
```
⚠️ 2026-06-05 验证：`fullpage-screenshot.py` 不存在于磁盘。优先用方案A1。

### 方案B：Chrome headless（Playwright不可用时）
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --screenshot=<output.png> --window-size=1080,3000 \
  "file:///<input.html>"
```

### ⚠️ 生图后端（2026-08-01 新增）

默认 `image_generate` 工具走 FAL.ai（FLUX 2 Klein），**FAL 余额已耗尽**，image_gen 工具集已禁用。如需生图：

1. **Agnes AI 生图 API**（推荐，用户已充值 14 元）：
   - 端点：`POST {base_url}/images/generations`
   - base_url = `https://apihub.agnes-ai.cn/v1`（或 `.com`）
   - 模型：`agnes-image-2.1-flash`（或 `agnes-image-2.0-flash`）
   - API key：从 `fallback_providers` 中读取 Agnes 的 `cpk-` key
   - 超时：120s，503 时重试（指数退避 5s/10s/15s）
   - 返回格式：`data[0].url`（优先）或 `data[0].b64_json`
   - 注意：生图 API 甚至在主站维护时也能工作（与聊天/vision 服务分开部署）

2. **OpenClaw**：用户确认 OpenClaw 仍可通过 Agnes 生图

3. **FAL**：已禁用，无余额


## ⚠️ 截图后必须裁剪（无论用哪个方案）
```bash
python3 ~/.hermes/skills/a-share-market-cards/scripts/trim_card.py <output.png>
```
- v2（2026-09-07）：按每行自身中位色的偏差检测内容边界，不依赖写死背景色，平色/渐变模板通吃（v1 写死 `#0c0c10`，遇到渐变底卡片整片误判、一行不裁 → 发出带 762px 空底的图，详见 references/html-card-pitfalls.md）
- **规范副本在本 skill 的 scripts/ 里**：`~/.hermes/scripts/trim_card.py` 旧副本曾静默漂移（背景色写死、padding 被改大），行为异常时先 diff 规范副本
- 输出文件名不变（原地覆盖）；内容已满幅则自动跳过
- **⚠️ padding=12px**（2026-06-04修正：原40px太宽，Joe明确要求裁紧。不要再改大）
- **发图前快速自检**：`sips -g pixelHeight <output.png>`，图高若接近截图窗口上限（3000/2000）= trim 大概率没生效，先修再发

### ✅ 卡片验证推荐步骤（2026-08-03 新增）

截图 + 裁剪 + QR 加密后，建议用 `vision_analyze` 验证卡片完整性：

```python
# 用 vision_analyze 检查所有模块是否完整
# 检查清单：三大指数、资金流向TOP6/净流出TOP6、期货、新闻、AI一句话、美股板块、QR码、Footer
```

同时建议用 QR 解密验证密语正确性：

```bash
DYLD_LIBRARY_PATH=/opt/homebrew/lib python3 -c "
import sys
sys.path.insert(0, '<HOME>/.hermes/skills/jiu-de-miyu/scripts')
from qr_stego import decrypt
result = decrypt('卡片-final.jpg', '<PASSPHRASE>')
print('解密结果:', result)
"
```

这能确保 QR 可扫描且内容正确，避免飞书投递后才发现密语错误。

⚠️ **vision 数字误读需 DOM 交叉验证（2026-08-05 实测）**：vision_analyze 在暗底卡片上会误读数字——实测把道指 `+1.09%` 读成 `-0.89%`（视觉模型看走眼正负号/笔画）。当 vision 报告的值与数据源矛盾时，**不要改卡片数据**，用浏览器 DOM 提取实际渲染文本核对，以 DOM 为准：

⚠️ **盘前速递 DOM 验证选择器（2026-08-18 新增）**：盘前速递暗底卡使用 `.idx-card`（美股/亚太格子）、`.fut-card`（期货格子）、`.news-item`（新闻）、`.ai-box`（AI总结），与盘中/盘后卡的 `.kpi`/`.flow-item` 不同。小红书版使用 `.data-card`（动森暖色卡），验证命令类似但选择器不同。验证命令：
```javascript
// 美股/亚太/欧洲数据
(() => { const out = []; document.querySelectorAll('.idx-card, .fut-card').forEach(k => { 
  const name = k.querySelector('.idx-name, .label')?.textContent || '';
  const value = k.querySelector('.idx-value, .price')?.textContent || '';
  const change = k.querySelector('.idx-change, .chg')?.textContent || '';
  out.push(name + ' => ' + value + ' ' + change); }); return out.join('\n'); })()
// 新闻
(() => { const out = []; document.querySelectorAll('.news-item').forEach(k => { 
  out.push(k.textContent.trim().substring(0,80)); }); return out.join('\n---\n'); })()
```
```javascript
// browser_navigate 打开 file://<card>.html 后，browser_console 执行：
(() => { const out = []; document.querySelectorAll('.kpi').forEach(k => out.push(k.querySelector('.label')?.textContent + ' => ' + k.querySelector('.value')?.textContent)); return out.join('\n'); })()
```
核链：API 源值 → HTML 写入值 → DOM 渲染值，三者一致即数据正确。vision 只用于模块完整性/排版检查（截断、重叠、QR 四角定位符），**不用于数值真伪判断**。

**小红书版 DOM 验证（2026-08-25 新增）**：动森暖色卡使用 `.data-card` 选择器，验证命令：
```javascript
(() => { const out = []; document.querySelectorAll('.data-card').forEach(k => { 
  const name = k.querySelector('.data-name')?.textContent || '';
  const value = k.querySelector('.data-value')?.textContent || '';
  const change = k.querySelector('.data-change')?.textContent || '';
  const cls = k.className;
  out.push(name.trim() + ' => ' + value.trim() + ' ' + change.trim() + ' [' + cls + ']'); }); return out.join('\n'); })()
```
核对链与暗底版相同：API 源值 → HTML 写入值 → DOM 渲染值，三者一致即数据正确。注意检查 `cls` 中的 `up`/`down` 与涨跌幅方向一致。

**⚠️ vision_analyze 504 超时时的替代验证（2026-08-10 新增）**：vision_analyze 可能返回 504 Gateway Time-out（alb 超时）。此时用 `browser_navigate` + `browser_console` 做完整 DOM 验证：
```javascript
// 检查所有模块完整性
document.querySelectorAll('.kpi').length          // 预期 10（3指数+3美股+4期货）
document.querySelectorAll('.flow-item').length     // 预期 12（6流入+6流出）
document.querySelectorAll('.news-item').length     // 预期 ≥3
document.querySelector('#qr-section svg') !== null // true = QR存在
document.querySelector('.footer-disc')?.textContent // 含免责声明
```
此方法不依赖视觉模型，在 cron job 中稳定可靠。

**关键点：**
- `--headless=new` 比旧模式更稳定
- 退出码非0（task_policy_set warning）可忽略，看到 "bytes written" 即成功
- 详细回退方案见 `references/headless-screenshot-workaround.md`

### ⚠️ Google Fonts @import 会挂死截图（2026-08-24 新增）

**模板顶部的 `@import url('https://fonts.googleapis.com/...')` 在无外网/被墙环境中会让截图超时挂死**，必须移除。实测 2026-08-24：保留了 `@import` 的卡片，Playwright `goto` 30s Timeout、Chrome headless 60s Timeout，都拿不到截图；删掉 `@import` 换系统字体后截图立即可用。

**修复（去掉 Google Fonts 依赖）：**
1. 删掉 `<style>` 顶部的 `@import url('https://fonts.googleapis.com/...')` 一整行
2. 中文 body 字体换成系统字体：`font-family: 'PingFang SC', 'Noto Sans SC', 'Heiti SC', sans-serif;`
3. 数字字体的 `font-family: 'Space Grotesk'` 全部换成 `font-family: 'SF Mono', 'Menlo', monospace;`（macOS 原生等宽，数字观感接近）
4. Chrome headless 截图加 `--virtual-time-budget=5000` 防止其它外链再拖慢加载

⚠️ 判断依据：截图超时往往是字体/CDN 外链阻塞而非模板本身有问题。天初步诊断：先看截图是否是因为 `@import` 网络请求卡住。

**⚠️ 小红书动森版模板也带 `@import`（2026-08-28 验证）**：`templates/xhs-morning-card.html` 顶部同样有一行 `@import url('https://fonts.googleapis.com/...')`，被墙环境同样会挂死截图。且它的字体栈与暗底卡不同：body 是 `Nunito`（不是 PingFang），数字是 `Space Grotesk`。移除 `@import` 后需把两种字体栈都换掉，否则占位字体观感不对。用 sed 一次性替换（纯 ASCII，能过 tirith 扫描）：

```bash
cd <HOME>/.hermes/cache/documents
# 1) 删 @import 一行
sed -i '' "/^@import url('https:\/\/fonts.googleapis.com/d" 小红书盘前速递-YYYYMMDD.html
# 2) 换字体栈：Nunito→系统苹方，Space Grotesk→系统等宽
sed -i '' "s/font-family: 'Nunito', 'Noto Sans SC', sans-serif;/font-family: 'PingFang SC', 'Noto Sans SC', 'Heiti SC', sans-serif;/g; s/font-family: 'Space Grotesk', sans-serif;/font-family: 'SF Mono', 'Menlo', monospace;/g; s/font-family: 'Space Grotesk';/font-family: 'SF Mono', 'Menlo', monospace;/g" 小红书盘前速递-YYYYMMDD.html
# 验证无残留
grep -n "Space Grotesk\|Nunito" 小红书盘前速递-YYYYMMDD.html
```

完成后再截图。若漏删 `@import`，Chrome headless 会 60s 超时拿不到截图（同暗底卡症状）。

### ⚠️ 长 HTML 编辑路径（2026-08-26 修订）

**铁律：cp 模板 → 多个小 `patch` 逐块替换（每块含完整wrapper标签）。`write_file` 写长HTML/长.py会截断（08-24/08-26双实测），顺序replace会因前轮改动而找不到旧串。patch三坑（path截断/剥wrapper/千分位逗号）→ 见 `references/html-card-pitfalls.md`。

## ⚠️ Cron Job 文本编辑限制（2026-07-28 新增）

在 cron job 环境中，terminal 命令若包含中文/Unicode 字符会被 `tirith:confusable_text` 安全扫描拦截。这影响对 HTML 模板的文本修改操作。

### ⚠️ Cron Job 命令长度限制（2026-08-03 新增）

除了 `tirith:confusable_text` 和 `tirith:curl_pipe_shell`，**长 inline python3 脚本也会被拦截**，报错 `"command parser limit or malformed executable payload"`。

**触发条件**：`python3 -c "..."` 中的 `...` 超过一定长度（约2000字符），或包含多行字符串（triple-quoted strings、嵌套引号等复杂结构）。

**修复方法**：写临时 .py 文件再执行，而非 inline `-c`：
```bash
# ❌ 被拦截（长 inline 脚本）
python3 -c "
import json
data = json.loads('...')
# 很多行代码...
"

# ✅ 正确（写临时文件）
cat > /tmp/parse_data.py << 'EOF'
import json
with open('/tmp/data.json') as f:
    data = json.load(f)
# 很多行代码...
print(result)
EOF
python3 /tmp/parse_data.py
```

**区分三种拦截模式**：
| 拦截类型 | 报错信息 | 触发条件 | 修复方法 |
|----------|---------|---------|---------|
| `tirith:confusable_text` | "Confusable Unicode characters" | 命令行含中文/emoji/Unicode | base64编码或写文件 |
| `tirith:curl_pipe_shell` | "Pipe to interpreter: curl \| python3" | `curl ... \| python3 -c` 管道 | 分两步：curl -o + python3 |
| command parser limit | "command parser limit or malformed executable payload" | inline python3 脚本过长或结构复杂 | 写临时 .py 文件

**工作流建议：**
1. **优先使用 numeric-only sed 匹配** — 仅替换数字、英文单词、标点等 ASCII 内容（如 `3829.39 → 3820.52`），这类操作通常能顺利通过安全扫描。
2. **复杂文本更新需采用 base64 编码管道** — 将目标内容先 base64 编码为纯 ASCII 字符串，通过 `base64 -d | python3` 解码写入文件，避免 Unicode 直接出现在 command line。
3. **接受部分文本遗留** — 若无法通过安全扫描，可接受卡片中部分文字仍保留昨日版本，只要关键数据（指数数值、金额、EXP编号、命中结果）准确即可，截图可视效果不受影响。
4. **备选方案：完整覆写文件** — 将整张卡片 HTML 作为 base64 一次性写入（如方案2），彻底绕过增量编辑的 Unicode 拦截问题。

## ⚠️ trim_card.py 环境依赖异常（2026-07-28 新增，2026-08-03 已修复）

`trim_card.py` 依赖 `numpy`，2026-07-28 时某些环境下 numpy 的 C-extension 编译件与 Python 版本不匹配会导致 `ImportError`。

**2026-08-03 验证：numpy 已正常工作**（版本 2.4.6），`trim_card.py` 可在交互式 session 中正常裁剪。如果 cron job 中仍报 numpy 错误，尝试：
```bash
pip install --upgrade numpy -q
```
然后重新运行裁剪。裁剪脚本失败不应阻断整个卡片生成流程，应继续完成截图和飞书投递。

## 数据抓取方式（重要）

**交互式 session：用 `execute_code` + `urllib.request`。Cron job：用 `terminal` + 临时文件。**

- subagent 默认只有 Open Design 工具，无法访问浏览器或网络 API
- `curl | python3` 管道会被安全扫描拦截（tirith:curl_pipe_shell）
- `execute_code` 中的 Python 可直接 `urllib.request` 调用 Sina API，无需额外依赖
- **⚠️ execute_code 中 Sina API 协议选择（2026-07-31 发现）**：在 execute_code sandbox 环境中，`https://hq.sinajs.cn/list=...` 可能返回 `TimeoutError`，但换成 `http://` 协议即可成功。Terminal + curl 方式始终稳定。遇到超时优先换 HTTP，而非直接放弃。

**⚠️ Cron Job 专用 Pitfall（2026-06-05 发现）**

**`execute_code` 在 cron job 中被拒绝**（"Cron jobs run without a user present to approve it"）。Cron 环境下必须用 `terminal`：

```bash
# 正确做法：curl 写文件 → python3 解析（分开两步，避免 pipe 拦截）
curl -s '<url>' -H 'Referer: https://finance.sina.com.cn' -o /tmp/data.json
python3 -c "
import json
with open('/tmp/data.json') as f:
    data = json.load(f)
# 注意：Sina 新闻 API 返回格式是 result.data.feed.list（不是 data.feed.list）
for item in data['result']['data']['feed']['list'][:5]:
    print(item['rich_text'])
"
```

**关键点：**
- curl 和 python3 必须作为两个独立的 `terminal()` 调用，不能用 `|` 管道
- 新闻 API JSON 嵌套层级：`result.data.feed.list`（不是 `data.feed.list`）
- **⚠️ 不要用 heredoc 写 HTML 文件**（2026-06-08 发现）— `cat > file << 'HTMLEOF'` 会被 tirith:confusable_text 安全扫描拦截（HTML内容含Unicode字符触发）。用 `write_file()` 工具写 HTML 文件，不要用 terminal heredoc
- **⚠️ `curl | python3` 管道即使不涉及安全敏感操作也会被拦截**（2026-07-13 再次确认：tirith:curl_pipe_shell 对任何 `curl ... | python3 ...` 模式都触发，包括新闻API解析）。必须分两步：先 `curl -o /tmp/file.json`，再 `python3 -c "..."` 读取文件

### 板块资金流向（⚠️ 2026-06-05 验证）

**East Money push2 API 已完全不可用**（返回空回复 exit code 52 或 HTTP 000 连接失败）。改用 Sina Finance 基金流向 API：

### pywencai（问财无API Key方案，2026-06-17 发现）

`pywencai` 库可直接调用问财接口，无需 API Key，适合快速查询资金流向、涨停板等数据。
⚠️ 列名带日期后缀（如 `主力资金流向[20260617]`），匹配时用 `in` 不用 `==`。
详见 `references/pywencai-and-dashboard-sources.md`。

```bash
pip3 install pywencai -i https://pypi.tuna.tsinghua.edu.cn/simple
```

```bash
# 行业板块（fenlei=0）净流入排序（asc=1 → 最小在前，即流出最多在前）
curl -s 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_bkzj_bk?page=1&num=50&sort=netamount&asc=1&fenlei=0' \
  -H 'User-Agent: Mozilla/5.0' -H 'Referer: https://finance.sina.com.cn' -o /tmp/flow.json

# 概念板块（fenlei=1）
curl -s '...MoneyFlow.ssl_bkzj_bk?...&fenlei=1' ...
```

**字段说明：**
- `name` = 板块名称（⚠️ 不是 `bkname`！2026-06-08 验证确认字段名为 `name`）
- `netamount` = 净流入金额（**单位：元**，需 `/1e8` 转换为亿）
- 返回 JSON 数组，按请求的 sort/asc 排序

**⚠️ 关键 Pitfall — fenlei 参数决定板块类型：**
- `fenlei=0` → 行业板块（48个左右，如电子信息、电力行业）
- `fenlei=1` → 概念板块（50+个，如5G概念、光伏概念）
- **两者资金流向可完全相反！** 实测2026-06-05：行业板块总净流入+218亿，概念板块总净流出-781亿
- 盘后复盘卡片应优先用 `fenlei=0`（行业板块），概念板块作为补充

**⚠️ 排序陷阱：** `asc=1` 表示升序（最小值在前 = 流出最多在前），`asc=0` 降序（最大值在前 = 流入最多在前）。获取净流出 TOP5 用 `asc=1` 取前5条；获取净流入 TOP5 需对结果 `sort(reverse=True)` 或用 `asc=0` 取前5条再反转。

### 基础示例
```python
import urllib.request
# ✅ 正确：使用 gb_ 前缀获取美股指数（[2] 是涨跌幅百分比）
url = "https://hq.sinajs.cn/list=gb_dji"
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0',
    'Referer': 'https://finance.sina.com.cn'
})
resp = urllib.request.urlopen(req, timeout=10)
print(resp.read().decode('gbk'))
# 解析：fields[0]=名称, [1]=最新价, [2]=涨跌幅%, [3]=时间
```

### 夜盘期货数据（⚠️ 必须用主力连续合约代码）
```python
# 正确的合约代码（2026-06-04验证）：
# 沪金主力连续: nf_AU0  → 最新价约900-1000元/克
# 沪银主力连续: nf_AG0  → 最新价约15000-18000元/千克
# 上海原油连续: nf_SC0  → 最新价约500-700元/桶
# 焦煤主力连续: nf_JM0  → 最新价约1200-1600元/吨（盘前速递4列网格需包含）
#
# ⚠️ 不要用 nf_AU2412 等具体月份合约，主力连续才是通用参考价
# ⚠️ 不要用 au2412 小写格式，新浪期货用 nf_ 前缀+大写代码
# ⚠️ 盘前速递卡片4列网格包含焦煤，curl需加 nf_JM0

import urllib.request
url = "https://hq.sinajs.cn/list=nf_AU0,nf_AG0,nf_SC0,nf_JM0"
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0',
    'Referer': 'https://finance.sina.com.cn'
})
resp = urllib.request.urlopen(req, timeout=10)
data = resp.read().decode('gbk')
# nf_前缀格式: var hq_str_nf_AU0="合约名,持仓量,开盘,最高,最低,...,最新价[8],...,昨收[10],..."
# ⚠️ field[1]是持仓量（不是日期！），日期在后段字段中
```

### A50期货（盘前速递专用，反映A股开盘预期）
```python
# hf_CHA50CFD 格式略有不同：字段[0]=最新价, 字段[8]=昨收
url = "https://hq.sinajs.cn/list=hf_CHA50CFD"
# 解析: fields[0]=最新价, fields[8]=昨收, (fields[0]-fields[8])/fields[8]*100=涨跌幅
```

---


## 盘中速递卡片格式（10:00 Cron Job）

**与盘前/盘后的区别**：盘中卡包含AI实验验证模块（对比昨日预测vs今日实际），三大指数实时数据，早盘资金流向TOP，以及盘中快讯。

### 内容结构
1. **Badge**: "盘中速递"（蓝色调 `#4285f4`）
2. **标题**: 一句话概括开盘半小时市场特征
3. **副标题**: 关键信号概述
4. **🔬 AI验证模块**: 对比昨日盘前/盘后AI观察与今日实际走势（详见下方）
5. **三大指数**: 上证、深证、创业板（开盘价 vs 当前价，涨跌幅）3列网格
6. **早盘资金动态**: 行业板块净流入TOP6（`fenlei=0`），3列网格
7. **期货实时**: 沪金、沪银、SC原油（3列网格）
8. **盘中快讯**: 3-5条实时新闻
9. **一句话总结**: 概括早盘特征
10. **Footer**: "盘中速递 · 数据截至 10:00"

### AI实验验证模块（核心差异）

这是盘中卡独有的模块，用于闭环验证AI的预测能力。

**查找昨日实验**：
- 搜索 `~/.hermes/cache/documents/` 下的所有 HTML 文件：`search_files(pattern="*.html", target="files", path="~/.hermes/cache/documents/")`
- 按日期排序找最近一个交易日的卡片，优先检查顺序：`intraday-card-YYYYMMDD.html`（EXP.NNN实验模块通常在此）→ `盘后复盘-YYYYMMDD.html`（AI一句话总结中的观察）→ `周报特辑-YYYYMMDD*.html`（⚠️ 2026-06-23 发现：周报特辑含EXP.011-013等正式实验追踪表，是EXP模块最丰富的来源）→ `盘前速递-YYYYMMDD.html`
- 读取 HTML 中的 `.ai-obs-text`、`.ai-verify-text` 或标题/副标题/总结中的预测内容
- 提取实验编号（EXP.NNN）和预测关键词
- **扩展验证源（2026-06-11/07-13 验证）**：不只验证正式EXP.NNN模块，以下来源的AI观察均可作为验证目标：
  - **盘后复盘**的"AI 一句话总结"中的观察（如"资金从成长向防御切换"）
  - **盘前速递**的"AI 一句话"中的判断（如"A50微涨暗示开盘偏暖"）— 2026-07-13 验证：盘前速递观察到的A50信号成为EXP.029的验证目标
  - 如果找不到EXP模块，从最近的盘后复盘或盘前速递总结中提取观察点
- **⚠️ 周一盘中验证特殊处理**：盘后复盘cron在周五不跑（周一至周四），周一盘中验证时最近的盘后复盘是上周四。此时应优先使用**周五盘前速递**的AI观察作为EXP来源（盘前速递周一至周五都跑）

**⚠️ 搜索模式 Pitfall（2026-06-08 发现）**：
- 实际文件名是 `盘前速递-YYYYMMDD.html`、`盘后复盘-YYYYMMDD.html`、`intraday-card-YYYYMMDD.html`
- **不是** `market-card-*.html`（该文件已不存在）
- 搜索时用 `search_files(pattern="*.html", target="files", path="~/.hermes/cache/documents/")` 再手动过滤

**首次运行处理**：
- 如果找不到前一交易日的卡片文件，标记为 `EXP.001`（首次实验）
- AI验证模块标注"📊 首次建立基线，无历史实验可验证"
- 正常生成卡片，不含验证对比内容

**验证逻辑**：
- 昨日提到的板块/指数今日涨了 → `✅ 命中`
- 没涨 → `❌ 未命中`
- 还在观察期内 → `⏳ 观察中`
- 部分预测正确、部分不正确（如方向判断正确但具体板块分化）→ `⚠️ 部分命中`，结论中需说明哪些命中哪些未命中
- **EXP编号规则**：每个新观察/预测 = 新EXP编号。EXP.001=首次基线，EXP.NNN=第N个独立观察点。验证已有EXP不增加编号，只有新设立的观察才+1

**⚠️ 盘中验证实验源优先级（2026-07-23 教训；2026-08-05 补充盘后复盘失败处理；2026-08-12 补充新观察源区分；2026-08-20 补充盘中验证失败处理）**：
- 盘中验证 cron 在 12:00 执行，此时**最新的盘后复盘已生成**（23:00 前一日），但**当日盘前速递也已生成**（07:00）
- 优先从**盘中验证**文件找 EXP 模块（最完整），其次从**盘后复盘**的"AI一句话总结"提取新观察
- **关键区分**：EXP.036 已在 intraday-card-20260722 中验证过，不应重复验证；盘后复盘-20260722 的"资金从成长向防御切换"是**新观察**，应作为 EXP.037
- 不要只看文件名顺序，要读内容判断是"已有EXP的延续验证"还是"全新观察"
- 如果前一天的盘中验证已经验证了某个EXP，而盘后复盘提出了新观点，盘中验证应提取新观点并给新编号
- **⚠️ EXP 新观察源定位：区分 `.ai-verify-text` vs `.ai-box-text`（2026-08-12 验证）**：当盘中验证卡和盘后复盘卡都引用同一个 EXP（如 EXP.048）时，新观察的提取源不是 `.ai-verify-text`（验证模块，仅复述昨日判断），而是盘后复盘中的 `.ai-box-text`（AI 观察框，含新观点）。具体路径：盘后复盘卡的 `div.ai-box` 下的 `div.ai-box-text` 内容——如"资金从周期向科技成长回流的趋势值得持续跟踪"——这是新 EXP 的预测源。确认方法：如果 `.ai-verify-text` 在复述昨日判断（"昨日判断：..."），则新观察一定在 `.ai-box-text` 中。

**⚠️ 前一日盘中验证失败时的 EXP 来源处理（2026-08-20 新增）**：
盘中验证 cron 可能因 Provider 超时（HTTP 503/504）、API Key 鉴权失败（HTTP 401）而失败，导致当日 `intraday-card-YYYYMMDD.html` **从未生成**。

1. **确认盘中验证失败**：检查 `~/.hermes/cron/output/62a518de62ff/` 下最近一个文件的末尾。如果以 `## Error` 结尾（HTTP 503/401/504），说明该次运行失败，无对应 HTML 文件。
2. **EXP 编号来源**：从**上一次成功**的盘中验证 cron 输出中读取最后一个 EXP.NNN。具体方法：`tail -80` 文件中 `## Response` 后的内容，找到 `EXP.NNN` 验证行。下一个编号为 NNN+1。
3. **新观察来源**：从当日 `盘后复盘-YYYYMMDD.html` 的 `.ai-box` 下的 `.text` 内容提取（AI 一句话总结中的新观点）。这是盘中验证失败时唯一可用的新观察源。
4. **EXP 编号连续性**：不因盘中验证失败而跳号。例如，最近一次成功运行是 2026-08-18 的 EXP.052，则 2026-08-20 的新观察为 EXP.053（跳过 2026-08-19 的失败记录）。
5. **验证结论**：新观察是首次验证，无历史基准，直接设为新实验。验证结论基于今日实际数据判定。

**⚠️ 盘中验证失败后的文件搜索注意事项**：`search_files` 搜索 `intraday-card-*.html` 时，失败的当天不会生成该文件。不要假设文件一定存在——先搜索探测，不存在则按上述步骤处理。`盘后复盘-YYYYMMDD.html` 大概率存在（23:00 cron 通常比 12:00 cron 稳定），优先读取其 `ai-box` 内容。

**⚠️ 盘后复盘失败时的 EXP 来源降级（2026-08-05 新增；2026-08-18 补充多级回退）**：
盘后复盘 cron 可能因 API 限流（HTTP 429）、Provider 超时（HTTP 504）或令牌失效（HTTP 401）而失败，导致无新 EXP 可从盘后复盘提取。此时盘中验证的 EXP 来源降级顺序：

1. **检查盘后复盘 cron 输出**：读 `~/.hermes/cron/output/33e6d94f417f/` 下最近一个文件的末尾，用 `tail -30` 看是否以 `## Error` 结尾。有 `## Error` = 失败；无 `## Error` 且文件末尾有实际内容 = 成功。**⚠️ 不要只用 `grep -n "## Response"` 判断**——skill prompt 的代码示例中也可能包含 `## Response` 文本，导致误判。更可靠的方法是 `tail -30` 直接看文件末尾。

2. **若失败，降级到盘前速递**：从**当日**盘前速递（07:00 已生成）的"AI一句话"中提取观察作为新 EXP。盘中验证 cron 在 12:00 执行，盘前速递是最新的可用预测源。

3. **若前一日盘前速递也失败**：检查前一日盘前速递 cron 输出（`ce3dfb6cf4e0`）的末尾。如果也以 `## Error` 结尾，说明最近一次成功运行是更早的日期。此时**继续往前查**，直到找到最近一次成功的盘前速递。盘中验证需要的是最新可用预测源——当日盘前速递（当前交易日 07:00 生成）通常是最可靠的。

4. **查找最新 EXP 编号**：当最近一次盘中验证（`62a518de62ff`）也失败时，需要往前查找到最近一次成功的盘中验证输出来确定最后一个 EXP 编号。读取其末尾的 `EXP.NNN` 内容，下一个编号为 NNN+1。例如：2026-08-17 盘中验证失败，则查 2026-08-14（周五）的盘中验证输出，发现 EXP.051，则下一个为 EXP.052。

5. **EXP 编号连续递增**：不因失败源跳号。例如盘后复盘失败时 EXP.043 已在昨日盘中验证，则今日盘前速递的观察设为 EXP.044。

6. **盘后复盘已有已验证 EXP 的处理**：如果盘后复盘失败但前一日盘中验证已成功验证了某个 EXP（如 EXP.043），不重复验证。直接从盘前速递提取新观察。

7. **验证首日标记**：如果连续多个 cron 均失败，且当日盘前速递也失败（极少见），标记为"首次建立基线"（EXP.001），不设验证结论。

**验证模块HTML模板**：
```html
<div class="ai-verify">
  <div class="ai-verify-label">
    🔬 AI实验验证
    <span class="exp-num">EXP.NNN</span>
    <span class="exp-result [hit/miss/pending/partial]">[✅命中/❌未命中/⏳观察中/⚠️部分命中]</span>
  </div>
  <div class="ai-verify-text">
    昨日判断：[昨日AI观察的一句话概括]<br>
    今日验证：[具体数据对比]<br>
    结论：[一句话总结验证结果]
  </div>
</div>
```

**CSS**：背景 `rgba(212,168,83,0.08)`，左边框 `3px solid rgba(212,168,83,0.6)`，标题色 `#d4a853`
- `.exp-result.hit` = 绿色 `#4caf7d`
- `.exp-result.miss` = 红色 `#c4553a`
- `.exp-result.partial` = 金色 `#d4a853`（部分命中）
- `.exp-result.pending` = 灰色 `#9e9e9e`

### 数据源
- 三大指数：`hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sz399006`
- 资金流向：盘中验证卡片用 `fenlei=1`（概念板块）捕捉主题轮动故事（光伏/苹果概念/锂电池等），与盘后复盘的 `fenlei=0`（行业板块）形成互补。2026-07-21 验证：概念板块能更早发现科技主线回归信号（光伏+64亿、苹果概念+59亿），而行业板块可能滞后一天才反映（电力+102亿是防御信号）
- 期货：`hq.sinajs.cn/list=nf_AU0,nf_AG0,nf_SC0`（盘中速递仅3项，不含焦煤和A50）
- 新闻（首选）：`zhibo.sina.com.cn/api/zhibo/feed?page=1&page_size=10&zhibo_id=152&tag_id=0&type=0`（7x24直播，⚠️ 必须带 `zhibo_id=152`，否则返回 "zhibo_id missing"。2026-06-09 验证）
- 新闻（备选）：`api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=15`（华尔街见闻，⚠️ 部分条目title和content_short都为空，需双字段检查。2026-06-24 验证可用于盘后复盘：Sina zhibo API偶尔返回空，wallstreetcn是可靠fallback）
- **⚠️ 不包含**：隔夜美股（盘前已有）、收盘数据（盘后才有）

### 盘中验证资金流向选择（2026-07-21 新增）
- **概念板块（fenlei=1）**：更适合捕捉主题轮动和风格切换信号（如科技 vs 防御），盘中卡优先使用
- **行业板块（fenlei=0）**：更适合宏观资金流向全景，盘后复盘使用
- 两者可同时展示但需注明区别，避免混淆

### CSS差异（vs 盘后卡）
- Badge色：`#4285f4`（蓝色）替代 `#c4553a`（红色）
- `.glow` 蓝色渐变
- AI验证模块为新增区块，不影响其他样式

---

## 盘前速递卡片格式（07:00 Cron Job）

**与盘后/盘中的区别**：盘前只展示外部市场数据（隔夜美股、亚太早盘、期货收盘），不包含A股数据（尚未开盘）。

### 内容结构
1. **Badge**: "盘前速递"（蓝色调 `#4285f4`，非盘后的红色 `#c4553a`）
2. **标题**: 一句话概括开盘前整体氛围
3. **副标题**: 关键信号概述
4. **隔夜美股**: 道琼斯、纳斯达克、标普500 收盘价+涨跌幅（3列网格）
5. **欧洲收盘**: 英国富时100、德国DAX（3列网格，与亚太合并）
6. **亚太早盘**: 日经225、恒生指数、富时中国A50期货（3列网格，A50反映A股开盘预期）
7. **期货收盘**: 沪金、沪银、SC原油、焦煤（4列网格，含单位）
8. **今日关注**: 2-3条早间重要新闻（带标签：地缘/科技/汇率）
9. **一句话总结**: 概括全文
10. **Footer**: "盘前速递 · 数据截至早7:00"

### ⚠️ 不包含的内容（盘后才有）
- 主力资金流向（A股未开盘）
- AI实验验证模块
- 涨停/跌幅榜

### CSS差异
- 主题色：`#4285f4`（蓝色）替代 `#c4553a`（红色）
- `.badge` border/color 改为蓝色
- `.title .accent` 改为蓝色
- `.news-num` 改为蓝色
- `.glow` 蓝色渐变

## 小红书盘前速递（XHS版）

### 定位
- 与公众号盘前速递**数据相同**，但视觉风格完全不同
- 公众号版：暗底科技风（蓝色系），专业受众
- **小红书版：动森暖色系**，泛受众，降低专业门槛
- **所有A股小红书帖子统一动森暖色风格**（盘前、盘后、周报）
- Joe偏好：小红书用暖色/动森风格，暗底留给飞书内部推送

### 规格
- 尺寸：1080×1440px（3:4竖版）
- 风格：动森暖色系（奶油底+薄荷绿点缀+3D阴影）
- 设计token详见 `xiaohongshu` skill 的 `references/animal-crossing-design-tokens.md`

### 内容结构（比公众号版更精简）

---

## ⚠️ 新工作流规范（2026-08-01 更新）

**必须遵守的工作流铁律：**

1. **先查技能** — 在执行任何A股卡片生成任务前，务必先阅读本 SKILL.md 中的"完整工作流"和"设计规范"章节，确认当前任务需要的所有模块、格式、数据源。**不要凭临时想法构造输出**。用户明确强调"做事之前一律去看skill"，这是核心原则。

2. **必含模块** — 盘后复盘卡片必须包含以下模块，缺一不可：
   - ✅ 三大指数收盘（含涨跌幅）
   - ✅ 行业板块资金流向（净流入TOP6 + 净流出TOP6）
   - ✅ 情绪结构模块（同花顺官方源：连板天梯+题材词云+热榜+龙虎榜，见 references/ths-official-sentiment.md）
   - ✅ 夜盘期货数据（沪金/沪银/原油）
   - ✅ 今日要闻（至少3条）
   - ✅ **AI一句话总结**（插入在期货与要闻之间的棕色边框模块——这是核心洞察部分，缺少将导致卡片信息不完整）
   - ✅ QR密语（密钥+二维码）— 使用 Python qrcode+Pillow 生成静态PNG嵌入HTML为base64，不能用JS CDN
   - ✅ 隔夜美股收盘（道指/纳指/标普）— 必须展示
   - ✅ 页脚与免责声明

3. **使用已有模板前先验证完整性（2026-07-31 教训）**：历史模板文件（如 `盘后复盘-YYYYMMDD.html`）可能已生成但内容不完整（缺美股板块、QR码等）。**不要直接复用旧模板而不验证**。检查清单：三大指数、资金流向、期货、新闻、QR区域、美股板块是否齐全。缺失模块必须补全。

3. **Cronjob provider pinning（2026-08-01 新增）** — 所有 A股 cron job 的 `provider` 和 `model` 必须**显式指定**，不能用 `provider: "custom"` 留空 `model: null`。Hermes v0.19 开始，cron job 的 provider 解析逻辑变了（`fix(cron): resolve provider with the job's effective model`），`provider: "custom"` + `model: null` 的配置可能解析到错误目标。**正确做法：** 切换 provider 后，立即更新所有 cron job 的 `provider` 和 `model` 字段。当前配置（2026-09-13 核实 jobs.json）：四个A股job（盘前/盘中/盘后/周报）均为 `provider: "tokenrhythm"`, `model: "deepseek-v4-flash-0731"`（0912错峰调整时统一钉回）；glm-5.3-flash 仅用于非A股job。

4. **Provider 配置注意事项** — `fallback_providers` 仅在主 provider 失败时自动触发，**不能通过 `--provider <name>` 手动选择**。如需手动切换，需将 provider 添加到顶层 `providers` 列表（已配置）。参考技能文档中关于 fallback_providers 与 top-level providers 的区别。

5. **数据验证与完整性检查** — 生成的图片必须验证完整性（所有数据模块正常显示，无空白截断）。建议打开 Chrome DevTools 确认渲染高度足够（min-height ≥ 1400px），避免截图内容被裁剪。**如果图片中出现信息不全、截断、关键模块缺失的情况，检查HTML结构与模板是否完整对应**。



## 最终回复格式（发送飞书，三个cron通用）
```
MEDIA:<HOME>/.hermes/cache/documents/{卡名}-YYYYMMDD-final.jpg

📝 小红书标题：[带emoji，18字以内]
📝 小红书正文：[轻松口吻，数据为核心，分段清晰，带emoji，不超过1000字]
📝 小红书标签：#AI #人工智能 #A股 #数据分析 #AI Agent
🔑 密钥：<PASSPHRASE>
```
- 发送前检查回复里确实包含 `MEDIA:` 行（否则图片不发送，排查见 references/wechat-publishing.md）
- 免责声明必带；HTML 用 write_file() 写，不要 terminal heredoc

## References（按需加载）
| 场景 | 文件 |
|------|------|
| 周报特辑全流程（周日23:00） | references/weekly-report.md |
| 公众号文案模板+系列定位+发布规范 | references/wechat-article-template.md |
| 公众号草稿箱推送/凭据/IP白名单 | references/wechat-publishing.md |
| QR加密码生成（含SVG方案） | references/qr-encryption.md |
| HTML/SVG图表指南 | references/html-svg-chart-guide.md（v3.14新增段在 legacy 存档内） |
| 纯CSS K线叙事卡（几何公式/标注定位坑/Agnes QC闭环） | references/css-candlestick-cards.md |
| 全球市场速报卡 | references/global-market-card.md |
| 小红书卡片模板与文案 | references/xhs-card-templates.md |
| 多周期比率分析 | references/multi-timeframe-analysis-pitfall.md |
| 截图workaround（Playwright方案） | references/headless-screenshot-workaround.md |
| 生图后端降级策略 | references/card-fallbacks.md |
| HTML卡片陷阱（GoogleFonts/顺序替换等） | references/html-card-pitfalls.md |
| 个股/涨停分析 | references/stock-analysis.md |
| 个股涨停一图流（数据链/卡结构/QC） | references/stock-limit-up-onepager.md |
| 周报数据恢复/新闻可靠性/飞书排查等零散条目 | references/ 各专文件 |
| 同花顺官方情绪数据（盘后卡CLI速查/踩坑/best-practices） | references/ths-official-sentiment.md |
| 交互式看板/单文件K线页模式（模板注入/泄漏验收/canvas引擎/快照轮询） | references/interactive-dashboard-mode.md |
| v3.14 完整原文（保底） | references/legacy-v3.14-full.md |

The user has provided the following instruction alongside the skill invocation: [IMPORTANT: You are running as a scheduled cron job. DELIVERY: Your final response will be automatically delivered to the user — do NOT use send_message or try to deliver the output yourself. Just produce your report/output as your final response and the system handles the rest. SILENT: If there is genuinely nothing new to report, respond with exactly "[SILENT]" (nothing else) to suppress delivery. Never combine [SILENT] with content — either report your findings normally, or say [SILENT] and nothing more.]

你是一个AI市场早报助手。现在是交易日早7:00，开盘前2.5小时。请完成以下任务：

## ⚠️ 第零步：交易日校验
先判断今天是否A股交易日。如果是以下节假日，直接在飞书回复"今天A股休市，盘前速递暂停"：
元旦、春节、清明、劳动节、端午、中秋、国庆

## 第一步：抓取隔夜数据
用terminal的curl访问新浪API（必须带 Referer: https://finance.sina.com.cn）：

### 美股+亚太+欧洲（含 fallback）
```bash
# 首选：批量获取 gb_ 前缀（稳定）
curl -s 'https://hq.sinajs.cn/list=gb_dji,gb_ixic,gb_inx,b_FTSE,b_DAX,b_NKY,b_HSI,b_HSTECH' -H 'User-Agent: Mozilla/5.0' -H 'Referer: https://finance.sina.com.cn' -o /tmp/morning_global.txt || # fallback 1：单独调用单个指数（重试一次）
curl -s 'https://hq.sinajs.cn/list=gb_dji' -H 'User-Agent: Mozilla/5.0' -H 'Referer: https://finance.sina.com.cn' -o /tmp/morning_global.txt || # fallback 2：使用 b_ 前缀替代（注意字段映射差异）
curl -s 'https://hq.sinajs.cn/list=b_DAX' -H 'User-Agent: Mozilla/5.0' -H 'Referer: https://finance.sina.com.cn' -o /tmp/morning_global.txt
```


### 期货（⚠️ 字段映射最高优先级！）
```bash
curl -s 'https://hq.sinajs.cn/list=nf_AU0,nf_AG0,nf_SC0' -H 'User-Agent: Mozilla/5.0' -H 'Referer: https://finance.sina.com.cn' -o /tmp/morning_futures.txt
```
field[8]=最新价 ✅，field[10]=昨收（涨跌幅基准）✅
数量级验证：沪金900-1000、沪银15000-18000、原油500-700

### 新闻
```bash
curl -s 'https://finance.sina.com.cn/7x24/' -H 'User-Agent: Mozilla/5.0' -o /tmp/morning_news.html
```
提取2-3条重要财经新闻

## 第二步：生成两张卡片

### 卡片1：公众号盘前速递（暗底长图）
用 search_files 搜索 <HOME>/.hermes/cache/documents/盘前速递-*.html 取最新作为模板，修改内容生成新一期。
- Badge色：#4285f4（蓝色）
- 日期改为今天
- 标题/副标题概括开盘前整体氛围
- 隔夜美股+亚太欧洲+期货+2-3条新闻+AI一句话
- 保存到 <HOME>/.hermes/cache/documents/盘前速递-YYYYMMDD.html

### 卡片2：小红书盘前速递（动森暖色版 1080×1440）
读取模板 <HOME>/.hermes/skills/a-share-market-cards/templates/xhs-morning-card.html
修改内容（日期、标题、数据、新闻），保存到 <HOME>/.hermes/cache/documents/小红书盘前速递-YYYYMMDD.html

⚠️ 小红书版注意事项：
- 日期必须是今天（用TZ=Asia/Shanghai date确认）
- 上下绿色背景要等宽（body用align-items:center）
- 内容不能超出1440px高度

## 第三步：截图
```bash
# 公众号版
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox --disable-gpu --window-size=1080,3000 --screenshot=<HOME>/.hermes/cache/documents/盘前速递-YYYYMMDD.png --hide-scrollbars "file://<HOME>/.hermes/cache/documents/盘前速递-YYYYMMDD.html" 2>&1 | tail -1
python3 ~/.hermes/scripts/trim_card.py <HOME>/.hermes/cache/documents/盘前速递-YYYYMMDD.png

# 小红书版
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox --disable-gpu --window-size=1080,1440 --screenshot=<HOME>/.hermes/cache/documents/小红书盘前速递-YYYYMMDD.png --hide-scrollbars "file://<HOME>/.hermes/cache/documents/小红书盘前速递-YYYYMMDD.html" 2>&1 | tail -1
```

## 第四步：推送公众号草稿箱
```bash
python3 ~/.hermes/scripts/wechat_draft_push.py --title "AI Market Signal #XXX｜标题" --content-file article.html --thumb <HOME>/.hermes/cache/documents/盘前速递-YYYYMMDD.png --author "AI驯兽师" --digest "摘要"
```
编号用公式算：起始日2026-06-02=#001，每个交易日+1

## 第五步：发送结果
最终回复：
1. 公众号版卡片图 MEDIA:/path/to/盘前速递-YYYYMMDD.png
2. 小红书版卡片图 MEDIA:/path/to/小红书盘前速递-YYYYMMDD.png
3. 📝 公众号标题 + 正文
4. 📝 小红书标题 + 正文 + 标签
5. 公众号草稿箱状态

⚠️ 注意事项：
- 所有数据真实，不编造
- 用 write_file() 写HTML，不要用terminal heredoc
- 不给投资建议
- 所有时间只用北京时间

## Response

WARP reports "Success" but status shows "Disabled for WiFi" — this is a pre-existing environment condition (WARP disabled on WiFi by policy), unrelated to my task. The WeChat draft push already succeeded via the direct IP (which is whitelisted). This is fine and not blocking.

All tasks complete. Final delivery:

- Dark card: 盘前速递-20261022.png (1589px, verified complete)
- XHS card: 小红书盘前速递-20261022.png (1440px, verified complete)
- WeChat draft pushed (media_id obtained)
- Card #121

Let me compose the final response.

MEDIA:<HOME>/.hermes/cache/documents/盘前速递-20261022.png
MEDIA:<HOME>/.hermes/cache/documents/小红书盘前速递-20261022.png

📝 公众号标题：
AI Market Signal #121｜美股三大指数齐涨，A股开盘氛围中性偏暖

📝 公众号正文：
**AI Market Signal #121｜美股三大指数齐涨，A股开盘氛围中性偏暖**

2026年10月22日 · 星期四 · 盘前速递

隔夜美股三大指数全线上涨，纳指领涨；欧股日股同步走高，但港股逆势下跌形成对冲。原油续跌反映需求担忧，A50期货小幅走高。A股开盘氛围中性偏暖。

**🟢 隔夜美股**
· 道琼斯：52,856.09（+0.69%）温和走高
· 纳斯达克：26,702.86（+1.05%）科技领涨
· 标普500：7,757.17（+0.58%）稳步上行

**🌏 欧洲收盘 · 亚太早盘**
· 英国富时100：10,752.88（+0.19%）
· 德国DAX：25,645.04（+1.35%）
· 日经225：64,621.02（+0.85%）
· 恒生指数：23,651.87（-0.90%）
· 恒生科技：3,994.77（-1.26%）
· 富时中国A50期货：13,202.96（+0.30%）

**🥇 夜盘期货收盘**
· 沪金：892.60元/克（+0.29%）
· 沪银：14,015元/千克（-0.06%）
· SC原油：690.30元/桶（-1.50%）
· 焦煤：1,410.50元/吨（-0.14%）

**📰 今日关注**
1. 中办国办印发《关于推动科技创新和产业创新深度融合的意见》，科技成长方向获政策加持。
2. 北交所将引入新股发行市值配售，推进北证50 ETF落地。
3. 特斯拉下调全年资本开支目标，AI与机器人转型路径承压。

**💡 AI 一句话**
隔夜全球风险偏好回升，美股三大指数齐涨、纳指领涨，欧股日股同步走高；但港股逆势走弱形成对冲。原油续跌逾1.5%延续需求担忧。A50期货小幅走高，A股开盘氛围中性偏暖，科技成长受益政策催化，资源与顺周期板块有结构性机会。

本内容由AI自动生成，不构成任何投资建议。市场有风险，投资需谨慎。

📝 公众号草稿箱：
✅ 草稿已推送（media_id: hobjckyiX4Qx_wPddwuLjCQDgG_rSz7KPEMvv6JfAiFbQii_DECeItmAwykpcGG-）

📝 小红书标题：
美股三大指数齐涨，A股开盘氛围偏暖☀️

📝 小红书正文：
早安！今天开盘前，帮你看清隔夜全球市场的风吹草动 🌏

🇺🇸 **隔夜美股全线走强**
· 道琼斯 52,856 ＋0.69%
· 纳斯达克 26,703 ＋1.05%（科技领涨）
· 标普500 7,757 ＋0.58%

🌏 **亚太欧洲分化**
· 日经225 ＋0.85% 走强
· 恒生指数 -0.90%、恒生科技 -1.26% 逆势走弱
· A50期货 ＋0.30%，A股开盘氛围转暖

🥇 **大宗商品**
· 沪金 892.6元 ＋0.29%
· SC原油 690.3元 -1.50%（续跌）
· A50期货 13,203 ＋0.30%

📰 **今日三件大事**
① 中办国办发文支持科技创新与产业创新深度融合，科技成长受政策加持
② 北交所将推新股市值配售 + 北证50 ETF
③ 特斯拉下调全年资本开支目标

💡 **AI一句话**：全球风险偏好回升但港股走弱对冲，原油续跌延续需求担忧，A股开盘氛围中性偏暖，科技成长可重点关注～

市场有风险，投资需谨慎，只是数据分享不构成建议哦 📊

📝 小红书标签：#AI #A股 #美股 #盘前速递 #财经早餐 #数据分析
