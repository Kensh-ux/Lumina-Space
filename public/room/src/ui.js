/* 窗畔 · 界面：光景、陈设、时钟与对话 */
(function () {
  'use strict';
  window.WP = window.WP || {};

  const ICONS = {
    piano: '<rect x="3" y="4" width="18" height="16" rx="1.4"/><path d="M3 13h18M7.5 13V4M12 13V4M16.5 13V4M9.7 4v5M14.3 4v5"/>',
    record: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2.1"/><path d="M18.2 5.6 8.6 15.2"/><circle cx="18.6" cy="5.2" r="1.1"/>',
    pendant: '<path d="M12 2v6"/><path d="M7 12h10l-2.2-4H9.2L7 12z"/><path d="M12 12v2.4"/><circle cx="12" cy="17" r="1.7"/>',
    floorLamp: '<path d="M9.2 3h5.6l2.2 6.4H7L9.2 3z"/><path d="M12 9.4V20"/><path d="M8.6 21h6.8"/>',
    candles: '<path d="M6 21v-9M12 21V9M18 21v-7"/><path d="M6 9c1 1 1 2 0 3-1-1-1-2 0-3zM12 6c1 1 1 2 0 3-1-1-1-2 0-3zM18 11c1 1 1 2 0 3-1-1-1-2 0-3z"/>',
    stringLights: '<path d="M3 6c3.2 5 14.8 5 18 0"/><path d="M6 8.6v1.8M10 9.9v1.8M14 9.9v1.8M18 8.6v1.8"/>',
    rug: '<rect x="4" y="6.5" width="16" height="11" rx="1"/><path d="M7 9.4h10M7 14.6h10"/>',
    armchair: '<path d="M7 11V7.8A1.8 1.8 0 0 1 8.8 6h6.4A1.8 1.8 0 0 1 17 7.8V11"/><path d="M5.6 11h12.8v6.4H5.6z"/><path d="M8 17.4V20M16 17.4V20"/>',
    table: '<path d="M3.6 9h16.8"/><path d="M6.8 9v11M17.2 9v11"/><path d="M9.4 9V7h5.2v2"/><path d="M12 4.4v1.8"/>',
    shelves: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 10h16M4 15.2h16M8.2 4v6M13 10v5.2M10.2 15.2V20"/>',
    wallArt: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m5.2 17.2 4.6-5.6 3.6 3.8 2.2-3 3.2 4.8"/><circle cx="9" cy="8.4" r="1.2"/>',
    vase: '<path d="M9.4 3h5.2l-1 4.2c1.9 1.8 2.9 3.6 2.9 5.8A4.5 4.5 0 0 1 12 17.5a4.5 4.5 0 0 1-4.5-4.5c0-2.2 1-4 2.9-5.8L9.4 3z"/><path d="M12 17.5V21M10 21h4"/>',
    cat: '<path d="M6.4 20c0-4 1.8-6 1.8-9.2a3.9 3.9 0 0 1 7.8 0C16 14 17.8 16 17.8 20"/><path d="M9.4 8.2 8.2 4.4l3.2 2M14.6 8.2l1.2-3.8-3.2 2"/><path d="M10.4 12.2h.01M13.6 12.2h.01M12 14.2v.8"/><path d="M18 13c1.6-.2 2.6.5 3 1.6M6 13c-1.6-.2-2.6.5-3 1.6"/>',
    plant: '<path d="M8.4 12.4h7.2L14.8 21H9.6l-1.2-8.6z"/><path d="M12 12.4V8.6"/><path d="M12 8.6c0-3-2-5-5.2-5 0 3 2 5 5.2 5zM12 8.6c0-3 2-5 5.2-5 0 3-2 5-5.2 5z"/>',
    telescope: '<path d="m4.4 12.6 8.8-5.8 3.2 4.8-8.8 5.8z"/><path d="m13.2 6.8 3.2-2.2 3 4.6-3 2.2"/><path d="M9.6 15.2 6.4 21M12.4 16.6l3.6 4.4M11.2 15.8v2.4"/>',
    guitar: '<path d="M14.6 3.2 12 5.8M16.6 5.2l-2.6 2.6"/><path d="M10.2 8.4c1.7-1 3.4-.2 3.6 1.7.1 1.2-.8 2-1.2 3-.5 1.2.1 2.1.2 3.2.2 2.2-1.6 4.1-3.8 4.2-2.3.1-4.2-1.5-4.3-3.6 0-1.2.6-2.1.4-3.3-.3-1.3-1.5-2.1-1.4-3.6.1-1.7 1.6-3 3.6-3.1 1.2 0 2.1.4 2.9 1z"/><circle cx="8.2" cy="15.6" r="1.5"/>',
    letters: '<rect x="3" y="6" width="12.4" height="9" rx="1"/><path d="m3.5 6.7 5.7 4.7 5.7-4.7"/><path d="m16.2 17.4 4.2-8.6M17.8 18.8l2.5.7.5-2.5"/>',
    knitting: '<circle cx="8.2" cy="14.8" r="4.2"/><path d="M11.2 11.8 18.6 4.4M9.3 18.6l8.2 1.6M13.4 8.8l2.4 4.4"/><path d="M6.4 12.6c1.4-.3 2.6 0 3.6.9"/>',
    musicBox: '<rect x="4" y="10" width="16" height="10" rx="1.2"/><path d="M4 13h16M9.4 10V7.4h5.2V10M17.4 14.2c1.5.2 2.3 1.6 2 2.9M15.4 20v-3.3"/>',
    windChime: '<path d="M12 3v5M8.4 8.2h7.2l-1 1.8H9.4L8.4 8.2z"/><path d="M9.2 10.6v6.8M12 10.6v8.4M14.8 10.6v5.6"/><path d="M9.2 19.8h0M12 21.2h0M14.8 18.4h0"/>',
    toyTrain: '<path d="M5 15.4h14v3.2H5z"/><path d="M7 15.4V10h6.2v5.4M13.2 12h3.2l2.4 3.4"/><path d="M7.6 11.4h4.2"/><circle cx="8.2" cy="19.4" r="1.4"/><circle cx="15.8" cy="19.4" r="1.4"/><path d="M8.8 8.6V6.2h2.6v2.4"/>',
    sconce: '<path d="M12 3v6"/><path d="M8.6 12h6.8l-1.3-3h-4.2L8.6 12z"/><path d="M12 12v3.2"/><circle cx="12" cy="17.4" r="1.7"/><path d="M9.8 20.4h4.4"/>',
    rockingChair: '<path d="M7.4 4.6v6.6a2 2 0 0 0 2 2h5.2a2 2 0 0 0 2-2V4.6"/><path d="M5.4 13.2h13.2"/><path d="M6.8 13.2 4.6 20M17.2 13.2 19.4 20"/><path d="M4.6 20c2 1 4.2 0 5.6 0M19.4 20c-2 1-4.2 0-5.6 0"/>',
    sideTable: '<path d="M5 10.4h14M7 10.4V20M17 10.4V20"/><path d="M12 3.2v4.2"/><path d="M9 7.4h6l-1 3H10L9 7.4z"/>',
    screen: '<path d="M3.6 4.4h5v15.2h-5zM9.5 4.4h5v15.2h-5zM15.4 4.4h5v15.2h-5z"/><path d="M6.1 8h0M12 11h0M17.9 8h0M6.1 16h0M12 14h0M17.9 16h0"/>',
    aquarium: '<rect x="3" y="7" width="18" height="12" rx="1"/><path d="M3 10h18M6.5 19v2M17.5 19v2"/><path d="M14.6 12.2c-1.5-1.2-3.5-1-4.5.2 1 .9 3 1.2 4.5.2zM14.6 12.2l1.8-.8v2.5l-1.8-.9z"/><path d="M7.4 13.6c1 .2 1.5.8 1.8 1.6"/>',
    globe: '<circle cx="12" cy="11" r="7"/><path d="M5 8.4c4.2 2 9.8 2 14 0M5 13.6c4.2-2 9.8-2 14 0M12 4c-2.4 3-2.4 11 0 14M12 4c2.4 3 2.4 11 0 14"/><path d="M9.2 18.4h5.6l-1 3.2H10.2z"/>',
    penguin: '<path d="M8.2 20c-1.7-2-2-4.1-2-6.2C6.2 9.6 8.4 5.8 12 5.8s5.8 3.8 5.8 8c0 2.1-.3 4.2-2 6.2z"/><path d="M9 8.6c.5-2 1.5-3 3-3s2.5 1 3 3"/><path d="M12 9.4c-1.5 1.8-1.5 5.5 0 7.2 1.5-1.7 1.5-5.4 0-7.2z"/><path d="M10.1 8.2h.01M13.9 8.2h.01M10.8 18.4l1.2.8 1.2-.8"/>',
    seal: '<path d="M5 18c0-4 2.6-7 7-7s6.8 2.8 6.8 6.2c0 1.5-.8 2.8-2.2 2.8H7.2C5.9 20 5 19 5 18z"/><path d="M16.4 11.7c1.4-1 2.2-2.3 2.3-4"/><path d="M9 11.4c1-.7 2-.9 3-.9s2 .2 3 .9"/><path d="M11.1 13.7h.01M14.9 13.7h.01M12.3 15.3h1.4"/><path d="M8 19c-1.2.1-2 .6-2.4 1.2"/>',
    bear: '<circle cx="12" cy="13" r="6"/><circle cx="7.2" cy="7.4" r="2"/><circle cx="16.8" cy="7.4" r="2"/><path d="M9.8 15.2c1.4.8 3 .8 4.4 0"/><path d="M10.2 11.4h.01M13.8 11.4h.01M12 13.4v1.1"/><path d="M12 16.6v.5"/>',
    bunny: '<path d="M9 20c-1.5-1.6-2-3.5-2-5.5 0-3.2 2-6 5-6s5 2.8 5 6c0 2-.5 3.9-2 5.5z"/><path d="M9.2 9.2C8 6.8 7.2 3 8.6 2.6c1.4-.4 2.5 3.2 2.8 6M14.8 9.2c1.2-2.4 2-6.2.6-6.6-1.4-.4-2.5 3.2-2.8 6"/><path d="M10.2 12.4h.01M13.8 12.4h.01M12 14.2v.9"/>'
  };

  const ACC_CHEV = '<svg class="acc-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>';

  const GROUPS = [
    {
      key: 'sound', cn: '声音', en: 'SOUND',
      items: [
        { key: 'piano', name: '钢琴', en: 'PIANO' },
        { key: 'record', name: '黑胶', en: 'VINYL' },
        { key: 'guitar', name: '吉他', en: 'GUITAR' },
        { key: 'musicBox', name: '八音盒', en: 'MUSIC BOX' },
        { key: 'windChime', name: '风铃', en: 'CHIME' }
      ]
    },
    {
      key: 'lights', cn: '灯火', en: 'LIGHTS',
      items: [
        { key: 'pendant', name: '吊灯', en: 'PENDANT' },
        { key: 'floorLamp', name: '落地灯', en: 'LAMP' },
        { key: 'candles', name: '烛台', en: 'CANDLES' },
        { key: 'stringLights', name: '串灯', en: 'STRING' },
        { key: 'sconce', name: '壁灯', en: 'SCONCE' }
      ]
    },
    {
      key: 'living', cn: '起居', en: 'LIVING',
      items: [
        { key: 'rug', name: '地毯', en: 'RUG' },
        { key: 'armchair', name: '扶手椅', en: 'CHAIR' },
        { key: 'table', name: '茶几', en: 'TABLE' },
        { key: 'toyTrain', name: '小火车', en: 'TOY TRAIN' },
        { key: 'shelves', name: '壁架', en: 'SHELVES' },
        { key: 'wallArt', name: '挂画', en: 'ART' },
        { key: 'vase', name: '花瓶', en: 'VASE' },
        { key: 'letters', name: '信笺', en: 'LETTERS' },
        { key: 'rockingChair', name: '摇椅', en: 'ROCKER' },
        { key: 'sideTable', name: '边几', en: 'SIDE TABLE' },
        { key: 'screen', name: '屏风', en: 'SCREEN' }
      ]
    },
    {
      key: 'life', cn: '生机', en: 'LIFE',
      items: [
        { key: 'cat', name: '猫', en: 'CAT' },
        { key: 'plant', name: '绿植', en: 'PLANT' },
        { key: 'knitting', name: '织物', en: 'KNITTING' },
        { key: 'aquarium', name: '水族箱', en: 'AQUARIUM' }
      ]
    },
    {
      key: 'dolls', cn: '玩偶', en: 'DOLLS',
      items: [
        { key: 'penguin', name: '企鹅', en: 'PENGUIN' },
        { key: 'seal', name: '海豹', en: 'SEAL' },
        { key: 'bear', name: '小熊', en: 'BEAR' },
        { key: 'bunny', name: '兔子', en: 'BUNNY' }
      ]
    },
    {
      key: 'afar', cn: '远方', en: 'AFAR',
      items: [
        { key: 'telescope', name: '望远镜', en: 'TELESCOPE' },
        { key: 'globe', name: '地球仪', en: 'GLOBE' }
      ]
    }
  ];

  const WEATHER = {
    dusk: '15° · 微风',
    rain: '12° · 小雨',
    snow: '−2° · 小雪',
    dawn: '11° · 薄雾',
    day: '19° · 晴',
    aurora: '4° · 极光',
    abyss: '深海 · 无声',
    cosmos: '星潮 · 失重',
    sakura: '夜樱 · 微凉',
    hanabi: '夏夜 · 花火',
    cloudsea: '云上 · 有风',
    isles: '浮空 · 瀑布',
    dunes: '沙海 · 双月',
    ice: '极夜 · −28°',
    firefly: '萤森 · 潮湿',
    booksea: '书海 · 无重',
    moon: '月面 · 真空',
    meadow: '花野 · 晚风'
  };

  const UI = {
    opts: null,
    els: {},
    objEls: {},
    objGroupEls: {},
    keyGroup: {},
    moodSets: {},
    onCount: 0,
    total: 0,
    toastTimer: 0,
    quoteTimer: 0,
    soundOn: false,
    immersed: false,
    aboutOpen: false,
    initialized: false
  };

  function $(id) { return document.getElementById(id); }

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  UI.init = function (opts) {
    UI.opts = opts || {};
    UI.els = {
      panel: $('panel'),
      panelToggle: $('panelToggle'),
      collapseBtn: $('collapseBtn'),
      clockTime: $('clockTime'),
      clockSec: $('clockSec'),
      clockDate: $('clockDate'),
      weatherText: $('weatherText'),
      weatherDot: $('weatherDot'),
      moodGrid: $('moodGrid'),
      moodQuote: $('moodQuote'),
      relicHint: $('relicHint'),
      relicHintText: $('relicHintText'),
      moodMeterFill: $('moodMeterFill'),
      moodMeterNo: $('moodMeterNo'),
      objList: $('objList'),
      objCount: $('objCount'),
      soundBtn: $('soundBtn'),
      soundState: $('soundState'),
      hudSound: $('hudSound'),
      hudImmerse: $('hudImmerse'),
      hudAbout: $('hudAbout'),
      immerseBtn: $('immerseBtn'),
      aboutBtn: $('aboutBtn'),
      about: $('about'),
      immersionHint: $('immersionHint'),
      toast: $('toast'),
      tooltip: $('tooltip'),
      loading: $('loading'),
      loadingBar: $('loadingBar'),
      loadingPct: $('loadingPct'),
      loadingLabel: $('loadingLabel'),
      scene: $('scene')
    };
    buildMoods();
    bind();
    updateClock();
    setInterval(updateClock, 1000);
    UI.initialized = true;
  };

  /* ———————————————————— 光景 ———————————————————— */
  function makeMoodTile(key, m) {
    const b = document.createElement('button');
    const dream = m.kind === 'dream';
    b.type = 'button';
    b.className = 'mood' + (dream ? ' is-dream' : '');
    b.dataset.mood = key;
    b.title = m.label + ' · ' + m.en;
    b.setAttribute('aria-label', m.label + '，' + m.desc);
    b.setAttribute('aria-pressed', 'false');
    b.style.setProperty('--a', m.thumb[0]);
    b.style.setProperty('--b', m.thumb[1]);
    b.style.setProperty('--c', m.thumb[2]);
    b.innerHTML =
      '<span class="mood-orb" aria-hidden="true">' +
        '<span class="mood-sky"></span>' +
        '<span class="mood-photo"></span>' +
        '<span class="mood-no">' + m.no + '</span>' +
      '</span>' +
      '<span class="mood-label">' + m.label + '</span>' +
      '<span class="mood-en">' + m.en + '</span>';
    b.addEventListener('click', () => {
      if (UI.opts.onMood) UI.opts.onMood(key);
    });
    return b;
  }

  function setMoodSetOpen(kind, open) {
    const set = UI.moodSets[kind];
    if (!set) return;
    set.el.classList.toggle('is-open', !!open);
    set.head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openMoodSet(kind) {
    Object.keys(UI.moodSets).forEach((k) => setMoodSetOpen(k, k === kind));
  }

  function buildMoods() {
    const wrap = UI.els.moodGrid;
    const meta = WP.MOODS || {};
    const order = WP.MOOD_ORDER || Object.keys(meta);
    const sets = [
      { kind: 'street', cn: '街景', en: 'STREET', keys: order.filter((k) => meta[k] && meta[k].kind !== 'dream') },
      { kind: 'dream', cn: '幻境', en: 'DREAMS', keys: order.filter((k) => meta[k] && meta[k].kind === 'dream') }
    ];
    wrap.innerHTML = '';
    UI.moodSets = {};
    sets.forEach((set) => {
      if (!set.keys.length) return;
      const sec = document.createElement('section');
      sec.className = 'mood-set mood-set-' + set.kind;
      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'mood-set-head';
      head.setAttribute('aria-expanded', 'false');
      const first = meta[set.keys[0]].no;
      const last = meta[set.keys[set.keys.length - 1]].no;
      head.innerHTML =
        '<span class="mood-set-title">' + set.cn + '</span>' +
        '<em>' + set.en + ' · ' + first + '—' + last + '</em>' +
        '<b>' + String(set.keys.length).padStart(2, '0') + '</b>' +
        ACC_CHEV;
      head.addEventListener('click', () => {
        const open = !sec.classList.contains('is-open');
        openMoodSet(open ? set.kind : '');
      });
      sec.appendChild(head);
      const body = document.createElement('div');
      body.className = 'mood-set-body';
      const inner = document.createElement('div');
      inner.className = 'mood-set-body-inner';
      const grid = document.createElement('div');
      grid.className = 'mood-grid' + (set.kind === 'dream' ? ' mood-grid-dream' : '');
      set.keys.forEach((key) => {
        grid.appendChild(makeMoodTile(key, meta[key]));
      });
      inner.appendChild(grid);
      body.appendChild(inner);
      sec.appendChild(body);
      wrap.appendChild(sec);
      UI.moodSets[set.kind] = { el: sec, head, grid };
    });
    setMoodSetOpen('street', true);
  }

  UI.setMood = function (name) {
    const meta = (WP.MOODS || {})[name];
    if (!meta) return;
    const active = UI.els.moodGrid.querySelector('.mood[data-mood="' + name + '"]');
    const cards = UI.els.moodGrid.querySelectorAll('.mood');
    for (let i = 0; i < cards.length; i++) {
      const on = cards[i] === active;
      cards[i].classList.toggle('is-active', on);
      cards[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (active) {
      const set = active.closest('.mood-set');
      const kind = set && set.classList.contains('mood-set-dream') ? 'dream' : 'street';
      if (!set || !set.classList.contains('is-open')) openMoodSet(kind);
    }
    document.body.dataset.mood = name;
    document.documentElement.style.setProperty('--mood-a', meta.thumb[0]);
    document.documentElement.style.setProperty('--mood-b', meta.thumb[1]);
    const order = WP.MOOD_ORDER || [];
    const idx = Math.max(0, order.indexOf(name));
    if (UI.els.moodMeterFill) UI.els.moodMeterFill.style.width = (((idx + 1) / Math.max(1, order.length)) * 100).toFixed(1) + '%';
    if (UI.els.moodMeterNo) UI.els.moodMeterNo.textContent = String(idx + 1).padStart(2, '0');
    const quote = UI.els.moodQuote;
    quote.classList.add('swap');
    clearTimeout(UI.quoteTimer);
    UI.quoteTimer = setTimeout(() => {
      quote.textContent = meta.quote;
      quote.classList.remove('swap');
    }, 260);
    UI.els.weatherText.textContent = WEATHER[name] || '';
    if (UI.els.weatherDot) {
      UI.els.weatherDot.style.background = meta.thumb[0];
      UI.els.weatherDot.style.boxShadow = '0 0 8px ' + meta.thumb[0];
    }
    const dream = meta.kind === 'dream';
    document.body.classList.toggle('is-dreaming', dream);
    if (UI.els.relicHint) {
      UI.els.relicHint.classList.toggle('is-on', dream);
      if (dream && UI.els.relicHintText) {
        UI.els.relicHintText.textContent =
          (WP.Wonders && WP.Wonders.hint(name)) ||
          '茶几上多了一件当夜的信物 · 点一下试试';
      }
    }
    if (UI.soundOn && WP.Audio) WP.Audio.setMood(name);
  };

  /* ———————————————————— 陈设 ———————————————————— */
  function setObjGroupOpen(key, open) {
    const g = UI.objGroupEls[key];
    if (!g) return;
    g.el.classList.toggle('is-open', !!open);
    g.head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openObjGroup(key) {
    Object.keys(UI.objGroupEls).forEach((k) => setObjGroupOpen(k, k === key));
  }

  function updateGroupCount(key) {
    const g = UI.objGroupEls[key];
    if (!g) return;
    let on = 0;
    g.el.querySelectorAll('.obj').forEach((b) => {
      if (b.classList.contains('is-on')) on++;
    });
    g.count.textContent = on + ' / ' + g.total;
  }

  UI.buildObjects = function (items) {
    const list = UI.els.objList;
    list.innerHTML = '';
    UI.objEls = {};
    UI.objGroupEls = {};
    UI.keyGroup = {};
    UI.total = 0;
    UI.onCount = 0;
    GROUPS.forEach((group) => {
      const g = document.createElement('section');
      g.className = 'obj-group';
      g.dataset.group = group.key;
      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'obj-group-head';
      head.setAttribute('aria-expanded', 'false');
      head.innerHTML =
        '<span class="obj-group-title">' + group.cn + '</span>' +
        '<em>' + group.en + '</em>' +
        '<b class="obj-group-count"></b>' +
        ACC_CHEV;
      head.addEventListener('click', () => {
        const open = !g.classList.contains('is-open');
        openObjGroup(open ? group.key : '');
      });
      g.appendChild(head);
      const body = document.createElement('div');
      body.className = 'obj-group-body';
      const inner = document.createElement('div');
      inner.className = 'obj-group-inner';
      const grid = document.createElement('div');
      grid.className = 'obj-grid';
      let groupTotal = 0;
      group.items.forEach((item) => {
        const on = !!(items && items[item.key]);
        groupTotal++;
        UI.total++;
        if (on) UI.onCount++;
        UI.keyGroup[item.key] = group.key;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'obj' + (on ? ' is-on' : '');
        b.dataset.key = item.key;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.title = item.name + ' · ' + item.en;
        b.innerHTML =
          '<span class="obj-ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + (ICONS[item.key] || '') + '</svg></span>' +
          '<span class="obj-name">' + item.name + '</span>' +
          '<span class="obj-switch" aria-hidden="true"></span>';
        b.addEventListener('click', () => {
          const next = !b.classList.contains('is-on');
          UI.setObject(item.key, next);
          if (UI.opts.onToggle) UI.opts.onToggle(item.key, next, item);
        });
        grid.appendChild(b);
        UI.objEls[item.key] = b;
      });
      inner.appendChild(grid);
      body.appendChild(inner);
      g.appendChild(body);
      list.appendChild(g);
      UI.objGroupEls[group.key] = { el: g, head, count: head.querySelector('.obj-group-count'), total: groupTotal };
    });
    openObjGroup('dolls');
    UI.updateCount();
  };

  UI.setObject = function (key, on) {
    const b = UI.objEls[key];
    if (!b) return;
    const was = b.classList.contains('is-on');
    b.classList.toggle('is-on', !!on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (was !== !!on) {
      UI.onCount += on ? 1 : -1;
      UI.updateCount();
    }
  };

  UI.updateCount = function () {
    UI.els.objCount.textContent = UI.onCount + ' / ' + UI.total;
    Object.keys(UI.objGroupEls).forEach(updateGroupCount);
  };

  /* ———————————————————— 时钟 ———————————————————— */
  function updateClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    UI.els.clockTime.textContent = hh + ':' + mm;
    UI.els.clockSec.textContent = ':' + ss;
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    UI.els.clockDate.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 · 周' + week;
  }

  /* ———————————————————— 声音 ———————————————————— */
  UI.setSound = function (on) {
    UI.soundOn = !!on;
    UI.els.soundBtn.classList.toggle('is-on', UI.soundOn);
    UI.els.hudSound.classList.toggle('is-on', UI.soundOn);
    UI.els.soundBtn.setAttribute('aria-pressed', UI.soundOn ? 'true' : 'false');
    UI.els.soundState.textContent = UI.soundOn ? '开' : '关';
    if (WP.emit) WP.emit('sound', { on: UI.soundOn });
  };

  /* ———————————————————— 提示 ———————————————————— */
  UI.toast = function (html, ms) {
    const el = UI.els.toast;
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(UI.toastTimer);
    UI.toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, ms || 3400);
  };

  UI.tooltip = function (x, y, label, en) {
    const el = UI.els.tooltip;
    el.innerHTML = label + (en ? '<em>' + en + '</em>' : '');
    const right = x > window.innerWidth - 190;
    const bottom = y > window.innerHeight - 70;
    el.classList.toggle('flip', right);
    el.classList.toggle('up', bottom);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.classList.add('show');
  };

  UI.hideTooltip = function () {
    UI.els.tooltip.classList.remove('show');
  };

  /* ———————————————————— 面板 ———————————————————— */
  function togglePanel() {
    if (isMobile()) {
      document.body.classList.toggle('panel-open');
    } else {
      document.body.classList.toggle('panel-collapsed');
    }
  }

  function closePanel() {
    if (isMobile()) document.body.classList.remove('panel-open');
    else document.body.classList.add('panel-collapsed');
  }

  UI.setImmersion = function (on) {
    UI.immersed = !!on;
    document.body.classList.toggle('immersed', UI.immersed);
    if (UI.immersed) document.body.classList.remove('panel-open');
    UI.els.hudImmerse.setAttribute('aria-pressed', UI.immersed ? 'true' : 'false');
    if (WP.emit) WP.emit('immersion', { on: UI.immersed });
    if (UI.opts.onImmerse) UI.opts.onImmerse(UI.immersed);
  };

  function toggleImmersion() {
    UI.setImmersion(!UI.immersed);
  }

  /* ———————————————————— 关于 ———————————————————— */
  function openAbout() {
    UI.aboutOpen = true;
    UI.els.about.classList.add('open');
    UI.els.about.setAttribute('aria-hidden', 'false');
    const btn = UI.els.about.querySelector('.modal-close');
    if (btn) setTimeout(() => btn.focus({ preventScroll: true }), 60);
  }

  function closeAbout() {
    UI.aboutOpen = false;
    UI.els.about.classList.remove('open');
    UI.els.about.setAttribute('aria-hidden', 'true');
    if (UI.opts.onAboutClose) UI.opts.onAboutClose();
  }

  /* ———————————————————— 事件 ———————————————————— */
  function bind() {
    const opts = UI.opts;
    const soundToggle = () => {
      if (opts.onSoundToggle) opts.onSoundToggle();
    };
    UI.els.soundBtn.addEventListener('click', soundToggle);
    UI.els.hudSound.addEventListener('click', soundToggle);
    UI.els.immerseBtn.addEventListener('click', toggleImmersion);
    UI.els.hudImmerse.addEventListener('click', toggleImmersion);
    UI.els.aboutBtn.addEventListener('click', openAbout);
    UI.els.hudAbout.addEventListener('click', openAbout);
    UI.els.panelToggle.addEventListener('click', togglePanel);
    UI.els.collapseBtn.addEventListener('click', closePanel);
    if (UI.els.immersionHint) {
      UI.els.immersionHint.addEventListener('click', () => UI.setImmersion(false));
    }

    UI.els.about.querySelectorAll('[data-close="about"]').forEach((el) => {
      el.addEventListener('click', closeAbout);
    });

    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (WP.Music && WP.Music.isModalOpen && WP.Music.isModalOpen()) { WP.Music.closeModal(); return; }
        if (UI.aboutOpen) { closeAbout(); return; }
        if (UI.immersed) { UI.setImmersion(false); return; }
        if (document.body.classList.contains('panel-open')) {
          document.body.classList.remove('panel-open');
        }
        return;
      }
      if (UI.aboutOpen) return;
      if (e.key === '[' || e.key === ']') {
        const order = WP.MOOD_ORDER || [];
        if (!order.length) return;
        const curr = document.body.dataset.mood || order[0];
        const at = Math.max(0, order.indexOf(curr));
        const next = (at + (e.key === ']' ? 1 : -1) + order.length) % order.length;
        if (opts.onMood) opts.onMood(order[next]);
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
        const order = WP.MOOD_ORDER || [];
        if (order[idx] && opts.onMood) opts.onMood(order[idx]);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'm') { soundToggle(); return; }
      if (k === 'p') { if (opts.onMusicToggle) opts.onMusicToggle(); return; }
      if (k === 'h') { toggleImmersion(); return; }
      if (k === 'c') { togglePanel(); return; }
      if (e.key === '?' || k === '/') { openAbout(); }
    });

    window.addEventListener('resize', () => {
      if (!isMobile()) document.body.classList.remove('panel-open');
    });
  }

  /* ———————————————————— 载入 ———————————————————— */
  UI.setLoading = function (p, label) {
    if (!UI.els.loading) return;
    const pct = Math.max(0, Math.min(1, p));
    UI.els.loadingBar.style.width = (pct * 100).toFixed(1) + '%';
    UI.els.loadingPct.textContent = String(Math.round(pct * 100)).padStart(2, '0');
    if (label) UI.els.loadingLabel.textContent = label;
  };

  UI.finishLoading = function () {
    if (UI.els.loading) UI.els.loading.classList.add('done');
    document.body.classList.add('ready');
  };

  WP.UI = UI;
})();
