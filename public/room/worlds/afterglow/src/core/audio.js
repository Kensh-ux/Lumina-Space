// 全部由 WebAudio 实时合成，不加载任何音频文件。
const CONFIG = {
  intro: { notes: [55, 82.41, 110, 164.81, 220], cutoff: 620, noise: 0.012, sub: 0.035, shimmer: 0.012 },
  first: { notes: [55, 82.41, 110, 164.81, 220], cutoff: 900, noise: 0.008, sub: 0.032, shimmer: 0.02 },
  stardust: { notes: [65.41, 98, 130.81, 196, 261.63], cutoff: 1100, noise: 0.018, sub: 0.03, shimmer: 0.016 },
  tides: { notes: [73.42, 110, 146.83, 220, 293.66], cutoff: 720, noise: 0.05, sub: 0.036, shimmer: 0.012 },
  abyss: { notes: [36.71, 55, 73.42, 110, 146.83], cutoff: 380, noise: 0.02, sub: 0.06, shimmer: 0.006 },
  ember: { notes: [43.65, 65.41, 87.31, 130.81, 174.61], cutoff: 520, noise: 0.016, sub: 0.05, shimmer: 0.008 },
  finale: { notes: [65.41, 98, 130.81, 164.81, 196], cutoff: 1250, noise: 0.008, sub: 0.026, shimmer: 0.022 },
};

const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];

