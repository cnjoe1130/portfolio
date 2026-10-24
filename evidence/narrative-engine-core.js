/* ============================================================
   织梦引擎 Dreamloom · 引擎核心
   兼容山音互动文游 JSON 格式（schemaVersion 2）
   原创实现 · 致敬 @山音 的开源格式标准
   v2.0 — 新增：多存档 / QTE / 任务 / 人物关系图 / 分析卡片
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);

// ─── 音频系统 ───
const AUDIO = (() => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)(),
        cache = {}, current = { bgm: null, sfx: [] };
  function stopBgm() {
    if (current.bgm) { try { current.bgm.stop(); } catch(e) {} current.bgm = null; }
  }
  async function loadBuf(url) {
    if (cache[url]) return cache[url];
    const r = await fetch(url); if (!r.ok) throw Error('audio fetch failed');
    const a = await r.arrayBuffer(); const b = await ctx.decodeAudioData(a);
    cache[url] = b; return b;
  }
  function playBuf(buf, loop = false, vol = 0.5) {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = loop;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(ctx.destination);
    s.start(); return s;
  }
  return {
    async playBgm(url, vol = 0.3) {
      if (!isEffectEnabled('bgm')) return;
      stopBgm();
      try { const buf = await loadBuf(url); current.bgm = playBuf(buf, true, vol); }
      catch(e) { console.warn('BGM error:', url); }
    },
    async playSfx(url, vol = 0.5) {
      if (!isEffectEnabled('bgm')) return;
      try { const buf = await loadBuf(url); const s = playBuf(buf, false, vol); current.sfx.push(s); s.onended = () => { const i = current.sfx.indexOf(s); if(i>=0) current.sfx.splice(i,1); }; } catch(e) { console.warn('SFX error:', url); }
    },
    stopBgm, resumeCtx() { if (ctx.state === 'suspended') ctx.resume(); },
    stopAll() { stopBgm(); current.sfx.forEach(s => { try { s.stop(); } catch(e) {} }); current.sfx = []; }
  };
})();

// 特效开关检查
function isEffectEnabled(name) {
  const effects = state.story?.meta?.effects || {};
  if (effects[name] === undefined) return true; // 默认启用未知特效
  return effects[name];
}

const el = {
  body: document.body,
  reader: $("reader"), launcher: $("launcher"),
  storyKicker: $("storyKicker"), storyTitleLine: $("storyTitleLine"),
  hudContext: $("hudContext"),
  variableName: $("variableName"), variableFill: $("variableFill"), variableValue: $("variableValue"),
  chapterName: $("chapterName"), speaker: $("speaker"), toneTag: $("toneTag"), clueToast: $("clueToast"), storyText: $("storyText"),
  continueHint: $("continueHint"), choices: $("choices"),
  historyBtn: $("historyBtn"), historyPanel: $("historyPanel"), historyList: $("historyList"),
  pageBackBtn: $("pageBackBtn"), backBtn: $("backBtn"), menuBtn: $("menuBtn"),
  progressFill: $("progressFill"), menuDrawer: $("menuDrawer"),
  fileInput: $("fileInput"), importBtn: $("importBtn"), libraryBtn: $("libraryBtn"),
  sampleBtn: $("sampleBtn"), devBtn: $("devBtn"), library: $("library"), libraryGrid: $("libraryGrid"),
  overlayScreen: $("overlayScreen"), overlayTitle: $("overlayTitle"), overlaySub: $("overlaySub"),
  devPanel: $("devPanel"), devState: $("devState"), devJumpBtn: $("devJumpBtn"),
  devJumpInput: $("devJumpInput"), devEndingBtn: $("devEndingBtn"), devLog: $("devLog"),
  creditLink: $("creditLink"), taskPanel: $("taskPanel"),
  page: $("page"),
};

/* ---------- 场景背景图 / 时间线头像 ---------- */
const SCENE_IMG = {
  // 新图（19张，优先匹配）
  '王頔家': '01-wangdi-home', '王頔': '01-wangdi-home',
  '金麒麟': '03-jinqilin-bathhouse', '洗浴': '03-jinqilin-bathhouse',
  '殷鹏': '04-nightclub-office', '夜总会': '04-nightclub-office',
  '冯国金家': '05-fengguojin-home',
  '医院': '06-hospital-ward',
  '面馆': '07-noodle-shop-2003',
  '医疗器械': '08-medical-equipment-street',
  '省艺校': '09-art-school-studio', '艺校': '09-art-school-studio',
  '青年公园': '10-youth-park',
  '中华剧场': '11-zhonghua-theater',
  '理发店': '12-barbershop',
  '雪灯': '14-snow-lamp', '楔子': '14-snow-lamp',
  '汉庭': '02-beijing-hotel',
  '春天': '15-tiexi-spring-2015', '2015': '15-tiexi-spring-2015',
  '北京2013': '16-beijing-2013',
  '孙记饺子': '17-sun-dumpling-restaurant', '饺子馆': '17-sun-dumpling-restaurant',
  '饭店': '18-ordinary-restaurant',
  '办公室': '19-teachers-office',
  // 旧图（保留）
  '33号楼': 'building_33', '天台': 'villa_rooftop', '法医': 'forensics_lab', '刑警队': 'detective_office',
  '审讯室': 'interrogation_room', '老楼': 'qin_li_home', '砖头房': 'brick_house', '防空洞': 'air_raid_shelter',
  '墓园': 'cemetery', '教室': 'school_1999', '操场': 'school_1999', '校园': 'school_1999', '医科大': 'school_1999',
  '学校': 'school_1999', '育英': 'school_1999',
  '雪夜': '13-tiexi-snow-night', '汉庭': '02-beijing-hotel',
  // 补漏映射
  '北京·2013': '16-beijing-2013', '北京': '16-beijing-2013',
  '回忆·1999': 'school_1999',
};
const ERA_RULES = [['终章', '2019'], ['2013', '2013'], ['2003', '2003']];
const NO_2019 = ['huang_shu', 'xiao_deng'];  // 已故角色无 2019 版，回退 2003
function currentEra() {
  const t = state.story?.nodes?.[state.currentNodeId]?.chapterTitle || '';
  for (const [k, era] of ERA_RULES) if (t.includes(k)) return era;
  return '1999';
}
function avatarFor(ch, cid) {
  if (!ch.avatar) return '';
  let era = currentEra();
  if (era === '2019' && NO_2019.includes(cid)) era = '2003';
  return `avatars/${era}/${cid}.png`;
}
function sceneImgKey(node) {
  const scene = node?.scene;
  if (!scene) return null;
  const name = typeof scene === 'string' ? scene : (scene.name || '');
  for (const [k, v] of Object.entries(SCENE_IMG)) if (name.includes(k)) return v;
  return null;
}
function applySceneBg(node) {
  const bg = document.getElementById('sceneBg');
  if (!bg) return;
  const key = sceneImgKey(node);
  bg.style.backgroundImage = key ? `url(scenes/${key}.png)` : 'none';
}

/* ---------- 状态 ---------- */
const state = {
  story: null, currentNodeId: "", segmentIndex: 0,
  val: 0, vars: {}, flags: [], importantFlags: [], achievements: [],
  keyDecisions: [], choiceHistory: [], pageHistory: [], recentChoices: [],
  currentChoiceSnapshot: null, isInputLocked: false, isEndingScreen: false,
  progress: 0, tasks: {},
  settings: { motion: "auto", autoplay: 0 },
};

const EFFECT_DURATIONS = {
  shake: 560, blur: 900, noise: 1000, flash: 1800, blackout: 2700,
  silence: 1300, pulse: 1240, heartbeat: 1240, breath: 4400, glitch: 750,
  drown: 4200, heat: 3100, heatwave: 3100, cold: 1100, blood: 1200, red: 1200,
};
const EFFECT_ALIASES = { pulse: "heartbeat", heart: "heartbeat", heat: "heatwave", blood: "red" };

/* ---------- 工具 ---------- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STORAGE_KEY = "dreamloom_data";

/* ============================================================
   故事加载
   ============================================================ */
function assertStory(json) {
  if (!json || typeof json !== "object") throw new Error("剧本必须是 JSON 对象");
  if (!json.meta || !json.meta.title) throw new Error("缺少 meta.title");
  if (!json.startNodeId || !json.nodes || !json.nodes[json.startNodeId]) throw new Error("缺少 startNodeId 或对应节点");
  for (const [id, node] of Object.entries(json.nodes)) {
    if (!node || typeof node !== "object") throw new Error(`节点 ${id} 必须是对象`);
    if (!node.isEnding && !node.segments && !node.choices && !node.next && !node.routes && !node.chapterTitle)
      throw new Error(`节点 ${id} 无有效内容`);
  }
}

function loadStory(json, options = {}) {
  assertStory(json);
  state.story = json;
  state.val = json.meta.initialVariable ?? 0;
  state.vars = { ...(json.variables ?? {}) };
  state.flags = []; state.importantFlags = []; state.achievements = [];
  state.keyDecisions = []; state.choiceHistory = []; state.pageHistory = [];
  state.progress = 0; state.currentNodeId = ""; state.segmentIndex = 0;
  state.isEndingScreen = false; state.tasks = {};
  // 初始化任务
  if (json.tasks) {
    for (const [id, def] of Object.entries(json.tasks)) {
      state.tasks[id] = { done: false, ...def };
    }
  }
  const meta = json.meta;
  el.storyKicker.textContent = meta.author || "佚名";
  el.storyTitleLine.textContent = meta.title;
  document.title = `${meta.title} · 织梦引擎`;
  enterReader();
  checkOnboarding();
  if (!options.noAutoStart) startGame();
  return true;
}

