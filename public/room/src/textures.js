/* 窗畔 · 程序化材质：所有贴图均在运行时绘制，无外部图片依赖 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function shade(hex, amt) {
    const c = hexToRgb(hex);
    const f = (v) => U.clamp(Math.round(v + amt), 0, 255);
    return 'rgb(' + f(c.r) + ',' + f(c.g) + ',' + f(c.b) + ')';
  }

  const T = {};

  /* —— 墙面：暖米色灰泥，只保留大尺度斑驳，避免细高频纹样产生摩尔纹 —— */
  T.wall = function (seed) {
    const w = 1024, h = 1024;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const noise = U.makeNoise2D(seed || 11, 64);
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        /* 两个很慢的 fbm 叠加 = 抹灰的手工不均；没有 1px 颗粒，远处不会闪 */
        const n = noise.fbm(x / 210, y / 210, 4);
        const m = noise.fbm(x / 64 + 17.3, y / 64 + 8.1, 3);
        const v = 207 + (n - 0.5) * 13 + (m - 0.5) * 4;
        const i = (y * w + x) * 4;
        img.data[i] = v + 6;
        img.data[i + 1] = v - 2;
        img.data[i + 2] = v - 16;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    /* 几片很淡的旧痕，全部是大笔触 */
    const rng = U.mulberry32((seed || 11) + 91);
    for (let i = 0; i < 18; i++) {
      const x = rng() * w, y = rng() * h, r = 70 + rng() * 150;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, i % 2 ? 'rgba(150,128,98,0.035)' : 'rgba(255,248,232,0.04)');
      g.addColorStop(1, 'rgba(150,128,98,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return U.canvasTexture(c, { repeat: [2, 1.15], aniso: 16 });
  };

  /* —— 木纹：胡桃木 / 橡木 / 深棕 —— */
  T.wood = function (opts) {
    opts = opts || {};
    const w = opts.w || 512, h = opts.h || 512;
    const base = opts.base || '#6b4327';
    const light = opts.light || '#a57348';
    const dark = opts.dark || '#3b2314';
    const rng = U.mulberry32(opts.seed || 19);
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, shade(base, 12));
    g.addColorStop(0.5, shade(base, -8));
    g.addColorStop(1, shade(base, 6));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const noise = U.makeNoise2D((opts.seed || 19) + 5, 32);
    for (let k = 0; k < 90; k++) {
      const y0 = rng() * h;
      const amp = 2 + rng() * 14;
      const freq = 0.004 + rng() * 0.012;
      const phase = rng() * Math.PI * 2;
      ctx.beginPath();
      for (let x = -10; x <= w + 10; x += 6) {
        const n = noise(x / 70 + k * 0.13, y0 / 80, 2);
        const y = y0 + Math.sin(x * freq + phase) * amp * 0.35 + (n - 0.5) * amp * 1.4;
        if (x === -10) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = k % 7 === 0 ? shade(light, 8) : (k % 5 === 0 ? shade(dark, 10) : dark);
      ctx.globalAlpha = k % 7 === 0 ? 0.12 : 0.06 + rng() * 0.08;
      ctx.lineWidth = k % 9 === 0 ? 2.2 : 0.6 + rng() * 1.3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 木节
    const knots = opts.knots === undefined ? 2 : opts.knots;
    for (let k = 0; k < knots; k++) {
      const x = 60 + rng() * (w - 120);
      const y = 60 + rng() * (h - 120);
      const r = 5 + rng() * 12;
      for (let j = 0; j < 8; j++) {
        ctx.beginPath();
        ctx.ellipse(x, y, r + j * 3.4, (r + j * 3.4) * 0.5, rng() * 3, 0, Math.PI * 2);
        ctx.strokeStyle = j % 2 ? dark : light;
        ctx.globalAlpha = 0.1;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    U.grain(ctx, w, h, 10, 1, 8);
    return U.canvasTexture(c, { repeat: opts.repeat || [1, 1], aniso: 8 });
  };

  /* —— 地板：长条橡木拼板 —— */
  T.floor = function () {
    const w = 1024, h = 1024;
    const rng = U.mulberry32(41);
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#2d1d12';
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    const noise = U.makeNoise2D(77, 64);
    for (let r = 0; r < rows; r++) {
      let x = -rng() * 380;
      while (x < w) {
        const pw = 260 + rng() * 430;
        const tone = 25 + rng() * 38;
        const base = 'rgb(' + Math.round(100 + tone) + ',' + Math.round(67 + tone * 0.64) + ',' + Math.round(40 + tone * 0.42) + ')';
        ctx.fillStyle = base;
        ctx.fillRect(x + 1.2, r * rh + 1.4, pw - 2.4, rh - 2.8);
        // 板面明暗与木纹
        const gg = ctx.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
        gg.addColorStop(0, 'rgba(255,236,198,0.075)');
        gg.addColorStop(0.35, 'rgba(255,220,170,0.02)');
        gg.addColorStop(1, 'rgba(25,12,4,0.14)');
        ctx.fillStyle = gg;
        ctx.fillRect(x + 1.2, r * rh + 1.4, pw - 2.4, rh - 2.8);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1.2, r * rh + 1.4, pw - 2.4, rh - 2.8);
        ctx.clip();
        for (let k = 0; k < 14; k++) {
          const yy = r * rh + 6 + rng() * (rh - 12);
          const amp = 1 + rng() * 5;
          ctx.beginPath();
          for (let xx = x; xx < x + pw; xx += 8) {
            const n = noise(xx / 44 + k, yy / 55, 2);
            const y2 = yy + Math.sin(xx * 0.014 + k) * amp * 0.35 + (n - 0.5) * amp;
            if (xx === x) ctx.moveTo(xx, y2);
            else ctx.lineTo(xx, y2);
          }
          ctx.strokeStyle = rng() > 0.6 ? 'rgba(238,198,142,0.16)' : 'rgba(42,24,12,0.18)';
          ctx.lineWidth = 0.5 + rng() * 1.1;
          ctx.stroke();
        }
        ctx.restore();
        // 拼缝高光
        ctx.fillStyle = 'rgba(255,232,196,0.055)';
        ctx.fillRect(x + 1.2, r * rh + 1.4, pw - 2.4, 1.2);
        ctx.fillStyle = 'rgba(15,8,3,0.38)';
        ctx.fillRect(x + pw - 1.5, r * rh + 1.4, 1.5, rh - 2.8);
        x += pw;
      }
    }
    U.grain(ctx, w, h, 9, 1, 12);
    const tex = U.canvasTexture(c, { repeat: [2.6, 2.6], aniso: 16 });
    return tex;
  };

  /* —— 亚麻织物 —— */
  T.linen = function (seed) {
    const s = 256;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(seed || 5);
    ctx.fillStyle = '#e9e2d2';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 3) {
      ctx.fillStyle = i % 6 ? 'rgba(255,255,255,0.065)' : 'rgba(130,112,88,0.06)';
      ctx.fillRect(0, i, s, 1);
      ctx.fillStyle = i % 6 ? 'rgba(120,102,78,0.035)' : 'rgba(255,255,255,0.055)';
      ctx.fillRect(i, 0, 1, s);
    }
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(93,77,55,0.075)';
      ctx.fillRect(rng() * s, rng() * s, 1 + rng() * 1.4, 1 + rng() * 1.4);
    }
    U.grain(ctx, s, s, 8, 1, 9);
    return U.canvasTexture(c, { repeat: [3, 3], aniso: 8 });
  };

  /* —— 地毯：波斯风格，镜像纹样 —— */
  T.rug = function () {
    const w = 1100, h = 780;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(123);
    const rust = '#6e332b';
    const rust2 = '#854339';
    const ink = '#26383a';
    const sand = '#cdb894';
    const gold = '#b6874d';
    ctx.fillStyle = rust;
    ctx.fillRect(0, 0, w, h);

    // 底色的大块洗色（abrash）
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(142,73,58,0.16)' : 'rgba(49,25,22,0.10)';
      ctx.fillRect(0, rng() * h, w, 8 + rng() * 30);
    }

    function diamond(x, y, rx, ry, fill, stroke, lw) {
      ctx.beginPath();
      ctx.moveTo(x, y - ry);
      ctx.lineTo(x + rx, y);
      ctx.lineTo(x, y + ry);
      ctx.lineTo(x - rx, y);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
    }

    // 外边框
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rust2;
    ctx.fillRect(26, 26, w - 52, h - 52);
    ctx.strokeStyle = sand;
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 44, w - 88, h - 88);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(58, 58, w - 116, h - 116);

    // 边框中的菱形链
    const step = 64;
    for (let x = 76; x < w - 60; x += step) {
      diamond(x + step / 3, 36, 13, 13, gold, null);
      diamond(x + step / 3, h - 36, 13, 13, gold, null);
    }
    for (let y = 76; y < h - 60; y += step) {
      diamond(36, y + step / 3, 13, 13, gold, null);
      diamond(w - 36, y + step / 3, 13, 13, gold, null);
    }

    // 内场
    ctx.fillStyle = rust;
    ctx.fillRect(76, 76, w - 152, h - 152);
    ctx.strokeStyle = 'rgba(205,184,148,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(76, 76, w - 152, h - 152);

    // 角落纹样（四分之一花窗）
    function corner(cx, cy, sx, sy) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.strokeStyle = sand;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(70, 70, 26 + i * 20, Math.PI, Math.PI * 1.5);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        diamond(30 + i * 14, 30 + i * 14, 4, 4, gold, null);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    corner(76, 76, 1, 1);
    corner(w - 76, 76, -1, 1);
    corner(76, h - 76, 1, -1);
    corner(w - 76, h - 76, -1, -1);

    // 散布的小纹样
    for (let y = 130; y < h - 120; y += 92) {
      for (let x = 130; x < w - 120; x += 92) {
        const dx = Math.abs(x - w / 2);
        const dy = Math.abs(y - h / 2);
        if (dx < 190 && dy < 150) continue;
        diamond(x, y, 11, 16, null, 'rgba(205,184,148,0.55)', 1.3);
        diamond(x, y, 4, 6, gold, null);
      }
    }

    // 中央勋章
    const cx = w / 2, cy = h / 2;
    diamond(cx, cy, 270, 205, ink, sand, 3);
    diamond(cx, cy, 245, 183, rust2, gold, 2);
    diamond(cx, cy, 205, 148, ink, null);
    diamond(cx, cy, 180, 126, sand, null);
    diamond(cx, cy, 151, 102, ink, gold, 2);
    diamond(cx, cy, 114, 74, rust, sand, 2);
    diamond(cx, cy, 76, 46, sand, null);
    diamond(cx, cy, 40, 24, ink, gold, 2);
    // 勋章内的枝蔓
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 28);
      ctx.quadraticCurveTo(cx + Math.cos(a + 0.4) * 100, cy + Math.sin(a + 0.4) * 58,
        cx + Math.cos(a + 0.16) * 148, cy + Math.sin(a + 0.16) * 82);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a + 0.4) * 108, cy + Math.sin(a + 0.4) * 62, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
    }
    for (let i = 0; i < 24; i++) {
      const a = rng() * Math.PI * 2;
      const rr = rng();
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 160 * rr, cy + Math.sin(a) * 100 * rr, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(205,184,148,0.5)';
      ctx.fill();
    }

    // 磨损与绒面质感
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 110; i++) {
      ctx.beginPath();
      ctx.ellipse(rng() * w, rng() * h, 8 + rng() * 55, 3 + rng() * 16, rng() * 3, 0, Math.PI * 2);
      ctx.fillStyle = rng() > 0.5 ? '#e4d4b6' : '#2b1815';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    U.grain(ctx, w, h, 17, 1, 33);
    return U.canvasTexture(c, { clamp: true, aniso: 8 });
  };

  /* —— 砖墙 —— */
  T.brick = function (opts) {
    opts = opts || {};
    const w = 512, h = 512;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(opts.seed || 22);
    const mortar = opts.mortar || '#b8a992';
    const palettes = opts.palette || ['#8f5c47', '#9b6850', '#7e4e3d', '#a8765a', '#84543f'];
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, w, h);
    const bw = opts.bw || 64, bh = opts.bh || 26, gap = 3;
    for (let row = 0; row < h / bh; row++) {
      const off = row % 2 ? -bw / 2 : 0;
      for (let col = -1; col < w / bw + 1; col++) {
        const x = col * bw + off + gap;
        const y = row * bh + gap;
        ctx.fillStyle = shade(palettes[Math.floor(rng() * palettes.length)], (rng() - 0.5) * 20);
        ctx.fillRect(x, y, bw - gap * 2, bh - gap * 2);
        ctx.fillStyle = 'rgba(255,235,210,0.055)';
        ctx.fillRect(x, y, bw - gap * 2, 1.2);
        ctx.fillStyle = 'rgba(20,10,6,0.12)';
        ctx.fillRect(x, y + bh - gap * 2 - 1.2, bw - gap * 2, 1.2);
        // 砖面污渍
        if (rng() > 0.55) {
          ctx.fillStyle = 'rgba(30,20,14,0.08)';
          ctx.fillRect(x + rng() * 20, y + rng() * 8, 10 + rng() * 28, 4 + rng() * 10);
        }
      }
    }
    // 整体雨渍
    for (let i = 0; i < 18; i++) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(30,25,20,0.10)');
      g.addColorStop(1, 'rgba(30,25,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rng() * w, 0, 4 + rng() * 26, h * (0.2 + rng() * 0.7));
    }
    U.grain(ctx, w, h, 16, 1, 21);
    return U.canvasTexture(c, { repeat: opts.repeat || [1, 1], aniso: 8 });
  };

  /* —— 石块 / 石灰墙 —— */
  T.stone = function (opts) {
    opts = opts || {};
    const w = 512, h = 512;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const noise = U.makeNoise2D(opts.seed || 55, 48);
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = noise.fbm(x / 80, y / 80, 4);
        const v = 172 + n * 32;
        const i = (y * w + x) * 4;
        img.data[i] = v + 10;
        img.data[i + 1] = v + 3;
        img.data[i + 2] = v - 8;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // 水平砌缝
    const rows = 7;
    for (let i = 1; i < rows; i++) {
      const y = (h / rows) * i + (Math.sin(i * 7.1) * 2);
      ctx.strokeStyle = 'rgba(66,57,48,0.20)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    U.grain(ctx, w, h, 12, 1, 5);
    return U.canvasTexture(c, { repeat: opts.repeat || [1, 1], aniso: 8 });
  };

  /* —— 沥青 —— */
  T.asphalt = function () {
    const w = 512, h = 512;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const noise = U.makeNoise2D(87, 32);
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = noise.fbm(x / 40, y / 40, 5);
        const v = 34 + n * 22;
        const i = (y * w + x) * 4;
        img.data[i] = v + 2;
        img.data[i + 1] = v + 3;
        img.data[i + 2] = v + 6;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const rng = U.mulberry32(3);
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(190,185,170,0.11)' : 'rgba(10,10,12,0.2)';
      const s = rng() * 1.7 + 0.4;
      ctx.fillRect(rng() * w, rng() * h, s, s);
    }
    // 裂缝
    for (let k = 0; k < 5; k++) {
      let x = rng() * w, y = rng() * h;
      ctx.strokeStyle = 'rgba(8,8,9,0.35)';
      ctx.lineWidth = 1 + rng();
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let i = 0; i < 24; i++) {
        x += (rng() - 0.5) * 30;
        y += (rng() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    U.grain(ctx, w, h, 12, 1, 17);
    return U.canvasTexture(c, { repeat: [5, 5], aniso: 16 });
  };

  /* —— 人行道石板 —— */
  T.sidewalk = function () {
    const s = 512;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(66);
    ctx.fillStyle = '#5d5a53';
    ctx.fillRect(0, 0, s, s);
    const cells = 4;
    const cs = s / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const v = 128 + rng() * 24;
        ctx.fillStyle = 'rgb(' + (v + 6) + ',' + (v + 2) + ',' + (v - 8) + ')';
        ctx.fillRect(x * cs + 3, y * cs + 3, cs - 6, cs - 6);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x * cs + 3, y * cs + 3, cs - 6, 1.5);
        ctx.fillStyle = 'rgba(20,18,14,0.10)';
        ctx.fillRect(x * cs + 3, y * cs + cs - 4.5, cs - 6, 1.5);
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = rng() > 0.5 ? 'rgba(30,28,24,0.12)' : 'rgba(230,225,210,0.06)';
          ctx.fillRect(x * cs + 4 + rng() * (cs - 8), y * cs + 4 + rng() * (cs - 8), 1 + rng() * 3, 1 + rng() * 3);
        }
      }
    }
    U.grain(ctx, s, s, 12, 1, 24);
    return U.canvasTexture(c, { repeat: [6, 6], aniso: 8 });
  };

  /* —— 布料（窗帘、抱枕）：基础白，便于材质染色 —— */
  T.cloth = function (seed) {
    const s = 256;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(seed || 4);
    ctx.fillStyle = '#e7e0d1';
    ctx.fillRect(0, 0, s, s);
    /* 4px 一组的松弛经纬，对比度压到极低；2px 的细密纹在斜视时最容易起摩尔纹 */
    for (let y = 0; y < s; y += 4) {
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(0, y, s, 1);
      ctx.fillStyle = 'rgba(90,76,58,0.03)';
      ctx.fillRect(0, y + 2, s, 1);
    }
    for (let x = 0; x < s; x += 4) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(x, 0, 1, s);
    }
    /* 少量粗节，模拟亚麻的竹节纱 */
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,250,235,0.07)' : 'rgba(86,70,52,0.05)';
      ctx.fillRect(rng() * s, rng() * s, 2 + rng() * 5, 2 + rng() * 4);
    }
    return U.canvasTexture(c, { repeat: [2, 3], aniso: 8 });
  };

  /* —— 画作：三幅手绘风景 —— */
  T.painting = function (index) {
    const w = 480, h = 360;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(100 + index * 37);

    function paintBg(top, bottom) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    if (index === 0) {
      // 黄昏的河岸
      paintBg('#5b6a72', '#e0a06c');
      ctx.fillStyle = '#f6d49e';
      ctx.beginPath();
      ctx.arc(w * 0.68, h * 0.43, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(36,48,54,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.64);
      ctx.quadraticCurveTo(w * 0.2, h * 0.56, w * 0.36, h * 0.66);
      ctx.quadraticCurveTo(w * 0.55, h * 0.73, w, h * 0.6);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = 'rgba(20,28,32,0.9)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.76);
      ctx.quadraticCurveTo(w * 0.4, h * 0.68, w, h * 0.8);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = 'rgba(240,196,132,0.5)';
      for (let i = 0; i < 24; i++) {
        ctx.fillRect(w * 0.3 + rng() * w * 0.4, h * 0.82 + rng() * h * 0.12, 20 + rng() * 60, 1.5);
      }
    } else if (index === 1) {
      // 雨夜街角
      paintBg('#1d2a33', '#4b5659');
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = 'rgba(180,200,208,0.16)';
        ctx.lineWidth = 1;
        const x = rng() * w;
        ctx.beginPath();
        ctx.moveTo(x, rng() * h * 0.7);
        ctx.lineTo(x - 12, rng() * h * 0.4 + h * 0.2);
        ctx.stroke();
      }
      ctx.fillStyle = '#26343b';
      ctx.fillRect(w * 0.08, h * 0.2, w * 0.34, h * 0.62);
      ctx.fillStyle = '#1c282e';
      ctx.fillRect(w * 0.58, h * 0.32, w * 0.3, h * 0.5);
      ctx.fillStyle = 'rgba(242,184,104,0.9)';
      ctx.fillRect(w * 0.16, h * 0.32, w * 0.1, h * 0.12);
      ctx.fillStyle = 'rgba(242,184,104,0.3)';
      ctx.fillRect(w * 0.14, h * 0.3, w * 0.14, h * 0.17);
      ctx.fillStyle = 'rgba(234,168,92,0.85)';
      ctx.beginPath();
      ctx.arc(w * 0.66, h * 0.55, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(240,190,120,0.18)';
      ctx.beginPath();
      ctx.arc(w * 0.66, h * 0.55, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(12,16,18,0.7)';
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillStyle = 'rgba(208,166,108,0.28)';
      for (let i = 0; i < 18; i++) {
        ctx.fillRect(w * 0.55 + rng() * w * 0.2, h * 0.73 + rng() * h * 0.2, 3, 12 + rng() * 30);
      }
    } else {
      // 雾中群山
      paintBg('#b9c3c2', '#e3ddd0');
      ctx.fillStyle = 'rgba(92,110,112,0.45)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      ctx.lineTo(w * 0.2, h * 0.32);
      ctx.lineTo(w * 0.38, h * 0.58);
      ctx.lineTo(w * 0.55, h * 0.4);
      ctx.lineTo(w * 0.78, h * 0.65);
      ctx.lineTo(w, h * 0.52);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = 'rgba(42,58,58,0.7)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.74);
      ctx.lineTo(w * 0.26, h * 0.52);
      ctx.lineTo(w * 0.5, h * 0.76);
      ctx.lineTo(w * 0.72, h * 0.6);
      ctx.lineTo(w, h * 0.8);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = 'rgba(245,243,235,0.55)';
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.ellipse(rng() * w, h * (0.5 + rng() * 0.28), 60 + rng() * 100, 10 + rng() * 25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 画布纹理与笔触
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,246,230,0.035)' : 'rgba(25,22,18,0.03)';
      ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 8, 1 + rng() * 2);
    }
    U.grain(ctx, w, h, 10, 1, index + 4);
    return U.canvasTexture(c, { clamp: true, aniso: 4 });
  };

  /* —— 书脊 —— */
  T.bookSpines = function (count, seed) {
    const rng = U.mulberry32(seed || 31);
    const palettes = [
      ['#3f4d3f', '#c9b078'], ['#5a2e2b', '#d0b58a'], ['#26384a', '#b59a62'],
      ['#6b5235', '#e0c796'], ['#7b3b32', '#d6b37a'], ['#3d3b34', '#c2a878'],
      ['#78563f', '#dfc59a'], ['#2f4b4a', '#cdb587'], ['#8a6a44', '#f0d9ab'],
      ['#4a2d3a', '#cbb088'], ['#31465b', '#c2a06c'], ['#5d5a3c', '#d8c090']
    ];
    const list = [];
    for (let i = 0; i < count; i++) {
      const c = U.makeCanvas(64, 256);
      const ctx = c.getContext('2d');
      const p = palettes[Math.floor(rng() * palettes.length)];
      ctx.fillStyle = p[0];
      ctx.fillRect(0, 0, 64, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, 3, 256);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(61, 0, 3, 256);
      ctx.strokeStyle = p[1];
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 22);
      ctx.lineTo(50, 22);
      ctx.moveTo(14, 234);
      ctx.lineTo(50, 234);
      ctx.stroke();
      // 书名线条
      const lines = 2 + Math.floor(rng() * 3);
      ctx.fillStyle = p[1];
      for (let l = 0; l < lines; l++) {
        const ww = 18 + rng() * 26;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(32 - ww / 2, 66 + l * 22, ww, 4);
      }
      // 烫金小装饰
      if (rng() > 0.4) {
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(32, 190, 8, 0, Math.PI * 2);
        ctx.strokeStyle = p[1];
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      U.grain(ctx, 64, 256, 8, 1, i + 12);
      list.push(U.canvasTexture(c, { clamp: true, aniso: 4 }));
    }
    return list;
  };

  /* —— 咖啡馆内景（街对面） —— */
  T.cafe = function () {
    const w = 512, h = 384;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(w * 0.5, h * 0.6, 30, w * 0.5, h * 0.6, w * 0.75);
    g.addColorStop(0, '#e7b473');
    g.addColorStop(0.55, '#9c6a3f');
    g.addColorStop(1, '#2f2119');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 后墙与货架
    ctx.fillStyle = 'rgba(52,33,23,0.72)';
    ctx.fillRect(0, h * 0.18, w, h * 0.42);
    ctx.fillStyle = 'rgba(221,178,113,0.5)';
    for (let s = 0; s < 3; s++) {
      ctx.fillRect(w * 0.1, h * (0.24 + s * 0.09), w * 0.34, 3);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = ['rgba(208,158,96,0.8)', 'rgba(120,90,58,0.9)', 'rgba(232,197,142,0.6)'][i % 3];
        ctx.fillRect(w * 0.12 + i * 21, h * (0.24 + s * 0.09) - 16, 10, 15);
      }
    }
    // 咖啡吧台与咖啡机
    ctx.fillStyle = '#3a2a20';
    ctx.fillRect(w * 0.56, h * 0.44, w * 0.38, h * 0.34);
    ctx.fillStyle = '#b8793e';
    ctx.fillRect(w * 0.6, h * 0.36, w * 0.13, h * 0.1);
    ctx.fillStyle = '#d6b385';
    ctx.fillRect(w * 0.76, h * 0.4, w * 0.12, h * 0.06);
    // 人和杯子
    ctx.fillStyle = 'rgba(28,20,16,0.9)';
    ctx.beginPath();
    ctx.ellipse(w * 0.68, h * 0.28, 23, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.68, h * 0.48, 48, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240,204,147,0.5)';
    for (let i = 0; i < 6; i++) {
      const x = w * 0.3 + i * 40;
      ctx.fillRect(x, h * 0.56, 3, h * 0.16);
      ctx.beginPath();
      ctx.arc(x + 1, h * 0.56, 15, 0, Math.PI);
      ctx.fillStyle = 'rgba(247,205,132,0.75)';
      ctx.fill();
      ctx.fillStyle = 'rgba(240,204,147,0.5)';
    }
    // 吊灯
    for (let i = 0; i < 3; i++) {
      const x = w * (0.25 + i * 0.25);
      ctx.strokeStyle = 'rgba(15,10,8,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h * 0.12);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,214,146,0.95)';
      ctx.beginPath();
      ctx.arc(x, h * 0.15, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,196,112,0.18)';
      ctx.beginPath();
      ctx.arc(x, h * 0.16, 50, 0, Math.PI * 2);
      ctx.fill();
    }
    // 玻璃反光
    const gl = ctx.createLinearGradient(0, 0, w, h);
    gl.addColorStop(0, 'rgba(255,240,215,0.12)');
    gl.addColorStop(0.4, 'rgba(255,240,215,0)');
    gl.addColorStop(0.75, 'rgba(255,230,190,0.06)');
    gl.addColorStop(1, 'rgba(255,240,215,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, w, h);
    U.grain(ctx, w, h, 10, 1, 8);
    return U.canvasTexture(c, { clamp: true, aniso: 8 });
  };

  /* —— 对面住宅窗户（暖光 + 窗帘 + 剪影） —— */
  T.apartmentWindow = function (variant) {
    const w = 256, h = 320;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(300 + variant * 17);
    const warm = variant % 3 !== 2;
    if (warm) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, variant % 2 ? '#e3ad6d' : '#d99c60');
      g.addColorStop(0.65, '#a06a3f');
      g.addColorStop(1, '#4b3222');
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2c3a42');
      g.addColorStop(1, '#121a1f');
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, w, h);
    // 窗帘
    if (variant % 2 === 0) {
      ctx.fillStyle = 'rgba(30,24,20,0.36)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.28, 0);
      ctx.quadraticCurveTo(w * 0.2, h * 0.45, w * 0.3, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w * 0.78, 0);
      ctx.quadraticCurveTo(w * 0.84, h * 0.45, w * 0.74, h);
      ctx.lineTo(w, h);
      ctx.fill();
    }
    // 室内剪影
    ctx.fillStyle = 'rgba(28,20,15,0.55)';
    if (variant % 3 === 0) {
      ctx.fillRect(w * 0.16, h * 0.7, w * 0.2, h * 0.3);
      ctx.fillRect(w * 0.55, h * 0.62, w * 0.08, h * 0.38);
      ctx.beginPath();
      ctx.ellipse(w * 0.62, h * 0.6, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (variant % 3 === 1) {
      // 窗台上的猫
      ctx.beginPath();
      ctx.ellipse(w * 0.68, h * 0.82, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.68, h * 0.75, 12, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(w * 0.22, h * 0.76, w * 0.5, h * 0.24);
    }
    // 窗框
    ctx.strokeStyle = 'rgba(18,14,10,0.9)';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w / 2, 6);
    ctx.lineTo(w / 2, h - 6);
    ctx.moveTo(6, h / 2);
    ctx.lineTo(w - 6, h / 2);
    ctx.stroke();
    // 玻璃反光
    ctx.fillStyle = 'rgba(255,235,205,0.06)';
    ctx.beginPath();
    ctx.moveTo(10, h * 0.2);
    ctx.lineTo(w * 0.5, 10);
    ctx.lineTo(w * 0.72, 10);
    ctx.lineTo(10, h * 0.5);
    ctx.fill();
    U.grain(ctx, w, h, 9, 1, variant + 2);
    return U.canvasTexture(c, { clamp: true, aniso: 8 });
  };

  /* —— 叶片（用于树冠/盆栽） —— */
  T.leaf = function (tone) {
    const s = 128;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, s, s);
    const g = ctx.createLinearGradient(0, 0, s, s);
    if (tone === 'dark') {
      g.addColorStop(0, '#3d553c');
      g.addColorStop(1, '#17271b');
    } else if (tone === 'autumn') {
      g.addColorStop(0, '#c0803b');
      g.addColorStop(1, '#6b3f1f');
    } else {
      g.addColorStop(0, '#789066');
      g.addColorStop(1, '#33492f');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(64, 8);
    ctx.bezierCurveTo(114, 30, 112, 92, 64, 122);
    ctx.bezierCurveTo(16, 92, 14, 30, 64, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,230,190,0.35)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(64, 14);
    ctx.lineTo(64, 118);
    ctx.stroke();
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(64, 20 + i * 16);
      ctx.lineTo(64 - 24 + i * 2, 32 + i * 16);
      ctx.moveTo(64, 20 + i * 16);
      ctx.lineTo(64 + 24 - i * 2, 32 + i * 16);
      ctx.stroke();
    }
    return U.canvasTexture(c, { clamp: true, srgb: true });
  };

  /* —— 窗户上的雨痕：细腻的法线/遮罩贴图 —— */
  T.rainGlass = function () {
    const size = 512;
    const c = U.makeCanvas(size, size);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(202);
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 420; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const r = 1 + rng() * 4.2;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.72)');
      g.addColorStop(0.55, 'rgba(220,235,240,0.22)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.8 + rng() * 1.8), 0, 0, Math.PI * 2);
      ctx.fill();
      if (rng() > 0.55) {
        ctx.strokeStyle = 'rgba(230,242,246,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.lineTo(x + (rng() - 0.5) * 3, y + r + 20 + rng() * 70);
        ctx.stroke();
      }
    }
    return U.canvasTexture(c, { clamp: true, aniso: 4 });
  };

  /* —— 云 —— */
  T.cloud = function () {
    const s = 256;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(90);
    ctx.clearRect(0, 0, s, s);
    for (let i = 0; i < 16; i++) {
      const x = s * (0.2 + rng() * 0.6);
      const y = s * (0.35 + rng() * 0.3);
      const r = s * (0.12 + rng() * 0.22);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.20)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.08)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return U.canvasTexture(c, { clamp: true, aniso: 2 });
  };

  /* —— 信纸 / 书页 —— */
  T.paper = function (opts) {
    opts = opts || {};
    const w = 512, h = 256;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(opts.seed || 10);
    ctx.fillStyle = opts.bg || '#efe6d2';
    ctx.fillRect(0, 0, w, h);
    if (opts.staff) {
      ctx.strokeStyle = 'rgba(70,60,45,0.35)';
      ctx.lineWidth = 1;
      const groups = 4;
      for (let gI = 0; gI < groups; gI++) {
        const top = 36 + gI * 46;
        for (let l = 0; l < 5; l++) {
          ctx.beginPath();
          ctx.moveTo(38, top + l * 6);
          ctx.lineTo(w - 38, top + l * 6);
          ctx.stroke();
        }
        for (let n = 0; n < 9; n++) {
          const x = 56 + n * 42 + rng() * 12;
          const y = top + Math.floor(rng() * 5) * 6;
          ctx.fillStyle = 'rgba(50,40,30,0.75)';
          ctx.beginPath();
          ctx.ellipse(x, y, 3.4, 2.4, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x + 2.7, y - 16, 1, 16);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(60,50,40,0.55)';
      for (let l = 0; l < 13; l++) {
        const y = 30 + l * 16;
        const margin = l % 5 === 4 ? 120 : 34;
        ctx.fillRect(34, y, w - margin * 1.1, 1.4);
      }
      ctx.fillStyle = 'rgba(150,80,52,0.55)';
      ctx.fillRect(30, 20, 2, h - 40);
    }
    U.grain(ctx, w, h, 6, 1, 6);
    return U.canvasTexture(c, { clamp: true, aniso: 4 });
  };

  /* —— 环境反射贴图：暖窗、天空与木地板 —— */
  T.envCanvas = function (palette) {
    const w = 1024, h = 512;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const skyTop = palette ? palette.envTop : '#2a3642';
    const skyBottom = palette ? palette.envBottom : '#c08a5b';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, skyTop);
    g.addColorStop(0.52, skyBottom);
    g.addColorStop(0.56, '#3a2a20');
    g.addColorStop(1, '#1c130d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const rng = U.mulberry32(17);
    // 地平线上的街区窗光
    for (let i = 0; i < 18; i++) {
      const x = rng() * w;
      const y = h * (0.48 + rng() * 0.08);
      const ww = 8 + rng() * 22;
      const hh = 6 + rng() * 14;
      ctx.fillStyle = 'rgba(255,196,120,' + (0.18 + rng() * 0.5) + ')';
      ctx.fillRect(x, y, ww, hh);
      ctx.fillStyle = 'rgba(255,186,100,0.06)';
      ctx.fillRect(x - 10, y - 8, ww + 20, hh + 16);
    }
    // 内部暖光的大色块，供黑色漆面反光
    const blobs = [
      [w * 0.18, h * 0.42, 130, 'rgba(255,196,126,0.35)'],
      [w * 0.62, h * 0.4, 180, 'rgba(255,178,104,0.24)'],
      [w * 0.86, h * 0.46, 90, 'rgba(255,214,154,0.28)']
    ];
    blobs.forEach((b) => {
      const rg = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
      rg.addColorStop(0, b[3]);
      rg.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2);
    });
    // 顶部室内阴影
    const topG = ctx.createLinearGradient(0, 0, 0, h * 0.3);
    topG.addColorStop(0, 'rgba(0,0,0,0.5)');
    topG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, w, h * 0.3);
    U.grain(ctx, w, h, 8, 1, 14);
    const tex = U.canvasTexture(c, { clamp: true, srgb: true });
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  };

  /* —— 小画：黑胶唱片标签 —— */
  T.recordLabel = function () {
    const s = 128;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b18a55';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2018';
    ctx.lineWidth = 2;
    for (let r = 18; r < 60; r += 5) {
      ctx.beginPath();
      ctx.arc(64, 64, r, 0, Math.PI * 2);
      ctx.globalAlpha = 0.15;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3e2b1d';
    ctx.beginPath();
    ctx.arc(64, 64, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e2b1d';
    ctx.font = '9px "Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIDE A', 64, 34);
    ctx.fillText('33 1/3', 64, 100);
    return U.canvasTexture(c, { clamp: true, aniso: 4 });
  };

  WP.Textures = T;
})();
