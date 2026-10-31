import * as THREE from 'three';
import { CHAPTERS, MEMORIES, UI_TEXT } from '../content.js';
import { clamp } from './util.js';

const $ = (sel) => document.querySelector(sel);

export class Label {
  constructor(ui, className = '') {
    this.ui = ui;
    this.el = document.createElement('div');
    this.el.className = `lbl ${className}`;
    this.el.innerHTML = '';
    $('#labels').appendChild(this.el);
    this.visible = false;
    this._v = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._to = new THREE.Vector3();
  }
  setHTML(html) {
    this.el.innerHTML = html;
    return this;
  }
  show() {
    this.visible = true;
    this.el.classList.add('is-visible');
    return this;
  }
  hide() {
    this.visible = false;
    this.el.classList.remove('is-visible');
    return this;
  }
  set(anchor, camera, offsetX = 0, offsetY = 0) {
    if (!this.visible) return;
    this._v.copy(anchor).project(camera);
    camera.getWorldDirection(this._dir);
    this._to.copy(anchor).sub(camera.position);
    const front = this._dir.dot(this._to) > 0;
    const x = (this._v.x * 0.5 + 0.5) * window.innerWidth + offsetX;
    const y = (-this._v.y * 0.5 + 0.5) * window.innerHeight + offsetY;
    const on = front && this._v.z < 1 && x > -60 && x < window.innerWidth + 60 && y > -60 && y < window.innerHeight + 60;
    this.el.style.opacity = on ? '' : '0';
    this.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }
}

export class UI {
  constructor(handlers = {}) {
    this.h = handlers;
    this.chapters = CHAPTERS;
    this.currentId = null;
    this.mode = 'chapters';
    this.introOpen = true;
    this.menuOpen = false;
    this.ambient = false;
    this.labels = [];
    this.sceneCursor = null;
    this.uiHover = false;
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.cx = this.mouseX;
    this.cy = this.mouseY;
    this.toastTimer = null;
    this.cardTimer = null;
    this.audio = handlers.audio;
    this.visited = new Set();

    this.dom = {
      body: document.body,
      stage: $('#stage'),
      intro: $('#intro'),
      enterBtn: $('#enterBtn'),
      rail: $('#rail'),
      railHead: $('#railHead'),
      railHeadEn: $('#railHeadEn'),
      railFoot: $('#railFoot'),
      railNav: $('#chapterRail'),
      railBackdrop: $('#railBackdrop'),
      menuBtn: $('#menuBtn'),
      menuBtnText: $('#menuBtnText'),
      ambientBar: $('#ambientBar'),
      ambientSave: $('#ambientSaveBtn'),
      ambientRestart: $('#ambientRestartBtn'),
      ambientVeil: $('#ambientVeil'),
      brandBtn: $('#brandBtn'),
      soundBtn: $('#soundBtn'),
      fsBtn: $('#fsBtn'),
      chapterIndex: $('#chapterIndex'),
      copy: $('#copy'),
      copyNo: $('#copyNo'),
      copyKicker: $('#copyKicker'),
      copyTitle: $('#copyTitle'),
      copyEn: $('#copyEn'),
      copyBody: $('#copyBody'),
      copyAction: $('#copyAction'),
      copyDetail: $('#copyDetail'),
      copyData: $('#copyData'),
      hint: $('#hint'),
      hintText: $('#hintText'),
      introIndex: $('#introIndex'),
      loader: $('#loader'),
      loaderBar: $('#loaderBar'),
      loaderLabel: $('#loaderLabel'),
      loaderPct: $('#loaderPct'),
      transitionCard: $('#transitionCard'),
      tcNo: $('#tcNo'),
      tcTitle: $('#tcTitle'),
      tcEn: $('#tcEn'),
      toast: $('#toast'),
      cursor: $('#cursor'),
      cursorLabel: $('#cursorLabel'),
    };

    this.buildIntroIndex();
    this.buildRail();
    this.bind();
    this.startCursor();
    this.setMuted(this.audio?.muted || false);
  }