/* ---------- 界面切换 ---------- */
function enterReader() { el.launcher.hidden = true; el.reader.hidden = false; el.body.dataset.mode = "play"; }
function returnToHome() {
  el.reader.hidden = true; el.launcher.hidden = false; el.body.dataset.mode = "launcher";
  el.menuDrawer.hidden = true; closeTaskPanel();
}

/* ============================================================
   节点处理
   ============================================================ */
function startGame(fromSave = false) {
  state.currentNodeId = state.story.startNodeId; state.segmentIndex = 0;
  processNode(state.currentNodeId, { fromHistory: false, showChapter: !fromSave, keepSegment: false });
}

function processNode(nodeId, options = {}) {
  if (state.isInputLocked && !options.fromHistory) return;
  // 清理上一个节点的 auto 推进定时器，防止跨节点跳过
  if (state._autoTimer) { clearTimeout(state._autoTimer); state._autoTimer = null; }
  const node = state.story.nodes[nodeId];
  if (!node) throw new Error(`节点不存在: ${nodeId}`);
  state.currentNodeId = nodeId; state.segmentIndex = 0;

  // intro 开场特殊处理（不推历史、不存档、无章节动画）
  if (nodeId.startsWith('intro_')) {
    el.body.dataset.mode = 'intro';
    // 强制背景色和文字颜色（防 CSS 权重问题）
    el.body.style.setProperty('background', '#000', 'important');
    el.body.style.setProperty('color', '#e0dcd0', 'important');
    renderNodeContent(node, options);
    return;
  }

  el.body.dataset.mode = 'reader';
  el.body.style.background = '';
  el.body.style.color = '';
  // 章节切换 → 左上角 chapterName 入场动画（代替弹窗）
  if (!options.fromHistory && node.chapterTitle) {
    const prev = state._lastChapterTitle;
    state._lastChapterTitle = node.chapterTitle;
    if (node.chapterTitle !== prev) {
      animateChapterTitle(node.chapterTitle, node.title || "");
    }
  }
  // 自动存档（每个有 chapterTitle 的节点）
  if (!options.fromHistory && node.chapterTitle) autoSave();
  if (node.isEnding) { pushHistory(); showEnding(node); return; }
  const scene = normalizeScene(node);
  const showScene = scene && !options.fromHistory && !options.noSceneTransition;
  if (showScene) { showSceneTransition(scene, () => renderNodeContent(node, options)); }
  else { renderNodeContent(node, options); }
}

function animateChapterTitle(title, sub) {
  const el = document.getElementById('chapterName');
  if (!el) return;
  el.textContent = title;
  if (sub) el.dataset.sub = sub; else delete el.dataset.sub;
  el.classList.remove('chapter-enter');
  void el.offsetWidth;
  el.classList.add('chapter-enter');
  setTimeout(() => el.classList.remove('chapter-enter'), 3200);
}

function renderNodeContent(node, options) {
  if (!options.keepSegment) state.segmentIndex = 0;
  applyNodeAtmosphere(node); applySceneBg(node); updateStatus();
  if (node.routes?.length && state.segmentIndex === 0) { handleRoutes(node); return; }
  if (node.segments?.length) { renderSegment(); if (!options.fromHistory) pushHistory(); }
  else if (node.choices?.length) { renderChoices(node.choices); if (!options.fromHistory) pushHistory(); }
  else if (node.next) { processNode(node.next, { fromHistory: options.fromHistory, showChapter: false, keepSegment: true }); }
  else if (node.isEnding) { showEnding(node); }
  else { handleDeadEnd(nodeId, "节点无内容"); }
}
function handleRoutes(node) {
  for (const route of node.routes) {
    if (route.condition === "default" || checkCondition(route.condition)) {
      pushHistory(); processNode(route.next, { fromHistory: false, showChapter: false, keepSegment: true }); return;
    }
  }
  processNode(state.story.startNodeId, { fromHistory: false, showChapter: false, keepSegment: true });
}

/* ---------- 分段渲染 ---------- */
function renderSegment() {
  const node = state.story.nodes[state.currentNodeId];
  const segments = node.segments || [];
  if (state.segmentIndex >= segments.length) {
    if (node.choices?.length) renderChoices(node.choices);
    else if (node.next) { state.segmentIndex = 0; processNode(node.next, { fromHistory: false, showChapter: false, keepSegment: true }); }
    else if (node.routes?.length) handleRoutes(node);
    else if (node.isEnding) showEnding(node);
    else handleDeadEnd(state.currentNodeId, "剧情播完无后续");
    return;
  }
  updateStatus();
  const seg = segments[state.segmentIndex];
  el.chapterName.textContent = node.chapterTitle || "";
  el.speaker.textContent = seg.speaker || ""; el.speaker.hidden = !seg.speaker;
  // 语气标签
  const tone = detectTone(seg);
  if (tone && seg.speaker && seg.speaker !== "系统") {
    el.toneTag.textContent = "// " + tone;
    el.toneTag.hidden = false;
  } else {
    el.toneTag.hidden = true;
  }
  // 线索提示
  if (seg.clue && isEffectEnabled('clueToast')) {
    showClueToast(seg.clue);
  }
  el.storyText.textContent = seg.text || ""; el.continueHint.hidden = !!(seg.auto && typeof seg.auto === 'number');
  el.choices.innerHTML = "";
  // intro 效果：玻璃层 / 标题
  if (seg.effect === 'glass') {
    el.body.classList.add('intro-glass');
  } else {
    el.body.classList.remove('intro-glass');
  }
  if (seg.effect === 'title') {
    el.storyText.style.fontSize = '4rem'; el.storyText.style.fontWeight = '300';
    el.storyText.style.letterSpacing = '.6em'; el.storyText.style.textAlign = 'center';
    el.speaker.hidden = true;
  } else {
    el.storyText.style.fontSize = ''; el.storyText.style.fontWeight = '';
    el.storyText.style.letterSpacing = ''; el.storyText.style.textAlign = '';
  }
  // 自动推进
  if (seg.auto && typeof seg.auto === 'number') {
    state._autoTimer = setTimeout(() => {
      state.segmentIndex++;
      renderSegment();
    }, seg.auto);
  }
  // 任务进度更新
  if (seg.taskProgress && isEffectEnabled('taskToast')) updateTask(seg.taskProgress);
  if (seg.taskUnlock && isEffectEnabled('taskToast')) unlockTask(seg.taskUnlock);
  runEffects(seg.effect || seg.effects || []);
  if (el.continueHint) el.continueHint.onclick = () => advanceSegment();
  // 页面点击推进由外面 addEventListener 统一处理（含 intro 模式检查）
}
function advanceSegment() {
  if (state.isInputLocked) return;
  if (el.body.dataset.mode === "intro") return; // 引子期间不可手动推进
  state.segmentIndex++;
  renderSegment();
}

/* ---------- 选择 + QTE ---------- */
function renderChoices(choices) {
  el.chapterName.textContent = state.story.nodes[state.currentNodeId].chapterTitle || "";
  el.speaker.hidden = true; el.continueHint.hidden = true;
  el.choices.innerHTML = "";
  choices.forEach((choice, idx) => {
    if (choice.condition && !checkCondition(choice.condition)) return;
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice.text;
    // QTE 模式
    if (choice.qte) {
      btn.classList.add("qte");
      const timer = document.createElement("span");
      timer.className = "qte-timer";
      btn.appendChild(timer);
      const timeout = choice.qte.timeout || 5000;
      let remaining = timeout / 1000;
      timer.textContent = `⏱ ${remaining}s`;
      const iv = setInterval(() => {
        remaining -= 0.1;
        timer.textContent = `⏱ ${remaining.toFixed(1)}s`;
        if (remaining <= 0) {
          clearInterval(iv);
          btn.disabled = true;
          btn.style.opacity = "0.3";
          // 超时：执行 failNext
          if (choice.qte.failNext) {
            const failNode = state.story.nodes[choice.qte.failNext];
            if (failNode) {
              setTimeout(() => choose({ next: choice.qte.failNext, changes: choice.qte.failChanges }), 300);
            }
          }
        }
      }, 100);
      btn.addEventListener("click", () => { clearInterval(iv); choose(choice); });
    } else {
      btn.addEventListener("click", () => choose(choice));
    }
    el.choices.appendChild(btn);
  });
  // 最近选择按钮
  if (state.recentChoices.length > 0) {
    el.historyBtn.hidden = false;
    el.historyBtn.onclick = toggleHistoryPanel;
  } else {
    el.historyBtn.hidden = true;
  }
  state.currentChoiceSnapshot = captureChoiceSnapshot();
}

function choose(choice) {
  if (state.isInputLocked) return;
  // 清理 auto 推进定时器，防止选择后旧 timer 跳过新节点
  if (state._autoTimer) { clearTimeout(state._autoTimer); state._autoTimer = null; }
  if (!choice) return;
  runEffects(choice.effect || choice.effects || []);
  if (choice.importantFlag) addFlagRecord(normalizeFlagEntry(choice.importantFlag), true, { nodeId: state.currentNodeId });
  if (choice.recordKeyDecision) recordKeyDecision(choice.recordKeyDecision.id, choice.recordKeyDecision.label);
  // 记录最近选择（去重：同节点同选项只保留最新一次，回退/读档重选不再重复堆积）
  const node = state.story?.nodes?.[state.currentNodeId];
  const entry = { text: choice.text, nodeId: state.currentNodeId, chapterTitle: node?.chapterTitle || "" };
  const dupIdx = state.recentChoices.findIndex(c => c.text === entry.text && c.nodeId === entry.nodeId);
  if (dupIdx >= 0) state.recentChoices.splice(dupIdx, 1);
  state.recentChoices.push(entry);
  if (state.recentChoices.length > 10) state.recentChoices.shift();
  // 任务更新
  if (choice.taskProgress && isEffectEnabled('taskToast')) updateTask(choice.taskProgress);
  if (choice.taskUnlock && isEffectEnabled('taskToast')) unlockTask(choice.taskUnlock);
  applyChanges(choice.changes);
  if (choice.unlockAchievement && isEffectEnabled('achievement')) showAchievementOverlay(choice.unlockAchievement);
  pushHistory();
  const next = choice.next || choice.redirect;
  if (next) processNode(next, { fromHistory: false, showChapter: false, keepSegment: false });
  else renderNodeContent(state.story.nodes[state.currentNodeId], { fromHistory: false });
}

