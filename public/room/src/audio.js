/* 窗畔 · 声音：风、雨、城市低鸣、黑胶、琴声与猫，全部实时合成 */
(function () {
  'use strict';
  window.WP = window.WP || {};

  const A = {
    ctx: null,
    master: null,
    comp: null,
    enabled: false,
    mood: 'dusk',
    recordOn: false,
    noiseBuffer: null,
    windGain: null,
    rainGain: null,
    cityGain: null,
    vinylGain: null,
    musicGain: null,
    fxGain: null,
    birdTimer: 0,
    dreamTimer: 0,
    lastMeow: 0,
    lastWhale: 0,
    lastBoom: 0
  };

  const MOOD_AMB = {
    dusk: { wind: 0.035, rain: 0.0, city: 0.018, birds: false },
    rain: { wind: 0.052, rain: 0.13, city: 0.022, birds: false },
    snow: { wind: 0.03, rain: 0.0, city: 0.01, birds: false },
    dawn: { wind: 0.022, rain: 0.0, city: 0.014, birds: true },
    day: { wind: 0.016, rain: 0.0, city: 0.016, birds: true },
    aurora: { wind: 0.024, rain: 0.0, city: 0.008, birds: false },
    abyss: { wind: 0.01, rain: 0.0, city: 0.004, birds: false },
    cosmos: { wind: 0.006, rain: 0.0, city: 0.003, birds: false },
    sakura: { wind: 0.02, rain: 0.0, city: 0.006, birds: false },
    hanabi: { wind: 0.014, rain: 0.0, city: 0.012, birds: false },
    cloudsea: { wind: 0.034, rain: 0.0, city: 0.003, birds: false },
    isles: { wind: 0.026, rain: 0.0, city: 0.004, birds: false },
    dunes: { wind: 0.03, rain: 0.0, city: 0.002, birds: false },
    ice: { wind: 0.018, rain: 0.0, city: 0.002, birds: false },
    firefly: { wind: 0.012, rain: 0.0, city: 0.003, birds: false },
    booksea: { wind: 0.008, rain: 0.0, city: 0.003, birds: false },
    moon: { wind: 0.004, rain: 0.0, city: 0.001, birds: false },
    meadow: { wind: 0.022, rain: 0.0, city: 0.004, birds: false }
  };

  /* 幻境的持续低音与偶发声件 */
  const DREAM_AMB = {
    abyss: { gain: 0.05, freq: 62, detune: 1.5 },
    cosmos: { gain: 0.032, freq: 174, detune: 2.01 },
    sakura: { gain: 0.026, freq: 146, detune: 1.5 },
    hanabi: { gain: 0.03, freq: 92, detune: 1.5 },
    cloudsea: { gain: 0.028, freq: 82, detune: 1.5 },
    isles: { gain: 0.03, freq: 116, detune: 1.5 },
    dunes: { gain: 0.024, freq: 54, detune: 1.5 },
    ice: { gain: 0.028, freq: 196, detune: 2.01 },
    firefly: { gain: 0.022, freq: 98, detune: 1.5 },
    booksea: { gain: 0.026, freq: 130, detune: 1.5 },
    moon: { gain: 0.03, freq: 72, detune: 2.01 },
    meadow: { gain: 0.024, freq: 110, detune: 1.5 }
  };

  function makeNoise(seconds) {
    const ctx = A.ctx;
    const len = Math.floor(ctx.sampleRate * (seconds || 4));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  function makeWhite(seconds) {
    const ctx = A.ctx;
    const len = Math.floor(ctx.sampleRate * (seconds || 4));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function makeCrackle(seconds) {
    const ctx = A.ctx;
    const len = Math.floor(ctx.sampleRate * (seconds || 3.2));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.006;
    }
    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.00022) {
        const amp = 0.12 + Math.random() * 0.5;
        const tail = 8 + Math.floor(Math.random() * 26);
        for (let j = 0; j < tail && i + j < len; j++) {
          d[i + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 5);
        }
      }
    }
    return buf;
  }

  function makePanner(pan) {
    if (!A.ctx.createStereoPanner) return A.ctx.createGain();
    const p = A.ctx.createStereoPanner();
    p.pan.value = pan || 0;
    return p;
  }

  function init() {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    A.ctx = ctx;
    A.master = ctx.createGain();
    A.master.gain.value = 0;
    A.comp = ctx.createDynamicsCompressor();
    A.comp.threshold.value = -20;
    A.comp.knee.value = 22;
    A.comp.ratio.value = 3;
    A.comp.attack.value = 0.01;
    A.comp.release.value = 0.4;
    A.master.connect(A.comp);
    A.comp.connect(ctx.destination);

    A.musicGain = ctx.createGain();
    A.musicGain.gain.value = 0.72;
    A.musicGain.connect(A.master);
    A.fxGain = ctx.createGain();
    A.fxGain.gain.value = 0.8;
    A.fxGain.connect(A.master);

    A.noiseBuffer = makeNoise(5);
    const white = makeWhite(4);

    // 风：低通噪声 + 缓慢摆动的滤波器
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = A.noiseBuffer;
    windSrc.loop = true;
    const windLP = ctx.createBiquadFilter();
    windLP.type = 'lowpass';
    windLP.frequency.value = 420;
    windLP.Q.value = 0.7;
    A.windGain = ctx.createGain();
    A.windGain.gain.value = 0;
    windSrc.connect(windLP);
    windLP.connect(A.windGain);
    A.windGain.connect(A.master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(windLP.frequency);
    lfo.start();
    windSrc.start();

    // 树叶的细碎声
    const leafSrc = ctx.createBufferSource();
    leafSrc.buffer = white;
    leafSrc.loop = true;
    const leafBP = ctx.createBiquadFilter();
    leafBP.type = 'bandpass';
    leafBP.frequency.value = 3400;
    leafBP.Q.value = 0.5;
    const leafGain = ctx.createGain();
    leafGain.gain.value = 0.006;
    leafSrc.connect(leafBP);
    leafBP.connect(leafGain);
    leafGain.connect(A.master);
    leafSrc.start();

    // 雨：高通白噪 + 低频雨幕
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = white;
    rainSrc.loop = true;
    const rainHP = ctx.createBiquadFilter();
    rainHP.type = 'highpass';
    rainHP.frequency.value = 1100;
    const rainLP = ctx.createBiquadFilter();
    rainLP.type = 'lowpass';
    rainLP.frequency.value = 8200;
    A.rainGain = ctx.createGain();
    A.rainGain.gain.value = 0;
    rainSrc.connect(rainHP);
    rainHP.connect(rainLP);
    rainLP.connect(A.rainGain);
    A.rainGain.connect(A.master);
    rainSrc.start();

    // 城市低鸣（几乎听不见，但让安静不空缺）
    const citySrc = ctx.createBufferSource();
    citySrc.buffer = A.noiseBuffer;
    citySrc.loop = true;
    const cityLP = ctx.createBiquadFilter();
    cityLP.type = 'lowpass';
    cityLP.frequency.value = 130;
    cityLP.Q.value = 0.4;
    A.cityGain = ctx.createGain();
    A.cityGain.gain.value = 0;
    citySrc.connect(cityLP);
    cityLP.connect(A.cityGain);
    A.cityGain.connect(A.master);
    citySrc.start();

    // 黑胶
    const vinylSrc = ctx.createBufferSource();
    vinylSrc.buffer = makeCrackle(3.4);
    vinylSrc.loop = true;
    const vinylHP = ctx.createBiquadFilter();
    vinylHP.type = 'highpass';
    vinylHP.frequency.value = 480;
    A.vinylGain = ctx.createGain();
    A.vinylGain.gain.value = 0;
    vinylSrc.connect(vinylHP);
    vinylHP.connect(A.vinylGain);
    A.vinylGain.connect(A.musicGain);
    vinylSrc.start();

    // 幻境低音：两条正弦缓慢拍频，随光景换根音
    A.dreamGain = ctx.createGain();
    A.dreamGain.gain.value = 0;
    const dreamLP = ctx.createBiquadFilter();
    dreamLP.type = 'lowpass';
    dreamLP.frequency.value = 320;
    dreamLP.Q.value = 0.9;
    A.dreamGain.connect(dreamLP);
    dreamLP.connect(A.master);
    A.dreamOscA = ctx.createOscillator();
    A.dreamOscA.type = 'sine';
    A.dreamOscA.frequency.value = 62;
    A.dreamOscB = ctx.createOscillator();
    A.dreamOscB.type = 'sine';
    A.dreamOscB.frequency.value = 93;
    const dreamGA = ctx.createGain();
    dreamGA.gain.value = 0.55;
    const dreamGB = ctx.createGain();
    dreamGB.gain.value = 0.22;
    A.dreamOscA.connect(dreamGA);
    dreamGA.connect(A.dreamGain);
    A.dreamOscB.connect(dreamGB);
    dreamGB.connect(A.dreamGain);
    A.dreamOscA.start();
    A.dreamOscB.start();

    A.setMood(A.mood);
  }

  function ramp(param, value, time) {
    const t = A.ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(value, t + (time || 0.8));
  }

  A.enable = function () {
    init();
    if (!A.ctx) return false;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    A.enabled = true;
    ramp(A.master.gain, 0.9, 1.4);
    A.setMood(A.mood);
    if (A.recordOn) ramp(A.vinylGain.gain, 0.05, 1.2);
    return true;
  };

  A.disable = function () {
    if (!A.ctx) return;
    A.enabled = false;
    ramp(A.master.gain, 0, 0.5);
  };

  A.toggle = function () {
    if (A.enabled) {
      A.disable();
      return false;
    }
    return A.enable();
  };

  A.isOn = function () {
    return A.enabled;
  };

  A.ensure = function () {
    if (!A.enabled) return A.enable();
    return true;
  };

  A.setMood = function (name) {
    A.mood = name;
    if (!A.ctx) return;
    const m = MOOD_AMB[name] || MOOD_AMB.dusk;
    ramp(A.windGain.gain, m.wind, 2.4);
    ramp(A.rainGain.gain, m.rain, 2.4);
    ramp(A.cityGain.gain, m.city, 3.0);
    startBirds(m.birds);

    const dream = DREAM_AMB[name];
    if (dream) {
      ramp(A.dreamGain.gain, dream.gain, 3.0);
      const t = A.ctx.currentTime;
      const f = A.dreamOscA.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(Math.max(20, f.value), t);
      f.linearRampToValueAtTime(dream.freq, t + 2.6);
      const f2 = A.dreamOscB.frequency;
      f2.cancelScheduledValues(t);
      f2.setValueAtTime(Math.max(20, f2.value), t);
      f2.linearRampToValueAtTime(dream.freq * dream.detune, t + 2.6);
    } else {
      ramp(A.dreamGain.gain, 0, 1.6);
    }
    startDreamEvents(!!dream);
  };

  function startDreamEvents(on) {
    if (A.dreamTimer) {
      clearInterval(A.dreamTimer);
      A.dreamTimer = 0;
    }
    if (!on) return;
    A.dreamTimer = setInterval(dreamTick, 1300);
  }

  function dreamTick() {
    if (!A.ctx || !A.enabled) return;
    const mood = A.mood;
    const now = performance.now() / 1000;
    if (mood === 'abyss') {
      if (now - A.lastWhale > 6.5 && Math.random() < 0.36) {
        A.lastWhale = now;
        whaleCall();
      } else if (Math.random() < 0.3) {
        bubble();
      }
    } else if (mood === 'cosmos') {
      if (Math.random() < 0.34) shimmer();
    } else if (mood === 'sakura') {
      if (Math.random() < 0.3) koto();
      else if (Math.random() < 0.28) cricket();
    } else if (mood === 'hanabi') {
      if (now - A.lastBoom > 2.4 && Math.random() < 0.4) {
        A.lastBoom = now;
        fireworkBoom();
      }
    } else if (mood === 'cloudsea') {
      if (Math.random() < 0.2) shimmer();
    } else if (mood === 'isles') {
      if (Math.random() < 0.22) shimmer();
      else if (Math.random() < 0.16) chirp();
    } else if (mood === 'dunes') {
      if (Math.random() < 0.16) shimmer();
    } else if (mood === 'ice') {
      if (Math.random() < 0.24) shimmer();
    } else if (mood === 'firefly') {
      if (Math.random() < 0.3) cricket();
      else if (Math.random() < 0.14) shimmer();
    } else if (mood === 'booksea') {
      if (Math.random() < 0.2) shimmer();
      else if (Math.random() < 0.16) cricket();
    } else if (mood === 'moon') {
      if (Math.random() < 0.18) shimmer();
    } else if (mood === 'meadow') {
      if (Math.random() < 0.28) cricket();
      else if (Math.random() < 0.16) koto();
    }
  }

  function panned(pan) {
    const p = makePanner(pan === undefined ? Math.random() * 1.4 - 0.7 : pan);
    p.connect(A.master);
    return p;
  }

  function whaleCall() {
    const ctx = A.ctx;
    const t0 = ctx.currentTime + 0.05;
    const out = panned(-0.35);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t0);
    osc.frequency.exponentialRampToValueAtTime(54, t0 + 1.6);
    osc.frequency.exponentialRampToValueAtTime(46, t0 + 2.6);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 4.2;
    const vg = ctx.createGain();
    vg.gain.value = 2.2;
    vibrato.connect(vg);
    vg.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.9);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    osc.connect(lp);
    lp.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + 3);
    vibrato.start(t0);
    vibrato.stop(t0 + 3);
  }

  function bubble() {
    const ctx = A.ctx;
    const t0 = ctx.currentTime + Math.random() * 0.4;
    const out = panned();
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const t = t0 + i * (0.06 + Math.random() * 0.08);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f = 380 + Math.random() * 900;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.008 + Math.random() * 0.006, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.09);
    }
  }

  function shimmer() {
    const ctx = A.ctx;
    const t0 = ctx.currentTime + 0.05;
    const notes = [84, 88, 91, 95];
    const base = notes[Math.floor(Math.random() * notes.length)];
    const out = panned(Math.random() * 1.2 - 0.6);
    [0, 7].forEach((d, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440 * Math.pow(2, (base + d - 69) / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + i * 0.12);
      g.gain.linearRampToValueAtTime(0.009, t0 + i * 0.12 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.12 + 3.2);
      osc.connect(g);
      g.connect(out);
      osc.start(t0 + i * 0.12);
      osc.stop(t0 + i * 0.12 + 3.3);
    });
  }

  function koto() {
    const scale = [57, 60, 62, 64, 67, 69, 72, 74];
    const midi = scale[Math.floor(Math.random() * scale.length)];
    A.note(midi, Math.random() * 0.3, 0.035);
    if (Math.random() < 0.5) A.note(midi + 12, 0.22, 0.018);
  }

  function cricket() {
    const ctx = A.ctx;
    const t0 = ctx.currentTime + 0.05;
    const out = panned(Math.random() * 1.4 - 0.7);
    const f = 3800 + Math.random() * 900;
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.085;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.0038, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  function fireworkBoom() {
    const ctx = A.ctx;
    const t0 = ctx.currentTime + 0.05;
    const out = panned(Math.random() * 1.2 - 0.6);
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(74, t0);
    thump.frequency.exponentialRampToValueAtTime(38, t0 + 0.7);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t0);
    tg.gain.linearRampToValueAtTime(0.055, t0 + 0.03);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    thump.connect(tg);
    tg.connect(out);
    thump.start(t0);
    thump.stop(t0 + 1);
    const noise = ctx.createBufferSource();
    noise.buffer = makeWhite(0.9);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.02, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(out);
    noise.start(t0);
    noise.stop(t0 + 0.8);
    if (Math.random() < 0.6) {
      const crackle = ctx.createBufferSource();
      crackle.buffer = makeWhite(0.5);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.0001, t0 + 0.15);
      cg.gain.linearRampToValueAtTime(0.008, t0 + 0.2);
      cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      crackle.connect(hp);
      hp.connect(cg);
      cg.connect(out);
      crackle.start(t0 + 0.15);
      crackle.stop(t0 + 0.7);
    }
  }

  A.strum = function () {
    if (!A.ctx || !A.enabled) return;
    const chord = [40, 47, 52, 55, 59, 64];
    chord.forEach((m, i) => A.note(m, i * 0.045 + Math.random() * 0.012, 0.055));
    A.note(71, 0.3, 0.02);
  };

  function startBirds(on) {
    if (!on || !A.enabled) {
      if (A.birdTimer) { clearInterval(A.birdTimer); A.birdTimer = 0; }
      if (!on) return;
    }
    if (A.birdTimer) return;
    A.birdTimer = setInterval(() => {
      if (!A.enabled) return;
      if (A.mood !== 'dawn' && A.mood !== 'day') return;
      if (Math.random() < 0.55) chirp();
    }, 2600);
  }

  function chirp() {
    if (!A.ctx || !A.enabled) return;
    const ctx = A.ctx;
    const t0 = ctx.currentTime + Math.random() * 0.4;
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2200 + Math.random() * 1600;
    const pan = makePanner(Math.random() * 1.4 - 0.7);
    const g = ctx.createGain();
    g.gain.value = 0.0;
    g.connect(pan);
    pan.connect(A.master);
    for (let i = 0; i < notes; i++) {
      const t = t0 + i * (0.075 + Math.random() * 0.06);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const f = base * (0.85 + Math.random() * 0.4);
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * (1.15 + Math.random() * 0.2), t + 0.045);
      const eg = ctx.createGain();
      eg.gain.setValueAtTime(0.0001, t);
      eg.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.008, t + 0.01);
      eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      osc.connect(eg);
      eg.connect(g);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  A.note = function (midi, delay, level) {
    if (!A.ctx || !A.enabled) return;
    const ctx = A.ctx;
    const t0 = ctx.currentTime + Math.max(0, delay || 0);
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const lvl = level === undefined ? 0.085 : level;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3600;
    lp.Q.value = 0.4;
    lp.connect(A.musicGain);
    const partials = [
      [1, 1, 2.4],
      [2.002, 0.26, 1.5],
      [3.006, 0.1, 1.0],
      [4.008, 0.04, 0.7]
    ];
    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * p[0];
      osc.detune.value = (Math.random() - 0.5) * 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(lvl * p[1], t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p[2]);
      osc.connect(g);
      g.connect(lp);
      osc.start(t0);
      osc.stop(t0 + p[2] + 0.05);
    });
    // 一点击弦的木头声
    if (level !== 0) {
      const noise = ctx.createBufferSource();
      noise.buffer = makeWhite(0.05);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq * 2.2;
      bp.Q.value = 2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(lvl * 0.25, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(A.musicGain);
      noise.start(t0);
      noise.stop(t0 + 0.06);
    }
  };

  A.setRecord = function (on) {
    A.recordOn = !!on;
    if (!A.ctx) return;
    ramp(A.vinylGain.gain, on ? 0.055 : 0, 0.9);
  };

  A.chime = function () {
    if (!A.ctx || !A.enabled) return;
    const ctx = A.ctx;
    const t0 = ctx.currentTime;
    [76, 83].forEach((midi, i) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + i * 0.09);
      g.gain.linearRampToValueAtTime(0.018, t0 + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 2.2);
      osc.connect(g);
      g.connect(A.fxGain);
      osc.start(t0 + i * 0.09);
      osc.stop(t0 + i * 0.09 + 2.3);
    });
  };

  A.meow = function () {
    if (!A.ctx || !A.enabled) return;
    const now = performance.now();
    if (now - A.lastMeow < 900) return;
    A.lastMeow = now;
    const ctx = A.ctx;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(430, t0);
    osc.frequency.linearRampToValueAtTime(690, t0 + 0.14);
    osc.frequency.linearRampToValueAtTime(560, t0 + 0.34);
    osc.frequency.linearRampToValueAtTime(390, t0 + 0.58);
    const vib = ctx.createOscillator();
    vib.frequency.value = 26;
    const vibG = ctx.createGain();
    vibG.gain.value = 18;
    vib.connect(vibG);
    vibG.connect(osc.frequency);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1100, t0);
    bp.frequency.linearRampToValueAtTime(1700, t0 + 0.2);
    bp.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.075, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.03, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.62);
    osc.connect(bp);
    bp.connect(g);
    g.connect(A.fxGain);
    osc.start(t0);
    vib.start(t0);
    osc.stop(t0 + 0.68);
    vib.stop(t0 + 0.68);
  };

  A.click = function () {
    if (!A.ctx || !A.enabled) return;
    const ctx = A.ctx;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(780, t0);
    osc.frequency.exponentialRampToValueAtTime(360, t0 + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    osc.connect(g);
    g.connect(A.fxGain);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  };

  WP.Audio = A;
})();
