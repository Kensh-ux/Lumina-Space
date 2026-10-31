/*!
 * 林间小屋 · 场景引擎 v01（2026-10-28）
 * ------------------------------------------------------------------
 * 纯代码生成的 low-poly 森林小屋，四景：晴 / 雨 / 雪 / 黄昏。
 * 设计约定：
 *   1. 不依赖任何外部模型、贴图、字体文件；纹理全部 canvas 生成。
 *   2. 经典脚本（无 import），只向 window.CabinSceneEngine 暴露工厂；
 *      演示页通过 <script> 加载，Lumina-Space 通过 React 包装挂载。
 *   3. 场景只接收 options，不读写 localStorage，不碰业务数据。
 *   4. 由调用方传入 THREE（浏览器全局或 Vite 里的 import * as THREE）。
 * 兼容：three r149 ～ r17x（r159 之后 UMD 已移除，引擎本身不关心加载方式）。
 */
(function (global) {
  'use strict';

  const WEATHERS = ['sunny', 'rain', 'snow', 'dusk'];
  const TWO_PI = Math.PI * 2;
  const MAX_SNOWMEN = 12;

  /* 小人台词：尽量保留原句的口气与标点。第20次点击会插播彩蛋。 */
  const TALK_LINES = {
    sunny: [
      '有人让我坐在这里，说可以晒太阳',
      '你知道吗，我的创作者花了很多时间……',
      '什么？',
      '哦，当然是做那些炫酷的界面，他说很有意思',
      '我还是要说，以巧克力，以德芙人',
      'zdjd'
    ],
    rain: [
      '我应该回屋，可惜开销会变大，我只能坐在这了',
      '雨伞是像蘑菇一样长出来的，神奇吧？',
      '他说他很喜欢下雨天，但前提是他在屋子里',
      '雨天，谁会出门呢'
    ],
    snow: [
      '你可以试着堆雪人，1212',
      '雪，美好的东西',
      '我像不像一个毛绒球？',
      '他格外喜欢冬天，我不知道为什么',
      '冬天窝在屋子里也格外好啊',
      '试着对话20下？'
    ],
    dusk: [
      '怀念啊，就是在这样的夕阳下，我走出了高考考点的大门',
      '思考.jpg',
      '还是看书吧',
      '聊天啊，挺好的，但是没人和我聊天',
      '其实一开始这个界面才是主角，可惜无法做到完美'
    ]
  };
  
  const TALK_EGG = [
   '我是zzk,其实我在那个小屋里,v我50我将横空出世',
   '你可以把你的想法告诉我让我来实现,当然,如果你有我联系方式的话'
  ];
  const TALK_EGG_EVERY = 20;
  
  const SPEECH_STYLE_ID = 'cabin-speech-style';
  const SPEECH_CSS = [
    '.cabin-speech{position:fixed;z-index:70;left:0;top:0;box-sizing:border-box;',
    'width:max-content;max-width:min(360px,78vw);padding:12px 18px 13px;border-radius:15px;',
    'border:1px solid rgba(255,255,255,.5);background:rgba(248,241,226,.95);color:#33402f;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;',
    'font-size:14px;font-weight:500;line-height:1.68;letter-spacing:.015em;text-align:center;',
    'white-space:pre-line;overflow-wrap:break-word;',
    'box-shadow:0 14px 38px rgba(9,16,12,.3),inset 0 1px 0 rgba(255,255,255,.7);',
    'opacity:0;transform:translate(-50%,calc(-100% - 16px)) scale(.96);transform-origin:50% 100%;',
    'transition:opacity .26s ease,transform .3s cubic-bezier(.2,.8,.3,1);pointer-events:none;',
    'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
    '.cabin-speech[data-weather="rain"]{background:rgba(231,240,245,.95);color:#2c3b42;}',
    '.cabin-speech[data-weather="snow"]{background:rgba(246,251,255,.96);color:#30434e;}',
    '.cabin-speech[data-weather="dusk"]{background:rgba(248,230,213,.95);color:#42302e;}',
    '.cabin-speech::after{content:"";position:absolute;left:50%;bottom:-6px;width:12px;height:12px;',
    'border-radius:2px;background:inherit;border-right:1px solid rgba(255,255,255,.45);',
    'border-bottom:1px solid rgba(255,255,255,.45);transform:translateX(-50%) rotate(45deg);}',
    '.cabin-speech.is-visible{opacity:1;transform:translate(-50%,calc(-100% - 22px)) scale(1);}',
    '.cabin-speech.is-below{transform:translate(-50%,12px) scale(.96);transform-origin:50% 0;}',
    '.cabin-speech.is-below::after{bottom:auto;top:-6px;}',
    '.cabin-speech.is-below.is-visible{transform:translate(-50%,20px) scale(1);}'
  ].join('');

  // 旧浏览器兜底：纹理绘制里用了 roundRect。
  if (
    typeof CanvasRenderingContext2D !== 'undefined' &&
    CanvasRenderingContext2D.prototype &&
    typeof CanvasRenderingContext2D.prototype.roundRect !== 'function'
  ) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
      const r = Math.min(typeof radius === 'number' ? radius : 0, width / 2, height / 2);
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + width, y, x + width, y + height, r);
      this.arcTo(x + width, y + height, x, y + height, r);
      this.arcTo(x, y + height, x, y, r);
      this.arcTo(x, y, x + width, y, r);
      this.closePath();
    };
  }

  /* ------------------------------------------------------------------
   * 天气预设：所有颜色/强度在这里集中，切换时只做插值。
   * 光照单位按 three r149 的 legacy lights 调过；新版本由 useLegacyLights 兜底。
   * ------------------------------------------------------------------ */
  const PRESETS = {
    sunny: {
      skyTop: 0x2867aa,
      skyHorizon: 0xa6c8da,
      fog: 0xafc6cf,
      fogDensity: 0.011,
      sunColor: 0xffdda6,
      sunIntensity: 2.15,
      sunDir: [-0.6, 0.56, -0.32],
      hemiSky: 0xbedcff,
      hemiGround: 0x63744a,
      hemiIntensity: 0.82,
      ambient: 0xfff7e8,
      ambientIntensity: 0.14,
      exposure: 0.98,
      cloud: 0xfff6e6,
      cloudOpacity: 0.5,
      snow: 0,
      rain: 0,
      stars: 0,
      fireflies: 0,
      motes: 0.55,
      window: 0.0,
      lantern: 0,
      smoke: 0.5,
      birds: 1,
      butterflies: 1,
      flowers: 1,
      sunGlow: 1,
      groundTint: 0xffffff,
      foliageTint: 0xffffff,
      personShirt: 0xf3ecda,
      personSleeve: 0xf3ecda,
      personPants: 0x6f7f68,
      personBoots: 0x5a4737,
      bloom: 0.36,
      rays: 0.62,
      vignette: 0.26,
      grain: 0.018,
      saturation: 1.06,
      contrast: 1.12,
      postTint: 0xfff5e4,
      postShadow: 0x7fa0c4,
      postHighlight: 0xffdfae,
      split: 0.2
    },
    rain: {
      skyTop: 0x46545f,
      skyHorizon: 0x8d9ca4,
      fog: 0x8b99a2,
      fogDensity: 0.03,
      sunColor: 0xb8cad6,
      sunIntensity: 0.5,
      sunDir: [-0.32, 0.67, -0.24],
      hemiSky: 0x9fb5c3,
      hemiGround: 0x48544a,
      hemiIntensity: 0.56,
      ambient: 0xdce8ee,
      ambientIntensity: 0.18,
      exposure: 0.9,
      cloud: 0x67757e,
      cloudOpacity: 0.9,
      snow: 0,
      rain: 1,
      stars: 0,
      fireflies: 0,
      motes: 0,
      window: 1.1,
      lantern: 0.75,
      smoke: 0.8,
      birds: 0,
      butterflies: 0,
      flowers: 0.35,
      sunGlow: 0.08,
      groundTint: 0xc8d4d8,
      foliageTint: 0xb7c5c4,
      personShirt: 0xe1b24a,
      personSleeve: 0xe1b24a,
      personPants: 0x4e5b54,
      personBoots: 0x454f47,
      bloom: 0.2,
      rays: 0.08,
      vignette: 0.32,
      grain: 0.042,
      saturation: 0.8,
      contrast: 1.06,
      postTint: 0xdfe9f2,
      postShadow: 0x54708a,
      postHighlight: 0xcfe0ea,
      split: 0.18
    },
    snow: {
      skyTop: 0x7b93a9,
      skyHorizon: 0xdde8ef,
      fog: 0xc9d7e1,
      fogDensity: 0.024,
      sunColor: 0xe9f1f8,
      sunIntensity: 0.95,
      sunDir: [-0.4, 0.69, -0.33],
      hemiSky: 0xd7e7f3,
      hemiGround: 0x7c8995,
      hemiIntensity: 0.98,
      ambient: 0xeaf4fb,
      ambientIntensity: 0.24,
      exposure: 1.06,
      cloud: 0xd0dbe4,
      cloudOpacity: 0.72,
      snow: 1,
      rain: 0,
      stars: 0.12,
      fireflies: 0,
      motes: 0,
      window: 1.3,
      lantern: 1.05,
      smoke: 0.95,
      birds: 0,
      butterflies: 0,
      flowers: 0,
      sunGlow: 0.32,
      groundTint: 0xffffff,
      foliageTint: 0xe4eef2,
      personShirt: 0xc96f5c,
      personSleeve: 0xc96f5c,
      personPants: 0x5c504d,
      personBoots: 0x55423b,
      bloom: 0.34,
      rays: 0.26,
      vignette: 0.26,
      grain: 0.026,
      saturation: 0.92,
      contrast: 1.05,
      postTint: 0xeef6ff,
      postShadow: 0x7592ad,
      postHighlight: 0xffffff,
      split: 0.14
    },
    dusk: {
      skyTop: 0x3b3a6e,
      skyHorizon: 0xf4a36b,
      fog: 0xa77985,
      fogDensity: 0.017,
      sunColor: 0xffb070,
      sunIntensity: 1.15,
      sunDir: [-0.7, 0.14, -0.6],
      hemiSky: 0x8b80ba,
      hemiGround: 0x4b4550,
      hemiIntensity: 0.62,
      ambient: 0xffc9a0,
      ambientIntensity: 0.22,
      exposure: 1,
      cloud: 0xf2b28e,
      cloudOpacity: 0.55,
      snow: 0,
      rain: 0,
      stars: 1,
      fireflies: 1,
      motes: 0.32,
      window: 1.45,
      lantern: 1.65,
      smoke: 0.6,
      birds: 0,
      butterflies: 0,
      flowers: 0.55,
      sunGlow: 1.25,
      groundTint: 0xffd9b0,
      foliageTint: 0xffd2b0,
      personShirt: 0x8f6b8a,
      personSleeve: 0x8f6b8a,
      personPants: 0x584d63,
      personBoots: 0x4a3b3f,
      bloom: 0.64,
      rays: 0.9,
      vignette: 0.32,
      grain: 0.022,
      saturation: 1.06,
      contrast: 1.05,
      postTint: 0xffd9b8,
      postShadow: 0x6a5a99,
      postHighlight: 0xffb070,
      split: 0.24
    }
  };

  /* ------------------------------------------------------------------ */
  /* 小工具                                                             */
  /* ------------------------------------------------------------------ */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }

  function dampColor(color, target, lambda, dt) {
    color.lerp(target, 1 - Math.exp(-lambda * dt));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function ensureSpeechStyle() {
    if (typeof document === 'undefined' || !document.head) {
      return;
    }
    if (document.getElementById(SPEECH_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = SPEECH_STYLE_ID;
    style.textContent = SPEECH_CSS;
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------
   * 程序化环境声：不加载任何音频文件，全部由 Web Audio 合成。
   * 浏览器要求用户手势后才能出声，所以音频图在第一次手势时才建立。
   * ------------------------------------------------------------------ */
  function createSoundscape(host, settings) {
    const cfg = settings || {};
    const AudioCtor = host.AudioContext || host.webkitAudioContext;
    const supported = typeof AudioCtor === 'function';
    const mixes = {
      sunny: { wind: 0.042, leaf: 0.016, rain: 0, rumble: 0, snow: 0 },
      rain: { wind: 0.028, leaf: 0.002, rain: 0.15, rumble: 0.05, snow: 0 },
      snow: { wind: 0.056, leaf: 0, rain: 0, rumble: 0, snow: 0.055 },
      dusk: { wind: 0.03, leaf: 0.005, rain: 0, rumble: 0, snow: 0 }
    };
    let enabled = cfg.enabled === true;
    let volume = clamp(typeof cfg.volume === 'number' ? cfg.volume : 0.62, 0, 1);
    let weather = mixes[cfg.weather] ? cfg.weather : 'sunny';
    let ctx = null;
    let master = null;
    let noiseBuffer = null;
    let windGain = null;
    let leafGain = null;
    let rainGain = null;
    let rumbleGain = null;
    let snowGain = null;
    let started = false;
    let eventTimer = 0;
    let disposed = false;
    const loops = [];
    const oscillators = [];
    const MAX_OUTPUT = 0.9;

    function getState() {
      return {
        supported: supported,
        enabled: enabled,
        running: !!(ctx && ctx.state === 'running'),
        weather: weather,
        volume: volume
      };
    }

    function emit() {
      if (typeof cfg.onChange !== 'function' || disposed) {
        return;
      }
      try {
        cfg.onChange(getState());
      } catch (error) {
        if (typeof host.console !== 'undefined' && host.console.warn) {
          host.console.warn('[cabinScene] 声音状态回调异常：', error);
        }
      }
    }

    function makeNoiseBuffer(audioCtx) {
      const length = Math.max(1, Math.floor(audioCtx.sampleRate * 2.4));
      const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      // 粉红噪声比白噪声更像风、雨和远处的林声。
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
      }
      return buffer;
    }

    function noiseLoop(offset) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      src.start(0, offset);
      loops.push(src);
      return src;
    }

    function ensureGraph() {
      if (ctx) {
        return true;
      }
      if (!supported || disposed) {
        return false;
      }
      try {
        ctx = new AudioCtor();
        master = ctx.createGain();
        master.gain.value = 0;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 24;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.02;
        compressor.release.value = 0.3;
        master.connect(compressor);
        compressor.connect(ctx.destination);
        noiseBuffer = makeNoiseBuffer(ctx);

        // 风：低通粉噪，慢 LFO 让松林一呼一吸。
        const windSrc = noiseLoop(Math.random() * 1.4);
        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'lowpass';
        windFilter.frequency.value = 430;
        windFilter.Q.value = 0.45;
        windGain = ctx.createGain();
        windGain.gain.value = 0;
        windSrc.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(master);
        const windLfo = ctx.createOscillator();
        windLfo.frequency.value = 0.07;
        const windLfoGain = ctx.createGain();
        windLfoGain.gain.value = 0.016;
        windLfo.connect(windLfoGain);
        windLfoGain.connect(windGain.gain);
        windLfo.start();
        oscillators.push(windLfo);

        // 叶隙：带通噪声，晴天偶尔沙沙响。
        const leafSrc = noiseLoop(Math.random() * 1.4);
        const leafFilter = ctx.createBiquadFilter();
        leafFilter.type = 'bandpass';
        leafFilter.frequency.value = 1500;
        leafFilter.Q.value = 0.7;
        leafGain = ctx.createGain();
        leafGain.gain.value = 0;
        leafSrc.connect(leafFilter);
        leafFilter.connect(leafGain);
        leafGain.connect(master);

        // 雨：高通噪声铺底，加一条低通低频作远处雨幕。
        const rainSrc = noiseLoop(Math.random() * 1.4);
        const rainHigh = ctx.createBiquadFilter();
        rainHigh.type = 'highpass';
        rainHigh.frequency.value = 1050;
        rainHigh.Q.value = 0.4;
        const rainLow = ctx.createBiquadFilter();
        rainLow.type = 'lowpass';
        rainLow.frequency.value = 7400;
        rainGain = ctx.createGain();
        rainGain.gain.value = 0;
        rainSrc.connect(rainHigh);
        rainHigh.connect(rainLow);
        rainLow.connect(rainGain);
        rainGain.connect(master);

        const rumbleSrc = noiseLoop(Math.random() * 1.4);
        const rumbleFilter = ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 170;
        rumbleFilter.Q.value = 0.5;
        rumbleGain = ctx.createGain();
        rumbleGain.gain.value = 0;
        rumbleSrc.connect(rumbleFilter);
        rumbleFilter.connect(rumbleGain);
        rumbleGain.connect(master);

        // 雪：被雪压住的空气，低通噪声更闷。
        const snowSrc = noiseLoop(Math.random() * 1.4);
        const snowFilter = ctx.createBiquadFilter();
        snowFilter.type = 'lowpass';
        snowFilter.frequency.value = 760;
        snowFilter.Q.value = 0.35;
        snowGain = ctx.createGain();
        snowGain.gain.value = 0;
        snowSrc.connect(snowFilter);
        snowFilter.connect(snowGain);
        snowGain.connect(master);
      } catch (error) {
        if (ctx && typeof ctx.close === 'function') {
          try {
            ctx.close();
          } catch (closeError) {
            /* 忽略 */
          }
        }
        ctx = null;
        master = null;
        return false;
      }
      return true;
    }

    function applyMix(ramp) {
      if (!ctx) {
        return;
      }
      const time = ctx.currentTime;
      const tau = typeof ramp === 'number' ? ramp : 0.9;
      const mix = mixes[weather] || mixes.sunny;
      const bus = [
        [windGain, mix.wind],
        [leafGain, mix.leaf],
        [rainGain, mix.rain],
        [rumbleGain, mix.rumble],
        [snowGain, mix.snow]
      ];
      for (let i = 0; i < bus.length; i += 1) {
        if (bus[i][0]) {
          bus[i][0].gain.setTargetAtTime(bus[i][1], time, tau);
        }
      }
    }

    function tone(type, freq, start, duration, peak, slideTo) {
      if (!ctx || !master) {
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + Math.min(0.022, duration * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.04);
    }

    function noiseBurst(start, duration, peak, type, freq, q) {
      if (!ctx || !master || !noiseBuffer) {
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      const safe = Math.max(0.04, duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + Math.min(0.04, safe * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + safe);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(start, Math.random() * 0.7, safe + 0.06);
      src.stop(start + safe + 0.08);
    }

    function bird(at) {
      const base = 2050 + Math.random() * 760;
      const notes = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < notes; i += 1) {
        const start = at + i * (0.13 + Math.random() * 0.05);
        tone('sine', base * (1 + i * 0.05), start, 0.1, 0.012, base * (1.34 - i * 0.04));
      }
    }

    function leafRustle(at) {
      noiseBurst(at, 0.55, 0.011, 'bandpass', 1700, 0.8);
    }

    function drip(at) {
      const freq = 880 + Math.random() * 980;
      tone('sine', freq, at, 0.09, 0.015, freq * 0.52);
      noiseBurst(at, 0.045, 0.007, 'highpass', 2400, 0.7);
    }

    function cricket(at) {
      const base = 4020 + Math.random() * 260;
      for (let i = 0; i < 4; i += 1) {
        tone('triangle', base, at + i * 0.062, 0.032, 0.0065);
      }
    }

    function crackle(at) {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i += 1) {
        noiseBurst(
          at + Math.random() * 0.3,
          0.009 + Math.random() * 0.026,
          0.008 + Math.random() * 0.016,
          'bandpass',
          1700 + Math.random() * 1900,
          1.15
        );
      }
    }

    function snowSettle(at) {
      noiseBurst(at, 0.7, 0.011, 'lowpass', 430, 0.5);
    }

    function thunder(at) {
      noiseBurst(at, 1.8, 0.085, 'lowpass', 120, 0.7);
      tone('sine', 54, at, 1.6, 0.02, 38);
    }

    function pulse() {
      if (!enabled || !ctx || ctx.state !== 'running' || disposed) {
        return;
      }
      const at = ctx.currentTime + 0.05;
      const roll = Math.random();
      if (weather === 'sunny') {
        if (roll < 0.16) {
          bird(at);
        } else if (roll > 0.86) {
          leafRustle(at);
        }
      } else if (weather === 'rain') {
        if (roll < 0.48) {
          drip(at);
        }
        if (roll > 0.993) {
          thunder(at);
        }
      } else if (weather === 'snow') {
        if (roll > 0.92) {
          snowSettle(at);
        }
      } else if (weather === 'dusk') {
        if (roll < 0.3) {
          cricket(at);
        } else if (roll > 0.76) {
          crackle(at);
        }
      }
    }

    function unlock() {
      if (disposed || !enabled || !supported) {
        emit();
        return false;
      }
      if (!ensureGraph()) {
        emit();
        return false;
      }
      if (!started) {
        started = true;
        applyMix(0.35);
        eventTimer = host.setInterval(pulse, 760);
      }
      const target = volume * MAX_OUTPUT;
      master.gain.setTargetAtTime(target, ctx.currentTime, 0.7);
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        const resumed = ctx.resume();
        if (resumed && typeof resumed.then === 'function') {
          resumed.then(emit, function () {});
        }
      }
      emit();
      return true;
    }

    function setEnabled(next) {
      enabled = !!next;
      if (!enabled) {
        if (ctx && master) {
          master.gain.setTargetAtTime(0, ctx.currentTime, 0.18);
        }
        emit();
        return false;
      }
      unlock();
      return true;
    }

    function setVolume(next) {
      const clamped = clamp(Number(next) || 0, 0, 1);
      volume = clamped;
      if (ctx && master && enabled) {
        master.gain.setTargetAtTime(volume * MAX_OUTPUT, ctx.currentTime, 0.3);
      }
      emit();
      return volume;
    }

    function setWeather(name) {
      if (!mixes[name]) {
        return false;
      }
      weather = name;
      applyMix(0.9);
      emit();
      return true;
    }

    function chime(name, egg) {
      if (!enabled || !ctx || ctx.state !== 'running' || disposed) {
        return;
      }
      const sets = {
        sunny: [523.25, 659.25],
        rain: [392, 493.88],
        snow: [587.33, 739.99],
        dusk: [349.23, 440]
      };
      const notes = egg ? [523.25, 659.25, 783.99] : sets[name] || sets.sunny;
      const at = ctx.currentTime + 0.02;
      for (let i = 0; i < notes.length; i += 1) {
        tone('triangle', notes[i], at + i * 0.11, 0.42, 0.026);
      }
    }

    function dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      if (eventTimer) {
        host.clearInterval(eventTimer);
        eventTimer = 0;
      }
      oscillators.forEach(function (osc) {
        try {
          osc.stop();
        } catch (error) {
          /* 忽略 */
        }
      });
      loops.forEach(function (src) {
        try {
          src.stop();
        } catch (error) {
          /* 忽略 */
        }
      });
      oscillators.length = 0;
      loops.length = 0;
      if (ctx && typeof ctx.close === 'function') {
        try {
          ctx.close();
        } catch (error) {
          /* 忽略 */
        }
      }
      ctx = null;
      master = null;
      noiseBuffer = null;
    }

    host.setTimeout(function () {
      if (!disposed) {
        emit();
      }
    }, 0);

    return {
      isSupported: function () {
        return supported;
      },
      isEnabled: function () {
        return enabled;
      },
      getState: getState,
      unlock: unlock,
      setEnabled: setEnabled,
      setVolume: setVolume,
      setWeather: setWeather,
      chime: chime,
      dispose: dispose
    };
  }

  function makeRng(seed) {
    let s = seed >>> 0;
    return function random() {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(x, z) {
    return (
      Math.sin(x * 12.9898 + z * 78.233) * 0.5 +
      Math.sin(x * 4.1414 - z * 7.371 + 1.7) * 0.3 +
      Math.sin(x * 1.93 + z * 2.71 + 4.2) * 0.2
    );
  }

  function makeTexture(THREE, width, height, paint, settings) {
    const opts = settings || {};
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D 不可用');
    }
    paint(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    texture.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (opts.repeat) {
      texture.repeat.set(opts.repeat[0], opts.repeat[1]);
    }
    const isColor = opts.color !== false;
    if (isColor) {
      if ('colorSpace' in texture && THREE.SRGBColorSpace) {
        texture.colorSpace = THREE.SRGBColorSpace;
      }
      if ('encoding' in texture && THREE.sRGBEncoding) {
        texture.encoding = THREE.sRGBEncoding;
      }
    }
    texture.anisotropy = 4;
    return texture;
  }

  function makeGlowTexture(THREE, size, stops) {
    return makeTexture(
      THREE,
      size,
      size,
      (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        stops.forEach(([offset, color]) => g.addColorStop(offset, color));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
      { clamp: true, color: false }
    );
  }

  /**
   * 把一组静态 Mesh 按材质合并。用于小屋/栅栏等，significant 地减少 draw call。
   * 合并后每个材质一个 Mesh，统一 cast/receive shadow。
   */
  function mergeStatic(THREE, group) {
    group.updateMatrixWorld(true);
    const buckets = new Map();
    group.traverse((node) => {
      if (!node.isMesh || Array.isArray(node.material)) {
        return;
      }
      const source = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      source.applyMatrix4(node.matrixWorld);
      if (!source.attributes.normal) {
        source.computeVertexNormals();
      }
      const count = source.attributes.position.count;
      if (!source.attributes.uv) {
        source.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
      }
      const key = node.material.uuid;
      if (!buckets.has(key)) {
        buckets.set(key, { material: node.material, geometries: [] });
      }
      buckets.get(key).geometries.push(source);
    });

    const output = new THREE.Group();
    output.name = 'merged-static';
    buckets.forEach(({ material, geometries }) => {
      let total = 0;
      geometries.forEach((geometry) => {
        total += geometry.attributes.position.count;
      });
      const positions = new Float32Array(total * 3);
      const normals = new Float32Array(total * 3);
      const uvs = new Float32Array(total * 2);
      let offset = 0;
      geometries.forEach((geometry) => {
        positions.set(geometry.attributes.position.array, offset * 3);
        normals.set(geometry.attributes.normal.array, offset * 3);
        uvs.set(geometry.attributes.uv.array, offset * 2);
        offset += geometry.attributes.position.count;
        geometry.dispose();
      });
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = !material.transparent;
      mesh.receiveShadow = true;
      output.add(mesh);
    });

    group.traverse((node) => {
      if (node.isMesh) {
        node.geometry.dispose();
      }
    });
    return output;
  }

  /* ------------------------------------------------------------------ */
  /* 主工厂                                                             */
  /* ------------------------------------------------------------------ */

  function createCabinScene(canvas, options) {
    const opts = options || {};
    const THREE = opts.THREE || global.THREE;
    if (!THREE) {
      throw new Error('需要 Three.js：请先加载 three，或在 options.THREE 传入');
    }
    if (!canvas) {
      throw new Error('缺少 canvas');
    }

    /* 颜色管线：
     * r149 默认 legacyMode=true，会把 sRGB 十六进制颜色当成线性色，画面发灰。
     * 构建期临时切到 sRGB→线性转换，建完后恢复宿主项目的全局设置；
     * 运行时改色统一走 setSrgbHex，避免依赖全局状态。 */
    const colorManagement = THREE.ColorManagement;
    const legacyColorMode =
      colorManagement && typeof colorManagement.legacyMode === 'boolean'
        ? colorManagement.legacyMode
        : null;
    if (legacyColorMode === true) {
      colorManagement.legacyMode = false;
    }
    function setSrgbHex(color, hex) {
      if (legacyColorMode === true) {
        color.setHex(hex).convertSRGBToLinear();
      } else {
        color.set(hex);
      }
      return color;
    }

    const reducedQuery =
      typeof global.matchMedia === 'function'
        ? global.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    let reducedMotion =
      opts.reducedMotion === undefined ? !!(reducedQuery && reducedQuery.matches) : !!opts.reducedMotion;
    let disposed = false;
    let ready = false;
    let raf = 0;
    let clockTime = 0;
    let lastFrame = 0;
    let fps = 60;
    let fpsFrames = 0;
    let fpsStamp = 0;
    let snowLevel = 0;
    let lastGroundSnow = -1;
    let lastCapSnow = -1;
    let targetWeather = 'sunny';
    let noticeHandler = typeof opts.onNotice === 'function' ? opts.onNotice : null;

    const soundscape = createSoundscape(global, {
      enabled: opts.sound === true,
      volume: opts.volume,
      weather: 'sunny',
      onChange: function (audioState) {
        if (typeof opts.onAudioStateChange !== 'function') {
          return;
        }
        try {
          opts.onAudioStateChange(audioState);
        } catch (error) {
          if (typeof global.console !== 'undefined' && global.console.warn) {
            global.console.warn('[cabinScene] onAudioStateChange 回调异常：', error);
          }
        }
      }
    });

    const onUserGesture = function () {
      if (soundscape.isEnabled()) {
        soundscape.unlock();
      }
    };
    // 即使挂载时静音也先挂手势监听：之后用 API 开声时，下一次交互仍能解锁 AudioContext。
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('pointerdown', onUserGesture, true);
      document.addEventListener('keydown', onUserGesture, true);
    }

    /* --- 渲染器 ---------------------------------------------------- */
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: opts.preserveDrawingBuffer === true,
        powerPreference: 'high-performance'
      });
    } catch (error) {
      if (typeof opts.onError === 'function') {
        opts.onError(error);
      }
      throw error;
    }
    const lowQuality = opts.quality === 'low';
    const maxDpr = lowQuality ? 1 : Math.min(global.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(maxDpr);
    renderer.setClearColor(0x101a15, 1);
    renderer.shadowMap.enabled = !lowQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    if ('useLegacyLights' in renderer) {
      renderer.useLegacyLights = true;
    }

    const scene = new THREE.Scene();
    scene.name = 'cabinscene';
    scene.fog = new THREE.FogExp2(PRESETS.sunny.fog, PRESETS.sunny.fogDensity);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 220);
    const cameraTarget = new THREE.Vector3(-0.35, 1.9, 0.55);
    const baseYaw = 0.56;
    const basePitch = 0.14;
    const baseRadius = 14.2;
    let fitScale = 1;
    let yaw = baseYaw;
    let pitch = basePitch;
    let radius = baseRadius;
    let targetYaw = baseYaw;
    let targetPitch = basePitch;
    let targetRadius = baseRadius;
    let dragYaw = 0;
    let dragPitch = 0;
    let parallaxX = 0;
    let parallaxY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;

    /* --- 颜色管理（r149 legacy 模式下保持预设色；新版本灯值用 legacy 兜底） */
    const COLOR = (hex) => new THREE.Color(hex);

    /* ------------------------------------------------------------------
     * 电影感后期：HDR 场景 → 高光泛光 → ACES 电影曲线 → 调色/暗角/颗粒
     * 全部用 three 内置能力实现，无外部 EffectComposer 依赖。
     * ------------------------------------------------------------------ */
    const post = (function createPostPipeline() {
      const useHalfFloat =
        renderer.capabilities && renderer.capabilities.isWebGL2 ? true : false;
      const hdrType = useHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
      function makeTarget(depth) {
        const target = new THREE.WebGLRenderTarget(2, 2, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: hdrType,
          depthBuffer: depth,
          stencilBuffer: false
        });
        if (THREE.LinearEncoding && target.texture && 'encoding' in target.texture) {
          target.texture.encoding = THREE.LinearEncoding;
        }
        return target;
      }
      const sceneRT = makeTarget(true);
      const brightRT = makeTarget(false);
      const blurA = makeTarget(false);
      const blurB = makeTarget(false);

      const quadScene = new THREE.Scene();
      const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
      quad.frustumCulled = false;
      quadScene.add(quad);

      const vertexShader = [
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = vec4(position.xy, 0.0, 1.0);',
        '}'
      ].join('\n');

      const brightMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          uThreshold: { value: 1.15 },
          uSoft: { value: 0.9 }
        },
        vertexShader: vertexShader,
        fragmentShader: [
          'uniform sampler2D tDiffuse;',
          'uniform float uThreshold;',
          'uniform float uSoft;',
          'varying vec2 vUv;',
          'void main() {',
          '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
          '  float l = max(c.r, max(c.g, c.b));',
          '  float k = smoothstep(uThreshold, uThreshold + uSoft, l);',
          '  gl_FragColor = vec4(c * k, 1.0);',
          '}'
        ].join('\n'),
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });

      const blurMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          uDirection: { value: new THREE.Vector2(1, 0) }
        },
        vertexShader: vertexShader,
        fragmentShader: [
          'uniform sampler2D tDiffuse;',
          'uniform vec2 uDirection;',
          'varying vec2 vUv;',
          'void main() {',
          '  vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.227027;',
          '  vec2 o1 = uDirection * 1.384615;',
          '  vec2 o2 = uDirection * 3.230769;',
          '  sum += (texture2D(tDiffuse, vUv + o1).rgb + texture2D(tDiffuse, vUv - o1).rgb) * 0.316216;',
          '  sum += (texture2D(tDiffuse, vUv + o2).rgb + texture2D(tDiffuse, vUv - o2).rgb) * 0.070270;',
          '  gl_FragColor = vec4(sum, 1.0);',
          '}'
        ].join('\n'),
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });

      const uniforms = {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSun: { value: new THREE.Vector2(0.5, 0.8) },
        uSunVisible: { value: 0 },
        uExposure: { value: 1.35 },
        uBloom: { value: 0.45 },
        uRays: { value: 0.5 },
        uVignette: { value: 0.2 },
        uGrain: { value: 0.016 },
        uSaturation: { value: 1.1 },
        uContrast: { value: 1.03 },
        uTint: { value: new THREE.Color(1, 1, 1) },
        uShadowTint: { value: new THREE.Color(0.55, 0.68, 0.8) },
        uHighlightTint: { value: new THREE.Color(1, 0.93, 0.82) },
        uSplit: { value: 0.14 },
        uTime: { value: 0 }
      };
      const compositeMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: [
          'uniform sampler2D tDiffuse;',
          'uniform sampler2D tBloom;',
          'uniform vec2 uResolution;',
          'uniform vec2 uSun;',
          'uniform float uSunVisible;',
          'uniform float uExposure;',
          'uniform float uBloom;',
          'uniform float uRays;',
          'uniform float uVignette;',
          'uniform float uGrain;',
          'uniform float uSaturation;',
          'uniform float uContrast;',
          'uniform vec3 uTint;',
          'uniform vec3 uShadowTint;',
          'uniform vec3 uHighlightTint;',
          'uniform float uSplit;',
          'uniform float uTime;',
          'varying vec2 vUv;',
          'vec3 acesFilm(vec3 x) {',
          '  x *= 0.62;',
          '  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);',
          '}',
          'float hash12(vec2 p) {',
          '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
          '  p3 += dot(p3, p3.yzx + 33.33);',
          '  return fract((p3.x + p3.y) * p3.z);',
          '}',
          'void main() {',
          '  vec2 uv = vUv;',
          '  vec3 color = texture2D(tDiffuse, uv).rgb;',
          '  vec3 bloom = texture2D(tBloom, uv).rgb;',
          '  vec2 delta = (uSun - uv) / 14.0;',
          '  vec2 coord = uv;',
          '  vec3 rays = vec3(0.0);',
          '  float decay = 1.0;',
          '  for (int i = 0; i < 14; i++) {',
          '    coord += delta;',
          '    rays += texture2D(tBloom, coord).rgb * decay;',
          '    decay *= 0.9;',
          '  }',
          '  color += bloom * uBloom;',
          '  color += rays * (uRays * uSunVisible * 0.05) * vec3(1.0, 0.86, 0.64);',
          '  color = acesFilm(color * uExposure);',
          '  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));',
          '  color = mix(vec3(luma), color, uSaturation);',
          '  color = (color - 0.5) * uContrast + 0.5;',
          '  float toneLuma = dot(clamp(color, 0.0, 1.0), vec3(0.2126, 0.7152, 0.0722));',
          '  float shadowW = 1.0 - smoothstep(0.02, 0.5, toneLuma);',
          '  float highW = smoothstep(0.4, 1.0, toneLuma);',
          '  vec3 shadowTone = mix(vec3(1.0), uShadowTint * 1.9, shadowW * uSplit);',
          '  vec3 highTone = mix(vec3(1.0), uHighlightTint * 1.22, highW * uSplit);',
          '  color *= shadowTone * highTone;',
          '  color *= uTint;',
          '  // 电影感负片提黑：暗部保留一点阴影色，避免死黑。',
          '  color = color * 0.968 + uShadowTint * 0.03;',
          '  vec2 q = uv - 0.5;',
          '  float vig = 1.0 - smoothstep(0.3, 0.9, length(q * vec2(1.06, 1.0)));',
          '  color *= mix(1.0 - uVignette, 1.0, vig);',
          '  float grain = hash12(uv * uResolution + fract(uTime) * 97.0) - 0.5;',
          '  color += grain * uGrain;',
          '  color = pow(clamp(color, 0.0, 1.0), vec3(0.4545));',
          '  gl_FragColor = vec4(color, 1.0);',
          '}'
        ].join('\n'),
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      });

      let bloomWidth = 1;
      let bloomHeight = 1;
      const sceneInfo = { triangles: 0, calls: 0 };

      function setSize(width, height) {
        const w = Math.max(2, Math.floor(width));
        const h = Math.max(2, Math.floor(height));
        sceneRT.setSize(w, h);
        bloomWidth = Math.max(2, Math.floor(w / 4));
        bloomHeight = Math.max(2, Math.floor(h / 4));
        brightRT.setSize(bloomWidth, bloomHeight);
        blurA.setSize(bloomWidth, bloomHeight);
        blurB.setSize(bloomWidth, bloomHeight);
        uniforms.uResolution.value.set(w, h);
      }

      function draw(material, target) {
        quad.material = material;
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(quadScene, quadCamera);
      }

      function render(sceneRef, cameraRef) {
        renderer.setRenderTarget(sceneRT);
        renderer.clear();
        renderer.render(sceneRef, cameraRef);
        sceneInfo.triangles = renderer.info.render.triangles;
        sceneInfo.calls = renderer.info.render.calls;

        brightMaterial.uniforms.tDiffuse.value = sceneRT.texture;
        draw(brightMaterial, brightRT);

        blurMaterial.uniforms.tDiffuse.value = brightRT.texture;
        blurMaterial.uniforms.uDirection.value.set(1 / bloomWidth, 0);
        draw(blurMaterial, blurA);

        blurMaterial.uniforms.tDiffuse.value = blurA.texture;
        blurMaterial.uniforms.uDirection.value.set(0, 1 / bloomHeight);
        draw(blurMaterial, blurB);

        uniforms.tDiffuse.value = sceneRT.texture;
        uniforms.tBloom.value = blurB.texture;
        draw(compositeMaterial, null);
      }

      function setSun(x, y, visible) {
        uniforms.uSun.value.set(x, y);
        uniforms.uSunVisible.value = visible;
      }

      function dispose() {
        sceneRT.dispose();
        brightRT.dispose();
        blurA.dispose();
        blurB.dispose();
        quad.geometry.dispose();
        brightMaterial.dispose();
        blurMaterial.dispose();
        compositeMaterial.dispose();
      }

      return {
        render: render,
        setSize: setSize,
        setSun: setSun,
        uniforms: uniforms,
        getSceneInfo: function () {
          return { triangles: sceneInfo.triangles, calls: sceneInfo.calls };
        },
        dispose: dispose
      };
    })();

    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;

    /* --- 画布自适应 ------------------------------------------------ */
    let viewWidth = 1;
    let viewHeight = 1;
    let viewDpr = maxDpr;

    function applySize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width || canvas.clientWidth || 1280);
      const height = Math.max(1, rect.height || canvas.clientHeight || 800);
      const aspect = width / height;
      const nextDpr = Math.min(global.devicePixelRatio || 1, maxDpr);
      if (width === viewWidth && height === viewHeight && nextDpr === viewDpr) {
        return;
      }
      viewWidth = width;
      viewHeight = height;
      viewDpr = nextDpr;
      renderer.setPixelRatio(nextDpr);
      renderer.setSize(width, height, false);
      post.setSize(width * nextDpr, height * nextDpr);
      camera.aspect = aspect;
      const nextFit = aspect < 1 ? 1.45 : aspect < 1.35 ? 1.16 : 1;
      if (nextFit !== fitScale) {
        // 宽高比变化时回到对应机位，避免竖屏切横屏后卡在远机位。
        fitScale = nextFit;
        radius = baseRadius * fitScale;
        targetRadius = radius;
      }
      radius = clamp(radius, baseRadius * fitScale * 0.88, baseRadius * fitScale * 1.28);
      targetRadius = clamp(targetRadius, baseRadius * fitScale * 0.88, baseRadius * fitScale * 1.28);
      camera.updateProjectionMatrix();
    }

    /* --- 地形高度 -------------------------------------------------- */
    function terrainHeight(x, z) {
      const distance = Math.hypot(x * 0.9, z * 0.8);
      const flat = smoothstep(6, 13, distance);
      const waves =
        Math.sin(x * 0.28) * Math.cos(z * 0.24) * 0.32 +
        Math.sin(x * 0.11 + z * 0.17 + 1.3) * 0.5 +
        hash2(x * 0.35, z * 0.35) * 0.22;
      return waves * flat;
    }

    /* --- 程序纹理 -------------------------------------------------- */
    const woodRand = makeRng(7);
    const woodTex = makeTexture(
      THREE,
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#8a5a3b';
        ctx.fillRect(0, 0, w, h);
        const plankW = w / 4;
        for (let i = 0; i < 4; i += 1) {
          const shade = 0.88 + woodRand() * 0.18;
          ctx.fillStyle = `rgb(${Math.round(138 * shade)},${Math.round(90 * shade)},${Math.round(59 * shade)})`;
          ctx.fillRect(i * plankW + 1, 0, plankW - 2, h);
          ctx.strokeStyle = 'rgba(58,35,22,.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(i * plankW + 0.5, 0);
          ctx.lineTo(i * plankW + 0.5, h);
          ctx.stroke();
          for (let g = 0; g < 5; g += 1) {
            const x = i * plankW + 4 + woodRand() * (plankW - 8);
            ctx.strokeStyle = `rgba(70,42,26,${0.12 + woodRand() * 0.16})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            for (let y = 0; y <= h; y += 16) {
              ctx.lineTo(x + Math.sin(y * 0.05 + g) * 2.2, y);
            }
            ctx.stroke();
          }
          if (woodRand() > 0.45) {
            const kx = i * plankW + plankW * 0.5;
            const ky = 40 + woodRand() * (h - 80);
            ctx.strokeStyle = 'rgba(56,32,18,.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(kx, ky, 4, 8, 0, 0, TWO_PI);
            ctx.stroke();
          }
        }
      },
      { repeat: [2, 1.2] }
    );

    const roofRand = makeRng(19);
    const roofTex = makeTexture(
      THREE,
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#4c5f57';
        ctx.fillRect(0, 0, w, h);
        const rowH = 24;
        for (let row = 0; row < Math.ceil(h / rowH); row += 1) {
          const y = row * rowH;
          const offset = row % 2 === 0 ? 0 : 18;
          for (let x = -36; x < w + 36; x += 36) {
            const shade = 0.82 + roofRand() * 0.3;
            ctx.fillStyle = `rgb(${Math.round(78 * shade)},${Math.round(96 * shade)},${Math.round(88 * shade)})`;
            ctx.beginPath();
            ctx.roundRect(x + offset + 1, y + 1, 33, rowH - 2, 5);
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(26,38,33,.5)';
          ctx.fillRect(0, y + rowH - 2, w, 2);
        }
        for (let i = 0; i < 30; i += 1) {
          ctx.fillStyle = `rgba(110,128,100,${0.08 + roofRand() * 0.12})`;
          ctx.beginPath();
          ctx.arc(roofRand() * w, roofRand() * h, 3 + roofRand() * 8, 0, TWO_PI);
          ctx.fill();
        }
      },
      { repeat: [2.6, 1.6] }
    );

    const stoneRand = makeRng(31);
    const stoneTex = makeTexture(
      THREE,
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#7c7a70';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 32) {
          const offset = (y / 32) % 2 === 0 ? 0 : 24;
          for (let x = -48; x < w + 48; x += 48) {
            const shade = 0.78 + stoneRand() * 0.38;
            ctx.fillStyle = `rgb(${Math.round(124 * shade)},${Math.round(122 * shade)},${Math.round(112 * shade)})`;
            ctx.beginPath();
            ctx.roundRect(x + offset + 2, y + 2, 44, 28, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(58,56,50,.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      },
      { repeat: [2, 1.4] }
    );

    const pathRand = makeRng(53);
    const pathTex = makeTexture(
      THREE,
      128,
      128,
      (ctx, w, h) => {
        ctx.fillStyle = '#ab8d66';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i += 1) {
          const cx = pathRand() * w;
          const cy = pathRand() * h;
          const r = 1 + pathRand() * 4;
          ctx.fillStyle =
            pathRand() > 0.5
              ? `rgba(126,103,74,${0.16 + pathRand() * 0.2})`
              : `rgba(211,190,155,${0.12 + pathRand() * 0.18})`;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r * 1.6, r, pathRand() * TWO_PI, 0, TWO_PI);
          ctx.fill();
        }
      },
      { repeat: [1, 7] }
    );

    const grassRand = makeRng(61);
    const grassTex = makeTexture(
      THREE,
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#cbd0bc';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 180; i += 1) {
          const cx = grassRand() * w;
          const cy = grassRand() * h;
          const r = 6 + grassRand() * 26;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          const dark = grassRand() > 0.45;
          g.addColorStop(0, dark ? 'rgba(96,116,72,.22)' : 'rgba(238,242,220,.18)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        }
        for (let i = 0; i < 900; i += 1) {
          const x = grassRand() * w;
          const y = grassRand() * h;
          const len = 2 + grassRand() * 5;
          ctx.strokeStyle =
            grassRand() > 0.5
              ? `rgba(78,98,58,${0.16 + grassRand() * 0.18})`
              : `rgba(232,238,206,${0.14 + grassRand() * 0.16})`;
          ctx.lineWidth = 0.8 + grassRand() * 0.8;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (grassRand() - 0.5) * 2.4, y - len);
          ctx.stroke();
        }
      },
      { repeat: [16, 16] }
    );

    // 积雪地面专用贴图：草地贴图带绿色，直接盖雪会发灰绿，
    // 积雪过半时替换，雪面才是干净的冷白。
    const snowGroundRand = makeRng(67);
    const snowGroundTex = makeTexture(
      THREE,
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#f2f7fa';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 150; i += 1) {
          const cx = snowGroundRand() * w;
          const cy = snowGroundRand() * h;
          const r = 5 + snowGroundRand() * 22;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(
            0,
            snowGroundRand() > 0.45 ? 'rgba(178,198,216,.16)' : 'rgba(255,255,255,.42)'
          );
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        }
        for (let i = 0; i < 420; i += 1) {
          const x = snowGroundRand() * w;
          const y = snowGroundRand() * h;
          const size = 0.5 + snowGroundRand() * 1.1;
          ctx.fillStyle =
            snowGroundRand() > 0.55
              ? `rgba(255,255,255,${0.35 + snowGroundRand() * 0.4})`
              : `rgba(186,204,222,${0.14 + snowGroundRand() * 0.2})`;
          ctx.fillRect(x, y, size, size);
        }
      },
      { repeat: [16, 16] }
    );

    const signTextTex = makeTexture(
      THREE,
      512,
      256,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(45,31,20,.92)';
        ctx.font = '600 88px "STKaiti","KaiTi","Songti SC","SimSun",serif';
        ctx.fillText('林间小屋', w / 2, h / 2 - 18);
        ctx.font = '500 30px "Georgia","Times New Roman",serif';
        ctx.fillStyle = 'rgba(60,43,28,.72)';
        ctx.fillText('A CABIN IN THE WOODS', w / 2, h / 2 + 62);
      },
      { clamp: true, color: true }
    );

    const glowTex = makeGlowTexture(THREE, 128, [
      [0, 'rgba(255,255,255,1)'],
      [0.22, 'rgba(255,255,255,.72)'],
      [0.55, 'rgba(255,255,255,.22)'],
      [1, 'rgba(255,255,255,0)']
    ]);

    const softTex = makeGlowTexture(THREE, 64, [
      [0, 'rgba(255,255,255,1)'],
      [0.42, 'rgba(255,255,255,.85)'],
      [1, 'rgba(255,255,255,0)']
    ]);

    const streakTex = makeTexture(
      THREE,
      32,
      128,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.22, 'rgba(255,255,255,.65)');
        g.addColorStop(0.8, 'rgba(255,255,255,.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(w * 0.44, 0, w * 0.12, h);
      },
      { clamp: true, color: false }
    );

    const shadowTex = makeGlowTexture(THREE, 128, [
      [0, 'rgba(20,26,18,.55)'],
      [0.45, 'rgba(20,26,18,.28)'],
      [1, 'rgba(20,26,18,0)']
    ]);

    const smokeTex = makeGlowTexture(THREE, 64, [
      [0, 'rgba(238,240,236,.55)'],
      [0.5, 'rgba(230,235,232,.2)'],
      [1, 'rgba(230,235,232,0)']
    ]);

    /* --- 共享材质 -------------------------------------------------- */
    const MAT = {
      wall: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.92, metalness: 0 }),
      roof: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.95, metalness: 0 }),
      stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 1, metalness: 0 }),
      trim: new THREE.MeshStandardMaterial({ color: 0xe4d3ae, roughness: 0.85 }),
      darkWood: new THREE.MeshStandardMaterial({ color: 0x5b3d2a, roughness: 0.9 }),
      shutter: new THREE.MeshStandardMaterial({ color: 0x4c5c48, roughness: 0.92 }),
      shingle: new THREE.MeshStandardMaterial({ map: roofTex, color: 0xd8b79a, roughness: 0.93 }),
      shingleDark: new THREE.MeshStandardMaterial({ map: roofTex, color: 0xb08f73, roughness: 0.95 }),
      shingleLight: new THREE.MeshStandardMaterial({ map: roofTex, color: 0xecc9a5, roughness: 0.9 }),
      doorWood: new THREE.MeshStandardMaterial({ color: 0x6f4a30, roughness: 0.92 }),
      log: new THREE.MeshStandardMaterial({ color: 0x70492f, roughness: 0.95 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x3d3a34, roughness: 0.5, metalness: 0.45 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x4d626b,
        emissive: new THREE.Color(0xffb45e),
        emissiveIntensity: 0.08,
        roughness: 0.22,
        metalness: 0.1
      }),
      cloth: new THREE.MeshStandardMaterial({ color: 0xc7a06d, roughness: 0.95 }),
      bloom: new THREE.MeshStandardMaterial({ color: 0x7f9c58, roughness: 0.9 }),
      bloomPink: new THREE.MeshStandardMaterial({ color: 0xe7a7a1, roughness: 0.8 }),
      bloomYellow: new THREE.MeshStandardMaterial({ color: 0xe9c36b, roughness: 0.8 }),
      mushroomCap: new THREE.MeshStandardMaterial({ color: 0xc26852, roughness: 0.85 }),
      mushroomStem: new THREE.MeshStandardMaterial({ color: 0xeadfcc, roughness: 0.9 }),
      snow: new THREE.MeshStandardMaterial({
        color: 0xf4f9fd,
        roughness: 0.82,
        metalness: 0,
        flatShading: true,
        transparent: true,
        opacity: 1
      }),
      puddle: new THREE.MeshStandardMaterial({
        color: 0x5b6d77,
        roughness: 0.14,
        metalness: 0.55,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    };

    /* --- 地面 ------------------------------------------------------ */
    const groundRand = makeRng(71);
    const groundGeo = new THREE.PlaneGeometry(100, 100, 98, 98);
    groundGeo.rotateX(-Math.PI / 2);
    const groundPositions = groundGeo.attributes.position;
    const groundVertexCount = groundPositions.count;
    const groundBase = new Float32Array(groundVertexCount * 3);
    const groundSnow = new Float32Array(groundVertexCount * 3);
    const groundNoise = new Float32Array(groundVertexCount);
    const groundColors = new Float32Array(groundVertexCount * 3);
    const grassA = new THREE.Color(0x49623a);
    const grassB = new THREE.Color(0x617643);
    const grassC = new THREE.Color(0x354d2f);
    const dirtColor = new THREE.Color(0x73644a);
    const snowColor = new THREE.Color(0xf7fbfe);
    const tempColor = new THREE.Color();

    for (let i = 0; i < groundVertexCount; i += 1) {
      const x = groundPositions.getX(i);
      const z = groundPositions.getZ(i);
      groundPositions.setY(i, terrainHeight(x, z));
      const variation = 0.5 + 0.5 * Math.sin(x * 0.63 + z * 0.47 + 1.2);
      const grain = hash2(x * 0.85, z * 0.85);
      tempColor.copy(grassA).lerp(grassB, variation);
      tempColor.lerp(grassC, clamp(0.18 + grain * 0.3, 0, 1));
      const clearing = 1 - smoothstep(2.6, 5.6, Math.hypot(x + 2.3, z + 2.8));
      tempColor.lerp(dirtColor, clearing * 0.52);
      const worn = 1 - smoothstep(1.2, 2.6, Math.hypot(x - 3.1, z - 3.9));
      tempColor.lerp(dirtColor, worn * 0.32);
      groundBase[i * 3] = tempColor.r;
      groundBase[i * 3 + 1] = tempColor.g;
      groundBase[i * 3 + 2] = tempColor.b;
      const snowShade = 0.94 + groundRand() * 0.06;
      groundSnow[i * 3] = snowColor.r * snowShade;
      groundSnow[i * 3 + 1] = snowColor.g * snowShade;
      groundSnow[i * 3 + 2] = snowColor.b * snowShade;
      groundNoise[i] = 0.5 + 0.5 * hash2(x * 0.55 + 3.1, z * 0.55 - 2.4);
      groundColors[i * 3] = groundBase[i * 3];
      groundColors[i * 3 + 1] = groundBase[i * 3 + 1];
      groundColors[i * 3 + 2] = groundBase[i * 3 + 2];
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
    groundGeo.computeVertexNormals();
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: grassTex,
      vertexColors: true,
      roughness: 0.97,
      metalness: 0
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMaterial);
    groundMesh.receiveShadow = true;
    groundMesh.name = 'ground';
    scene.add(groundMesh);

    let snowGroundMapActive = false;

    function updateGroundSnow(level) {
      if (Math.abs(level - lastGroundSnow) < 0.002) {
        return;
      }
      lastGroundSnow = level;
      // 积雪盖过大半时切换地面贴图，避免绿草底色把雪面染灰绿。
      const wantSnowMap = level > 0.55;
      if (wantSnowMap !== snowGroundMapActive) {
        snowGroundMapActive = wantSnowMap;
        groundMaterial.map = wantSnowMap ? snowGroundTex : grassTex;
        groundMaterial.needsUpdate = true;
      }
      const attr = groundGeo.attributes.color;
      const array = attr.array;
      for (let i = 0; i < groundVertexCount; i += 1) {
        const cover = clamp((level * 1.18 - (1 - groundNoise[i]) * 0.78) / 0.24, 0, 1);
        if (cover <= 0) {
          array[i * 3] = groundBase[i * 3];
          array[i * 3 + 1] = groundBase[i * 3 + 1];
          array[i * 3 + 2] = groundBase[i * 3 + 2];
        } else {
          array[i * 3] = groundBase[i * 3] + (groundSnow[i * 3] - groundBase[i * 3]) * cover;
          array[i * 3 + 1] =
            groundBase[i * 3 + 1] + (groundSnow[i * 3 + 1] - groundBase[i * 3 + 1]) * cover;
          array[i * 3 + 2] =
            groundBase[i * 3 + 2] + (groundSnow[i * 3 + 2] - groundBase[i * 3 + 2]) * cover;
        }
      }
      attr.needsUpdate = true;
    }

    /* --- 小路（独立 ribbon，避开地面网格分辨率限制） ---------------- */
    const pathPoints = [
      new THREE.Vector3(-2.05, 0, -1.35),
      new THREE.Vector3(-1.45, 0, 0.2),
      new THREE.Vector3(-0.55, 0, 1.85),
      new THREE.Vector3(0.35, 0, 3.5),
      new THREE.Vector3(1.25, 0, 5.25),
      new THREE.Vector3(2.5, 0, 8.2)
    ];
    const pathCurve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.45);
    const pathSamples = 56;
    const pathPositions = [];
    const pathUvs = [];
    const pathIndices = [];
    for (let i = 0; i <= pathSamples; i += 1) {
      const t = i / pathSamples;
      const point = pathCurve.getPoint(t);
      const tangent = pathCurve.getTangent(t).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const halfWidth = 0.62 + Math.sin(t * 9.2) * 0.07;
      const left = point.clone().addScaledVector(side, halfWidth);
      const right = point.clone().addScaledVector(side, -halfWidth);
      const y = terrainHeight(left.x, left.z) + 0.035;
      const y2 = terrainHeight(right.x, right.z) + 0.035;
      pathPositions.push(left.x, y, left.z, right.x, y2, right.z);
      pathUvs.push(0, t * 6.5, 1, t * 6.5);
      if (i < pathSamples) {
        const a = i * 2;
        pathIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pathPositions, 3));
    pathGeo.setAttribute('uv', new THREE.Float32BufferAttribute(pathUvs, 2));
    pathGeo.setIndex(pathIndices);
    pathGeo.computeVertexNormals();
    const pathMaterial = new THREE.MeshStandardMaterial({
      map: pathTex,
      color: 0xb08e64,
      roughness: 1,
      metalness: 0
    });
    const pathMesh = new THREE.Mesh(pathGeo, pathMaterial);
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);

    /* --- 天空 / 太阳 / 云 / 星星 / 远山 ----------------------------- */
    const skyUniforms = {
      uTop: { value: new THREE.Color(PRESETS.sunny.skyTop) },
      uHorizon: { value: new THREE.Color(PRESETS.sunny.skyHorizon) },
      uSunDir: { value: new THREE.Vector3(-0.58, 0.62, -0.34).normalize() },
      uSunColor: { value: new THREE.Color(PRESETS.sunny.sunColor) },
      uSunGlow: { value: 1 }
    };
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: [
        'varying vec3 vDir;',
        'void main() {',
        '  vDir = normalize(position);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vDir;',
        'uniform vec3 uTop;',
        'uniform vec3 uHorizon;',
        'uniform vec3 uSunDir;',
        'uniform vec3 uSunColor;',
        'uniform float uSunGlow;',
        'void main() {',
        '  float h = clamp(vDir.y * 1.1 + 0.18, 0.0, 1.0);',
        '  vec3 color = mix(uHorizon, uTop, pow(h, 0.62));',
        '  float d = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);',
        '  color += uSunColor * (pow(d, 20.0) * 0.45 + pow(d, 4.0) * 0.12) * uSunGlow;',
        '  // 输出线性 HDR，统一由后期做 ACES + sRGB。',
        '  gl_FragColor = vec4(max(color, 0.0), 1.0);',
        '}'
      ].join('\n')
    });
    const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 20), skyMaterial);
    skyMesh.renderOrder = -20;
    skyMesh.frustumCulled = false;
    scene.add(skyMesh);

    const sunGlowMaterial = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xfff0c8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const sunGlow = new THREE.Sprite(sunGlowMaterial);
    sunGlow.scale.set(17, 17, 1);
    sunGlow.renderOrder = -12;
    scene.add(sunGlow);

    const sunCoreMaterial = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xfff8e2,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const sunCore = new THREE.Sprite(sunCoreMaterial);
    sunCore.scale.set(4.6, 4.6, 1);
    sunCore.renderOrder = -11;
    scene.add(sunCore);

    /* --- 体积光柱：几束穿过林隙的暖光，压住画面左上的空气感 ------- */
    const shaftTex = makeTexture(
      THREE,
      64,
      512,
      (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const across = ctx.createLinearGradient(0, 0, w, 0);
        across.addColorStop(0, 'rgba(255,255,255,0)');
        across.addColorStop(0.32, 'rgba(255,255,255,0.5)');
        across.addColorStop(0.5, 'rgba(255,255,255,0.85)');
        across.addColorStop(0.68, 'rgba(255,255,255,0.5)');
        across.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = across;
        ctx.fillRect(0, 0, w, h);
        const along = ctx.createLinearGradient(0, 0, 0, h);
        along.addColorStop(0, 'rgba(0,0,0,0)');
        along.addColorStop(0.16, 'rgba(0,0,0,0.8)');
        along.addColorStop(0.55, 'rgba(0,0,0,0.95)');
        along.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = along;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      },
      { clamp: true }
    );
    const shaftMaterial = new THREE.MeshBasicMaterial({
      map: shaftTex,
      color: 0xffe6bb,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false
    });
    const shaftGeometry = new THREE.PlaneGeometry(1, 1);
    shaftGeometry.translate(0, 0.5, 0);
    const shaftDir = new THREE.Vector3(PRESETS.sunny.sunDir[0], PRESETS.sunny.sunDir[1], PRESETS.sunny.sunDir[2]).normalize();
    const shaftGroup = new THREE.Group();
    [
      [-6.5, 2.2, 2.3, 11],
      [-3.6, 4.0, 1.7, 10],
      [-9.0, -2.5, 2.5, 12],
      [-1.2, -4.5, 1.8, 10],
      [-5.5, -8.0, 2.1, 11]
    ].forEach((shaft, index) => {
      for (let pass = 0; pass < 2; pass += 1) {
        const mesh = new THREE.Mesh(shaftGeometry, shaftMaterial);
        mesh.position.set(shaft[0], 0.08, shaft[1]);
        mesh.scale.set(shaft[2], shaft[3], 1);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shaftDir);
        mesh.rotateOnWorldAxis(shaftDir, pass * Math.PI * 0.5 + index * 0.55);
        mesh.renderOrder = -5;
        shaftGroup.add(mesh);
      }
    });
    scene.add(shaftGroup);

    const cloudRand = makeRng(97);
    const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: PRESETS.sunny.cloud,
      roughness: 1,
      metalness: 0,
      flatShading: true,
      transparent: true,
      opacity: 0.92,
      emissive: new THREE.Color(0x77848c),
      emissiveIntensity: 0.34,
      depthWrite: false,
      fog: false
    });
    const cloudClusters = [
      [-19, 10.5, -27, 4.4],
      [-6, 12.5, -32, 5.6],
      [11, 9.8, -26, 4.1],
      [24, 11.5, -21, 3.7],
      [-27, 9.2, -15, 3.4],
      [2, 13.5, -38, 5.2]
    ];
    const cloudOffsets = [];
    for (let c = 0; c < cloudClusters.length; c += 1) {
      const count = 4 + Math.floor(cloudRand() * 2);
      for (let p = 0; p < count; p += 1) {
        cloudOffsets.push({
          x: cloudClusters[c][0] + (cloudRand() - 0.5) * cloudClusters[c][3] * 2,
          y: cloudClusters[c][1] + (cloudRand() - 0.5) * 1.1,
          z: cloudClusters[c][2] + (cloudRand() - 0.5) * 3.4,
          sx: 1.4 + cloudRand() * 1.9,
          sy: 0.55 + cloudRand() * 0.5,
          sz: 1.1 + cloudRand() * 1.25
        });
      }
    }
    const cloudMesh = new THREE.InstancedMesh(cloudGeo, cloudMaterial, cloudOffsets.length);
    const cloudDummy = new THREE.Object3D();
    cloudOffsets.forEach((cloud, index) => {
      cloudDummy.position.set(cloud.x, cloud.y, cloud.z);
      cloudDummy.scale.set(cloud.sx, cloud.sy, cloud.sz);
      cloudDummy.rotation.set(0, cloudRand() * TWO_PI, 0);
      cloudDummy.updateMatrix();
      cloudMesh.setMatrixAt(index, cloudDummy.matrix);
    });
    cloudMesh.instanceMatrix.needsUpdate = true;
    cloudMesh.frustumCulled = false;
    cloudMesh.renderOrder = -10;
    scene.add(cloudMesh);

    const starRand = makeRng(113);
    const starPositions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i += 1) {
      const theta = starRand() * TWO_PI;
      const y = 0.12 + starRand() * 0.85;
      const r = Math.sqrt(1 - y * y);
      starPositions[i * 3] = Math.cos(theta) * r * 66;
      starPositions[i * 3 + 1] = y * 66;
      starPositions[i * 3 + 2] = Math.sin(theta) * r * 66;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xfff2d6,
      size: 0.38,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const stars = new THREE.Points(starGeo, starMaterial);
    stars.renderOrder = -9;
    scene.add(stars);

    const hillData = [
      [-20, -38, 24, 9, 0x394f4a],
      [9, -43, 30, 11, 0x3e5751],
      [30, -31, 20, 8, 0x334b46],
      [-34, -52, 26, 11, 0x425e5b],
      [-6, -58, 44, 14, 0x4a6664],
      [24, -66, 36, 15, 0x53706e]
    ];
    const hillMaterials = [];
    const hillBaseColors = [];
    // 用几团压扁的低模半球拼出起伏圆丘，替代生硬的锥形山，
    // 让背景更像连绵的远山而不是纸片三角。
    const hillDomeGeo = new THREE.SphereGeometry(1, 12, 7, 0, TWO_PI, 0, Math.PI / 2);
    hillData.forEach((hill) => {
      const material = new THREE.MeshStandardMaterial({
        color: hill[4],
        roughness: 1,
        flatShading: true
      });
      const [hx, hz, hw, hh] = hill;
      const ridgeGeo = buildTreeGeometry([
        {
          geometry: hillDomeGeo,
          y: 0,
          sx: hw * 0.54,
          sy: hh,
          sz: hw * 0.4,
          material
        },
        {
          geometry: hillDomeGeo,
          x: -hw * 0.3,
          z: -hw * 0.06,
          y: 0,
          sx: hw * 0.34,
          sy: hh * 0.62,
          sz: hw * 0.3,
          material
        },
        {
          geometry: hillDomeGeo,
          x: hw * 0.29,
          z: hw * 0.1,
          y: 0,
          sx: hw * 0.4,
          sy: hh * 0.72,
          sz: hw * 0.3,
          material
        }
      ]);
      const mesh = new THREE.Mesh(ridgeGeo, material);
      mesh.position.set(hx, -1.2, hz);
      mesh.rotation.y = hx * 0.13;
      scene.add(mesh);
      hillMaterials.push(material);
      hillBaseColors.push(new THREE.Color(hill[4]));
    });

    /* --- 灯光 ------------------------------------------------------ */
    const hemiLight = new THREE.HemisphereLight(PRESETS.sunny.hemiSky, PRESETS.sunny.hemiGround, 0.88);
    scene.add(hemiLight);
    const ambientLight = new THREE.AmbientLight(PRESETS.sunny.ambient, 0.14);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(PRESETS.sunny.sunColor, 2.15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 55;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.025;
    sunLight.target.position.set(-0.5, 0, 0);
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xffd9a8, 0.28);
    rimLight.position.set(9, 6.5, -8);
    rimLight.target.position.set(-0.5, 1.8, 1.2);
    rimLight.castShadow = false;
    scene.add(rimLight);
    scene.add(rimLight.target);

    // 冷调补光：从观众一侧轻抬暗部，像电影里的 fill light，
    // 避免石头与屋檐下压成死黑，同时保持暖光/冷影分离。
    const fillLight = new THREE.DirectionalLight(0xbdd7ee, 0.3);
    fillLight.position.set(4, 3.2, 9);
    fillLight.target.position.set(-0.5, 1.6, 0.8);
    fillLight.castShadow = false;
    scene.add(fillLight);
    scene.add(fillLight.target);

    /* ==================================================================
     * 场景内容 1/3：小屋、路牌、围栏、石头、森林
     * ================================================================== */

    const staticRoot = new THREE.Group();
    staticRoot.name = 'static';
    scene.add(staticRoot);

    function addBox(parent, w, h, d, x, y, z, material, rotation) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      if (rotation) {
        mesh.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
      }
      parent.add(mesh);
      return mesh;
    }

    /* --- 小屋主体 -------------------------------------------------- */
    const cabinPosition = new THREE.Vector3(-2.4, 0, -2.9);
    const cabinYaw = 0.14;
    const cabinStatic = new THREE.Group();
    cabinStatic.position.copy(cabinPosition);
    cabinStatic.rotation.y = cabinYaw;
    staticRoot.add(cabinStatic);

    addBox(cabinStatic, 4.5, 0.55, 3.9, 0, 0.275, 0, MAT.stone);
    addBox(cabinStatic, 3.9, 2.5, 3.3, 0, 1.8, 0, MAT.wall);
    addBox(cabinStatic, 4.06, 0.16, 3.46, 0, 3.06, 0, MAT.darkWood);

    // 原木叠砌外墙：内层墙体作芯，外圈逐层叠原木，转角出头形成咬合感。
    const logWallMats = [
      new THREE.MeshStandardMaterial({ map: woodTex, color: 0xf6e8d6, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ map: woodTex, color: 0xe8d2b8, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ map: woodTex, color: 0xd8bda0, roughness: 0.94 })
    ];
    const logRand = makeRng(409);
    const logRadius = 0.105;
    const logRows = 12;
    const logStep = 0.198;
    const logBaseY = 0.7;
    const frontGapWindow = { x0: -1.52, x1: -0.32, y0: 1.4, y1: 2.64 };
    const frontGapDoor = { x0: 0.2, x1: 1.34, y0: 0.05, y1: 2.36 };
    const sideGapWindow = { x0: 0.02, x1: 1.02, y0: 1.42, y1: 2.54 };

    function splitSpan(min, max, gaps) {
      let spans = [[min, max]];
      for (let g = 0; g < gaps.length; g += 1) {
        const gap = gaps[g];
        const next = [];
        spans.forEach(([a, b]) => {
          if (gap.x1 <= a || gap.x0 >= b) {
            next.push([a, b]);
            return;
          }
          if (gap.x0 > a + 0.01) {
            next.push([a, gap.x0]);
          }
          if (gap.x1 < b - 0.01) {
            next.push([gap.x1, b]);
          }
        });
        spans = next;
      }
      return spans;
    }

    function addWallLog(length, x, y, z, alongZ, material) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(logRadius * 0.84, logRadius, length, 7, 1),
        material
      );
      if (alongZ) {
        mesh.rotation.x = Math.PI / 2;
      } else {
        mesh.rotation.z = Math.PI / 2;
      }
      mesh.position.set(x, y, z);
      cabinStatic.add(mesh);
    }

    for (let row = 0; row < logRows; row += 1) {
      const y = logBaseY + row * logStep;
      const frontGaps = [];
      if (y > frontGapWindow.y0 - 0.1 && y < frontGapWindow.y1 + 0.1) {
        frontGaps.push(frontGapWindow);
      }
      if (y > frontGapDoor.y0 - 0.1 && y < frontGapDoor.y1 + 0.1) {
        frontGaps.push(frontGapDoor);
      }
      const frontSpans = splitSpan(-2.06, 2.06, frontGaps);
      frontSpans.forEach(([a, b], index) => {
        const length = b - a;
        if (length < 0.14) {
          return;
        }
        addWallLog(length, (a + b) / 2, y, 1.71, false, logWallMats[(row + index) % 3]);
      });
      // 背墙完整一根，不留洞口
      addWallLog(4.12, 0, y, -1.71, false, logWallMats[(row + 2) % 3]);
      const sideGaps = y > sideGapWindow.y0 - 0.1 && y < sideGapWindow.y1 + 0.1
        ? [{ x0: sideGapWindow.x0, x1: sideGapWindow.x1 }]
        : [];
      const sideSpans = splitSpan(-1.88, 1.88, sideGaps);
      sideSpans.forEach(([a, b], index) => {
        const length = b - a;
        if (length < 0.14) {
          return;
        }
        addWallLog(length, 2.01, y, (a + b) / 2, true, logWallMats[(row + index + 1) % 3]);
      });
      // -X 面完整一根
      addWallLog(3.64, -2.01, y, 0, true, logWallMats[(row + 1) % 3]);
    }

    // 山墙原木（越往上越短）与阁楼通风口
    for (let i = 0; i < 6; i += 1) {
      const gy = 3.13 + i * 0.205;
      const half = 1.9 * (1 - (gy - 3.05) / 1.38) - 0.1;
      if (half < 0.22) {
        continue;
      }
      const material = logWallMats[i % 3];
      addWallLog(half * 2, 0, gy, 1.715, false, material);
      addWallLog(half * 2, 0, gy, -1.715, false, material);
    }
    const atticVent = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), MAT.trim);
    atticVent.rotation.x = Math.PI / 2;
    atticVent.position.set(0, 3.7, 1.86);
    cabinStatic.add(atticVent);
    const atticHole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 16), MAT.darkWood);
    atticHole.rotation.x = Math.PI / 2;
    atticHole.position.set(0, 3.7, 1.885);
    cabinStatic.add(atticHole);
    addBox(cabinStatic, 0.34, 0.035, 0.03, 0, 3.7, 1.9, MAT.trim);
    addBox(cabinStatic, 0.035, 0.34, 0.03, 0, 3.7, 1.9, MAT.trim);

    // 山墙（三角棱柱），屋顶脊线沿 Z。
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-1.95, 0);
    gableShape.lineTo(1.95, 0);
    gableShape.lineTo(0, 1.35);
    gableShape.closePath();
    const gableGeo = new THREE.ExtrudeGeometry(gableShape, {
      depth: 3.3,
      bevelEnabled: false,
      steps: 1
    });
    gableGeo.translate(0, 0, -1.65);
    const gableMesh = new THREE.Mesh(gableGeo, MAT.wall);
    gableMesh.position.y = 3.05;
    cabinStatic.add(gableMesh);

    const roofSlope = Math.atan2(1.35, 1.95);
    const roofPanel = new THREE.BoxGeometry(2.88, 0.17, 3.96);
    const roofRight = new THREE.Mesh(roofPanel, MAT.roof);
    roofRight.position.set(1.185, 3.77, 0);
    roofRight.rotation.z = -roofSlope;
    cabinStatic.add(roofRight);
    const roofLeft = new THREE.Mesh(roofPanel.clone(), MAT.roof);
    roofLeft.position.set(-1.185, 3.77, 0);
    roofLeft.rotation.z = roofSlope;
    cabinStatic.add(roofLeft);

    // 一片片瓦：沿坡向 12 排、顺 Z 错缝
    function buildRoofTiles(side) {
      const tiles = new THREE.Group();
      tiles.position.set(side * 1.185, 3.77, 0);
      tiles.rotation.z = -side * roofSlope;
      cabinStatic.add(tiles);
      for (let row = 0; row < 12; row += 1) {
        const rowX = -1.28 + row * 0.215;
        const offset = row % 2 === 0 ? 0 : 0.225;
        for (let col = 0; col < 9; col += 1) {
          const tileZ = -1.95 + col * 0.45 + offset;
          if (tileZ > 1.96) {
            continue;
          }
          addBox(tiles, 0.23, 0.045, 0.43, rowX, 0.1, Math.min(tileZ, 1.96), (row * 3 + col) % 8 === 0 ? MAT.shingleLight : (row + col) % 3 === 0 ? MAT.shingleDark : MAT.shingle, [0, 0, side * 0.02]);
        }
      }
      // 檐口加厚一层
      addBox(tiles, 0.28, 0.06, 3.94, 1.37, 0.09, 0, MAT.shingle);
    }
    buildRoofTiles(1);
    buildRoofTiles(-1);

    // 屋脊压顶与封檐板、檐沟
    for (let i = 0; i < 10; i += 1) {
      addBox(cabinStatic, i % 2 === 0 ? 0.42 : 0.38, 0.09, 0.46, 0, 4.665, -1.98 + i * 0.44, i % 3 === 0 ? MAT.shingleLight : MAT.shingle);
    }
    addBox(cabinStatic, 0.3, 0.18, 4.12, 0, 4.56, 0, MAT.darkWood);
    [1, -1].forEach((side) => {
      const barge = new THREE.Group();
      barge.position.set(side * 1.185, 3.79, 0);
      barge.rotation.z = -side * roofSlope;
      cabinStatic.add(barge);
      addBox(barge, 3.02, 0.34, 0.1, 0, 0.05, 2.035, MAT.trim);
      addBox(barge, 3.02, 0.34, 0.1, 0, 0.05, -2.035, MAT.trim);
      addBox(cabinStatic, 0.09, 0.24, 4.06, side * 2.4, 2.98, 0, MAT.darkWood);
      const gutter = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 4.1, 8), MAT.metal);
      gutter.rotation.x = Math.PI / 2;
      gutter.position.set(side * 2.44, 2.95, 0);
      cabinStatic.add(gutter);
    });
    // 右侧落水管
    const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.5, 7), MAT.metal);
    downpipe.position.set(2.44, 1.68, 1.86);
    cabinStatic.add(downpipe);
    addBox(cabinStatic, 0.1, 0.1, 0.14, 2.44, 2.9, 1.94, MAT.metal);
    addBox(cabinStatic, 0.1, 0.08, 0.08, 2.44, 1.96, 1.86, MAT.metal, [0, Math.PI / 2, 0]);

    /* --- 门廊、正门与窗：贴着原木外皮的细部 ---------------------- */
    // 门廊石基座、木甲板与台阶
    addBox(cabinStatic, 1.94, 0.32, 0.66, 0.76, 0.16, 2.22, MAT.stone);
    addBox(cabinStatic, 1.9, 0.08, 0.68, 0.76, 0.36, 2.22, MAT.log);
    for (let i = 0; i < 6; i += 1) {
      addBox(cabinStatic, 0.29, 0.014, 0.66, -0.14 + i * 0.3, 0.404, 2.22, MAT.darkWood);
    }
    addBox(cabinStatic, 1.16, 0.14, 0.36, 0.76, 0.19, 2.63, MAT.log);
    addBox(cabinStatic, 1.44, 0.08, 0.5, 0.76, 0.04, 2.66, MAT.stone);

    // 门廊立柱、柱础、横梁与斜撑
    addBox(cabinStatic, 0.17, 2.02, 0.17, 0.02, 1.33, 2.32, MAT.darkWood);
    addBox(cabinStatic, 0.17, 2.02, 0.17, 1.5, 1.33, 2.32, MAT.darkWood);
    addBox(cabinStatic, 0.26, 0.16, 0.26, 0.02, 0.11, 2.32, MAT.stone);
    addBox(cabinStatic, 0.26, 0.16, 0.26, 1.5, 0.11, 2.32, MAT.stone);
    addBox(cabinStatic, 2.04, 0.16, 0.17, 0.76, 2.33, 2.32, MAT.darkWood);
    addBox(cabinStatic, 0.09, 0.58, 0.09, 0.07, 2.06, 2.22, MAT.darkWood, [0.62, 0, 0]);
    addBox(cabinStatic, 0.09, 0.58, 0.09, 1.45, 2.06, 2.22, MAT.darkWood, [0.62, 0, 0]);

    // 门廊顶：椽子、望板与瓦片
    const porchRoof = addBox(cabinStatic, 2.06, 0.11, 1.02, 0.76, 2.47, 2.16, MAT.roof, [0.3, 0, 0]);
    porchRoof.castShadow = true;
    for (let i = 0; i < 5; i += 1) {
      addBox(cabinStatic, 0.07, 0.09, 0.96, 0.04 + i * 0.36, 2.4, 2.16, MAT.darkWood, [0.3, 0, 0]);
    }
    const porchTiles = new THREE.Group();
    porchTiles.position.set(0.76, 2.535, 2.16);
    porchTiles.rotation.x = 0.3;
    cabinStatic.add(porchTiles);
    for (let row = 0; row < 4; row += 1) {
      const tileZ = -0.52 + row * 0.27;
      for (let col = 0; col < 6; col += 1) {
        const tileX = -0.9 + col * 0.36 + (row % 2) * 0.09;
        addBox(porchTiles, 0.33, 0.045, 0.3, tileX, 0, tileZ, MAT.shingle);
      }
    }

    // 正门：门框、竖板门扇、横档、斜撑、铁铰链与门环
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0.77, 0, 1.815);
    cabinStatic.add(doorGroup);
    addBox(doorGroup, 1.2, 2.36, 0.06, 0, 1.34, -0.04, MAT.darkWood);
    addBox(doorGroup, 0.09, 2.14, 0.24, -0.585, 1.36, 0.1, MAT.trim);
    addBox(doorGroup, 0.09, 2.14, 0.24, 0.585, 1.36, 0.1, MAT.trim);
    addBox(doorGroup, 1.28, 0.1, 0.24, 0, 2.47, 0.1, MAT.trim);
    addBox(doorGroup, 1.62, 0.15, 0.36, 0, 2.6, 0.08, MAT.darkWood);
    addBox(doorGroup, 0.1, 0.18, 0.3, -0.6, 2.49, 0.08, MAT.trim);
    addBox(doorGroup, 0.1, 0.18, 0.3, 0.6, 2.49, 0.08, MAT.trim);
    for (let i = 0; i < 6; i += 1) {
      addBox(doorGroup, 0.168, 1.92, 0.05, -0.45 + i * 0.18, 1.4, 0.14, i % 4 === 2 ? MAT.darkWood : MAT.doorWood);
    }
    for (let i = 0; i < 7; i += 1) {
      addBox(doorGroup, 0.012, 1.9, 0.012, -0.54 + i * 0.18, 1.4, 0.166, MAT.darkWood);
    }
    addBox(doorGroup, 1.0, 0.085, 0.035, 0, 0.82, 0.175, MAT.log);
    addBox(doorGroup, 1.0, 0.085, 0.035, 0, 2.02, 0.175, MAT.log);
    addBox(doorGroup, 0.075, 1.56, 0.03, 0, 1.42, 0.178, MAT.log, [0, 0, 0.99]);
    addBox(doorGroup, 0.46, 0.052, 0.022, -0.3, 0.7, 0.183, MAT.metal);
    addBox(doorGroup, 0.46, 0.052, 0.022, -0.3, 2.1, 0.183, MAT.metal);
    addBox(doorGroup, 0.06, 0.14, 0.04, -0.53, 0.7, 0.185, MAT.metal);
    addBox(doorGroup, 0.06, 0.14, 0.04, -0.53, 2.1, 0.185, MAT.metal);
    addBox(doorGroup, 0.09, 0.24, 0.025, 0.46, 1.36, 0.178, MAT.metal);
    const doorRing = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.013, 6, 14), MAT.metal);
    doorRing.position.set(0.46, 1.25, 0.195);
    doorGroup.add(doorRing);
    addBox(doorGroup, 0.035, 0.08, 0.02, 0.46, 1.1, 0.182, MAT.metal);
    // 门上花环
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.038, 6, 16), MAT.bloom);
    wreath.position.set(0, 1.92, 0.215);
    wreath.rotation.z = 0.12;
    doorGroup.add(wreath);
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TWO_PI;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), MAT.mushroomCap);
      berry.position.set(Math.cos(angle) * 0.16, 1.92 + Math.sin(angle) * 0.16, 0.24);
      doorGroup.add(berry);
    }
    addBox(doorGroup, 0.07, 0.06, 0.03, -0.02, 2.11, 0.23, MAT.bloomPink);
    addBox(doorGroup, 0.13, 0.045, 0.03, -0.09, 2.08, 0.225, MAT.bloomPink, [0, 0, 0.55]);
    addBox(doorGroup, 0.13, 0.045, 0.03, 0.05, 2.08, 0.225, MAT.bloomPink, [0, 0, -0.55]);
    addBox(doorGroup, 1.26, 0.06, 0.28, 0, 0.415, 0.12, MAT.darkWood);
    // 门口地垫与靴子
    addBox(cabinStatic, 0.72, 0.024, 0.4, 0.8, 0.415, 2.26, MAT.cloth);
    addBox(cabinStatic, 0.68, 0.028, 0.05, 0.8, 0.43, 2.44, MAT.darkWood);
    addBox(cabinStatic, 0.68, 0.028, 0.05, 0.8, 0.43, 2.08, MAT.darkWood);
    function addBoot(x, z, rot) {
      const boot = new THREE.Group();
      boot.position.set(x, 0.405, z);
      boot.rotation.y = rot;
      addBox(boot, 0.16, 0.26, 0.17, 0, 0.15, 0.02, MAT.doorWood);
      addBox(boot, 0.16, 0.1, 0.26, 0, 0.06, 0.1, MAT.doorWood);
      addBox(boot, 0.18, 0.035, 0.3, 0, 0.018, 0.1, MAT.darkWood);
      addBox(boot, 0.18, 0.06, 0.17, 0, 0.28, 0.02, MAT.darkWood);
      addBox(boot, 0.1, 0.02, 0.02, 0, 0.16, 0.185, MAT.metal);
      cabinStatic.add(boot);
    }
    addBoot(0.18, 2.4, 0.25);
    addBoot(0.38, 2.45, -0.12);

    // 通用窗构造：框、玻璃、窗棂、窗台、百叶、花箱
    function buildWindow(group, halfW, halfH, withFlowers, seed) {
      addBox(group, halfW * 2, halfH * 2, 0.06, 0, 0, -0.035, MAT.darkWood);
      addBox(group, 0.09, halfH * 2 + 0.18, 0.24, -halfW - 0.045, 0, 0.11, MAT.trim);
      addBox(group, 0.09, halfH * 2 + 0.18, 0.24, halfW + 0.045, 0, 0.11, MAT.trim);
      addBox(group, halfW * 2 + 0.27, 0.09, 0.24, 0, halfH + 0.045, 0.11, MAT.trim);
      addBox(group, halfW * 2 + 0.27, 0.09, 0.24, 0, -halfH - 0.045, 0.11, MAT.trim);
      addBox(group, halfW * 2 - 0.04, halfH * 2 - 0.04, 0.05, 0, 0, 0.14, MAT.glass);
      addBox(group, 0.05, halfH * 2 - 0.02, 0.055, 0, 0, 0.173, MAT.trim);
      addBox(group, halfW * 2 - 0.02, 0.05, 0.055, 0, 0, 0.173, MAT.trim);
      // 外圈压条与窗台
      addBox(group, 0.07, halfH * 2 + 0.4, 0.09, -halfW - 0.23, 0, 0.02, MAT.trim);
      addBox(group, 0.07, halfH * 2 + 0.4, 0.09, halfW + 0.23, 0, 0.02, MAT.trim);
      addBox(group, halfW * 2 + 0.6, 0.09, 0.09, 0, halfH + 0.27, 0.02, MAT.trim);
      addBox(group, halfW * 2 + 0.4, 0.09, 0.34, 0, -halfH - 0.13, 0.16, MAT.trim);
      addBox(group, 0.08, 0.16, 0.26, -halfW - 0.1, -halfH - 0.24, 0.1, MAT.darkWood, [0, 0, 0.35]);
      addBox(group, 0.08, 0.16, 0.26, halfW + 0.1, -halfH - 0.24, 0.1, MAT.darkWood, [0, 0, -0.35]);
      // 百叶窗（外侧）
      const shutX = halfW + 0.29;
      [-1, 1].forEach((side) => {
        addBox(group, 0.36, halfH * 2 + 0.16, 0.045, side * shutX, 0, 0.105, MAT.shutter);
        const span = halfH * 1.42;
        for (let i = 0; i < 6; i += 1) {
          addBox(group, 0.3, 0.048, 0.03, side * shutX, -span / 2 + (i * span) / 5, 0.14, MAT.shutter, [0.55, 0, 0]);
        }
        addBox(group, 0.042, halfH * 2 + 0.16, 0.055, side * (shutX + 0.16), 0, 0.135, MAT.darkWood);
        addBox(group, 0.042, halfH * 2 + 0.16, 0.055, side * (shutX - 0.16), 0, 0.135, MAT.darkWood);
        addBox(group, 0.09, 0.035, 0.02, side * (shutX + 0.12), halfH * 0.62, 0.16, MAT.metal);
        addBox(group, 0.09, 0.035, 0.02, side * (shutX + 0.12), -halfH * 0.62, 0.16, MAT.metal);
      });
      if (!withFlowers) {
        return;
      }
      const boxY = -halfH - 0.4;
      addBox(group, halfW * 2 + 0.2, 0.21, 0.3, 0, boxY, 0.17, MAT.log);
      addBox(group, halfW * 2 + 0.26, 0.05, 0.34, 0, boxY + 0.11, 0.17, MAT.trim);
      addBox(group, halfW * 2 + 0.1, 0.03, 0.24, 0, boxY + 0.13, 0.17, MAT.darkWood);
      const flowerRand = makeRng(seed);
      const bloomMats = [MAT.bloomPink, MAT.bloomYellow, MAT.bloom, MAT.bloomPink];
      for (let i = 0; i < 10; i += 1) {
        const fx = (flowerRand() - 0.5) * (halfW * 1.7);
        const fz = 0.09 + flowerRand() * 0.16;
        const stemH = 0.14 + flowerRand() * 0.16;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, stemH, 4), MAT.bloom);
        stem.position.set(fx, boxY + 0.13 + stemH / 2, fz);
        group.add(stem);
        const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), bloomMats[i % 4]);
        blossom.position.set(fx, boxY + 0.15 + stemH, fz);
        blossom.scale.y = 0.82;
        group.add(blossom);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.04), MAT.bloom);
        leaf.position.set(fx + 0.03, boxY + 0.13 + stemH * 0.55, fz);
        leaf.rotation.z = 0.6;
        group.add(leaf);
      }
    }

    // 正面窗（开口内收，外框与原木咬合）
    const frontWindowGroup = new THREE.Group();
    frontWindowGroup.position.set(-0.92, 2.0, 1.815);
    cabinStatic.add(frontWindowGroup);
    buildWindow(frontWindowGroup, 0.6, 0.66, true, 517);

    // 侧窗（+X 山墙侧）
    const sideWindowGroup = new THREE.Group();
    sideWindowGroup.position.set(2.115, 1.98, 0.52);
    sideWindowGroup.rotation.y = Math.PI / 2;
    cabinStatic.add(sideWindowGroup);
    buildWindow(sideWindowGroup, 0.5, 0.56, false, 601);

    // 石基座砌块与墙脚压条
    const foundationRand = makeRng(733);
    for (let face = 0; face < 4; face += 1) {
      const isFront = face === 0 || face === 2;
      const sign = face < 2 ? 1 : -1;
      const count = isFront ? 10 : 8;
      for (let row = 0; row < 2; row += 1) {
        for (let i = 0; i < count; i += 1) {
          const along = -2.05 + i * (isFront ? 0.45 : 0.52) + (row % 2) * 0.2 + (foundationRand() - 0.5) * 0.05;
          const width = 0.34 + foundationRand() * 0.09;
          if (isFront) {
            addBox(cabinStatic, width, 0.2, 0.07, along, 0.16 + row * 0.25, sign * 1.965, MAT.stone, [0, 0, (foundationRand() - 0.5) * 0.04]);
          } else {
            addBox(cabinStatic, 0.07, 0.2, width, sign * 2.265, 0.16 + row * 0.25, along, MAT.stone, [0, 0, (foundationRand() - 0.5) * 0.04]);
          }
        }
      }
    }
    addBox(cabinStatic, 4.12, 0.14, 0.16, 0, 0.625, 1.72, MAT.darkWood);
    addBox(cabinStatic, 4.12, 0.14, 0.16, 0, 0.625, -1.72, MAT.darkWood);
    addBox(cabinStatic, 0.16, 0.14, 3.4, 2.04, 0.625, 0, MAT.darkWood);
    addBox(cabinStatic, 0.16, 0.14, 3.4, -2.04, 0.625, 0, MAT.darkWood);

    // 烟囱（石砌，表面砌块、压顶与陶管）
    addBox(cabinStatic, 0.62, 2.1, 0.62, -1.16, 3.75, -0.72, MAT.stone);
    for (let row = 0; row < 7; row += 1) {
      const by = 2.82 + row * 0.28;
      const offset = row % 2 === 0 ? 0.14 : 0;
      addBox(cabinStatic, 0.25, 0.22, 0.06, -1.36 + offset, by, -0.395, MAT.stone);
      addBox(cabinStatic, 0.19, 0.22, 0.06, -1.03 + offset * 0.5, by, -0.395, MAT.stone);
      addBox(cabinStatic, 0.06, 0.22, 0.24, -0.835, by, -0.92 + offset * 0.5, MAT.stone);
      addBox(cabinStatic, 0.06, 0.22, 0.2, -0.835, by, -0.52 + offset, MAT.stone);
    }
    addBox(cabinStatic, 0.82, 0.14, 0.82, -1.16, 4.84, -0.72, MAT.stone);
    addBox(cabinStatic, 0.72, 0.1, 0.72, -1.16, 4.95, -0.72, MAT.darkWood);
    addBox(cabinStatic, 0.6, 0.07, 0.6, -1.16, 5.03, -0.72, MAT.metal);
    const chimneyPot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.26, 9), MAT.stone);
    chimneyPot.position.set(-1.16, 5.16, -0.72);
    cabinStatic.add(chimneyPot);
    const chimneyPotRim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 5, 10), MAT.metal);
    chimneyPotRim.rotation.x = Math.PI / 2;
    chimneyPotRim.position.set(-1.16, 5.29, -0.72);
    cabinStatic.add(chimneyPotRim);

    // 柴堆与斜棚
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4 - (row === 2 ? 1 : 0); col += 1) {
        const logMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.13, 0.14, 0.86, 7),
          MAT.log
        );
        logMesh.rotation.x = Math.PI / 2;
        logMesh.rotation.z = 0.04 * (col - 1.5);
        logMesh.position.set(-2.32 + col * 0.27, 0.68 + row * 0.25, 1.12);
        cabinStatic.add(logMesh);
      }
    }
    addBox(cabinStatic, 0.72, 0.08, 1.08, -1.98, 1.55, 1.12, MAT.roof, [0, 0, -0.28]);
    addBox(cabinStatic, 0.1, 1.5, 0.1, -2.42, 0.78, 1.62, MAT.darkWood);
    addBox(cabinStatic, 0.1, 1.5, 0.1, -1.62, 0.78, 1.62, MAT.darkWood);

    // 门前踏脚石与小蘑菇
    const mushroomRand = makeRng(211);
    for (let i = 0; i < 7; i += 1) {
      const mx = -1.2 + (mushroomRand() - 0.5) * 5.4;
      const mz = 2.0 + (mushroomRand() - 0.5) * 2.6;
      if (Math.hypot(mx, mz) < 1.1) {
        continue;
      }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 6), MAT.mushroomStem);
      stem.position.set(mx, 0.08, mz);
      cabinStatic.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5, 0, TWO_PI, 0, Math.PI / 2), MAT.mushroomCap);
      cap.position.set(mx, 0.15, mz);
      cap.scale.y = 0.62;
      cabinStatic.add(cap);
    }

    /* --- 独立细节：玻璃透光贴面、灯笼、暖窗光晕 --------------- */
    const cabinDetails = new THREE.Group();
    cabinDetails.position.copy(cabinPosition);
    cabinDetails.rotation.y = cabinYaw;
    scene.add(cabinDetails);

    const windowGlowMaterial = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffbe6e,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const frontGlow = new THREE.Sprite(windowGlowMaterial.clone());
    frontGlow.scale.set(2.5, 2.5, 1);
    frontGlow.position.set(-0.92, 2.0, 2.2);
    cabinDetails.add(frontGlow);
    const sideGlow = new THREE.Sprite(windowGlowMaterial.clone());
    sideGlow.scale.set(2.2, 2.2, 1);
    sideGlow.position.set(2.42, 1.98, 0.52);
    cabinDetails.add(sideGlow);

    // 门侧壁灯：铁架、玻璃罩与暖芯
    addBox(cabinDetails, 0.11, 0.28, 0.05, 1.72, 2.24, 1.84, MAT.metal);
    addBox(cabinDetails, 0.04, 0.04, 0.34, 1.72, 2.32, 1.99, MAT.metal);
    addBox(cabinDetails, 0.03, 0.12, 0.03, 1.72, 2.26, 2.13, MAT.metal);
    const lanternTop = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.12, 6), MAT.metal);
    lanternTop.position.set(1.72, 2.22, 2.13);
    cabinDetails.add(lanternTop);
    const lanternCore = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), MAT.glass);
    lanternCore.position.set(1.72, 2.09, 2.13);
    cabinDetails.add(lanternCore);
    for (let i = 0; i < 4; i += 1) {
      addBox(cabinDetails, 0.016, 0.22, 0.016, 1.72 + (i % 2 ? 0.065 : -0.065), 2.09, 2.13 + (i > 1 ? 0.065 : -0.065), MAT.metal);
    }
    addBox(cabinDetails, 0.18, 0.02, 0.18, 1.72, 1.975, 2.13, MAT.metal);
    const lanternFlame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 6), MAT.glass);
    lanternFlame.position.set(1.72, 2.07, 2.13);
    cabinDetails.add(lanternFlame);
    const lanternMaterial = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffc978,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const lanternSprite = new THREE.Sprite(lanternMaterial);
    lanternSprite.scale.set(1.35, 1.35, 1);
    lanternSprite.position.set(1.72, 2.1, 2.18);
    cabinDetails.add(lanternSprite);
    const lanternLight = new THREE.PointLight(0xffb460, 0.5, 9, 2);
    lanternLight.position.set(1.72, 2.08, 2.18);
    cabinDetails.add(lanternLight);

    /* --- 小路牌 ---------------------------------------------------- */
    const signGroup = new THREE.Group();
    signGroup.position.set(-0.15, 0, 6.15);
    signGroup.rotation.y = -0.16;
    scene.add(signGroup);
    const signSolid = new THREE.Group();
    signGroup.add(signSolid);
    addBox(signSolid, 0.13, 1.9, 0.13, -0.64, 0.95, 0, MAT.log);
    addBox(signSolid, 0.13, 1.9, 0.13, 0.64, 0.95, 0, MAT.log);
    addBox(signSolid, 1.72, 0.72, 0.12, 0, 1.52, 0, MAT.trim);
    addBox(signSolid, 1.84, 0.09, 0.16, 0, 1.9, 0.01, MAT.darkWood);
    addBox(signSolid, 1.84, 0.09, 0.16, 0, 1.14, 0.01, MAT.darkWood);

    const signTextMaterial = new THREE.MeshBasicMaterial({
      map: signTextTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const signText = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.78), signTextMaterial);
    signText.position.set(0, 1.53, 0.071);
    signGroup.add(signText);

    /* --- 栅栏（左前侧地标） ---------------------------------------- */
    const fencePosts = [
      [-5.7, 2.15],
      [-4.55, 2.72],
      [-3.4, 3.3],
      [-2.25, 3.88]
    ];
    fencePosts.forEach(([fx, fz], index) => {
      const fy = terrainHeight(fx, fz);
      addBox(staticRoot, 0.16, 1.02, 0.16, fx, fy + 0.51, fz, MAT.log);
      addBox(staticRoot, 0.22, 0.08, 0.22, fx, fy + 1.01, fz, MAT.darkWood);
      if (index > 0) {
        const prev = fencePosts[index - 1];
        const px = prev[0];
        const pz = prev[1];
        const midX = (fx + px) / 2;
        const midZ = (fz + pz) / 2;
        const length = Math.hypot(fx - px, fz - pz);
        const angle = Math.atan2(fx - px, fz - pz);
        for (let rail = 0; rail < 2; rail += 1) {
          const railY = terrainHeight(midX, midZ) + 0.42 + rail * 0.3;
          addBox(staticRoot, 0.07, 0.09, length, midX, railY, midZ, MAT.trim, [
            0,
            angle,
            Math.atan2(terrainHeight(fx, fz) - terrainHeight(px, pz), length) * -0.4
          ]);
        }
      }
    });

    /* --- 石头（小人座位）与踏石 ----------------------------------- */
    const rockRand = makeRng(233);
    const rockGroup = new THREE.Group();
    rockGroup.position.set(3.1, 0, 3.9);
    rockGroup.rotation.y = 0.5;
    scene.add(rockGroup);
    const rockMaterial = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0xb2aa9d,
      roughness: 1,
      flatShading: true
    });
    const rockCore = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), rockMaterial);
    rockCore.scale.set(1.25, 0.78, 1.05);
    rockCore.position.y = 0.62;
    rockCore.rotation.set(0.1, 0.4, -0.06);
    rockCore.castShadow = true;
    rockCore.receiveShadow = true;
    rockGroup.add(rockCore);
    const rockSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.9, 0.16, 9), rockMaterial);
    rockSeat.position.y = 1.13;
    rockSeat.rotation.y = 0.2;
    rockSeat.castShadow = true;
    rockSeat.receiveShadow = true;
    rockGroup.add(rockSeat);
    for (let i = 0; i < 3; i += 1) {
      const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + rockRand() * 0.14, 0), rockMaterial);
      pebble.position.set((rockRand() - 0.5) * 2.6, 0.1, 0.7 + rockRand() * 0.9);
      pebble.rotation.set(rockRand(), rockRand(), rockRand());
      pebble.castShadow = true;
      rockGroup.add(pebble);
    }
    [[1.55, 2.9], [2.2, 3.35], [2.7, 3.66]].forEach(([sx, sz], index) => {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 - index * 0.02, 0.34 - index * 0.02, 0.1, 7),
        MAT.stone
      );
      stone.position.set(sx, terrainHeight(sx, sz) + 0.05, sz);
      stone.rotation.y = index * 0.7;
      stone.receiveShadow = true;
      stone.castShadow = true;
      staticRoot.add(stone);
    });

    /* --- 倒在草地上的老木头与蘑菇 -------------------------------- */
    const fallenLog = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 2.6, 8), MAT.log);
    fallenLog.position.set(-4.9, 0.26, 4.25);
    fallenLog.rotation.set(0, 0.55, Math.PI / 2 - 0.06);
    fallenLog.castShadow = true;
    fallenLog.receiveShadow = true;
    staticRoot.add(fallenLog);
    for (let i = 0; i < 3; i += 1) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.14, 5), MAT.mushroomStem);
      stem.position.set(-5.4 + i * 0.42, 0.5, 4.05 + i * 0.12);
      staticRoot.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4, 0, TWO_PI, 0, Math.PI / 2), MAT.mushroomCap);
      cap.scale.y = 0.6;
      cap.position.set(-5.4 + i * 0.42, 0.57, 4.05 + i * 0.12);
      staticRoot.add(cap);
    }

    /* --- 合并静态几何 ---------------------------------------------- */
    const staticMerged = mergeStatic(THREE, staticRoot);
    scene.add(staticMerged);
    scene.remove(staticRoot);
    // 先刷新父组的世界矩阵，否则牌子会被烘到世界原点
    signGroup.updateMatrixWorld(true);
    const signMerged = mergeStatic(THREE, signSolid);
    scene.add(signMerged);
    signGroup.remove(signSolid);

    /* --- 森林：松树 / 阔叶树 / 矮丛 -------------------------------- */
    function buildTreeGeometry(parts) {
      const group = new THREE.Group();
      parts.forEach((part) => {
        const mesh = new THREE.Mesh(part.geometry, part.material);
        mesh.position.set(part.x || 0, part.y || 0, part.z || 0);
        mesh.rotation.set(part.rx || 0, part.ry || 0, part.rz || 0);
        mesh.scale.set(part.sx || 1, part.sy || 1, part.sz || 1);
        group.add(mesh);
      });
      const merged = mergeStatic(THREE, group);
      const geometry = merged.children[0].geometry;
      merged.children.forEach((child) => {
        if (child.geometry !== geometry) {
          child.geometry.dispose();
        }
      });
      return geometry;
    }

    const pineCanopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x486b4a,
      roughness: 1,
      metalness: 0,
      flatShading: true
    });
    const roundCanopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x6f8a4c,
      roughness: 1,
      metalness: 0,
      flatShading: true
    });
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x5f4633,
      roughness: 1,
      flatShading: true
    });
    const pineCanopyGeo = buildTreeGeometry([
      { geometry: new THREE.ConeGeometry(1.08, 1.7, 7), y: 2.05, material: pineCanopyMaterial },
      { geometry: new THREE.ConeGeometry(0.86, 1.45, 7), y: 2.92, material: pineCanopyMaterial },
      { geometry: new THREE.ConeGeometry(0.62, 1.2, 7), y: 3.74, material: pineCanopyMaterial }
    ]);
    const pineTrunkGeo = buildTreeGeometry([
      { geometry: new THREE.CylinderGeometry(0.12, 0.2, 1.6, 6), y: 0.8, material: trunkMaterial }
    ]);
    const roundCanopyGeo = buildTreeGeometry([
      {
        geometry: new THREE.IcosahedronGeometry(1.18, 1),
        y: 2.3,
        sx: 1.1,
        sy: 0.92,
        sz: 1.05,
        material: roundCanopyMaterial
      },
      {
        geometry: new THREE.IcosahedronGeometry(0.76, 1),
        y: 2.95,
        x: 0.3,
        sz: 0.9,
        material: roundCanopyMaterial
      }
    ]);
    const roundTrunkGeo = buildTreeGeometry([
      { geometry: new THREE.CylinderGeometry(0.14, 0.22, 1.9, 6), y: 0.95, material: trunkMaterial }
    ]);

    const pathSamplesForClear = [];
    for (let i = 0; i <= 24; i += 1) {
      pathSamplesForClear.push(pathCurve.getPoint(i / 24));
    }
    function nearPath(x, z, radius) {
      for (let i = 0; i < pathSamplesForClear.length; i += 1) {
        const p = pathSamplesForClear[i];
        if (Math.hypot(x - p.x, z - p.z) < radius) {
          return true;
        }
      }
      return false;
    }

    const treeRand = makeRng(317);
    const pineData = [];
    const roundData = [];
    let guard = 0;
    while (pineData.length < 66 && guard < 900) {
      guard += 1;
      const angle = treeRand() * TWO_PI;
      const distance = 6.8 + Math.pow(treeRand(), 0.72) * 21;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance - 2.2;
      if (Math.hypot(x + 2.4, z + 2.9) < 5.4) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 2.8) continue;
      if (Math.hypot(x + 0.15, z - 6.15) < 1.8) continue;
      if (nearPath(x, z, 1.5)) continue;
      if (z > 5.5 && x > -1 && x < 11 && Math.hypot(x - 7.8, z - 12.9) < 4.6) continue;
      pineData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.82 + treeRand() * 0.78,
        r: treeRand() * TWO_PI,
        lean: (treeRand() - 0.5) * 0.06,
        tint: treeRand()
      });
    }
    guard = 0;
    while (roundData.length < 13 && guard < 600) {
      guard += 1;
      const angle = treeRand() * TWO_PI;
      const distance = 7.8 + treeRand() * 17;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance - 2.5;
      if (Math.hypot(x + 2.4, z + 2.9) < 5.8) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 3.2) continue;
      if (Math.hypot(x + 0.15, z - 6.15) < 2.2) continue;
      if (nearPath(x, z, 1.8)) continue;
      if (z > 5.5 && x > -1 && x < 11 && Math.hypot(x - 7.8, z - 12.9) < 5.0) continue;
      roundData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.8 + treeRand() * 0.55,
        r: treeRand() * TWO_PI,
        lean: (treeRand() - 0.5) * 0.05,
        tint: treeRand()
      });
    }

    const pineCanopy = new THREE.InstancedMesh(pineCanopyGeo, pineCanopyMaterial, pineData.length);
    const pineTrunks = new THREE.InstancedMesh(pineTrunkGeo, trunkMaterial, pineData.length);
    const roundCanopy = new THREE.InstancedMesh(roundCanopyGeo, roundCanopyMaterial, roundData.length);
    const roundTrunks = new THREE.InstancedMesh(roundTrunkGeo, trunkMaterial, roundData.length);
    const treeDummy = new THREE.Object3D();
    const treeShadowColor = new THREE.Color();

    function placeTree(mesh, trunk, data, index, baseColor) {
      treeDummy.position.set(data.x, data.y, data.z);
      treeDummy.rotation.set(data.lean, data.r, data.lean * 0.6);
      treeDummy.scale.setScalar(data.s);
      treeDummy.updateMatrix();
      mesh.setMatrixAt(index, treeDummy.matrix);
      if (trunk) {
        trunk.setMatrixAt(index, treeDummy.matrix);
      }
      mesh.setColorAt(index, treeShadowColor.copy(baseColor).multiplyScalar(0.82 + data.tint * 0.32));
    }
    const pinePalette = [0xf3ecd0, 0xffffff, 0xd6e6dd, 0xf7f3d8, 0xe3ecd5].map(
      (hex) => new THREE.Color(hex)
    );
    const roundPalette = [0xfffbe8, 0xf4f0cf, 0xf6e6c6, 0xe8f0d4, 0xfdf6dd].map(
      (hex) => new THREE.Color(hex)
    );
    pineData.forEach((tree, index) => {
      placeTree(
        pineCanopy,
        pineTrunks,
        tree,
        index,
        pinePalette[Math.floor(tree.tint * pinePalette.length) % pinePalette.length]
      );
    });
    roundData.forEach((tree, index) => {
      placeTree(
        roundCanopy,
        roundTrunks,
        tree,
        index,
        roundPalette[Math.floor(tree.tint * roundPalette.length) % roundPalette.length]
      );
    });
    [pineCanopy, pineTrunks, roundCanopy, roundTrunks].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });
    pineCanopy.receiveShadow = false;
    roundCanopy.receiveShadow = false;

    /* --- 远景林带：压住山脚，拉出空气透视 -------------------------- */
    const farPineMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      flatShading: true
    });
    const farPineGeo = buildTreeGeometry([
      { geometry: new THREE.ConeGeometry(1.32, 2.4, 6), y: 2.4, material: farPineMaterial },
      { geometry: new THREE.ConeGeometry(1.02, 2.0, 6), y: 3.7, material: farPineMaterial },
      { geometry: new THREE.ConeGeometry(0.72, 1.7, 6), y: 4.9, material: farPineMaterial }
    ]);
    const farPineRand = makeRng(371);
    const farTint = new THREE.Color();
    const farPinePalette = [0x3a584c, 0x314c42, 0x446258, 0x2c463d, 0x4a685c].map(
      (hex) => new THREE.Color(hex)
    );
    const farPineData = [];
    guard = 0;
    while (farPineData.length < 84 && guard < 1400) {
      guard += 1;
      const angle = farPineRand() * TWO_PI;
      const distance = 21.5 + farPineRand() * 9.5;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance - 2.2;
      if (z > 7.5) continue;
      if (Math.hypot(x + 2.4, z + 2.9) < 13) continue;
      farPineData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.9 + farPineRand() * 0.8,
        r: farPineRand() * TWO_PI,
        tint: farPineRand()
      });
    }
    const farPines = new THREE.InstancedMesh(farPineGeo, farPineMaterial, farPineData.length);
    farPineData.forEach((tree, index) => {
      treeDummy.position.set(tree.x, tree.y - 0.05, tree.z);
      treeDummy.rotation.set(0, tree.r, 0);
      treeDummy.scale.setScalar(tree.s);
      treeDummy.updateMatrix();
      farPines.setMatrixAt(index, treeDummy.matrix);
      farTint.copy(
        farPinePalette[Math.floor(tree.tint * farPinePalette.length) % farPinePalette.length]
      );
      farPines.setColorAt(index, farTint);
    });    farPines.castShadow = false;
    farPines.receiveShadow = false;
    scene.add(farPines);

    const farRidgePalette = [0x47645a, 0x527066, 0x405d54, 0x5b776c].map(
      (hex) => new THREE.Color(hex)
    );
    const farRidgeData = [];
    guard = 0;
    while (farRidgeData.length < 46 && guard < 900) {
      guard += 1;
      const angle = farPineRand() * TWO_PI;
      const distance = 31 + farPineRand() * 11;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance - 2.2;
      if (z > 4.5) continue;
      farRidgeData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.95 + farPineRand() * 0.7,
        r: farPineRand() * TWO_PI,
        tint: farPineRand()
      });
    }
    const farRidgePines = new THREE.InstancedMesh(farPineGeo, farPineMaterial, farRidgeData.length);
    farRidgeData.forEach((tree, index) => {
      treeDummy.position.set(tree.x, tree.y - 0.1, tree.z);
      treeDummy.rotation.set(0, tree.r, 0);
      treeDummy.scale.setScalar(tree.s);
      treeDummy.updateMatrix();
      farRidgePines.setMatrixAt(index, treeDummy.matrix);
      farTint.copy(
        farRidgePalette[Math.floor(tree.tint * farRidgePalette.length) % farRidgePalette.length]
      );
      farRidgePines.setColorAt(index, farTint);
    });
    farRidgePines.castShadow = false;
    farRidgePines.receiveShadow = false;
    scene.add(farRidgePines);

    /* --- 白桦：为绿色森林加一条暖色副调 ---------------------------- */
    const birchRand = makeRng(359);
    const birchTex = makeTexture(
      THREE,
      128,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#e9e6d8';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 60; i += 1) {
          const y = birchRand() * h;
          const x = birchRand() * w;
          const len = 5 + birchRand() * 26;
          ctx.strokeStyle = `rgba(44,38,32,${0.35 + birchRand() * 0.45})`;
          ctx.lineWidth = 1.2 + birchRand() * 2.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len, y + (birchRand() - 0.5) * 2);
          ctx.stroke();
        }
        for (let i = 0; i < 24; i += 1) {
          ctx.fillStyle = `rgba(120,110,94,${0.1 + birchRand() * 0.16})`;
          ctx.fillRect(birchRand() * w, birchRand() * h, 4 + birchRand() * 16, 1 + birchRand() * 3);
        }
      },
      { repeat: [1, 1.6] }
    );
    const birchBarkMaterial = new THREE.MeshStandardMaterial({
      map: birchTex,
      color: 0xf4f1e2,
      roughness: 0.92
    });
    const birchLeafMaterial = new THREE.MeshStandardMaterial({
      color: 0xbba955,
      roughness: 1,
      metalness: 0,
      flatShading: true
    });
    const birchLeafBase = birchLeafMaterial.color.clone();
    const birchTrunkGeo = new THREE.CylinderGeometry(0.085, 0.17, 3.6, 7);
    birchTrunkGeo.translate(0, 1.8, 0);
    const birchCanopyGeo = buildTreeGeometry([
      {
        geometry: new THREE.IcosahedronGeometry(1.0, 1),
        y: 3.6,
        sx: 1.05,
        sy: 1.25,
        sz: 1.0,
        material: birchLeafMaterial
      },
      {
        geometry: new THREE.IcosahedronGeometry(0.7, 1),
        y: 4.55,
        x: 0.26,
        z: 0.16,
        sx: 1.05,
        sy: 1.1,
        material: birchLeafMaterial
      },
      {
        geometry: new THREE.IcosahedronGeometry(0.62, 1),
        y: 3.15,
        x: -0.46,
        z: 0.24,
        material: birchLeafMaterial
      }
    ]);
    const birchSpots = [
      [8.9, -1.2, 1.08],
      [-7.9, 0.9, 0.94],
      [6.1, -7.2, 1.16],
      [-6.6, -8.4, 0.9]
    ];
    birchSpots.forEach((spot, index) => {
      const group = new THREE.Group();
      group.position.set(spot[0], terrainHeight(spot[0], spot[1]), spot[1]);
      group.rotation.y = birchRand() * TWO_PI;
      group.scale.setScalar(spot[2]);
      const trunk = new THREE.Mesh(birchTrunkGeo, birchBarkMaterial);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      const canopy = new THREE.Mesh(birchCanopyGeo, birchLeafMaterial);
      canopy.castShadow = true;
      canopy.receiveShadow = false;
      group.add(trunk);
      group.add(canopy);
      scene.add(group);
      if (index === 0) {
        group.rotation.y = 0.8;
      }
    });

    // 树梢积雪（在所有树顶长大/收缩）
    const snowCapGeo = new THREE.IcosahedronGeometry(0.52, 1);
    snowCapGeo.scale(1.5, 0.58, 1.5);
    const snowCapMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f8fc,
      roughness: 0.86,
      flatShading: true,
      transparent: true,
      opacity: 0.92
    });
    const capData = [];
    pineData.forEach((tree) => {
      capData.push({ x: tree.x, y: tree.y + 4.12 * tree.s, z: tree.z, s: tree.s * 0.7, r: tree.r });
    });
    roundData.forEach((tree) => {
      capData.push({ x: tree.x, y: tree.y + 3.32 * tree.s, z: tree.z, s: tree.s * 0.98, r: tree.r });
    });
    const snowCaps = new THREE.InstancedMesh(snowCapGeo, snowCapMaterial, capData.length);
    snowCaps.castShadow = false;
    snowCaps.receiveShadow = false;
    snowCaps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    function updateSnowCaps(amount) {
      capData.forEach((cap, index) => {
        const growth = smoothstep(0.08, 0.75, amount);
        const size = cap.s * growth * (0.86 + Math.sin(index * 1.7) * 0.12);
        treeDummy.position.set(cap.x, cap.y + 0.02, cap.z);
        treeDummy.rotation.set(0, cap.r, 0);
        treeDummy.scale.set(size, Math.max(0.001, size * 0.55), size);
        treeDummy.updateMatrix();
        snowCaps.setMatrixAt(index, treeDummy.matrix);
      });
      snowCaps.instanceMatrix.needsUpdate = true;
      snowCapMaterial.opacity = 0.18 + amount * 0.8;
    }
    updateSnowCaps(0);
    scene.add(snowCaps);

    // 矮丛
    const bushMaterial = new THREE.MeshStandardMaterial({
      color: 0x557243,
      roughness: 1,
      flatShading: true
    });
    const bushGeo = buildTreeGeometry([
      {
        geometry: new THREE.IcosahedronGeometry(0.52, 1),
        y: 0.26,
        sx: 1.2,
        sy: 0.9,
        sz: 1.1,
        material: bushMaterial
      },
      {
        geometry: new THREE.IcosahedronGeometry(0.36, 1),
        y: 0.5,
        x: 0.3,
        z: 0.1,
        material: bushMaterial
      },
      {
        geometry: new THREE.IcosahedronGeometry(0.32, 1),
        y: 0.42,
        x: -0.3,
        z: -0.16,
        material: bushMaterial
      }
    ]);
    const bushRand = makeRng(349);
    const bushData = [];
    guard = 0;
    while (bushData.length < 26 && guard < 400) {
      guard += 1;
      const angle = bushRand() * TWO_PI;
      const distance = 5 + bushRand() * 12;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance - 1.8;
      if (Math.hypot(x + 2.4, z + 2.9) < 4.6) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 2.2) continue;
      if (nearPath(x, z, 1.15)) continue;
      if (Math.hypot(x + 0.15, z - 6.15) < 1.2) continue;
      bushData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.55 + bushRand() * 0.85,
        r: bushRand() * TWO_PI
      });
    }
    const bushes = new THREE.InstancedMesh(bushGeo, bushMaterial, bushData.length);
    bushData.forEach((bush, index) => {
      treeDummy.position.set(bush.x, bush.y - 0.06 * bush.s, bush.z);
      treeDummy.rotation.set(0, bush.r, 0);
      treeDummy.scale.set(bush.s * 1.25, bush.s * 0.85, bush.s * 1.1);
      treeDummy.updateMatrix();
      bushes.setMatrixAt(index, treeDummy.matrix);
    });
    bushes.castShadow = true;
    bushes.receiveShadow = true;
    scene.add(bushes);

    /* --- 地被层：草丛 / 蕨类 / 碎石 / 落叶 -------------------------- */
    const envTint = new THREE.Color();
    const tuftGeo = (function () {
      const tuftRand = makeRng(571);
      const positions = [];
      for (let b = 0; b < 7; b += 1) {
        const angle = (b / 7) * TWO_PI + tuftRand() * 0.7;
        const dx = Math.cos(angle);
        const dz = Math.sin(angle);
        const halfW = 0.024 + tuftRand() * 0.014;
        const lean = 0.1 + tuftRand() * 0.22;
        const height = 0.24 + tuftRand() * 0.2;
        const px = -dz * halfW;
        const pz = dx * halfW;
        positions.push(
          dx * 0.02 - px, 0, dz * 0.02 - pz,
          dx * 0.02 + px, 0, dz * 0.02 + pz,
          dx * lean, height, dz * lean
        );
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      return geo;
    })();
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide
    });
    const grassPalette = [0x7d9856, 0x93aa63, 0x6a834b, 0xa2b273, 0x5f7a45].map(
      (hex) => new THREE.Color(hex)
    );
    const tuftRand = makeRng(563);
    const tuftData = [];
    guard = 0;
    while (tuftData.length < 820 && guard < 6000) {
      guard += 1;
      const angle = tuftRand() * TWO_PI;
      const distance = 3.3 + Math.pow(tuftRand(), 0.82) * 14;
      const x = Math.cos(angle) * distance + 0.4;
      const z = Math.sin(angle) * distance + 1.0;
      if (Math.hypot(x + 2.4, z + 2.9) < 4.0) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 1.95) continue;
      if (nearPath(x, z, 0.85)) continue;
      if (Math.hypot(x + 0.15, z - 6.15) < 1.25) continue;
      tuftData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.7 + tuftRand() * 0.95,
        r: tuftRand() * TWO_PI,
        tint: tuftRand(),
        lift: (tuftRand() - 0.5) * 0.1
      });
    }
    const grassTufts = new THREE.InstancedMesh(tuftGeo, grassMaterial, tuftData.length);
    tuftData.forEach((tuft, index) => {
      treeDummy.position.set(tuft.x, tuft.y - 0.01, tuft.z);
      treeDummy.rotation.set(tuft.lift, tuft.r, tuft.lift * 0.7);
      treeDummy.scale.set(tuft.s * 1.1, tuft.s * (0.85 + tuft.tint * 0.35), tuft.s * 1.1);
      treeDummy.updateMatrix();
      grassTufts.setMatrixAt(index, treeDummy.matrix);
      envTint.copy(grassPalette[Math.floor(tuft.tint * grassPalette.length) % grassPalette.length]);
      grassTufts.setColorAt(index, envTint.multiplyScalar(0.86 + tuft.tint * 0.28));    });
    grassTufts.castShadow = false;
    grassTufts.receiveShadow = true;
    scene.add(grassTufts);

    const fernGeo = (function () {
      const fernRand = makeRng(577);
      const positions = [];
      for (let f = 0; f < 7; f += 1) {
        const angle = (f / 7) * TWO_PI + fernRand() * 0.5;
        const dx = Math.cos(angle);
        const dz = Math.sin(angle);
        const len = 0.3 + fernRand() * 0.24;
        const spread = 0.042 + fernRand() * 0.02;
        const lift = 0.14 + fernRand() * 0.14;
        const bx = dx * 0.02;
        const bz = dz * 0.02;
        const lx = -dz * spread;
        const lz = dx * spread;
        const tx = bx + dx * len;
        const tz = bz + dz * len;
        positions.push(
          bx - lx, 0.02, bz - lz,
          bx + lx, 0.02, bz + lz,
          tx + lx * 0.25, lift, tz + lz * 0.25,
          bx - lx, 0.02, bz - lz,
          tx + lx * 0.25, lift, tz + lz * 0.25,
          tx - lx * 0.25, lift, tz - lz * 0.25
        );
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      return geo;
    })();
    const fernMaterial = new THREE.MeshStandardMaterial({
      color: 0x54743d,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide
    });
    const fernBaseColor = fernMaterial.color.clone();
    const fernRand = makeRng(587);
    const fernData = [];
    guard = 0;
    while (fernData.length < 34 && guard < 600) {
      guard += 1;
      const angle = fernRand() * TWO_PI;
      const distance = 4.4 + fernRand() * 11;
      const x = Math.cos(angle) * distance + 0.3;
      const z = Math.sin(angle) * distance + 0.6;
      if (Math.hypot(x + 2.4, z + 2.9) < 4.2) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 2.1) continue;
      if (nearPath(x, z, 1.0)) continue;
      fernData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.75 + fernRand() * 0.7,
        r: fernRand() * TWO_PI
      });
    }
    const ferns = new THREE.InstancedMesh(fernGeo, fernMaterial, fernData.length);
    fernData.forEach((fern, index) => {
      treeDummy.position.set(fern.x, fern.y - 0.01, fern.z);
      treeDummy.rotation.set(0, fern.r, 0);
      treeDummy.scale.setScalar(fern.s);
      treeDummy.updateMatrix();
      ferns.setMatrixAt(index, treeDummy.matrix);
    });
    ferns.castShadow = false;
    ferns.receiveShadow = true;
    scene.add(ferns);

    const pebbleGeo = new THREE.DodecahedronGeometry(0.22, 0);
    const pebbleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8d897b,
      roughness: 0.96,
      metalness: 0,
      flatShading: true
    });
    const pebbleRand = makeRng(593);
    const pebbleData = [];
    guard = 0;
    while (pebbleData.length < 52 && guard < 700) {
      guard += 1;
      const angle = pebbleRand() * TWO_PI;
      const distance = 2.7 + pebbleRand() * 12.5;
      const x = Math.cos(angle) * distance + 0.4;
      const z = Math.sin(angle) * distance + 0.9;
      if (Math.hypot(x + 2.4, z + 2.9) < 3.6) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 1.7) continue;
      pebbleData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.35 + pebbleRand() * 0.95,
        r: pebbleRand() * TWO_PI,
        tint: pebbleRand()
      });
    }
    const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMaterial, pebbleData.length);
    pebbleData.forEach((pebble, index) => {
      treeDummy.position.set(pebble.x, pebble.y + pebble.s * 0.05, pebble.z);
      treeDummy.rotation.set(pebble.tint * 0.6, pebble.r, pebble.tint * 0.4);
      treeDummy.scale.set(pebble.s * (1 + pebble.tint * 0.5), pebble.s * 0.55, pebble.s);
      treeDummy.updateMatrix();
      pebbles.setMatrixAt(index, treeDummy.matrix);
      envTint.setRGB(0.32 + pebble.tint * 0.14, 0.31 + pebble.tint * 0.13, 0.26 + pebble.tint * 0.1);
      pebbles.setColorAt(index, envTint);
    });
    pebbles.castShadow = true;
    pebbles.receiveShadow = true;
    scene.add(pebbles);

    const litterGeo = new THREE.PlaneGeometry(0.11, 0.065);
    litterGeo.rotateX(-Math.PI / 2);
    const litterMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide
    });
    const litterPalette = [0xb7793f, 0xc79a4e, 0x996238, 0xa86f45, 0xc9b06b].map(
      (hex) => new THREE.Color(hex)
    );
    const litterRand = makeRng(601);
    const litterData = [];
    guard = 0;
    while (litterData.length < 190 && guard < 900) {
      guard += 1;
      const angle = litterRand() * TWO_PI;
      const distance = 2.8 + litterRand() * 12;
      const x = Math.cos(angle) * distance + 0.2;
      const z = Math.sin(angle) * distance + 0.8;
      if (Math.hypot(x + 2.4, z + 2.9) < 3.2) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 1.5) continue;
      litterData.push({
        x,
        z,
        y: terrainHeight(x, z) + 0.012,
        r: litterRand() * TWO_PI,
        s: 0.7 + litterRand() * 0.9,
        tint: litterRand()
      });
    }
    const litter = new THREE.InstancedMesh(litterGeo, litterMaterial, litterData.length);
    litterData.forEach((leaf, index) => {
      treeDummy.position.set(leaf.x, leaf.y, leaf.z);
      treeDummy.rotation.set(0, leaf.r, 0);
      treeDummy.scale.setScalar(leaf.s);
      treeDummy.updateMatrix();
      litter.setMatrixAt(index, treeDummy.matrix);
      litter.setColorAt(
        index,
        envTint.copy(litterPalette[Math.floor(leaf.tint * litterPalette.length) % litterPalette.length])
      );    });
    litter.castShadow = false;
    litter.receiveShadow = true;
    scene.add(litter);

    /* --- 倒木与树桩：给草地增加叙事层次 ---------------------------- */
    const logMaterial = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x7d5a3f,
      roughness: 1,
      metalness: 0
    });
    const mossMaterial = new THREE.MeshStandardMaterial({
      color: 0x5f7a46,
      roughness: 1,
      flatShading: true
    });
    const cutMaterial = new THREE.MeshStandardMaterial({
      color: 0xc7a071,
      roughness: 0.9
    });
    function addFallenLog(x, z, length, radius, rotY) {
      const group = new THREE.Group();
      group.position.set(x, terrainHeight(x, z) + radius * 0.92, z);
      group.rotation.y = rotY;
      const bodyGeo = new THREE.CylinderGeometry(radius * 0.84, radius, length, 9, 1);
      bodyGeo.rotateZ(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, logMaterial);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      const mossRand = makeRng(607 + Math.round(x * 10));
      for (let i = 0; i < 4; i += 1) {
        const patch = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * (0.5 + mossRand() * 0.3), 1), mossMaterial);
        patch.position.set(
          (mossRand() - 0.5) * length * 0.8,
          radius * (0.55 + mossRand() * 0.25),
          (mossRand() - 0.5) * radius * 0.8
        );
        patch.scale.set(1.4, 0.45, 1.0);
        patch.rotation.y = mossRand() * TWO_PI;
        patch.castShadow = true;
        group.add(patch);
      }
      scene.add(group);
    }
    addFallenLog(-4.9, 4.6, 2.5, 0.22, 0.62);
    addFallenLog(6.4, -1.1, 2.1, 0.18, -0.95);
    addFallenLog(1.9, -6.4, 2.0, 0.16, 0.15);

    function addStump(x, z, radius, height) {
      const group = new THREE.Group();
      group.position.set(x, terrainHeight(x, z), z);
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.92, radius, height, 9, 1),
        logMaterial
      );
      body.position.y = height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.03, 9), cutMaterial);
      top.position.y = height + 0.015;
      group.add(top);
      const collar = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.02, 1), mossMaterial);
      collar.position.set(radius * 0.35, 0.06, radius * 0.15);
      collar.scale.set(1.25, 0.4, 1.1);
      group.add(collar);
      scene.add(group);
    }
    addStump(-3.4, 2.2, 0.3, 0.44);
    addStump(7.3, 4.8, 0.26, 0.36);

    /* ==================================================================
     * 场景内容 2/3：石头上读书的小人、雪人（可点击放置）
     * ================================================================== */

    const personRoot = new THREE.Group();
    personRoot.position.set(3.08, 1.215, 3.9);
    personRoot.rotation.y = 0.42;
    scene.add(personRoot);

    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xe6b493, roughness: 0.85 });
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x453327, roughness: 0.95 });
    const personShirtMaterial = new THREE.MeshStandardMaterial({ color: 0xf3ecda, roughness: 0.92 });
    const personSleeveMaterial = new THREE.MeshStandardMaterial({ color: 0xf3ecda, roughness: 0.92 });
    const personPantsMaterial = new THREE.MeshStandardMaterial({ color: 0x6f7f68, roughness: 0.95 });
    const personBootMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4737, roughness: 0.9 });
    const scarfMaterial = new THREE.MeshStandardMaterial({ color: 0xc59a5b, roughness: 0.95 });
    const bookCoverMaterial = new THREE.MeshStandardMaterial({ color: 0x556b52, roughness: 0.85 });
    const pageTex = makeTexture(
      THREE,
      128,
      160,
      (ctx, w, h) => {
        ctx.fillStyle = '#f6eedb';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(108,96,74,.42)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 12; i += 1) {
          const y = 22 + i * 10;
          ctx.beginPath();
          ctx.moveTo(18, y);
          ctx.lineTo(w - 16 - (i % 3 === 2 ? 26 : 0), y);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(170,88,74,.35)';
        ctx.beginPath();
        ctx.moveTo(14, 12);
        ctx.lineTo(14, h - 12);
        ctx.stroke();
        ctx.fillStyle = 'rgba(126,112,86,.35)';
        ctx.fillRect(0, 0, 3, h);
      },
      { clamp: true }
    );
    const pageMaterial = new THREE.MeshStandardMaterial({
      map: pageTex,
      color: 0xffffff,
      roughness: 0.95,
      side: THREE.DoubleSide
    });
    const coatMaterial = new THREE.MeshStandardMaterial({ color: 0xb05648, roughness: 0.94 });
    const furMaterial = new THREE.MeshStandardMaterial({ color: 0xe9ddc7, roughness: 1 });
    const mittenMaterial = new THREE.MeshStandardMaterial({ color: 0x8e4b3e, roughness: 0.95 });
    const beanieMaterial = new THREE.MeshStandardMaterial({ color: 0x7a8a74, roughness: 0.95 });

    addBox(personRoot, 0.34, 0.2, 0.3, 0, 0.04, 0.02, personPantsMaterial);
    const torso = addBox(personRoot, 0.4, 0.48, 0.26, 0, 0.4, 0.01, personShirtMaterial, [0.1, 0, 0]);
    addBox(personRoot, 0.43, 0.12, 0.29, 0, 0.17, 0.02, personPantsMaterial, [0.05, 0, 0]);

    // 双腿自然垂下
    for (let side = -1; side <= 1; side += 2) {
      addBox(personRoot, 0.15, 0.2, 0.38, side * 0.11, 0.0, 0.19, personPantsMaterial, [0.16, 0, 0]);
      addBox(personRoot, 0.13, 0.34, 0.15, side * 0.11, -0.23, 0.34, personPantsMaterial);
      addBox(personRoot, 0.15, 0.13, 0.26, side * 0.11, -0.43, 0.39, personBootMaterial);
    }

    // 头、头发、五官
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.8, 0.04);
    headGroup.rotation.x = 0.28;
    personRoot.add(headGroup);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 11), skinMaterial);
    headMesh.scale.set(1, 1.06, 0.98);
    headGroup.add(headMesh);
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.168, 14, 9, 0, TWO_PI, 0, Math.PI * 0.48),
      hairMaterial
    );
    hairCap.position.set(0, 0.022, -0.012);
    headGroup.add(hairCap);
    const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), hairMaterial);
    hairBun.position.set(0, 0.04, -0.15);
    headGroup.add(hairBun);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2521, roughness: 0.4 });
    for (let side = -1; side <= 1; side += 2) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), eyeMaterial);
      eye.position.set(side * 0.058, 0.004, 0.152);
      headGroup.add(eye);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), skinMaterial);
    nose.position.set(0, -0.03, 0.158);
    headGroup.add(nose);
    // 圆框眼镜
    const glassesMaterial = new THREE.MeshStandardMaterial({
      color: 0x312b24,
      roughness: 0.45,
      metalness: 0.35
    });
    for (let side = -1; side <= 1; side += 2) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.0045, 5, 14), glassesMaterial);
      ring.position.set(side * 0.058, 0.004, 0.157);
      headGroup.add(ring);
    }
    addBox(headGroup, 0.032, 0.006, 0.006, 0, 0.012, 0.159, glassesMaterial);
    addBox(headGroup, 0.05, 0.005, 0.005, -0.092, 0.012, 0.145, glassesMaterial, [0, 0.5, 0]);
    addBox(headGroup, 0.05, 0.005, 0.005, 0.092, 0.012, 0.145, glassesMaterial, [0, -0.5, 0]);

    // 围巾
    const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.045, 6, 14), scarfMaterial);
    scarfRing.position.set(0, 0.64, 0.01);
    scarfRing.rotation.x = Math.PI / 2;
    personRoot.add(scarfRing);
    addBox(personRoot, 0.09, 0.3, 0.05, 0.1, 0.5, 0.14, scarfMaterial, [0.1, 0, 0.16]);

    // 手臂（肩 → 书）
    function addLimb(parent, from, to, radius, material) {
      const start = new THREE.Vector3(from[0], from[1], from[2]);
      const end = new THREE.Vector3(to[0], to[1], to[2]);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, length, 7), material);
      mesh.position.copy(start).addScaledVector(direction, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      parent.add(mesh);
      return mesh;
    }
    addLimb(personRoot, [-0.2, 0.56, 0.03], [-0.196, 0.29, 0.36], 0.045, personSleeveMaterial);
    addLimb(personRoot, [0.2, 0.56, 0.03], [0.196, 0.29, 0.36], 0.045, personSleeveMaterial);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.044, 7, 6), skinMaterial);
    leftHand.position.set(-0.21, 0.275, 0.4);
    leftHand.scale.set(1, 0.86, 1.15);
    personRoot.add(leftHand);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.044, 7, 6), skinMaterial);
    rightHand.position.set(0.21, 0.275, 0.4);
    rightHand.scale.set(1, 0.86, 1.15);
    personRoot.add(rightHand);

    // 摊开的书：落在膝头，开本收紧，书页朝上微向镜头
    const bookGroup = new THREE.Group();
    bookGroup.position.set(0, 0.275, 0.36);
    bookGroup.rotation.x = 0.62;
    personRoot.add(bookGroup);
    addBox(bookGroup, 0.4, 0.032, 0.3, 0, 0, 0, bookCoverMaterial);
    const pageLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.163, 0.238), pageMaterial);
    pageLeft.position.set(-0.086, 0.021, 0);
    pageLeft.rotation.set(-Math.PI / 2, 0, 0.1);
    bookGroup.add(pageLeft);
    const pageRight = new THREE.Mesh(new THREE.PlaneGeometry(0.163, 0.238), pageMaterial);
    pageRight.position.set(0.086, 0.021, 0);
    pageRight.rotation.set(-Math.PI / 2, 0, -0.1);
    bookGroup.add(pageRight);
    addBox(bookGroup, 0.014, 0.042, 0.25, 0, 0.009, 0, bookCoverMaterial);
    const bookmark = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.165), scarfMaterial);
    bookmark.position.set(0.026, 0.024, 0.1);
    bookmark.rotation.x = -Math.PI / 2;
    bookGroup.add(bookmark);

    // 厚衣服（下雪时显现）
    const winterGear = new THREE.Group();
    winterGear.visible = false;
    personRoot.add(winterGear);
    addBox(winterGear, 0.48, 0.5, 0.32, 0, 0.42, 0.0, coatMaterial, [0.1, 0, 0]);
    addBox(winterGear, 0.44, 0.14, 0.3, 0, 0.69, 0.03, coatMaterial, [0.1, 0, 0]);
    // 毛边收在帽檐上，脖子只留围巾；厚领的圆环会在近景挡住下巴。
    const beanieCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.178, 12, 8, 0, TWO_PI, 0, Math.PI * 0.55),
      beanieMaterial
    );
    beanieCap.position.set(0, 0.81, 0.04);
    winterGear.add(beanieCap);
    const beanieCuff = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.038, 6, 14), furMaterial);
    beanieCuff.position.set(0, 0.82, 0.04);
    beanieCuff.rotation.x = Math.PI / 2;
    winterGear.add(beanieCuff);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), furMaterial);
    pom.position.set(0, 0.965, 0.04);
    winterGear.add(pom);
    for (let side = -1; side <= 1; side += 2) {
      const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.062, 7, 6), mittenMaterial);
      mitten.position.set(side * 0.21, 0.285, 0.4);
      mitten.scale.set(1, 0.85, 1.18);
      winterGear.add(mitten);
    }

    // 雨伞：拿到伞柄，伞面在头顶
    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.position.set(0.14, 0.3, 0.2);
    umbrellaGroup.rotation.set(0.08, 0, -0.12);
    umbrellaGroup.visible = false;
    personRoot.add(umbrellaGroup);
    const umbrellaCanopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3f6763,
      roughness: 0.85,
      flatShading: true,
      side: THREE.DoubleSide
    });
    const umbrellaShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.96, 6), MAT.metal);
    umbrellaShaft.position.y = 0.5;
    umbrellaGroup.add(umbrellaShaft);
    const umbrellaCanopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.82, 0.34, 8, 1, true),
      umbrellaCanopyMaterial
    );
    umbrellaCanopy.position.y = 1.18;
    umbrellaGroup.add(umbrellaCanopy);
    const umbrellaTip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 5), MAT.metal);
    umbrellaTip.position.y = 1.4;
    umbrellaGroup.add(umbrellaTip);
    const umbrellaHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 5, 10, Math.PI), MAT.darkWood);
    umbrellaHandle.position.set(0, 0.02, 0.05);
    umbrellaHandle.rotation.set(0, 0, 0);
    umbrellaGroup.add(umbrellaHandle);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TWO_PI;
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.8, 4), MAT.darkWood);
      rib.position.set(Math.sin(angle) * 0.15, 1.28, Math.cos(angle) * 0.15);
      rib.rotation.z = Math.sin(angle) * 0.32;
      rib.rotation.x = -Math.cos(angle) * 0.32;
      umbrellaGroup.add(rib);
    }

    personRoot.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    // 对话命中体：不可见的两个椭球，比逐个子网格便宜，也不会挡渲染。
    const personHitMeshes = [];
    const personHitMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const bodyHit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), personHitMaterial);
    bodyHit.position.set(0, 0.36, 0.08);
    bodyHit.scale.set(1.05, 1.2, 0.92);
    personRoot.add(bodyHit);
    const headHit = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), personHitMaterial);
    headHit.position.set(0, 0.82, 0.06);
    personRoot.add(headHit);
    personHitMeshes.push(bodyHit, headHit);

    // 石头旁的小物：马克杯与一摞书
    const mugMaterial = new THREE.MeshStandardMaterial({ color: 0xded3c0, roughness: 0.8 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.16, 10), mugMaterial);
    mug.position.set(0.55, 1.3, 0.12);
    mug.castShadow = true;
    rockGroup.add(mug);
    const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.016, 5, 9), mugMaterial);
    mugHandle.position.set(0.63, 1.3, 0.12);
    rockGroup.add(mugHandle);
    addBox(rockGroup, 0.26, 0.05, 0.19, 0.5, 1.235, -0.22, bookCoverMaterial, [0, 0.3, 0]);
    addBox(rockGroup, 0.23, 0.05, 0.17, 0.52, 1.285, -0.2, scarfMaterial, [0, -0.15, 0]);
    addBox(rockGroup, 0.2, 0.04, 0.15, 0.49, 1.33, -0.21, pageMaterial, [0, 0.4, 0]);

    /* ------------------------------------------------------------------
     * 雪人：分部件 InstancedMesh，一个雪人 6 个 draw call 的批次共享
     * ------------------------------------------------------------------ */
    const snowmanSnowMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f9fc,
      roughness: 0.88,
      metalness: 0,
      flatShading: true
    });
    const coalMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2c29, roughness: 0.62 });
    const carrotMaterial = new THREE.MeshStandardMaterial({ color: 0xd8793f, roughness: 0.8, flatShading: true });
    const twigMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4431, roughness: 0.95 });
    const snowScarfMaterial = new THREE.MeshStandardMaterial({ color: 0xb14b3f, roughness: 0.92 });
    const snowHatMaterial = new THREE.MeshStandardMaterial({ color: 0x3a4b5c, roughness: 0.9 });

    const snowmanBodyGeo = buildTreeGeometry([
      { geometry: new THREE.SphereGeometry(0.43, 12, 9), y: 0.42, material: snowmanSnowMaterial },
      { geometry: new THREE.SphereGeometry(0.31, 11, 8), y: 0.96, material: snowmanSnowMaterial },
      { geometry: new THREE.SphereGeometry(0.23, 10, 8), y: 1.38, material: snowmanSnowMaterial }
    ]);
    const snowmanCoalGeo = buildTreeGeometry([
      { geometry: new THREE.SphereGeometry(0.034, 6, 5), x: -0.075, y: 1.42, z: 0.19, material: coalMaterial },
      { geometry: new THREE.SphereGeometry(0.034, 6, 5), x: 0.075, y: 1.42, z: 0.19, material: coalMaterial },
      { geometry: new THREE.SphereGeometry(0.028, 6, 4), y: 1.02, z: 0.295, material: coalMaterial },
      { geometry: new THREE.SphereGeometry(0.028, 6, 4), y: 0.94, z: 0.295, material: coalMaterial },
      { geometry: new THREE.SphereGeometry(0.028, 6, 4), y: 0.86, z: 0.28, material: coalMaterial }
    ]);
    const snowmanNoseGeo = buildTreeGeometry([
      {
        geometry: new THREE.ConeGeometry(0.055, 0.26, 7),
        y: 1.37,
        z: 0.31,
        rx: Math.PI / 2,
        material: carrotMaterial
      }
    ]);
    const snowmanArmGeo = buildTreeGeometry([
      {
        geometry: new THREE.CylinderGeometry(0.022, 0.028, 0.58, 5),
        x: -0.38,
        y: 1.04,
        rz: 1.15,
        material: twigMaterial
      },
      {
        geometry: new THREE.CylinderGeometry(0.022, 0.028, 0.58, 5),
        x: 0.38,
        y: 1.04,
        rz: -1.15,
        material: twigMaterial
      }
    ]);
    const snowmanScarfGeo = buildTreeGeometry([
      {
        geometry: new THREE.TorusGeometry(0.19, 0.05, 6, 14),
        y: 1.21,
        rx: Math.PI / 2,
        material: snowScarfMaterial
      },
      { geometry: new THREE.BoxGeometry(0.1, 0.22, 0.05), y: 1.08, x: 0.07, z: 0.24, material: snowScarfMaterial }
    ]);
    const snowmanHatGeo = buildTreeGeometry([
      { geometry: new THREE.CylinderGeometry(0.17, 0.18, 0.2, 10), y: 1.6, material: snowHatMaterial },
      { geometry: new THREE.CylinderGeometry(0.27, 0.27, 0.035, 12), y: 1.49, material: snowHatMaterial }
    ]);

    const snowmen = [];
    let snowmanSerial = 0;
    const snowmanParts = { body: null, coal: null, nose: null, arms: null, scarf: null, hat: null };

    function createSnowmanMeshes() {
      const entries = [
        ['body', snowmanBodyGeo, snowmanSnowMaterial],
        ['coal', snowmanCoalGeo, coalMaterial],
        ['nose', snowmanNoseGeo, carrotMaterial],
        ['arms', snowmanArmGeo, twigMaterial],
        ['scarf', snowmanScarfGeo, snowScarfMaterial],
        ['hat', snowmanHatGeo, snowHatMaterial]
      ];
      entries.forEach(([key, geometry, material]) => {
        const mesh = new THREE.InstancedMesh(geometry, material, MAX_SNOWMEN);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        mesh.castShadow = key === 'body' || key === 'hat';
        mesh.receiveShadow = false;
        const zero = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < MAX_SNOWMEN; i += 1) {
          mesh.setMatrixAt(i, zero);
        }
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh);
        snowmanParts[key] = mesh;
      });
    }
    createSnowmanMeshes();

    const snowmanDummy = new THREE.Object3D();
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    function refreshSnowmen() {
      for (let i = 0; i < MAX_SNOWMEN; i += 1) {
        const snowman = snowmen[i];
        if (!snowman) {
          Object.keys(snowmanParts).forEach((key) => {
            snowmanParts[key].setMatrixAt(i, zeroMatrix);
          });
          continue;
        }
        const age = clockTime - snowman.bornAt;
        const progress = clamp(age / 0.6, 0, 1);
        const pop = progress < 1 ? easeOutBack(progress) : 1;
        const lift = Math.sin(progress * Math.PI) * 0.08;
        snowmanDummy.position.set(snowman.x, snowman.groundY + lift, snowman.z);
        snowmanDummy.rotation.set(0, snowman.rotation, 0);
        snowmanDummy.scale.setScalar(Math.max(0.0001, snowman.scale * pop));
        snowmanDummy.updateMatrix();
        snowmanParts.body.setMatrixAt(i, snowmanDummy.matrix);
        snowmanParts.coal.setMatrixAt(i, snowmanDummy.matrix);
        snowmanParts.nose.setMatrixAt(i, snowmanDummy.matrix);
        snowmanParts.arms.setMatrixAt(i, snowmanDummy.matrix);
        snowmanParts.scarf.setMatrixAt(i, snowmanDummy.matrix);
        snowmanParts.hat.setMatrixAt(i, snowmanDummy.matrix);
      }
      Object.keys(snowmanParts).forEach((key) => {
        const mesh = snowmanParts[key];
        if (mesh) {
          mesh.instanceMatrix.needsUpdate = true;
        }
      });
    }

    // 半透明预览
    const ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    const ghostGroup = new THREE.Group();
    const ghostBody = new THREE.Mesh(snowmanBodyGeo, ghostMaterial);
    ghostGroup.add(ghostBody);
    const ghostRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ghostRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.66, 28), ghostRingMaterial);
    ghostRing.rotation.x = -Math.PI / 2;
    ghostRing.position.y = 0.02;
    ghostGroup.add(ghostRing);
    ghostGroup.visible = false;
    scene.add(ghostGroup);

    // 放置雪人时的一小团雪雾
    const puffs = [];
    for (let i = 0; i < 16; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: softTex,
        color: 0xf2f8fc,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      scene.add(sprite);
      puffs.push({ sprite, life: 0, ttl: 1, vx: 0, vy: 0, vz: 0, scale: 0.2 });
    }

    function spawnPuffs(x, y, z) {
      puffs.forEach((puff, index) => {
        puff.life = 0;
        puff.ttl = 0.5 + Math.random() * 0.45;
        const angle = (index / puffs.length) * TWO_PI + Math.random() * 0.6;
        const speed = 0.45 + Math.random() * 0.9;
        puff.vx = Math.cos(angle) * speed;
        puff.vz = Math.sin(angle) * speed;
        puff.vy = 0.5 + Math.random() * 0.8;
        puff.scale = 0.16 + Math.random() * 0.22;
        puff.sprite.position.set(x + Math.cos(angle) * 0.2, y + 0.15, z + Math.sin(angle) * 0.2);
        puff.sprite.material.opacity = 0.55;
        puff.sprite.scale.setScalar(puff.scale);
        puff.sprite.visible = true;
      });
    }

    function updatePuffs(dt) {
      puffs.forEach((puff) => {
        if (!puff.sprite.visible) {
          return;
        }
        puff.life += dt;
        const t = puff.life / puff.ttl;
        if (t >= 1) {
          puff.sprite.visible = false;
          puff.sprite.material.opacity = 0;
          return;
        }
        puff.sprite.position.x += puff.vx * dt;
        puff.sprite.position.y += puff.vy * dt;
        puff.sprite.position.z += puff.vz * dt;
        puff.vy -= 0.75 * dt;
        puff.sprite.material.opacity = 0.5 * (1 - t) * (1 - t);
        puff.sprite.scale.setScalar(puff.scale * (1 + t * 2.2));
      });
    }

    /* ==================================================================
     * 场景内容 3/3：雨雪粒子、光点、蝴蝶、鸟、花、水洼、炊烟
     * ================================================================== */

    /* --- 雪 -------------------------------------------------------- */
    const snowCount = lowQuality ? 520 : 1200;
    const snowRand = makeRng(401);
    const snowPositions = new Float32Array(snowCount * 3);
    const snowMeta = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i += 1) {
      snowPositions[i * 3] = (snowRand() - 0.5) * 30;
      snowPositions[i * 3 + 1] = snowRand() * 14;
      snowPositions[i * 3 + 2] = (snowRand() - 0.5) * 30 + 1.5;
      snowMeta[i * 3] = 0.55 + snowRand() * 0.8;
      snowMeta[i * 3 + 1] = snowRand() * TWO_PI;
      snowMeta[i * 3 + 2] = 0.5 + snowRand() * 0.9;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowMaterial = new THREE.PointsMaterial({
      map: softTex,
      color: 0xf8fcff,
      size: 0.17,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const snowPoints = new THREE.Points(snowGeo, snowMaterial);
    snowPoints.frustumCulled = false;
    snowPoints.renderOrder = 6;
    snowPoints.visible = false;
    scene.add(snowPoints);

    function updateSnowParticles(dt) {
      const amount = clamp(snowLevel, 0, 1);
      snowPoints.visible = amount > 0.02;
      if (!snowPoints.visible) {
        return;
      }
      snowMaterial.opacity = amount * 0.95;
      snowMaterial.size = 0.14 + amount * 0.05;
      for (let i = 0; i < snowCount; i += 1) {
        const speed = snowMeta[i * 3];
        const phase = snowMeta[i * 3 + 1];
        snowPositions[i * 3 + 1] -= speed * dt * (0.7 + amount * 0.9);
        snowPositions[i * 3] += Math.sin(clockTime * 0.7 + phase) * 0.22 * dt;
        snowPositions[i * 3 + 2] += Math.cos(clockTime * 0.55 + phase) * 0.16 * dt;
        if (snowPositions[i * 3 + 1] < -0.2) {
          snowPositions[i * 3] = (snowRand() - 0.5) * 30;
          snowPositions[i * 3 + 1] = 12 + snowRand() * 4;
          snowPositions[i * 3 + 2] = (snowRand() - 0.5) * 30 + 1.5;
        }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }

    /* --- 雨 -------------------------------------------------------- */
    const rainCount = lowQuality ? 340 : 820;
    const rainRand = makeRng(419);
    const rainDrops = [];
    for (let i = 0; i < rainCount; i += 1) {
      rainDrops.push({
        x: (rainRand() - 0.5) * 30,
        y: rainRand() * 16,
        z: (rainRand() - 0.5) * 30 + 1,
        len: 0.35 + rainRand() * 0.55,
        speed: 11 + rainRand() * 7
      });
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rainCount * 6), 3));
    const rainMaterial = new THREE.LineBasicMaterial({
      color: 0xd3e2ea,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const rainLines = new THREE.LineSegments(rainGeo, rainMaterial);
    rainLines.frustumCulled = false;
    rainLines.renderOrder = 5;
    rainLines.visible = false;
    scene.add(rainLines);

    function updateRainParticles(dt) {
      const amount = clamp(rainAmount, 0, 1);
      rainLines.visible = amount > 0.02;
      if (!rainLines.visible) {
        return;
      }
      rainMaterial.opacity = amount * 0.36;
      const positions = rainGeo.attributes.position.array;
      for (let i = 0; i < rainCount; i += 1) {
        const drop = rainDrops[i];
        drop.y -= drop.speed * dt * (0.75 + amount * 0.45);
        drop.x += 0.55 * dt;
        if (drop.y < -0.3) {
          drop.y = 13 + rainRand() * 4;
          drop.x = (rainRand() - 0.5) * 30;
          drop.z = (rainRand() - 0.5) * 30 + 1;
        }
        const offset = i * 6;
        positions[offset] = drop.x;
        positions[offset + 1] = drop.y;
        positions[offset + 2] = drop.z;
        positions[offset + 3] = drop.x - 0.035;
        positions[offset + 4] = drop.y + drop.len;
        positions[offset + 5] = drop.z;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    /* --- 光尘 / 萤火虫 --------------------------------------------- */
    const moteRand = makeRng(431);
    const moteCount = lowQuality ? 50 : 110;
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i += 1) {
      const angle = moteRand() * TWO_PI;
      const distance = 2 + moteRand() * 9;
      motePositions[i * 3] = Math.cos(angle) * distance;
      motePositions[i * 3 + 1] = 0.4 + moteRand() * 3.2;
      motePositions[i * 3 + 2] = Math.sin(angle) * distance + 1.5;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMaterial = new THREE.PointsMaterial({
      map: softTex,
      color: 0xffeec4,
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const motes = new THREE.Points(moteGeo, moteMaterial);
    motes.frustumCulled = false;
    scene.add(motes);

    const flyRand = makeRng(443);
    const flyCount = lowQuality ? 12 : 24;
    const flyPositions = new Float32Array(flyCount * 3);
    const flyMeta = new Float32Array(flyCount * 4);
    for (let i = 0; i < flyCount; i += 1) {
      const angle = flyRand() * TWO_PI;
      const distance = 2.5 + flyRand() * 8;
      flyMeta[i * 4] = Math.cos(angle) * distance;
      flyMeta[i * 4 + 1] = Math.sin(angle) * distance + 1.5;
      flyMeta[i * 4 + 2] = 0.5 + flyRand() * 2.2;
      flyMeta[i * 4 + 3] = flyRand() * TWO_PI;
      flyPositions[i * 3] = flyMeta[i * 4];
      flyPositions[i * 3 + 1] = flyMeta[i * 4 + 2];
      flyPositions[i * 3 + 2] = flyMeta[i * 4 + 1];
    }
    const flyGeo = new THREE.BufferGeometry();
    flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPositions, 3));
    const flyMaterial = new THREE.PointsMaterial({
      map: glowTex,
      color: 0xffdf93,
      size: 0.28,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const fireflies = new THREE.Points(flyGeo, flyMaterial);
    fireflies.frustumCulled = false;
    fireflies.visible = false;
    scene.add(fireflies);

    function updateFireflies() {
      const amount = flyAmount;
      fireflies.visible = amount > 0.02;
      if (!fireflies.visible) {
        return;
      }
      flyMaterial.opacity = amount * (0.55 + Math.sin(clockTime * 2.1) * 0.18);
      for (let i = 0; i < flyCount; i += 1) {
        const cx = flyMeta[i * 4];
        const cz = flyMeta[i * 4 + 1];
        const baseY = flyMeta[i * 4 + 2];
        const phase = flyMeta[i * 4 + 3];
        flyPositions[i * 3] = cx + Math.sin(clockTime * 0.5 + phase) * 0.6;
        flyPositions[i * 3 + 1] = baseY + Math.sin(clockTime * 0.8 + phase * 2) * 0.35;
        flyPositions[i * 3 + 2] = cz + Math.cos(clockTime * 0.42 + phase) * 0.6;
      }
      flyGeo.attributes.position.needsUpdate = true;
    }

    /* --- 蝴蝶 ------------------------------------------------------ */
    const butterflyRand = makeRng(457);
    const butterflies = [];
    const wingGeo = new THREE.PlaneGeometry(0.13, 0.09);
    const butterflyColors = [0xe6c46a, 0xd9948c, 0xe4d9b2, 0xd2a35e, 0xc9a6c8];
    for (let i = 0; i < 5; i += 1) {
      const group = new THREE.Group();
      const wingMaterial = new THREE.MeshStandardMaterial({
        color: butterflyColors[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        roughness: 0.85,
        metalness: 0
      });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.13, 4), hairMaterial);
      body.rotation.x = Math.PI / 2;
      group.add(body);
      const leftWing = new THREE.Mesh(wingGeo, wingMaterial);
      leftWing.position.x = -0.085;
      const rightWing = new THREE.Mesh(wingGeo, wingMaterial);
      rightWing.position.x = 0.085;
      group.add(leftWing);
      group.add(rightWing);
      scene.add(group);
      butterflies.push({
        group,
        leftWing,
        rightWing,
        cx: 0.6 + (butterflyRand() - 0.5) * 6,
        cz: 1.2 + (butterflyRand() - 0.5) * 5,
        radius: 0.6 + butterflyRand() * 1.8,
        speed: 0.22 + butterflyRand() * 0.3,
        phase: butterflyRand() * TWO_PI,
        height: 0.45 + butterflyRand() * 0.85
      });
    }
    function updateButterflies() {
      const amount = butterflyAmount;
      butterflies.forEach((butterfly, index) => {
        butterfly.group.visible = amount > 0.05;
        if (!butterfly.group.visible) {
          return;
        }
        const angle = clockTime * butterfly.speed + butterfly.phase;
        butterfly.group.position.set(
          butterfly.cx + Math.cos(angle) * butterfly.radius,
          butterfly.height + Math.sin(clockTime * 1.4 + index) * 0.18,
          butterfly.cz + Math.sin(angle * 0.8) * butterfly.radius
        );
        butterfly.group.rotation.y = -angle + Math.PI / 2;
        const flap = Math.sin(clockTime * 16 + butterfly.phase) * 0.9;
        butterfly.leftWing.rotation.y = -0.35 + flap;
        butterfly.rightWing.rotation.y = 0.35 - flap;
      });
    }

    /* --- 小鸟（V 形线段群） ---------------------------------------- */
    const birdRand = makeRng(467);
    const birdCount = 6;
    const birdPositions = new Float32Array(birdCount * 4 * 3);
    const birdGeo = new THREE.BufferGeometry();
    birdGeo.setAttribute('position', new THREE.BufferAttribute(birdPositions, 3));
    const birdMaterial = new THREE.LineBasicMaterial({
      color: 0x39433c,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const birds = new THREE.LineSegments(birdGeo, birdMaterial);
    birds.frustumCulled = false;
    scene.add(birds);
    const birdMeta = [];
    for (let i = 0; i < birdCount; i += 1) {
      birdMeta.push({
        radius: 15 + birdRand() * 8,
        height: 12 + birdRand() * 4,
        speed: 0.045 + birdRand() * 0.03,
        phase: birdRand() * TWO_PI,
        size: 0.36 + birdRand() * 0.25
      });
    }
    function updateBirds() {
      birdMaterial.opacity = birdAmount * 0.85;
      birds.visible = birdAmount > 0.02;
      if (!birds.visible) {
        return;
      }
      for (let i = 0; i < birdCount; i += 1) {
        const bird = birdMeta[i];
        const angle = clockTime * bird.speed + bird.phase;
        const cx = Math.cos(angle) * bird.radius;
        const cz = Math.sin(angle) * bird.radius - 6;
        const cy = bird.height + Math.sin(clockTime * 0.4 + bird.phase) * 0.8;
        const flap = Math.sin(clockTime * 3.2 + bird.phase) * bird.size * 0.6;
        const base = i * 12;
        birdPositions[base] = cx - bird.size;
        birdPositions[base + 1] = cy + flap;
        birdPositions[base + 2] = cz;
        birdPositions[base + 3] = cx;
        birdPositions[base + 4] = cy;
        birdPositions[base + 5] = cz;
        birdPositions[base + 6] = cx;
        birdPositions[base + 7] = cy;
        birdPositions[base + 8] = cz;
        birdPositions[base + 9] = cx + bird.size;
        birdPositions[base + 10] = cy + flap;
        birdPositions[base + 11] = cz;
      }
      birdGeo.attributes.position.needsUpdate = true;
    }

    /* --- 野花 ------------------------------------------------------ */
    const flowerRand = makeRng(479);
    const flowerData = [];
    guard = 0;
    while (flowerData.length < 90 && guard < 600) {
      guard += 1;
      const angle = flowerRand() * TWO_PI;
      const distance = 2.6 + flowerRand() * 8.5;
      const x = Math.cos(angle) * distance + 0.4;
      const z = Math.sin(angle) * distance + 1.2;
      if (Math.hypot(x + 2.4, z + 2.9) < 4.2) continue;
      if (Math.hypot(x - 3.1, z - 3.9) < 1.9) continue;
      if (nearPath(x, z, 0.95)) continue;
      if (Math.hypot(x + 0.15, z - 6.15) < 1.1) continue;
      flowerData.push({
        x,
        z,
        y: terrainHeight(x, z),
        s: 0.7 + flowerRand() * 0.8,
        pink: flowerRand() > 0.55,
        lean: (flowerRand() - 0.5) * 0.24
      });
    }
    const stemGeo = new THREE.CylinderGeometry(0.009, 0.012, 0.17, 4);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x5f7a43, roughness: 1 });
    const bloomGeo = new THREE.IcosahedronGeometry(0.048, 0);
    const bloomPinkMaterial = new THREE.MeshStandardMaterial({ color: 0xe7aaa1, roughness: 0.8, flatShading: true });
    const bloomYellowMaterial = new THREE.MeshStandardMaterial({ color: 0xebcb76, roughness: 0.8, flatShading: true });
    const stemMesh = new THREE.InstancedMesh(stemGeo, stemMaterial, flowerData.length);
    const pinkBlooms = new THREE.InstancedMesh(bloomGeo, bloomPinkMaterial, flowerData.length);
    const yellowBlooms = new THREE.InstancedMesh(bloomGeo, bloomYellowMaterial, flowerData.length);
    let pinkCount = 0;
    let yellowCount = 0;
    flowerData.forEach((flower, index) => {
      treeDummy.position.set(flower.x, flower.y + 0.085, flower.z);
      treeDummy.rotation.set(flower.lean, 0, flower.lean * 0.6);
      treeDummy.scale.setScalar(flower.s);
      treeDummy.updateMatrix();
      stemMesh.setMatrixAt(index, treeDummy.matrix);
      treeDummy.position.y = flower.y + 0.19 * flower.s;
      treeDummy.scale.setScalar(flower.s);
      treeDummy.updateMatrix();
      if (flower.pink) {
        pinkBlooms.setMatrixAt(pinkCount, treeDummy.matrix);
        pinkCount += 1;
      } else {
        yellowBlooms.setMatrixAt(yellowCount, treeDummy.matrix);
        yellowCount += 1;
      }
    });
    pinkBlooms.count = pinkCount;
    yellowBlooms.count = yellowCount;
    [stemMesh, pinkBlooms, yellowBlooms].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      scene.add(mesh);
    });
    const flowerMeshes = [stemMesh, pinkBlooms, yellowBlooms];
    function updateFlowers(amount) {
      const fade = clamp(amount, 0, 1);
      flowerMeshes.forEach((mesh) => {
        mesh.visible = fade > 0.02;
        mesh.material.transparent = true;
        mesh.material.opacity = fade;
      });
    }
    updateFlowers(1);

    /* --- 水洼 ------------------------------------------------------ */
    const puddleMaterial = MAT.puddle;
    const puddleRand = makeRng(491);
    const puddleData = [
      [-0.4, 2.6, 0.55],
      [0.8, 4.4, 0.42],
      [-2.4, 1.8, 0.34],
      [2.9, 6.2, 0.48],
      [-4.4, 5.4, 0.3]
    ];
    puddleData.forEach(([px, pz, pr]) => {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(pr, 18), puddleMaterial);
      puddle.rotation.x = -Math.PI / 2;
      puddle.rotation.z = puddleRand() * TWO_PI;
      puddle.position.set(px, terrainHeight(px, pz) + 0.028, pz);
      puddle.receiveShadow = false;
      scene.add(puddle);
    });

    /* --- 炊烟 ------------------------------------------------------ */
    cabinDetails.updateMatrixWorld(true);
    const chimneyWorld = cabinDetails.localToWorld(new THREE.Vector3(-1.16, 5.42, -0.72));
    const smokeSprites = [];
    for (let i = 0; i < 9; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: smokeTex,
        color: 0xe7e9e4,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(chimneyWorld);
      sprite.visible = false;
      scene.add(sprite);
      smokeSprites.push({ sprite, phase: i / 9 });
    }
    function updateSmoke() {
      const amount = smokeAmount;
      smokeSprites.forEach((entry, index) => {
        const cycle = (clockTime * 0.11 + entry.phase) % 1;
        entry.sprite.visible = amount > 0.03;
        if (!entry.sprite.visible) {
          return;
        }
        const rise = cycle * 4.2;
        const drift = Math.sin(cycle * 4 + index) * 0.28 + cycle * 0.5;
        entry.sprite.position.set(
          chimneyWorld.x + drift,
          chimneyWorld.y + rise,
          chimneyWorld.z + 0.16 + cycle * 0.5
        );
        const size = 0.5 + cycle * 1.5;
        entry.sprite.scale.set(size, size, 1);
        entry.sprite.material.opacity =
          amount * smoothstep(0, 0.18, cycle) * (1 - smoothstep(0.5, 1, cycle)) * 0.34;
      });
    }

    /* ==================================================================
     * 天气：所有视觉值从 PRESETS 阻尼插值，切换时不会闪跳
     * ================================================================== */

    // 屋顶积雪层（和屋面板平行，雪天逐渐显出）
    const roofSnowMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3f9fd,
      roughness: 0.88,
      transparent: true,
      opacity: 0,
      flatShading: true
    });
    const roofSnowRight = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.13, 3.92), roofSnowMaterial);
    roofSnowRight.position.set(1.0, 3.9, 0);
    roofSnowRight.rotation.z = -roofSlope;
    cabinDetails.add(roofSnowRight);
    const roofSnowLeft = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.13, 3.92), roofSnowMaterial);
    roofSnowLeft.position.set(-1.0, 3.9, 0);
    roofSnowLeft.rotation.z = roofSlope;
    cabinDetails.add(roofSnowLeft);
    const roofSnowRidge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 4.0), roofSnowMaterial);
    roofSnowRidge.position.set(0, 4.48, 0);
    cabinDetails.add(roofSnowRidge);
    roofSnowRight.visible = false;
    roofSnowLeft.visible = false;
    roofSnowRidge.visible = false;

    const numericKeys = [
      'fogDensity',
      'sunIntensity',
      'hemiIntensity',
      'ambientIntensity',
      'exposure',
      'cloudOpacity',
      'snow',
      'rain',
      'stars',
      'fireflies',
      'motes',
      'window',
      'lantern',
      'smoke',
      'birds',
      'butterflies',
      'flowers',
      'sunGlow',
      'bloom',
      'rays',
      'vignette',
      'grain',
      'saturation',
      'contrast',
      'split'
    ];
    const colorKeys = [
      'skyTop',
      'skyHorizon',
      'fog',
      'sunColor',
      'hemiSky',
      'hemiGround',
      'ambient',
      'cloud',
      'groundTint',
      'foliageTint',
      'personShirt',
      'personSleeve',
      'personPants',
      'personBoots',
      'postTint',
      'postShadow',
      'postHighlight'
    ];
    const state = {
      numbers: {},
      colors: {},
      sunDir: new THREE.Vector3()
    };
    numericKeys.forEach((key) => {
      state.numbers[key] = PRESETS.sunny[key];
    });
    colorKeys.forEach((key) => {
      state.colors[key] = new THREE.Color(PRESETS.sunny[key]);
    });
    state.sunDir.fromArray(PRESETS.sunny.sunDir).normalize();

    let rainAmount = 0;
    let flyAmount = 0;
    let butterflyAmount = 1;
    let birdAmount = 1;
    let smokeAmount = 0.5;
    let snowCover = 0;
    const pineBaseColor = pineCanopyMaterial.color.clone();
    const roundBaseColor = roundCanopyMaterial.color.clone();
    const bushBaseColor = bushMaterial.color.clone();
    const pathBaseColor = pathMaterial.color.clone();
    const tintColor = new THREE.Color();
    const sunPosition = new THREE.Vector3();

    function applyWeatherVisuals() {
      skyUniforms.uTop.value.copy(state.colors.skyTop);
      skyUniforms.uHorizon.value.copy(state.colors.skyHorizon);
      skyUniforms.uSunColor.value.copy(state.colors.sunColor);
      skyUniforms.uSunGlow.value = state.numbers.sunGlow;
      skyUniforms.uSunDir.value.copy(state.sunDir);
      scene.fog.color.copy(state.colors.fog);
      scene.fog.density = state.numbers.fogDensity;

      hemiLight.color.copy(state.colors.hemiSky);
      hemiLight.groundColor.copy(state.colors.hemiGround);
      hemiLight.intensity = state.numbers.hemiIntensity;
      ambientLight.color.copy(state.colors.ambient);
      ambientLight.intensity = state.numbers.ambientIntensity;
      sunLight.color.copy(state.colors.sunColor);
      sunLight.intensity = state.numbers.sunIntensity;
      sunPosition.copy(state.sunDir).multiplyScalar(30);
      sunLight.position.copy(sunPosition);
      rimLight.color.copy(state.colors.sunColor).lerp(state.colors.skyTop, 0.35);
      rimLight.intensity = 0.12 + state.numbers.sunGlow * 0.22;

      post.uniforms.uExposure.value = state.numbers.exposure * 1.22;
      post.uniforms.uBloom.value = state.numbers.bloom;
      post.uniforms.uRays.value = state.numbers.rays * 0.9;
      post.uniforms.uVignette.value = state.numbers.vignette;
      post.uniforms.uGrain.value = state.numbers.grain;
      post.uniforms.uSaturation.value = state.numbers.saturation;
      post.uniforms.uContrast.value = state.numbers.contrast;
      post.uniforms.uTint.value.copy(state.colors.postTint);
      post.uniforms.uShadowTint.value.copy(state.colors.postShadow);
      post.uniforms.uHighlightTint.value.copy(state.colors.postHighlight);
      post.uniforms.uSplit.value = state.numbers.split;

      sunGlowMaterial.color.copy(state.colors.sunColor);
      sunGlowMaterial.opacity = clamp(state.numbers.sunGlow * 0.92, 0, 1);
      sunCoreMaterial.color.copy(state.colors.sunColor).lerp(tintColor.set(0xffffff), 0.55);
      sunCoreMaterial.opacity = clamp(state.numbers.sunGlow * 1.05, 0, 1);
      sunGlow.position.copy(state.sunDir).multiplyScalar(66);
      sunCore.position.copy(state.sunDir).multiplyScalar(66);
      sunGlow.visible = state.numbers.sunGlow > 0.03;
      sunCore.visible = state.numbers.sunGlow > 0.03;

      shaftMaterial.color.copy(state.colors.sunColor);
      shaftMaterial.opacity = clamp(state.numbers.sunGlow, 0, 1.2) * 0.11;
      shaftGroup.visible = state.numbers.sunGlow > 0.12;

      cloudMaterial.color.copy(state.colors.cloud);
      cloudMaterial.opacity = state.numbers.cloudOpacity;
      starMaterial.opacity = state.numbers.stars * 0.9;

      groundMaterial.color.copy(state.colors.groundTint);
      pathMaterial.color.copy(pathBaseColor).lerp(state.colors.groundTint, 0.3);
      pineCanopyMaterial.color.copy(pineBaseColor).multiply(state.colors.foliageTint);
      roundCanopyMaterial.color.copy(roundBaseColor).multiply(state.colors.foliageTint);
      bushMaterial.color.copy(bushBaseColor).multiply(state.colors.foliageTint);
      fernMaterial.color.copy(fernBaseColor).multiply(state.colors.foliageTint);
      birchLeafMaterial.color.copy(birchLeafBase).multiply(state.colors.foliageTint);
      farPineMaterial.color.copy(state.colors.foliageTint).lerp(tintColor.set(0xffffff), 0.3);
      grassMaterial.color.copy(state.colors.foliageTint).lerp(tintColor.set(0xffffff), 0.55);
      hillMaterials.forEach((material, index) => {
        material.color
          .copy(hillBaseColors[index])
          .multiply(state.colors.foliageTint)
          .lerp(state.colors.fog, 0.14);
      });

      const windowAmount = state.numbers.window;
      MAT.glass.emissiveIntensity = 0.03 + windowAmount * 1.5;
      frontGlow.material.opacity = windowAmount * 0.26;
      sideGlow.material.opacity = windowAmount * 0.2;
      lanternSprite.material.opacity = 0.18 + state.numbers.lantern * 0.42;
      lanternLight.intensity = state.numbers.lantern * 1.7;

      puddleMaterial.opacity = clamp(rainAmount, 0, 1) * 0.55;

      personShirtMaterial.color.copy(state.colors.personShirt);
      personSleeveMaterial.color.copy(state.colors.personSleeve);
      personPantsMaterial.color.copy(state.colors.personPants);
      personBootMaterial.color.copy(state.colors.personBoots);

      const umbrellaAmount = clamp(rainAmount, 0, 1);
      umbrellaGroup.visible = umbrellaAmount > 0.06;
      umbrellaGroup.scale.setScalar(0.35 + 0.65 * smoothstep(0.06, 1, umbrellaAmount));

      const winterAmount = clamp((state.numbers.snow - 0.04) / 0.7, 0, 1);
      winterGear.visible = winterAmount > 0.16;
      winterGear.scale.setScalar(0.82 + 0.18 * smoothstep(0.16, 1, winterAmount));

      const roofSnow = smoothstep(0.04, 0.55, snowCover);
      roofSnowRight.visible = roofSnow > 0.015;
      roofSnowLeft.visible = roofSnow > 0.015;
      roofSnowRidge.visible = roofSnow > 0.015;
      roofSnowMaterial.opacity = roofSnow * 0.98;

      motes.visible = state.numbers.motes > 0.02;
      moteMaterial.opacity = state.numbers.motes * 0.45;
      stars.visible = state.numbers.stars > 0.02;
      updateFlowers(state.numbers.flowers);
    }

    function setWeather(name, instant) {
      if (WEATHERS.indexOf(name) === -1) {
        return false;
      }
      const changed = name !== targetWeather;
      targetWeather = name;
      if (instant) {
        const preset = PRESETS[name];
        numericKeys.forEach((key) => {
          state.numbers[key] = preset[key];
        });
        colorKeys.forEach((key) => {
          setSrgbHex(state.colors[key], preset[key]);
        });
        state.sunDir.fromArray(preset.sunDir).normalize();
        snowLevel = preset.snow;
        rainAmount = preset.rain;
        flyAmount = preset.fireflies;
        butterflyAmount = preset.butterflies;
        birdAmount = preset.birds;
        smokeAmount = preset.smoke;
        snowCover = preset.snow;
        updateGroundSnow(snowCover);
        lastCapSnow = snowCover;
        updateSnowCaps(snowCover);
      }
      applyWeatherVisuals();
      soundscape.setWeather(name);
      if (changed && !instant) {
        talkCursor[name] = 0;
        hideSpeech();
      }
      if (changed && !instant && noticeHandler) {
        if (name === 'snow') {
          noticeHandler('下雪了：点一下地面，可以堆一个雪人。');
        } else if (name === 'rain') {
          noticeHandler('下雨了，小树屋前撑起了伞。');
        } else if (name === 'dusk') {
          noticeHandler('黄昏了，窗里的灯亮起来了。');
        } else {
          noticeHandler('天晴了，林子里的光又暖了起来。');
        }
      }
      return true;
    }

    function updateWeather(dt) {
      const preset = PRESETS[targetWeather];
      const numberLambda = reducedMotion ? 6 : 1.7;
      const colorLambda = reducedMotion ? 6 : 1.9;
      numericKeys.forEach((key) => {
        state.numbers[key] = damp(state.numbers[key], preset[key], numberLambda, dt);
        if (Math.abs(state.numbers[key] - preset[key]) < 0.0006) {
          state.numbers[key] = preset[key];
        }
      });
      colorKeys.forEach((key) => {
        setSrgbHex(tintColor, preset[key]);
        dampColor(state.colors[key], tintColor, colorLambda, dt);
      });
      sunPosition.fromArray(preset.sunDir).normalize();
      state.sunDir.lerp(sunPosition, 1 - Math.exp(-1.4 * dt)).normalize();

      snowLevel = state.numbers.snow;
      rainAmount = state.numbers.rain;
      flyAmount = state.numbers.fireflies;
      butterflyAmount = state.numbers.butterflies;
      birdAmount = state.numbers.birds;
      smokeAmount = state.numbers.smoke;

      const accumulateLambda = targetWeather === 'snow' ? 0.5 : 1.1;
      snowCover = damp(snowCover, state.numbers.snow, accumulateLambda, dt);
      if (snowCover < 0.003) {
        snowCover = 0;
      }
      updateGroundSnow(snowCover);
      if (Math.abs(snowCover - lastCapSnow) > 0.004) {
        lastCapSnow = snowCover;
        updateSnowCaps(snowCover);
      }
      applyWeatherVisuals();
    }

    /* ==================================================================
     * 相机、鼠标交互、雪人放置
     * ================================================================== */

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const ghostPoint = new THREE.Vector3();
    let pointerInside = false;
    let pointerActive = false;
    let activePointerId = null;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let hoverClientX = 0;
    let hoverClientY = 0;
    let dragged = false;
    let personHovered = false;

    let talkClicks = 0;
    const talkCursor = { sunny: 0, rain: 0, snow: 0, dusk: 0 };
    let speechEl = null;
    let speechTimer = 0;
    let speechVisible = false;
    const speechAnchor = new THREE.Vector3();

    function ensureSpeechEl() {
      if (speechEl) {
        return speechEl;
      }
      if (opts.speechBubble === false || typeof document === 'undefined' || !document.body) {
        return null;
      }
      ensureSpeechStyle();
      speechEl = document.createElement('div');
      speechEl.className = 'cabin-speech';
      speechEl.setAttribute('role', 'status');
      speechEl.setAttribute('aria-live', 'polite');
      speechEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(speechEl);
      return speechEl;
    }

    function updateSpeechPosition() {
      if (!speechVisible || !speechEl) {
        return;
      }
      headGroup.getWorldPosition(speechAnchor);
      speechAnchor.y += 0.36;
      speechAnchor.project(camera);
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) {
        return;
      }
      const px = rect.left + (speechAnchor.x * 0.5 + 0.5) * rect.width;
      const py = rect.top + (0.5 - speechAnchor.y * 0.5) * rect.height;
      const marginX = Math.min(172, (global.innerWidth || rect.width) * 0.3);
      const x = clamp(px, marginX, (global.innerWidth || rect.width) - marginX);
      const below = py < 190;
      speechEl.classList.toggle('is-below', below);
      speechEl.style.left = Math.round(x) + 'px';
      speechEl.style.top = Math.round(Math.max(py, 10)) + 'px';
      speechEl.style.visibility = speechAnchor.z <= 1 ? '' : 'hidden';
    }

    function hideSpeech() {
      speechVisible = false;
      if (speechTimer) {
        global.clearTimeout(speechTimer);
        speechTimer = 0;
      }
      if (speechEl) {
        speechEl.classList.remove('is-visible');
        speechEl.setAttribute('aria-hidden', 'true');
      }
    }

    function showSpeech(text, weather, duration) {
      const el = ensureSpeechEl();
      if (!el) {
        return false;
      }
      el.textContent = text;
      el.dataset.weather = weather;
      speechVisible = true;
      updateSpeechPosition();
      el.classList.add('is-visible');
      el.setAttribute('aria-hidden', 'false');
      if (speechTimer) {
        global.clearTimeout(speechTimer);
      }
      speechTimer = global.setTimeout(hideSpeech, duration);
      return true;
    }

    function talk() {
      const weatherForLine = targetWeather;
      talkClicks += 1;
      const easterEgg = talkClicks % TALK_EGG_EVERY === 0;
      let text;
      let lines = null;
      if (easterEgg) {
        lines = TALK_EGG.slice();
        text = TALK_EGG.join('\n');
      } else {
        const bank = TALK_LINES[weatherForLine] || TALK_LINES.sunny;
        const index = talkCursor[weatherForLine] % bank.length;
        text = bank[index];
        talkCursor[weatherForLine] = (index + 1) % bank.length;
      }
      const duration = easterEgg
        ? 9000
        : clamp(4200 + text.length * 80, 5200, 9000);
      showSpeech(text, weatherForLine, duration);
      soundscape.chime(weatherForLine, easterEgg);
      const detail = {
        text: text,
        weather: weatherForLine,
        clicks: talkClicks,
        easterEgg: easterEgg,
        lines: lines
      };
      if (typeof opts.onPersonTalk === 'function') {
        try {
          opts.onPersonTalk(detail);
        } catch (error) {
          if (typeof global.console !== 'undefined' && global.console.warn) {
            global.console.warn('[cabinScene] onPersonTalk 回调异常：', error);
          }
        }
      }
      return detail;
    }

    function personHitAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return false;
      }
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      camera.updateMatrixWorld();
      raycaster.setFromCamera(pointerNdc, camera);
      return raycaster.intersectObjects(personHitMeshes, false).length > 0;
    }

    function distanceToSegment(px, pz, ax, az, bx, bz) {
      const abx = bx - ax;
      const abz = bz - az;
      const apx = px - ax;
      const apz = pz - az;
      const lengthSq = abx * abx + abz * abz;
      const t = lengthSq > 0 ? clamp((apx * abx + apz * abz) / lengthSq, 0, 1) : 0;
      return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
    }

    function isPlaceable(x, z) {
      if (Math.hypot(x - 0.6, z - 2.2) > 9.4) {
        return false;
      }
      if (Math.hypot(x + 2.4, z + 2.9) < 3.1) {
        return false;
      }
      if (Math.hypot(x - 3.1, z - 3.9) < 1.65) {
        return false;
      }
      if (Math.hypot(x + 0.15, z - 6.15) < 1.15) {
        return false;
      }
      if (nearPath(x, z, 0.72)) {
        return false;
      }
      for (let i = 1; i < fencePosts.length; i += 1) {
        const a = fencePosts[i - 1];
        const b = fencePosts[i];
        if (distanceToSegment(x, z, a[0], a[1], b[0], b[1]) < 0.6) {
          return false;
        }
      }
      if (Math.hypot(x + 4.9, z - 4.25) < 1.25) {
        return false;
      }
      let blocked = false;
      for (let i = 0; i < pineData.length && !blocked; i += 1) {
        const tree = pineData[i];
        if (Math.hypot(x - tree.x, z - tree.z) < 0.72 * tree.s) {
          blocked = true;
        }
      }
      for (let i = 0; i < roundData.length && !blocked; i += 1) {
        const tree = roundData[i];
        if (Math.hypot(x - tree.x, z - tree.z) < 0.9 * tree.s) {
          blocked = true;
        }
      }
      if (blocked) {
        return false;
      }
      for (let i = 0; i < snowmen.length; i += 1) {
        if (Math.hypot(x - snowmen[i].x, z - snowmen[i].z) < 0.95) {
          return false;
        }
      }
      return true;
    }

    function raycastGround(clientX, clientY, out) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return false;
      }
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(groundMesh, false);
      if (!hits.length) {
        return false;
      }
      out.copy(hits[0].point);
      return true;
    }

    function emitSnowmanCount() {
      if (typeof opts.onSnowmanCountChange === 'function') {
        opts.onSnowmanCountChange(snowmen.length, MAX_SNOWMEN);
      }
    }

    function placeSnowman(x, z) {
      if (typeof x !== 'number' || typeof z !== 'number' || !isFinite(x) || !isFinite(z)) {
        return null;
      }
      if (targetWeather !== 'snow') {
        if (noticeHandler) {
          noticeHandler('还没下雪呢，等雪天再来堆雪人吧。');
        }
        return null;
      }
      if (snowmen.length >= MAX_SNOWMEN) {
        if (noticeHandler) {
          noticeHandler('空地已经站满 ' + MAX_SNOWMEN + ' 个雪人啦。');
        }
        return null;
      }
      if (!isPlaceable(x, z)) {
        return null;
      }
      const random = Math.abs(hash2(x + 12.3, z - 4.5));
      const rotation = (hash2(x * 0.9 + 2.1, z * 1.1 - 3.7) + 1) * Math.PI;
      const snowman = {
        id: 'snowman-' + (snowmanSerial += 1),
        x,
        z,
        groundY: terrainHeight(x, z) + 0.01,
        rotation,
        scale: 0.86 + random * 0.24,
        bornAt: clockTime
      };
      snowmen.push(snowman);
      refreshSnowmen();
      spawnPuffs(snowman.x, snowman.groundY, snowman.z);
      emitSnowmanCount();
      return { id: snowman.id, x: snowman.x, z: snowman.z, scale: snowman.scale };
    }

    function clearSnowmen() {
      if (snowmen.length === 0) {
        return;
      }
      snowmen.length = 0;
      refreshSnowmen();
      emitSnowmanCount();
    }

    function updateGhost(clientX, clientY) {
      if (targetWeather !== 'snow' || !pointerInside || pointerActive) {
        ghostGroup.visible = false;
        return;
      }
      if (!raycastGround(clientX, clientY, ghostPoint)) {
        ghostGroup.visible = false;
        return;
      }
      const valid = isPlaceable(ghostPoint.x, ghostPoint.z);
      ghostGroup.visible = true;
      ghostGroup.position.set(ghostPoint.x, ghostPoint.y + 0.015, ghostPoint.z);
      ghostGroup.rotation.y = clockTime * 0.22;
      ghostGroup.scale.setScalar(0.9 + Math.sin(clockTime * 2.2) * 0.018);
      const pulse = 0.34 + Math.sin(clockTime * 2.8) * 0.06;
      setSrgbHex(ghostMaterial.color, valid ? 0xffffff : 0xff8b78);
      ghostMaterial.opacity = valid ? pulse : 0.16;
      ghostRingMaterial.color.copy(ghostMaterial.color);
      ghostRingMaterial.opacity = valid ? 0.32 : 0.12;
    }

    function attemptPlaceAt(clientX, clientY) {
      if (targetWeather !== 'snow') {
        if (noticeHandler) {
          noticeHandler('只有雪天才能堆雪人，先切到下雪的天气吧。');
        }
        return null;
      }
      if (!raycastGround(clientX, clientY, ghostPoint)) {
        return null;
      }
      const result = placeSnowman(ghostPoint.x, ghostPoint.z);
      if (result) {
        if (noticeHandler) {
          noticeHandler('雪人堆好啦，围着它绕一圈看看。');
        }
      } else if (noticeHandler && snowmen.length < MAX_SNOWMEN) {
        noticeHandler('这块地方不太稳当，换个空地试试。');
      }
      return result;
    }

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }
      pointerActive = true;
      activePointerId = event.pointerId;
      pointerDownX = event.clientX;
      pointerDownY = event.clientY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      dragged = false;
      hoverClientX = event.clientX;
      hoverClientY = event.clientY;
      pointerInside = true;
      ghostGroup.visible = false;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        /* 某些浏览器不支持捕获，忽略即可 */
      }
    };

    const onPointerMove = (event) => {
      hoverClientX = event.clientX;
      hoverClientY = event.clientY;
      pointerInside = true;
      if (!pointerActive || event.pointerId !== activePointerId) {
        targetParallaxX = 0;
        const overPerson = personHitAt(event.clientX, event.clientY);
        if (overPerson !== personHovered) {
          personHovered = overPerson;
          canvas.style.cursor = overPerson ? 'pointer' : '';
        }
        return;
      }
      const totalDx = event.clientX - pointerDownX;
      const totalDy = event.clientY - pointerDownY;
      if (!dragged && Math.hypot(totalDx, totalDy) > 7) {
        dragged = true;
        canvas.style.cursor = '';
        personHovered = false;
      }
      if (dragged) {
        const dx = event.clientX - lastPointerX;
        const dy = event.clientY - lastPointerY;
        dragYaw += dx * 0.0052;
        dragPitch = clamp(dragPitch - dy * 0.0038, -0.2, 0.6);
      }
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    };

    const onPointerUp = (event) => {
      if (!pointerActive || (activePointerId !== null && event.pointerId !== activePointerId)) {
        return;
      }
      pointerActive = false;
      activePointerId = null;
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch (error) {
        /* 忽略 */
      }
      if (!dragged) {
        if (personHitAt(event.clientX, event.clientY)) {
          talk();
        } else {
          attemptPlaceAt(event.clientX, event.clientY);
        }
      }
      dragged = false;
      updateGhost(event.clientX, event.clientY);
    };

    const onPointerCancel = () => {
      pointerActive = false;
      activePointerId = null;
      dragged = false;
      ghostGroup.visible = false;
    };

    const onPointerEnter = (event) => {
      pointerInside = true;
      hoverClientX = event.clientX;
      hoverClientY = event.clientY;
    };

    const onPointerLeave = () => {
      pointerInside = false;
      ghostGroup.visible = false;
      targetParallaxX = 0;
      targetParallaxY = 0;
      if (personHovered) {
        personHovered = false;
        canvas.style.cursor = '';
      }
    };

    const onWheel = (event) => {
      event.preventDefault();
      targetRadius = clamp(
        targetRadius + event.deltaY * 0.012,
        baseRadius * fitScale * 0.58,
        baseRadius * fitScale * 1.45
      );
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('pointerenter', onPointerEnter);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    function updateCamera(dt) {
      const idleYaw =
        reducedMotion || pointerActive ? 0 : Math.sin(clockTime * 0.12) * 0.02;
      const rect = canvas.getBoundingClientRect();
      if (pointerInside && !pointerActive && rect.width > 0) {
        targetParallaxX = ((hoverClientX - rect.left) / rect.width - 0.5) * 0.055;
        targetParallaxY = ((hoverClientY - rect.top) / rect.height - 0.5) * 0.05;
      }
      parallaxX = damp(parallaxX, targetParallaxX, 3.2, dt);
      parallaxY = damp(parallaxY, targetParallaxY, 3.2, dt);
      const desiredYaw = baseYaw + dragYaw + idleYaw + parallaxX;
      const desiredPitch = clamp(basePitch + dragPitch + parallaxY, 0.1, 0.92);
      yaw = damp(yaw, desiredYaw, 6.5, dt);
      pitch = damp(pitch, desiredPitch, 6.5, dt);
      radius = damp(radius, targetRadius, 5.5, dt);
      const cosPitch = Math.cos(pitch);
      camera.position.set(
        cameraTarget.x + Math.sin(yaw) * cosPitch * radius,
        cameraTarget.y + Math.sin(pitch) * radius,
        cameraTarget.z + Math.cos(yaw) * cosPitch * radius
      );
      camera.lookAt(cameraTarget);
    }

    function updateIdleMotion() {
      if (reducedMotion) {
        return;
      }
      const breath = Math.sin(clockTime * 1.7);
      torso.scale.y = 1 + breath * 0.016;
      headGroup.rotation.z = Math.sin(clockTime * 0.55) * 0.035;
      headGroup.rotation.x = 0.28 + Math.sin(clockTime * 0.9 + 1.2) * 0.018;
      bookGroup.rotation.z = Math.sin(clockTime * 0.75) * 0.014;
      umbrellaGroup.rotation.z = -0.18 + Math.sin(clockTime * 1.15) * 0.025 * rainAmount;
      lanternSprite.material.opacity =
        (0.18 + state.numbers.lantern * 0.42) * (0.94 + Math.sin(clockTime * 3.7) * 0.06);
      cloudMesh.position.x = Math.sin(clockTime * 0.018) * 1.6;
      cloudMesh.position.y = Math.sin(clockTime * 0.05) * 0.12;
      motes.rotation.y = clockTime * 0.01;
    }

    /* ==================================================================
     * 自适应、主循环、公开 API
     * ================================================================== */

    const perfNow =
      global.performance && typeof global.performance.now === 'function'
        ? function () {
            return global.performance.now();
          }
        : function () {
            return Date.now();
          };
    const requestFrame = global.requestAnimationFrame
      ? global.requestAnimationFrame.bind(global)
      : function (callback) {
          return global.setTimeout(function () {
            callback(perfNow());
          }, 16);
        };
    const cancelFrame = global.cancelAnimationFrame
      ? global.cancelAnimationFrame.bind(global)
      : function (id) {
          global.clearTimeout(id);
        };

    let resizeObserver = null;
    let readyAnnounced = false;

    // 首帧渲染完就广播 ready；后台标签页 rAF 被暂停时 loader 也不会卡住。
    const announceReady = () => {
      if (readyAnnounced || disposed) {
        return;
      }
      readyAnnounced = true;
      emitSnowmanCount();
      if (typeof opts.onReady === 'function') {
        try {
          opts.onReady(getStats());
        } catch (error) {
          if (typeof global.console !== 'undefined' && global.console.warn) {
            global.console.warn('[cabinScene] onReady 回调异常：', error);
          }
        }
      }
    };

    const onWindowResize = () => {
      if (!disposed) {
        applySize();
      }
    };
    global.addEventListener('resize', onWindowResize);
    if (typeof global.ResizeObserver === 'function') {
      resizeObserver = new global.ResizeObserver(onWindowResize);
      resizeObserver.observe(canvas);
    }

    const onVisibilityChange = () => {
      lastFrame = perfNow();
    };
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    function onReducedChange(event) {
      if (opts.reducedMotion === undefined) {
        reducedMotion = !!event.matches;
      }
    }
    if (reducedQuery) {
      if (typeof reducedQuery.addEventListener === 'function') {
        reducedQuery.addEventListener('change', onReducedChange);
      } else if (typeof reducedQuery.addListener === 'function') {
        reducedQuery.addListener(onReducedChange);
      }
    }

    function getStats() {
      const sceneInfo = post.getSceneInfo();
      return {
        ready: ready,
        weather: targetWeather,
        fps: Math.round(fps * 10) / 10,
        snowmen: snowmen.length,
        maxSnowmen: MAX_SNOWMEN,
        snowCover: Math.round(snowCover * 100) / 100,
        triangles: sceneInfo.triangles,
        drawCalls: sceneInfo.calls,
        width: viewWidth,
        height: viewHeight,
        dpr: viewDpr,
        quality: lowQuality ? 'low' : 'auto',
        reducedMotion: reducedMotion
      };
    }

    function dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      ready = false;
      if (raf) {
        cancelFrame(raf);
        raf = 0;
      }
      global.removeEventListener('resize', onWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (reducedQuery) {
        if (typeof reducedQuery.removeEventListener === 'function') {
          reducedQuery.removeEventListener('change', onReducedChange);
        } else if (typeof reducedQuery.removeListener === 'function') {
          reducedQuery.removeListener(onReducedChange);
        }
      }
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerenter', onPointerEnter);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.style.touchAction = '';
      canvas.style.cursor = '';
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('pointerdown', onUserGesture, true);
        document.removeEventListener('keydown', onUserGesture, true);
      }
      hideSpeech();
      if (speechEl && speechEl.parentNode) {
        speechEl.parentNode.removeChild(speechEl);
      }
      speechEl = null;
      soundscape.dispose();

      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      scene.traverse((node) => {
        if (node.isInstancedMesh && typeof node.dispose === 'function') {
          node.dispose();
        }
        if (node.geometry) {
          geometries.add(node.geometry);
        }
        if (node.material) {
          const list = Array.isArray(node.material) ? node.material : [node.material];
          list.forEach((material) => {
            materials.add(material);
          });
        }
      });
      materials.forEach((material) => {
        Object.keys(material).forEach((key) => {
          const value = material[key];
          if (value && value.isTexture) {
            textures.add(value);
          }
        });
        if (typeof material.dispose === 'function') {
          material.dispose();
        }
      });
      geometries.forEach((geometry) => {
        if (typeof geometry.dispose === 'function') {
          geometry.dispose();
        }
      });
      textures.forEach((texture) => {
        if (typeof texture.dispose === 'function') {
          texture.dispose();
        }
      });
      post.dispose();
      if (typeof renderer.dispose === 'function') {
        renderer.dispose();
      }
      if (typeof opts.onDispose === 'function') {
        opts.onDispose();
      }
    }

    const postSunNdc = new THREE.Vector3();
    const cameraForward = new THREE.Vector3();
    function syncPostSun() {
      camera.updateMatrixWorld();
      postSunNdc.copy(state.sunDir).multiplyScalar(66).project(camera);
      camera.getWorldDirection(cameraForward);
      const facing = cameraForward.dot(state.sunDir) > 0.08;
      const x = postSunNdc.x * 0.5 + 0.5;
      const y = postSunNdc.y * 0.5 + 0.5;
      const edge = 1 - smoothstep(0.55, 1.7, Math.hypot((x - 0.5) * 2, (y - 0.5) * 2));
      post.setSun(x, y, facing ? clamp(edge, 0, 1) * clamp(state.numbers.sunGlow, 0, 1) : 0);
    }

    function updateScene(dt) {
      updateWeather(dt);
      updateIdleMotion();
      updateCamera(dt);
      updateSpeechPosition();
      syncPostSun();
      refreshSnowmen();
      updateSnowParticles(dt);
      updateRainParticles(dt);
      updateFireflies();
      updateButterflies();
      updateBirds();
      updatePuffs(dt);
      updateSmoke();
      updateGhost(hoverClientX, hoverClientY);
    }

    function frame(now) {
      if (disposed) {
        return;
      }
      raf = requestFrame(frame);
      let dt = (now - lastFrame) / 1000;
      if (!isFinite(dt) || dt <= 0) {
        dt = 0.016;
      }
      dt = Math.min(dt, 0.05);
      lastFrame = now;
      clockTime += dt;
      try {
        updateScene(dt);
        post.uniforms.uTime.value = clockTime;
        post.render(scene, camera);
      } catch (error) {
        disposed = true;
        if (typeof opts.onError === 'function') {
          opts.onError(error);
        }
        return;
      }

      fpsFrames += 1;
      if (now - fpsStamp >= 500) {
        fps = (fpsFrames * 1000) / (now - fpsStamp);
        fpsFrames = 0;
        fpsStamp = now;
      }

      if (!readyAnnounced) {
        announceReady();
      }
    }

    const api = {
      version: 'v02',
      setWeather: function (name) {
        return setWeather(name, false);
      },
      getWeather: function () {
        return targetWeather;
      },
      placeSnowman: function (x, z) {
        return placeSnowman(x, z);
      },
      clearSnowmen: clearSnowmen,
      getSnowmanCount: function () {
        return snowmen.length;
      },
      getSnowmen: function () {
        return snowmen.map((snowman) => ({
          id: snowman.id,
          x: snowman.x,
          z: snowman.z,
          scale: snowman.scale
        }));
      },
      getStats: getStats,
      isReady: function () {
        return ready;
      },
      // 对话：返回本次台词详情，同时弹出气泡、触发回调。
      talk: function () {
        return talk();
      },
      getTalkCount: function () {
        return talkClicks;
      },
      hideSpeech: hideSpeech,
      // 声音：引擎默认静音，由调用方决定是否开启；首次用户手势后真正出声。
      setSoundEnabled: function (value) {
        return soundscape.setEnabled(value);
      },
      toggleSound: function () {
        return soundscape.setEnabled(!soundscape.isEnabled());
      },
      isSoundEnabled: function () {
        return soundscape.isEnabled();
      },
      setVolume: function (value) {
        return soundscape.setVolume(value);
      },
      getAudioState: function () {
        return soundscape.getState();
      },
      // 验收辅助：后台标签页 rAF 被暂停时，也能手动推进动画再取帧。
      advance: function (seconds) {
        const total = clamp(Number(seconds) || 0, 0, 10);
        const steps = Math.max(1, Math.round(total * 30));
        const step = total / steps;
        for (let i = 0; i < steps; i += 1) {
          clockTime += step;
          updateScene(step);
        }
        post.uniforms.uTime.value = clockTime;
        post.render(scene, camera);
        return getStats();
      },
      // 验收/截图辅助：同帧渲染后取 data URL。需要渲染器开启 preserveDrawingBuffer。
      captureFrame: function (type) {
        post.uniforms.uTime.value = clockTime;
        post.render(scene, camera);
        try {
          return canvas.toDataURL(type === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
        } catch (error) {
          return null;
        }
      },
      dispose: dispose
    };

    /* --- 启动 ------------------------------------------------------ */
    if (legacyColorMode !== null) {
      colorManagement.legacyMode = legacyColorMode;
    }
    applySize();
    const initialWeather =
      opts.weather && WEATHERS.indexOf(opts.weather) !== -1 ? opts.weather : 'sunny';
    setWeather(initialWeather, true);
    updateCamera(1);
    fpsStamp = perfNow();
    lastFrame = fpsStamp;
    try {
      post.render(scene, camera);
      ready = true;
    } catch (error) {
      if (typeof opts.onError === 'function') {
        opts.onError(error);
      }
      throw error;
    }
    // 放到下一轮事件循环，确保调用方已经拿到 createCabinScene 的返回值。
    global.setTimeout(announceReady, 0);
    raf = requestFrame(frame);

    return api;
  }

  global.CabinSceneEngine = {
    createCabinScene: createCabinScene,
    WEATHERS: WEATHERS,
    MAX_SNOWMEN: MAX_SNOWMEN,
    TALK_EGG_EVERY: TALK_EGG_EVERY,
    VERSION: 'v02-2026-10-29'
  };
})(typeof window !== 'undefined' ? window : globalThis);
