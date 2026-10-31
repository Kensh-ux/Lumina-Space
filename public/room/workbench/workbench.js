/* 窗畔 · 工作台
   把 Lumina-Space 的待办 / 专注 / 规划师 / 情绪记录，连同笔记与等级，
   做成浮在房间上的一层工作台。数据与逻辑见 core.js。
*/
(function () {
  'use strict';
  window.WB = window.WB || {};
  const WB = window.WB;
  const C = WB.core;
  if (!C) {
    console.error('[工作台] core.js 没有加载，工作台不会启动');
    return;
  }

  const store = C.createStore();
  WB.store = store;

  /* ———————————————————— 小工具 ———————————————————— */
  const esc = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function svg(paths, extra) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (extra || '') + '>' + paths + '</svg>';
  }

  const ICON = {
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    check: svg('<path d="m5 12.5 4.2 4.2L19 6.8"/>'),
    todo: svg('<rect x="4" y="4" width="16" height="16" rx="2.2"/><path d="m8 12 2.6 2.6L16 9"/>'),
    note: svg('<path d="M6 3.6h8.4L19 8.2v12.2H6z"/><path d="M14 3.8V8.4h4.4M9 12h7M9 15.4h7"/>'),
    calendar: svg('<rect x="3.6" y="5.4" width="16.8" height="15" rx="1.8"/><path d="M3.6 9.6h16.8M8 3.4v4M16 3.4v4M8 13.4h2.2M13.8 13.4H16M8 17h2.2M13.8 17H16"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.2 2"/>'),
    heart: svg('<path d="M12 19.6S4.4 15 4.4 9.9A3.9 3.9 0 0 1 12 7.9a3.9 3.9 0 0 1 7.6 2c0 5.1-7.6 9.7-7.6 9.7z"/>'),
    gear: svg('<circle cx="12" cy="12" r="2.8"/><path d="M12 3.6v2.2M12 18.2v2.2M4.9 7.5l1.9 1.1M17.2 15.4l1.9 1.1M4.9 16.5l1.9-1.1M17.2 8.6l1.9-1.1"/>'),
    search: svg('<circle cx="11" cy="11" r="6.2"/><path d="m15.6 15.6 4 4"/>'),
    trash: svg('<path d="M5.4 7.4h13.2M9.4 7.4V5h5.2v2.4M7.2 7.4l.8 12h8l.8-12"/><path d="M10.4 10.6v6M13.6 10.6v6"/>'),
    pencil: svg('<path d="m15.4 5.6 3 3L9 18l-3.8.8.8-3.8z"/><path d="m13.4 7.6 3 3"/>'),
    close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
    chevDown: svg('<path d="m7 10 5 5 5-5"/>'),
    chevUp: svg('<path d="m7 14 5-5 5 5"/>'),
    chevLeft: svg('<path d="m14.4 6.5-6 5.5 6 5.5"/>'),
    chevRight: svg('<path d="m9.6 6.5 6 5.5-6 5.5"/>'),
    play: svg('<path d="M8.4 5.6 18 12l-9.6 6.4z" fill="currentColor" stroke="none"/>'),
    pause: svg('<path d="M9 5.5v13M15 5.5v13" stroke-width="2"/>'),
    skip: svg('<path d="M6.6 6.2 15 12l-8.4 5.8z"/><path d="M17.4 6v12"/>'),
    reset: svg('<path d="M5.6 9.6A7 7 0 1 1 5 13"/><path d="M5.4 4.8v5h5"/>'),
    collapse: svg('<path d="m7 14 5-5 5 5"/>'),
    expand: svg('<path d="m7 10 5 5 5-5"/>'),
    download: svg('<path d="M12 4.4v10M7.8 10.2 12 14.4l4.2-4.2"/><path d="M5 17.4h14"/>'),
    upload: svg('<path d="M12 14.6v-10M7.8 8.8 12 4.6l4.2 4.2"/><path d="M5 17.4h14"/>'),
    door: svg('<path d="M5 20V5.4A1.4 1.4 0 0 1 6.4 4h8.2A1.4 1.4 0 0 1 16 5.4V20"/><path d="M3.6 20h16.8M12.6 12.4v.1"/>'),
    arrow: svg('<path d="M4.6 12h15M14.4 6.8 19.6 12l-5.2 5.2"/>')
  };

  const WEEK_CN = C.WEEKDAYS;

  function todayStr() {
    return C.toDateString(new Date());
  }

  function nowHM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function toast(text, ms) {
    if (window.WP && WP.UI && typeof WP.UI.toast === 'function') WP.UI.toast(text, ms || 2600);
  }

  function chime(notes) {
    if (!window.WP || !WP.Audio || !WP.Audio.isOn || !WP.Audio.isOn()) return;
    (notes || [84, 88, 91]).forEach((n, i) => WP.Audio.note(n, i * 0.16, 0.05));
  }

  function readLayout() {
    try {
      return JSON.parse(localStorage.getItem(C.KEYS.layout) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function writeLayout(layout) {
    try {
      localStorage.setItem(C.KEYS.layout, JSON.stringify(layout));
    } catch (e) { /* 存储不可用时只在本次会话生效 */ }
  }

  /* ———————————————————— 状态 ———————————————————— */
  const state = {
    todoFilter: 'open',
    todoQuery: '',
    todoEditor: null,
    journal: { emotion: '期待', custom: '', score: 0, editingId: null, query: '', pin: todayStr() },
    planner: (function () {
      const d = new Date();
      return { year: d.getFullYear(), month: d.getMonth() + 1, flash: null };
    })(),
    timer: C.createTimer(store.prefs.focusMin),
    phase: 'focus',
    timerHandle: 0,
    sheet: null,
    mobileTab: 'todo',
    mobile: false,
    ready: false,
    confirmResolve: null
  };

  /* ———————————————————— 根节点 ———————————————————— */
  const root = el('div', 'wb');
  root.id = 'wb';
  root.setAttribute('aria-label', '窗畔工作台');

  const clockNode = el('section', 'wb-clock', '');
  clockNode.setAttribute('aria-label', '现在时间');
  clockNode.innerHTML =
    '<p class="wb-clock-date" id="wbDate">—</p>' +
    '<p class="wb-clock-time"><span id="wbTime">--:--</span><em id="wbSec">:--</em></p>' +
    '<p class="wb-clock-greet" id="wbGreet">在窗边坐一会儿</p>';

  const pomoNode = el('section', 'wb-pomo', '');
  pomoNode.id = 'wbPomo';
  pomoNode.setAttribute('aria-label', '番茄钟');
  const RING_R = 92;
  const RING_C = 2 * Math.PI * RING_R;
  pomoNode.innerHTML =
    '<div class="wb-level" id="wbLevel" title="完成 4 个番茄升一级">' +
      '<span class="wb-level-label">等级</span>' +
      '<b class="wb-level-num" id="wbLevelNum">1</b>' +
      '<span class="wb-level-bar"><i id="wbLevelFill"></i></span>' +
    '</div>' +
    '<div class="wb-pomo-dial">' +
      '<svg class="wb-ring" viewBox="0 0 220 220" aria-hidden="true">' +
        '<circle class="wb-ring-track" cx="110" cy="110" r="' + RING_R + '"/>' +
        '<circle class="wb-ring-prog" id="wbRingProg" cx="110" cy="110" r="' + RING_R + '" ' +
          'stroke-dasharray="' + RING_C.toFixed(2) + '" stroke-dashoffset="0" transform="rotate(-90 110 110)"/>' +
      '</svg>' +
      '<div class="wb-pomo-face">' +
        '<div class="wb-cycle"><span>循环</span> <b id="wbCycle">1</b></div>' +
        '<div class="wb-pomo-pair">' +
          '<div class="wb-min" data-kind="focus">' +
            '<span class="wb-min-label">创作</span>' +
            '<b id="wbFocusMin">25</b>' +
            '<span class="wb-steppers">' +
              '<button type="button" data-step="focus" data-dir="1" aria-label="增加创作分钟">' + ICON.chevUp + '</button>' +
              '<button type="button" data-step="focus" data-dir="-1" aria-label="减少创作分钟">' + ICON.chevDown + '</button>' +
            '</span>' +
          '</div>' +
          '<div class="wb-min" data-kind="break">' +
            '<span class="wb-min-label">休息</span>' +
            '<b id="wbBreakMin">5</b>' +
            '<span class="wb-steppers">' +
              '<button type="button" data-step="break" data-dir="1" aria-label="增加休息分钟">' + ICON.chevUp + '</button>' +
              '<button type="button" data-step="break" data-dir="-1" aria-label="减少休息分钟">' + ICON.chevDown + '</button>' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<p class="wb-pomo-time" id="wbPomoTime">25:00</p>' +
        '<button class="wb-pomo-play" id="wbPomoPlay" type="button" aria-label="开始专注">' + ICON.play + '</button>' +
      '</div>' +
    '</div>' +
    '<p class="wb-pomo-foot" id="wbPomoFoot">今日 <b>0</b> 个番茄</p>';

  const railItems = [
    { key: 'todo', label: '待办', icon: ICON.todo },
    { key: 'notes', label: '笔记', icon: ICON.note },
    { key: 'worlds', label: '世界', icon: ICON.door },
    { key: 'planner', label: '规划师', icon: ICON.calendar },
    { key: 'journal', label: '情绪记录', icon: ICON.heart },
    { key: 'focus', label: '专注', icon: ICON.clock },
    { key: 'settings', label: '设置', icon: ICON.gear }
  ];

  const railNode = el('nav', 'wb-rail', '');
  railNode.setAttribute('aria-label', '工作台');
  railNode.innerHTML = railItems
    .map((it) => '<button type="button" data-rail="' + it.key + '" aria-label="' + it.label + '" title="' + it.label + '">' + it.icon + '</button>')
    .join('');

  /* ———————————————————— 浮动窗口 ———————————————————— */
  function makeWindow(key, title, en, bodyId) {
    const win = el('section', 'wb-win wb-win-' + key);
    win.dataset.key = key;
    win.innerHTML =
      '<header class="wb-win-head" data-handle>' +
        '<div class="wb-win-title"><span class="wb-win-cn">' + title + '</span><span class="wb-win-en">' + en + '</span></div>' +
        '<div class="wb-win-tools">' +
          '<button type="button" class="wb-win-btn" data-win="collapse" aria-label="收起">' + ICON.expand + '</button>' +
          '<button type="button" class="wb-win-btn" data-win="close" aria-label="关闭">' + ICON.close + '</button>' +
        '</div>' +
      '</header>' +
      '<div class="wb-win-body" id="' + bodyId + '"></div>';
    return win;
  }

  const todoWin = makeWindow('todo', '待办事项列表', 'TO-DO', 'wbTodoBody');
  const notesWin = makeWindow('notes', '笔记', 'NOTES', 'wbNotesBody');
  const todoBody = todoWin.querySelector('#wbTodoBody');
  const notesBody = notesWin.querySelector('#wbNotesBody');
  const holder = el('div', 'wb-holder');

  const railTips = el('div', 'wb-rail-tips', railItems.map((it) => '<span>' + it.label + '</span>').join(''));

  const fab = el('button', 'wb-fab', ICON.todo + '<span>工作台</span>');
  fab.type = 'button';
  fab.setAttribute('aria-label', '打开工作台');

  const sheet = el('section', 'wb-sheet');
  sheet.innerHTML =
    '<div class="wb-sheet-scrim" data-sheet="close"></div>' +
    '<div class="wb-sheet-card" role="dialog" aria-modal="true" aria-label="工作台面板">' +
      '<header class="wb-sheet-head">' +
        '<div><p class="wb-sheet-kicker" id="wbSheetKicker">WORKBENCH</p><h2 id="wbSheetTitle">待办事项</h2></div>' +
        '<button type="button" class="wb-sheet-close" data-sheet="close" aria-label="关闭">' + ICON.close + '</button>' +
      '</header>' +
      '<div class="wb-sheet-tabs" id="wbSheetTabs"></div>' +
      '<div class="wb-sheet-body" id="wbSheetBody"></div>' +
    '</div>';
  const sheetBody = sheet.querySelector('#wbSheetBody');
  const sheetTabs = sheet.querySelector('#wbSheetTabs');

  const confirm = el('div', 'wb-confirm');
  confirm.innerHTML =
    '<div class="wb-confirm-scrim" data-confirm="cancel"></div>' +
    '<div class="wb-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="wbConfirmTitle">' +
      '<p class="wb-confirm-kicker">PLEASE CONFIRM</p>' +
      '<h3 id="wbConfirmTitle">确认</h3>' +
      '<p class="wb-confirm-body" id="wbConfirmBody"></p>' +
      '<div class="wb-confirm-actions">' +
        '<button type="button" class="wb-btn wb-btn-ghost" data-confirm="cancel">再想想</button>' +
        '<button type="button" class="wb-btn wb-btn-gold" data-confirm="ok" id="wbConfirmOk">确认</button>' +
      '</div>' +
    '</div>';

  root.appendChild(clockNode);
  root.appendChild(pomoNode);
  root.appendChild(railNode);
  root.appendChild(railTips);
  root.appendChild(todoWin);
  root.appendChild(notesWin);
  root.appendChild(holder);
  root.appendChild(fab);
  root.appendChild(sheet);
  root.appendChild(confirm);
  document.getElementById('app').appendChild(root);

  /* ———————————————————— 确认框 ———————————————————— */
  function askConfirm(opts) {
    return new Promise((resolve) => {
      state.confirmResolve = resolve;
      confirm.querySelector('#wbConfirmTitle').textContent = opts.title || '确认';
      confirm.querySelector('#wbConfirmBody').textContent = opts.body || '';
      const ok = confirm.querySelector('#wbConfirmOk');
      ok.textContent = opts.okText || '确认';
      ok.classList.toggle('is-danger', !!opts.danger);
      confirm.classList.add('open');
      setTimeout(() => ok.focus(), 30);
    });
  }

  function settleConfirm(ok) {
    confirm.classList.remove('open');
    const fn = state.confirmResolve;
    state.confirmResolve = null;
    if (fn) fn(ok);
  }

  confirm.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-confirm]');
    if (!btn) return;
    settleConfirm(btn.dataset.confirm === 'ok');
  });

  /* ———————————————————— 模板：待办 ———————————————————— */
  const todoNode = el('div', 'wb-mod wb-mod-todo');
  todoNode.innerHTML =
    '<div class="wb-todo-top">' +
      '<div class="wb-todo-count"><b id="wbOpenCount">0</b><span>/</span><i id="wbTotalCount">0</i></div>' +
      '<button type="button" class="wb-new" data-action="new-task">' + ICON.plus + '<span>新任务</span></button>' +
    '</div>' +
    '<form class="wb-editor" id="wbEditor" hidden>' +
      '<input class="wb-input wb-editor-title" name="title" type="text" maxlength="120" placeholder="要做什么？" autocomplete="off" />' +
      '<textarea class="wb-input wb-editor-desc" name="description" maxlength="500" rows="2" placeholder="补充说明（可选）"></textarea>' +
      '<div class="wb-editor-row">' +
        '<label class="wb-field"><span>截止</span><input class="wb-input" type="date" name="dueDate" /></label>' +
        '<label class="wb-field"><span>时间</span><input class="wb-input" type="time" name="dueTime" /></label>' +
      '</div>' +
      '<div class="wb-editor-row wb-editor-prio">' +
        '<span class="wb-field-label">优先级</span>' +
        '<div class="wb-prio" role="group" aria-label="优先级">' +
          '<button type="button" data-prio="1">低</button>' +
          '<button type="button" data-prio="2">中</button>' +
          '<button type="button" data-prio="3">高</button>' +
          '<button type="button" data-prio="0">无</button>' +
        '</div>' +
      '</div>' +
      '<div class="wb-editor-actions">' +
        '<button type="button" class="wb-btn wb-btn-ghost" data-action="cancel-edit">取消</button>' +
        '<button type="submit" class="wb-btn wb-btn-gold" id="wbEditorSave">保存</button>' +
      '</div>' +
    '</form>' +
    '<div class="wb-todo-bar">' +
      '<div class="wb-seg" role="group" aria-label="筛选">' +
        '<button type="button" data-filter="open" class="is-on">未完成</button>' +
        '<button type="button" data-filter="all">全部</button>' +
        '<button type="button" data-filter="done">已完成</button>' +
      '</div>' +
      '<label class="wb-search">' + ICON.search +
        '<input type="search" id="wbTaskSearch" placeholder="搜索" aria-label="搜索任务" autocomplete="off" />' +
      '</label>' +
    '</div>' +
    '<div class="wb-task-list" id="wbTaskList"></div>' +
    '<div class="wb-todo-foot" id="wbTodoFoot"></div>';

  notesBody.appendChild(notesPlaceholder());
  function notesPlaceholder() {
    return el('div', 'wb-mod wb-mod-notes');
  }
  const notesNode = notesBody.firstElementChild;
  notesNode.innerHTML =
    '<div class="wb-notes-pages">' +
      '<button type="button" class="wb-page-new" data-action="page-new">' + ICON.plus + '<span>新页面</span></button>' +
      '<div class="wb-page-list" id="wbPageList"></div>' +
    '</div>' +
    '<div class="wb-notes-main">' +
      '<div class="wb-notes-head">' +
        '<input class="wb-note-title" id="wbNoteTitle" type="text" maxlength="40" aria-label="页面标题" />' +
        '<button type="button" class="wb-icon-btn" data-action="page-del" title="删除这一页" aria-label="删除这一页">' + ICON.trash + '</button>' +
      '</div>' +
      '<textarea class="wb-note-body" id="wbNoteBody" placeholder="在此输入…" aria-label="笔记正文"></textarea>' +
      '<div class="wb-notes-foot"><span id="wbNoteStatus">已保存</span><span id="wbNoteCount">0 字</span></div>' +
    '</div>';

  /* ———————————————————— 模板：规划师 ———————————————————— */
  const plannerNode = el('div', 'wb-mod wb-mod-planner');
  plannerNode.innerHTML =
    '<div class="wb-planner-head">' +
      '<button type="button" class="wb-icon-btn" data-action="plan-prev" aria-label="上个月">' + ICON.chevLeft + '</button>' +
      '<div><h3 id="wbPlanTitle">—</h3><p id="wbPlanSub">按截止日期铺开的一整月</p></div>' +
      '<button type="button" class="wb-icon-btn" data-action="plan-next" aria-label="下个月">' + ICON.chevRight + '</button>' +
      '<button type="button" class="wb-mini" data-action="plan-today">回到今天</button>' +
    '</div>' +
    '<div class="wb-plan-days" id="wbPlanDays"></div>' +
    '<p class="wb-plan-hint">点日期下的「+」就能给那天加任务；点任务前面的圆点可以完成它。</p>';

  /* ———————————————————— 模板：情绪记录 ———————————————————— */
  const journalNode = el('div', 'wb-mod wb-mod-journal');
  journalNode.innerHTML =
    '<form class="wb-journal-form" id="wbJournalForm">' +
      '<div class="wb-journal-sec"><span class="wb-field-label">今天的情绪</span>' +
        '<div class="wb-emotions" id="wbEmotions"></div>' +
        '<input class="wb-input wb-journal-custom" id="wbEmotionCustom" type="text" maxlength="16" placeholder="或者自己写一个…" autocomplete="off" />' +
      '</div>' +
      '<div class="wb-journal-sec">' +
        '<label class="wb-field wb-score-field"><span>事件好感值</span>' +
          '<input class="wb-input" id="wbScore" type="number" min="-724" max="597" step="1" value="0" />' +
          '<em id="wbScorePreview">0</em>' +
        '</label>' +
        '<p class="wb-hint">−724 到 597，只是一个刻度，不必精确。</p>' +
      '</div>' +
      '<div class="wb-journal-sec">' +
        '<textarea class="wb-input wb-journal-text" id="wbJournalText" maxlength="500" rows="4" placeholder="发生了什么？当时的身体和念头是怎样的？"></textarea>' +
        '<div class="wb-journal-actions">' +
          '<span class="wb-counter" id="wbJournalCount">0 / 500</span>' +
          '<button type="button" class="wb-btn wb-btn-ghost" data-action="journal-cancel" hidden id="wbJournalCancel">取消编辑</button>' +
          '<button type="submit" class="wb-btn wb-btn-gold" id="wbJournalSave">记下这一刻</button>' +
        '</div>' +
      '</div>' +
    '</form>' +
    '<div class="wb-journal-list-head">' +
      '<label class="wb-search">' + ICON.search + '<input type="search" id="wbJournalSearch" placeholder="搜索情绪或事件" aria-label="搜索情绪记录" /></label>' +
      '<label class="wb-field wb-pin"><span>置顶日期</span><input class="wb-input" type="date" id="wbJournalPin" /></label>' +
    '</div>' +
    '<div class="wb-journal-list" id="wbJournalList"></div>';

  /* ———————————————————— 模板：专注 ———————————————————— */
  const focusNode = el('div', 'wb-mod wb-mod-focus');
  focusNode.innerHTML =
    '<div class="wb-focus-stage">' +
      '<p class="wb-focus-phase" id="wbFocusPhase">创作时间</p>' +
      '<p class="wb-focus-time" id="wbFocusTime">25:00</p>' +
      '<p class="wb-focus-sub" id="wbFocusSub">第 1 个循环 · 休息 5 分钟</p>' +
      '<div class="wb-focus-actions">' +
        '<button type="button" class="wb-btn wb-btn-ghost" data-action="focus-reset">重置</button>' +
        '<button type="button" class="wb-btn wb-btn-gold" data-action="focus-toggle" id="wbFocusToggle">开始</button>' +
        '<button type="button" class="wb-btn wb-btn-ghost" data-action="focus-skip">跳过</button>' +
      '</div>' +
      '<div class="wb-focus-presets" role="group" aria-label="专注时长">' +
        '<button type="button" data-preset="15">15</button>' +
        '<button type="button" data-preset="25">25</button>' +
        '<button type="button" data-preset="45">45</button>' +
        '<button type="button" data-preset="60">60</button>' +
      '</div>' +
      '<div class="wb-focus-custom" role="group" aria-label="自定义时长">' +
        '<label>创作<input type="number" id="wbFocusCustomFocus" min="1" max="480" step="1" inputmode="numeric" /></label>' +
        '<label>休息<input type="number" id="wbFocusCustomBreak" min="1" max="480" step="1" inputmode="numeric" /></label>' +
        '<label>长休<input type="number" id="wbFocusCustomLong" min="1" max="480" step="1" inputmode="numeric" /></label>' +
        '<button type="button" class="wb-btn wb-btn-ghost" data-action="focus-apply">应用</button>' +
      '</div>' +
    '</div>' +
    '<div class="wb-stats" id="wbFocusStats"></div>' +
    '<p class="wb-hint">番茄只记录完整走完的创作时段。计时在刷新页面后回到待开始。</p>';

  /* ———————————————————— 模板：设置 ———————————————————— */
  const settingsNode = el('div', 'wb-mod wb-mod-settings');
  settingsNode.innerHTML =
    '<div class="wb-settings-sec"><h3>转换模式</h3>' +
      '<p class="wb-hint">当前：窗畔 3D 模式。任务、情绪记录与专注历史和简易模式共用。</p>' +
      '<div class="wb-settings-actions">' +
        '<a class="wb-btn wb-btn-ghost wb-mode-link" href="../"><span>回到简易模式</span></a>' +
      '</div>' +
    '</div>' +
    '<div class="wb-settings-sec"><h3>数据概况</h3><div class="wb-stats" id="wbDataStats"></div></div>' +
    '<div class="wb-settings-sec"><h3>偏好</h3>' +
      '<label class="wb-switch"><input type="checkbox" id="wbAutoBreak" checked /><span>创作结束后自动开始休息</span></label>' +
      '<label class="wb-switch"><input type="checkbox" id="wbAutoFocus" /><span>休息结束后自动开始创作</span></label>' +
    '</div>' +
    '<div class="wb-settings-sec"><h3>数据</h3>' +
      '<div class="wb-settings-actions">' +
        '<button type="button" class="wb-btn wb-btn-ghost" data-action="export">' + ICON.download + '<span>导出 JSON</span></button>' +
        '<label class="wb-btn wb-btn-ghost wb-file">' + ICON.upload + '<span>导入 JSON</span>' +
          '<input type="file" id="wbImport" accept="application/json,.json" hidden /></label>' +
      '</div>' +
      '<div class="wb-settings-actions">' +
        '<button type="button" class="wb-btn wb-btn-ghost" data-action="clear-focus">清空专注记录</button>' +
        '<button type="button" class="wb-btn wb-btn-danger" data-action="clear-all">清空工作台数据</button>' +
      '</div>' +
      '<p class="wb-hint">任务、情绪记录与专注记录存在 <code>lumina:data</code>；笔记与偏好分开存放。房间的陈设与光景不受影响。</p>' +
    '</div>';

  const mods = {
    todo: { node: todoNode, home: todoBody, title: '待办事项', kicker: 'TO-DO LIST' },
    notes: { node: notesNode, home: notesBody, title: '笔记', kicker: 'NOTES' },
    planner: { node: plannerNode, home: holder, title: '规划师', kicker: 'PLANNER · BY DUE DATE' },
    journal: { node: journalNode, home: holder, title: '情绪记录', kicker: 'MOOD JOURNAL' },
    focus: { node: focusNode, home: holder, title: '专注', kicker: 'FOCUS · POMODORO' },
    settings: { node: settingsNode, home: holder, title: '设置', kicker: 'SETTINGS · LOCAL ONLY' }
  };

  mods.todo.home.appendChild(todoNode);
  mods.notes.home.appendChild(notesNode);
  holder.appendChild(plannerNode);
  holder.appendChild(journalNode);
  holder.appendChild(focusNode);
  holder.appendChild(settingsNode);

  /* ———————————————————— 时钟 ———————————————————— */
  function greet(hour) {
    if (hour >= 5 && hour < 11) return '早上好，窗边的光刚醒';
    if (hour >= 11 && hour < 14) return '中午了，先把水烧上';
    if (hour >= 14 && hour < 18) return '下午好，慢慢来';
    if (hour >= 18 && hour < 23) return '晚上好，窗外已经亮灯';
    return '夜深了，留一盏小灯';
  }

  const els = {
    date: clockNode.querySelector('#wbDate'),
    time: clockNode.querySelector('#wbTime'),
    sec: clockNode.querySelector('#wbSec'),
    greet: clockNode.querySelector('#wbGreet'),
    ring: pomoNode.querySelector('#wbRingProg'),
    levelNum: pomoNode.querySelector('#wbLevelNum'),
    levelFill: pomoNode.querySelector('#wbLevelFill'),
    level: pomoNode.querySelector('#wbLevel'),
    cycle: pomoNode.querySelector('#wbCycle'),
    focusMin: pomoNode.querySelector('#wbFocusMin'),
    breakMin: pomoNode.querySelector('#wbBreakMin'),
    pomoTime: pomoNode.querySelector('#wbPomoTime'),
    pomoPlay: pomoNode.querySelector('#wbPomoPlay'),
    pomoFoot: pomoNode.querySelector('#wbPomoFoot'),
    sheetTitle: sheet.querySelector('#wbSheetTitle'),
    sheetKicker: sheet.querySelector('#wbSheetKicker'),
    sheetClose: sheet.querySelector('.wb-sheet-close')
  };

  function tickClock() {
    const d = new Date();
    els.date.textContent = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' +
      String(d.getDate()).padStart(2, '0') + ' ' + WEEK_CN[d.getDay()];
    els.time.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    els.sec.textContent = ':' + String(d.getSeconds()).padStart(2, '0');
    els.greet.textContent = greet(d.getHours());
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ———————————————————— 番茄钟 ———————————————————— */
  function phaseLabel() {
    return state.phase === 'focus' ? '创作时间' : state.phase === 'long' ? '长休息' : '休息时间';
  }

  function phaseMinutes(phase) {
    const p = store.prefs;
    return phase === 'focus' ? p.focusMin : phase === 'long' ? p.longBreakMin : p.breakMin;
  }

  function setPhase(phase, opts) {
    opts = opts || {};
    state.phase = phase;
    state.timer = C.createTimer(phaseMinutes(phase));
    if (opts.auto) state.timer = C.timerStart(state.timer, Date.now());
    pomoNode.classList.toggle('is-break', phase !== 'focus');
    renderPomodoro();
    renderFocusPanel();
    if (opts.announce) {
      toast(opts.announce);
    }
  }

  function toggleTimer() {
    const status = state.timer.status;
    if (status === 'running') {
      state.timer = C.timerPause(state.timer, Date.now());
    } else if (status === 'done') {
      state.timer = C.timerReset(state.timer);
      state.timer = C.timerStart(state.timer, Date.now());
    } else {
      if (state.timer.remainingSec <= 0) state.timer = C.timerReset(state.timer);
      state.timer = C.timerStart(state.timer, Date.now());
    }
    renderPomodoro();
    renderFocusPanel();
  }

  function resetTimer() {
    state.timer = C.timerReset(state.timer);
    renderPomodoro();
    renderFocusPanel();
  }

  function finishPhase(manual) {
    if (state.phase === 'focus') {
      if (!manual) {
        store.addFocusSession(state.timer.durationSec);
        const finished = store.prefs.cycle;
        const long = finished % 4 === 0;
        store.setPrefs({ cycle: finished + 1 });
        chime([84, 88, 91, 96]);
        toast('一个番茄完成了 · ' + (long ? '长休息 15 分钟' : '休息 ' + store.prefs.breakMin + ' 分钟'), 3400);
        setPhase(long ? 'long' : 'break', { auto: store.prefs.autoStartBreak });
      } else {
        setPhase('focus', { auto: false });
      }
    } else {
      if (state.phase === 'break' || state.phase === 'long') {
        chime([79, 84, 88]);
        if (!manual) toast('休息结束 · 回来继续', 2600);
      }
      const auto = !manual && store.prefs.autoStartFocus;
      setPhase('focus', { auto });
    }
    renderPomodoro();
    renderFocusPanel();
    renderTodo();
    renderSettings();
  }

  function onTimerDone() {
    finishPhase(false);
  }

  function tickTimer() {
    if (state.timer.status !== 'running') return;
    const next = C.timerTick(state.timer, Date.now());
    if (next === state.timer) return;
    state.timer = next;
    if (next.status === 'done') {
      onTimerDone();
    } else {
      renderPomodoroTime();
      renderFocusPanelTime();
    }
  }

  function setMinutes(kind, dir) {
    if (state.timer.status === 'running' || state.timer.status === 'paused') {
      toast('先把这一轮走完，或者按重置再调时长');
      return;
    }
    const prefs = store.prefs;
    if (kind === 'focus') {
      const value = C.clampMinutes(prefs.focusMin + dir * 5);
      store.setPrefs({ focusMin: value });
      if (state.phase === 'focus') state.timer = C.createTimer(value);
    } else {
      const value = C.clampMinutes(prefs.breakMin + dir, 1);
      store.setPrefs({ breakMin: value });
      if (state.phase === 'break') state.timer = C.createTimer(value);
    }
    renderPomodoro();
    renderFocusPanel();
  }

  function renderPomodoro() {
    const prefs = store.prefs;
    const info = store.getLevel();
    els.levelNum.textContent = info.level;
    els.levelFill.style.width = (info.progress * 100).toFixed(1) + '%';
    els.level.title = '再完成 ' + info.remaining + ' 个番茄升到 ' + (info.level + 1) + ' 级';
    els.cycle.textContent = prefs.cycle;
    els.focusMin.textContent = prefs.focusMin;
    els.breakMin.textContent = prefs.breakMin;
    els.pomoPlay.innerHTML = state.timer.status === 'running' ? ICON.pause : ICON.play;
    els.pomoPlay.setAttribute('aria-label', state.timer.status === 'running' ? '暂停' : '开始专注');
    pomoNode.classList.toggle('is-running', state.timer.status === 'running');
    renderPomodoroTime();
    const stats = store.getFocusStats();
    els.pomoFoot.innerHTML = '今日 <b>' + stats.todayCount + '</b> 个番茄 · 再完成 <b>' + info.remaining + '</b> 个升级';
  }

  function renderPomodoroTime() {
    els.pomoTime.textContent = C.formatClock(state.timer.remainingSec);
    const ratio = state.timer.durationSec > 0 ? state.timer.remainingSec / state.timer.durationSec : 0;
    els.ring.style.strokeDashoffset = String(RING_C * (1 - ratio));
  }

  pomoNode.querySelector('#wbPomoPlay').addEventListener('click', toggleTimer);
  pomoNode.querySelectorAll('[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => setMinutes(btn.dataset.step, Number(btn.dataset.dir)));
  });

  /* ———————————————————— 待办 ———————————————————— */
  const todoEls = {
    list: todoNode.querySelector('#wbTaskList'),
    foot: todoNode.querySelector('#wbTodoFoot'),
    open: todoNode.querySelector('#wbOpenCount'),
    total: todoNode.querySelector('#wbTotalCount'),
    editor: todoNode.querySelector('#wbEditor'),
    save: todoNode.querySelector('#wbEditorSave'),
    search: todoNode.querySelector('#wbTaskSearch'),
    seg: todoNode.querySelectorAll('[data-filter]')
  };

  function setEditor(task) {
    if (!task) {
      state.todoEditor = null;
      todoEls.editor.hidden = true;
      todoEls.editor.reset();
      todoEls.editor.dataset.id = '';
      todoEls.save.textContent = '保存';
      todoNode.querySelectorAll('[data-prio]').forEach((b) => b.classList.remove('is-on'));
      return;
    }
    state.todoEditor = task.id;
    todoEls.editor.hidden = false;
    todoEls.editor.dataset.id = task.id;
    todoEls.editor.elements.title.value = task.title;
    todoEls.editor.elements.description.value = task.description || '';
    todoEls.editor.elements.dueDate.value = task.dueDate || '';
    todoEls.editor.elements.dueTime.value = task.dueTime || '';
    todoNode.querySelectorAll('[data-prio]').forEach((b) => {
      b.classList.toggle('is-on', Number(b.dataset.prio) === (task.priority || 0));
    });
    todoEls.save.textContent = '保存修改';
    setTimeout(() => todoEls.editor.elements.title.focus(), 40);
    todoEls.editor.scrollIntoView({ block: 'nearest' });
  }

  function openNewTask(preset) {
    setEditor({ id: '', title: '', description: '', dueDate: '', dueTime: '', priority: 0 });
    state.todoEditor = 'new';
    todoEls.editor.dataset.id = '';
    if (preset && preset.dueDate) todoEls.editor.elements.dueDate.value = preset.dueDate;
    todoEls.save.textContent = '添加';
  }

  function taskRow(task) {
    const overdue = C.isTaskOverdue(task);
    const due = C.formatDue(task);
    const prio = task.priority || 0;
    return (
      '<div class="wb-task' + (task.done ? ' is-done' : '') + '" data-id="' + esc(task.id) + '" role="button" tabindex="0">' +
        '<button type="button" class="wb-check' + (task.done ? ' is-on' : '') + '" data-action="toggle" aria-label="' +
          (task.done ? '标记为未完成' : '标记为完成') + '" aria-pressed="' + task.done + '">' + ICON.check + '</button>' +
        '<div class="wb-task-main">' +
          '<p class="wb-task-title">' + esc(task.title) + '</p>' +
          '<div class="wb-task-meta">' +
            (prio ? '<span class="wb-prio-dot p' + prio + '">' + C.PRIORITY_LABEL[prio] + '</span>' : '') +
            (due ? '<span class="wb-due' + (overdue ? ' is-overdue' : '') + '">' + esc(due) + '</span>' : '') +
            (task.description ? '<span class="wb-has-desc">有说明</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="wb-task-actions">' +
          '<button type="button" class="wb-icon-btn" data-action="edit" aria-label="编辑" title="编辑">' + ICON.pencil + '</button>' +
          '<button type="button" class="wb-icon-btn" data-action="del" aria-label="删除" title="删除">' + ICON.trash + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderTodo() {
    const tasks = store.tasks;
    const counts = C.countTasks(tasks);
    todoEls.open.textContent = counts.open;
    todoEls.total.textContent = counts.total;
    todoEls.seg.forEach((b) => b.classList.toggle('is-on', b.dataset.filter === state.todoFilter));

    let list = C.filterTasks(tasks, state.todoFilter, state.todoQuery);
    list = C.sortTasks(list);
    if (!list.length) {
      const msg = state.todoQuery
        ? '没有找到匹配的任务'
        : state.todoFilter === 'done' ? '还没有完成的任务' : '今天的清单是空的，慢慢来';
      todoEls.list.innerHTML = '<p class="wb-empty">' + msg + '</p>';
    } else {
      todoEls.list.innerHTML = list.map(taskRow).join('');
    }

    const today = todayStr();
    let todayDone = 0;
    for (const t of tasks) {
      if (t.done && t.completedAt && C.toDateString(new Date(t.completedAt)) === today) todayDone += 1;
    }
    todoEls.foot.innerHTML =
      '<div class="wb-task-stats"><span>任务统计</span><b>' + counts.total + '</b>' +
      '<i>完成</i><b>' + counts.done + '</b><i>未完成</i><b>' + counts.open + '</b></div>' +
      '<span class="wb-today-done">今天完成 ' + todayDone + ' 件</span>';
  }

  todoNode.addEventListener('click', async (e) => {
    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
      state.todoFilter = filterBtn.dataset.filter;
      renderTodo();
      return;
    }
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === 'new-task') {
        openNewTask();
        return;
      }
      if (action === 'cancel-edit') {
        setEditor(null);
        return;
      }
      const row = actionBtn.closest('.wb-task');
      const id = row && row.dataset.id;
      if (action === 'toggle' && id) {
        const task = store.tasks.find((t) => t.id === id);
        if (task && !task.done) {
          const ok = await askConfirm({
            title: '完成这件事？',
            body: '「' + task.title.slice(0, 40) + '」会移到已完成列表，你随时可以取消。',
            okText: '完成了'
          });
          if (!ok) return;
        }
        store.toggleTask(id);
        renderTodo();
        renderPlanner();
        return;
      }
      if (action === 'del' && id) {
        const task = store.tasks.find((t) => t.id === id);
        if (!task) return;
        const ok = await askConfirm({
          title: '删除这条任务？',
          body: '「' + task.title.slice(0, 40) + '」删除后无法恢复。',
          okText: '删除',
          danger: true
        });
        if (!ok) return;
        store.deleteTask(id);
        if (state.todoEditor === id) setEditor(null);
        renderTodo();
        renderPlanner();
        return;
      }
      if (action === 'edit' && id) {
        const task = store.tasks.find((t) => t.id === id);
        if (task) setEditor(task);
        return;
      }
    }
    const row = e.target.closest('.wb-task');
    if (row && row.dataset.id) {
      const task = store.tasks.find((t) => t.id === row.dataset.id);
      if (task) setEditor(task);
    }
  });

  todoNode.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('.wb-task');
    if (!row || e.target !== row) return;
    e.preventDefault();
    const task = store.tasks.find((t) => t.id === row.dataset.id);
    if (task) setEditor(task);
  });

  todoNode.querySelectorAll('[data-prio]').forEach((btn) => {
    btn.addEventListener('click', () => {
      todoNode.querySelectorAll('[data-prio]').forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
    });
  });

  todoEls.search.addEventListener('input', () => {
    state.todoQuery = todoEls.search.value;
    renderTodo();
  });

  todoEls.editor.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = todoEls.editor;
    const title = form.elements.title.value.trim();
    if (!title) {
      form.elements.title.focus();
      toast('先写一句要做什么');
      return;
    }
    const priorityBtn = todoNode.querySelector('[data-prio].is-on');
    const priority = priorityBtn ? Number(priorityBtn.dataset.prio) : 0;
    const draft = {
      title,
      description: form.elements.description.value,
      dueDate: form.elements.dueDate.value || null,
      dueTime: form.elements.dueTime.value || null,
      priority: priority || null
    };
    const editingId = state.todoEditor;
    if (editingId && editingId !== 'new') {
      store.updateTask(editingId, {
        title: draft.title,
        description: draft.description,
        priority: priority || null,
        dueDate: draft.dueDate,
        dueTime: draft.dueTime
      });
    } else {
      store.addTask(draft);
    }
    setEditor(null);
    renderTodo();
    renderPlanner();
    toast(editingId && editingId !== 'new' ? '任务已更新' : '新任务已经放上桌面', 2000);
  });

  /* ———————————————————— 笔记 ———————————————————— */
  const noteEls = {
    list: notesNode.querySelector('#wbPageList'),
    title: notesNode.querySelector('#wbNoteTitle'),
    body: notesNode.querySelector('#wbNoteBody'),
    status: notesNode.querySelector('#wbNoteStatus'),
    count: notesNode.querySelector('#wbNoteCount')
  };

  let noteSaveTimer = 0;
  let noteDraft = { id: null, title: '', body: '' };

  function activePage() {
    return store.notes.pages.find((p) => p.id === store.notes.activeId) || store.notes.pages[0];
  }

  function flushNotes() {
    if (!noteDraft.id) return;
    clearTimeout(noteSaveTimer);
    const page = store.notes.pages.find((p) => p.id === noteDraft.id);
    if (!page) return;
    if (page.title === noteDraft.title && page.body === noteDraft.body) return;
    store.updatePage(noteDraft.id, { title: noteDraft.title || '未命名页面', body: noteDraft.body });
    noteEls.status.textContent = '已保存 · ' + nowHM();
    renderPageList();
    renderSettings();
  }

  function loadPage(page) {
    flushNotes();
    store.setActivePage(page.id);
    noteDraft = { id: page.id, title: page.title, body: page.body };
    noteEls.title.value = page.title;
    noteEls.body.value = page.body;
    noteEls.count.textContent = Array.from(page.body).length + ' 字';
    noteEls.status.textContent = '已保存';
    renderPageList();
  }

  function renderPageList() {
    const pages = store.notes.pages.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    noteEls.list.innerHTML = pages
      .map((p) => {
        const first = (p.body || '').trim().split(/\n/)[0] || '空白页';
        return (
          '<button type="button" class="wb-page' + (p.id === store.notes.activeId ? ' is-on' : '') + '" data-page="' + esc(p.id) + '">' +
            '<span class="wb-page-title">' + esc(p.title || '未命名页面') + '</span>' +
            '<span class="wb-page-sub">' + esc(first.slice(0, 18)) + '</span>' +
          '</button>'
        );
      })
      .join('');
  }

  function scheduleNoteSave() {
    noteDraft.title = noteEls.title.value.slice(0, 40);
    noteDraft.body = noteEls.body.value;
    noteEls.count.textContent = Array.from(noteDraft.body).length + ' 字';
    noteEls.status.textContent = '正在写…';
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(flushNotes, 420);
  }

  noteEls.title.addEventListener('input', scheduleNoteSave);
  noteEls.body.addEventListener('input', scheduleNoteSave);
  noteEls.title.addEventListener('blur', flushNotes);
  noteEls.body.addEventListener('blur', flushNotes);

  notesNode.addEventListener('click', async (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      const page = store.notes.pages.find((p) => p.id === pageBtn.dataset.page);
      if (page) loadPage(page);
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'page-new') {
      flushNotes();
      const page = store.addPage();
      loadPage(page);
      setTimeout(() => noteEls.title.select(), 40);
      return;
    }
    if (btn.dataset.action === 'page-del') {
      const page = activePage();
      if (!page) return;
      if (store.notes.pages.length <= 1) {
        toast('至少留一页，窗边总得有张纸');
        return;
      }
      const ok = await askConfirm({
        title: '撕掉这一页？',
        body: '「' + (page.title || '未命名页面').slice(0, 24) + '」删除后无法恢复。',
        okText: '撕掉',
        danger: true
      });
      if (!ok) return;
      noteDraft.id = null;
      store.deletePage(page.id);
      loadPage(activePage());
      renderSettings();
    }
  });

  /* ———————————————————— 规划师 ———————————————————— */
  const planEls = {
    title: plannerNode.querySelector('#wbPlanTitle'),
    sub: plannerNode.querySelector('#wbPlanSub'),
    days: plannerNode.querySelector('#wbPlanDays')
  };

  function renderPlanner() {
    const { year, month } = state.planner;
    planEls.title.textContent = C.monthTitle(year, month);
    const days = C.monthDays(year, month);
    planEls.sub.textContent = days.length + ' 天 · 按截止日期铺开';
    const scroll = planEls.days.scrollLeft;
    planEls.days.innerHTML = days
      .map((day) => {
        const tasks = C.tasksForDate(store.tasks, day.date);
        const chips = tasks
          .map((t) => {
            const overdue = C.isTaskOverdue(t);
            return (
              '<button type="button" class="wb-chip' + (t.done ? ' is-done' : '') + (overdue ? ' is-overdue' : '') +
                '" data-task="' + esc(t.id) + '" title="' + esc(t.title) + '">' +
                '<i></i><span>' + esc((t.dueTime ? t.dueTime + ' ' : '') + t.title) + '</span>' +
              '</button>'
            );
          })
          .join('');
        return (
          '<div class="wb-day' + (day.isToday ? ' is-today' : '') + '" data-date="' + day.date + '">' +
            '<header><b>' + day.day + '</b><span>' + day.weekday + '</span>' + (day.isToday ? '<em>今天</em>' : '') + '</header>' +
            '<div class="wb-day-tasks">' + (chips || '<span class="wb-day-empty">空</span>') + '</div>' +
            '<button type="button" class="wb-day-add" data-day-add="' + day.date + '" aria-label="在 ' + day.date + ' 加任务">' + ICON.plus + '</button>' +
            '<input class="wb-day-input" type="text" maxlength="120" placeholder="新任务，回车确认" data-day-input="' + day.date + '" hidden />' +
          '</div>'
        );
      })
      .join('');
    planEls.days.scrollLeft = scroll;
  }

  plannerNode.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const action = btn.dataset.action;
      if (action === 'plan-prev' || action === 'plan-next') {
        let { year, month } = state.planner;
        month += action === 'plan-next' ? 1 : -1;
        if (month > 12) { month = 1; year += 1; }
        if (month < 1) { month = 12; year -= 1; }
        state.planner = { year, month };
        renderPlanner();
        planEls.days.scrollLeft = 0;
        return;
      }
      if (action === 'plan-today') {
        const d = new Date();
        state.planner = { year: d.getFullYear(), month: d.getMonth() + 1 };
        renderPlanner();
        const today = planEls.days.querySelector('.wb-day.is-today');
        if (today) today.scrollIntoView({ inline: 'center', block: 'nearest' });
        return;
      }
    }
    const addBtn = e.target.closest('[data-day-add]');
    if (addBtn) {
      const day = addBtn.closest('.wb-day');
      const input = day.querySelector('[data-day-input]');
      input.hidden = false;
      input.focus();
      return;
    }
    const chip = e.target.closest('[data-task]');
    if (chip) {
      const task = store.tasks.find((t) => t.id === chip.dataset.task);
      if (!task) return;
      if (!task.done) {
        const ok = await askConfirm({
          title: '完成这件事？',
          body: '「' + task.title.slice(0, 40) + '」会移到已完成列表。',
          okText: '完成了'
        });
        if (!ok) return;
      }
      store.toggleTask(task.id);
      renderTodo();
      renderPlanner();
    }
  });

  plannerNode.addEventListener('keydown', (e) => {
    const input = e.target.closest('[data-day-input]');
    if (!input) return;
    if (e.key === 'Escape') {
      input.value = '';
      input.hidden = true;
      return;
    }
    if (e.key !== 'Enter') return;
    const title = input.value.trim();
    if (!title) return;
    store.addTask({ title, dueDate: input.dataset.dayInput });
    input.value = '';
    input.hidden = true;
    renderTodo();
    renderPlanner();
    toast('任务已经放到 ' + input.dataset.dayInput, 1800);
  });

  /* ———————————————————— 情绪记录 ———————————————————— */
  const journalEls = {
    emotions: journalNode.querySelector('#wbEmotions'),
    custom: journalNode.querySelector('#wbEmotionCustom'),
    score: journalNode.querySelector('#wbScore'),
    scorePreview: journalNode.querySelector('#wbScorePreview'),
    text: journalNode.querySelector('#wbJournalText'),
    count: journalNode.querySelector('#wbJournalCount'),
    save: journalNode.querySelector('#wbJournalSave'),
    cancel: journalNode.querySelector('#wbJournalCancel'),
    search: journalNode.querySelector('#wbJournalSearch'),
    pin: journalNode.querySelector('#wbJournalPin'),
    list: journalNode.querySelector('#wbJournalList')
  };

  journalEls.emotions.innerHTML = C.EMOTIONS
    .map((word) => '<button type="button" data-emotion="' + word + '">' + word + '</button>')
    .join('');
  journalEls.pin.value = todayStr();

  function selectedEmotion() {
    const custom = journalEls.custom.value.trim();
    if (custom) return custom.slice(0, 16);
    const active = journalEls.emotions.querySelector('.is-on');
    return active ? active.dataset.emotion : '';
  }

  function refreshJournalForm() {
    journalEls.emotions.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('is-on', !journalEls.custom.value.trim() && b.dataset.emotion === state.journal.emotion);
    });
    const score = C.clampScore(journalEls.score.value);
    journalEls.scorePreview.textContent = C.formatScore(score);
    journalEls.count.textContent = Array.from(journalEls.text.value).length + ' / 500';
    journalEls.save.textContent = state.journal.editingId ? '保存修改' : '记下这一刻';
    journalEls.cancel.hidden = !state.journal.editingId;
  }

  journalEls.emotions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-emotion]');
    if (!btn) return;
    state.journal.emotion = btn.dataset.emotion;
    journalEls.emotions.querySelectorAll('button').forEach((b) => b.classList.remove('is-on'));
    btn.classList.add('is-on');
    journalEls.custom.value = '';
    refreshJournalForm();
  });

  journalEls.custom.addEventListener('input', refreshJournalForm);
  journalEls.score.addEventListener('input', refreshJournalForm);
  journalEls.text.addEventListener('input', refreshJournalForm);

  journalNode.querySelector('#wbJournalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const emotion = selectedEmotion();
    const content = journalEls.text.value.trim();
    if (!emotion) {
      toast('先选一个情绪词，或者自己写一个');
      journalEls.custom.focus();
      return;
    }
    if (!content) {
      toast('再写一句发生了什么');
      journalEls.text.focus();
      return;
    }
    const input = { emotion, content, score: C.clampScore(journalEls.score.value) };
    if (state.journal.editingId) {
      store.updateMoodNote(state.journal.editingId, input);
      toast('这条记录已经改好', 2000);
    } else {
      store.addMoodNote(input);
      toast('这一刻已经记下', 2000);
    }
    resetJournalForm();
    renderJournal();
    renderSettings();
  });

  function resetJournalForm() {
    state.journal.editingId = null;
    state.journal.emotion = '期待';
    journalEls.custom.value = '';
    journalEls.text.value = '';
    journalEls.score.value = '0';
    journalEls.emotions.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b.dataset.emotion === '期待'));
    refreshJournalForm();
  }

  function renderJournal() {
    let notes = C.filterMoodNotes(store.moodNotes, journalEls.search.value);
    notes = C.arrangeMoodNotes(notes, journalEls.pin.value);
    if (!notes.length) {
      journalEls.list.innerHTML = '<p class="wb-empty">当前还没有情绪记录</p>';
      return;
    }
    journalEls.list.innerHTML = notes
      .map((note) => {
        const pos = note.score > 0;
        const zero = note.score === 0;
        return (
          '<article class="wb-note" data-note="' + esc(note.id) + '">' +
            '<header>' +
              '<span class="wb-emotion-tag">' + esc(note.emotion) + '</span>' +
              '<span class="wb-score' + (pos ? ' is-pos' : zero ? '' : ' is-neg') + '">' + C.formatScore(note.score) + '</span>' +
              '<time>' + esc(C.formatDateTime(note.createdAt)) + '</time>' +
            '</header>' +
            '<p class="wb-note-text">' + esc(note.content) + '</p>' +
            '<footer>' +
              (note.updatedAt ? '<span class="wb-edited">再次编辑于 ' + esc(C.formatDateTime(note.updatedAt)) + '</span>' : '<span></span>') +
              '<span class="wb-note-actions">' +
                '<button type="button" class="wb-icon-btn" data-action="journal-edit" aria-label="编辑这条">' + ICON.pencil + '</button>' +
                '<button type="button" class="wb-icon-btn" data-action="journal-del" aria-label="删除这条">' + ICON.trash + '</button>' +
              '</span>' +
            '</footer>' +
          '</article>'
        );
      })
      .join('');
  }

  journalEls.search.addEventListener('input', renderJournal);
  journalEls.pin.addEventListener('change', renderJournal);

  journalNode.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('[data-note]');
    const id = card && card.dataset.note;
    const note = id ? store.moodNotes.find((n) => n.id === id) : null;
    if (!note) return;
    if (btn.dataset.action === 'journal-edit') {
      state.journal.editingId = note.id;
      state.journal.emotion = note.emotion;
      journalEls.custom.value = C.EMOTIONS.includes(note.emotion) ? '' : note.emotion;
      journalEls.score.value = String(note.score);
      journalEls.text.value = note.content;
      refreshJournalForm();
      journalNode.querySelector('#wbJournalForm').scrollIntoView({ block: 'nearest' });
      journalEls.text.focus();
      return;
    }
    if (btn.dataset.action === 'journal-del') {
      const ok = await askConfirm({
        title: '删掉这条记录？',
        body: '「' + note.emotion + ' · ' + note.content.slice(0, 20) + '」删除后无法恢复。',
        okText: '删除',
        danger: true
      });
      if (!ok) return;
      store.deleteMoodNote(note.id);
      if (state.journal.editingId === note.id) resetJournalForm();
      renderJournal();
      renderSettings();
    }
  });

  journalNode.querySelector('#wbJournalCancel').addEventListener('click', resetJournalForm);

  /* ———————————————————— 专注面板 ———————————————————— */
  const focusEls = {
    phase: focusNode.querySelector('#wbFocusPhase'),
    time: focusNode.querySelector('#wbFocusTime'),
    sub: focusNode.querySelector('#wbFocusSub'),
    toggle: focusNode.querySelector('#wbFocusToggle'),
    stats: focusNode.querySelector('#wbFocusStats'),
    customFocus: focusNode.querySelector('#wbFocusCustomFocus'),
    customBreak: focusNode.querySelector('#wbFocusCustomBreak'),
    customLong: focusNode.querySelector('#wbFocusCustomLong')
  };

  function renderFocusPanel() {
    const running = state.timer.status === 'running';
    focusEls.phase.textContent = phaseLabel();
    focusEls.time.textContent = C.formatClock(state.timer.remainingSec);
    focusEls.toggle.textContent = running ? '暂停' : state.timer.status === 'paused' ? '继续' : '开始';
    const prefs = store.prefs;
    const long = prefs.cycle % 4 === 0;
    focusEls.sub.textContent = state.phase === 'focus'
      ? '第 ' + prefs.cycle + ' 个循环 · 休息 ' + prefs.breakMin + ' 分钟'
      : '这一轮休息结束，回到第 ' + prefs.cycle + ' 个循环';
    focusNode.querySelectorAll('[data-preset]').forEach((b) => {
      b.classList.toggle('is-on', Number(b.dataset.preset) === prefs.focusMin);
    });
    [[focusEls.customFocus, prefs.focusMin], [focusEls.customBreak, prefs.breakMin], [focusEls.customLong, prefs.longBreakMin]]
      .forEach(([input, value]) => {
        if (input && document.activeElement !== input) input.value = value;
      });
    const stats = store.getFocusStats();
    const level = store.getLevel();
    focusEls.stats.innerHTML =
      '<div class="wb-stat"><span>今日</span><b>' + stats.todayCount + '</b><i>个番茄 · ' + C.formatMinutes(stats.todaySeconds) + '</i></div>' +
      '<div class="wb-stat"><span>总计</span><b>' + stats.totalCount + '</b><i>个番茄 · ' + C.formatMinutes(stats.totalSeconds) + '</i></div>' +
      '<div class="wb-stat"><span>等级</span><b>' + level.level + '</b><i>再 ' + level.remaining + ' 个升级</i></div>' +
      (long ? '<p class="wb-hint">下一轮之后是长休息 ' + prefs.longBreakMin + ' 分钟。</p>' : '');
  }

  function renderFocusPanelTime() {
    focusEls.time.textContent = C.formatClock(state.timer.remainingSec);
    focusEls.toggle.textContent = state.timer.status === 'running' ? '暂停' : '继续';
  }

  focusNode.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    const preset = e.target.closest('[data-preset]');
    if (preset) {
      setMinutesTo(Number(preset.dataset.preset));
      return;
    }
    if (!btn) return;
    if (btn.dataset.action === 'focus-toggle') toggleTimer();
    if (btn.dataset.action === 'focus-reset') resetTimer();
    if (btn.dataset.action === 'focus-skip') {
      finishPhase(true);
      toast(state.phase === 'focus' ? '跳过这一轮，回到创作' : '休息先到这里', 2000);
    }
    if (btn.dataset.action === 'focus-apply') applyCustomMinutes();
  });

  focusNode.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!e.target.closest('.wb-focus-custom input')) return;
    e.preventDefault();
    applyCustomMinutes();
  });

  function setMinutesTo(minutes) {
    if (state.timer.status === 'running' || state.timer.status === 'paused') {
      toast('先把这一轮走完，或者按重置');
      return;
    }
    store.setPrefs({ focusMin: C.clampMinutes(minutes) });
    if (state.phase === 'focus') state.timer = C.createTimer(store.prefs.focusMin);
    renderPomodoro();
    renderFocusPanel();
  }

  function applyCustomMinutes() {
    if (state.timer.status === 'running' || state.timer.status === 'paused') {
      toast('先把这一轮走完，或者按重置再调时长');
      return;
    }
    const read = (input, fallback) => {
      const raw = String((input && input.value) || '').trim();
      if (!raw) return fallback;
      const n = Number(raw);
      return Number.isFinite(n) ? Math.round(n) : NaN;
    };
    const prefs = store.prefs;
    const focus = read(focusEls.customFocus, prefs.focusMin);
    const brk = read(focusEls.customBreak, prefs.breakMin);
    const long = read(focusEls.customLong, prefs.longBreakMin);
    if ([focus, brk, long].some((n) => !Number.isFinite(n) || n < 1 || n > 480)) {
      toast('三个时长都要在 1–480 分钟之间');
      return;
    }
    store.setPrefs({ focusMin: focus, breakMin: brk, longBreakMin: long });
    if (state.phase === 'focus') state.timer = C.createTimer(focus);
    else if (state.phase === 'break') state.timer = C.createTimer(brk);
    else if (state.phase === 'long') state.timer = C.createTimer(long);
    renderPomodoro();
    renderFocusPanel();
    toast('时长已应用 · 创作 ' + focus + ' 分 · 休息 ' + brk + ' 分 · 长休 ' + long + ' 分', 2800);
  }

  /* ———————————————————— 设置 ———————————————————— */
  const settingsEls = {
    stats: settingsNode.querySelector('#wbDataStats'),
    autoBreak: settingsNode.querySelector('#wbAutoBreak'),
    autoFocus: settingsNode.querySelector('#wbAutoFocus'),
    import: settingsNode.querySelector('#wbImport')
  };

  function renderSettings() {
    const stats = store.getFocusStats();
    const counts = C.countTasks(store.tasks);
    settingsEls.stats.innerHTML =
      '<div class="wb-stat"><span>任务</span><b>' + counts.total + '</b><i>完成 ' + counts.done + '</i></div>' +
      '<div class="wb-stat"><span>番茄</span><b>' + stats.totalCount + '</b><i>共 ' + C.formatMinutes(stats.totalSeconds) + '</i></div>' +
      '<div class="wb-stat"><span>情绪记录</span><b>' + store.moodNotes.length + '</b><i>条</i></div>' +
      '<div class="wb-stat"><span>笔记</span><b>' + store.notes.pages.length + '</b><i>页</i></div>';
    settingsEls.autoBreak.checked = !!store.prefs.autoStartBreak;
    settingsEls.autoFocus.checked = !!store.prefs.autoStartFocus;
  }

  settingsEls.autoBreak.addEventListener('change', () => store.setPrefs({ autoStartBreak: settingsEls.autoBreak.checked }));
  settingsEls.autoFocus.addEventListener('change', () => store.setPrefs({ autoStartFocus: settingsEls.autoFocus.checked }));

  settingsNode.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'export') {
      const out = store.exportJSON();
      const blob = new Blob([out.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = out.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('已经导出 ' + out.filename, 2400);
      return;
    }
    if (action === 'clear-focus') {
      if (!store.getFocusStats().totalCount) {
        toast('还没有专注记录');
        return;
      }
      const ok = await askConfirm({
        title: '清空专注记录？',
        body: '番茄统计和等级会重新开始；任务、情绪记录与笔记不受影响。',
        okText: '清空',
        danger: true
      });
      if (!ok) return;
      store.clearFocusSessions();
      store.setPrefs({ cycle: 1 });
      resetTimer();
      renderPomodoro();
      renderFocusPanel();
      renderSettings();
      toast('专注记录已经清空', 2200);
      return;
    }
    if (action === 'clear-all') {
      const ok = await askConfirm({
        title: '清空工作台全部数据？',
        body: '任务、笔记、情绪记录、番茄与偏好都会删除，且无法恢复。窗畔的房间与光景不受影响。',
        okText: '全部清空',
        danger: true
      });
      if (!ok) return;
      store.clearAll();
      resetJournalForm();
      loadPage(activePage());
      setEditor(null);
      state.planner = (function () { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; })();
      resetTimer();
      renderAll();
      toast('工作台已经清空', 2400);
    }
  });

  settingsEls.import.addEventListener('change', async () => {
    const file = settingsEls.import.files && settingsEls.import.files[0];
    settingsEls.import.value = '';
    if (!file) return;
    const ok = await askConfirm({
      title: '导入并替换数据？',
      body: '当前任务、情绪记录、专注与笔记会被文件里的内容替换。',
      okText: '导入',
      danger: true
    });
    if (!ok) return;
    const text = await file.text();
    const result = store.importJSON(text);
    if (!result.ok) {
      await askConfirm({ title: '导入失败', body: result.error, okText: '知道了' });
      return;
    }
    loadPage(activePage());
    state.planner = (function () { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; })();
    resetTimer();
    renderAll();
    toast('数据已经导入', 2400);
  });

  /* ———————————————————— 渲染总装 ———————————————————— */
  function renderAll() {
    renderTodo();
    renderPageList();
    renderPlanner();
    renderJournal();
    renderPomodoro();
    renderFocusPanel();
    renderSettings();
    renderRail();
  }

  function renderRail() {
    railNode.querySelectorAll('[data-rail]').forEach((b) => {
      const key = b.dataset.rail;
      const on = key === 'todo' ? !todoWin.hidden && !todoWin.classList.contains('is-collapsed')
        : key === 'notes' ? !notesWin.hidden && !notesWin.classList.contains('is-collapsed')
        : state.sheet === key;
      b.classList.toggle('is-on', on);
    });
  }

  /* ———————————————————— 窗口与面板 ———————————————————— */
  function openSheet(key) {
    const mod = mods[key];
    if (!mod) return;
    state.sheet = key;
    els.sheetTitle.textContent = mod.title;
    els.sheetKicker.textContent = mod.kicker;
    while (sheetBody.firstChild) sheetBody.removeChild(sheetBody.firstChild);
    sheetBody.appendChild(mod.node);
    sheetTabs.innerHTML = railItems
      .map((it) => '<button type="button" data-tab="' + it.key + '"' + (it.key === key ? ' class="is-on"' : '') + '>' + it.label + '</button>')
      .join('');
    sheet.classList.add('open');
    document.body.classList.add('wb-sheet-open');
    renderRail();
    if (key === 'planner') {
      renderPlanner();
      const today = planEls.days.querySelector('.wb-day.is-today');
      if (today) today.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
    if (key === 'journal') renderJournal();
    if (key === 'focus') renderFocusPanel();
    if (key === 'settings') renderSettings();
  }

  function closeSheet() {
    if (!state.sheet) return;
    const key = state.sheet;
    const mod = mods[key];
    state.sheet = null;
    sheet.classList.remove('open');
    document.body.classList.remove('wb-sheet-open');
    if (mod && mod.node.parentNode === sheetBody) mod.home.appendChild(mod.node);
    while (sheetBody.firstChild) sheetBody.removeChild(sheetBody.firstChild);
    renderRail();
  }

  function openWorlds() {
    if (window.WB && WB.worlds && typeof WB.worlds.open === 'function') {
      WB.worlds.open();
      return;
    }
    toast('世界之门还没装好 · 请刷新页面', 2400);
  }

  sheetTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    if (btn.dataset.tab === 'worlds') {
      closeSheet();
      openWorlds();
      return;
    }
    openSheet(btn.dataset.tab);
  });
  sheet.querySelectorAll('[data-sheet="close"]').forEach((n) => n.addEventListener('click', closeSheet));

  let dragState = null;
  function makeDraggable(win, key) {
    const handle = win.querySelector('[data-handle]');
    const layout = readLayout();
    if (layout[key] && Number.isFinite(layout[key].x) && Number.isFinite(layout[key].y)) {
      placeWindow(win, layout[key].x, layout[key].y);
    }
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button')) return;
      const rect = win.getBoundingClientRect();
      dragState = { win, key, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      win.classList.add('is-dragging');
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragState || dragState.win !== win) return;
      const x = e.clientX - dragState.dx;
      const y = e.clientY - dragState.dy;
      placeWindow(win, x, y);
    });
    function endDrag() {
      if (!dragState || dragState.win !== win) return;
      win.classList.remove('is-dragging');
      const rect = win.getBoundingClientRect();
      const layout2 = readLayout();
      layout2[key] = { x: Math.round(rect.left), y: Math.round(rect.top) };
      writeLayout(layout2);
      dragState = null;
    }
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  function placeWindow(win, x, y) {
    const maxX = Math.max(8, window.innerWidth - win.offsetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - 80);
    win.style.left = Math.round(Math.max(8, Math.min(maxX, x))) + 'px';
    win.style.top = Math.round(Math.max(8, Math.min(maxY, y))) + 'px';
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  }

  makeDraggable(todoWin, 'todo');
  makeDraggable(notesWin, 'notes');

  [todoWin, notesWin].forEach((win) => {
    win.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-win]');
      if (!btn) return;
      if (btn.dataset.win === 'close') {
        win.hidden = true;
        win.classList.remove('is-collapsed');
      } else if (btn.dataset.win === 'collapse') {
        win.classList.toggle('is-collapsed');
      }
      renderRail();
    });
  });

  railNode.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rail]');
    if (!btn) return;
    const key = btn.dataset.rail;
    if (key === 'worlds') {
      if (state.sheet) closeSheet();
      openWorlds();
      return;
    }
    if (key === 'todo' || key === 'notes') {
      const win = key === 'todo' ? todoWin : notesWin;
      if (win.hidden) {
        win.hidden = false;
        win.classList.remove('is-collapsed');
      } else if (win.classList.contains('is-collapsed')) {
        win.classList.remove('is-collapsed');
      } else {
        win.hidden = true;
      }
      if (state.sheet === key) closeSheet();
      renderRail();
      return;
    }
    if (state.sheet === key) closeSheet();
    else openSheet(key);
  });

  fab.addEventListener('click', () => openSheet(state.mobileTab || 'todo'));

  sheetTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (btn && btn.dataset.tab !== 'worlds') state.mobileTab = btn.dataset.tab;
  });

  /* ———————————————————— 响应式 ———————————————————— */
  const mq = window.matchMedia('(max-width: 900px)');
  function syncMobile() {
    state.mobile = mq.matches;
    document.body.classList.toggle('wb-mobile', state.mobile);
    if (state.mobile && state.sheet) {
      sheet.classList.add('is-mobile');
    } else {
      sheet.classList.remove('is-mobile');
    }
    railNode.hidden = state.mobile;
    railTips.hidden = state.mobile;
    fab.hidden = !state.mobile;
    if (!state.mobile) {
      if (state.sheet && (state.sheet === 'todo' || state.sheet === 'notes')) closeSheet();
    }
  }
  mq.addEventListener('change', syncMobile);
  syncMobile();
  window.addEventListener('resize', () => {
    [todoWin, notesWin].forEach((win) => {
      if (win.style.left) {
        const rect = win.getBoundingClientRect();
        placeWindow(win, rect.left, rect.top);
      }
    });
  });

  /* ———————————————————— 快捷键 ———————————————————— */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (root.classList.contains('is-hidden')) return;
    if (state.confirmResolve) {
      settleConfirm(false);
      e.stopImmediatePropagation();
      return;
    }
    if (state.sheet) {
      closeSheet();
      e.stopImmediatePropagation();
      return;
    }
    if (state.todoEditor) {
      setEditor(null);
      e.stopImmediatePropagation();
    }
  }, true);

  /* ———————————————————— 启动 ———————————————————— */
  /* 进入沉浸时把展开面板与编辑态收回，退出后工作台保持原样 */
  window.addEventListener('windowlight:immersion', (e) => {
    if (!e.detail || !e.detail.on) return;
    if (state.sheet) closeSheet();
    if (state.todoEditor) setEditor(null);
  });

  function boot() {
    if (state.ready) return;
    state.ready = true;
    document.body.classList.add('wb-ready');
    loadPage(activePage());
    renderAll();
    state.timerHandle = setInterval(tickTimer, 250);
  }

  /* 房间的 ready 可能在脚本之后很久才到（字体、贴图、首帧），
     所以盯住 body 的 class 变化，而不是只等一次事件或一次定时器 */
  function whenReady() {
    if (state.ready) return;
    if (document.body.classList.contains('ready')) {
      boot();
      return;
    }
    if (window.MutationObserver) {
      const obs = new MutationObserver(() => {
        if (!state.ready && document.body.classList.contains('ready')) {
          obs.disconnect();
          boot();
        }
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('windowlight:ready', boot);
    const poll = setInterval(() => {
      if (state.ready) {
        clearInterval(poll);
        return;
      }
      if (document.body.classList.contains('ready')) {
        clearInterval(poll);
        boot();
      }
    }, 400);
    setTimeout(() => clearInterval(poll), 60000);
  }
  whenReady();

  /* 给控制台与自动化测试留的入口 */
  WB.ui = {
    state,
    openSheet,
    closeSheet,
    openTask: openNewTask,
    editTask: (id) => {
      const task = store.tasks.find((t) => t.id === id);
      if (task) setEditor(task);
    },
    confirmOpen: () => !!state.confirmResolve,
    renderAll,
    loadPage,
    flushNotes
  };

  WB.pomodoro = {
    get state() { return state.timer; },
    get phase() { return state.phase; },
    start() { if (state.timer.status !== 'running') toggleTimer(); },
    pause() { if (state.timer.status === 'running') toggleTimer(); },
    toggle: toggleTimer,
    reset: resetTimer,
    skip() { finishPhase(true); },
    setPhase,
    setMinutes: setMinutesTo,
    applyCustomMinutes,
    finishNow() { finishPhase(false); }
  };
})();
