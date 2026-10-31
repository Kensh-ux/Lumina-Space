/* 窗畔 · 工作台核心
   从 Lumina-Space 移植的任务 / 番茄钟 / 规划师 / 情绪记录 / 等级逻辑，
   保持 `lumina:data` v1 数据形状，纯函数部分可直接在 Node 里测试。

   （无 DOM 依赖；存储通过传入 Storage 对象使用）
*/
(function (root) {
  'use strict';

  const WB = (root.WB = root.WB || {});

  const KEYS = {
    data: 'lumina:data',
    dataBackup: 'lumina:data:backup',
    theme: 'lumina:theme',
    notes: 'lumina:notes',
    focus: 'lumina:focus',
    layout: 'lumina:workbench.layout'
  };

  const LIMITS = {
    taskTitle: 120,
    taskDescription: 500,
    moodNoteEmotion: 16,
    moodNoteContent: 500,
    moodNotes: 500,
    focusSessions: 500,
    minFocusSec: 60,
    moodLog: 365
  };

  const PRIORITY_LABEL = { 1: '低', 2: '中', 3: '高' };
  const PRIORITY_SCORE = { 1: 0, 2: 0.5, 3: 1 };
  const DAY_MS = 86400000;

  const EMOTIONS = [
    '期待', '喜悦', '自豪', '感动', '满足', '安心', '怀念', '焦虑', '害怕', '生气', '羡慕',
    '失落', '委屈', '孤独', '疲惫', '愧疚', '自卑', '迷茫', '压抑', '无聊', '纠结', '尴尬'
  ];

  let idSeq = 0;
  function uid(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    idSeq += 1;
    return (prefix || 'id') + '-' + Date.now() + '-' + idSeq;
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toDateString(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseLocalDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(d.getTime())) return null;
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
    return d;
  }

  function isValidDate(value) {
    return typeof value === 'string' && parseLocalDate(value) !== null;
  }

  function isValidTime(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function dayNumber(dateStr) {
    const d = parseLocalDate(dateStr);
    if (!d) return null;
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
  }

  function sliceChars(text, max) {
    return Array.from(String(text)).slice(0, max).join('');
  }

  /* ———————————————————— 任务 ———————————————————— */
  function normalizeTask(value) {
    if (!value || typeof value !== 'object') return null;
    const t = value;
    if (
      typeof t.id !== 'string' || !t.id ||
      typeof t.title !== 'string' || !t.title.trim() ||
      typeof t.done !== 'boolean' ||
      typeof t.createdAt !== 'string' || Number.isNaN(Date.parse(t.createdAt)) ||
      !(t.completedAt === null || typeof t.completedAt === 'string')
    ) return null;
    const task = {
      id: t.id,
      title: sliceChars(t.title.trim(), LIMITS.taskTitle),
      done: t.done,
      createdAt: t.createdAt,
      completedAt: t.completedAt
    };
    if (t.priority === 1 || t.priority === 2 || t.priority === 3) task.priority = t.priority;
    if (t.dueDate === null) task.dueDate = null;
    else if (isValidDate(t.dueDate)) task.dueDate = t.dueDate;
    else if (t.dueDate !== undefined) task.dueDate = null;
    if (typeof t.description === 'string') {
      const desc = sliceChars(t.description.trim(), LIMITS.taskDescription);
      if (desc) task.description = desc;
    }
    if (task.dueDate && isValidTime(t.dueTime)) task.dueTime = t.dueTime;
    return task;
  }

  function createTask(draft, now) {
    now = now || new Date();
    const title = sliceChars(String(draft.title || '').trim(), LIMITS.taskTitle);
    if (!title) return null;
    const task = {
      id: uid('task'),
      title,
      done: false,
      createdAt: now.toISOString(),
      completedAt: null
    };
    const desc = sliceChars(String(draft.description || '').trim(), LIMITS.taskDescription);
    if (desc) task.description = desc;
    if (draft.priority === 1 || draft.priority === 2 || draft.priority === 3) task.priority = draft.priority;
    if (draft.dueDate && isValidDate(draft.dueDate)) {
      task.dueDate = draft.dueDate;
      if (draft.dueTime && isValidTime(draft.dueTime)) task.dueTime = draft.dueTime;
    }
    return task;
  }

  function updateTaskFields(task, patch) {
    const next = Object.assign({}, task);
    if (patch.title !== undefined) {
      const title = sliceChars(String(patch.title).trim(), LIMITS.taskTitle);
      if (title) next.title = title;
    }
    if ('description' in patch) {
      const desc = sliceChars(String(patch.description || '').trim(), LIMITS.taskDescription);
      if (desc) next.description = desc;
      else delete next.description;
    }
    if ('priority' in patch) {
      if (patch.priority === null || patch.priority === undefined) delete next.priority;
      else if ([1, 2, 3].includes(patch.priority)) next.priority = patch.priority;
    }
    if ('dueDate' in patch) {
      if (!patch.dueDate) {
        next.dueDate = null;
        delete next.dueTime;
      } else if (isValidDate(patch.dueDate)) {
        next.dueDate = patch.dueDate;
      }
    }
    if ('dueTime' in patch) {
      if (!patch.dueTime || !next.dueDate || !isValidTime(patch.dueTime)) delete next.dueTime;
      else next.dueTime = patch.dueTime;
    }
    return next;
  }

  function taskScore(task, today) {
    const priority = PRIORITY_SCORE[task.priority || 2];
    let dateScore = 0;
    const day = task.dueDate ? dayNumber(task.dueDate) : null;
    if (day !== null) {
      const offset = day - today;
      dateScore = offset <= 0 ? 1 : Math.max(0, 1 - offset / 30);
    }
    return 0.6 * priority + 0.4 * dateScore;
  }

  function sortTasks(tasks, now) {
    now = now || new Date();
    const today = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
    return tasks.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.done) return b.createdAt.localeCompare(a.createdAt);
      const diff = taskScore(b, today) - taskScore(a, today);
      if (diff !== 0) return diff;
      const ad = a.dueDate || '';
      const bd = b.dueDate || '';
      if (ad !== bd) {
        if (!ad) return 1;
        if (!bd) return -1;
        return ad.localeCompare(bd);
      }
      return 0;
    });
  }

  function filterTasks(tasks, filter, query) {
    let out = tasks;
    if (filter === 'open') out = out.filter((t) => !t.done);
    else if (filter === 'done') out = out.filter((t) => t.done);
    const needle = String(query || '').trim().toLowerCase();
    if (needle) out = out.filter((t) => t.title.toLowerCase().includes(needle));
    return out;
  }

  function countTasks(tasks) {
    let done = 0;
    for (const t of tasks) if (t.done) done += 1;
    return { total: tasks.length, done, open: tasks.length - done };
  }

  function isTaskOverdue(task, now) {
    now = now || new Date();
    if (!task.dueDate || task.done) return false;
    const today = toDateString(now);
    if (task.dueDate > today) return false;
    if (task.dueDate < today) return true;
    if (!task.dueTime) return false;
    return task.dueTime < pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function formatDue(task) {
    if (!task.dueDate) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(task.dueDate);
    let label = m ? m[2] + '/' + m[3] : task.dueDate;
    if (task.dueTime) label += ' ' + task.dueTime;
    return label;
  }

  /* ———————————————————— 情绪记录 ———————————————————— */
  function clampScore(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return clamp(Math.round(Number(value)), -724, 597);
  }

  function normalizeMoodNote(value) {
    if (!value || typeof value !== 'object') return null;
    if (typeof value.id !== 'string' || !value.id) return null;
    if (typeof value.emotion !== 'string' || typeof value.content !== 'string') return null;
    const emotion = sliceChars(value.emotion.trim(), LIMITS.moodNoteEmotion);
    const content = sliceChars(value.content.trim(), LIMITS.moodNoteContent);
    if (!emotion || !content) return null;
    if (typeof value.score !== 'number' || !Number.isFinite(value.score)) return null;
    if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) return null;
    const note = { id: value.id, emotion, content, score: clampScore(value.score), createdAt: value.createdAt };
    if (typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt))) {
      note.updatedAt = value.updatedAt;
    }
    return note;
  }

  function createMoodNote(input, now) {
    now = now || new Date();
    const emotion = sliceChars(String(input.emotion || '').trim(), LIMITS.moodNoteEmotion);
    const content = sliceChars(String(input.content || '').trim(), LIMITS.moodNoteContent);
    if (!emotion || !content) return null;
    return {
      id: uid('mood-note'),
      emotion,
      content,
      score: clampScore(input.score),
      createdAt: now.toISOString()
    };
  }

  function updateMoodNote(note, input, now) {
    now = now || new Date();
    const emotion = sliceChars(String(input.emotion || '').trim(), LIMITS.moodNoteEmotion);
    const content = sliceChars(String(input.content || '').trim(), LIMITS.moodNoteContent);
    if (!emotion || !content) return note;
    return Object.assign({}, note, {
      emotion,
      content,
      score: clampScore(input.score),
      updatedAt: now.toISOString()
    });
  }

  function sortMoodNotes(notes) {
    return notes.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function arrangeMoodNotes(notes, pinnedDate) {
    const sorted = sortMoodNotes(notes);
    const target = String(pinnedDate || '').trim();
    if (!target) return sorted;
    const pinned = [];
    const rest = [];
    for (const note of sorted) {
      if (toDateString(new Date(note.createdAt)) === target) pinned.push(note);
      else rest.push(note);
    }
    return pinned.concat(rest);
  }

  function filterMoodNotes(notes, query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) return notes.slice();
    return notes.filter(
      (n) => n.emotion.toLowerCase().includes(needle) || n.content.toLowerCase().includes(needle)
    );
  }

  function formatScore(score) {
    const s = clampScore(score);
    return s > 0 ? '+' + s : String(s);
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /* ———————————————————— 专注 / 等级 ———————————————————— */
  function normalizeFocusSessions(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    for (const s of value) {
      if (!s || typeof s !== 'object') continue;
      if (typeof s.id !== 'string' || !s.id) continue;
      if (typeof s.durationSec !== 'number' || !Number.isFinite(s.durationSec) || s.durationSec < LIMITS.minFocusSec) continue;
      if (typeof s.completedAt !== 'string' || Number.isNaN(Date.parse(s.completedAt))) continue;
      out.push({ id: s.id, durationSec: Math.round(s.durationSec), completedAt: s.completedAt });
    }
    return out.slice(-LIMITS.focusSessions);
  }

  function addFocusSession(sessions, durationSec, now) {
    now = now || new Date();
    if (!Number.isFinite(durationSec) || durationSec < LIMITS.minFocusSec) return sessions.slice();
    return sessions
      .concat([{ id: uid('focus'), durationSec: Math.round(durationSec), completedAt: now.toISOString() }])
      .slice(-LIMITS.focusSessions);
  }

  function focusStats(sessions, now) {
    now = now || new Date();
    const today = toDateString(now);
    let todayCount = 0;
    let todaySeconds = 0;
    let totalSeconds = 0;
    for (const s of sessions) {
      totalSeconds += s.durationSec;
      if (toDateString(new Date(s.completedAt)) === today) {
        todayCount += 1;
        todaySeconds += s.durationSec;
      }
    }
    return { todayCount, todaySeconds, totalCount: sessions.length, totalSeconds };
  }

  const SESSIONS_PER_LEVEL = 4;

  function levelInfo(totalCount) {
    const count = Math.max(0, Math.floor(totalCount || 0));
    const level = 1 + Math.floor(count / SESSIONS_PER_LEVEL);
    const inLevel = count % SESSIONS_PER_LEVEL;
    return {
      level,
      inLevel,
      need: SESSIONS_PER_LEVEL,
      remaining: SESSIONS_PER_LEVEL - inLevel,
      progress: inLevel / SESSIONS_PER_LEVEL
    };
  }

  function formatMinutes(totalSec) {
    const minutes = Math.max(0, Math.floor(totalSec / 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? h + ' 小时 ' + m + ' 分钟' : m + ' 分钟';
  }

  /* ———————————————————— 番茄钟状态机 ———————————————————— */
  const TIMER_DEFAULT = { focusMin: 25, breakMin: 5, longBreakMin: 15, cycle: 1, roundsBeforeLong: 4 };

  function clampMinutes(v, min) {
    const n = Number(v);
    if (!Number.isFinite(n)) return min || 1;
    return clamp(Math.round(n), min || 1, 486);
  }

  function createTimer(minutes) {
    const sec = clampMinutes(minutes || 25) * 60;
    return { durationSec: sec, remainingSec: sec, status: 'idle', endAt: null };
  }

  function timerSetDuration(state, minutes) {
    if (state.status !== 'idle') return state;
    const sec = clampMinutes(minutes) * 60;
    return { durationSec: sec, remainingSec: sec, status: 'idle', endAt: null };
  }

  function timerStart(state, now) {
    now = now === undefined ? Date.now() : now;
    if ((state.status !== 'idle' && state.status !== 'paused') || state.remainingSec <= 0) return state;
    return Object.assign({}, state, { status: 'running', endAt: now + state.remainingSec * 1000 });
  }

  function timerPause(state, now) {
    now = now === undefined ? Date.now() : now;
    if (state.status !== 'running' || state.endAt === null) return state;
    const remainingSec = Math.max(0, Math.ceil((state.endAt - now) / 1000));
    if (remainingSec <= 0) return { durationSec: state.durationSec, remainingSec: 0, status: 'done', endAt: null };
    return Object.assign({}, state, { status: 'paused', remainingSec, endAt: null });
  }

  function timerTick(state, now) {
    now = now === undefined ? Date.now() : now;
    if (state.status !== 'running' || state.endAt === null) return state;
    const remainingSec = Math.max(0, Math.ceil((state.endAt - now) / 1000));
    if (remainingSec <= 0) return { durationSec: state.durationSec, remainingSec: 0, status: 'done', endAt: null };
    if (remainingSec === state.remainingSec) return state;
    return Object.assign({}, state, { remainingSec });
  }

  function timerReset(state) {
    return { durationSec: state.durationSec, remainingSec: state.durationSec, status: 'idle', endAt: null };
  }

  function formatClock(totalSec) {
    const safe = Math.max(0, Math.floor(totalSec));
    return pad(Math.floor(safe / 60)) + ':' + pad(safe % 60);
  }

  /* ———————————————————— 规划师 ———————————————————— */
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function monthDays(year, month) {
    const days = [];
    const total = new Date(year, month, 0).getDate();
    const today = toDateString(new Date());
    for (let d = 1; d <= total; d += 1) {
      const date = new Date(year, month - 1, d);
      const iso = toDateString(date);
      days.push({
        date: iso,
        day: d,
        weekday: WEEKDAYS[date.getDay()],
        isToday: iso === today
      });
    }
    return days;
  }

  function tasksForDate(tasks, date) {
    return tasks
      .filter((t) => t.dueDate === date)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.dueTime && b.dueTime && a.dueTime !== b.dueTime) return a.dueTime.localeCompare(b.dueTime);
        if (a.dueTime && !b.dueTime) return -1;
        if (!a.dueTime && b.dueTime) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  function monthTitle(year, month) {
    return year + '年，' + month + '月';
  }

  /* ———————————————————— 数据存取 ———————————————————— */
  function createDefaultData() {
    return {
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'neutral', updatedAt: new Date().toISOString() },
      moodLog: [],
      focusSessions: [],
      moodNotes: [],
      customBackgrounds: {}
    };
  }

  function normalizeData(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.schemaVersion !== 1 || !Array.isArray(value.tasks)) return null;
    const tasks = [];
    for (const raw of value.tasks) {
      const t = normalizeTask(raw);
      if (!t) return null;
      tasks.push(t);
    }
    if (new Set(tasks.map((t) => t.id)).size !== tasks.length) return null;
    const mood = value.mood && typeof value.mood === 'object' ? value.mood : null;
    const current = mood && ['positive', 'neutral', 'negative'].includes(mood.current) ? mood.current : 'neutral';
    const notes = [];
    if (Array.isArray(value.moodNotes)) {
      for (const raw of value.moodNotes) {
        const n = normalizeMoodNote(raw);
        if (n) notes.push(n);
      }
    }
    return {
      schemaVersion: 1,
      tasks,
      mood: { current, updatedAt: (mood && mood.updatedAt) || new Date().toISOString() },
      moodLog: Array.isArray(value.moodLog) ? value.moodLog.slice(-LIMITS.moodLog) : [],
      focusSessions: normalizeFocusSessions(value.focusSessions),
      moodNotes: notes.slice(-LIMITS.moodNotes),
      customBackgrounds: value.customBackgrounds && typeof value.customBackgrounds === 'object' ? value.customBackgrounds : {}
    };
  }

  function resolveStorage() {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function readJSON(storage, key, fallback) {
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(storage, key, value) {
    if (!storage) return false;
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function createDefaultNotes() {
    const now = new Date().toISOString();
    const id = uid('page');
    return {
      activeId: id,
      pages: [{ id, title: '窗边的第一页', body: '', createdAt: now, updatedAt: now }]
    };
  }

  function createStore(storage) {
    storage = storage === undefined ? resolveStorage() : storage;
    let data = null;
    let notes = null;
    let prefs = null;
    const listeners = [];

    function emit(reason) {
      for (const fn of listeners) {
        try { fn(reason); } catch (e) { /* 单个订阅者出错不影响他人 */ }
      }
    }

    function load() {
      const raw = readJSON(storage, KEYS.data, null);
      data = normalizeData(raw) || createDefaultData();
      if (raw && !normalizeData(raw)) {
        try { storage && storage.setItem(KEYS.dataBackup, JSON.stringify(raw)); } catch (e) { /* 备份失败不阻塞 */ }
      }
      notes = normalizeNotes(readJSON(storage, KEYS.notes, null));
      prefs = normalizeFocusPrefs(readJSON(storage, KEYS.focus, null));
      return { data, notes, prefs };
    }

    function saveData() {
      const ok = writeJSON(storage, KEYS.data, data);
      if (ok && storage) {
        try { storage.setItem(KEYS.theme, data.mood.current); } catch (e) { /* 主题镜像可选 */ }
      }
      emit('data');
      return ok;
    }

    function saveNotes() {
      const ok = writeJSON(storage, KEYS.notes, notes);
      emit('notes');
      return ok;
    }

    function savePrefs() {
      const ok = writeJSON(storage, KEYS.focus, prefs);
      emit('prefs');
      return ok;
    }

    function normalizeNotes(value) {
      if (!value || !Array.isArray(value.pages) || !value.pages.length) return createDefaultNotes();
      const pages = [];
      for (const p of value.pages) {
        if (!p || typeof p.id !== 'string' || !p.id) continue;
        pages.push({
          id: p.id,
          title: sliceChars(String(p.title || '未命名页面'), 40) || '未命名页面',
          body: typeof p.body === 'string' ? p.body.slice(0, 20000) : '',
          createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
          updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString()
        });
      }
      if (!pages.length) return createDefaultNotes();
      const activeId = pages.some((p) => p.id === value.activeId) ? value.activeId : pages[0].id;
      return { activeId, pages };
    }

    function normalizeFocusPrefs(value) {
      const v = value && typeof value === 'object' ? value : {};
      return {
        focusMin: clampMinutes(v.focusMin || 25),
        breakMin: clampMinutes(v.breakMin || 5),
        longBreakMin: clampMinutes(v.longBreakMin || 15),
        cycle: Number.isFinite(v.cycle) && v.cycle > 0 ? Math.floor(v.cycle) : 1,
        autoStartBreak: v.autoStartBreak !== false,
        autoStartFocus: v.autoStartFocus === true
      };
    }

    load();

    return {
      get data() { return data; },
      get notes() { return notes; },
      get prefs() { return prefs; },
      get tasks() { return data.tasks; },
      get moodNotes() { return data.moodNotes || []; },
      get focusSessions() { return data.focusSessions || []; },
      subscribe(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
      reload() { load(); emit('reload'); },
      saveData,
      saveNotes,
      savePrefs,
      addTask(draft) {
        const task = createTask(draft);
        if (!task) return null;
        data.tasks.push(task);
        saveData();
        return task;
      },
      updateTask(id, patch) {
        data.tasks = data.tasks.map((t) => (t.id === id ? updateTaskFields(t, patch) : t));
        saveData();
      },
      toggleTask(id) {
        const now = new Date().toISOString();
        data.tasks = data.tasks.map((t) => (t.id === id ? Object.assign({}, t, { done: !t.done, completedAt: t.done ? null : now }) : t));
        saveData();
      },
      deleteTask(id) {
        data.tasks = data.tasks.filter((t) => t.id !== id);
        saveData();
      },
      addMoodNote(input) {
        const note = createMoodNote(input);
        if (!note) return null;
        data.moodNotes = (data.moodNotes || []).concat([note]).slice(-LIMITS.moodNotes);
        saveData();
        return note;
      },
      updateMoodNote(id, input) {
        data.moodNotes = (data.moodNotes || []).map((n) => (n.id === id ? updateMoodNote(n, input) : n));
        saveData();
      },
      deleteMoodNote(id) {
        data.moodNotes = (data.moodNotes || []).filter((n) => n.id !== id);
        saveData();
      },
      addFocusSession(durationSec) {
        data.focusSessions = addFocusSession(data.focusSessions || [], durationSec);
        saveData();
      },
      clearFocusSessions() {
        data.focusSessions = [];
        saveData();
      },
      setPrefs(patch) {
        prefs = normalizeFocusPrefs(Object.assign({}, prefs, patch));
        savePrefs();
      },
      addPage() {
        const now = new Date().toISOString();
        const page = { id: uid('page'), title: '新页面', body: '', createdAt: now, updatedAt: now };
        notes.pages.unshift(page);
        notes.activeId = page.id;
        saveNotes();
        return page;
      },
      updatePage(id, patch) {
        notes.pages = notes.pages.map((p) => (p.id === id ? Object.assign({}, p, patch, { updatedAt: new Date().toISOString() }) : p));
        saveNotes();
      },
      deletePage(id) {
        if (notes.pages.length <= 1) return false;
        notes.pages = notes.pages.filter((p) => p.id !== id);
        if (notes.activeId === id) notes.activeId = notes.pages[0].id;
        saveNotes();
        return true;
      },
      setActivePage(id) {
        if (!notes.pages.some((p) => p.id === id)) return;
        notes.activeId = id;
        saveNotes();
      },
      exportJSON() {
        const payload = {
          schemaVersion: 1,
          tasks: data.tasks,
          mood: data.mood,
          moodLog: data.moodLog || [],
          focusSessions: data.focusSessions || [],
          moodNotes: data.moodNotes || [],
          customBackgrounds: data.customBackgrounds || {},
          notes: notes.pages,
          focusPrefs: prefs
        };
        return { filename: 'chuangpan-workbench-' + toDateString(new Date()) + '.json', json: JSON.stringify(payload, null, 2) };
      },
      importJSON(raw) {
        let parsed;
        try { parsed = JSON.parse(raw); } catch (e) { return { ok: false, error: 'JSON 解析失败' }; }
        const next = normalizeData(parsed);
        if (!next) return { ok: false, error: '数据结构不是 lumina:data v1' };
        data = next;
        if (Array.isArray(parsed.notes) && parsed.notes.length) {
          notes = normalizeNotes({ pages: parsed.notes, activeId: parsed.notes[0].id });
        }
        saveData();
        saveNotes();
        return { ok: true };
      },
      clearAll() {
        data = createDefaultData();
        notes = createDefaultNotes();
        prefs = normalizeFocusPrefs(null);
        saveData();
        saveNotes();
        savePrefs();
      },
      getLevel() { return levelInfo((data.focusSessions || []).length); },
      getFocusStats() { return focusStats(data.focusSessions || []); }
    };
  }

  WB.core = {
    KEYS,
    LIMITS,
    EMOTIONS,
    PRIORITY_LABEL,
    WEEKDAYS,
    toDateString,
    parseLocalDate,
    isValidDate,
    isValidTime,
    clampScore,
    uid,
    createTask,
    updateTaskFields,
    normalizeTask,
    sortTasks,
    filterTasks,
    countTasks,
    isTaskOverdue,
    formatDue,
    createMoodNote,
    updateMoodNote,
    normalizeMoodNote,
    sortMoodNotes,
    arrangeMoodNotes,
    filterMoodNotes,
    formatScore,
    formatDateTime,
    normalizeFocusSessions,
    addFocusSession,
    focusStats,
    levelInfo,
    formatMinutes,
    createTimer,
    timerSetDuration,
    timerStart,
    timerPause,
    timerTick,
    timerReset,
    formatClock,
    clampMinutes,
    monthDays,
    tasksForDate,
    monthTitle,
    createDefaultData,
    normalizeData,
    createDefaultNotes,
    normalizeFocusPrefs: (v) => {
      const value = v && typeof v === 'object' ? v : {};
      return {
        focusMin: clampMinutes(value.focusMin || 25),
        breakMin: clampMinutes(value.breakMin || 5),
        longBreakMin: clampMinutes(value.longBreakMin || 15),
        cycle: Number.isFinite(value.cycle) && value.cycle > 0 ? Math.floor(value.cycle) : 1,
        autoStartBreak: value.autoStartBreak !== false,
        autoStartFocus: value.autoStartFocus === true
      };
    },
    createStore
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = WB;
})(typeof window !== 'undefined' ? window : globalThis);