/* ---------- 状态变化 ---------- */
function applyChanges(changes, options = {}) {
  if (!changes) return;
  if (typeof changes.val === "number") { state.val += changes.val; if (state.val < 0) state.val = 0; }
  if (typeof changes.valSet === "number") state.val = changes.valSet;
  if (changes.set && typeof changes.set === "object") Object.assign(state.vars, changes.set);
  if (changes.addFlag) addFlagRecord(normalizeFlagEntry(changes.addFlag), options.important ?? false);
  if (changes.addFlags) { (Array.isArray(changes.addFlags) ? changes.addFlags : [changes.addFlags]).forEach(f => addFlagRecord(normalizeFlagEntry(f), false)); }
  if (changes.importantFlag) addFlagRecord(normalizeFlagEntry(changes.importantFlag), true);
  if (changes.removeFlag) removeFlagRecord(changes.removeFlag);
  if (changes.unlockAchievement && isEffectEnabled('achievement')) showAchievementOverlay(changes.unlockAchievement);
  if (changes.unlockAchievements && isEffectEnabled('achievement')) { (Array.isArray(changes.unlockAchievements) ? changes.unlockAchievements : [changes.unlockAchievements]).forEach(a => showAchievementOverlay(a)); }
  if (changes.taskProgress && isEffectEnabled('taskToast')) updateTask(changes.taskProgress);
  if (changes.taskUnlock && isEffectEnabled('taskToast')) unlockTask(changes.taskUnlock);
  updateStatus();
}
function normalizeFlagEntry(flag) {
  return typeof flag === "string" ? { id: flag, label: flag } : { id: flag.id ?? flag.label ?? String(flag), label: flag.label ?? flag.id ?? String(flag) };
}
function addFlagRecord(flag, important = false, context = {}) {
  const entry = typeof flag === "string" ? { id: flag, label: flag } : flag;
  if (!state.flags.includes(entry.id)) state.flags.push(entry.id);
  if (important && !state.importantFlags.some(f => f.id === entry.id)) state.importantFlags.push({ id: entry.id, label: entry.label, context });
}
function removeFlagRecord(flagId) { const id = typeof flagId === "string" ? flagId : flagId.id; state.flags = state.flags.filter(f => f !== id); state.importantFlags = state.importantFlags.filter(f => f.id !== id); }
function recordKeyDecision(id, label) { if (!state.keyDecisions.some(k => k.id === id)) state.keyDecisions.push({ id, label, nodeId: state.currentNodeId }); }

/* ---- 任务系统 ---- */
function unlockTask(taskId) {
  if (!state.tasks[taskId]) state.tasks[taskId] = { id: taskId, label: taskId, done: false };
  state.tasks[taskId].visible = true;
  updateTaskUI();
}
function updateTask(taskId) {
  if (state.tasks[taskId]) { state.tasks[taskId].done = true; updateTaskUI(); }
}
function updateTaskUI() {
  const visible = Object.values(state.tasks).filter(t => t.visible !== false);
  if (visible.length === 0) return;
  const done = visible.filter(t => t.done).length;
  const total = visible.length;
  // SVG 图标
  const clipIcon = '<svg class="menu-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width=".8"><rect x="2.5" y="1.5" width="9" height="11" rx="1"/><rect x="4" y="3" width="6" height="2" rx=".5"/><line x1="4" y1="6.5" x2="10" y2="6.5"/><line x1="4" y1="8.5" x2="8" y2="8.5"/></svg>';
  const uncheckedIcon = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width=".8" style="vertical-align:middle;margin-right:4px"><rect x="1.5" y="1.5" width="9" height="9" rx="1"/></svg>';
  const checkedIcon = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width=".8" style="vertical-align:middle;margin-right:4px"><rect x="1.5" y="1.5" width="9" height="9" rx="1"/><polyline points="3,6 5.5,8.5 9,4" stroke="currentColor" stroke-width=".8" fill="none"/></svg>';
  // 更新任务面板
  const panel = document.getElementById("taskPanel");
  if (panel) {
    let html = `<div class="task-header">${clipIcon} 任务进度 ${done}/${total}</div>`;
    for (const t of visible) {
      const icon = t.done ? checkedIcon : uncheckedIcon;
      html += `<div class="task-item ${t.done ? 'done' : ''}">${icon} ${escapeHtml(t.label || t.id)}</div>`;
    }
    panel.innerHTML = html;
    panel.hidden = false;
  }
}
function closeTaskPanel() {
  const panel = document.getElementById("taskPanel");
  if (panel) panel.hidden = true;
}
function toggleTaskPanel() {
  const panel = document.getElementById("taskPanel");
  if (panel) panel.hidden = !panel.hidden;
}

/* ============================================================
   条件判断
   ============================================================ */
function checkCondition(condition) {
  if (!condition || condition === "default") return true;
  if (typeof condition === "string") return checkStringCondition(condition);
  if (Array.isArray(condition.all)) return condition.all.every(c => checkCondition(c));
  if (Array.isArray(condition.any)) return condition.any.some(c => checkCondition(c));
  if (condition.not) return !checkCondition(condition.not);
  if (condition.flag) return state.flags.includes(condition.flag);
  if (condition.var) return compare(condition.var === "val" ? state.val : state.vars[condition.var], condition.op || "==", condition.value);
  return false;
}
function checkStringCondition(s) {
  const c = String(s).trim();
  let m = c.match(/^hasFlag\s+['"]([^'"]+)['"]$/); if (m) return state.flags.includes(m[1]);
  m = c.match(/^(val|variable|value)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(\.\d+)?)$/); if (m) return compare(state.val, m[2], parseFloat(m[3]));
  m = c.match(/^([\w\u4e00-\u9fa5]+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(\.\d+)?)$/); if (m) return compare(state.vars[m[1]], m[2], parseFloat(m[3]));
  return Boolean(state.vars[c]);
}
function compare(left, op, right) {
  switch (op) { case ">=": return left >= right; case "<=": return left <= right; case "==": return left == right; case "!=": return left != right; case ">": return left > right; case "<": return left < right; default: return left == right; }
}

/* ============================================================
   历史 / 回退
   ============================================================ */
function pushHistory() {
  state.choiceHistory.push({
    nodeId: state.currentNodeId, segmentIndex: state.segmentIndex,
    val: state.val, vars: { ...state.vars }, flags: [...state.flags],
    importantFlags: JSON.parse(JSON.stringify(state.importantFlags)),
    achievements: [...state.achievements], keyDecisions: JSON.parse(JSON.stringify(state.keyDecisions)),
  });
  state.pageHistory.push(state.currentNodeId);
  if (state.choiceHistory.length > 200) state.choiceHistory.shift();
}
function captureChoiceSnapshot() { return { nodeId: state.currentNodeId, val: state.val, vars: { ...state.vars }, flags: [...state.flags], importantFlags: JSON.parse(JSON.stringify(state.importantFlags)), achievements: [...state.achievements] }; }
function goBack() {
  if (state.isInputLocked || state.isEndingScreen) return;
  if (state.choiceHistory.length === 0) return;
  state.choiceHistory.pop(); state.pageHistory.pop();
  const snap = state.choiceHistory[state.choiceHistory.length - 1];
  if (!snap) { startGame(); return; }
  restoreSnapshot(snap);
}
function restoreSnapshot(snap) {
  state.currentNodeId = snap.nodeId; state.segmentIndex = 0;
  state.val = snap.val; state.vars = { ...snap.vars };
  state.flags = [...snap.flags]; state.importantFlags = JSON.parse(JSON.stringify(snap.importantFlags));
  state.achievements = [...snap.achievements]; state.keyDecisions = JSON.parse(JSON.stringify(snap.keyDecisions));
  processNode(state.currentNodeId, { fromHistory: true, showChapter: false, keepSegment: false });
}

/* ============================================================
   特效 & 氛围
   ============================================================ */
function runEffects(effects) {
  if (!effects) return;
  const names = Array.isArray(effects) ? effects : [effects];
  names.forEach((name) => {
    const effectName = EFFECT_ALIASES[String(name).trim()] || String(name).trim();
    const cls = `fx-${effectName}`;
    el.body.classList.remove(cls); void el.body.offsetWidth;
    el.body.classList.add(cls);
    setTimeout(() => el.body.classList.remove(cls), EFFECT_DURATIONS[effectName] || 900);
    if (effectName === "shake" && "vibrate" in navigator) navigator.vibrate(120);
  });
}
function applyNodeAtmosphere(node) {
  const meta = state.story?.meta || {};
  applyAmbient(node.ambient || node.atmosphere || node.theme || meta.ambient || meta.atmosphere || meta.theme || "none");
}
function applyAmbient(ambient) {
  const raw = typeof ambient === "string" ? ambient : "none";
  const mapped = raw === "sea" ? "tide" : raw;
  const name = ["none","rain","wind","tide","heat","static"].includes(mapped) ? mapped : "none";
  el.body.dataset.ambient = name;
  // 音频映射：ambient名 → 音频文件路径
  const audioMap = {
    rain: "audio/ambient_109.mp3",
    wind: "audio/ambient_138.mp3",
    tide: "audio/ambient_148.mp3",
    static: "audio/ambient_169.mp3",
    heat: "audio/ambient_140.mp3"
  };
  if (name === "none") { AUDIO.stopBgm(); }
  else if (audioMap[name]) {
    AUDIO.playBgm(audioMap[name], 0.25);
  }
}
function normalizeScene(node) {
  const scene = node?.scene;
  if (!scene) return null;
  if (typeof scene === "string") return { key: scene, name: scene, description: "" };
  if (typeof scene === "object") {
    const name = scene.name || scene.title || scene.id || "";
    if (!name) return null;
    return { key: scene.id || name, name, description: scene.description || "", arrival: scene.arrival || scene.arrivalText || scene.intro || "", type: scene.type || scene.kind || "major", duration: Number(scene.duration) || 0 };
  }
  return null;
}
function shouldShowSceneTransition(scene, options = {}) { return !!scene && !options.fromHistory && !options.noSceneTransition; }
function showSceneTransition(scene, callback) {
  el.body.classList.add("scene-transitioning");
  setTimeout(() => { el.body.classList.remove("scene-transitioning"); callback(); }, 320);
}
function showOverlay(title, sub, duration, callback) {
  state.isInputLocked = true;
  el.overlayTitle.textContent = title || "";
  el.overlaySub.textContent = sub || "";
  el.overlayScreen.hidden = false;
  setTimeout(() => { el.overlayScreen.hidden = true; state.isInputLocked = false; if (callback) callback(); }, duration);
}