function makeNoise(ctx, seconds = 2) {
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function makeImpulse(ctx, seconds = 3.2, decay = 2.6) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.2);
    }
  }
  return buffer;
}

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = localStorage.getItem('afterglow.muted') === '1';
    this.current = null;
    this.charge = null;
    this.bellTimer = 6;
    this.time = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -22;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.02;
      comp.release.value = 0.6;
      this.master.connect(comp).connect(ctx.destination);

      this.reverb = ctx.createConvolver();
      this.reverb.buffer = makeImpulse(ctx);
      this.reverbGain = ctx.createGain();
      this.reverbGain.gain.value = 0.34;
      this.reverb.connect(this.reverbGain).connect(this.master);
      this.dry = ctx.createGain();
      this.dry.gain.value = 0.72;
      this.dry.connect(this.master);

      this.padBus = ctx.createGain();
      this.padBus.gain.value = 0;
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 700;
      this.filter.Q.value = 0.6;
      this.padBus.connect(this.filter);
      this.filter.connect(this.dry);
      this.filter.connect(this.reverb);

      this.voices = [];
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = 55 * (i + 1);
        osc.detune.value = (i - 2) * 2.5;
        const g = ctx.createGain();
        g.gain.value = 0.045;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = (i - 2) * 0.22;
          osc.connect(g).connect(pan).connect(this.padBus);
        } else {
          osc.connect(g).connect(this.padBus);
        }
        osc.start();
        this.voices.push({ osc, gain: g, pan });
      }

      this.sub = ctx.createOscillator();
      this.sub.type = 'sine';
      this.sub.frequency.value = 27.5;
      this.subGain = ctx.createGain();
      this.subGain.gain.value = 0;
      this.sub.connect(this.subGain).connect(this.dry);
      this.sub.start();

      this.shimmer = ctx.createOscillator();
      this.shimmer.type = 'sine';
      this.shimmer.frequency.value = 880;
      this.shimmerGain = ctx.createGain();
      this.shimmerGain.gain.value = 0;
      const shFilter = ctx.createBiquadFilter();
      shFilter.type = 'bandpass';
      shFilter.frequency.value = 1200;
      shFilter.Q.value = 2;
      this.shimmer.connect(shFilter).connect(this.shimmerGain);
      this.shimmerGain.connect(this.reverb);
      this.shimmer.start();

      // 风 / 空间底噪
      this.noise = ctx.createBufferSource();
      this.noise.buffer = makeNoise(ctx, 3);
      this.noise.loop = true;
      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.value = 480;
      this.noiseFilter.Q.value = 0.5;
      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.value = 0;
      this.noise.connect(this.noiseFilter).connect(this.noiseGain);
      this.noiseGain.connect(this.dry);
      this.noiseGain.connect(this.reverb);
      this.noise.start();

      // 缓慢的滤波呼吸
      this.lfo = ctx.createOscillator();
      this.lfo.frequency.value = 0.035;
      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = 90;
      this.lfo.connect(this.lfoGain).connect(this.filter.frequency);
      this.lfo.start();

      this.ready = true;
      this.padBus.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 3);
      if (this.pendingChapter) this.setChapter(this.pendingChapter, true);
    } catch (e) {
      console.warn('Audio unavailable', e);
    }
  }

  setChapter(id, immediate = false) {
    this.pendingChapter = id;
    if (!this.ready) return;
    const cfg = CONFIG[id] || CONFIG.first;
    const now = this.ctx.currentTime;
    const glide = immediate ? 0.1 : 2.4;
    this.voices.forEach((v, i) => {
      v.osc.frequency.cancelScheduledValues(now);
      v.osc.frequency.setTargetAtTime(cfg.notes[i], now, glide / 3);
      v.gain.gain.setTargetAtTime(0.035 + (i === 0 ? 0.02 : 0), now, 1.2);
    });
    this.sub.frequency.setTargetAtTime(cfg.notes[0] / 2, now, 0.6);
    this.subGain.gain.setTargetAtTime(cfg.sub, now, 1.5);
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setTargetAtTime(cfg.cutoff, now, 1.4);
    this.noiseGain.gain.setTargetAtTime(cfg.noise, now, 1.8);
    this.shimmer.frequency.setTargetAtTime(cfg.notes[4] * 4, now, 2.0);
    this.shimmerGain.gain.setTargetAtTime(cfg.shimmer, now, 2.0);
    this.current = id;
    this.time = 0;
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('afterglow.muted', m ? '1' : '0');
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(m ? 0 : 0.72, now + 0.35);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    if (!this.muted) this.ping(2, 0.035, 2.2);
    return this.muted;
  }

  ping(ratio = 1, gain = 0.05, decay = 2.2) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const base = (CONFIG[this.current]?.notes?.[2] || 110) * ratio;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = base;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = base * 2.005;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    osc.connect(g);
    osc2.connect(g2).connect(g);
    g.connect(this.dry);
    g.connect(this.reverb);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + decay + 0.1);
    osc2.stop(now + decay + 0.1);
  }

  click() {
    if (!this.ready || this.muted) return;
    this.ping(3, 0.024, 0.45);
    this.ping(4.5, 0.012, 0.7);
  }

  chime(index = 0) {
    if (!this.ready || this.muted) return;
    const root = (CONFIG[this.current]?.notes?.[2] || 130.81) * 2;
    const ratio = PENTA[index % PENTA.length];
    this.ping((root * ratio) / (CONFIG[this.current]?.notes?.[2] || 130.81), 0.03, 3.2);
  }

  boom(intensity = 1) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 2.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.18 * intensity, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
    osc.connect(g);
    g.connect(this.dry);
    g.connect(this.reverb);
    osc.start(now);
    osc.stop(now + 4);

    const src = ctx.createBufferSource();
    src.buffer = this.noise.buffer;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1400, now);
    f.frequency.exponentialRampToValueAtTime(180, now + 2.2);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.linearRampToValueAtTime(0.08 * intensity, now + 0.03);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    src.connect(f).connect(ng);
    ng.connect(this.dry);
    ng.connect(this.reverb);
    src.start(now);
    src.stop(now + 2.8);
  }

  whoosh() {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise.buffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(180, now);
    f.frequency.exponentialRampToValueAtTime(2400, now + 1.15);
    f.frequency.exponentialRampToValueAtTime(380, now + 2.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    src.connect(f).connect(g);
    g.connect(this.dry);
    g.connect(this.reverb);
    src.start(now);
    src.stop(now + 2.7);
  }

  chargeStart(base = 180) {
    if (!this.ready || this.muted) return;
    this.chargeStop(true);
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(base * 1.5, now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.018, now + 0.2);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    osc.connect(f);
    osc2.connect(f);
    f.connect(g);
    g.connect(this.dry);
    g.connect(this.reverb);
    osc.start(now);
    osc2.start(now);
    this.charge = { osc, osc2, g, base };
  }

  chargeSet(p) {
    if (!this.charge || !this.ready) return;
    const now = this.ctx.currentTime;
    const target = this.charge.base * (1 + p * 2.4);
    this.charge.osc.frequency.setTargetAtTime(target, now, 0.08);
    this.charge.osc2.frequency.setTargetAtTime(target * 1.5, now, 0.08);
    this.charge.g.gain.setTargetAtTime(0.018 + p * 0.02, now, 0.1);
  }

  chargeStop(silent = false) {
    if (!this.charge || !this.ready) return;
    const { osc, osc2, g } = this.charge;
    const now = this.ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(0.0001, now, 0.09);
      osc.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (e) {}
    this.charge = null;
    if (!silent) this.ping(2.4, 0.02, 1.2);
  }

  update(dt) {
    if (!this.ready) return;
    this.time += dt;
    // 偶尔落下一声很轻的钟
    this.bellTimer -= dt;
    if (this.bellTimer <= 0 && !this.muted) {
      this.bellTimer = 9 + Math.random() * 14;
      const idx = Math.floor(Math.random() * PENTA.length);
      this.chime(idx);
    }
  }
}
