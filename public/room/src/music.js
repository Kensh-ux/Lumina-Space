/* 窗畔 · 唱片柜：真实播放、导入、删除与恢复内置唱片
   文件只留在这台设备的 IndexedDB 里；歌单元数据留在 localStorage */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U || { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };

  const LIST_KEY = 'windowlight.music.v1';
  const CURRENT_KEY = 'windowlight.music.current';
  const HIDDEN_KEY = 'windowlight.music.hidden';
  const BUNDLE_MANIFEST = 'assets/music/library.json';
  const DB_NAME = 'windowlight-music';
  const DB_STORE = 'blobs';
  const MAX_BYTES = 60 * 1024 * 1024;

  const BUILTIN = {
    id: 'builtin-sea-of-cloud',
    builtin: true,
    title: 'Sea of Cloud',
    artist: 'Nujabes',
    fileName: 'Nujabes - Sea of Cloud.mp3',
    src: 'assets/music/Nujabes - Sea of Cloud.mp3',
    size: 7397985,
    type: 'audio/mpeg',
    duration: 0
  };

  const M = {
    list: [],
    library: [],
    index: -1,
    currentId: '',
    audio: null,
    urls: {},
    memory: {},
    playing: false,
    loading: false,
    loadToken: 0,
    hook: null,
    els: {},
    rows: {},
    deleteTimers: {},
    dbPromise: null,
    modalOpen: false,
    loaded: false
  };

  function $(id) { return document.getElementById(id); }

  function toast(html, ms) {
    if (WP.UI && WP.UI.toast) WP.UI.toast(html, ms || 2600);
  }

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      const value = JSON.parse(raw);
      return value == null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function persist() {
    try {
      const keep = M.list.filter((t) => !t.session);
      localStorage.setItem(LIST_KEY, JSON.stringify(keep));
      localStorage.setItem(CURRENT_KEY, M.currentId || '');
    } catch (e) {
      setTip('浏览器不允许保存歌单，刷新后会忘记这次的顺序', true);
    }
    /* 歌单增删、换片也要让父页面知道，桥接层只负责转发 */
    if (WP.emit) {
      try { WP.emit('music', { reason: 'list', count: M.list.length }); } catch (e) { /* ignore */ }
    }
  }

  function cloneBuiltin() {
    return Object.assign({}, BUILTIN);
  }

  function readHidden() {
    try {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((name) => typeof name === 'string') : [];
    } catch (e) {
      return [];
    }
  }

  function writeHidden(names) {
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(names || []));
    } catch (e) { /* 存不下就算了，下次启动会重新出现 */ }
  }

  function bundledTrack(entry) {
    const file = entry && typeof entry.file === 'string' ? entry.file : '';
    if (!file) return null;
    return {
      id: 'b_' + file,
      builtin: false,
      bundled: true,
      title: String(entry.title || file.replace(/\.[^.]+$/, '') || file).slice(0, 160),
      artist: String(entry.artist || '曲库').slice(0, 120),
      fileName: file,
      src: 'assets/music/' + encodeURIComponent(file).replace(/'/g, '%27'),
      size: Number(entry.size) || 0,
      type: '',
      duration: 0,
      missing: false
    };
  }

  function mergeLibrary(entries) {
    const hidden = new Set(readHidden());
    const present = new Set(M.list.map((t) => t.fileName).filter(Boolean));
    let added = 0;
    (entries || []).forEach((entry) => {
      const track = bundledTrack(entry);
      if (!track || hidden.has(track.fileName) || present.has(track.fileName)) return;
      M.list.push(track);
      present.add(track.fileName);
      added++;
    });
    if (!added) return 0;
    if (!M.list.some((t) => t.id === M.currentId)) {
      M.index = 0;
      M.currentId = M.list[0].id;
    }
    persist();
    renderList();
    updateNowPlaying();
    return added;
  }

  function loadLibrary() {
    if (!window.fetch) return Promise.resolve(0);
    return fetch(BUNDLE_MANIFEST, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const entries = Array.isArray(data) ? data : (data && Array.isArray(data.tracks) ? data.tracks : []);
        M.library = entries.filter((entry) => entry && typeof entry.file === 'string');
        return mergeLibrary(M.library);
      })
      .catch(() => {
        M.library = [];
        return 0;
      });
  }

  function loadList() {
    let saved = null;
    try {
      saved = localStorage.getItem(LIST_KEY);
    } catch (e) {
      saved = null;
    }
    if (saved === null) {
      M.list = [cloneBuiltin()];
      M.index = 0;
      M.currentId = BUILTIN.id;
      persist();
      return;
    }
    const parsed = safeParse(saved, []);
    if (!Array.isArray(parsed)) {
      M.list = [cloneBuiltin()];
    } else {
      M.list = parsed
        .filter((t) => t && typeof t.id === 'string' && typeof t.title === 'string')
        .map((t) => ({
          id: t.id,
          builtin: !!t.builtin,
          bundled: !!t.bundled,
          title: String(t.title).slice(0, 160),
          artist: String(t.artist || '未知唱片').slice(0, 120),
          fileName: String(t.fileName || ''),
          src: t.builtin ? BUILTIN.src : (t.bundled ? String(t.src || '') : ''),
          blobKey: t.blobKey || '',
          size: Number(t.size) || 0,
          type: t.type || '',
          duration: Number(t.duration) || 0,
          missing: !!t.missing
        }));
    }
    if (!M.list.length) {
      M.index = -1;
      M.currentId = '';
      return;
    }
    let savedId = '';
    try {
      savedId = localStorage.getItem(CURRENT_KEY) || '';
    } catch (e) {
      savedId = '';
    }
    const found = M.list.findIndex((t) => t.id === savedId);
    M.index = found >= 0 ? found : 0;
    M.currentId = M.list[M.index].id;
  }

  function currentTrack() {
    if (M.index < 0 || M.index >= M.list.length) return null;
    return M.list[M.index];
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec <= 0) return '0:00';
    const s = Math.floor(sec);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* ———————————————————— IndexedDB ———————————————————— */
  function openDB() {
    if (M.dbPromise) return M.dbPromise;
    M.dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('no-indexeddb'));
        return;
      }
      let req;
      try {
        req = indexedDB.open(DB_NAME, 1);
      } catch (e) {
        reject(e);
        return;
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('db-error'));
      req.onblocked = () => reject(new Error('db-blocked'));
    }).catch((err) => {
      M.dbPromise = null;
      throw err;
    });
    return M.dbPromise;
  }

  function idbPut(key, blob) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('put-failed'));
      tx.onabort = () => reject(tx.error || new Error('put-aborted'));
    }));
  }

  function idbGet(key) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('get-failed'));
    }));
  }

  function idbDelete(key) {
    if (!key) return Promise.resolve();
    return openDB().then((db) => new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    })).catch(() => {});
  }

  /* ———————————————————— 音频 ———————————————————— */
  function ensureAudio() {
    if (M.audio) return M.audio;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.72;
    audio.setAttribute('playsinline', '');
    audio.setAttribute('data-windowlight-audio', '');
    audio.style.display = 'none';
    if (document.body) document.body.appendChild(audio);
    audio.addEventListener('playing', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('ended', () => {
      if (M.list.length > 1) next(true);
      else setPlaying(false);
    });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('durationchange', () => {
      const t = currentTrack();
      if (t && isFinite(audio.duration) && audio.duration > 0) {
        t.duration = audio.duration;
        if (M.loaded) persist();
      }
      updateProgress();
      updateNowPlaying();
    });
    audio.addEventListener('error', () => {
      if (!audio.src) return;
      const t = currentTrack();
      if (t && !t.missing) {
        t.missing = true;
        renderList();
        updateNowPlaying();
        toast('这张唱片找不到了 · 可以在唱片柜里删掉它', 3200);
      }
      setPlaying(false);
    });
    M.audio = audio;
    return audio;
  }

  function releaseUrl(track) {
    const url = M.urls[track.id];
    if (url) {
      try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
      delete M.urls[track.id];
    }
  }

  function trackSource(track) {
    if (track.builtin || track.bundled) return Promise.resolve(track.src);
    if (M.memory[track.id]) {
      if (!M.urls[track.id]) M.urls[track.id] = URL.createObjectURL(M.memory[track.id]);
      return Promise.resolve(M.urls[track.id]);
    }
    if (!track.blobKey) return Promise.resolve('');
    if (M.urls[track.id]) return Promise.resolve(M.urls[track.id]);
    return idbGet(track.blobKey).then((blob) => {
      if (!blob) return '';
      M.urls[track.id] = URL.createObjectURL(blob);
      return M.urls[track.id];
    }).catch(() => '');
  }

  function loadAndPlay(track, autoplay) {
    const audio = ensureAudio();
    const token = ++M.loadToken;
    M.loading = true;
    updateNowPlaying();
    return trackSource(track).then((src) => {
      if (token !== M.loadToken) return false;
      if (!src) {
        track.missing = true;
        M.loading = false;
        renderList();
        updateNowPlaying();
        toast('这张唱片的文件不在这台设备上了', 3000);
        return false;
      }
      if (audio.src !== src) {
        audio.src = src;
        audio.load();
      }
      M.loading = false;
      updateNowPlaying();
      if (!autoplay) return true;
      return audio.play().then(() => true).catch((err) => {
        setPlaying(false);
        if (err && err.name === 'NotSupportedError') {
          toast('这台浏览器读不了这种格式 · 换一张唱片试试', 3200);
        } else {
          toast('播放被浏览器拦下了 · 再点一次播放键', 2600);
        }
        return false;
      });
    }).catch(() => {
      M.loading = false;
      toast('读取唱片时出了点问题', 2600);
      return false;
    });
  }

  function playIndex(index, autoplay) {
    if (!M.list.length) {
      setPlaying(false);
      updateNowPlaying();
      toast('唱片柜是空的 · 点封套放一张进来', 3000);
      openModal();
      return Promise.resolve(false);
    }
    M.index = ((index % M.list.length) + M.list.length) % M.list.length;
    const track = currentTrack();
    M.currentId = track.id;
    persist();
    renderList();
    updateNowPlaying();
    return loadAndPlay(track, autoplay !== false);
  }

  function setPlaying(playing) {
    const changed = M.playing !== playing;
    M.playing = !!playing;
    if (M.els.dock) M.els.dock.classList.toggle('is-playing', M.playing);
    if (M.els.toggle) {
      M.els.toggle.setAttribute('aria-label', M.playing ? '暂停' : '播放');
      M.els.toggle.setAttribute('aria-pressed', M.playing ? 'true' : 'false');
    }
    if (changed) {
      updateRowsPlaying();
      updateProgress();
      updateNowPlaying();
      if (M.hook) {
        try { M.hook({ playing: M.playing, track: currentTrack() }); } catch (e) { /* ignore */ }
      }
      if (WP.emit) WP.emit('music', { playing: M.playing, track: currentTrack() });
    }
  }

  function toggle() {
    ensureAudio();
    if (!M.list.length) {
      toast('唱片柜是空的 · 先放一张唱片进来', 2800);
      openModal();
      return false;
    }
    if (M.playing) {
      M.audio.pause();
      return false;
    }
    const track = currentTrack();
    if (!track) {
      return playIndex(0, true).then(() => M.playing);
    }
    if (M.audio.src && !M.audio.error) {
      M.audio.play().then(() => setPlaying(true)).catch(() => {
        loadAndPlay(track, true);
      });
      return true;
    }
    loadAndPlay(track, true);
    return true;
  }

  function pause() {
    if (M.audio && !M.audio.paused) M.audio.pause();
    setPlaying(false);
  }

  function next(autoplay) {
    if (!M.list.length) {
      toast('唱片柜是空的', 2000);
      return;
    }
    playIndex(M.index + 1, autoplay !== false);
  }

  /* ———————————————————— 界面同步 ———————————————————— */
  function updateNowPlaying() {
    const track = currentTrack();
    const title = M.els.title;
    const artist = M.els.artist;
    if (title) title.textContent = track ? track.title : (M.list.length ? '选一张唱片' : '唱片柜是空的');
    if (artist) {
      if (!track) artist.textContent = M.list.length ? 'Nujabes · 唱片柜' : '导入一首歌';
      else artist.textContent = track.artist + (track.builtin ? ' · 内置' : track.bundled ? ' · 曲库' : ' · 本地');
    }
    updateProgress();
    updateRowsPlaying();
    if (M.els.count) {
      M.els.count.textContent = M.list.length + ' 张唱片';
    }
    const restore = M.els.restore;
    if (restore) restore.disabled = M.list.some((t) => t.builtin);
    updateMediaSession();
    document.title = track && M.playing ? track.title + ' · 窗畔' : '窗畔 · By the Window';
  }

  function updateProgress() {
    const audio = M.audio;
    const fill = M.els.progressFill;
    const bar = M.els.progress;
    if (!fill || !bar) return;
    let ratio = 0;
    const duration = audio && isFinite(audio.duration) ? audio.duration : 0;
    if (duration > 0) ratio = U.clamp(audio.currentTime / duration, 0, 1);
    fill.style.width = (ratio * 100).toFixed(2) + '%';
    bar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    const track = currentTrack();
    const tip = M.els.tip;
    if (tip && !M.tipBusy) {
      tip.classList.remove('is-error');
      if (duration > 0) {
        tip.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(duration) + ' · 点击进度条可以快进';
      } else if (track && track.missing) {
        tip.classList.add('is-error');
        tip.textContent = '这张唱片找不到文件了 · 可以在右侧删掉它';
      } else if (!M.list.length) {
        tip.textContent = '柜子里暂时是空的，放一张进来吧。';
      }
    }
  }

  function updateRowsPlaying() {
    const current = currentTrack();
    const id = current ? current.id : '';
    Object.keys(M.rows).forEach((key) => {
      const row = M.rows[key];
      if (!row || !row.el) return;
      const isCurrent = key === id;
      row.el.classList.toggle('is-playing', isCurrent);
      row.el.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      if (row.play) {
        row.play.innerHTML = isCurrent && M.playing
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5v13M15 5.5v13"/></svg>'
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.8 18 12l-9.5 6.2z"/></svg>';
        if (isCurrent && M.playing) {
          row.play.querySelector('svg').style.fill = 'none';
          row.play.querySelector('svg').style.stroke = 'currentColor';
          row.play.querySelector('svg').style.strokeWidth = '1.6';
        }
      }
    });
  }

  function syncEmptyState() {
    const modal = M.els.modal;
    if (modal) modal.classList.toggle('is-empty', M.list.length === 0);
    if (M.els.list) M.els.list.style.display = M.list.length ? '' : 'none';
  }

  function rowSub(track, index) {
    const bits = [track.artist || '未知唱片'];
    if (track.builtin) bits.push('内置');
    else if (track.bundled) bits.push('曲库');
    else bits.push('本地');
    if (track.size) bits.push(formatSize(track.size));
    if (track.missing) bits.push('文件丢失');
    return bits.join(' · ');
  }

  function renderList() {
    const list = M.els.list;
    if (!list) return;
    list.innerHTML = '';
    M.rows = {};
    M.list.forEach((track, i) => {
      const row = document.createElement('div');
      row.className = 'music-row' + (track.missing ? ' is-missing' : '');
      row.dataset.id = track.id;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.tabIndex = 0;

      const no = document.createElement('span');
      no.className = 'music-row-no';
      no.textContent = String(i + 1).padStart(2, '0');

      const main = document.createElement('div');
      main.className = 'music-row-main';
      const title = document.createElement('span');
      title.className = 'music-row-title';
      title.textContent = track.title;
      const sub = document.createElement('span');
      sub.className = 'music-row-sub';
      sub.textContent = rowSub(track, i);
      main.appendChild(title);
      main.appendChild(sub);

      const play = document.createElement('span');
      play.className = 'music-row-play';
      play.setAttribute('aria-hidden', 'true');
      play.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8.5 5.8 18 12l-9.5 6.2z"/></svg>';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'music-row-del';
      del.textContent = '删除';
      del.setAttribute('aria-label', '删除 ' + track.title);
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        askDelete(track, del);
      });

      row.appendChild(no);
      row.appendChild(main);
      row.appendChild(play);
      row.appendChild(del);

      const activate = () => {
        if (track.id === M.currentId) {
          toggle();
          return;
        }
        playIndex(i, true);
      };
      row.addEventListener('click', activate);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });

      M.rows[track.id] = { el: row, play, sub, del };
      list.appendChild(row);
    });
    syncEmptyState();
    updateRowsPlaying();
  }

  function askDelete(track, btn) {
    clearTimeout(M.deleteTimers[track.id]);
    if (btn.classList.contains('is-confirm')) {
      btn.classList.remove('is-confirm');
      btn.textContent = '删除';
      deleteTrack(track);
      return;
    }
    btn.classList.add('is-confirm');
    btn.textContent = '再点一次';
    M.deleteTimers[track.id] = setTimeout(() => {
      btn.classList.remove('is-confirm');
      btn.textContent = '删除';
    }, 2800);
  }

  function deleteTrack(track) {
    const wasCurrent = track.id === M.currentId;
    const wasPlaying = M.playing;
    const index = M.list.findIndex((t) => t.id === track.id);
    if (index < 0) return;

    if ((track.bundled || track.builtin) && track.fileName) {
      const hidden = readHidden();
      if (hidden.indexOf(track.fileName) < 0) {
        hidden.push(track.fileName);
        writeHidden(hidden);
      }
    }

    releaseUrl(track);
    delete M.memory[track.id];
    if (track.blobKey) idbDelete(track.blobKey);
    M.list.splice(index, 1);

    if (wasCurrent) {
      pause();
      M.currentId = '';
      M.index = Math.min(index, M.list.length - 1);
      if (M.list.length) {
        const nextTrack = currentTrack();
        M.currentId = nextTrack.id;
        // 清掉旧音源，避免进度条停在上一张
        if (M.audio) {
          M.audio.pause();
          M.audio.removeAttribute('src');
          M.audio.load();
        }
        renderList();
        if (wasPlaying && M.list.length) loadAndPlay(nextTrack, true);
      } else {
        M.index = -1;
        if (M.audio) {
          M.audio.pause();
          M.audio.removeAttribute('src');
          M.audio.load();
        }
        renderList();
      }
    } else {
      if (index < M.index) M.index--;
      renderList();
    }
    persist();
    updateNowPlaying();
    syncEmptyState();
    setTip('唱片已经拿走 · 文件也从这台设备上删掉了');
    toast('唱片拿走了 · ' + track.title, 2000);
  }

  function restoreBuiltin() {
    const hadBuiltin = M.list.some((t) => t.builtin);
    if (!hadBuiltin) {
      const track = cloneBuiltin();
      M.list.unshift(track);
      if (M.index >= 0) M.index++;
      if (!M.currentId) {
        M.index = 0;
        M.currentId = track.id;
      }
    }
    writeHidden([]);
    const added = mergeLibrary(M.library);
    if (!hadBuiltin) {
      persist();
      renderList();
      updateNowPlaying();
    }
    if (added || !hadBuiltin) {
      setTip('内置曲库放回了柜子');
      toast('Sea of Cloud 与曲库回到了唱片柜', 2600);
    } else if (!M.library.length) {
      loadLibrary().then((count) => {
        if (count) toast('曲库同步好了 · 多了 ' + count + ' 张唱片', 2400);
        else toast('曲库文件夹暂时是空的', 2200);
      });
    } else {
      setTip('唱片柜里已经是完整的内置曲库');
      toast('一张都不少', 2000);
    }
  }

  function setTip(message, isError) {
    const tip = M.els.tip;
    if (!tip) return;
    tip.classList.toggle('is-error', !!isError);
    tip.textContent = message;
    M.tipBusy = true;
    clearTimeout(M.tipTimer);
    M.tipTimer = setTimeout(() => {
      M.tipBusy = false;
      updateProgress();
    }, 5200);
  }

  function probeDuration(blob, src) {
    return new Promise((resolve) => {
      const probe = new Audio();
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        resolve(value || 0);
        probe.removeAttribute('src');
        try { probe.load(); } catch (e) { /* ignore */ }
      };
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', () => finish(probe.duration));
      probe.addEventListener('error', () => finish(0));
      setTimeout(() => finish(0), 3500);
      try { probe.src = src; } catch (e) { finish(0); }
    });
  }

  function parseName(fileName) {
    const base = String(fileName || '未命名唱片').replace(/\.[^.]+$/, '');
    const parts = base.split(' - ');
    if (parts.length >= 2) {
      const artist = parts.shift().trim();
      const title = parts.join(' - ').trim();
      if (artist && title) return { artist, title };
    }
    return { artist: '本地唱片', title: base.trim() || '未命名唱片' };
  }

  function isAudioFile(file) {
    if (!file) return false;
    if (file.type && /^audio\//.test(file.type)) return true;
    return /\.(mp3|m4a|wav|ogg|oga|flac|aac|webm|opus)$/i.test(file.name || '');
  }

  function importFiles(files) {
    const picked = Array.prototype.slice.call(files || []);
    if (!picked.length) return;
    const valid = picked.filter((f) => {
      if (!isAudioFile(f)) return false;
      if (f.size > MAX_BYTES) {
        toast(f.name + ' 太大了 · 单曲不要超过 60 MB', 3400);
        return false;
      }
      return true;
    });
    if (!valid.length) {
      setTip('没有可导入的音频文件', true);
      return;
    }
    setTip('正在把 ' + valid.length + ' 张唱片放进柜子…');
    let inserted = 0;
    let sessionOnly = false;
    const firstWasEmpty = M.list.length === 0;

    const chain = valid.reduce((p, file) => p.then(async () => {
      const id = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
      const meta = parseName(file.name);
      const track = {
        id,
        builtin: false,
        title: meta.title.slice(0, 120),
        artist: meta.artist.slice(0, 96),
        fileName: file.name,
        blobKey: 'blob_' + id,
        size: file.size,
        type: file.type || '',
        duration: 0,
        missing: false,
        session: false
      };
      let stored = false;
      try {
        await idbPut(track.blobKey, file);
        stored = true;
      } catch (e) {
        stored = false;
      }
      if (!stored) {
        M.memory[id] = file;
        track.session = true;
        sessionOnly = true;
      }
      const url = URL.createObjectURL(file);
      track.duration = await probeDuration(file, url);
      URL.revokeObjectURL(url);
      M.list.push(track);
      inserted++;
      renderList();
      return null;
    }), Promise.resolve());

    chain.then(() => {
      if (!inserted) {
        setTip('没有唱片被放进来', true);
        return;
      }
      if (firstWasEmpty || M.currentId === '') {
        M.index = M.list.length - inserted;
        M.currentId = M.list[M.index].id;
        renderList();
      }
      persist();
      updateNowPlaying();
      setTip(
        '已放进 ' + inserted + ' 张唱片' + (sessionOnly ? ' · 本地存储不可用，只在本次会话有效' : ' · 只保存在这台设备上'),
        sessionOnly
      );
      toast('唱片柜里多了 ' + inserted + ' 张唱片', 2400);
    }).catch(() => {
      setTip('导入时出了点问题', true);
    });
  }

  /* ———————————————————— 弹层 ———————————————————— */
  function openModal() {
    const modal = M.els.modal;
    if (!modal) return;
    M.modalOpen = true;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    renderList();
    updateNowPlaying();
    const close = modal.querySelector('.modal-close');
    if (close) setTimeout(() => close.focus({ preventScroll: true }), 60);
  }

  function closeModal() {
    const modal = M.els.modal;
    if (!modal) return;
    M.modalOpen = false;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (M.els.open) M.els.open.focus({ preventScroll: true });
  }

  /* ———————————————————— 播放进度 ———————————————————— */
  function seekFromEvent(e) {
    const bar = M.els.progress;
    const audio = M.audio;
    if (!bar || !audio || !isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left);
    const ratio = U.clamp((x - rect.left) / Math.max(1, rect.width), 0, 1);
    audio.currentTime = ratio * audio.duration;
    updateProgress();
  }

  function bindProgress() {
    const bar = M.els.progress;
    if (!bar) return;
    let dragging = false;
    bar.addEventListener('pointerdown', (e) => {
      dragging = true;
      bar.setPointerCapture && bar.setPointerCapture(e.pointerId);
      seekFromEvent(e);
    });
    bar.addEventListener('pointermove', (e) => {
      if (dragging) seekFromEvent(e);
    });
    bar.addEventListener('pointerup', () => { dragging = false; });
    bar.addEventListener('pointercancel', () => { dragging = false; });
    bar.addEventListener('keydown', (e) => {
      const audio = M.audio;
      if (!audio || !isFinite(audio.duration)) return;
      if (e.key === 'ArrowRight') {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        updateProgress();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
        updateProgress();
        e.preventDefault();
      }
    });
  }

  /* ———————————————————— 初始化 ———————————————————— */
  function cacheEls() {
    M.els = {
      dock: $('musicDock'),
      open: $('musicDockOpen'),
      title: $('musicTitle'),
      artist: $('musicArtist'),
      progress: $('musicProgress'),
      progressFill: $('musicProgressFill'),
      toggle: $('musicToggle'),
      next: $('musicNext'),
      modal: $('musicModal'),
      list: $('musicList'),
      count: $('musicCount'),
      file: $('musicFile'),
      empty: $('musicEmpty'),
      tip: $('musicTip'),
      restore: $('musicRestore')
    };
  }

  function bind() {
    if (M.els.open) M.els.open.addEventListener('click', openModal);
    if (M.els.toggle) M.els.toggle.addEventListener('click', toggle);
    if (M.els.next) M.els.next.addEventListener('click', () => next(true));
    if (M.els.file) {
      M.els.file.addEventListener('change', (e) => {
        importFiles(e.target.files);
        e.target.value = '';
      });
    }
    if (M.els.restore) M.els.restore.addEventListener('click', restoreBuiltin);
    const modal = M.els.modal;
    if (modal) {
      modal.querySelectorAll('[data-close="music"]').forEach((el) => {
        el.addEventListener('click', closeModal);
      });
    }
    bindProgress();
    document.addEventListener('keydown', (e) => {
      if (!M.modalOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    });
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    const track = currentTrack();
    try {
      if (track) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: '窗畔 · 唱片柜'
        });
      }
      navigator.mediaSession.setActionHandler('play', () => toggle());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => next(true));
    } catch (e) {
      /* 部分浏览器不支持 mediaSession 的某些动作 */
    }
  }

  function setHook(fn) {
    M.hook = typeof fn === 'function' ? fn : null;
    if (M.hook) {
      try { M.hook({ playing: M.playing, track: currentTrack() }); } catch (e) { /* ignore */ }
    }
  }

  function init() {
    cacheEls();
    loadList();
    renderList();
    updateNowPlaying();
    bind();
    loadLibrary();
    updateMediaSession();
    M.loaded = true;
    if (M.els.toggle) M.els.toggle.setAttribute('aria-pressed', 'false');
    /* 恢复上次选中的唱片（只选中，不自动播放） */
    const track = currentTrack();
    if (track && track.builtin) {
      /* 内置唱片可以早早拿到时长，让柜门的说明更完整 */
      const probe = new Audio();
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', () => {
        if (isFinite(probe.duration) && probe.duration > 0) {
          track.duration = probe.duration;
          const row = M.rows[track.id];
          if (row && row.sub) row.sub.textContent = rowSub(track, 0);
          persist();
        }
        probe.removeAttribute('src');
      });
      try { probe.src = track.src; } catch (e) { /* ignore */ }
    }
  }

  WP.Music = {
    init: init,
    toggle: toggle,
    play: function () {
      if (M.playing) return true;
      return toggle();
    },
    pause: pause,
    next: next,
    hasTracks: function () { return M.list.length > 0; },
    current: function () {
      const t = currentTrack();
      return t ? { id: t.id, title: t.title, artist: t.artist, builtin: !!t.builtin, bundled: !!t.bundled, playing: M.playing } : null;
    },
    isPlaying: function () { return M.playing; },
    isModalOpen: function () { return M.modalOpen; },
    openModal: openModal,
    closeModal: closeModal,
    restoreBuiltin: restoreBuiltin,
    setHook: setHook,
    list: function () {
      return M.list.map((t) => ({ id: t.id, title: t.title, artist: t.artist, builtin: !!t.builtin, bundled: !!t.bundled, fileName: t.fileName || '' }));
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