/* ============================================================
   结局
   ============================================================ */
function showEnding(node) {
  state.isEndingScreen = true; state.isInputLocked = true;
  pushHistory();
  el.chapterName.textContent = node.title || "结局";
  el.speaker.textContent = node.type || "ENDING"; el.speaker.hidden = false;
  el.storyText.textContent = node.description || node.text || "";
  el.continueHint.hidden = true; el.choices.innerHTML = "";
  applyNodeAtmosphere(node);
  runEffects(node.effect || node.effects || []);
  if (node.achievement) showAchievementOverlay(node.achievement);
  // 分析卡片按钮
  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "📊 查看你的分析报告";
  btn.style.marginTop = "16px";
  btn.addEventListener("click", () => showAnalysisCard());
  el.choices.appendChild(btn);
  const btn2 = document.createElement("button");
  btn2.className = "btn";
  btn2.textContent = "回到主界面";
  btn2.style.marginTop = "8px";
  btn2.addEventListener("click", () => finishEndingReturnHome());
  el.choices.appendChild(btn2);
  updateStatus();
}
function finishEndingReturnHome() {
  recordEnding(state.story.nodes[state.currentNodeId]);
  state.isEndingScreen = false; state.isInputLocked = false;
  returnToHome();
}
function recordEnding(node) {
  try {
    const key = `dreamloom_ending_${state.story.meta.title}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.push({ title: node.title || "结局", type: node.type || "ENDING", at: new Date().toISOString(), val: state.val });
    localStorage.setItem(key, JSON.stringify(list.slice(-20)));
  } catch (e) { /* ignore */ }
}
function showAchievementOverlay(achievement) {
  if (state.achievements.includes(achievement)) return;
  state.achievements.push(achievement);
  const def = state.story.achievements?.[achievement];
  showOverlay(`🏅 ${def?.title || achievement}`, def?.description || "", 1800);
}

/* ============================================================
   分析报告卡片（Canvas 渲染）
   ============================================================ */
function showAnalysisCard() {
  const story = state.story;
  const existing = document.getElementById("analysisOverlay");
  if (existing) existing.remove();
  // 计算维度
  const dims = calculateDimensions();
  const html = `
  <div class="analysis-overlay" id="analysisOverlay">
    <div class="analysis-card">
      <h3>📊 ${escapeHtml(story.meta.title)} · 分析报告</h3>
      <div class="analysis-chart" id="analysisChart">
        ${dims.map(d => `
          <div class="dim-row">
            <div class="dim-label">${escapeHtml(d.label)}</div>
            <div class="dim-bar-track">
              <div class="dim-bar-fill" style="width:${d.pct}%;background:${d.color}"></div>
            </div>
            <div class="dim-score">${d.score}</div>
          </div>
        `).join('')}
      </div>
      <div class="analysis-summary">
        <p>${escapeHtml(generateAnalysisSummary(dims))}</p>
      </div>
      <div class="analysis-stats">
        <span>🏅 ${state.achievements.length}/${Object.keys(story.achievements||{}).length} 成就</span>
        <span>🔑 ${state.importantFlags.length} 关键线索</span>
        <span>📝 ${state.keyDecisions.length} 关键决定</span>
      </div>
      <div class="analysis-actions">
        <button class="btn primary" id="shareCardBtn">💾 保存分享卡</button>
        <button class="btn" id="closeAnalysisBtn">关闭</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  document.getElementById("closeAnalysisBtn").addEventListener("click", () => document.getElementById("analysisOverlay")?.remove());
  document.getElementById("shareCardBtn").addEventListener("click", renderShareCard);
  document.getElementById("analysisOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.target.remove(); });
}

function calculateDimensions() {
  // 从 state 计算多维度评分
  const dims = [];
  // 洞察力：线索收集度
  const clueFlags = ["非计划抛尸","出血点","衣物线索","老张证词","探过鬼楼","防空洞秘密","黄姝身世","妈妈被抓","砖头房线索"];
  const cluesFound = clueFlags.filter(f => state.flags.includes(f)).length;
  dims.push({ id:"insight", label:"🔍 洞察力", score: Math.round(cluesFound/clueFlags.length*100), pct: Math.round(cluesFound/clueFlags.length*100), color:"#4fc3f7" });
  // 共情力：理解角色程度
  const empathyFlags = ["上坟倾诉","黄姝身世","妈妈被抓","黄姝真相"];
  const empathyFound = empathyFlags.filter(f => state.flags.includes(f)).length;
  dims.push({ id:"empathy", label:"💖 共情力", score: Math.round(empathyFound/empathyFlags.length*100), pct: Math.round(empathyFound/empathyFlags.length*100), color:"#f06292" });
  // 探索力：冒险程度
  const exploreFlags = ["探过鬼楼","衣物线索"];
  const exploreFound = exploreFlags.filter(f => state.flags.includes(f)).length;
  dims.push({ id:"explore", label:"🗺️ 探索力", score: exploreFound > 0 ? (exploreFound/exploreFlags.length)*100 : 0, pct: exploreFound > 0 ? Math.round(exploreFound/exploreFlags.length*100) : 0, color:"#ba68c8" });
  // 决策力：基于状态值偏离初始值的程度
  const initVal = state.story.meta.initialVariable || 50;
  const decisiveness = Math.min(100, Math.round(Math.abs(state.val - initVal) + 50));
  dims.push({ id:"decisive", label:"⚡ 决策力", score: decisiveness, pct: decisiveness, color:"#ffb74d" });
  // 结局类型
  const currentNode = state.story.nodes[state.currentNodeId];
  if (currentNode && currentNode.isEnding) {
    const endingType = currentNode.type || "ENDING";
    let endingLabel = "未知";
    if (endingType.includes("TRUE")) endingLabel = "🌟 真结局·完整真相";
    else if (endingType.includes("NORMAL")) endingLabel = "🔍 普通结局·部分真相";
    else endingLabel = "💨 仓促结局·错过太多";
    dims.push({ id:"ending", label: endingLabel, score: 100, pct: 100, color:"#e8e6d1" });
  }
  return dims;
}

function generateAnalysisSummary(dims) {
  const insight = dims.find(d => d.id === "insight")?.score || 0;
  const empathy = dims.find(d => d.id === "empathy")?.score || 0;
  const explore = dims.find(d => d.id === "explore")?.score || 0;
  const decisive = dims.find(d => d.id === "decisive")?.score || 0;
  let lines = [];
  if (insight >= 70) lines.push("你善于从细节中拼凑真相，几乎看穿了所有线索。");
  else if (insight >= 40) lines.push("你发现了一些关键线索，但还有更多藏在雪底下。");
  else lines.push("真相离你很近，但你没有足够的时间去挖掘。");
  if (empathy >= 70) lines.push("你真正理解了黄姝的处境——她的故事让你揪心。");
  else if (empathy >= 40) lines.push("你注意到了黄姝，但对她的了解还不够深。");
  else lines.push("黄姝对你来说，始终是个模糊的影子。");
  if (explore >= 70) lines.push("你不怕走进鬼楼和防空洞——勇气可嘉。");
  else if (explore >= 40) lines.push("你探索了部分危险区域，但还有一些地方没敢去。");
  else lines.push("你选择了更安全的路径，但也许错过了重要的东西。");
  lines.push(""); lines.push("💡 每个人心中都有一个生吞的故事。你的选择，就是你的答案。");
  return lines.join("\n");
}

function renderShareCard() {
  const story = state.story;
  const dims = calculateDimensions();
  // 创建 Canvas
  const canvas = document.createElement("canvas");
  canvas.width = 800; canvas.height = 1100;
  const ctx = canvas.getContext("2d");
  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, 1100);
  bg.addColorStop(0, "#1c1a17"); bg.addColorStop(1, "#2d2822");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 1100);
  // 标题
  ctx.fillStyle = "#d4a24e"; ctx.font = "bold 32px 'PingFang SC', 'Noto Sans SC', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("📊 生吞·雪坟", 400, 80);
  ctx.fillStyle = "#a89e8e"; ctx.font = "18px 'PingFang SC', sans-serif";
  ctx.fillText("你的故事分析报告", 400, 115);
  // 分隔线
  ctx.strokeStyle = "rgba(232,226,214,0.1)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 140); ctx.lineTo(740, 140); ctx.stroke();
  // 维度条形图
  const barColors = ["#4fc3f7","#f06292","#ba68c8","#ffb74d"];
  const barLabels = ["洞察力","共情力","探索力","决策力"];
  dims.filter(d => d.id !== "ending").forEach((d, i) => {
    const y = 190 + i * 100;
    ctx.fillStyle = "#e8e2d6"; ctx.font = "16px 'PingFang SC', sans-serif"; ctx.textAlign = "left";
    ctx.fillText(barLabels[i] || d.label, 80, y + 8);
    // 背景条
    ctx.fillStyle = "rgba(232,226,214,0.08)";
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(80, y + 18, 500, 28, 14) : ctx.rect(80, y + 18, 500, 28); ctx.fill();
    // 填充条
    ctx.fillStyle = barColors[i] || d.color;
    const w = (d.pct / 100) * 500;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(80, y + 18, Math.max(w, 4), 28, 14) : ctx.rect(80, y + 18, Math.max(w, 4), 28); ctx.fill();
    // 分数
    ctx.fillStyle = "#e8e2d6"; ctx.font = "bold 22px 'Space Grotesk', sans-serif"; ctx.textAlign = "right";
    ctx.fillText(String(d.score), 610, y + 38);
    ctx.fillStyle = "#a89e8e"; ctx.font = "14px sans-serif";
    ctx.fillText("/100", 640, y + 38);
  });
  // 结局标签
  const endingDim = dims.find(d => d.id === "ending");
  if (endingDim) {
    ctx.fillStyle = "#d4a24e"; ctx.font = "16px 'PingFang SC', sans-serif"; ctx.textAlign = "center";
    ctx.fillText(endingDim.label, 400, 620);
  }
  // 统计
  ctx.strokeStyle = "rgba(232,226,214,0.1)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 660); ctx.lineTo(740, 660); ctx.stroke();
  ctx.fillStyle = "#a89e8e"; ctx.font = "15px 'PingFang SC', sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`🏅 ${state.achievements.length} 成就  ·  🔑 ${state.importantFlags.length} 关键线索  ·  📝 ${state.keyDecisions.length} 关键决定`, 400, 700);
  // 一句话
  const summary = generateAnalysisSummary(dims).split("\n").slice(0, 3).join("  ");
  ctx.fillStyle = "#e8e2d6"; ctx.font = "14px 'PingFang SC', sans-serif";
  ctx.fillText(`"${summary.slice(0, 50)}${summary.length > 50 ? '...' : ''}"`, 400, 750);
  // 底部
  ctx.strokeStyle = "rgba(232,226,214,0.1)";
  ctx.beginPath(); ctx.moveTo(60, 790); ctx.lineTo(740, 790); ctx.stroke();
  ctx.fillStyle = "#a89e8e"; ctx.font = "13px sans-serif";
  ctx.fillText("织梦引擎 Dreamloom · 交互式叙事", 400, 830);
  // 转换
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `生吞-雪坟-分析报告.png`;
    a.click();
    URL.revokeObjectURL(url);
    flashToast("✅ 分享卡已保存");
  }, "image/png");
}