  buildIntroIndex() {
    this.dom.introIndex.innerHTML = this.chapters
      .filter((c) => c.id !== 'finale')
      .map(
        (c) => `<div class="ii-row"><span class="ii-no">${c.no}</span><span class="ii-name">${c.title}</span><span class="ii-en">${c.en}</span></div>`
      )
      .join('');
  }

  buildRail() {
    this.mode = 'chapters';
    this.dom.rail.classList.remove('is-memories');
    this.dom.railHead.textContent = UI_TEXT.railHead;
    this.dom.railHeadEn.textContent = UI_TEXT.railHeadEn;
    this.dom.railFoot.textContent = UI_TEXT.railFoot;
    this.dom.railNav.innerHTML = this.chapters
      .map(
        (c) => `
        <button class="rail-item ${c.id === this.currentId ? 'is-active' : ''} ${this.visited.has(c.id) ? 'is-visited' : ''}" data-chapter="${c.id}" aria-label="${c.no} ${c.title}">
          <span class="rail-no">${c.no}</span>
          <span class="rail-name-wrap">
            <span class="rail-name">${c.title}</span>
            <span class="rail-en">${c.en}</span>
          </span>
        </button>`
      )
      .join('');
    this.dom.railNav.querySelectorAll('.rail-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.h.audio?.click();
        this.closeMenu();
        this.h.onNavigate?.(btn.dataset.chapter);
      });
    });
  }

  setRailMode(mode) {
    if (mode === this.mode) return;
    if (mode === 'chapters') {
      this.buildRail();
    } else {
      this.mode = 'memories';
      this.dom.rail.classList.add('is-memories');
      this.dom.railHead.textContent = UI_TEXT.finaleRailHead;
      this.dom.railHeadEn.textContent = UI_TEXT.finaleRailHeadEn;
      this.dom.railFoot.textContent = UI_TEXT.finaleRailFoot;
      this.dom.railNav.innerHTML = '';
    }
  }

  renderMemories({ unlocked = {}, placed = new Set() }, handlers = {}) {
    this.setRailMode('memories');
    const total = MEMORIES.length;
    const count = MEMORIES.filter((m) => placed.has(m.key)).length;
    const html = MEMORIES.map((m) => {
      const isPlaced = placed.has(m.key);
      const isUnlocked = !!unlocked[m.key];
      const cls = `mem-item ${isPlaced ? 'is-placed' : ''} ${!isUnlocked ? 'is-locked' : ''}`;
      let status = UI_TEXT.placed;
      if (!isUnlocked) status = `${UI_TEXT.unopened} · 去 ${m.no}`;
      else if (!isPlaced) status = '点击 · 让它归位';
      return `
        <button class="${cls}" data-mem="${m.key}">
          <span class="mem-no">${m.no}</span>
          <span class="mem-dot"></span>
          <span class="mem-top"><span class="mem-title">${m.title}</span><span class="mem-en">${m.en}</span></span>
          <span class="mem-line">${isUnlocked ? m.ready : m.empty}</span>
          <span class="mem-status">${status}</span>
        </button>`;
    }).join('');
    this.dom.railNav.innerHTML = `
      <div class="mem-list">${html}</div>
      <div class="mem-progress">
        <span>${UI_TEXT.progress}</span>
        <span class="mem-progress-bar"><span style="--p:${count / total}"></span></span>
        <span>${count} / ${total}</span>
      </div>`;
    this.dom.railNav.querySelectorAll('.mem-item').forEach((btn) => {
      const key = btn.dataset.mem;
      btn.addEventListener('click', (e) => {
        this.h.audio?.click();
        this.closeMenu();
        if (!unlocked[key]) {
          this.toast(UI_TEXT.goOpen);
          handlers.onLocked?.(key);
        } else if (!placed.has(key)) {
          handlers.onPlace?.(key, { x: e.clientX, y: e.clientY });
        } else {
          handlers.onPlaced?.(key, { x: e.clientX, y: e.clientY });
        }
      });
      if (handlers.onHover) {
        btn.addEventListener('pointerenter', () => handlers.onHover(key, true));
        btn.addEventListener('pointerleave', () => handlers.onHover(key, false));
      }
    });
    return count;
  }

  updateVisited(set) {
    this.visited = new Set(set);
    this.dom.railNav.querySelectorAll('.rail-item').forEach((el) => {
      el.classList.toggle('is-visited', this.visited.has(el.dataset.chapter));
    });
  }

  setAccent(def) {
    const root = document.documentElement;
    root.style.setProperty('--accent', def.accent);
    root.style.setProperty('--accent-2', def.accent2 || def.accent);
    root.style.setProperty('--accent-rgb', def.accentRGB || '243, 227, 195');
  }

  beginLeave() {
    this.dom.copy.classList.add('is-out');
    this.dom.copy.classList.remove('is-in');
    this.dom.hint.classList.add('is-hidden');
    this.hideSceneLabels();
  }

  showChapter(def) {
    this.currentId = def.id;
    this.visited.add(def.id);
    this.setAccent(def);
    this.dom.body.dataset.chapter = def.id;
    this.dom.chapterIndex.textContent = def.no;
    this.dom.copyNo.textContent = def.no;
    this.dom.copyKicker.textContent = def.kicker;
    this.dom.copyTitle.textContent = def.title;
    this.dom.copyEn.textContent = def.en;
    this.dom.copyBody.innerHTML = def.body || '';
    this.dom.copyAction.innerHTML = '';
    this.dom.copyDetail.className = 'detail';
    this.dom.copyDetail.innerHTML = '';
    this.renderData(def.data);
    this.setHint(def.hint || '');
    this.dom.copy.classList.remove('is-out');
    this.dom.copy.classList.remove('is-in');
    void this.dom.copy.offsetWidth;
    this.dom.copy.classList.add('is-in');
    this.setRailMode(def.id === 'finale' ? 'memories' : 'chapters');
    document.querySelectorAll('.rail-item').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.chapter === def.id);
    });
    this.updateVisited(this.visited);
    if (def.id !== 'finale') {
      this.dom.railHead.textContent = UI_TEXT.railHead;
      this.dom.railHeadEn.textContent = UI_TEXT.railHeadEn;
      this.dom.railFoot.textContent = UI_TEXT.railFoot;
    }
    this.dom.copy.scrollTop = 0;
  }

  renderData(items = []) {
    this.dom.copyData.innerHTML = items
      .map(([k, v]) => `<div class="data-item"><span class="data-k">${k}</span><span class="data-v">${v}</span></div>`)
      .join('');
  }

  setBody(html) {
    this.dom.copyBody.innerHTML = html;
    this.dom.copyBody.classList.remove('is-in');
    void this.dom.copyBody.offsetWidth;
  }

  setDetail(html, visible = true) {
    this.dom.copyDetail.innerHTML = html || '';
    this.dom.copyDetail.classList.toggle('is-visible', !!(html && visible));
  }

  clearDetail() {
    this.dom.copyDetail.innerHTML = '';
    this.dom.copyDetail.classList.remove('is-visible');
  }

  setAction(html, mount) {
    this.dom.copyAction.innerHTML = html;
    mount?.(this.dom.copyAction);
    return this.dom.copyAction;
  }

  clearAction() {
    this.dom.copyAction.innerHTML = '';
  }

  setHint(text, bright = false) {
    // “ · ”两侧不拆行，窄屏只在动作之间换行。
    this.dom.hintText.textContent = (text || '').replace(/ · /g, '\u00a0·\u00a0');
    this.dom.hint.classList.toggle('is-hidden', !text);
    this.dom.hint.classList.toggle('is-bright', !!bright);
  }

  updateHintProgress(p) {
    // 按住类交互的提示可带百分比
    const el = this.dom.hint.querySelector('.hint-progress');
    if (el) el.style.transform = `scaleX(${clamp(p)})`;
  }

  createLabel(className = '') {
    const l = new Label(this, className);
    this.labels.push(l);
    return l;
  }

  hideSceneLabels() {
    this.labels.forEach((l) => l.hide());
  }

  showChapterCard(def) {
    this.dom.tcNo.textContent = def.no;
    this.dom.tcTitle.textContent = def.title;
    this.dom.tcEn.textContent = def.en;
    this.dom.transitionCard.classList.add('is-show');
    clearTimeout(this.cardTimer);
    this.cardTimer = setTimeout(() => this.dom.transitionCard.classList.remove('is-show'), 1200);
  }

  hideChapterCard() {
    clearTimeout(this.cardTimer);
    this.dom.transitionCard.classList.remove('is-show');
  }

  enter() {
    this.introOpen = false;
    this.dom.body.classList.add('entered');
  }

  reopenIntro() {
    this.introOpen = true;
    this.dom.body.classList.remove('entered');
    this.closeMenu();
    this.hideSceneLabels();
  }

  progress(p, label) {
    this.dom.loaderBar.style.transform = `scaleX(${clamp(p)})`;
    this.dom.loaderPct.textContent = Math.round(p * 100);
    if (label) this.dom.loaderLabel.textContent = label;
  }

  finishLoading() {
    this.dom.loader.classList.add('is-done');
    this.dom.body.classList.add('is-ready');
  }

  toast(msg, duration = 2300) {
    if (!msg) return;
    this.dom.toast.textContent = msg;
    this.dom.toast.classList.add('is-show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.dom.toast.classList.remove('is-show'), duration);
  }

  setMuted(muted) {
    this.dom.body.classList.toggle('is-muted', muted);
    this.dom.soundBtn.setAttribute('aria-label', muted ? '开启声音' : '关闭声音');
    this.dom.soundBtn.title = muted ? '开启声音' : '关闭声音';
  }

  setMenu(open) {
    this.menuOpen = open;
    this.dom.rail.classList.toggle('is-open', open);
    this.dom.railBackdrop.classList.toggle('is-show', open);
    this.dom.body.classList.toggle('menu-open', open);
    this.dom.menuBtn.setAttribute('aria-expanded', String(open));
    this.dom.menuBtnText.textContent = open ? '关闭' : '目录';
  }

  closeMenu() {
    if (this.menuOpen) this.setMenu(false);
  }

  setAmbient(on) {
    const next = !!on;
    if (this.ambient === next) return;
    this.ambient = next;
    this.dom.body.classList.toggle('ambient', next);
    this.dom.ambientBar.setAttribute('aria-hidden', next ? 'false' : 'true');
    if (next) {
      this.closeMenu();
      this.setSceneCursor(null);
      this.hideSceneLabels();
      this.dom.hint.classList.add('is-hidden');
    }
  }

  setSceneCursor(label) {
    this.sceneCursor = label || null;
    this.refreshCursor();
  }

  refreshCursor() {
    const label = this.sceneCursor;
    const active = !!label || this.uiHover;
    this.dom.cursor.classList.toggle('is-hover', active);
    this.dom.cursor.classList.toggle('has-label', !!label);
    if (label) this.dom.cursorLabel.textContent = label;
  }

  startCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    this.dom.body.classList.add('has-cursor');
    window.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (!this._cursorShown) {
        this._cursorShown = true;
        this.cx = e.clientX;
        this.cy = e.clientY;
      }
    });
    const loop = () => {
      this.cx += (this.mouseX - this.cx) * 0.28;
      this.cy += (this.mouseY - this.cy) * 0.28;
      this.dom.cursor.style.transform = `translate3d(${this.cx.toFixed(1)}px, ${this.cy.toFixed(1)}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener('pointerdown', () => this.dom.cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => this.dom.cursor.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const isInput = t.closest('input, textarea');
      const isBtn = t.closest('button, .rail-item, .mem-item, .choice, .enter-btn, a');
      this.uiHover = !!isBtn;
      this.dom.cursor.classList.toggle('is-text', !!isInput);
      if (!isInput) {
        this.dom.cursor.classList.remove('is-text');
        this.refreshCursor();
      }
    });
  }

  bind() {
    this.dom.enterBtn.addEventListener('click', () => {
      if (!this.introOpen) return;
      this.h.audio?.init();
      this.h.audio?.click();
      this.h.onEnter?.();
    });
    this.dom.brandBtn.addEventListener('click', () => {
      this.h.audio?.click();
      this.h.onBrand?.();
    });
    this.dom.soundBtn.addEventListener('click', () => {
      this.h.audio?.init();
      const muted = this.h.onSoundToggle?.();
      if (typeof muted === 'boolean') this.setMuted(muted);
    });
    this.dom.fsBtn.addEventListener('click', () => {
      this.h.audio?.click();
      this.h.onFullscreen?.();
    });
    this.dom.menuBtn.addEventListener('click', () => {
      this.h.audio?.click();
      this.setMenu(!this.menuOpen);
    });
    this.dom.railBackdrop.addEventListener('click', () => this.closeMenu());
    this.dom.ambientSave.addEventListener('click', async () => {
      if (!this.ambient || this.dom.ambientSave.disabled) return;
      this.dom.ambientSave.disabled = true;
      const label = this.dom.ambientSave.querySelector('.ambient-save-label');
      const old = label?.textContent;
      if (label) label.textContent = '冲洗星图…';
      const ok = await this.h.onAmbientSave?.();
      this.dom.ambientSave.disabled = false;
      if (label && old) label.textContent = old;
      this.audio?.chime(ok ? 4 : 1);
      this.toast(ok ? UI_TEXT.saved : '保存失败了 · 换一个浏览器再试试');
    });
    this.dom.ambientRestart.addEventListener('click', () => {
      if (!this.ambient) return;
      this.h.audio?.click();
      this.h.onAmbientRestart?.();
    });
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (this.ambient) {
        if (e.key === 'm' || e.key === 'M') {
          this.h.audio?.init();
          const muted = this.h.onSoundToggle?.();
          if (typeof muted === 'boolean') this.setMuted(muted);
          return;
        }
        if (e.key === 'f' || e.key === 'F') {
          this.h.onFullscreen?.();
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          this.h.audio?.click();
          this.h.onAmbientRestart?.();
        }
        return;
      }
      if (this.introOpen && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.dom.enterBtn.click();
        return;
      }
      if (e.key === 'Escape') {
        this.closeMenu();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        this.h.audio?.init();
        const muted = this.h.onSoundToggle?.();
        if (typeof muted === 'boolean') this.setMuted(muted);
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        this.h.onFullscreen?.();
        return;
      }
      if (this.introOpen) return;
      const num = parseInt(e.key, 10);
      if (!Number.isNaN(num)) {
        if (num >= 1 && num <= 5) this.h.onNavigate?.(CHAPTERS[num - 1].id);
        if (num === 0) this.h.onNavigate?.('finale');
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = CHAPTERS.findIndex((c) => c.id === this.currentId);
        if (idx < 0) return;
        const next = e.key === 'ArrowRight' ? Math.min(CHAPTERS.length - 1, idx + 1) : Math.max(0, idx - 1);
        this.h.onNavigate?.(CHAPTERS[next].id);
      }
    });
  }

  fatal(message) {
    this.dom.loaderLabel.textContent = message;
    this.dom.loaderBar.style.transform = 'scaleX(1)';
    this.dom.loaderBar.style.background = '#5b2a22';
    this.dom.loaderPct.textContent = '!';
  }
}
