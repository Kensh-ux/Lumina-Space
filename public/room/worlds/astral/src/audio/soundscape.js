/**
 * 星潮声景 · 全部由 WebAudio 现场合成，没有音频文件。
 * 海潮、风、星盘低鸣属于场景；风铃与鲸歌只在你触碰时出现。
 */

const NOTES = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46]; // D minor pentatonic-ish
const ACT_MIX = {
  still: { sea: 0.13, wind: 0.016, rain: 0.0, shimmer: 0.008, pad: 0.0, sub: 0.0, cutoff: 420 },
  aurora: { sea: 0.09, wind: 0.022, rain: 0.0, shimmer: 0.03, pad: 0.014, sub: 0.0, cutoff: 680 },
  storm: { sea: 0.17, wind: 0.085, rain: 0.085, shimmer: 0.004, pad: 0.0, sub: 0.008, cutoff: 310 },
  eclipse: { sea: 0.07, wind: 0.018, rain: 0.0, shimmer: 0.014, pad: 0.006, sub: 0.03, cutoff: 230 },
};

export class Soundscape {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.enabled = true;
    this.act = 'still';
    this._heartbeat = null;
    this._thunderTimers = new Set();
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 24;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.28;
    compressor.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(compressor);
    this.master = master;

    const reverb = ctx.createConvolver();
    reverb.buffer = this._impulse(3.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.42;
    reverb.connect(wet).connect(master);
    this.reverb = reverb;

    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.46;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.18;
    delay.connect(feedback).connect(delay);
    delay.connect(delayWet).connect(master);
    delay.connect(reverb);
    this.delay = delay;

    this.noiseBrown = this._noiseBuffer(8, 'brown');
    this.noiseWhite = this._noiseBuffer(6, 'white');

    // ------------------------------- sea --------------------------------
    this.seaGain = ctx.createGain();
    this.seaGain.gain.value = 0;
    this.seaGain.connect(master);

    const seaSrc = ctx.createBufferSource();
    seaSrc.buffer = this.noiseBrown;
    seaSrc.loop = true;
    const seaFilter = ctx.createBiquadFilter();
    seaFilter.type = 'lowpass';
    seaFilter.frequency.value = 420;
    seaFilter.Q.value = 0.55;
    seaSrc.connect(seaFilter).connect(this.seaGain);
    seaSrc.start();

    const seaHis = ctx.createGain();
    seaHis.gain.value = 0.13;
    seaHis.connect(this.seaGain);
    const seaHiFilter = ctx.createBiquadFilter();
    seaHiFilter.type = 'bandpass';
    seaHiFilter.frequency.value = 1600;
    seaHiFilter.Q.value = 0.8;
    const seaHiSrc = ctx.createBufferSource();
    seaHiSrc.buffer = this.noiseWhite;
    seaHiSrc.loop = true;
    seaHiSrc.connect(seaHiFilter).connect(seaHis);
    seaHiSrc.start();

    // a slow tide LFO
    const tideLfo = ctx.createOscillator();
    tideLfo.frequency.value = 0.045;
    const tideDepth = ctx.createGain();
    tideDepth.gain.value = 0.045;
    tideLfo.connect(tideDepth).connect(this.seaGain.gain);
    tideLfo.start();

    // ------------------------------- wind -------------------------------
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(master);

    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.noiseBrown;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.9;
    const windPan = ctx.createStereoPanner();
    windPan.pan.value = -0.25;
    const windMod = ctx.createGain();
    windMod.gain.value = 0.6;
    windSrc.connect(windFilter).connect(windPan).connect(windMod).connect(this.windGain);
    windSrc.start();

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.065;
    const windDepth = ctx.createGain();
    windDepth.gain.value = 0.5;
    windLfo.connect(windDepth).connect(windMod.gain);
    windLfo.start();

    // ------------------------------- rain -------------------------------
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(master);
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this.noiseWhite;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 1700;
    const rainFilter2 = ctx.createBiquadFilter();
    rainFilter2.type = 'lowpass';
    rainFilter2.frequency.value = 7200;
    rainSrc.connect(rainFilter).connect(rainFilter2).connect(this.rainGain);
    rainSrc.start();

    // ------------------------------ drone -------------------------------
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 420;
    this.droneFilter.Q.value = 0.8;
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.055;
    this.droneFilter.connect(this.droneGain).connect(master);
    this.droneGain.connect(reverb);

    this.droneOscs = [];
    const droneFreqs = [36.71, 73.42, 110.0, 146.83];
    droneFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : i === 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = [-5, 4, -3, 6][i];
      const g = ctx.createGain();
      g.gain.value = [0.32, 0.4, 0.18, 0.12][i];
      osc.connect(g).connect(this.droneFilter);
      osc.start();
      this.droneOscs.push(osc);
    });

    // ----------------------------- shimmer ------------------------------
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0;
    this.shimmerGain.connect(master);
    this.shimmerGain.connect(reverb);

    [587.33, 880.0, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i * 4 - 4;
      const g = ctx.createGain();
      g.gain.value = [0.28, 0.14, 0.06][i];
      const trem = ctx.createOscillator();
      trem.frequency.value = 0.11 + i * 0.037;
      const tremDepth = ctx.createGain();
      tremDepth.gain.value = 0.5;
      const tremGain = ctx.createGain();
      tremGain.gain.value = 0.5;
      trem.connect(tremDepth).connect(tremGain.gain);
      osc.connect(g).connect(tremGain).connect(this.shimmerGain);
      osc.start();
      trem.start();
    });

    // -------------------------- aurora pad ------------------------------
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.4;
    this.padGain.connect(master);
    this.padGain.connect(reverb);

    [146.83, 220.0, 293.66, 349.23].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = i * 7 - 10;
      const g = ctx.createGain();
      g.gain.value = 0.16 / (i + 1);
      osc.connect(g).connect(padFilter).connect(this.padGain);
      osc.start();
    });

    // ------------------------------- sub --------------------------------
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    this.subGain.connect(master);
    this.subOsc = ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = 36.71;
    this.subOsc.connect(this.subGain);
    this.subOsc.start();

    this.ready = true;
    this._applyAct(this.act, 0.5);

    // opening exhale
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(0.0001, now);
    this.master.gain.exponentialRampToValueAtTime(this.enabled ? 0.62 : 0.0001, now + 2.8);
    this._chord([73.42, 110.0, 146.83, 220.0], 0.018, 7.0, 2.8);
    this.chime(0, 0.7);
    setTimeout(() => this.chime(2, 0.5), 1600);
  }

  _impulse(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.8) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    return buf;
  }

  _noiseBuffer(seconds, kind = 'white') {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.018 * white) / 1.018;
        data[i] = last * 3.2;
      }
    } else {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  _ramp(param, value, seconds = 2.2) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, Math.max(0.05, seconds / 3.2));
  }

  _applyAct(act, seconds = 2.4) {
    const mix = ACT_MIX[act] || ACT_MIX.still;
    this._ramp(this.seaGain.gain, mix.sea, seconds);
    this._ramp(this.windGain.gain, mix.wind, seconds);
    this._ramp(this.rainGain.gain, mix.rain, seconds);
    this._ramp(this.shimmerGain.gain, mix.shimmer, seconds);
    this._ramp(this.padGain.gain, mix.pad, seconds);
    this._ramp(this.subGain.gain, mix.sub, seconds);
    this._ramp(this.droneFilter.frequency, mix.cutoff, seconds);
    this._ramp(this.droneGain.gain, act === 'storm' ? 0.07 : act === 'eclipse' ? 0.06 : 0.055, seconds);
  }

  setAct(act) {
    this.act = act;
    if (!this.ready) return;
    this._applyAct(act, 2.8);
    if (act === 'eclipse') this._startHeartbeat();
    else this._stopHeartbeat();
    this.chime(act === 'storm' ? 4 : act === 'eclipse' ? 5 : act === 'aurora' ? 2 : 0, 0.35);
    setTimeout(() => {
      if (this.ready) this.chime(act === 'eclipse' ? 4 : 3, 0.25);
    }, 900);
  }

  _startHeartbeat() {
    if (this._heartbeat || !this.ctx) return;
    const beat = () => {
      if (!this.ready) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const makeThump = (at, gain, freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, at);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.62, at + 0.25);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
        osc.connect(g).connect(this.master);
        osc.start(at);
        osc.stop(at + 0.5);
      };
      makeThump(now, 0.055, 52);
      makeThump(now + 0.22, 0.032, 44);
    };
    beat();
    this._heartbeat = setInterval(beat, 2800);
  }

  _stopHeartbeat() {
    if (this._heartbeat) {
      clearInterval(this._heartbeat);
      this._heartbeat = null;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(enabled ? 0.62 : 0.0001, now, 0.18);
    if (enabled && this.ctx.state === 'suspended') this.ctx.resume();
  }

  chime(index = 0, volume = 1) {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.02;
    const note = NOTES[index % NOTES.length];
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.55;

    [1, 2.01, 3.98].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note * mult;
      const g = ctx.createGain();
      const peak = 0.045 * volume / (i + 1.6);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.012 + i * 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6 + i * 0.5);
      osc.connect(g).connect(pan);
      osc.start(now);
      osc.stop(now + 3.8);
    });
    pan.connect(this.master);
    pan.connect(this.reverb);
    pan.connect(this.delay);
  }

  _chord(freqs, volume, duration, attack = 1.0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      const g = ctx.createGain();
      osc.frequency.value = freq;
      osc.detune.value = i * 3 - 4;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(volume / (i + 1.4), now + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, now + attack + duration);
      osc.connect(g).connect(this.master);
      osc.connect(g).connect(this.reverb);
      osc.start(now);
      osc.stop(now + attack + duration + 0.5);
    });
  }

  tick() {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(720, now + 0.07);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.03, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(g).connect(this.master);
    osc.connect(g).connect(this.reverb);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  splash() {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseWhite;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(2800, now + 0.22);
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.4;
    src.connect(filter).connect(g).connect(pan);
    pan.connect(this.master);
    pan.connect(this.reverb);
    src.start(now);
    src.stop(now + 0.6);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.26);
    og.gain.setValueAtTime(0.0001, now + 0.02);
    og.gain.exponentialRampToValueAtTime(0.025, now + 0.03);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(og).connect(pan);
    osc.start(now + 0.02);
    osc.stop(now + 0.5);
  }

  whale() {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = -0.3;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(168, now);
    osc.frequency.exponentialRampToValueAtTime(92, now + 1.3);
    osc.frequency.exponentialRampToValueAtTime(118, now + 2.4);
    osc.frequency.exponentialRampToValueAtTime(74, now + 3.8);
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.6;
    const vibDepth = ctx.createGain();
    vibDepth.gain.value = 4.2;
    vib.connect(vibDepth).connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.55);
    gain.gain.setValueAtTime(0.05, now + 1.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);
    osc.connect(gain).connect(pan);
    pan.connect(this.master);
    pan.connect(this.reverb);
    osc.start(now);
    vib.start(now);
    osc.stop(now + 4.4);
    vib.stop(now + 4.4);

    const breath = ctx.createBufferSource();
    breath.buffer = this.noiseBrown;
    const bf = ctx.createBiquadFilter();
    bf.type = 'bandpass';
    bf.frequency.value = 380;
    bf.Q.value = 0.6;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, now);
    bg.gain.exponentialRampToValueAtTime(0.016, now + 0.7);
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
    breath.connect(bf).connect(bg).connect(pan);
    breath.start(now);
    breath.stop(now + 3.2);
  }

  resonance() {
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.02;

    // temple bell
    [55, 110, 220, 451].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i * 2;
      const g = ctx.createGain();
      const volume = 0.075 / (i + 1.2);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(volume, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 7.5 - i * 0.6);
      osc.connect(g).connect(this.master);
      osc.connect(g).connect(this.reverb);
      osc.start(now);
      osc.stop(now + 8);
    });

    this._chord([146.83, 220.0, 293.66, 349.23, 440.0], 0.05, 6.5, 1.2);

    // rising air
    const src = ctx.createBufferSource();
    src.buffer = this.noiseWhite;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(3600, now + 2.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.045, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0.15;
    src.connect(filter).connect(g).connect(pan);
    pan.connect(this.master);
    pan.connect(this.reverb);
    src.start(now);
    src.stop(now + 3);

    [0, 3, 5, 2, 6].forEach((note, i) => {
      setTimeout(() => this.chime(note, 0.8 - i * 0.08), 450 + i * 420);
    });
    setTimeout(() => this.whale(), 1000);
  }

  thunder() {
    if (!this.ready || !this.enabled) return;
    const delay = 380 + Math.random() * 900;
    const timer = setTimeout(() => {
      this._thunderTimers.delete(timer);
      if (!this.ready) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBrown;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + 2.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.09);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
      const pan = ctx.createStereoPanner();
      pan.pan.value = (Math.random() * 2 - 1) * 0.5;
      src.connect(filter).connect(g).connect(pan);
      pan.connect(this.master);
      pan.connect(this.reverb);
      src.start(now);
      src.stop(now + 4);

      const sub = ctx.createOscillator();
      const subG = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(46, now);
      sub.frequency.exponentialRampToValueAtTime(28, now + 1.4);
      subG.gain.setValueAtTime(0.0001, now);
      subG.gain.exponentialRampToValueAtTime(0.06, now + 0.08);
      subG.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      sub.connect(subG).connect(this.master);
      sub.start(now);
      sub.stop(now + 2.4);
    }, delay);
    this._thunderTimers.add(timer);
  }
}