/* ============================================================
   人物关系图
   ============================================================ */
function showCharacterGraph() {
  const story = state.story;
  if (!story || !story.characters) return;
  closeMenu();
  const chars = story.characters;
  const visible = {};
  for (const [id, ch] of Object.entries(chars)) {
    const revealed = (!ch.revealFlag || state.flags.includes(ch.revealFlag)) &&
      (!ch.unlockNode || state.pageHistory.includes(ch.unlockNode) || state.currentNodeId === ch.unlockNode);
    if (revealed) visible[id] = ch;
  }
  const ids = Object.keys(visible);
  if (ids.length === 0) { flashToast("暂无可见角色"); return; }

  const groupColors = { police: "#4a90d9", school: "#5cb85c", center: "#d4a24e", family: "#9a7bb8", default: "#888" };

  // 构建 Cytoscape 数据
  const cyNodes = ids.map(id => ({
    data: { id, name: visible[id].name, role: visible[id].role || '', group: visible[id].group || 'default', avatar: avatarFor(visible[id], id), emoji: visible[id].emoji || '👤' }
  }));
  const cyEdges = [];
  const seen = new Set();
  for (const id of ids) {
    const ch = visible[id];
    if (!ch.relations) continue;
    for (const rel of ch.relations) {
      const target = typeof rel === "string" ? rel : rel.target;
      if (!target || !visible[target]) continue;
      const key = [id, target].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      let label = typeof rel === "string" ? "" : (rel.type || "");
      // 王頔 × 冯雪娇 婚后连线升级
      if ((id === 'wang_di' && target === 'feng_xuejiao') || (id === 'feng_xuejiao' && target === 'wang_di')) {
        label = state.flags.includes('王頔冯雪娇结婚') ? '夫妻' : (label || '同学');
      }
      cyEdges.push({ data: { id: key, source: id, target, label } });
    }
  }

  // 创建 overlay
  const existing = document.getElementById("graphOverlay");
  if (existing) existing.remove();
  const html = `<div class="graph-overlay" id="graphOverlay"><div class="graph-panel" style="max-width:720px;overflow:hidden"><h3>人物关系图</h3>
    <div style="text-align:center;margin-bottom:8px;font-size:12px">
      <span style="color:#4a90d9">● 警探线</span>
      <span style="color:#5cb85c;margin-left:12px">● 校园线</span>
      <span style="color:#d4a24e;margin-left:12px">● 核心人物</span>
    </div>
    <div id="cyGraph" style="width:100%;height:420px;border-radius:8px;background:var(--bg)"></div>
    <div style="text-align:center;font-size:11px;color:var(--text-dim);margin:6px 0 0">🖱 滚轮缩放 · 拖拽移动 · 点击人物查看详情</div>
    <div class="timeline-close" id="graphClose">✕ 关闭</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", html);

  if (typeof cytoscape === "undefined") {
    document.getElementById("cyGraph").innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-dim)">⚠ Cytoscape.js 未加载，请检查网络连接</p>';
    return;
  }

  // 初始化 Cytoscape
  const cy = cytoscape({
    container: document.getElementById('cyGraph'),
    elements: [...cyNodes, ...cyEdges],
    style: [
      { selector: 'node', style: { width: 72, height: 72, 'background-fit': 'cover', 'border-width': 2.5, 'border-color': '#888', label: 'data(name)', 'font-size': 11, color: '#fff', 'text-valign': 'bottom', 'text-margin-y': 6, 'text-background-opacity': 1, 'text-background-color': '#888', 'text-background-padding': 3, 'text-background-shape': 'roundrectangle', 'min-zoomed-font-size': 8 } },
      { selector: 'edge', style: { width: 1.5, 'line-color': 'rgba(232,226,214,.3)', 'target-arrow-color': 'rgba(232,226,214,.3)', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', 'font-size': 10, color: '#d4a24e', 'text-background-opacity': 1, 'text-background-color': 'var(--surface)', 'text-background-padding': 2, 'text-background-shape': 'roundrectangle', 'text-margin-y': -8 } }
    ],
    layout: { name: 'cose', animate: true, animationDuration: 500, nodeRepulsion: 10000, idealEdgeLength: 160, gravity: 1.5, nodeDimensionsIncludeLabels: true },
    wheelSensitivity: 0.3,
  });
  window.__cy = cy;

  // 应用样式
  for (const id of ids) {
    const ch = visible[id];
    const color = groupColors[ch.group] || groupColors.default;
    const node = cy.getElementById(id);
    if (ch.avatar && ch.avatar.length > 2) {
      node.style({ 'background-image': ch.avatar, 'background-fit': 'cover', 'border-color': color, 'text-background-color': color });
    } else {
      node.style({ 'background-color': color + '30', 'border-color': color, 'text-background-color': color });
    }
  }

  // 空标签的边不显示 label
  cy.edges().forEach(e => { if (!e.data('label')) e.style({ label: '' }); });

  // 点击节点 → 人物介绍
  cy.on('tap', 'node', (evt) => {
    const charId = evt.target.id();
    const ch = chars[charId];
    if (ch) showCharacterIntro(charId, ch);
  });

  // 关闭
  document.getElementById("graphClose").addEventListener("click", () => { cy.destroy(); document.getElementById("graphOverlay")?.remove(); });
  document.getElementById("graphOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) { cy.destroy(); e.target.remove(); } });
}

function showCharacterIntro(charId, ch) {
  const avatar = avatarFor(ch, charId);
  const bio = ch.bio || "暂无介绍";
  const hasStartNode = ch.startNode && state.story?.nodes[ch.startNode];
  const existing = document.getElementById("charIntroOverlay");
  if (existing) existing.remove();
  const html = '<div class="char-intro-overlay" id="charIntroOverlay"><div class="char-intro-card">' +
    '<div class="intro-avatar">' + (avatar && avatar.length > 2 && (avatar.includes('/') || avatar.includes('data:')) ? '<img src="' + avatar + '" alt="' + escapeHtml(ch.name) + '">' : (ch.emoji || '👤')) + '</div>' +
    '<div class="intro-name">' + escapeHtml(ch.name) + '</div>' +
    '<div class="intro-bio">' + escapeHtml(bio) + '</div>' +
    '<div class="intro-actions">' +
    (hasStartNode ? '<button class="btn primary" id="introGoBtn">进入「' + escapeHtml(ch.name) + '」的视角</button>' : '') +
    '<button class="btn" id="introCloseBtn">关闭</button></div></div></div>';
  document.body.insertAdjacentHTML("beforeend", html);
  document.getElementById("introCloseBtn").addEventListener("click", () => document.getElementById("charIntroOverlay")?.remove());
  if (hasStartNode) {
    document.getElementById("introGoBtn").addEventListener("click", () => {
      document.getElementById("graphOverlay")?.remove();
      document.getElementById("charIntroOverlay")?.remove();
      processNode(ch.startNode, { fromHistory: false, showChapter: true, keepSegment: false });
      flashToast("切换到「" + ch.name + "」视角");
    });
  }
  document.getElementById("charIntroOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.target.remove(); });
}

/* ============================================================
   多存档位
   ============================================================ */
const SAVE_PREFIX = "dreamloom_save_";
function showSaveLoadUI() {
  closeMenu();
  const existing = document.getElementById("saveOverlay");
  if (existing) existing.remove();
  let html = `<div class="save-overlay" id="saveOverlay"><div class="save-panel"><h3>💾 存档管理 <span class="save-help-btn" id="saveHelpBtn" style="cursor:pointer;font-size:14px;color:var(--accent);margin-left:6px;" title="存档说明">❓</span></h3>
  <div class="save-tooltip" id="saveTooltip" hidden style="font-size:11px;color:var(--text-dim);background:var(--surface);border:1px solid var(--line);padding:10px 14px;margin:0 0 12px;border-radius:0;line-height:1.6;">
    存档数据保存在浏览器的本地存储中，不会随机关机丢失。<br>
    ⚠️ 如需移动单机版文件或清理浏览器缓存，请先「导出存档」保存为文件，换位置后「导入存档」恢复进度。
  </div>
  <div class="save-grid">`;
  for (let i = 0; i < 5; i++) {
    const data = loadSaveSlot(i);
    const label = data ? `${data.chapterTitle || data.nodeId} · ${data.pct || 0}%` : "空";
    const time = data ? (data.savedAt ? new Date(data.savedAt).toLocaleString("zh-CN") : "") : "";
    html += `<div class="save-slot${data ? ' filled' : ''}" data-slot="${i}">
      <div class="slot-num">${i + 1}</div>
      <div class="slot-info">
        <div class="slot-label">${data ? escapeHtml(label) : '— 空槽位 —'}</div>
        <div class="slot-time">${time}</div>
      </div>
      <div class="slot-actions">
        ${data ? `<button class="save-load" data-slot="${i}">读取</button>` : ''}
        <button class="save-save" data-slot="${i}">${data ? '覆盖' : '保存'}</button>
      </div>
    </div>`;
  }
  html += `</div><div class="save-actions" style="display:flex;gap:8px;justify-content:center;margin:12px 0 8px;">
    <button class="save-export-btn" id="saveExportBtn" style="padding:6px 16px;font-size:12px;background:var(--surface);border:1px solid var(--line);color:var(--text);cursor:pointer;">📥 导出存档</button>
    <button class="save-import-btn" id="saveImportBtn" style="padding:6px 16px;font-size:12px;background:var(--surface);border:1px solid var(--line);color:var(--text);cursor:pointer;">📤 导入存档</button>
  </div><div class="timeline-close" id="saveClose">✕ 关闭</div></div></div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  // 绑定
  document.querySelectorAll(".save-save").forEach(btn => {
    btn.addEventListener("click", () => { saveToSlot(parseInt(btn.dataset.slot)); showSaveLoadUI(); });
  });
  document.querySelectorAll(".save-load").forEach(btn => {
    btn.addEventListener("click", () => { loadFromSlot(parseInt(btn.dataset.slot)); });
  });
  document.getElementById("saveClose").addEventListener("click", () => document.getElementById("saveOverlay")?.remove());
  document.getElementById("saveOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.target.remove(); });
  // 帮助按钮
  const helpBtn = document.getElementById("saveHelpBtn");
  const tooltip = document.getElementById("saveTooltip");
  if (helpBtn && tooltip) {
    helpBtn.addEventListener("click", (e) => { e.stopPropagation(); tooltip.hidden = !tooltip.hidden; });
  }
  // 导出存档
  document.getElementById("saveExportBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const all = {};
    for (let i = 0; i < 5; i++) {
      const d = loadSaveSlot(i);
      if (d) all[`slot_${i}`] = d;
    }
    all._exportMeta = { exportedAt: new Date().toISOString(), storyTitle: state.story?.meta.title || "" };
    const blob = new Blob([JSON.stringify(all, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dreamloom_saves.json";
    a.click();
    URL.revokeObjectURL(a.href);
    flashToast("✅ 存档已导出");
  });
  // 导入存档
  document.getElementById("saveImportBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const imported = JSON.parse(re.target.result);
          let count = 0;
          for (const key of Object.keys(imported)) {
            if (key.startsWith("slot_")) {
              const slot = parseInt(key.split("_")[1]);
              if (slot >= 0 && slot < 5) {
                localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(imported[key]));
                count++;
              }
            }
          }
          if (count > 0) {
            flashToast(`✅ 成功导入 ${count} 个存档`);
            showSaveLoadUI(); // 刷新面板
          } else {
            flashToast("⚠️ 未找到有效的存档数据");
          }
        } catch (e) {
          flashToast("❌ 存档文件格式错误");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

function saveToSlot(slot) {
  // 回溯找最近有 chapterTitle 的节点
  let titleNode = state.currentNodeId;
  while (titleNode && !state.story?.nodes[titleNode]?.chapterTitle) {
    const hist = state.pageHistory || [];
    const idx = hist.lastIndexOf(titleNode);
    titleNode = idx > 0 ? hist[idx - 1] : null;
  }
  const data = {
    storyTitle: state.story?.meta.title, nodeId: state.currentNodeId, segmentIndex: state.segmentIndex,
    chapterTitle: (state.story?.nodes[titleNode || state.currentNodeId]?.chapterTitle) || state.story?.nodes[state.currentNodeId]?.chapterTitle || "",
    val: state.val, vars: state.vars, flags: state.flags, importantFlags: state.importantFlags,
    achievements: state.achievements, keyDecisions: state.keyDecisions, choiceHistory: state.choiceHistory,
    pageHistory: state.pageHistory, savedAt: new Date().toISOString(),
    pct: state.progress,
  };
  try {
    // 用 slot 索引做 key
    const all = JSON.parse(localStorage.getItem(SAVE_PREFIX + "index") || "{}");
    all[slot] = state.story?.meta.title || "unknown";
    localStorage.setItem(SAVE_PREFIX + "index", JSON.stringify(all));
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(data));
    flashToast(`✅ 存档 ${slot + 1} 已保存`);
  } catch (e) { flashToast("存档失败（存储空间不足）"); }
}

function loadSaveSlot(slot) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function loadFromSlot(slot) {
  const data = loadSaveSlot(slot);
  if (!data) { flashToast("存档为空"); return; }
  if (data.storyTitle !== state.story?.meta.title) { flashToast("存档属于其他剧本"); return; }
  Object.assign(state, {
    currentNodeId: data.nodeId, segmentIndex: data.segmentIndex || 0,
    val: data.val, vars: data.vars, flags: data.flags, importantFlags: data.importantFlags || [],
    achievements: data.achievements || [], keyDecisions: data.keyDecisions || [],
    choiceHistory: data.choiceHistory || [], pageHistory: data.pageHistory || [],
  });
  document.getElementById("saveOverlay")?.remove();
  processNode(data.nodeId, { fromHistory: true, showChapter: false, keepSegment: false });
  flashToast(`📖 从存档 ${slot + 1} 读取`);
}

function autoSave() {
  // 自动保存到 slot 0
  saveToSlot(0);
}

/* ============================================================
   新手指引
   ============================================================ */
function checkOnboarding() {
  try {
    if (localStorage.getItem("dreamloom_onboarded")) return;
    showOnboarding();
  } catch (e) { /* ignore */ }
}
function showOnboarding() {
  showOverlay("🎮 欢迎来到织梦引擎", "你的选择，决定了故事的方向\n\n" +
    "🔍 每一条线索都是一块拼图\n" +
    "⏱ 你可以在时间线中自由跳转\n" +
    "👥 人物的故事会随着你的探索展开\n" +
    "📊 结局后生成你的专属分析报告\n\n" +
    "点击继续，开始你的故事", 4000, () => {
    try { localStorage.setItem("dreamloom_onboarded", "1"); } catch (e) {}
  });
}

/* ============================================================
   状态栏 / 进度
   ============================================================ */
function updateStatus() {
  const meta = state.story?.meta || {};
  const varName = meta.variableName || "状态值";
  el.variableName.textContent = varName;
  el.variableValue.textContent = state.val;
  const min = meta.variableMin ?? 0, max = meta.variableMax ?? 100;
  const pct = Math.max(0, Math.min(1, (state.val - min) / (max - min)));
  el.variableFill.style.width = `${pct * 100}%`;
  const node = state.story?.nodes?.[state.currentNodeId];
  if (node?.progress) { state.progress = node.progress; el.progressFill.style.width = `${Math.min(100, node.progress)}%`; }
  // 情境化 HUD：年份 + 场景名
  if (node) {
    const ch = node.chapterTitle || "";
    // 从 chapterTitle 提取年份
    let year = "";
    if (ch.includes("2003")) year = "2003";
    else if (ch.includes("2013")) year = "2013";
    else if (ch.includes("终章")) year = "2019";
    // 从 scene 提取场景简称
    const sceneRaw = node.scene;
    let sceneShort = "";
    if (typeof sceneRaw === 'string') {
      sceneShort = sceneRaw.replace(/[··]/g, '·').split('·')[0] || sceneRaw;
    } else if (typeof sceneRaw === 'object' && sceneRaw?.name) {
      sceneShort = sceneRaw.name.replace(/[··]/g, '·').split('·')[0] || sceneRaw.name;
    }
    if (sceneShort.length > 8) sceneShort = sceneShort.slice(0, 8);
    el.hudContext.textContent = year ? `${year} · ${sceneShort}` : sceneShort || "";
  }
}

/* ---------- 语气检测 ---------- */
const toneMap = {
  'breath': '屏息凝神',
  'cold': '寒意刺骨',
  'drown': '窒息感',
  'glitch': '记忆错乱',
  'heartbeat': '心跳加速',
  'red': '血色弥漫',
  'flash': '闪回',
  'blackout': '黑暗',
  'silence': '沉默',
  'noise': '嘈杂',
  'heat': '灼热',
};
function detectTone(seg) {
  const text = seg.text || "";
  // 优先使用 effect 映射
  if (seg.effect && toneMap[seg.effect]) return toneMap[seg.effect];
  // 文本自动检测
  if (text.includes("……") || text.includes("...")) return "欲言又止";
  if (text.includes("？") || text.includes("?")) return "困惑";
  if (text.includes("！") || text.includes("!")) return "震惊";
  if (text.includes("“") || text.includes("「")) return "回忆";
  return "";
}

/* ---------- 线索提示 ---------- */
function showClueToast(clue) {
  el.clueToast.textContent = "📌 " + clue;
  el.clueToast.hidden = false;
  el.clueToast.style.opacity = "1";
  clearTimeout(el.clueToast._timer);
  el.clueToast._timer = setTimeout(() => {
    el.clueToast.style.opacity = "0";
    setTimeout(() => { el.clueToast.hidden = true; }, 400);
  }, 4000);
}

/* ---------- 最近选择 ---------- */
function toggleHistoryPanel() {
  if (el.historyPanel.hidden) {
    renderHistoryList();
    el.historyPanel.hidden = false;
  } else {
    el.historyPanel.hidden = true;
  }
}
function renderHistoryList() {
  el.historyList.innerHTML = state.recentChoices.map((c, i) =>
    `<div class="history-item">${i + 1}. <span class="history-chapter">${c.chapterTitle || ''}</span> ${c.text}</div>`
  ).join('');
}

/* ============================================================
   菜单
   ============================================================ */
function openMenu() { el.menuDrawer.hidden = false; }
function closeMenu() { el.menuDrawer.hidden = true; }

/* 特效设置面板 */
const EFFECT_DEFS = {
  clueToast: '线索提示', taskToast: '任务进度', achievement: '成就弹窗',
  chapterTransition: '章节切换动画', sceneBg: '场景背景图',
  ambientBlood: '血色氛围', ambientBlur: '模糊效果',
  meterAnim: '计量条动画', keyDecision: '关键决策闪光', bgm: '背景音乐'
};
const THEME_PRESETS = [
  { id: 'light', name: '亮色 · 暖白档案', mode: 'light', skin: 'archive' },
  { id: 'dark', name: '暗色 · 暗夜墨绿', mode: 'dark', skin: 'archive' },
  { id: 'warm', name: '暖色 · 纸墨', mode: 'light', skin: '' },
  { id: 'cool', name: '冷色 · 钢蓝', mode: 'dark', skin: '' },
];
function showSettingsPanel() {
  closeMenu();
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;
  panel.hidden = false;
  const list = document.getElementById('settingsList');
  const effects = state.story?.meta?.effects || {};

  // 特效开关
  let html = '<div class="settings-section">特效开关</div>';
  html += Object.entries(EFFECT_DEFS).map(([key, label]) => {
    const on = effects[key] !== false;
    return `<label class="setting-item"><span>${label}</span><input type="checkbox" data-effect="${key}" ${on ? 'checked' : ''}></label>`;
  }).join('');

  // 背景纹理
  const backdropOn = localStorage.getItem('backdropTexture') === 'on';
  html += '<div class="settings-section">显示设置</div>';
  html += `<label class="setting-item"><span>背景纹理</span><input type="checkbox" id="backdropToggle" ${backdropOn ? 'checked' : ''}></label>`;

  // 主题预设
  const currentMode = el.body.dataset.colorMode || 'light';
  const currentSkin = el.body.dataset.skin || '';
  html += '<div class="settings-section">主题预设</div><div class="theme-presets">';
  html += THEME_PRESETS.map(p => {
    const active = (p.mode === currentMode && p.skin === (currentSkin || '')) ? ' active' : '';
    return `<button class="theme-preset-btn${active}" data-theme="${p.id}">${p.name}</button>`;
  }).join('');
  html += '</div>';

  list.innerHTML = html;

  // 绑定特效开关
  list.querySelectorAll('input[data-effect]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.effect;
      if (state.story?.meta?.effects) state.story.meta.effects[key] = cb.checked;
    });
  });
  // 背景纹理
  const backdropToggle = document.getElementById('backdropToggle');
  if (backdropToggle) {
    backdropToggle.addEventListener('change', () => {
      localStorage.setItem('backdropTexture', backdropToggle.checked ? 'on' : 'off');
      document.querySelector('.backdrop').style.display = backdropToggle.checked ? '' : 'none';
    });
  }
  // 主题预设
  list.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = THEME_PRESETS.find(x => x.id === btn.dataset.theme);
      if (!p) return;
      el.body.dataset.colorMode = p.mode;
      el.body.dataset.skin = p.skin || undefined;
      localStorage.setItem('preferredColorMode', p.mode);
      localStorage.setItem('preferredSkin', p.skin);
      list.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('settingsClose').onclick = () => { panel.hidden = true; };
}

