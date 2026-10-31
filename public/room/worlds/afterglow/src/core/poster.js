import { formatDate } from './util.js';

export const POSTER_NODES = [
  { key: 'first', local: [-0.35, 0.72], color: '#f3e3c3', accent: '#d9b273', title: '初光', en: 'THE FIRST LIGHT' },
  { key: 'stardust', local: [0.42, 0.42], color: '#9fe0cf', accent: '#f0c78e', title: '星尘', en: 'STARDUST' },
  { key: 'tides', local: [-0.12, 0.08], color: '#a8c8e6', accent: '#e4c08e', title: '潮汐', en: 'TIDES' },
  { key: 'abyss', local: [0.58, -0.22], color: '#ff9a6c', accent: '#cbb2ff', title: '深渊', en: 'THE ABYSS' },
  { key: 'ember', local: [-0.15, -0.6], color: '#ff7c53', accent: '#f7c18a', title: '余烬', en: 'THE EMBER' },
];

const MEMORY_LINES = {
  first: '你看见所有颜色，从同一束光里分开。',
  stardust: '你给了它名字。它开始替你发光。',
  tides: '你把月亮推近，海就亮了。',
  abyss: '你在事件视界外，找回了光的回声。',
  ember: '你陪最后一颗星，走完了最后一程。',
};

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSpaced(ctx, text, x, y, spacing) {
  let cx = x;
  for (const ch of Array.from(text)) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx;
}

