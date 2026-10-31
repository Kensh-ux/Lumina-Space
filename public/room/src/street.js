/* 窗畔 · 街景底层：共享工具、天空、地面、光照、天气与情绪系统 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const T = WP.Textures;

  /* ———————————————————— 共享街道工具箱 ———————————————————— */
  const SK = {};
  WP.SK = SK;

  SK.BASE = -0.14;          // 对街人行道面高
  SK.ROAD_Y = -0.2;         // 路面高

  SK.box = function (parent, w, h, d, mat, x, y, z, cast, receive) {
    const m = U.box(w, h, d, mat, x, y, z);
    m.castShadow = cast !== false;
    m.receiveShadow = receive !== false;
    if (parent) parent.add(m);
    return m;
  };

  SK.mesh = function (parent, geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  };

  SK.plane = function (parent, w, h, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  };

  SK.frame = function (parent, x, y, z, w, h, mat, t, depth) {
    t = t || 0.07;
    depth = depth || 0.09;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    SK.box(g, w, t, depth, mat, 0, h / 2 - t / 2, 0, true, true);
    SK.box(g, w, t, depth, mat, 0, -h / 2 + t / 2, 0, true, true);
    SK.box(g, t, h - t * 2, depth, mat, -w / 2 + t / 2, 0, 0, true, true);
    SK.box(g, t, h - t * 2, depth, mat, w / 2 - t / 2, 0, 0, true, true);
    parent.add(g);
    return g;
  };

  SK.glow = function (parent, tex, color, opacity, scale, x, y, z) {
    const s = U.sprite(tex, color, opacity, scale);
    s.position.set(x || 0, y || 0, z || 0);
    if (parent) parent.add(s);
    return s;
  };

  SK.textCanvas = function (w, h, draw) {
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    return c;
  };

  SK.canvasMat = function (canvas, opts) {
    opts = opts || {};
    const tex = U.canvasTexture(canvas, { clamp: true, aniso: opts.aniso || 8 });
    return new THREE.MeshBasicMaterial({
      map: tex, transparent: !!opts.transparent, alphaTest: opts.alphaTest || 0,
      side: opts.side || THREE.FrontSide, color: opts.color === undefined ? 0xffffff : opts.color,
      depthWrite: opts.depthWrite !== false, fog: opts.fog !== false
    });
  };

  function tracked(ctx, text, x, y, spacing) {
    const chars = String(text).split('');
    let total = 0;
    const widths = chars.map((c) => {
      const w = ctx.measureText(c).width;
      total += w + spacing;
      return w;
    });
    total -= spacing;
    let cx = x - total / 2;
    chars.forEach((c, i) => {
      ctx.fillText(c, cx + widths[i] / 2, y);
      cx += widths[i] + spacing;
    });
  }
  SK.tracked = tracked;

  SK.signTexture = function (o) {
    o = o || {};
    const w = o.w || 1024;
    const h = o.h || 320;
    const canvas = SK.textCanvas(w, h, (ctx) => {
      const bg = o.bg || '#20261f';
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, o.bgTop || bg);
      g.addColorStop(1, o.bgBottom || bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (o.grain !== false) U.grain(ctx, w, h, 10, 1, o.seed || 4);
      // 外框
      ctx.strokeStyle = o.line || 'rgba(214,184,130,0.85)';
      ctx.lineWidth = Math.max(2, w / 340);
      const pad = Math.max(12, w * 0.022);
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      if (o.double !== false) {
        ctx.lineWidth = Math.max(1, w / 900);
        ctx.strokeStyle = o.line2 || 'rgba(214,184,130,0.42)';
        ctx.strokeRect(pad * 1.8, pad * 1.8, w - pad * 3.6, h - pad * 3.6);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const main = o.main || '';
      const sub = o.sub || '';
      const mainSize = o.mainSize || Math.round(h * (sub ? 0.33 : 0.4));
      ctx.font = (o.weight || '600') + ' ' + mainSize + 'px "Noto Serif SC", "Songti SC", serif';
      ctx.fillStyle = o.fg || '#e8d7b2';
      ctx.shadowColor = o.shadow || 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      const mainY = sub ? h * 0.4 : h * 0.5;
      if (o.spacing) tracked(ctx, main, w / 2, mainY, o.spacing);
      else ctx.fillText(main, w / 2, mainY);
      if (sub) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = o.subColor || 'rgba(232,215,178,0.7)';
        ctx.font = (o.subWeight || '500') + ' ' + (o.subSize || Math.round(h * 0.1)) + 'px "Plex Mono", "Noto Serif SC", monospace';
        tracked(ctx, sub, w / 2, h * 0.68, o.subSpacing || Math.max(2, h * 0.02));
      }
      if (o.note) {
        ctx.fillStyle = o.noteColor || 'rgba(232,215,178,0.45)';
        ctx.font = '400 ' + Math.round(h * 0.065) + 'px "Plex Mono", monospace';
        tracked(ctx, o.note, w / 2, h * 0.84, Math.max(1, h * 0.012));
      }
    });
    return U.canvasTexture(canvas, { clamp: true, aniso: 8 });
  };

  SK.verticalSignTexture = function (o) {
    o = o || {};
    const chars = String(o.text || '').split('');
    const w = o.w || 256;
    const cell = o.cell || 200;
    const h = o.h || (cell * chars.length + 90);
    const canvas = SK.textCanvas(w, h, (ctx) => {
      const bg = o.bg || '#283a2e';
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, o.bgTop || bg);
      g.addColorStop(1, o.bgBottom || bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      U.grain(ctx, w, h, 9, 1, 12);
      ctx.strokeStyle = o.line || 'rgba(220,195,145,0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.strokeStyle = 'rgba(220,195,145,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(22, 22, w - 44, h - 44);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 ' + (o.size || 150) + 'px "Noto Serif SC", "Songti SC", serif';
      ctx.fillStyle = o.fg || '#eadbb8';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      chars.forEach((c, i) => {
        ctx.fillText(c, w / 2, 45 + cell / 2 + i * cell);
      });
      if (o.sub) {
        ctx.shadowBlur = 0;
        ctx.font = '500 ' + (o.subSize || 18) + 'px "Plex Mono", monospace';
        ctx.fillStyle = 'rgba(234,219,184,0.55)';
        ctx.save();
        ctx.translate(w / 2, h - 28);
        ctx.fillText(o.sub, 0, 0);
        ctx.restore();
      }
    });
    return U.canvasTexture(canvas, { clamp: true, aniso: 8 });
  };

  SK.stripeTexture = function (a, b, seed, vertical) {
    const w = 512, h = 256;
    const canvas = SK.textCanvas(w, h, (ctx) => {
      const rng = U.mulberry32(seed || 3);
      const n = vertical ? 12 : 8;
      const band = (vertical ? w : h) / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? b : a;
        if (vertical) ctx.fillRect(i * band, 0, band, h);
        else ctx.fillRect(0, i * band, w, band);
      }
      // 布纹与褶影
      const g = ctx.createLinearGradient(0, 0, vertical ? 0 : w, vertical ? h : 0);
      g.addColorStop(0, 'rgba(0,0,0,0.22)');
      g.addColorStop(0.18, 'rgba(255,255,255,0.06)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.03)');
      g.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)';
        ctx.fillRect(rng() * w, rng() * h, 1, 1);
      }
      for (let i = 0; i < n; i++) {
        const x = i * band;
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        if (vertical) ctx.fillRect(x, 0, 2, h);
        else ctx.fillRect(0, x, w, 2);
      }
    });
    return U.canvasTexture(canvas, { clamp: false, repeat: [1, 1] });
  };

  SK.valanceTexture = function (stripeTex, stripes) {
    const w = 512, h = 128;
    const src = stripeTex.image;
    const canvas = SK.textCanvas(w, h, (ctx) => {
      ctx.clearRect(0, 0, w, h);
      // 先裁出半圆扇贝下摆
      const r = w / 16;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h * 0.74);
      for (let x = w; x > 0; x -= r * 2) {
        ctx.arc(x - r, h * 0.74, r, 0, Math.PI, false);
      }
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h * 0.9);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, w, h * 0.08);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, h * 0.7, w, h * 0.06);
      // 小流苏
      ctx.fillStyle = 'rgba(235,225,200,0.65)';
      for (let x = 4; x < w; x += 10) ctx.fillRect(x, h * 0.78, 1.5, 14);
    });
    return U.canvasTexture(canvas, { clamp: true, aniso: 8 });
  };

  /* 遮阳篷：从墙面伸向街道，带下垂弧度 */
  SK.awning = function (ctx, o) {
    const w = o.w;
    const depth = o.depth;
    const drop = o.drop === undefined ? 0.28 : o.drop;
    const sag = o.sag === undefined ? 0.06 : o.sag;
    const nx = 26, nz = 5;
    const geo = new THREE.BufferGeometry();
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nz; j++) {
      const v = j / nz;
      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        const x = (u - 0.5) * w;
        const z = v * depth;
        const y = -drop * v - Math.sin(v * Math.PI) * sag + Math.sin(u * Math.PI * 5) * 0.008 * v;
        pos.push(x, y, z);
        uv.push(u * (o.repeat || 1), v);
      }
    }
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i;
        const b = a + 1;
        const c = a + nx + 1;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const topMat = new THREE.MeshStandardMaterial({
      map: o.map, side: THREE.DoubleSide, roughness: 0.92, metalness: 0
    });
    const mesh = new THREE.Mesh(geo, topMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const g = new THREE.Group();
    g.position.set(o.x, o.y, o.z);
    g.add(mesh);
    // 前垂帘
    if (o.valance) {
      const vGeo = new THREE.PlaneGeometry(w, o.valanceH || 0.3);
      const vMat = new THREE.MeshStandardMaterial({
        map: o.valance, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide,
        roughness: 0.94, metalness: 0
      });
      const v = new THREE.Mesh(vGeo, vMat);
      v.position.set(0, -drop - (o.valanceH || 0.3) / 2 + 0.015, depth);
      v.castShadow = true;
      g.add(v);
    }
    ctx.root.add(g);
    return g;
  };

  SK.chalkboardTexture = function (title, lines, seed) {
    const w = 384, h = 512;
    return U.canvasTexture(SK.textCanvas(w, h, (ctx) => {
      ctx.fillStyle = '#1f2a26';
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.5, h * 0.75);
      g.addColorStop(0, 'rgba(230,240,228,0.06)');
      g.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(235,235,220,0.1)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 30; i++) {
        const y = (i * 37 + seed * 13) % h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (i % 3) * 2);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#efe7d2';
      ctx.font = '600 46px "Noto Serif SC", serif';
      ctx.fillText(title, w / 2, 100);
      ctx.strokeStyle = 'rgba(239,231,210,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 128);
      ctx.lineTo(w - 60, 128);
      ctx.stroke();
      ctx.font = '400 26px "Noto Serif SC", serif';
      lines.forEach((l, i) => ctx.fillText(l, w / 2, 190 + i * 54));
      ctx.font = '400 20px "Plex Mono", monospace';
      ctx.fillStyle = 'rgba(239,231,210,0.55)';
      ctx.fillText('— WINDOWLIGHT —', w / 2, h - 40);
    }), { clamp: true, aniso: 8 });
  };

  SK.clockTexture = function () {
    const s = 512;
    return U.canvasTexture(SK.textCanvas(s, s, (ctx) => {
      ctx.fillStyle = '#1c2421';
      ctx.fillRect(0, 0, s, s);
      const r = s * 0.46;
      ctx.translate(s / 2, s / 2);
      const g = ctx.createRadialGradient(0, -r * 0.2, 5, 0, 0, r);
      g.addColorStop(0, '#f2e8d2');
      g.addColorStop(0.7, '#e2d3b6');
      g.addColorStop(1, '#b9a483');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a2823';
      ctx.lineWidth = 10;
      ctx.stroke();
      // 刻度
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const minor = i % 5 !== 0;
        ctx.strokeStyle = minor ? 'rgba(42,40,35,0.45)' : '#2a2823';
        ctx.lineWidth = minor ? 2 : 5;
        const r1 = r * (minor ? 0.83 : 0.78);
        const r2 = r * 0.9;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * r1, -Math.cos(a) * r1);
        ctx.lineTo(Math.sin(a) * r2, -Math.cos(a) * r2);
        ctx.stroke();
      }
      ctx.fillStyle = '#2a2823';
      ctx.font = '500 38px "Cormorant", "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      roman.forEach((t, i) => {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillText(t, Math.sin(a) * r * 0.63, -Math.cos(a) * r * 0.63 + 2);
      });
      ctx.font = '500 17px "Plex Mono", monospace';
      ctx.fillStyle = 'rgba(42,40,35,0.55)';
      ctx.fillText('WINDOWLIGHT', 0, r * 0.28);
      ctx.font = 'italic 400 24px "Cormorant", serif';
      ctx.fillText('by the street', 0, r * 0.4);
    }), { clamp: true, aniso: 8 });
  };

  SK.wetStreakTexture = function (seed, warm) {
    const w = 128, h = 512;
    return U.canvasTexture(SK.textCanvas(w, h, (ctx) => {
      const rng = U.mulberry32(seed || 2);
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, warm ? 'rgba(255,214,160,0.0)' : 'rgba(190,215,225,0.0)');
      g.addColorStop(0.25, warm ? 'rgba(255,206,150,0.5)' : 'rgba(190,215,225,0.35)');
      g.addColorStop(0.6, warm ? 'rgba(255,190,120,0.22)' : 'rgba(170,200,215,0.14)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(w * 0.28, 0, w * 0.44, h);
      for (let i = 0; i < 14; i++) {
        const x = w * 0.15 + rng() * w * 0.7;
        const ww = 1 + rng() * 6;
        const gg = ctx.createLinearGradient(0, 0, 0, h);
        gg.addColorStop(0, 'rgba(255,255,255,0)');
        gg.addColorStop(0.3, warm ? 'rgba(255,220,170,0.24)' : 'rgba(210,230,240,0.18)');
        gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(x, rng() * h * 0.2, ww, h * (0.4 + rng() * 0.5));
      }
      // 揉开边缘
      ctx.globalCompositeOperation = 'destination-in';
      const m = ctx.createLinearGradient(0, 0, w, 0);
      m.addColorStop(0, 'rgba(0,0,0,0)');
      m.addColorStop(0.3, 'rgba(0,0,0,1)');
      m.addColorStop(0.7, 'rgba(0,0,0,1)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = m;
      ctx.fillRect(0, 0, w, h);
    }), { clamp: true, aniso: 4 });
  };

  SK.floristTexture = function () {
    const w = 512, h = 448;
    return U.canvasTexture(SK.textCanvas(w, h, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#cfc4a8');
      g.addColorStop(0.5, '#b8a98c');
      g.addColorStop(1, '#6e5c45');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 内墙与架子
      ctx.fillStyle = 'rgba(72,86,72,0.75)';
      ctx.fillRect(0, h * 0.08, w, h * 0.5);
      ctx.fillStyle = 'rgba(35,45,38,0.55)';
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
      for (let s = 0; s < 2; s++) {
        const y = h * (0.22 + s * 0.16);
        ctx.fillStyle = '#6b5a44';
        ctx.fillRect(w * 0.06, y, w * 0.88, 7);
        for (let i = 0; i < 8; i++) {
          const x = w * 0.09 + i * w * 0.11;
          ctx.fillStyle = 'rgba(216,203,172,0.9)';
          ctx.fillRect(x, y - 26, 18, 24);
          const heads = ['#c26a63', '#d9a680', '#e8d6b3', '#b48a9e', '#cf9c56'];
          for (let k = 0; k < 6; k++) {
            ctx.fillStyle = heads[(i + k) % heads.length];
            ctx.beginPath();
            ctx.arc(x + 9 + Math.cos(k) * 12, y - 22 + Math.sin(k * 1.7) * 10, 5 + (k % 3), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // 柜台
      ctx.fillStyle = '#463627';
      ctx.fillRect(w * 0.08, h * 0.63, w * 0.84, 12);
      // 前排花桶
      const buckets = ['#8d6d49', '#7e5d43', '#9a7a54', '#6f5540'];
      for (let i = 0; i < 7; i++) {
        const x = w * 0.12 + i * w * 0.12;
        const bh = 46 + (i % 3) * 14;
        ctx.fillStyle = buckets[i % buckets.length];
        ctx.fillRect(x - 12, h * 0.86 - bh, 30, bh);
        const colors = ['#d77a76', '#e6c28c', '#c39aa8', '#cf6f60', '#e8dbc0'];
        for (let k = 0; k < 9; k++) {
          ctx.fillStyle = colors[(i + k) % colors.length];
          ctx.beginPath();
          ctx.arc(x + 3 + (k % 3) * 9 - 9, h * 0.86 - bh - 4 + Math.floor(k / 3) * 9, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(70,105,70,0.85)';
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.ellipse(x + 3 + Math.cos(k) * 13, h * 0.86 - bh * 0.5, 7, 3, k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 暖灯
      for (let i = 0; i < 3; i++) {
        const x = w * (0.25 + i * 0.25);
        ctx.strokeStyle = 'rgba(35,30,24,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h * 0.12);
        ctx.stroke();
        const rg = ctx.createRadialGradient(x, h * 0.15, 1, x, h * 0.15, 42);
        rg.addColorStop(0, 'rgba(255,230,180,1)');
        rg.addColorStop(0.2, 'rgba(255,205,135,0.7)');
        rg.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, h * 0.15, 42, 0, Math.PI * 2);
        ctx.fill();
      }
      // 玻璃反光
      const gl = ctx.createLinearGradient(0, 0, w, h);
      gl.addColorStop(0, 'rgba(245,250,255,0.20)');
      gl.addColorStop(0.32, 'rgba(245,250,255,0.02)');
      gl.addColorStop(0.62, 'rgba(255,244,220,0.08)');
      gl.addColorStop(1, 'rgba(255,244,220,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, w, h);
      // 暗角
      const vg = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.2, w / 2, h * 0.5, h * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      U.grain(ctx, w, h, 8, 1, 31);
    }), { clamp: true, aniso: 8 });
  };

  SK.bookshopTexture = function () {
    const w = 512, h = 448;
    return U.canvasTexture(SK.textCanvas(w, h, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#b7834f');
      g.addColorStop(0.45, '#8a5b37');
      g.addColorStop(1, '#3b2517');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 后墙书柜
      ctx.fillStyle = 'rgba(58,36,22,0.92)';
      ctx.fillRect(0, h * 0.08, w, h * 0.68);
      const rng = U.mulberry32(404);
      for (let s = 0; s < 4; s++) {
        const y = h * (0.16 + s * 0.14);
        ctx.fillStyle = '#3a2515';
        ctx.fillRect(w * 0.04, y, w * 0.92, 8);
        let x = w * 0.06;
        while (x < w * 0.94) {
          const bw = 5 + rng() * 9;
          const bh = 20 + rng() * 22;
          const colors = ['#7e3f32', '#3d5347', '#b28a54', '#2f4054', '#6c5237', '#8a6a50', '#413a2d'];
          ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
          ctx.fillRect(x, y - bh, bw, bh);
          ctx.fillStyle = 'rgba(238,215,170,0.18)';
          ctx.fillRect(x + 1, y - bh + 4, bw - 2, 1);
          x += bw + 1 + rng() * 2;
        }
      }
      // 暖灯与阅读桌
      ctx.fillStyle = 'rgba(38,24,15,0.85)';
      ctx.fillRect(w * 0.58, h * 0.7, w * 0.32, 24);
      ctx.fillStyle = '#3b2919';
      ctx.fillRect(w * 0.6, h * 0.72, w * 0.26, h * 0.2);
      const rg = ctx.createRadialGradient(w * 0.7, h * 0.55, 4, w * 0.7, h * 0.55, h * 0.4);
      rg.addColorStop(0, 'rgba(255,220,155,0.85)');
      rg.addColorStop(0.3, 'rgba(255,190,110,0.25)');
      rg.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(w * 0.7, h * 0.55, h * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // 台灯
      ctx.fillStyle = '#2c2017';
      ctx.fillRect(w * 0.69, h * 0.62, 4, 52);
      ctx.fillStyle = '#d5a85e';
      ctx.beginPath();
      ctx.moveTo(w * 0.69 - 26, h * 0.64);
      ctx.lineTo(w * 0.69 + 30, h * 0.64);
      ctx.lineTo(w * 0.69 + 18, h * 0.57);
      ctx.lineTo(w * 0.69 - 16, h * 0.57);
      ctx.closePath();
      ctx.fill();
      // 读书的人影
      ctx.fillStyle = 'rgba(30,20,14,0.8)';
      ctx.beginPath();
      ctx.ellipse(w * 0.36, h * 0.69, 22, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w * 0.36, h * 0.82, 48, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      // 店猫
      ctx.fillStyle = 'rgba(35,24,16,0.9)';
      ctx.beginPath();
      ctx.ellipse(w * 0.82, h * 0.87, 26, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.79, h * 0.84, 10, 0, Math.PI * 2);
      ctx.fill();
      // 玻璃反光与暗角
      const gl = ctx.createLinearGradient(0, 0, w, h);
      gl.addColorStop(0, 'rgba(245,250,255,0.16)');
      gl.addColorStop(0.3, 'rgba(245,250,255,0.02)');
      gl.addColorStop(0.7, 'rgba(255,244,220,0.06)');
      gl.addColorStop(1, 'rgba(255,244,220,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, w, h);
      const vg = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.22, w / 2, h * 0.5, h * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      U.grain(ctx, w, h, 8, 1, 41);
    }), { clamp: true, aniso: 8 });
  };

  /* ———————————————————— 十种窗外光景 ———————————————————— */
  const MOOD_META = {
    dusk: {
      label: '黄昏', en: 'DUSK', no: '01',
      quote: '把街灯一盏盏点亮，等一壶水慢慢烧开。',
      desc: '暖橘色落进房间，街上的灯刚刚醒。',
      thumb: ['#f1ab77', '#9a6a63', '#202a44']
    },
    rain: {
      label: '雨夜', en: 'RAIN', no: '02',
      quote: '雨把城市擦成一面旧镜子，霓虹在水里溶开。',
      desc: '窗玻璃上挂着水珠，唱片机转得很慢。',
      thumb: ['#7e939c', '#33414a', '#0d141b']
    },
    snow: {
      label: '初雪', en: 'FIRST SNOW', no: '03',
      quote: '第一场雪落在招牌上，像一封没有署名的信。',
      desc: '屋檐、树枝与路灯都轻轻变白。',
      thumb: ['#eef1f5', '#b9b5c5', '#333a4e']
    },
    dawn: {
      label: '清晨', en: 'MORNING', no: '04',
      quote: '面包房刚开灯，街道还带着露水。',
      desc: '薄雾散去之前，整条街都是软的。',
      thumb: ['#cfe0ef', '#dcc0bc', '#5d7794']
    },
    day: {
      label: '晴昼', en: 'DAYLIGHT', no: '05',
      quote: '光落在木地板上，像一条温暖的河。',
      desc: '晾衣绳轻轻晃，城市在窗外发亮。',
      thumb: ['#f4f2df', '#a9c9dc', '#4e84b3']
    },
    aurora: {
      label: '极光', en: 'AURORA', no: '06',
      quote: '整片夜空缓缓翻身，把极光抖落在屋顶上。',
      desc: '青与紫的光带越过屋檐，街灯像漂浮的星。',
      thumb: ['#7cf0d0', '#8b74dc', '#09132d']
    },
    /* ——— 幻境：窗子不再朝向一条街 ——— */
    abyss: {
      label: '深海', en: 'ABYSS', no: '07', kind: 'dream',
      quote: '整座海悬在窗外，鲸从光的裂缝里缓缓游过。',
      desc: '房间沉进海底，鲸群、水母与光柱一起呼吸。',
      thumb: ['#8ff0df', '#176078', '#031017']
    },
    cosmos: {
      label: '星潮', en: 'STAR TIDE', no: '08', kind: 'dream',
      quote: '把窗再推开一点，银河就从缝里涌进来了。',
      desc: '带环的行星贴近窗沿，星尘像潮水一样涨落。',
      thumb: ['#bcd4ff', '#7459c9', '#060a1f']
    },
    sakura: {
      label: '樱夜', en: 'SAKURA', no: '09', kind: 'dream',
      quote: '月亮很低，花瓣落在窗台上，像有人刚刚离开。',
      desc: '夜樱探进窗口，灯与花瓣一起向湖面飘。',
      thumb: ['#ffc5d2', '#9a68ad', '#191126']
    },
    hanabi: {
      label: '花火', en: 'HANABI', no: '10', kind: 'dream',
      quote: '远处的花火一朵接一朵，水面替它们又开了一遍。',
      desc: '夏夜的海湾，花火、灯笼与摩天轮一起亮着。',
      thumb: ['#ffd2a0', '#ee6a60', '#091625']
    },
    cloudsea: {
      label: '云海', en: 'SKY SEA', no: '11', kind: 'dream',
      quote: '把窗推开，云就从脚下漫进来，像一床刚晒过的被子。',
      desc: '云层一直铺到远山，一只热气球慢慢飘过去。',
      thumb: ['#f7d7b2', '#c08a7b', '#252c4c']
    },
    isles: {
      label: '浮岛', en: 'SKY ISLES', no: '12', kind: 'dream',
      quote: '岛把根须垂进风里，瀑布落下去，变成一条很长的云。',
      desc: '浮空群岛、垂落的藤蔓，还有一座不肯落地的花园。',
      thumb: ['#b9f0df', '#5d7fa8', '#0a1b29']
    },
    dunes: {
      label: '沙海', en: 'DUNES', no: '13', kind: 'dream',
      quote: '两轮月亮照着沙丘，风把驼铃吹得很远。',
      desc: '月下的沙脊、半埋的石门，一支驼队慢慢走过。',
      thumb: ['#f3cb8d', '#a4654f', '#171322']
    },
    ice: {
      label: '冰原', en: 'ICE FIELD', no: '14', kind: 'dream',
      quote: '冰把星光冻在里面，踩上去会听见很轻的回声。',
      desc: '冰晶从冻土里长出来，极夜把它们照成青绿色。',
      thumb: ['#bff4f2', '#5a8fae', '#06151f']
    },
    firefly: {
      label: '萤森', en: 'GLOW WOOD', no: '15', kind: 'dream',
      quote: '森林把灯藏在草里，等天黑才一盏盏放出来。',
      desc: '萤火在溪面打转，伞盖下的光比月亮更近。',
      thumb: ['#c8f5a4', '#2f7060', '#05130f']
    },
    booksea: {
      label: '书海', en: 'BOOK SEA', no: '16', kind: 'dream',
      quote: '书页浮在光里，像一场下得很慢的雪。',
      desc: '书架悬在半空，纸页与吊灯一起慢慢地漂。',
      thumb: ['#f0d3a2', '#956a4b', '#1f1520']
    },
    moon: {
      label: '月面', en: 'MOONLIT', no: '17', kind: 'dream',
      quote: '从月亮回望，地球只是窗上一枚小小的蓝纽扣。',
      desc: '月壤与环形山之间，一座玻璃花房亮着灯。',
      thumb: ['#dfe8ff', '#7f8aa8', '#05060d']
    },
    meadow: {
      label: '花野', en: 'WILDFLOWER', no: '18', kind: 'dream',
      quote: '风从花海上跑过去，整片夜色都轻轻弯下腰。',
      desc: '野花伏向同一侧，风车在月亮下面慢慢转。',
      thumb: ['#ffd5c4', '#9a7fb5', '#141226']
    }
  };
  WP.MOODS = MOOD_META;
  WP.MOOD_ORDER = [
    'dusk', 'rain', 'snow', 'dawn', 'day', 'aurora',
    'abyss', 'cosmos', 'sakura', 'hanabi',
    'cloudsea', 'isles', 'dunes', 'ice', 'firefly', 'booksea', 'moon', 'meadow'
  ];

  const LOOKS = {
    dusk: {
      skyTop: '#17213c', skyMid: '#5d4b63', skyHorizon: '#efa273', skyGlow: '#ffb27a',
      sunColor: '#ffc38c', sunDir: [-0.34, 0.17, -1], sunSize: 0.052, sunHalo: 1.0,
      moonDir: [0.5, 0.4, -1], moonAmount: 0.0,
      stars: 0.35, cloudColor: '#6d5666', cloudLit: '#df9f86', clouds: 0.55,
      fogColor: '#6c5357', fogNear: 15, fogFar: 46,
      sunIntensity: 2.05, sunLightColor: '#ffb98a',
      lightFrom: [-0.42, 0.55, -0.72],
      hemiSky: '#66739b', hemiGround: '#4f362b', hemiIntensity: 0.55,
      ambient: 0.25, ambientColor: '#3a2b23',
      lamp: 1.0, shop: 1.0, apt: 0.9,
      rain: 0, snow: 0, wet: 0.28, drops: 0, caps: 0, birds: 0, fireflies: 1,
      exposure: 1.0, vignette: 0.82, grain: 0.032, aberration: 0.9,
      windowColor: '#ffc093', windowLight: 2.4,
      leafGreen: '#a8a883', leafAutumn: '#d7b281',
      people: 1, aurora: 0
    },
    rain: {
      skyTop: '#0b1119', skyMid: '#1c2831', skyHorizon: '#5b6467', skyGlow: '#7b7a73',
      sunColor: '#8c9aa5', sunDir: [0.2, 0.35, -1], sunSize: 0.035, sunHalo: 0.2,
      moonDir: [0.4, 0.35, -1], moonAmount: 0.0,
      stars: 0, cloudColor: '#303a41', cloudLit: '#5a6062', clouds: 0.95,
      fogColor: '#2a3238', fogNear: 11, fogFar: 36,
      sunIntensity: 0.22, sunLightColor: '#8c9aa5',
      lightFrom: [0.1, 0.82, -0.5],
      hemiSky: '#3d4954', hemiGround: '#24201d', hemiIntensity: 0.32,
      ambient: 0.18, ambientColor: '#24272a',
      lamp: 1.5, shop: 1.3, apt: 1.1,
      rain: 1, snow: 0, wet: 1, drops: 0.75, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.12, vignette: 0.92, grain: 0.045, aberration: 1.2,
      windowColor: '#ffb98b', windowLight: 2.0,
      leafGreen: '#6f8277', leafAutumn: '#8f7b63',
      people: 1, aurora: 0
    },
    snow: {
      skyTop: '#262c42', skyMid: '#6f6a80', skyHorizon: '#cbbec2', skyGlow: '#ffd6bf',
      sunColor: '#ffe3cd', sunDir: [-0.42, 0.26, -1], sunSize: 0.04, sunHalo: 0.5,
      moonDir: [0.45, 0.42, -1], moonAmount: 0.35,
      stars: 0.15, cloudColor: '#77778b', cloudLit: '#c3bcc8', clouds: 0.75,
      fogColor: '#9a93a2', fogNear: 12, fogFar: 38,
      sunIntensity: 0.75, sunLightColor: '#ffe2cd',
      lightFrom: [-0.38, 0.6, -0.68],
      hemiSky: '#979db4', hemiGround: '#6d605c', hemiIntensity: 0.68,
      ambient: 0.3, ambientColor: '#4a4548',
      lamp: 1.15, shop: 1.05, apt: 0.95,
      rain: 0, snow: 1, wet: 0.2, drops: 0.12, caps: 1, birds: 0, fireflies: 0,
      exposure: 1.04, vignette: 0.78, grain: 0.028, aberration: 0.8,
      windowColor: '#ffc49a', windowLight: 2.6,
      leafGreen: '#c2c9cd', leafAutumn: '#d6cdc2',
      people: 0.65, aurora: 0
    },
    dawn: {
      skyTop: '#4e6f97', skyMid: '#a9b4c6', skyHorizon: '#f2d6c0', skyGlow: '#ffd9ae',
      sunColor: '#ffe4b8', sunDir: [0.42, 0.2, -1], sunSize: 0.045, sunHalo: 0.75,
      moonDir: [-0.4, 0.4, -1], moonAmount: 0.08,
      stars: 0, cloudColor: '#b7b3c0', cloudLit: '#f7d6bd', clouds: 0.55,
      fogColor: '#bcc7d1', fogNear: 13, fogFar: 44,
      sunIntensity: 1.45, sunLightColor: '#ffe6c6',
      lightFrom: [0.5, 0.5, -0.68],
      hemiSky: '#a8bdd4', hemiGround: '#5d504a', hemiIntensity: 1.0,
      ambient: 0.3, ambientColor: '#4c4742',
      lamp: 0.16, shop: 0.82, apt: 0.16,
      rain: 0, snow: 0, wet: 0.12, drops: 0.06, caps: 0, birds: 1, fireflies: 0,
      exposure: 0.98, vignette: 0.72, grain: 0.024, aberration: 0.6,
      windowColor: '#dfeaff', windowLight: 2.7,
      leafGreen: '#aabf8d', leafAutumn: '#d2aa7f',
      people: 0.32, aurora: 0
    },
    day: {
      skyTop: '#4d83b4', skyMid: '#8db5d0', skyHorizon: '#cfdfe4', skyGlow: '#ffe9c4',
      sunColor: '#fff7e2', sunDir: [0.22, 0.6, -1], sunSize: 0.045, sunHalo: 1.2,
      moonDir: [-0.4, 0.4, -1], moonAmount: 0,
      stars: 0, cloudColor: '#eef3f5', cloudLit: '#ffffff', clouds: 0.8,
      fogColor: '#c3ced0', fogNear: 20, fogFar: 58,
      sunIntensity: 2.2, sunLightColor: '#fff2d8',
      lightFrom: [0.32, 0.7, -0.6],
      hemiSky: '#a8c1d4', hemiGround: '#6b5c50', hemiIntensity: 1.02,
      ambient: 0.34, ambientColor: '#4b453f',
      lamp: 0.12, shop: 0.55, apt: 0.25,
      rain: 0, snow: 0, wet: 0.03, drops: 0, caps: 0, birds: 1, fireflies: 0,
      exposure: 0.9, vignette: 0.7, grain: 0.024, aberration: 0.6,
      windowColor: '#e8f2ff', windowLight: 3.4,
      leafGreen: '#9fbf7e', leafAutumn: '#c7a85f',
      people: 1, aurora: 0
    },
    aurora: {
      skyTop: '#01030a', skyMid: '#050d18', skyHorizon: '#0b2230', skyGlow: '#144a50',
      sunColor: '#8bd8d8', sunDir: [-0.24, 0.28, -1], sunSize: 0.018, sunHalo: 0.1,
      moonDir: [0.38, 0.52, -1], moonAmount: 0.55,
      stars: 1.4, cloudColor: '#0d2029', cloudLit: '#2a5450', clouds: 0.1,
      fogColor: '#152a32', fogNear: 14, fogFar: 43,
      sunIntensity: 0.55, sunLightColor: '#8fb9ce',
      lightFrom: [-0.15, 0.7, -0.7],
      hemiSky: '#467d8a', hemiGround: '#1b2430', hemiIntensity: 0.55,
      ambient: 0.22, ambientColor: '#243a3d',
      lamp: 1.75, shop: 1.25, apt: 0.9,
      rain: 0, snow: 0, wet: 0.42, drops: 0.1, caps: 0, birds: 0, fireflies: 1.6,
      exposure: 1.16, vignette: 0.9, grain: 0.034, aberration: 1.1,
      windowColor: '#c8f4e7', windowLight: 2.15,
      leafGreen: '#6e9890', leafAutumn: '#988bb0',
      people: 0.18, aurora: 1
    },
    /* ——— 幻境：不再有街，只剩窗框里的另一种世界 ——— */
    abyss: {
      skyTop: '#021019', skyMid: '#052c38', skyHorizon: '#0d5b62', skyGlow: '#3fa79c',
      sunColor: '#9be8de', sunDir: [-0.2, 0.65, -0.72], sunSize: 0.07, sunHalo: 0.7,
      moonDir: [0.4, 0.5, -1], moonAmount: 0,
      stars: 0.2, cloudColor: '#08242c', cloudLit: '#1b5860', clouds: 0,
      fogColor: '#03151b', fogNear: 14, fogFar: 52,
      sunIntensity: 0.55, sunLightColor: '#8adad2',
      lightFrom: [-0.25, 0.62, -0.74],
      hemiSky: '#2c6b76', hemiGround: '#081418', hemiIntensity: 0.55,
      ambient: 0.26, ambientColor: '#123037',
      lamp: 1.6, shop: 0.5, apt: 0.2,
      rain: 0, snow: 0, wet: 0.15, drops: 0.05, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.04, vignette: 0.96, grain: 0.03, aberration: 1.25,
      windowColor: '#9be8df', windowLight: 1.6,
      leafGreen: '#7fbfae', leafAutumn: '#a9bfae',
      people: 0, aurora: 0
    },
    cosmos: {
      skyTop: '#02040f', skyMid: '#0a0f2a', skyHorizon: '#241a46', skyGlow: '#6e5bb0',
      sunColor: '#d8e6ff', sunDir: [0.35, 0.32, -0.88], sunSize: 0.02, sunHalo: 0.35,
      moonDir: [-0.45, 0.4, -1], moonAmount: 0.4,
      stars: 1.6, cloudColor: '#101632', cloudLit: '#372a63', clouds: 0,
      fogColor: '#050818', fogNear: 28, fogFar: 96,
      sunIntensity: 0.75, sunLightColor: '#b5caff',
      lightFrom: [0.32, 0.55, -0.76],
      hemiSky: '#4e5fa8', hemiGround: '#111126', hemiIntensity: 0.62,
      ambient: 0.28, ambientColor: '#1c2346',
      lamp: 1.15, shop: 0.4, apt: 0.3,
      rain: 0, snow: 0, wet: 0.08, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.06, vignette: 0.88, grain: 0.024, aberration: 1.5,
      windowColor: '#c2d6ff', windowLight: 2.0,
      leafGreen: '#8ea4c9', leafAutumn: '#b6a5c9',
      people: 0, aurora: 0
    },
    sakura: {
      skyTop: '#0b0a20', skyMid: '#261a3c', skyHorizon: '#6f4058', skyGlow: '#e9a0ab',
      sunColor: '#ffd3d9', sunDir: [-0.55, 0.18, -0.82], sunSize: 0.02, sunHalo: 0.25,
      moonDir: [-0.52, 0.22, -0.83], moonAmount: 1.4,
      stars: 1.1, cloudColor: '#2a1c3a', cloudLit: '#6f465c', clouds: 0,
      fogColor: '#211731', fogNear: 20, fogFar: 72,
      sunIntensity: 0.6, sunLightColor: '#ffc8d4',
      lightFrom: [-0.5, 0.55, -0.68],
      hemiSky: '#6c5888', hemiGround: '#281a2c', hemiIntensity: 0.55,
      ambient: 0.28, ambientColor: '#38243f',
      lamp: 1.65, shop: 0.3, apt: 0.4,
      rain: 0, snow: 0, wet: 0.12, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.0, vignette: 0.94, grain: 0.03, aberration: 1.1,
      windowColor: '#ffd0dc', windowLight: 1.75,
      leafGreen: '#c99ab0', leafAutumn: '#e0b3b0',
      people: 0, aurora: 0
    },
    hanabi: {
      skyTop: '#040b1a', skyMid: '#0a1b31', skyHorizon: '#163a4a', skyGlow: '#2e5f66',
      sunColor: '#ffd9ae', sunDir: [0.4, 0.3, -0.86], sunSize: 0.02, sunHalo: 0.2,
      moonDir: [0.4, 0.3, -1], moonAmount: 0.3,
      stars: 0.8, cloudColor: '#0d2133', cloudLit: '#274a55', clouds: 0,
      fogColor: '#0a1a28', fogNear: 24, fogFar: 82,
      sunIntensity: 0.5, sunLightColor: '#ffbf9a',
      lightFrom: [0.35, 0.55, -0.75],
      hemiSky: '#3c5478', hemiGround: '#1d1c28', hemiIntensity: 0.5,
      ambient: 0.25, ambientColor: '#222b3c',
      lamp: 1.6, shop: 0.8, apt: 0.7,
      rain: 0, snow: 0, wet: 0.3, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.0, vignette: 0.9, grain: 0.028, aberration: 1.25,
      windowColor: '#ffc9a2', windowLight: 1.95,
      leafGreen: '#8a9c8a', leafAutumn: '#b89a76',
      people: 0, aurora: 0
    },
    /* ——— 第二批幻境：云海、浮岛、沙海、冰原、萤森、书海、月面、花野 ——— */
    cloudsea: {
      skyTop: '#1b2347', skyMid: '#73536f', skyHorizon: '#f4bd92', skyGlow: '#ffc994',
      sunColor: '#ffd6a2', sunDir: [-0.16, 0.2, -1], sunSize: 0.058, sunHalo: 1.4,
      moonDir: [0.4, 0.4, -1], moonAmount: 0,
      stars: 0.18, cloudColor: '#8a6b72', cloudLit: '#ffd7b5', clouds: 0.45,
      fogColor: '#b28276', fogNear: 30, fogFar: 110,
      sunIntensity: 1.9, sunLightColor: '#ffd2a6',
      lightFrom: [-0.3, 0.5, -0.8],
      hemiSky: '#8a94b8', hemiGround: '#6b4b42', hemiIntensity: 1.0,
      ambient: 0.32, ambientColor: '#4a3a36',
      lamp: 0.85, shop: 0.4, apt: 0.3,
      rain: 0, snow: 0, wet: 0.05, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.06, vignette: 0.78, grain: 0.028, aberration: 0.9,
      windowColor: '#ffd7b5', windowLight: 2.7,
      leafGreen: '#a8b28a', leafAutumn: '#d5b28a',
      people: 0, aurora: 0
    },
    isles: {
      skyTop: '#061427', skyMid: '#295367', skyHorizon: '#8fd6c8', skyGlow: '#bdf4e4',
      sunColor: '#d6fff4', sunDir: [0.3, 0.42, -0.86], sunSize: 0.03, sunHalo: 0.8,
      moonDir: [-0.4, 0.4, -1], moonAmount: 0.35,
      stars: 0.5, cloudColor: '#1c3d46', cloudLit: '#4e827e', clouds: 0.2,
      fogColor: '#24413f', fogNear: 26, fogFar: 105,
      sunIntensity: 1.1, sunLightColor: '#bff0e4',
      lightFrom: [0.32, 0.52, -0.78],
      hemiSky: '#6d9cb0', hemiGround: '#243b3b', hemiIntensity: 0.8,
      ambient: 0.3, ambientColor: '#263d3d',
      lamp: 1.2, shop: 0.4, apt: 0.3,
      rain: 0, snow: 0, wet: 0.12, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.04, vignette: 0.86, grain: 0.026, aberration: 1.15,
      windowColor: '#bff4ea', windowLight: 2.05,
      leafGreen: '#7fc0a6', leafAutumn: '#a8b48f',
      people: 0, aurora: 0
    },
    dunes: {
      skyTop: '#080a1d', skyMid: '#2a2038', skyHorizon: '#8d5545', skyGlow: '#e2a06b',
      sunColor: '#ffd6a0', sunDir: [-0.55, 0.18, -0.84], sunSize: 0.05, sunHalo: 0.85,
      moonDir: [0.55, 0.32, -0.9], moonAmount: 0.8,
      stars: 1.0, cloudColor: '#2a2133', cloudLit: '#6b463e', clouds: 0.12,
      fogColor: '#5b3d32', fogNear: 24, fogFar: 95,
      sunIntensity: 1.35, sunLightColor: '#ffce93',
      lightFrom: [-0.42, 0.48, -0.76],
      hemiSky: '#7d667e', hemiGround: '#3a2620', hemiIntensity: 0.7,
      ambient: 0.28, ambientColor: '#3a2b28',
      lamp: 1.35, shop: 0.35, apt: 0.35,
      rain: 0, snow: 0, wet: 0.04, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.05, vignette: 0.9, grain: 0.03, aberration: 1.1,
      windowColor: '#ffcf9a', windowLight: 2.15,
      leafGreen: '#a88e6a', leafAutumn: '#c98f5e',
      people: 0, aurora: 0
    },
    ice: {
      skyTop: '#02090f', skyMid: '#123440', skyHorizon: '#2c6b72', skyGlow: '#7fe0d1',
      sunColor: '#d8fbff', sunDir: [-0.25, 0.3, -0.92], sunSize: 0.022, sunHalo: 0.7,
      moonDir: [0.42, 0.34, -0.95], moonAmount: 0.6,
      stars: 0.9, cloudColor: '#0d222a', cloudLit: '#275159', clouds: 0.1,
      fogColor: '#16333e', fogNear: 22, fogFar: 90,
      sunIntensity: 0.85, sunLightColor: '#d8fbff',
      lightFrom: [-0.2, 0.56, -0.8],
      hemiSky: '#5c9eaa', hemiGround: '#173039', hemiIntensity: 0.68,
      ambient: 0.28, ambientColor: '#1f3b44',
      lamp: 1.5, shop: 0.3, apt: 0.3,
      rain: 0, snow: 0, wet: 0.25, drops: 0.05, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.02, vignette: 0.9, grain: 0.024, aberration: 1.2,
      windowColor: '#c9f6ff', windowLight: 2.0,
      leafGreen: '#9fc9c9', leafAutumn: '#b7c8cd',
      people: 0, aurora: 0.35
    },
    firefly: {
      skyTop: '#020c09', skyMid: '#0b2620', skyHorizon: '#2c5142', skyGlow: '#a8dba0',
      sunColor: '#d8ffc0', sunDir: [-0.35, 0.42, -0.84], sunSize: 0.018, sunHalo: 0.35,
      moonDir: [-0.3, 0.4, -0.9], moonAmount: 0.7,
      stars: 0.35, cloudColor: '#0d211b', cloudLit: '#2b4a3a', clouds: 0.1,
      fogColor: '#0e2721', fogNear: 16, fogFar: 62,
      sunIntensity: 0.55, sunLightColor: '#c8e8b0',
      lightFrom: [-0.3, 0.58, -0.76],
      hemiSky: '#4d7566', hemiGround: '#101f18', hemiIntensity: 0.55,
      ambient: 0.25, ambientColor: '#1b3028',
      lamp: 1.6, shop: 0.3, apt: 0.3,
      rain: 0, snow: 0, wet: 0.18, drops: 0, caps: 0, birds: 0, fireflies: 1.4,
      exposure: 1.03, vignette: 0.92, grain: 0.03, aberration: 1.05,
      windowColor: '#d6f0a8', windowLight: 1.75,
      leafGreen: '#67a06f', leafAutumn: '#94a06a',
      people: 0, aurora: 0
    },
    booksea: {
      skyTop: '#140d17', skyMid: '#3a2422', skyHorizon: '#8c5a3d', skyGlow: '#e8b075',
      sunColor: '#ffd9a2', sunDir: [0.4, 0.3, -0.87], sunSize: 0.022, sunHalo: 0.4,
      moonDir: [0.4, 0.3, -1], moonAmount: 0.2,
      stars: 0.25, cloudColor: '#2b1c1d', cloudLit: '#5d3c30', clouds: 0.08,
      fogColor: '#3c2a26', fogNear: 20, fogFar: 72,
      sunIntensity: 0.7, sunLightColor: '#f0cf9e',
      lightFrom: [0.36, 0.56, -0.78],
      hemiSky: '#8a6a5a', hemiGround: '#241713', hemiIntensity: 0.6,
      ambient: 0.3, ambientColor: '#38251d',
      lamp: 1.4, shop: 0.4, apt: 0.3,
      rain: 0, snow: 0, wet: 0.06, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 1.0, vignette: 0.93, grain: 0.032, aberration: 1.1,
      windowColor: '#ffd8a5', windowLight: 2.2,
      leafGreen: '#8b8a63', leafAutumn: '#b58d64',
      people: 0, aurora: 0
    },
    moon: {
      skyTop: '#000206', skyMid: '#040812', skyHorizon: '#101a2c', skyGlow: '#5b7fb5',
      sunColor: '#ffffff', sunDir: [0.5, 0.45, -0.78], sunSize: 0.018, sunHalo: 0.4,
      moonDir: [-0.4, 0.3, -1], moonAmount: 0,
      stars: 1.5, cloudColor: '#05080f', cloudLit: '#192235', clouds: 0,
      fogColor: '#0a0f1c', fogNear: 30, fogFar: 130,
      sunIntensity: 1.25, sunLightColor: '#dfe9ff',
      lightFrom: [0.4, 0.62, -0.72],
      hemiSky: '#5f75a0', hemiGround: '#141822', hemiIntensity: 0.5,
      ambient: 0.22, ambientColor: '#1c2233',
      lamp: 1.5, shop: 0.3, apt: 0.25,
      rain: 0, snow: 0, wet: 0, drops: 0, caps: 0, birds: 0, fireflies: 0,
      exposure: 0.98, vignette: 0.9, grain: 0.02, aberration: 1.35,
      windowColor: '#dbe6ff', windowLight: 2.0,
      leafGreen: '#9fb28c', leafAutumn: '#bcb49c',
      people: 0, aurora: 0
    },
    meadow: {
      skyTop: '#0a0820', skyMid: '#2c2248', skyHorizon: '#755a7e', skyGlow: '#f4bcc2',
      sunColor: '#ffe1d2', sunDir: [-0.42, 0.22, -0.88], sunSize: 0.02, sunHalo: 0.3,
      moonDir: [-0.4, 0.25, -0.92], moonAmount: 1.2,
      stars: 0.9, cloudColor: '#241c38', cloudLit: '#5f4868', clouds: 0.06,
      fogColor: '#403551', fogNear: 26, fogFar: 100,
      sunIntensity: 0.6, sunLightColor: '#ffd7ca',
      lightFrom: [-0.38, 0.5, -0.78],
      hemiSky: '#806f9e', hemiGround: '#2a2138', hemiIntensity: 0.6,
      ambient: 0.28, ambientColor: '#372c46',
      lamp: 1.3, shop: 0.3, apt: 0.3,
      rain: 0, snow: 0, wet: 0.08, drops: 0, caps: 0, birds: 0, fireflies: 0.8,
      exposure: 1.0, vignette: 0.92, grain: 0.03, aberration: 1.1,
      windowColor: '#ffd9e2', windowLight: 1.8,
      leafGreen: '#7f9e7a', leafAutumn: '#c79a9c',
      people: 0, aurora: 0
    }
  };

  function cloneState(look) {
    const s = {};
    Object.keys(look).forEach((k) => {
      const v = look[k];
      if (typeof v === 'string' && v[0] === '#') s[k] = new THREE.Color(v);
      else if (Array.isArray(v)) s[k] = new THREE.Vector3(v[0], v[1], v[2]).normalize();
      else s[k] = v;
    });
    return s;
  }

  function blendState(cur, target, k) {
    Object.keys(target).forEach((key) => {
      const tv = target[key];
      const cv = cur[key];
      if (tv && tv.isColor) cv.lerp(tv, k);
      else if (tv && tv.isVector3) cv.lerp(tv, k);
      else if (typeof tv === 'number') cur[key] = U.lerp(cv, tv, k);
    });
  }

  /* ———————————————————— 天空着色器 ———————————————————— */
  const SKY_VERT = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const SKY_FRAG = `
    precision highp float;
    varying vec3 vDir;
    uniform vec3 uTop, uMid, uHorizon, uGlowColor, uSunColor, uSunDir, uMoonColor, uMoonDir;
    uniform vec3 uAuroraA, uAuroraB;
    uniform float uTime, uSunSize, uSunHalo, uMoonAmount, uStars, uExposure, uAurora;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    vec3 aces(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }
    void main() {
      vec3 dir = normalize(vDir);
      float h = clamp(dir.y, -0.2, 1.0);
      vec3 sunDir = normalize(uSunDir);
      vec3 moonDir = normalize(uMoonDir);

      vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.26, h));
      col = mix(col, uTop, smoothstep(0.18, 0.78, h));

      // 太阳一侧的地平线光晕
      vec2 sunAz = normalize(sunDir.xz + vec2(0.0001));
      vec2 dirAz = normalize(dir.xz + vec2(0.0001));
      float az = max(dot(dirAz, sunAz), 0.0);
      float horizonGlow = pow(az, 5.0) * exp(-max(h, 0.0) * 7.0);
      col += uGlowColor * horizonGlow * (0.35 + uSunHalo * 0.35);

      // 太阳
      float cosA = dot(dir, sunDir);
      float ang = acos(clamp(cosA, -1.0, 1.0));
      float disc = 1.0 - smoothstep(uSunSize * 0.75, uSunSize * 1.12, ang);
      float halo = pow(max(cosA, 0.0), 220.0) * 0.8 + pow(max(cosA, 0.0), 24.0) * 0.08;
      col += uSunColor * disc * 3.2 * uSunHalo;
      col += uSunColor * halo * uSunHalo;

      // 月亮
      float mAng = acos(clamp(dot(dir, moonDir), -1.0, 1.0));
      float mDisc = 1.0 - smoothstep(0.012, 0.03, mAng);
      float mHalo = pow(max(dot(dir, moonDir), 0.0), 320.0);
      col += uMoonColor * (mDisc * 1.1 + mHalo * 0.5) * uMoonAmount;

      // 星
      if (uStars > 0.001) {
        vec2 sc = dir.xz / max(dir.y + 0.55, 0.15);
        vec2 cell = floor(sc * 70.0);
        float hs = hash21(cell);
        float star = smoothstep(0.9955, 1.0, hs);
        float tw = 0.65 + 0.35 * sin(uTime * 1.6 + hs * 60.0);
        star *= smoothstep(0.02, 0.2, dir.y);
        col += vec3(0.85, 0.92, 1.0) * star * tw * uStars * 1.8;
        // 稀疏的大星
        vec2 cell2 = floor(sc * 28.0);
        float hs2 = hash21(cell2 + 13.7);
        float big = smoothstep(0.996, 1.0, hs2) * smoothstep(0.04, 0.24, dir.y);
        col += vec3(1.0, 0.94, 0.82) * big * (0.7 + 0.3 * sin(uTime * 0.9 + hs2 * 30.0)) * uStars * 2.2;
      }

      // 极光：几束宽窄不一的垂帘从屋檐升起，帘脚被风拂出起伏
      if (uAurora > 0.001) {
        float az = atan(dir.x, -dir.z);
        float front = smoothstep(-1.5, -0.55, az) * (1.0 - smoothstep(0.5, 1.45, az));

        // 低频帘幕决定哪里亮、哪里留出暗缝
        float curtain1 = 0.5 + 0.5 * sin(az * 4.3 + 1.1 + sin(az * 2.2 - uTime * 0.02) * 1.3);
        float curtain2 = 0.5 + 0.5 * sin(az * 8.6 - 0.4 + uTime * 0.015);
        float curtain = 0.22 + 0.78 * pow(curtain1, 2.4) * (0.5 + 0.5 * curtain2);

        // 中频褶皱与细丝缕，模拟被高空风拉长的光柱
        float warp = sin(az * 11.0 + uTime * 0.05 + sin(az * 5.0) * 0.8) * 3.4;
        float rayP = az * 110.0 + warp + h * 26.0 + uTime * 0.12;
        float fold = pow(0.5 + 0.5 * sin(rayP), 4.0);
        float fiber = pow(0.5 + 0.5 * sin(rayP * 2.6 + 1.2 - uTime * 0.09), 8.0);
        float rays = 0.58 * fold + 0.42 * fiber;

        // 帘脚高度随方位起伏，避免一条笔直的光边
        float hemH = 0.062 + sin(az * 5.6 + uTime * 0.045) * 0.011 + sin(az * 13.0 - 0.6) * 0.0035;
        float body = smoothstep(hemH - 0.004, hemH + 0.05, h) * (1.0 - smoothstep(0.155, 0.235, h));
        float hem = exp(-pow((h - hemH) / 0.0075, 2.0));
        float below = exp(-pow((h - hemH + 0.016) / 0.019, 2.0));

        vec3 auroraCol = mix(uAuroraA, uAuroraB, smoothstep(0.1, 0.19, h) * 0.6);
        float strength = body * (0.09 + 1.1 * rays) + hem * (0.28 + 0.72 * rays);
        col += auroraCol * strength * curtain * front * uAurora * 1.35;
        col += uAuroraA * below * (0.1 + 0.14 * rays) * curtain * front * uAurora;

        // 上层紫色光尖，只在少数帘幕顶端探出
        float upper = smoothstep(0.13, 0.16, h) * (1.0 - smoothstep(0.185, 0.245, h));
        float upperRay = pow(0.5 + 0.5 * sin(rayP * 0.55 + 2.3 + uTime * 0.05), 9.0);
        float upperMask = pow(0.5 + 0.5 * sin(az * 9.0 + 0.9 + sin(az * 3.1) * 0.8), 2.0);
        col += uAuroraB * upper * (0.18 + 0.82 * upperRay) * upperMask * curtain * front * uAurora * 0.55;

        // 极光落在地平线上的余光
        col += uAuroraA * front * exp(-max(h - 0.04, 0.0) * 22.0) * smoothstep(-0.01, 0.03, h) * uAurora * 0.08;
      }

      // 地平线薄雾
      col = mix(col, uHorizon, exp(-max(h, 0.0) * 26.0) * 0.16);

      col = aces(col * uExposure);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ———————————————————— 点粒子（雨／雪） ———————————————————— */
  const PRECIP_VERT = `
    attribute float aSeed;
    attribute float aSpeed;
    uniform float uTime, uHeight, uSize, uPixel;
    varying float vFade;
    void main() {
      vec3 p = position;
      p.y = mod(position.y - uTime * aSpeed, uHeight);
      p.x += sin(uTime * 0.35 + aSeed * 6.283) * 0.32;
      p.z += cos(uTime * 0.23 + aSeed * 4.1) * 0.22;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float d = max(-mv.z, 0.001);
      gl_PointSize = uSize * uPixel * (240.0 / d);
      gl_Position = projectionMatrix * mv;
      vFade = smoothstep(1.5, 5.0, d) * (1.0 - smoothstep(23.0, 32.0, d));
    }
  `;

  const RAIN_FRAG = `
    precision mediump float;
    uniform sampler2D uMap;
    uniform vec3 uColor;
    uniform float uAmount;
    varying float vFade;
    void main() {
      vec4 t = texture2D(uMap, gl_PointCoord);
      float a = t.a * vFade * uAmount * 0.5;
      if (a < 0.004) discard;
      gl_FragColor = vec4(uColor, a);
    }
  `;

  const SNOW_FRAG = `
    precision mediump float;
    uniform sampler2D uMap;
    uniform vec3 uColor;
    uniform float uAmount;
    varying float vFade;
    void main() {
      vec4 t = texture2D(uMap, gl_PointCoord);
      float a = t.a * vFade * uAmount * 0.85;
      if (a < 0.004) discard;
      gl_FragColor = vec4(uColor, a);
    }
  `;

  function rainTexture() {
    return U.canvasTexture(SK.textCanvas(32, 96, (ctx) => {
      const g = ctx.createLinearGradient(16, 0, 16, 96);
      g.addColorStop(0, 'rgba(220,240,250,0)');
      g.addColorStop(0.35, 'rgba(220,240,250,0.85)');
      g.addColorStop(0.8, 'rgba(220,240,250,0.5)');
      g.addColorStop(1, 'rgba(220,240,250,0)');
      ctx.fillStyle = g;
      ctx.fillRect(14, 0, 4, 96);
      ctx.filter = 'blur(1px)';
      ctx.fillStyle = 'rgba(220,240,250,0.35)';
      ctx.fillRect(13, 10, 6, 76);
    }), { clamp: true, aniso: 1 });
  }

  function snowTexture() {
    return U.canvasTexture(SK.textCanvas(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fill();
    }), { clamp: true, aniso: 1 });
  }

  /* ———————————————————— 主构建 ———————————————————— */
  WP.buildStreet = function (scene, M) {
    const CFG = WP.CONFIG;
    const root = new THREE.Group();
    root.name = 'street';
    scene.add(root);

    const current = cloneState(LOOKS.dusk);
    let target = cloneState(LOOKS.dusk);
    let mood = 'dusk';
    let transition = 1;
    let onMood = null;

    const ctx = {
      scene, root, M,
      state: current,
      mats: {}, tex: {}, snowMeshes: [], snowMat: null,
      lamps: [], glowMats: [], wetMeshes: [], updaters: [],
      addUpdate(fn) { this.updaters.push(fn); },
      addGlow(mat, base, kind) {
        mat.userData.dynamic = true;
        this.glowMats.push({ mat, base: base === undefined ? 1 : base, kind: kind || 'shop' });
      },
      addLamp(entry) {
        if (entry.bulbMat) entry.bulbMat.userData.dynamic = true;
        if (entry.glassMat) entry.glassMat.userData.dynamic = true;
        this.lamps.push(entry);
      },
      addSnow(mesh) {
        mesh.material = ctx.snowMat;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        this.snowMeshes.push(mesh);
        return mesh;
      },
      addWet(mesh) { this.wetMeshes.push(mesh); return mesh; },
      glowTex: M.glowTex,
      moss: null
    };

    /* 基础贴图与材质 */
    const tex = ctx.tex;
    const mats = ctx.mats;

    const sidewalkTex = T.sidewalk();
    sidewalkTex.repeat.set(14, 2.2);
    const asphaltTex = T.asphalt();
    asphaltTex.repeat.set(12, 2.2);
    tex.sidewalk = sidewalkTex;
    tex.asphalt = asphaltTex;
    tex.cafeWin = M.cafeTex;
    tex.floristWin = SK.floristTexture();
    tex.bookWin = SK.bookshopTexture();
    tex.awningCafe = SK.stripeTexture('#e8dcc2', '#a45343', 7, true);
    tex.awningFlower = SK.stripeTexture('#dfd7c2', '#586b52', 8, true);
    tex.awningBook = SK.stripeTexture('#384a3d', '#2b3a30', 9, true);
    tex.valanceCafe = SK.valanceTexture(tex.awningCafe);
    tex.valanceFlower = SK.valanceTexture(tex.awningFlower);
    tex.valanceBook = SK.valanceTexture(tex.awningBook);
    tex.cloud = T.cloud();
    tex.streetLampGlow = M.glowTex;
    tex.rain = rainTexture();
    tex.snow = snowTexture();
    tex.clockFace = SK.clockTexture();

    tex.signCafe = SK.signTexture({
      main: '晚风咖啡', sub: 'EVENING BREEZE · EST. 1998', bg: '#1f2a24',
      fg: '#ead9b4', mainSize: 118, w: 1024, h: 300, spacing: 14
    });
    tex.signFlower = SK.signTexture({
      main: '花 房', sub: 'FLOWER HOUSE', bg: '#55654f', fg: '#f1e6c9',
      mainSize: 126, w: 900, h: 280, spacing: 24, line: 'rgba(240,230,200,0.75)'
    });
    tex.signBook = SK.signTexture({
      main: '旧书店', sub: 'SECONDHAND BOOKS', bg: '#26342c', fg: '#e0c998',
      mainSize: 120, w: 1024, h: 300, spacing: 10
    });
    tex.signCafeSide = SK.verticalSignTexture({ text: '咖啡', sub: 'COFFEE', bg: '#26362c', fg: '#eadbb8' });
    tex.signFlowerSide = SK.verticalSignTexture({ text: '花', sub: 'FLOWER', bg: '#5b6b53', fg: '#f4ead0', cell: 220 });
    tex.signBookSide = SK.verticalSignTexture({ text: '書', sub: 'BOOKS', bg: '#2c3a31', fg: '#e6d2a8', cell: 220 });
    tex.signOpen = SK.signTexture({
      main: '营业中', sub: 'OPEN', bg: '#2a2b25', fg: '#f2dfb5', w: 512, h: 256,
      mainSize: 74, double: false, grain: false
    });
    tex.signAddress = SK.signTexture({
      main: '窗畔街 07', sub: 'WINDOWLIGHT ST.', bg: '#37433a', fg: '#efe1bf',
      w: 512, h: 256, mainSize: 66, double: false, grain: false
    });
    tex.signStreet = SK.signTexture({
      main: '窗 畔 街', sub: 'WINDOWLIGHT STREET', bg: '#1f2c35', fg: '#e9ddc2',
      w: 1024, h: 300, mainSize: 100, spacing: 18, line: 'rgba(230,215,185,0.75)'
    });
    tex.chalkCafe = SK.chalkboardTexture('今日 · 手冲', ['晚风拼配  38', '桂花拿铁  42', '柠檬挞  28'], 5);
    tex.chalkFlower = SK.chalkboardTexture('今日花束', ['芍药 · 尤加利', '白玫瑰 · 雪柳', '把小春天带回家'], 9);
    tex.chalkBook = SK.chalkboardTexture('旧书收购', ['一册一册地', '把时间收进来'], 3);

    mats.curb = new THREE.MeshStandardMaterial({ color: 0xa39a8b, roughness: 0.86, metalness: 0.02 });
    mats.road = new THREE.MeshStandardMaterial({
      map: asphaltTex, color: 0x939b9e, roughness: 0.9, metalness: 0.03,
      envMapIntensity: 0.45
    });
    mats.sidewalk = new THREE.MeshStandardMaterial({ map: sidewalkTex, color: 0xc8c0b0, roughness: 0.9, metalness: 0.02 });
    mats.sidewalkFar = new THREE.MeshStandardMaterial({ map: sidewalkTex, color: 0xcfc7b6, roughness: 0.88, metalness: 0.02 });
    mats.road.userData.dynamic = true;
    mats.sidewalk.userData.dynamic = true;
    mats.sidewalkFar.userData.dynamic = true;
    mats.brickCafe = new THREE.MeshStandardMaterial({
      map: T.brick({ seed: 12, palette: ['#84513c', '#916049', '#744636', '#9d6b52'], mortar: '#b9a78f', bw: 64, bh: 24, repeat: [3.2, 4.5] }),
      color: 0xcfae94, roughness: 0.9, metalness: 0.01
    });
    const flowerMap = T.stone({ seed: 44, repeat: [2, 2] });
    mats.plasterFlower = new THREE.MeshStandardMaterial({ map: flowerMap, color: 0xd6cfb4, roughness: 0.94, metalness: 0 });
    const bookMap = T.stone({ seed: 77, repeat: [2.4, 3] });
    mats.plasterBook = new THREE.MeshStandardMaterial({ map: bookMap, color: 0xc4b9a8, roughness: 0.92, metalness: 0 });
    mats.darkGreen = new THREE.MeshStandardMaterial({ color: 0x293b30, roughness: 0.6, metalness: 0.04 });
    mats.greenPaint = new THREE.MeshStandardMaterial({ color: 0x3e5343, roughness: 0.58, metalness: 0.04 });
    mats.cream = new THREE.MeshStandardMaterial({ color: 0xd9cbb1, roughness: 0.62, metalness: 0.02 });
    mats.trimStone = new THREE.MeshStandardMaterial({ color: 0xbcae98, roughness: 0.7, metalness: 0.02 });
    mats.iron = new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.5, metalness: 0.55 });
    mats.roof = new THREE.MeshStandardMaterial({ color: 0x383d3e, roughness: 0.8, metalness: 0.08 });
    mats.wood = M.walnut;
    mats.woodDark = M.darkWood;
    mats.brass = M.brass;
    /* 路灯箍环与门底护板引用这个键；缺失时 Three 会退回纯白默认材质，远看像一排白条 */
    mats.brassDark = M.brassDark;
    mats.awningCafe = new THREE.MeshStandardMaterial({ map: tex.awningCafe, side: THREE.DoubleSide, roughness: 0.92 });
    mats.awningFlower = new THREE.MeshStandardMaterial({ map: tex.awningFlower, side: THREE.DoubleSide, roughness: 0.92 });
    mats.awningBook = new THREE.MeshStandardMaterial({ map: tex.awningBook, side: THREE.DoubleSide, roughness: 0.94 });
    mats.valanceCafe = new THREE.MeshStandardMaterial({
      map: tex.valanceCafe, transparent: true, alphaTest: 0.45,
      side: THREE.DoubleSide, roughness: 0.94
    });
    mats.valanceFlower = new THREE.MeshStandardMaterial({
      map: tex.valanceFlower, transparent: true, alphaTest: 0.45,
      side: THREE.DoubleSide, roughness: 0.94
    });
    mats.valanceBook = new THREE.MeshStandardMaterial({
      map: tex.valanceBook, transparent: true, alphaTest: 0.45,
      side: THREE.DoubleSide, roughness: 0.94
    });
    mats.aptFrame = new THREE.MeshStandardMaterial({ color: 0x3a342b, roughness: 0.62 });
    mats.aptMat = M.aptTex.map((t, i) => new THREE.MeshStandardMaterial({
      map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.95,
      roughness: 0.55, metalness: 0.02
    }));
    mats.shopGlass = {
      cafe: new THREE.MeshStandardMaterial({
        map: tex.cafeWin, emissive: 0xffffff, emissiveMap: tex.cafeWin, emissiveIntensity: 1.15,
        roughness: 0.5, metalness: 0.02
      }),
      flower: new THREE.MeshStandardMaterial({
        map: tex.floristWin, emissive: 0xffffff, emissiveMap: tex.floristWin, emissiveIntensity: 1.0,
        roughness: 0.55, metalness: 0
      }),
      book: new THREE.MeshStandardMaterial({
        map: tex.bookWin, emissive: 0xffffff, emissiveMap: tex.bookWin, emissiveIntensity: 1.0,
        roughness: 0.55, metalness: 0
      })
    };
    mats.lampGlow = new THREE.MeshBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: 0.9 });
    mats.lampGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffc47a, transparent: true, opacity: 0.45, roughness: 0.1,
      metalness: 0.0, side: THREE.DoubleSide
    });
    mats.signMat = {};
    Object.keys(tex).forEach((k) => {
      if (k.indexOf('sign') === 0 || k.indexOf('chalk') === 0) {
        mats.signMat[k] = new THREE.MeshBasicMaterial({ map: tex[k], side: THREE.DoubleSide });
      }
    });
    mats.snow = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8, roughness: 0.72, metalness: 0.0,
      transparent: true, opacity: 0, depthWrite: false
    });
    ctx.snowMat = mats.snow;
    // 窗光统一登记（材质共享，只登记一次）
    mats.aptMat.forEach((m) => ctx.addGlow(m, 0.95, 'apt'));
    ctx.addGlow(mats.shopGlass.cafe, 1.15, 'shop');
    ctx.addGlow(mats.shopGlass.flower, 1.0, 'shop');
    ctx.addGlow(mats.shopGlass.book, 1.0, 'shop');

    mats.leafGreen = new THREE.MeshStandardMaterial({
      map: T.leaf('green'), alphaTest: 0.42, side: THREE.DoubleSide,
      roughness: 0.85, metalness: 0, color: 0xbfc7a8
    });
    mats.leafAutumn = new THREE.MeshStandardMaterial({
      map: T.leaf('autumn'), alphaTest: 0.42, side: THREE.DoubleSide,
      roughness: 0.85, metalness: 0, color: 0xd9c0a0
    });
    mats.leafGreen.userData.dynamic = true;
    mats.leafAutumn.userData.dynamic = true;
    mats.bark = new THREE.MeshStandardMaterial({ color: 0x3e3127, roughness: 0.94, metalness: 0 });
    mats.flowerStem = new THREE.MeshStandardMaterial({ color: 0x4d6442, roughness: 0.9 });
    mats.planter = new THREE.MeshStandardMaterial({ color: 0x4a3b2e, roughness: 0.85 });
    mats.cloth = M.clothMap;

    /* 光 */
    const hemi = new THREE.HemisphereLight(0x66739b, 0x4f362b, 0.55);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0x3a2b23, 0.25);
    scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xffb98a, 2.05);
    sunLight.castShadow = true;
    const shadowRes = window.matchMedia('(max-width: 900px)').matches ? 1024 : 2048;
    sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 14;
    sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 80;
    /* 墙面这种大面积斜视表面最怕自阴影条纹：抬高 normalBias，
       让 2048 阴影图的采样误差落在表面外侧，摩尔纹随之消失 */
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.075;
    const sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 1, -6);
    scene.add(sunTarget);
    sunLight.target = sunTarget;
    scene.add(sunLight);

    /* 天空 */
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: current.skyTop.clone() },
        uMid: { value: current.skyMid.clone() },
        uHorizon: { value: current.skyHorizon.clone() },
        uGlowColor: { value: current.skyGlow.clone() },
        uSunColor: { value: current.sunColor.clone() },
        uSunDir: { value: current.sunDir.clone() },
        uMoonColor: { value: new THREE.Color(0xdfe6f5) },
        uMoonDir: { value: current.moonDir.clone() },
        uTime: { value: 0 },
        uSunSize: { value: current.sunSize },
        uSunHalo: { value: current.sunHalo },
        uMoonAmount: { value: current.moonAmount },
        uStars: { value: current.stars },
        uExposure: { value: current.exposure },
        uAurora: { value: current.aurora },
        uAuroraA: { value: new THREE.Color(0x48ffc9) },
        uAuroraB: { value: new THREE.Color(0x9b62ff) }
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 32), skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    scene.add(sky);
    scene.fog = new THREE.Fog(current.fogColor.clone(), current.fogNear, current.fogFar);

    /* 云 */
    const cloudLow = [];
    const cloudHigh = [];
    const cloudSpecs = [
      [-18, 9.2, -38, 22, 8, 0.6, 0],
      [-5, 10.8, -42, 26, 9, 0.5, 1],
      [12, 8.6, -40, 20, 7, 0.55, 0],
      [24, 11.4, -46, 28, 10, 0.4, 1],
      [-28, 7.6, -40, 18, 6, 0.5, 0],
      [5, 7.2, -36, 16, 5.5, 0.45, 0],
      [30, 6.8, -38, 14, 5, 0.35, 0]
    ];
    cloudSpecs.forEach((s, i) => {
      const m = new THREE.SpriteMaterial({
        map: tex.cloud, color: 0xffffff, transparent: true, opacity: 0,
        depthWrite: false, fog: false
      });
      const sp = new THREE.Sprite(m);
      sp.position.set(s[0], s[1], s[2]);
      sp.scale.set(s[3], s[4], 1);
      scene.add(sp);
      (s[6] ? cloudHigh : cloudLow).push({ sprite: sp, base: s[5], speed: 0.08 + i * 0.012 });
    });

    /* 地面 */
    const groundG = new THREE.Group();
    root.add(groundG);
    function groundPlane(w, d, y, mat, x, z) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.receiveShadow = true;
      groundG.add(m);
      return m;
    }
    groundPlane(46, 3.7, -0.155, mats.sidewalk, 0, -5.45);
    groundPlane(48, 5.3, SK.ROAD_Y, mats.road, 0, -9.95);
    groundPlane(46, 3.9, -0.142, mats.sidewalkFar, 0, -14.35);
    // 路缘石
    SK.box(groundG, 48, 0.17, 0.28, mats.curb, 0, -0.115, -7.36, false, true);
    SK.box(groundG, 48, 0.17, 0.28, mats.curb, 0, -0.115, -12.53, false, true);
    // 排水沟
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x4a4d4c, roughness: 0.7, metalness: 0.2 });
    SK.box(groundG, 48, 0.02, 0.22, gutterMat, 0, -0.172, -7.56, false, true);
    SK.box(groundG, 48, 0.02, 0.22, gutterMat, 0, -0.172, -12.34, false, true);

    // 中心虚线
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd6cfb9, roughness: 0.75, transparent: true, opacity: 0.36 });
    for (let i = 0; i < 14; i++) {
      const m = SK.box(groundG, 1.1, 0.008, 0.1, lineMat, -15 + i * 2.3, -0.185, -9.95, false, true);
      m.castShadow = false;
    }
    // 井盖
    const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 28), new THREE.MeshStandardMaterial({
      color: 0x3d4142, roughness: 0.55, metalness: 0.5
    }));
    manhole.position.set(-1.15, -0.184, -10.65);
    manhole.receiveShadow = true;
    groundG.add(manhole);
    const manholeRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.025, 6, 30), new THREE.MeshStandardMaterial({ color: 0x54595a, roughness: 0.5, metalness: 0.6 }));
    manholeRing.rotation.x = -Math.PI / 2;
    manholeRing.position.set(-1.15, -0.174, -10.65);
    groundG.add(manholeRing);

    /* 雨与雪 */
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 2500;
    const rp = new Float32Array(rainCount * 3);
    const rs = new Float32Array(rainCount);
    const rsp = new Float32Array(rainCount);
    const rr = U.mulberry32(301);
    for (let i = 0; i < rainCount; i++) {
      rp[i * 3] = -13 + rr() * 26;
      rp[i * 3 + 1] = rr() * 12;
      rp[i * 3 + 2] = -16.2 + rr() * 11.6;
      rs[i] = rr();
      rsp[i] = 8.5 + rr() * 6.5;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rainGeo.setAttribute('aSeed', new THREE.BufferAttribute(rs, 1));
    rainGeo.setAttribute('aSpeed', new THREE.BufferAttribute(rsp, 1));
    const rainMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uHeight: { value: 12 }, uSize: { value: 0.26 },
        uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uMap: { value: tex.rain }, uColor: { value: new THREE.Color(0xd4e6ee) }, uAmount: { value: 0 }
      },
      vertexShader: PRECIP_VERT, fragmentShader: RAIN_FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending
    });
    const rain = new THREE.Points(rainGeo, rainMat);
    rain.position.y = -0.2;
    rain.frustumCulled = false;
    root.add(rain);

    const snowGeo = new THREE.BufferGeometry();
    const snowCount = 1700;
    const sp = new Float32Array(snowCount * 3);
    const ss = new Float32Array(snowCount);
    const ssp = new Float32Array(snowCount);
    const sr = U.mulberry32(401);
    for (let i = 0; i < snowCount; i++) {
      sp[i * 3] = -13 + sr() * 26;
      sp[i * 3 + 1] = sr() * 11;
      sp[i * 3 + 2] = -16.2 + sr() * 11.8;
      ss[i] = sr();
      ssp[i] = 0.5 + sr() * 0.9;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    snowGeo.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    snowGeo.setAttribute('aSpeed', new THREE.BufferAttribute(ssp, 1));
    const snowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uHeight: { value: 11 }, uSize: { value: 0.16 },
        uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uMap: { value: tex.snow }, uColor: { value: new THREE.Color(0xf6f7fb) }, uAmount: { value: 0 }
      },
      vertexShader: PRECIP_VERT, fragmentShader: SNOW_FRAG,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending
    });
    const snow = new THREE.Points(snowGeo, snowMat);
    snow.position.y = -0.2;
    snow.frustumCulled = false;
    root.add(snow);

    /* 窗玻璃雨珠 */
    const dropMat = new THREE.MeshBasicMaterial({
      map: M.rainGlassTex, color: 0xdceef1, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false
    });
    const winH = CFG.window.y1 - CFG.window.y0;
    const drops = new THREE.Mesh(new THREE.PlaneGeometry(CFG.window.x1 - CFG.window.x0 - 0.04, winH - 0.04), dropMat);
    drops.position.set(0, (CFG.window.y0 + CFG.window.y1) / 2, CFG.room.wallZ - 0.09);
    drops.renderOrder = 3;
    root.add(drops);
    const dropTex2 = M.rainGlassTex.clone();
    dropTex2.needsUpdate = true;
    dropTex2.repeat.set(1.7, 1.5);
    dropTex2.offset.set(0.27, 0.11);
    const dropMat2 = new THREE.MeshBasicMaterial({
      map: dropTex2, color: 0xe7f3f4, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false
    });
    const drops2 = new THREE.Mesh(new THREE.PlaneGeometry(CFG.window.x1 - CFG.window.x0 - 0.04, winH - 0.04), dropMat2);
    drops2.position.set(0, (CFG.window.y0 + CFG.window.y1) / 2, CFG.room.wallZ - 0.095);
    drops2.renderOrder = 4;
    root.add(drops2);

    /* 街景建筑与生活层 */
    if (WP.StreetBuildings) WP.StreetBuildings.build(ctx);
    if (WP.StreetLife) WP.StreetLife.build(ctx);

    /* 静态合批：建筑、树木、招牌、小物按材质合并；
       行人、车、鸟、钟针与透明特效已被排除在外 */
    const mergeStats = U.mergeStatic(root);
    /* 积雪帽本来是几十个小盒子，只在雪天出现：合成一块，省掉大半透明绘制 */
    const snowPlain = ctx.snowMeshes.filter((m) => m.isMesh && !m.isInstancedMesh);
    if (snowPlain.length > 1) {
      const mergedSnow = U.mergeMeshList(snowPlain, ctx.snowMat, root);
      if (mergedSnow) {
        mergedSnow.visible = false;
        ctx.snowMeshes = ctx.snowMeshes.filter((m) => snowPlain.indexOf(m) < 0);
        ctx.snowMeshes.push(mergedSnow);
      }
    }

    /* 每帧更新 */
    function update(dt, t) {
      const targetState = target;
      blendState(current, targetState, 1 - Math.exp(-dt * 1.45));
      if (transition < 1) transition = Math.min(1, transition + dt * 0.35);

      const u = skyMat.uniforms;
      u.uTop.value.copy(current.skyTop);
      u.uMid.value.copy(current.skyMid);
      u.uHorizon.value.copy(current.skyHorizon);
      u.uGlowColor.value.copy(current.skyGlow);
      u.uSunColor.value.copy(current.sunColor);
      u.uSunDir.value.copy(current.sunDir);
      u.uMoonDir.value.copy(current.moonDir);
      u.uSunSize.value = current.sunSize;
      u.uSunHalo.value = current.sunHalo;
      u.uMoonAmount.value = current.moonAmount;
      u.uStars.value = current.stars;
      u.uTime.value = t;
      u.uExposure.value = current.exposure;
      u.uAurora.value = current.aurora;

      sunLight.color.copy(current.sunLightColor);
      sunLight.intensity = current.sunIntensity;
      const lf = current.lightFrom;
      sunLight.position.set(
        sunTarget.position.x + lf.x * 38,
        sunTarget.position.y + lf.y * 38,
        sunTarget.position.z + lf.z * 38
      );
      hemi.color.copy(current.hemiSky);
      hemi.groundColor.copy(current.hemiGround);
      hemi.intensity = current.hemiIntensity;
      ambient.color.copy(current.ambientColor);
      ambient.intensity = current.ambient;

      if (scene.fog) {
        scene.fog.color.copy(current.fogColor);
        scene.fog.near = current.fogNear;
        scene.fog.far = current.fogFar;
      }

      // 材质湿度
      mats.road.roughness = U.lerp(0.9, 0.16, current.wet);
      mats.road.metalness = U.lerp(0.03, 0.4, current.wet);
      mats.road.envMapIntensity = U.lerp(0.35, 1.3, current.wet);
      mats.sidewalk.roughness = U.lerp(0.9, 0.36, current.wet);
      mats.sidewalkFar.roughness = U.lerp(0.88, 0.34, current.wet);
      mats.sidewalk.metalness = mats.sidewalkFar.metalness = U.lerp(0.02, 0.18, current.wet);

      // 街灯
      ctx.lamps.forEach((l) => {
        if (l.light) l.light.intensity = current.lamp * (l.base === undefined ? 1.0 : l.base);
        if (l.bulbMat) {
          l.bulbMat.color.setRGB(1, 0.82, 0.58);
          l.bulbMat.opacity = 0.35 + current.lamp * 0.65;
        }
        if (l.glow) l.glow.material.opacity = current.lamp * (l.glowBase === undefined ? 0.5 : l.glowBase);
        if (l.glassMat) l.glassMat.opacity = 0.25 + current.lamp * 0.4;
      });

      // 店铺与住宅窗光
      ctx.glowMats.forEach((g) => {
        if (g.kind === 'shop') g.mat.emissiveIntensity = g.base * current.shop;
        else if (g.kind === 'apt') g.mat.emissiveIntensity = g.base * current.apt;
        else g.mat.emissiveIntensity = g.base * current.shop;
      });

      // 雨雪
      rainMat.uniforms.uTime.value = t;
      rainMat.uniforms.uAmount.value = current.rain;
      rain.visible = current.rain > 0.005;
      snowMat.uniforms.uTime.value = t;
      snowMat.uniforms.uAmount.value = current.snow;
      snow.visible = current.snow > 0.005;
      dropMat.opacity = current.drops * 0.62;
      dropMat2.opacity = current.drops * 0.32;
      drops.visible = current.drops > 0.004;
      drops2.visible = current.drops > 0.004;
      dropTex2.offset.y = 0.11 + t * 0.005;
      M.rainGlassTex.offset.y = t * 0.003;

      // 树叶的季节与光色
      mats.leafGreen.color.copy(current.leafGreen);
      mats.leafAutumn.color.copy(current.leafAutumn);

      // 积雪
      const snowOn = current.caps > 0.02;
      skinsnow(snowOn);
      ctx.updaters.forEach((fn) => fn(dt, t, current));
    }

    function skinsnow(on) {
      mats.snow.opacity = U.clamp(current.caps * 1.05, 0, 1);
      for (let i = 0; i < ctx.snowMeshes.length; i++) ctx.snowMeshes[i].visible = on;
    }

    /* 状态切换 */
    function setMood(name, instant) {
      if (!LOOKS[name]) return;
      const changed = mood !== name;
      mood = name;
      target = cloneState(LOOKS[name]);
      if (instant) {
        Object.keys(target).forEach((k) => {
          if (target[k] && target[k].isColor) current[k].copy(target[k]);
          else if (target[k] && target[k].isVector3) current[k].copy(target[k]);
          else current[k] = target[k];
        });
      }
      if (changed && onMood) onMood(name, MOOD_META[name]);
      /* 幻境模块若已就绪，立即切换街景/幻境可见性（静帧测试也会经过这里） */
      if (WP.dreams && WP.dreams.setWorld) WP.dreams.setWorld(name);
    }

    /* 云与雨的缓慢漂移 */
    function driftClouds(dt) {
      const all = [cloudLow, cloudHigh];
      all.forEach((arr) => {
        arr.forEach((c) => {
          c.sprite.position.x += dt * c.speed;
          if (c.sprite.position.x > 34) c.sprite.position.x = -34;
        });
      });
    }
    ctx.addUpdate((dt, t, st) => {
      driftClouds(dt);
      cloudLow.forEach((c) => {
        c.sprite.material.color.copy(st.cloudColor);
        c.sprite.material.opacity = st.clouds * c.base;
      });
      cloudHigh.forEach((c) => {
        c.sprite.material.color.copy(st.cloudLit);
        c.sprite.material.opacity = st.clouds * c.base * 0.85;
      });
    });

    setMood(WP.U.getQuery('mood', 'dusk'), true);

    const street = {
      root, state: current, moods: MOOD_META, order: WP.MOOD_ORDER,
      setMood, update, mergeStats,
      set onMoodChange(fn) { onMood = fn; },
      get onMoodChange() { return onMood; },
      get mood() { return mood; },
      get transition() { return transition; },
      sunLight, hemi, skyMat, rainMat, snowMat,
      sky, cloudSprites: cloudLow.concat(cloudHigh)
    };
    WP.street = street;
    return street;
  };
})();