/* ============================================================
   资料库
   ============================================================ */
async function scanLibrary() {
  try {
    const res = await fetch("stories/manifest.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no manifest");
    const manifest = await res.json();
    el.library.hidden = false;
    el.libraryGrid.innerHTML = "";
    for (const item of manifest.stories) {
      const card = document.createElement("div");
      card.className = "lib-card";
      card.innerHTML = `<div class="t">${escapeHtml(item.title)}</div><div class="a">${escapeHtml(item.author || "佚名")} · v${escapeHtml(item.version || "1")}</div>`;
      card.addEventListener("click", async () => {
        const r = await fetch(`stories/${item.file}`, { cache: "no-store" });
        loadStory(await r.json());
      });
      el.libraryGrid.appendChild(card);
    }
  } catch (e) { el.library.hidden = true; }
}

/* ---------- 示例故事 ---------- */
const SAMPLE_STORY = {
  schemaVersion: 2, meta: {
    title: "雨夜来信", author: "织梦示例", version: "1.0.0",
    ambient: "rain", variableName: "确信", initialVariable: 35,
    description: "一封没有署名的信，一场从门缝里涨起的雨。",
    cover: { label: "RAIN TAPE / 01", tagline: "请在午夜前抵达天台，别让雨替你做决定。" },
  },
  startNodeId: "start",
  variables: { letterOpened: false },
  achievements: {
    first_choice: { title: "雨夜的第一个决定", description: "在门缝里的信前做出选择。" },
    true_tide: { title: "潮声归来", description: "抵达真正的潮声。" },
  },
  characters: {
    narrator: { name: "你", emoji: "👤", role: "主角", startNode: "start" },
    letter_writer: { name: "写信人", emoji: "✉️", role: "神秘人", relations: ["你"] },
  },
  nodes: {
    start: { chapterTitle: "雨夜", scene: { id: "旧公寓门前", name: "旧公寓门前", description: "雨水沿着楼道边缘往下淌。", arrival: "你在这里停下脚步。" }, progress: 4, ambient: "rain",
      segments: [{ speaker: "系统", text: "雨从傍晚开始下。", effect: "breath" }, { speaker: "", text: "你在旧公寓的门缝里，发现了一封没有署名的信。" }],
      choices: [{ text: "拆开信封", next: "open_letter", effects: ["noise"], changes: { val: 12, set: { letterOpened: true }, unlockAchievement: "first_choice" } }, { text: "把信放回原处", next: "leave_letter", changes: { val: -8, unlockAchievement: "first_choice" } }] },
    open_letter: { scene: "旧公寓门前", progress: 36, ambient: "static",
      segments: [{ speaker: "信", text: "如果你还记得海，请在午夜前到天台来。", effect: "glitch" }, { speaker: "系统", text: "你的指尖变冷，但你忽然确信它不是恶作剧。" }],
      choices: [{ text: "立刻去天台", next: "roof", changes: { val: 18 } }, { text: "先检查信封背面", next: "backside", changes: { val: 6, importantFlag: { id: "checked_envelope", label: "检查信封背面" } } }] },
    backside: { scene: "旧公寓门前", progress: 52, ambient: "rain",
      segments: [{ speaker: "系统", text: "信封背后有一串数字。它们和你母亲去世那天的日期完全一致。", effect: "cold" }], next: "roof" },
    leave_letter: { scene: "旧公寓门前", progress: 28, ambient: "rain",
      segments: [{ speaker: "系统", text: "你把信放回原处。只有雨声继续替某个陌生人敲门。" }],
      routes: [{ condition: "val < 30", next: "ending_silence" }, { condition: "default", next: "start" }] },
    roof: { chapterTitle: "天台", scene: { id: "midnight_roof", name: "午夜天台", description: "城市的雨声倒灌上来。", arrival: "你推开铁门。" }, progress: 72, ambient: "tide",
      segments: [{ speaker: "系统", text: "午夜的天台没有人。可整座城市的雨水都在向上流。", effect: "drown" }, { speaker: "", text: "你听见遥远的潮声从胸腔深处涌出来。" }],
      choices: [{ text: "呼唤写信的人", next: "ending_tide", condition: "val >= 55", effect: "flash" }, { text: "后退，离开天台", next: "ending_silence", condition: "default", effect: "blackout" }] },
    ending_tide: { isEnding: true, title: "结局：潮声归来", type: "TRUE ENDING", progress: 100, ambient: "tide", achievement: "true_tide",
      description: "你喊出了那个名字。雨停了。城市像一枚被海水洗净的贝壳。" },
    ending_silence: { isEnding: true, title: "结局：无人回信", type: "NORMAL ENDING", progress: 100, ambient: "none",
      description: "第二天早晨，你找不到那封信。走廊干燥、明亮，仿佛什么也没有发生。" },
  },
};