function star(ctx, x, y, r, alpha = 1, color = '255,255,255') {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
  g.addColorStop(0, `rgba(${color},1)`);
  g.addColorStop(0.18, `rgba(${color},0.8)`);
  g.addColorStop(0.5, `rgba(${color},0.12)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${color},1)`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function savePoster(state, { filename } = {}) {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch (e) {}
  const W = 1500;
  const H = 2000;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 底
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#05070c');
  bg.addColorStop(0.42, '#070b13');
  bg.addColorStop(1, '#0b0908');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const warm = ctx.createRadialGradient(1080, 980, 20, 1080, 980, 760);
  warm.addColorStop(0, 'rgba(96, 72, 40, 0.22)');
  warm.addColorStop(0.45, 'rgba(42, 52, 66, 0.14)');
  warm.addColorStop(1, 'rgba(5, 7, 12, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);

  const cool = ctx.createRadialGradient(360, 1300, 20, 360, 1300, 700);
  cool.addColorStop(0, 'rgba(31, 64, 82, 0.16)');
  cool.addColorStop(1, 'rgba(5, 7, 12, 0)');
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, W, H);

  // 星点
  const rng = seeded(20261029);
  for (let i = 0; i < 420; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const a = rng();
    const r = 0.6 + Math.pow(rng(), 3) * 2.1;
    ctx.globalAlpha = 0.25 + a * 0.65;
    ctx.fillStyle = a > 0.86 ? '#f7e5c8' : a > 0.6 ? '#dfeaff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 14; i++) {
    star(ctx, rng() * W, rng() * H, 1.1 + rng() * 1.4, 0.32 + rng() * 0.4, i % 4 === 0 ? '255,224,186' : '222,236,255');
  }

  // 边框
  ctx.strokeStyle = 'rgba(239,231,216,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(64.5, 64.5, W - 129, H - 129);
  ctx.strokeStyle = 'rgba(239,231,216,0.06)';
  ctx.strokeRect(88.5, 88.5, W - 177, H - 177);

  const ink = '#efe7d8';
  const faint = 'rgba(239,231,216,0.34)';
  const muted = 'rgba(239,231,216,0.58)';
  const accent = '#e4d3b0';

  // 顶部眉题
  ctx.fillStyle = 'rgba(228,211,176,0.6)';
  ctx.font = '300 17px "IBM Plex Mono", monospace';
  drawSpaced(ctx, 'FINAL ARCHIVE · VOL. 05', 140, 158, 5.2);
  ctx.textAlign = 'right';
  ctx.fillStyle = faint;
  ctx.font = '300 16px "IBM Plex Mono", monospace';
  ctx.fillText(formatDate(new Date()), W - 140, 158);
  ctx.textAlign = 'left';

  // 标题
  ctx.fillStyle = ink;
  ctx.font = '300 138px "Noto Serif SC", serif';
  ctx.fillText('余晖', 136, 330);
  ctx.fillStyle = 'rgba(228,211,176,0.65)';
  ctx.font = 'italic 300 36px "Cormorant Garamond", serif';
  drawSpaced(ctx, 'AFTERGLOW', 146, 392, 9);

  // 分隔线
  ctx.strokeStyle = 'rgba(239,231,216,0.16)';
  ctx.beginPath();
  ctx.moveTo(140, 450);
  ctx.lineTo(W - 140, 450);
  ctx.stroke();

  // 左侧：五段记忆
  const lines = ['纪念这一夜，宇宙把最后的五样东西交给你。', '这不是一张普通的星图，是一份光的收据。'];
  ctx.fillStyle = muted;
  ctx.font = '300 23px "Noto Serif SC", serif';
  ctx.fillText(lines[0], 140, 512);
  ctx.fillStyle = faint;
  ctx.font = '300 21px "Noto Serif SC", serif';
  ctx.fillText(lines[1], 140, 548);

  const listTop = 650;
  const rowH = 170;
  POSTER_NODES.forEach((n, i) => {
    const y = listTop + i * rowH;
    ctx.fillStyle = 'rgba(239,231,216,0.28)';
    ctx.font = '300 17px "IBM Plex Mono", monospace';
    ctx.fillText(`0${i + 1}`, 140, y);
    ctx.strokeStyle = 'rgba(239,231,216,0.13)';
    ctx.beginPath();
    ctx.moveTo(190, y - 6);
    ctx.lineTo(620, y - 6);
    ctx.stroke();

    ctx.fillStyle = n.color;
    ctx.font = '300 38px "Noto Serif SC", serif';
    ctx.fillText(n.title, 140, y + 44);
    ctx.fillStyle = 'rgba(239,231,216,0.3)';
    ctx.font = '300 13px "IBM Plex Mono", monospace';
    drawSpaced(ctx, n.en, 142, y + 70, 3.2);
    ctx.fillStyle = 'rgba(239,231,216,0.52)';
    ctx.font = '300 19px "Noto Serif SC", serif';
    ctx.fillText(MEMORY_LINES[n.key], 142, y + 104);

    // 小星
    star(ctx, 654, y + 54, 2.4, 0.8, i === 1 ? '159,224,207' : '243,227,195');
  });

  // 右侧：星座
  const cx = 1052;
  const cy = 1000;
  const scale = 410;
  const point = (l) => [cx + l[0] * scale, cy - l[1] * scale];
  const pts = POSTER_NODES.map((n) => point(n.local));

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(228,211,176,0.52)';
  ctx.font = '300 15px "IBM Plex Mono", monospace';
  drawSpaced(ctx, 'YOUR SKY', cx - 44, cy - 480, 5);
  ctx.fillStyle = 'rgba(239,231,216,0.8)';
  ctx.font = '300 34px "Noto Serif SC", serif';
  ctx.fillText('你的星空', cx, cy - 438);
  ctx.restore();

  // 星座连线
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const mx = (x1 + x2) / 2 + (i % 2 === 0 ? 18 : -18);
    const my = (y1 + y2) / 2 - 24;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, 'rgba(239,231,216,0.28)');
    grad.addColorStop(0.5, 'rgba(228,211,176,0.5)');
    grad.addColorStop(1, 'rgba(159,224,207,0.35)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx, my, x2, y2);
    ctx.stroke();
  }

  // 星座节点
  POSTER_NODES.forEach((n, i) => {
    const [x, y] = pts[i];
    const rgb = n.color.replace('#', '');
    const r = parseInt(rgb.slice(0, 2), 16);
    const g = parseInt(rgb.slice(2, 4), 16);
    const b = parseInt(rgb.slice(4, 6), 16);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 66);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.45)`);
    glow.addColorStop(0.35, `rgba(${r},${g},${b},0.12)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 66, 0, Math.PI * 2);
    ctx.fill();
    star(ctx, x, y, 4.2, 1, `${r},${g},${b}`);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();

    const left = n.local[0] < 0.2;
    ctx.textAlign = left ? 'right' : 'left';
    const tx = left ? x - 32 : x + 32;
    ctx.fillStyle = n.color;
    ctx.font = '300 24px "Noto Serif SC", serif';
    ctx.fillText(n.title, tx, y - 8);
    ctx.fillStyle = 'rgba(239,231,216,0.32)';
    ctx.font = '300 11px "IBM Plex Mono", monospace';
    const en = n.en;
    if (left) {
      const w = ctx.measureText(en).width;
      drawSpaced(ctx, en, tx - w - 2.2 * en.length, y + 14, 2.2);
    } else {
      drawSpaced(ctx, en, tx, y + 14, 2.2);
    }
  });

  // 若已命名，在星尘旁写出名字
  if (state.starName) {
    const [sx, sy] = pts[1];
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(159,224,207,0.85)';
    ctx.font = 'italic 300 24px "Cormorant Garamond", serif';
    ctx.fillText(`「${state.starName}」`, sx + 32, sy - 44);
  }

  // 底部：星名与结局
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(239,231,216,0.14)';
  ctx.beginPath();
  ctx.moveTo(140, 1670);
  ctx.lineTo(W - 140, 1670);
  ctx.stroke();

  ctx.fillStyle = 'rgba(239,231,216,0.35)';
  ctx.font = '300 14px "IBM Plex Mono", monospace';
  drawSpaced(ctx, 'THE STAR YOU NAMED', 140, 1724, 3.6);

  ctx.fillStyle = '#f7f0e2';
  ctx.font = '300 56px "Noto Serif SC", serif';
  ctx.fillText(state.starName || '未名', 140, 1786);
  ctx.fillStyle = 'rgba(239,231,216,0.32)';
  ctx.font = 'italic 300 24px "Cormorant Garamond", serif';
  ctx.fillText('the newest light in this universe', 146, 1822);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(228,211,176,0.78)';
  ctx.font = '300 24px "Noto Serif SC", serif';
  const close =
    state.ending === 'ignite' ? '最后一颗星，变成了第一颗。' : state.ending === 'fade' ? '长夜第一次，被人看见。' : '宇宙会忘记很多事，但今晚，它记得你。';
  ctx.fillText(close, W - 140, 1770);
  ctx.fillStyle = 'rgba(239,231,216,0.3)';
  ctx.font = '300 14px "IBM Plex Mono", monospace';
  ctx.fillText('AFTERGLOW · FINAL ARCHIVE · ONE NIGHT ONLY', W - 140, 1812);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(239,231,216,0.24)';
  ctx.font = '300 13px "IBM Plex Mono", monospace';
  drawSpaced(ctx, 'N 31°14′ · E 121°29′ · 10¹⁰⁰ CE', 140, 1882, 2.4);

  // 颗粒
  const noise = document.createElement('canvas');
  noise.width = noise.height = 180;
  const nctx = noise.getContext('2d');
  const img = nctx.createImageData(180, 180);
  const nrng = seeded(77);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + nrng() * 135;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 14;
  }
  nctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = ctx.createPattern(noise, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // 下载
  const name = filename || `afterglow-your-sky-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.png`;
  const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
