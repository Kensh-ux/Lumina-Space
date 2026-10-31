import { ACTS, ACT_ORDER, PLANETS } from './acts.js';

const pad = (n) => String(n).padStart(2, '0');

export class UI {
  constructor() {
    this.callbacks = {};
    this.act = 'still';
    this.planet = null;
    this.resonanceBusy = false;
    this.toastTimer = null;
    this.captionTimer = null;
    this.introDone = false;
    this.cursor = null;
    this.cursorTarget = { x: innerWidth / 2, y: innerHeight / 2 };
    this.cursorPos = { x: innerWidth / 2, y: innerHeight / 2 };
    this.cursorHover = false;
    this.interactiveHover = false;
    this._raf = null;
    this._cache();
    this._buildRail();
    this._bind();
    this._startClock();
    this._initCursor();
    this._updateActCopy(ACTS.still);
  }

  _cache() {
    const $ = (sel) => document.querySelector(sel);
    this.el = {
      intro: $('#intro'),
      enter: $('#enter'),
      ui: $('#ui'),
      clock: $('#clock'),
      rail: $('.act-rail'),
      caption: $('#act-caption'),
      actCn: $('#act-cn'),
      actEn: $('#act-en'),
      poem: $('#poem'),
      whaleBtn: $('#whaleBtn'),
      soundBtn: $('#soundBtn'),
      fullBtn: $('#fullBtn'),
      resonance: $('#resonance'),
      card: $('#planetCard'),
      cardClose: $('#cardClose'),
      cardIndex: $('#cardIndex'),
      cardCn: $('#cardCn'),
      cardName: $('#cardName'),
      cardEn: $('#cardEn'),
      cardDesc: $('#cardDesc'),
      cardMeta: $('#cardMeta'),
      cardEnter: $('#cardEnter'),
      tip: $('#planetTip'),
      toast: $('#toast'),
      captionRitual: $('#ritualCaption'),
      flash: $('#flashLayer'),
    };
  }

  on(event, fn) {
    this.callbacks[event] = fn;
  }

  _buildRail() {
    const fragment = document.createDocumentFragment();
    ACT_ORDER.forEach((id, i) => {
      const act = ACTS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'act-item';
      btn.dataset.act = id;
      btn.setAttribute('aria-pressed', id === this.act ? 'true' : 'false');
      if (id === this.act) btn.classList.add('is-active');
      btn.innerHTML = `
        <span class="act-num">${act.numeral}</span>
        <span class="act-label"><b>${act.cn}</b><small>${act.en}</small></span>
        <span class="act-mark" aria-hidden="true"></span>
      `;
      fragment.appendChild(btn);
    });
    this.el.rail.appendChild(fragment);
  }