/* ============================================================
   死路处理
   ============================================================ */
function handleDeadEnd(nodeId, reason) {
  console.warn("死路:", nodeId, reason);
  el.speaker.textContent = "系统";
  el.storyText.textContent = "故事在这里断了线。你可以回到上一个选择，重新出发。";
  el.continueHint.hidden = true;
  const btn = document.createElement("button");
  btn.className = "btn"; btn.textContent = "回到上一个选择";
  btn.addEventListener("click", goBack);
  el.choices.innerHTML = ""; el.choices.appendChild(btn);
}

/* ============================================================
   开发者调试
   ============================================================ */
function devLog(msg) {
  const d = new Date();
  const ts = `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}`;
  el.devLog.textContent = `[${ts}] ${msg}\n` + el.devLog.textContent.slice(0, 800);
}
function toggleDevPanel() {
  el.devPanel.hidden = !el.devPanel.hidden;
  if (!el.devPanel.hidden && state.story) el.devState.textContent = `当前: ${state.currentNodeId} · val=${state.val} · flags=${state.flags.length}`;
}
function devJump() {
  const id = el.devJumpInput.value.trim();
  if (!id || !state.story?.nodes[id]) { devLog(`节点不存在: ${id}`); return; }
  state.choiceHistory = []; state.pageHistory = [];
  processNode(id, { fromHistory: true, showChapter: false, keepSegment: false });
  devLog(`跳转 → ${id}`);
}
function devEndingTest() {
  if (!state.story) return;
  const endings = Object.entries(state.story.nodes).filter(([,n]) => n.isEnding);
  devLog(`结局节点: ${endings.map(([id]) => id).join(", ") || "无"}`);
  endings.forEach(([id]) => {
    const btn = document.createElement("button");
    btn.className = "btn"; btn.textContent = id; btn.style.margin = "4px";
    btn.addEventListener("click", () => { state.choiceHistory = []; processNode(id, { fromHistory: true }); });
    el.devLog.appendChild(btn);
  });
}

