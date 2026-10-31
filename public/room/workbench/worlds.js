/* 窗畔 · 三界之门
   茶几旁的钥匙对应三个独立项目：星潮 / 林间小屋 / 余晖。
   选一个世界，它会在一整扇独立窗口里醒来；回来时，房间还停在原处。 */
(function () {
  'use strict';
  window.WB = window.WB || {};
  const WB = window.WB;
  if (WB.worlds) return;

  const WORLDS = {
    astral: {
      key: 'astral',
      title: '星潮',
      en: 'ASTRAL TIDE',
      sub: '夜海与星盘，四幕潮汐',
      note: '拖一拖环，看星盘慢慢转过来。',
      src: 'worlds/astral/index.html',
      thumb: 'workbench/thumbs/astral.jpg',
      accent: '#9fc3de'
    },
    cabin: {
      key: 'cabin',
      title: '林间小屋',
      en: 'A CABIN IN THE WOODS',
      sub: '风把松针吹得很轻',
      note: '晴天、落雨、下雪与黄昏，都在这间屋外。',
      src: 'worlds/cabin/index.html',
      thumb: 'workbench/thumbs/cabin.jpg',
      accent: '#c8a878'
    },
    afterglow: {
      key: 'afterglow',
      title: '余晖',
      en: 'AFTERGLOW',
      sub: '宇宙关灯前的最后一份档案',
      note: '最后一点光熄灭之前，保管好五样东西。',
      src: 'worlds/afterglow/' + encodeURIComponent('余晖_AFTERGLOW.html'),
      thumb: 'workbench/thumbs/afterglow.jpg',
      accent: '#e0a06b'
    }
  };
  const ORDER = ['astral', 'cabin', 'afterglow'];
  const FILE_WARNING =
    '你现在是以文件方式打开的这份页面。三个世界需要本地服务器才能载入，' +
    '请双击交付文件夹里的「启动.py」，再用浏览器打开它给出的地址。';

  const esc = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  const root = document.createElement('div');
  root.className = 'wbw';
  root.id = 'wbWorlds';
  root.hidden = true;
  root.innerHTML =
    '<div class="wbw-chooser">' +
      '<div class="wbw-scrim" data-wbw="close"></div>' +
      '<section class="wbw-card" role="dialog" aria-modal="true" aria-labelledby="wbwChooseTitle">' +
        '<header class="wbw-head">' +
          '<div>' +
            '<p class="wbw-kicker">THE THREE DOORS · 茶几旁的世界钥匙</p>' +
            '<h2 id="wbwChooseTitle">请选择不同的世界</h2>' +
            '<p class="wbw-lede">三扇门都从这里打开。每个世界自成一体，回来时，窗畔还停在刚才那一束光里。</p>' +
          '</div>' +
          '<button type="button" class="wbw-close" data-wbw="close" aria-label="回到窗畔">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
          '</button>' +
        '</header>' +
        '<div class="wbw-grid" id="wbwGrid"></div>' +
        '<footer class="wbw-foot">' +
          '<span>离开房间时，窗畔的环境声与唱片会暂时停下；回来时再响起来。</span>' +
          '<span class="wbw-protocol" id="wbwProtocol" hidden>' + FILE_WARNING + '</span>' +
        '</footer>' +
      '</section>' +
    '</div>' +
    '<div class="wbw-stage" hidden>' +
      '<div class="wbw-frame-wrap" id="wbwFrameWrap"></div>' +
      '<div class="wbw-loading" id="wbwLoading">' +
        '<span class="wbw-spinner" aria-hidden="true"></span>' +
        '<p class="wbw-loading-text" id="wbwLoadingText">正在穿过门</p>' +
      '</div>' +
      '<header class="wbw-bar">' +
        '<button type="button" class="wbw-back" data-wbw="back" aria-label="回到窗畔">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.4 6.5 8.4 12l6 5.5"/></svg>' +
          '<span>回到窗畔</span>' +
        '</button>' +
        '<p class="wbw-now"><b id="wbwNowTitle">—</b><span id="wbwNowEn">—</span></p>' +
        '<button type="button" class="wbw-switch" data-wbw="choose">换一个世界</button>' +
      '</header>' +
    '</div>';

  const chooser = root.querySelector('.wbw-chooser');
  const stage = root.querySelector('.wbw-stage');
  const grid = root.querySelector('#wbwGrid');
  const frameWrap = root.querySelector('#wbwFrameWrap');
  const loading = root.querySelector('#wbwLoading');
  const loadingText = root.querySelector('#wbwLoadingText');
  const nowTitle = root.querySelector('#wbwNowTitle');
  const nowEn = root.querySelector('#wbwNowEn');
  const protocolNote = root.querySelector('#wbwProtocol');

  grid.innerHTML = ORDER.map((key, index) => {
    const w = WORLDS[key];
    return (
      '<button type="button" class="wbw-world" data-world="' + key + '" style="--accent: ' + w.accent + '">' +
        '<span class="wbw-thumb">' +
          '<img src="' + esc(w.thumb) + '" alt="' + esc(w.title) + '的世界" loading="lazy" />' +
          '<span class="wbw-no">0' + (index + 1) + '</span>' +
          '<span class="wbw-veil"></span>' +
          '<span class="wbw-enter">进入世界' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.6 12h15M14.4 6.8 19.6 12l-5.2 5.2"/></svg>' +
          '</span>' +
        '</span>' +
        '<span class="wbw-meta">' +
          '<span class="wbw-names"><b>' + esc(w.title) + '</b><em>' + esc(w.en) + '</em></span>' +
          '<span class="wbw-sub">' + esc(w.sub) + '</span>' +
        '</span>' +
      '</button>'
    );
  }).join('');

  let currentKey = null;
  let iframe = null;
  let loadTimer = 0;
  let wasAudioOn = false;
  let wasMusicPlaying = false;
  let restoreFocus = null;
  let openAt = 0;

  function isOpen() {
    return !root.hidden;
  }

  function suspendRoom() {
    if (WB.ui && typeof WB.ui.flushNotes === 'function') WB.ui.flushNotes();
    if (window.WP && WP.setSuspended) WP.setSuspended(true);
    document.body.classList.add('wb-world-open');
  }

  function resumeRoom() {
    if (window.WP && WP.setSuspended) WP.setSuspended(false);
    document.body.classList.remove('wb-world-open');
  }

  function quietRoom() {
    wasAudioOn = !!(window.WP && WP.Audio && WP.Audio.isOn());
    wasMusicPlaying = !!(window.WP && WP.Music && WP.Music.isPlaying && WP.Music.isPlaying());
    if (window.WP && WP.Audio && WP.Audio.isOn()) WP.Audio.click();
    if (wasMusicPlaying) WP.Music.pause();
    if (wasAudioOn) {
      WP.Audio.disable();
      if (WP.UI && WP.UI.setSound) WP.UI.setSound(false);
    }
  }

  function wakeRoom() {
    if (wasAudioOn && window.WP && WP.Audio) {
      const ok = WP.Audio.enable();
      if (WP.UI && WP.UI.setSound) WP.UI.setSound(ok);
    }
    if (wasMusicPlaying && window.WP && WP.Music) WP.Music.play();
    wasAudioOn = false;
    wasMusicPlaying = false;
  }

  function destroyFrame() {
    clearTimeout(loadTimer);
    loadTimer = 0;
    if (iframe) {
      try {
        iframe.src = 'about:blank';
      } catch (e) { /* 忽略 */ }
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }
    iframe = null;
    currentKey = null;
    frameWrap.innerHTML = '';
  }

  function showChooser(withStage) {
    if (withStage) {
      stage.hidden = true;
      destroyFrame();
    }
    chooser.hidden = false;
    loading.hidden = true;
    const first = grid.querySelector('.wbw-world');
    setTimeout(() => {
      if (first) first.focus({ preventScroll: true });
    }, 120);
  }

  function open() {
    if (isOpen()) return;
    openAt = Date.now();
    restoreFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('wb-world-open');
    if (!stage.hidden) stage.hidden = true;
    chooser.hidden = false;
    loading.hidden = true;
    protocolNote.hidden = location.protocol !== 'file:';
    suspendRoom();
    quietRoom();
    requestAnimationFrame(() => {
      root.classList.add('is-open');
      const first = grid.querySelector('.wbw-world');
      if (first) first.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!isOpen()) return;
    root.classList.remove('is-open');
    const finish = () => {
      root.hidden = true;
      stage.hidden = true;
      chooser.hidden = false;
      destroyFrame();
      resumeRoom();
      wakeRoom();
      chooser.scrollTop = 0;
      if (restoreFocus && typeof restoreFocus.focus === 'function') {
        try { restoreFocus.focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
      }
      restoreFocus = null;
    };
    if (Date.now() - openAt < 60) finish();
    else setTimeout(finish, 220);
  }

  function enter(key) {
    const world = WORLDS[key];
    if (!world) return;
    if (!isOpen()) open();
    suspendRoom();

    if (currentKey === key && iframe) {
      chooser.hidden = true;
      stage.hidden = false;
      loading.hidden = true;
      return;
    }

    destroyFrame();
    currentKey = key;
    chooser.hidden = true;
    stage.hidden = false;
    nowTitle.textContent = world.title;
    nowEn.textContent = world.en;
    loading.hidden = false;
    loading.classList.remove('is-failed');
    loadingText.textContent = '正在穿过门 · ' + world.title;

    if (location.protocol === 'file:') {
      loading.classList.add('is-failed');
      loadingText.textContent = FILE_WARNING;
      return;
    }

    iframe = document.createElement('iframe');
    iframe.className = 'wbw-frame';
    iframe.title = world.title;
    iframe.setAttribute('allow', 'autoplay; fullscreen; gamepad; accelerometer; gyroscope');
    iframe.addEventListener('load', () => {
      if (!iframe) return;
      try {
        if (iframe.contentWindow.location.href === 'about:blank') return;
      } catch (e) { /* 跨域文档读不到地址时视为已抵达 */ }
      clearTimeout(loadTimer);
      loading.hidden = true;
    });
    frameWrap.appendChild(iframe);
    iframe.src = world.src;

    loadTimer = setTimeout(() => {
      if (!loading.hidden) {
        loading.classList.add('is-failed');
        loadingText.textContent = '这个世界醒得有点慢 · 可以再等一会儿，或者先回窗畔';
      }
    }, 25000);
  }

  root.addEventListener('click', (e) => {
    const worldBtn = e.target.closest('[data-world]');
    if (worldBtn) {
      enter(worldBtn.dataset.world);
      return;
    }
    const act = e.target.closest('[data-wbw]');
    if (!act) return;
    const action = act.dataset.wbw;
    if (action === 'close') close();
    else if (action === 'back') close();
    else if (action === 'choose') showChooser(true);
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen() || e.key !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!stage.hidden) {
      showChooser(true);
      stage.hidden = true;
    } else {
      close();
    }
  }, true);

  function mount() {
    const app = document.getElementById('app');
    if (!app || document.getElementById('wbWorlds')) return;
    app.appendChild(root);
  }

  mount();
  if (!root.parentNode) {
    window.addEventListener('DOMContentLoaded', mount);
  }

  WB.worlds = {
    isOpen,
    open,
    close,
    enter,
    choose: () => {
      if (!isOpen()) open();
      else showChooser(true);
    },
    get current() { return currentKey; },
    list: () => ORDER.map((k) => Object.assign({}, WORLDS[k]))
  };
})();