  _bind() {
    this.el.enter.addEventListener('click', () => this._enter());

    this.el.rail.addEventListener('click', (e) => {
      const btn = e.target.closest('.act-item');
      if (!btn || this.resonanceBusy) return;
      const id = btn.dataset.act;
      if (!id || id === this.act) return;
      this.callbacks.act?.(id);
    });

    this.el.whaleBtn.addEventListener('click', () => {
      const next = this.el.whaleBtn.getAttribute('aria-pressed') !== 'true';
      this.el.whaleBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      this.callbacks.whale?.(next);
      this.toast(next ? '鲸落游回天穹' : '鲸落隐入云后');
    });

    this.el.soundBtn.addEventListener('click', () => {
      const next = this.el.soundBtn.getAttribute('aria-pressed') !== 'true';
      this.el.soundBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      this.callbacks.sound?.(next);
      this.toast(next ? '声景已开启 · 请佩戴耳机' : '声景已静音');
    });

    this.el.fullBtn.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen?.();
        } else {
          await document.exitFullscreen?.();
        }
      } catch {
        this.toast('当前环境不支持全屏');
      }
    });

    this.el.resonance.addEventListener('click', () => {
      if (this.resonanceBusy || !this.introDone) return;
      this.callbacks.resonance?.();
    });

    this.el.cardClose.addEventListener('click', () => this.closePlanet());
    this.el.cardEnter.addEventListener('click', () => {
      if (!this.planet) return;
      const act = this.planet.act;
      this.closePlanet();
      if (!this.resonanceBusy) this.callbacks.act?.(act);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closePlanet();
    });

    this.el.card.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.rail.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.resonance.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.whaleBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.soundBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.fullBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

    if (!document.fullscreenEnabled) {
      this.el.fullBtn.style.display = 'none';
    }
  }

  async _enter() {
    if (this.introDone) return;
    this.introDone = true;
    this.el.enter.disabled = true;
    this.el.intro.classList.add('is-leaving');
    this.el.ui.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      this.el.intro.style.display = 'none';
    }, 2300);
    setTimeout(() => document.body.classList.add('entered'), 650);
    try {
      await this.callbacks.enter?.();
    } catch {
      // Audio is enhancement only; the scene must still enter.
    }
  }

  setAct(actId) {
    const act = ACTS[actId];
    if (!act) return;
    this.act = actId;
    this.el.rail.querySelectorAll('.act-item').forEach((el) => {
      const active = el.dataset.act === actId;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    this._updateActCopy(act);
    this.closePlanet();
  }

  _updateActCopy(act) {
    this.el.caption.textContent = act.caption;
    this.el.actCn.textContent = act.cn;
    this.el.actEn.textContent = act.en;
    this.el.poem.innerHTML = `<p><span></span></p><p><span></span></p>`;
    const spans = this.el.poem.querySelectorAll('span');
    spans[0].textContent = act.line1;
    spans[1].textContent = act.line2;
    // restart the stagger animation
    this.el.poem.querySelectorAll('p span').forEach((span) => {
      span.style.animation = 'none';
      void span.offsetWidth;
      span.style.animation = '';
    });
  }

  openPlanet(planet, index) {
    this.planet = planet;
    const card = this.el.card;
    card.style.setProperty('--accent', planet.color);
    this.el.cardIndex.textContent = `NO. 0${index + 1}`;
    this.el.cardCn.textContent = planet.cn;
    this.el.cardName.textContent = planet.epithet;
    this.el.cardEn.textContent = `${planet.en} · ${ACTS[planet.act].en}`;
    this.el.cardDesc.textContent = planet.desc;
    this.el.cardMeta.innerHTML = planet.meta
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
    card.classList.add('is-open');
    document.body.classList.add('card-open');
    card.setAttribute('aria-hidden', 'false');
    card.setAttribute('tabindex', '-1');
    card.focus({ preventScroll: true });
    this.hidePlanetTip();
  }

  closePlanet() {
    if (!this.el.card.classList.contains('is-open')) return;
    this.el.card.classList.remove('is-open');
    document.body.classList.remove('card-open');
    this.el.card.setAttribute('aria-hidden', 'true');
    this.planet = null;
  }

  showPlanetTip(planet, x, y) {
    const tip = this.el.tip;
    tip.querySelector('b').textContent = planet.cn;
    tip.querySelector('span').textContent = planet.epithet;
    const px = Math.min(Math.max(x, 70), innerWidth - 70);
    const py = Math.min(Math.max(y, 90), innerHeight - 40);
    tip.style.left = `${px}px`;
    tip.style.top = `${py}px`;
    tip.classList.toggle('is-below', py < 150);
    tip.classList.add('is-visible');
    tip.setAttribute('aria-hidden', 'false');
  }

  hidePlanetTip() {
    this.el.tip.classList.remove('is-visible');
    this.el.tip.setAttribute('aria-hidden', 'true');
  }

  setResonanceBusy(busy) {
    this.resonanceBusy = busy;
    this.el.resonance.classList.toggle('is-busy', busy);
    this.el.resonance.setAttribute('aria-busy', busy ? 'true' : 'false');
    this.el.resonance.querySelector('.res-cn').textContent = busy ? '共鸣中' : '共鸣';
    this.el.resonance.querySelector('.res-en').textContent = busy ? 'RESONATING' : 'RESONATE';
  }

  toast(text, duration = 2400) {
    const el = this.el.toast;
    el.textContent = text;
    el.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('is-visible'), duration);
  }

  ritualCaption(text, duration = 5000) {
    const el = this.el.captionRitual;
    el.querySelector('span').textContent = text;
    el.classList.add('is-visible');
    el.setAttribute('aria-hidden', 'false');
    clearTimeout(this.captionTimer);
    this.captionTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      el.setAttribute('aria-hidden', 'true');
    }, duration);
  }

  flash(intensity = 1, warm = false) {
    const el = this.el.flash;
    el.style.background = warm
      ? 'radial-gradient(ellipse at 50% 36%, rgba(255, 230, 185, 0.7), rgba(255, 185, 120, 0.16) 40%, transparent 70%)'
      : 'radial-gradient(ellipse at 32% 16%, rgba(212, 233, 255, 0.76), rgba(140, 180, 220, 0.18) 38%, transparent 68%)';
    const anim = el.animate(
      [
        { opacity: 0 },
        { opacity: 0.75 * intensity, offset: 0.06 },
        { opacity: 0.12, offset: 0.24 },
        { opacity: 0.42 * intensity, offset: 0.32 },
        { opacity: 0 },
      ],
      { duration: warm ? 1100 : 620, easing: 'ease-out' },
    );
    anim.onfinish = () => { el.style.opacity = '0'; };
  }

  setSound(enabled) {
    this.el.soundBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  setWhale(enabled) {
    this.el.whaleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }

  setInteractiveHover(active) {
    this.interactiveHover = active;
    this._updateCursorState();
  }

  _startClock() {
    const tick = () => {
      const d = new Date();
      this.el.clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };
    tick();
    this.clockTimer = setInterval(tick, 1000);
  }

  _initCursor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    this.cursor = document.querySelector('#cursor');
    document.body.classList.add('cursor-enabled');
    document.addEventListener('pointermove', (e) => {
      this.cursorTarget.x = e.clientX;
      this.cursorTarget.y = e.clientY;
      this.cursor.classList.add('is-visible');
    }, { passive: true });
    document.addEventListener('pointerleave', () => {
      this.cursor?.classList.remove('is-visible');
    });
    document.addEventListener('pointerdown', () => {
      this.cursor?.classList.add('is-down');
    });
    document.addEventListener('pointerup', () => {
      this.cursor?.classList.remove('is-down');
    });
    document.addEventListener('pointerover', (e) => {
      const interactive = e.target.closest('button, a, .act-item');
      this.cursorHover = Boolean(interactive);
      this._updateCursorState();
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest('button, a, .act-item') && !e.relatedTarget?.closest?.('button, a, .act-item')) {
        this.cursorHover = false;
        this._updateCursorState();
      }
    });
    const loop = () => {
      if (!this.cursor) return;
      this.cursorPos.x += (this.cursorTarget.x - this.cursorPos.x) * 0.42;
      this.cursorPos.y += (this.cursorTarget.y - this.cursorPos.y) * 0.42;
      this.cursor.style.transform = `translate3d(${this.cursorPos.x}px, ${this.cursorPos.y}px, 0)`;
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }

  _updateCursorState() {
    if (!this.cursor) return;
    this.cursor.classList.toggle('is-active', this.cursorHover || this.interactiveHover);
  }
}