/* ============================================================
   记录视图
   ============================================================ */
function showEndingsRecord() {
  try {
    const key = `dreamloom_ending_${state.story?.meta.title || ""}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const lines = list.map(r => `${r.title} (${r.type}) · ${r.at.slice(0,16).replace("T"," ")}`).join("\n");
    showOverlay("结局记录", lines || "还没有结局记录", 3000);
  } catch (e) { showOverlay("结局记录", "读取失败", 2000); }
}
function showAchievementsRecord() {
  const defs = state.story?.achievements || {};
  const unlocked = state.achievements;
  const lines = Object.entries(defs).map(([id, def]) => `${unlocked.includes(id) ? "✅" : "🔒"} ${def.title}`).join("\n");
  showOverlay("成就记录", lines || "本剧本无成就", 3200);
}
function showTimeline() {
  if (!state.story) return;
  closeMenu();
  const nodes = state.story.nodes;
  const chapters = [];
  const seen = new Set();
  for (const [id, node] of Object.entries(nodes)) {
    if (node.chapterTitle && !node.isEnding) {
      if (seen.has(node.chapterTitle)) continue;
      seen.add(node.chapterTitle);
      chapters.push({ id, title: node.chapterTitle, scene: node.title || node.scene?.name || "", visited: state.pageHistory.includes(id) });
    }
  }
  const eras = {};
  for (const ch of chapters) {
    let era = "其他";
    if (ch.title.includes("雪夜") || ch.title.includes("冯国金") || ch.title.includes("尸检")) era = "2003 · 冯国金";
    else if (ch.title.includes("王頔")) era = "1999 · 王頔";
    else if (ch.title.includes("雪融")) era = "2013 · 北京";
    if (!eras[era]) eras[era] = [];
    eras[era].push(ch);
  }
  let html = `<div class="timeline-overlay" id="timelineOverlay"><div class="timeline-panel"><h3>⏱ 时间线 · 自由跳转</h3>`;
  for (const [era, chs] of Object.entries(eras)) {
    html += `<div class="timeline-era"><div class="timeline-era-label">${escapeHtml(era)}</div>`;
    for (const ch of chs) {
      const isActive = state.currentNodeId === ch.id;
      html += `<div class="timeline-entry${isActive?' active':''}${ch.visited?' visited':''}" data-chapter="${ch.id}"><div class="dot"></div><div class="info"><div class="title">${ch.title}</div><div class="desc">${ch.visited?'✅ 已探索':'🔒 未探索'} · ${escapeHtml(ch.scene)}</div></div><button class="go-btn">跳转</button></div>`;
    }
    html += `</div>`;
  }
  html += `<div class="timeline-close" id="timelineClose">✕ 关闭时间线</div></div></div>`;
  const existing = document.getElementById("timelineOverlay");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", html);
  document.querySelectorAll(".timeline-entry").forEach(el => { el.addEventListener("click", () => jumpToChapter(el.dataset.chapter)); });
  document.getElementById("timelineClose").addEventListener("click", () => document.getElementById("timelineOverlay")?.remove());
  document.getElementById("timelineOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.target.remove(); });
}
function jumpToChapter(chapterNodeId) {
  const node = state.story?.nodes[chapterNodeId];
  if (!node) return;
  document.getElementById("timelineOverlay")?.remove();
  processNode(chapterNodeId, { fromHistory: false, showChapter: true, keepSegment: false });
  flashToast(`跳转到「${node.chapterTitle || chapterNodeId}」`);
}
function showStats() {
  const lines = [`当前节点: ${state.currentNodeId}`,`状态值: ${state.val}`,`旗帜数: ${state.flags.length}`,`关键决定: ${state.keyDecisions.length}`,`成就: ${state.achievements.length}`,`选择历史: ${state.choiceHistory.length} 步`].join("\n");
  showOverlay("游玩统计", lines, 3000);
}

/* ============================================================
   Toast 提示
   ============================================================ */
function flashToast(msg) {
  let t = $("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    t.style.cssText = "position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99;background:var(--surface);border:1px solid var(--line);color:var(--text);padding:10px 22px;border-radius:999px;font-size:.85rem;box-shadow:0 8px 30px var(--shadow);transition:opacity .4s;";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  setTimeout(() => { t.style.opacity = "0"; }, 1600);
}

/* ============================================================
   事件绑定
   ============================================================ */
function bindEvents() {
  el.importBtn.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { loadStory(JSON.parse(reader.result)); } catch (err) { alert(`剧本解析失败: ${err.message}`); } };
    reader.readAsText(file); e.target.value = "";
  });
  el.libraryBtn.addEventListener("click", () => scanLibrary());
  el.sampleBtn.addEventListener("click", () => loadStory(JSON.parse(JSON.stringify(SAMPLE_STORY))));
  el.devBtn.addEventListener("click", toggleDevPanel);
  el.devJumpBtn.addEventListener("click", devJump);
  el.devEndingBtn.addEventListener("click", devEndingTest);
  el.devJumpInput.addEventListener("keydown", (e) => { if (e.key === "Enter") devJump(); });
  el.backBtn.addEventListener("click", goBack);
  el.pageBackBtn.addEventListener("click", () => {
    if (state.pageHistory.length > 1) { state.pageHistory.pop(); const prev = state.pageHistory[state.pageHistory.length - 1]; if (prev && state.story?.nodes[prev]) processNode(prev, { fromHistory: true }); }
  });
  el.menuBtn.addEventListener("click", openMenu);
  el.menuDrawer.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-menu-action]");
    if (!btn) return;
    const action = btn.dataset.menuAction;
    closeMenu();
    switch (action) {
      case "return-home": returnToHome(); break;
      case "timeline": showTimeline(); break;
      case "endings": showEndingsRecord(); break;
      case "achievements": showAchievementsRecord(); break;
      case "saves": showSaveLoadUI(); break;
      case "graph": showCharacterGraph(); break;
      case "tasks": toggleTaskPanel(); break;
      case "history": toggleHistoryPanel(); break;
      case "stats": showStats(); break;
      case "settings": showSettingsPanel(); break;
      case "close": break;
    }
  });
  document.querySelectorAll("[data-color-mode-choice]").forEach((btn) => {
    btn.addEventListener("click", () => { el.body.dataset.colorMode = btn.dataset.colorModeChoice; });
  });
  // 亮暗切换（游戏内右上角）
  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = el.body.dataset.colorMode || "light";
      const next = current === "dark" ? "light" : "dark";
      el.body.dataset.colorMode = next;
      toggleBtn.textContent = next === "dark" ? "☀️" : "🌙";
      localStorage.setItem("preferredColorMode", next);
    });
  }
  // 进入 reader 时同步 localStorage 记录
  const saved = localStorage.getItem("preferredColorMode");
  if (saved && toggleBtn) {
    el.body.dataset.colorMode = saved;
    toggleBtn.textContent = saved === "dark" ? "☀️" : "🌙";
  }
  const savedSkin = localStorage.getItem("preferredSkin");
  if (savedSkin) el.body.dataset.skin = savedSkin || undefined;
  // 背景纹理
  if (localStorage.getItem('backdropTexture') !== 'on') {
    document.querySelector('.backdrop').style.display = 'none';
  }
  el.creditLink.addEventListener("click", (e) => {
    e.preventDefault();
    showOverlay("致敬 @山音", "互动文游 JSON 格式标准的开创者 · 山之音工作室", 2600);
  });
  // intro 模式：点击不推进，全部由 auto 控制（choice 按钮不受影响）
  el.page.addEventListener("click", (e) => {
    AUDIO.resumeCtx();
    if (el.body.dataset.mode === "intro") return;
    if (state.isInputLocked) return;
    if (e.target.closest(".choices")) return;
    const node = state.story?.nodes[state.currentNodeId];
    if (!node?.segments) return;
    state.segmentIndex++;
    renderSegment();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
    if (e.key === "Backspace" && state.story && el.body.dataset.mode === "play") { e.preventDefault(); goBack(); }
  });
}

/* ============================================================
   启动
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  scanLibrary();
  devLog("织梦引擎 v2.0 就绪。");
});