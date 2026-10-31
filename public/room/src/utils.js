/* 窗畔 · 通用工具：数学、画布、几何、贴图辅助 */
(function () {
  'use strict';
  window.WP = window.WP || {};

  const U = {};

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => U.clamp((v - a) / (b - a), 0, 1);
  U.smoothstep = (a, b, v) => {
    const t = U.invLerp(a, b, v);
    return t * t * (3 - 2 * t);
  };
  U.easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  U.easeOutBack = (t) => {
    const c1 = 1.1;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  U.damp = (cur, target, lambda, dt) => U.lerp(cur, target, 1 - Math.exp(-lambda * dt));

  U.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  U.makeCanvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };

  U.canvasTexture = function (canvas, opts) {
    opts = opts || {};
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    if (opts.srgb !== false) tex.encoding = THREE.sRGBEncoding;
    /* 各向异性交给各向异性过滤把远处的细纹熨平：
     * 默认拉满硬件上限，显式指定时也不超过上限，避免驱动悄悄退回 1x 产生摩尔纹 */
    const req = opts.aniso === undefined ? 16 : opts.aniso;
    tex.anisotropy = Math.max(1, Math.min(req, U.MAX_ANISO || 16));
    tex.needsUpdate = true;
    return tex;
  };

  /* 平滑的一维/二维值噪声 */
  U.makeNoise2D = function (seed, size) {
    const rng = U.mulberry32(seed);
    size = size || 64;
    const grid = new Float32Array(size * size);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();
    const at = (x, y) => grid[((y % size) + size) % size * size + (((x % size) + size) % size)];
    function noise(x, y) {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const xf = x - xi;
      const yf = y - yi;
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      const a = at(xi, yi);
      const b = at(xi + 1, yi);
      const c = at(xi, yi + 1);
      const d = at(xi + 1, yi + 1);
      return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
    }
    noise.fbm = function (x, y, octaves) {
      let amp = 1;
      let freq = 1;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < (octaves || 4); o++) {
        sum += noise(x * freq, y * freq) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2;
      }
      return sum / norm;
    };
    return noise;
  };

  /* 在画布上叠一层细腻噪点 */
  U.grain = function (ctx, w, h, amount, alpha, seed) {
    const rng = U.mulberry32(seed || 7);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rng() - 0.5) * amount;
      d[i] = U.clamp(d[i] + n, 0, 255);
      d[i + 1] = U.clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = U.clamp(d[i + 2] + n, 0, 255);
      if (alpha !== undefined) d[i + 3] = Math.min(255, d[i + 3] * alpha);
    }
    ctx.putImageData(img, 0, 0);
  };

  U.roundRectPath = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  U.roundedBoxGeometry = function (w, h, d, r, bevel) {
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
    bevel = bevel === undefined ? Math.min(r * 0.45, 0.018) : bevel;
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, d - bevel * 2),
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 6,
      steps: 1
    });
    geo.translate(0, 0, -(d - bevel * 2) / 2);
    geo.computeVertexNormals();
    return geo;
  };

  /* 圆柱：可指定上下半径，沿 Y 轴，底部在 y=0 */
  U.cyl = function (rTop, rBottom, h, seg, mat, y) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg || 20, 1);
    const m = new THREE.Mesh(g, mat);
    m.position.y = (y || 0) + h / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  U.box = function (w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  U.softGlowTexture = function (inner, outer, size) {
    size = size || 128;
    const c = U.makeCanvas(size, size);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner || 'rgba(255,255,255,1)');
    g.addColorStop(0.22, outer || 'rgba(255,220,160,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  };

  U.sprite = function (tex, color, opacity, scale) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: color === undefined ? 0xffffff : color,
      transparent: true,
      opacity: opacity === undefined ? 1 : opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const s = new THREE.Sprite(mat);
    if (scale) s.scale.set(scale, scale, 1);
    return s;
  };

  U.makeCurveTube = function (points, radius, mat, tubularSegments, radialSegments) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, tubularSegments || 48, radius, radialSegments || 6, false);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  U.labelTexture = function (text, opts) {
    opts = opts || {};
    const w = opts.w || 512;
    const h = opts.h || 256;
    const c = U.makeCanvas(w, h);
    const ctx = c.getContext('2d');
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = opts.borderWidth || 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.color || '#f5e8d0';
    ctx.font = (opts.weight || '500') + ' ' + (opts.size || 96) + 'px ' + (opts.font || '"Noto Serif SC", "Songti SC", serif');
    if (opts.glow) {
      ctx.shadowColor = opts.glow;
      ctx.shadowBlur = opts.glowBlur || 24;
    }
    const lines = String(text).split('\n');
    const lh = (opts.lineHeight || opts.size || 96) * 1.2;
    lines.forEach((line, i) => {
      const y = h / 2 + (i - (lines.length - 1) / 2) * lh;
      ctx.fillText(line, w / 2, y);
    });
    return U.canvasTexture(c, { clamp: true, srgb: true });
  };

  U.setShadow = function (obj, cast, receive) {
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = cast === undefined ? true : cast;
        o.receiveShadow = receive === undefined ? true : receive;
      }
    });
    return obj;
  };

  U.fadeGroup = function (group, on) {
    group.visible = on;
  };

  /* 材质视觉签名：属性一致的静态材质可以共用一次绘制 */
  const MAT_NUM = [
    'roughness', 'metalness', 'envMapIntensity', 'bumpScale', 'aoMapIntensity',
    'opacity', 'alphaTest', 'emissiveIntensity', 'clearcoat', 'clearcoatRoughness',
    'transmission', 'thickness', 'ior', 'reflectivity', 'refractionRatio',
    'sheen', 'sheenRoughness', 'displacementScale', 'displacementBias', 'lightMapIntensity'
  ];
  const MAT_TEX = [
    'map', 'bumpMap', 'normalMap', 'aoMap', 'alphaMap', 'emissiveMap',
    'metalnessMap', 'roughnessMap', 'displacementMap', 'clearcoatMap',
    'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap',
    'sheenRoughnessMap', 'transmissionMap', 'thicknessMap', 'envMap'
  ];
  U.materialSignature = function (m) {
    const c = (x) => (x && x.isColor ? x.getHexString() : '');
    const t = (x) => (x ? x.uuid : '');
    let s = m.type + '|' + m.side + '|' + (m.flatShading ? 1 : 0) + '|' +
      (m.vertexColors ? 1 : 0) + '|' + (m.toneMapped === false ? 0 : 1) + '|' +
      (m.depthWrite === false ? 0 : 1) + '|' + (m.depthTest === false ? 0 : 1) + '|' +
      m.blending + '|' + c(m.color) + '|' + c(m.emissive) + '|' +
      c(m.sheenColor) + '|' + c(m.specularColor);
    for (let i = 0; i < MAT_NUM.length; i++) {
      const v = m[MAT_NUM[i]];
      if (v !== undefined) s += '|' + (typeof v === 'number' ? v.toFixed(3) : v);
    }
    if (m.normalScale) s += '|n' + m.normalScale.x.toFixed(2) + ',' + m.normalScale.y.toFixed(2);
    for (let i = 0; i < MAT_TEX.length; i++) {
      const tex = m[MAT_TEX[i]];
      if (tex) s += '|' + i + ':' + t(tex);
    }
    return s;
  };

  /*
   * 静态几何合批：把同一材质、同投影属性的碎网格合成一块。
   * 只处理不透明、未被标记、可安全烘焙世界变换的普通 Mesh；
   * Sprite / Points / InstancedMesh / 透明材质 / 自定义着色器一律跳过。
   * 目的是把两千多次 draw call 压到几百次，尤其救街景。
   */
  U.mergeStatic = function (root, opts) {
    opts = opts || {};
    const exclude = new Set(opts.exclude || []);
    if (!root) return { before: 0, after: 0, groups: 0 };
    root.updateMatrixWorld(true);
    const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const buckets = new Map();
    const victims = [];
    let before = 0;

    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isSprite || o.isPoints) return;
      if (o.renderOrder !== 0) return;
      if (o.morphTargetInfluences && o.morphTargetInfluences.length) return;
      if (o.userData && o.userData.noMerge) return;
      let p = o;
      while (p && p !== root) {
        if (exclude.has(p) || (p.userData && p.userData.noMerge)) return;
        p = p.parent;
      }
      if (exclude.has(o)) return;
      const mat = o.material;
      if (!mat || Array.isArray(mat)) return;
      /* alphaTest 的镂空材质（雨篷荷叶边）可以安全合批，其余透明材质保留独立排序 */
      if (mat.transparent && !(mat.alphaTest > 0)) return;
      if (mat.isShaderMaterial) return;
      if (mat.onBeforeCompile && mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return;
      if (!o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
      if (!o.geometry.attributes.normal) return;
      const attrs = Object.keys(o.geometry.attributes);
      for (let i = 0; i < attrs.length; i++) {
        const n = attrs[i];
        if (n !== 'position' && n !== 'normal' && n !== 'uv') return;
      }
      before++;
      const dynamic = mat.userData && mat.userData.dynamic;
      const mkey = dynamic ? mat.uuid : U.materialSignature(mat);
      const key = mkey + '|' + (o.castShadow ? 1 : 0) + '|' + (o.receiveShadow ? 1 : 0);
      let b = buckets.get(key);
      if (!b) {
        b = {
          material: mat, castShadow: o.castShadow, receiveShadow: o.receiveShadow,
          items: [], verts: 0
        };
        buckets.set(key, b);
      }
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const count = src.attributes.position.count;
      const rel = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
      b.items.push({ geo: src, rel, count });
      b.verts += count;
      victims.push(o);
    });

    if (!buckets.size) return { before, after: 0, groups: 0 };
    let after = 0;
    buckets.forEach((b) => {
      if (!b.verts) return;
      const pos = new Float32Array(b.verts * 3);
      const nor = new Float32Array(b.verts * 3);
      const uv = new Float32Array(b.verts * 2);
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();
      const nm = new THREE.Matrix3();
      let offset = 0;
      b.items.forEach((it) => {
        const pa = it.geo.attributes.position;
        const na = it.geo.attributes.normal;
        const ua = it.geo.attributes.uv;
        nm.getNormalMatrix(it.rel);
        for (let i = 0; i < it.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(it.rel);
          pos[(offset + i) * 3] = v.x;
          pos[(offset + i) * 3 + 1] = v.y;
          pos[(offset + i) * 3 + 2] = v.z;
          n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
          nor[(offset + i) * 3] = n.x;
          nor[(offset + i) * 3 + 1] = n.y;
          nor[(offset + i) * 3 + 2] = n.z;
          if (ua) {
            uv[(offset + i) * 2] = ua.getX(i);
            uv[(offset + i) * 2 + 1] = ua.getY(i);
          }
        }
        offset += it.count;
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, b.material);
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = b.receiveShadow;
      mesh.name = 'merged';
      root.add(mesh);
      after++;
    });

    victims.forEach((o) => {
      if (o.parent) o.parent.remove(o);
    });
    return { before, after, groups: buckets.size };
  };

  /* 把一组同材质网格合成一块（用于会整体显隐的积雪帽等） */
  U.mergeMeshList = function (meshes, material, parent) {
    if (!meshes || !meshes.length || !parent) return null;
    parent.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const items = [];
    let verts = 0;
    const unique = [];
    meshes.forEach((o) => {
      if (!o || !o.isMesh || o.isInstancedMesh || !o.geometry || !o.geometry.attributes.position) return;
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const count = src.attributes.position.count;
      const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      items.push({ geo: src, rel, count });
      verts += count;
      unique.push(o);
    });
    if (!unique.length) return null;
    const pos = new Float32Array(verts * 3);
    const nor = new Float32Array(verts * 3);
    const uv = new Float32Array(verts * 2);
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    let offset = 0;
    items.forEach((it) => {
      const pa = it.geo.attributes.position;
      const na = it.geo.attributes.normal;
      const ua = it.geo.attributes.uv;
      nm.getNormalMatrix(it.rel);
      for (let i = 0; i < it.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(it.rel);
        pos[(offset + i) * 3] = v.x;
        pos[(offset + i) * 3 + 1] = v.y;
        pos[(offset + i) * 3 + 2] = v.z;
        if (na) {
          n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
          nor[(offset + i) * 3] = n.x;
          nor[(offset + i) * 3 + 1] = n.y;
          nor[(offset + i) * 3 + 2] = n.z;
        }
        if (ua) {
          uv[(offset + i) * 2] = ua.getX(i);
          uv[(offset + i) * 2 + 1] = ua.getY(i);
        }
      }
      offset += it.count;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.name = 'merged-snow';
    parent.add(mesh);
    unique.forEach((o) => { if (o.parent) o.parent.remove(o); });
    return mesh;
  };

  U.getQuery = function (name, fallback) {
    const p = new URLSearchParams(location.search);
    return p.has(name) ? p.get(name) : fallback;
  };

  U.isMobile = function () {
    return window.matchMedia('(max-width: 900px)').matches;
  };

  WP.U = U;
})();
