/* 窗畔 · 外部桥
   给「把窗畔嵌进别的项目」留的一层薄壳：只读取房间状态、只调用已有接口，
   不碰渲染、不改陈设逻辑。默认只信任同源父页面；跨域时用 ?parentOrigin= 指定。

   使用方式（详见 docs/LUMINA-BRIDGE.md）：
     <iframe src="…/index.html?embed=1&ui=0&mood=dusk&sound=off"></iframe>
     iframe.contentWindow.postMessage({ type: 'windowlight:command', command: 'mood.next' }, origin)
*/
(function () {
  'use strict';
  window.WP = window.WP || {};

  const VERSION = '1.0.0';
  const Q = new URLSearchParams(window.location.search);
  const EMBEDDED = Q.get('embed') === '1' || window.parent !== window;
  const HIDE_UI = /^(0|off|none|no)$/i.test(Q.get('ui') || '');
  const QUIET = /^(0|off|none|no)$/i.test(Q.get('toast') || '');

  let allowedOrigins;
  const parentOriginParam = Q.get('parentOrigin');
  if (parentOriginParam) {
    allowedOrigins = parentOriginParam.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (/^https?:$/.test(window.location.protocol)) {
    allowedOrigins = [window.location.origin];
  } else {
    allowedOrigins = ['*'];
  }
  const allowAnyOrigin = allowedOrigins.indexOf('*') >= 0;
  /* 状态里只有房间与唱片名，不含私人数据；跨域未声明 parentOrigin 时用 * 广播，命令仍只收同源 */
  const stateTargets = parentOriginParam ? (allowAnyOrigin ? ['*'] : allowedOrigins) : ['*'];

  if (EMBEDDED) document.body.classList.add('is-embedded');
  if (HIDE_UI) document.body.classList.add('is-embed-bare');
  if (QUIET) document.body.classList.add('is-embed-quiet');

  let ready = false;
  let initialApplied = false;
  let broadcastTimer = 0;

  function meta() {
    const street = window.WP.APP && WP.APP.street;
    const mood = street ? street.mood : null;
    const m = mood && WP.MOODS ? WP.MOODS[mood] : null;
    return {
      mood,
      label: m ? m.label : null,
      en: m ? m.en : null,
      no: m ? m.no : null,
      kind: m && m.kind ? m.kind : 'street',
      quote: m ? m.quote || '' : ''
    };
  }

  function objects() {
    const out = {};
    const app = WP.APP;
    if (!app || !app.furniture) return out;
    Object.keys(app.furniture).forEach((key) => {
      const item = app.furniture[key];
      out[key] = !!(item && item.on && item.group && item.group.visible);
    });
    return out;
  }

  function audioEl() {
    return document.querySelector('audio[data-windowlight-audio]');
  }

  function music() {
    if (!WP.Music) return { count: 0, playing: false, title: null, artist: null, duration: 0, currentTime: 0, modalOpen: false };
    const cur = WP.Music.current ? WP.Music.current() : null;
    const a = audioEl();
    return {
      count: WP.Music.list ? WP.Music.list().length : 0,
      playing: !!(WP.Music.isPlaying && WP.Music.isPlaying()),
      title: cur ? cur.title : null,
      artist: cur ? cur.artist : null,
      builtin: cur ? !!cur.builtin : false,
      duration: a && isFinite(a.duration) ? +a.duration.toFixed(2) : 0,
      currentTime: a && isFinite(a.currentTime) ? +a.currentTime.toFixed(2) : 0,
      modalOpen: !!(WP.Music.isModalOpen && WP.Music.isModalOpen())
    };
  }

  function getState() {
    return {
      ready,
      version: VERSION,
      embedded: EMBEDDED,
      ...meta(),
      sound: !!(WP.UI && WP.UI.soundOn),
      immersion: !!(WP.UI && WP.UI.immersed),
      objects: objects(),
      music: music()
    };
  }

  function post(message) {
    if (window.parent === window) return;
    stateTargets.forEach((origin) => {
      try {
        window.parent.postMessage(message, origin);
      } catch (e) {
        /* 父页面已经关掉，或 origin 不再匹配 */
      }
    });
  }

  function broadcast(reason) {
    if (!ready) return;
    const state = getState();
    post({ type: 'windowlight:state', reason: reason || 'change', state });
    try {
      window.dispatchEvent(new CustomEvent('windowlight:state', { detail: state }));
    } catch (e) { /* 老浏览器忽略 */ }
  }

  function scheduleBroadcast(reason) {
    clearTimeout(broadcastTimer);
    broadcastTimer = setTimeout(() => broadcast(reason), 110);
  }

  function setSound(on) {
    if (!WP.Audio) return;
    if (on) {
      if (!WP.Audio.isOn() && WP.setSound) WP.setSound(true);
    } else if (WP.Audio.isOn() && WP.setSound) {
      WP.setSound(false);
    }
  }

  function setImmersion(on) {
    if (WP.setImmersion) WP.setImmersion(!!on);
  }

  function truthy(value) {
    if (typeof value === 'string') return /^(1|on|true|yes|play)$/i.test(value);
    return !!value;
  }

  function applyObjectSpec(raw) {
    let token = String(raw || '').trim();
    if (!token) return;
    let on = true;
    if (token[0] === '-') {
      on = false;
      token = token.slice(1);
    } else if (token[0] === '+') {
      on = true;
      token = token.slice(1);
    }
    const sep = token.search(/[:=]/);
    if (sep >= 0) {
      const value = token.slice(sep + 1).toLowerCase();
      token = token.slice(0, sep);
      if (/^(0|off|false|no|hide)$/.test(value)) on = false;
      else if (/^(1|on|true|yes|show)$/.test(value)) on = true;
    }
    if (WP.APP && WP.APP.furniture && WP.APP.furniture[token] && WP.setObject) {
      WP.setObject(token, on);
    }
  }

  function shiftMood(dir) {
    if (!WP.MOOD_ORDER || !WP.APP || !WP.APP.street) return;
    const order = WP.MOOD_ORDER;
    const now = order.indexOf(WP.APP.street.mood);
    const next = order[(now + dir + order.length) % order.length];
    if (WP.setMood) WP.setMood(next);
  }

  function command(name, payload) {
    const key = String(name || '').trim();
    switch (key) {
      case 'state':
      case 'getState':
        return { ok: true, state: getState() };

      case 'setMood':
      case 'mood.set': {
        const mood = typeof payload === 'string' ? payload : payload && (payload.mood || payload.name);
        if (mood && WP.MOOD_ORDER && WP.MOOD_ORDER.indexOf(mood) >= 0 && WP.setMood) {
          WP.setMood(mood);
          scheduleBroadcast('mood');
          return { ok: true, state: getState() };
        }
        return { ok: false, error: 'unknown-mood', state: getState() };
      }
      case 'mood.next':
        shiftMood(1);
        scheduleBroadcast('mood');
        return { ok: true, state: getState() };
      case 'mood.prev':
        shiftMood(-1);
        scheduleBroadcast('mood');
        return { ok: true, state: getState() };

      case 'setObject': {
        const data = payload || {};
        if (data.key && WP.setObject && WP.APP && WP.APP.furniture[data.key]) {
          WP.setObject(data.key, data.on === undefined ? true : !!data.on);
          scheduleBroadcast('object');
          return { ok: true, state: getState() };
        }
        return { ok: false, error: 'unknown-object', state: getState() };
      }
      case 'setObjects': {
        if (payload && typeof payload === 'object') {
          Object.keys(payload).forEach((k) => {
            if (WP.APP && WP.APP.furniture[k] && WP.setObject) WP.setObject(k, !!payload[k]);
          });
          scheduleBroadcast('object');
          return { ok: true, state: getState() };
        }
        return { ok: false, error: 'bad-payload', state: getState() };
      }

      case 'setSound':
        setSound(truthy(payload));
        scheduleBroadcast('sound');
        return { ok: true, state: getState() };
      case 'setImmersion':
        setImmersion(truthy(payload));
        scheduleBroadcast('immersion');
        return { ok: true, state: getState() };

      case 'music.play':
        if (WP.Music && WP.Music.play) WP.Music.play();
        scheduleBroadcast('music');
        return { ok: true, state: getState() };
      case 'music.pause':
        if (WP.Music && WP.Music.pause) WP.Music.pause();
        scheduleBroadcast('music');
        return { ok: true, state: getState() };
      case 'music.toggle':
        if (WP.Music && WP.Music.toggle) WP.Music.toggle();
        scheduleBroadcast('music');
        return { ok: true, state: getState() };
      case 'music.next':
        if (WP.Music && WP.Music.next) WP.Music.next();
        scheduleBroadcast('music');
        return { ok: true, state: getState() };
      case 'music.restore':
        if (WP.Music && WP.Music.restoreBuiltin) WP.Music.restoreBuiltin();
        scheduleBroadcast('music');
        return { ok: true, state: getState() };
      case 'music.open':
        if (WP.Music && WP.Music.openModal) WP.Music.openModal();
        scheduleBroadcast('music');
        return { ok: true, state: getState() };
      case 'music.close':
        if (WP.Music && WP.Music.closeModal) WP.Music.closeModal();
        scheduleBroadcast('music');
        return { ok: true, state: getState() };

      default:
        return { ok: false, error: 'unknown-command', command: key, state: getState() };
    }
  }

  function originAllowed(origin) {
    if (allowAnyOrigin) return true;
    return allowedOrigins.indexOf(origin) >= 0;
  }

  function applyInitial() {
    if (initialApplied) return;
    initialApplied = true;
    const app = WP.APP;

    if (/^(0|off|no)$/i.test(Q.get('intro') || '') && app && app.clock) {
      app.startedAt = app.clock.elapsedTime - 20;
    }

    const mood = Q.get('mood');
    if (mood && WP.MOOD_ORDER && WP.MOOD_ORDER.indexOf(mood) >= 0 && WP.setMood) {
      WP.setMood(mood);
    }

    const specs = Q.getAll('object').slice();
    const many = Q.get('objects');
    if (many) many.split(',').forEach((s) => specs.push(s));
    specs.forEach(applyObjectSpec);

    const sound = Q.get('sound');
    if (sound !== null) setSound(truthy(sound));

    const musicParam = Q.get('music');
    if (musicParam !== null) {
      if (/^(play|on|1)$/i.test(musicParam)) {
        if (WP.Music && WP.Music.play) {
          try { WP.Music.play(); } catch (e) { /* 没有用户手势时浏览器会拒绝，交给父页面点击后再发命令 */ }
        }
      } else if (/^(pause|off|0)$/i.test(musicParam)) {
        if (WP.Music && WP.Music.pause) WP.Music.pause();
      }
    }
  }

  function onAppReady() {
    if (ready) return;
    ready = true;
    applyInitial();
    /* 等一帧，让初始 mood / 声音的状态落到 UI 上 */
    setTimeout(() => {
      broadcast('ready');
      post({ type: 'windowlight:ready', state: getState() });
      try {
        window.dispatchEvent(new CustomEvent('windowlight:ready', { detail: getState() }));
      } catch (e) { /* 老浏览器忽略 */ }
    }, 80);
  }

  window.addEventListener('message', (event) => {
    if (window.parent === window || event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'windowlight:command' && data.type !== 'windowlight') return;
    if (!originAllowed(event.origin)) return;
    const name = data.command || data.action || data.name;
    if (!name) return;
    const payload = data.payload !== undefined ? data.payload : data.value;
    const result = command(name, payload);
    if (data.id !== undefined) {
      post({ type: 'windowlight:result', id: data.id, result });
    }
  });

  ['mood', 'object', 'music', 'sound', 'immersion'].forEach((type) => {
    window.addEventListener('windowlight:' + type, () => scheduleBroadcast(type));
  });

  const api = {
    version: VERSION,
    isEmbedded: EMBEDDED,
    onAppReady,
    ready: function () { return ready; },
    command,
    getState
  };
  WP.Bridge = api;

  /* 万一 bridge.js 晚于 boot 载入（比如被单独注入），把 ready 补上 */
  if (!ready && document.body.classList.contains('ready') && WP.APP && WP.APP.running) {
    onAppReady();
  }
})();
