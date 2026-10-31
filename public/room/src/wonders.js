/* 窗畔 · 梦境信物：只属于某一夜的桌面小物，和窗外那一下回应 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const TAU = Math.PI * 2;
  const V3 = THREE.Vector3;

  /* ———————————————————— 信物的语言 ———————————————————— */
  /* hint 会出现在侧栏「窗外光景」下面，hover 是鼠标停在信物上时的小字 */
  const RELICS = {
    abyss: {
      hint: '茶几上多了一枚海螺 · 点一下，会听见海的回答',
      hover: ['把海螺贴近耳边', 'LISTEN TO THE SHELL'],
      toast: '海螺里响起一声很远的回音 · 窗外浮起一圈一圈的声波',
      notes: [[45, 0, 0.06], [52, 0.18, 0.05], [57, 0.34, 0.04]]
    },
    cosmos: {
      hint: '茶几上多了一只铜制夜车 · 点一下，星海里会开来一列火车',
      hover: ['让夜车出发', 'SEND THE NIGHT TRAIN'],
      toast: '夜车从星海这头开往那头 · 车窗一盏一盏亮起来',
      notes: [[43, 0, 0.08], [50, 0.14, 0.06], [55, 0.28, 0.05], [59, 0.42, 0.04]]
    },
    sakura: {
      hint: '茶几上多了一把小纸扇 · 点一下，花瓣会绕着窗口打转',
      hover: ['扇起一阵夜风', 'FAN THE NIGHT WIND'],
      toast: '花瓣被风托起来，绕着窗口打了好几个转',
      notes: [[72, 0, 0.04], [76, 0.11, 0.035], [79, 0.22, 0.03], [84, 0.34, 0.025]]
    },
    hanabi: {
      hint: '茶几上多了一盒火柴 · 点一下，花火会离窗子更近一点',
      hover: ['擦亮一根火柴', 'STRIKE A MATCH'],
      toast: '花火在很近的地方炸开，水面又替它亮了一遍',
      notes: [[40, 0, 0.09], [48, 0.22, 0.06], [55, 0.34, 0.045]]
    },
    cloudsea: {
      hint: '茶几上多了一盏小纸灯 · 点一下，云上会亮起一排灯',
      hover: ['放一盏灯', 'RELEASE A LANTERN'],
      toast: '纸灯一盏盏升起来，云被照成了暖色',
      notes: [[60, 0, 0.05], [64, 0.16, 0.04], [67, 0.32, 0.035], [72, 0.48, 0.03]]
    },
    isles: {
      hint: '茶几上多了一只铜鸟 · 点一下，鸟群会从岛与岛之间穿过',
      hover: ['放走铜鸟', 'RELEASE THE BIRD'],
      toast: '铜鸟领着鸟群，从岛与岛之间穿了过去',
      notes: [[76, 0, 0.03], [79, 0.1, 0.025], [83, 0.2, 0.022]]
    },
    dunes: {
      hint: '茶几上多了一枚驼铃 · 点一下，沙丘背面会走来一队影子',
      hover: ['摇一摇驼铃', 'RING THE CAMEL BELL'],
      toast: '驼铃一响，沙丘背面走来一队慢慢移动的影子',
      notes: [[55, 0, 0.055], [59, 0.24, 0.045], [55, 0.5, 0.035]]
    },
    ice: {
      hint: '茶几上多了一枚冰棱 · 点一下，极光会从冰原尽头铺开',
      hover: ['转动冰棱', 'TURN THE PRISM'],
      toast: '极光从冰原尽头铺开，像有人抖开了一匹绸子',
      notes: [[84, 0, 0.04], [88, 0.12, 0.035], [91, 0.24, 0.03], [96, 0.36, 0.025]]
    },
    firefly: {
      hint: '茶几上多了一罐萤火 · 点一下，灯会在窗外围成一圈',
      hover: ['打开玻璃罐', 'OPEN THE JAR'],
      toast: '萤火飞出来，在窗外慢慢围成一圈，像一只发光的眼睛',
      notes: [[79, 0, 0.03], [84, 0.14, 0.025], [88, 0.28, 0.02]]
    },
    booksea: {
      hint: '茶几上多了一本小书 · 点一下，书页会成群飞过窗口',
      hover: ['翻开这一页', 'TURN THE PAGE'],
      toast: '书页离开了书脊，成群地飞过窗口，像一场下得很慢的雪',
      notes: [[64, 0, 0.045], [67, 0.13, 0.035], [71, 0.26, 0.03], [74, 0.4, 0.025]]
    },
    moon: {
      hint: '茶几上多了一只星瓶 · 点一下，会有几颗流星划过去',
      hover: ['摇一摇星瓶', 'SHAKE THE STAR JAR'],
      toast: '几颗流星从月面背后划过去，尾巴拖得很长',
      notes: [[79, 0, 0.035], [86, 0.18, 0.03], [91, 0.36, 0.025]]
    },
    meadow: {
      hint: '茶几上多了一枝蒲公英 · 点一下，种子会乘着风过窗',
      hover: ['吹散蒲公英', 'BLOW THE DANDELION'],
      toast: '种子乘着风越过花海，一直飘到窗边才慢慢散开',
      notes: [[72, 0, 0.035], [76, 0.16, 0.03], [79, 0.32, 0.025], [83, 0.48, 0.02]]
    }
  };

  /* ———————————————————— 小贴图 ———————————————————— */
  function petalTexture() {
    const c = U.makeCanvas(64, 64);
    const x = c.getContext('2d');
    x.translate(32, 32);
    x.rotate(-0.35);
    const g = x.createLinearGradient(0, -22, 0, 22);
    g.addColorStop(0, 'rgba(255,236,242,0.98)');
    g.addColorStop(0.55, 'rgba(255,190,208,0.94)');
    g.addColorStop(1, 'rgba(240,140,170,0.75)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, -22);
    x.bezierCurveTo(15, -13, 16, 8, 0, 21);
    x.bezierCurveTo(-16, 8, -15, -13, 0, -22);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.5)';
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, -18);
    x.quadraticCurveTo(2, 0, 0, 17);
    x.stroke();
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  function camelTexture() {
    const c = U.makeCanvas(256, 160);
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 160);
    x.fillStyle = '#ffffff';
    x.strokeStyle = '#ffffff';
    x.lineCap = 'round';
    x.lineJoin = 'round';

    /* 四条腿：前后各两条，膝弯很轻 */
    x.lineWidth = 9;
    [[104, 105, 98, 148], [122, 106, 128, 150], [148, 104, 154, 148], [165, 101, 174, 147]].forEach((l) => {
      x.beginPath();
      x.moveTo(l[0], l[1]);
      x.quadraticCurveTo(l[0] - 2, (l[1] + l[3]) / 2, l[2], l[3]);
      x.stroke();
    });
    /* 脚掌 */
    x.lineWidth = 7;
    [[96, 150], [126, 152], [152, 150], [172, 149]].forEach((f) => {
      x.beginPath();
      x.moveTo(f[0] - 5, f[1]);
      x.lineTo(f[0] + 5, f[1]);
      x.stroke();
    });
    /* 身体与驼峰 */
    x.beginPath();
    x.ellipse(128, 88, 44, 22, -0.05, 0, TAU);
    x.fill();
    x.beginPath();
    x.ellipse(123, 68, 19, 17, -0.12, Math.PI, TAU);
    x.fill();
    /* 脖子与头 */
    x.lineWidth = 15;
    x.beginPath();
    x.moveTo(159, 85);
    x.bezierCurveTo(171, 68, 173, 48, 184, 40);
    x.stroke();
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(160, 92);
    x.bezierCurveTo(177, 80, 180, 58, 189, 47);
    x.stroke();
    x.beginPath();
    x.ellipse(192, 38, 14, 8, -0.12, 0, TAU);
    x.fill();
    x.beginPath();
    x.moveTo(199, 33);
    x.lineTo(210, 35);
    x.lineTo(201, 41);
    x.fill();
    /* 耳朵 */
    x.beginPath();
    x.moveTo(185, 32);
    x.lineTo(188, 23);
    x.lineTo(193, 31);
    x.fill();
    /* 尾巴 */
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(86, 86);
    x.bezierCurveTo(74, 91, 72, 105, 78, 112);
    x.stroke();
    /* 鞍与挂毯 */
    x.fillStyle = 'rgba(255,255,255,0.92)';
    x.fillRect(112, 61, 32, 30);
    x.fillStyle = 'rgba(255,255,255,0.65)';
    x.beginPath();
    x.moveTo(118, 91);
    x.lineTo(138, 91);
    x.lineTo(134, 108);
    x.lineTo(122, 108);
    x.fill();
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  function auroraTexture() {
    const w = 256, h = 256;
    const c = U.makeCanvas(w, h);
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const data = img.data;
    for (let py = 0; py < h; py++) {
      const v = py / (h - 1);
      const vertical = Math.pow(Math.sin(Math.min(1, v) * Math.PI), 1.25);
      for (let px = 0; px < w; px++) {
        const u = px / (w - 1);
        const waveA = Math.pow(0.5 + 0.5 * Math.sin(u * TAU * 2.1 + v * 7.5), 2.4);
        const waveB = Math.pow(0.5 + 0.5 * Math.sin(u * TAU * 5.3 - v * 4.2 + 1.7), 3.1);
        const band = U.clamp(waveA * 0.72 + waveB * 0.42, 0, 1);
        const a = Math.round(255 * vertical * band * 0.8);
        const k = py * w + px;
        data[k * 4] = Math.round(112 + 40 * (1 - v) + 24 * band);
        data[k * 4 + 1] = Math.round(214 + 32 * v);
        data[k * 4 + 2] = Math.round(208 - 40 * v + 52 * (1 - vertical));
        data[k * 4 + 3] = a;
      }
    }
    x.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
    return tex;
  }

  function streakTexture() {
    const w = 128, h = 32;
    const c = U.makeCanvas(w, h);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(200,230,255,0.45)');
    g.addColorStop(0.87, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    x.fillStyle = g;
    const soft = x.createLinearGradient(0, 0, 0, h);
    soft.addColorStop(0, 'rgba(255,255,255,0)');
    soft.addColorStop(0.5, 'rgba(255,255,255,1)');
    soft.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in';
    x.fillStyle = soft;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  function pageTexture() {
    const c = U.makeCanvas(96, 128);
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(246,232,206,0.95)';
    x.fillRect(8, 6, 80, 116);
    x.fillStyle = 'rgba(120,94,64,0.28)';
    for (let i = 0; i < 8; i++) {
      x.fillRect(20, 28 + i * 10, 54 - (i % 3) * 9, 1.4);
    }
    x.strokeStyle = 'rgba(150,116,78,0.35)';
    x.lineWidth = 2;
    x.strokeRect(8, 6, 80, 116);
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  /* ———————————————————— 共用小工具 ———————————————————— */
  function std(color, roughness, metalness, emissive, intensity) {
    const m = new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness === undefined ? 0.6 : roughness,
      metalness: metalness || 0,
      fog: false
    });
    if (emissive !== undefined) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = intensity === undefined ? 1 : intensity;
    }
    return m;
  }

  function basic(color, opts) {
    opts = opts || {};
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: opts.depthWrite === undefined ? !opts.additive : opts.depthWrite,
      side: opts.double ? THREE.DoubleSide : THREE.FrontSide,
      toneMapped: opts.toneMapped === undefined ? !opts.additive : opts.toneMapped,
      fog: false
    });
  }

  function glowSprite(map, color, size, opacity) {
    const m = new THREE.SpriteMaterial({
      map: map,
      color: color,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false
    });
    const s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  }

  function makePoints(count, map, color, size, opacity, additive) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.PointsMaterial({
      size: size,
      map: map,
      color: color,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
      fog: false
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
  }

  function fadeWindow(age, life, edge) {
    edge = edge === undefined ? 1.1 : edge;
    return U.clamp(age / 0.7, 0, 1) * U.clamp((life - age) / edge, 0, 1);
  }

  function miniLantern(scale, map, tint) {
    const g = new THREE.Group();
    const paper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.11, 0.2, 12, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xffd3a0,
        emissive: tint || 0xff9d55,
        emissiveIntensity: 0.85,
        roughness: 0.8,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        fog: false
      })
    );
    paper.position.y = 0.15;
    g.add(paper);
    const capMat = std(0x5c2f22, 0.8, 0.05, 0x2a100b, 0.2);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.092, 0.02, 12), capMat);
    top.position.y = 0.257;
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.078, 0.018, 12), capMat);
    bottom.position.y = 0.045;
    g.add(top, bottom);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 4), capMat);
    string.position.y = 0.285;
    g.add(string);
    const glow = glowSprite(map, 0xffba75, 0.7, 0.45);
    glow.position.y = 0.15;
    g.add(glow);
    g.scale.setScalar(scale);
    return { group: g, paper: paper.material, glow: glow.material };
  }

  /* ———————————————————— 十二件桌面信物 ———————————————————— */
  function tokenBase(M) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.125, 0.016, 30), M.brassDark);
    disc.position.y = 0.008;
    disc.castShadow = false;
    g.add(disc);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.094, 0.008, 30), std(0x241c17, 0.94, 0.02));
    pad.position.y = 0.02;
    g.add(pad);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.0045, 6, 40), M.brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.018;
    g.add(rim);
    return g;
  }

  function tokenCosmos(M) {
    const g = new THREE.Group();
    const brass = M.brassDark;
    [-1, 1].forEach((s) => g.add(U.box(0.2, 0.004, 0.006, brass, 0, 0.011, s * 0.026)));
    for (let i = 0; i < 4; i++) g.add(U.box(0.009, 0.004, 0.072, M.darkWood, -0.075 + i * 0.05, 0.009, 0));
    const bodyMat = std(0x334052, 0.4, 0.55, 0x0c1524, 0.35);
    const carMat = std(0x4a2f35, 0.55, 0.35, 0x160a0e, 0.25);
    const brassMat = std(0xb58a4b, 0.28, 0.8, 0x3a2209, 0.15);
    const winMat = basic(0xffc582, { toneMapped: false });
    const engine = new THREE.Group();
    engine.position.set(-0.028, 0.026, 0);
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.07, 10), bodyMat);
    boiler.rotation.z = Math.PI / 2;
    boiler.position.set(0.026, 0.03, 0);
    engine.add(boiler);
    const cab = U.box(0.052, 0.052, 0.04, bodyMat, -0.025, 0.045, 0);
    engine.add(cab);
    engine.add(U.box(0.058, 0.008, 0.046, brassMat, -0.025, 0.074, 0));
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.024, 8), brassMat);
    chimney.position.set(0.04, 0.055, 0);
    engine.add(chimney);
    const lamp = glowSprite(U.softGlowTexture('rgba(255,248,220,1)', 'rgba(255,190,110,0.5)', 32), 0xffd29a, 0.09, 0.9);
    lamp.position.set(0.066, 0.04, 0.01);
    engine.add(lamp);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.014, 0.015), winMat);
    win.position.set(-0.026, 0.052, 0.0206);
    engine.add(win);
    [[-0.045, 0.018], [0.02, 0.018]].forEach((w) => {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 10), brass);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(w[0], w[1], 0.024);
      engine.add(wh);
    });
    g.add(engine);
    [-0.105, -0.165, -0.218].forEach((x, idx) => {
      const car = new THREE.Group();
      car.position.set(x, 0.026, 0);
      car.add(U.box(0.048, 0.035, 0.038, idx === 1 ? carMat : bodyMat, 0, 0.03, 0));
      car.add(U.box(0.052, 0.006, 0.042, brassMat, 0, 0.05, 0));
      for (let i = 0; i < 2; i++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.011, 0.013), winMat);
        w.position.set(-0.011 + i * 0.022, 0.033, 0.0196);
        car.add(w);
      }
      g.add(car);
    });
    return g;
  }

  function tokenAbyss(M) {
    const g = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 54; i++) {
      const k = i / 54;
      const a = k * Math.PI * 3.4;
      const r = 0.012 + 0.052 * k;
      pts.push(new V3(Math.cos(a) * r, 0.026 + k * 0.085, Math.sin(a) * r));
    }
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xf2e6da,
      roughness: 0.32,
      metalness: 0.1,
      emissive: 0x2e7d78,
      emissiveIntensity: 0.25,
      fog: false
    });
    const shell = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.009, 6, false), shellMat);
    shell.castShadow = false;
    g.add(shell);
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), new THREE.MeshStandardMaterial({
      color: 0xfff3e2, roughness: 0.12, metalness: 0.3, emissive: 0x78d8d2, emissiveIntensity: 0.45, fog: false
    }));
    pearl.position.set(0.035, 0.028, 0.014);
    g.add(pearl);
    const glow = glowSprite(U.softGlowTexture('rgba(190,255,248,1)', 'rgba(50,200,200,0.4)', 48), 0x8ff5e8, 0.14, 0.5);
    glow.position.set(0, 0.06, 0);
    g.add(glow);
    return g;
  }

  function tokenSakura(M) {
    const g = new THREE.Group();
    const pink = std(0xf2b8c5, 0.75, 0.02, 0x7c3b50, 0.12);
    const cream = std(0xf7e4d2, 0.8, 0.01, 0x6d4c3d, 0.08);
    const ribMat = M.brassDark;
    const pivot = new THREE.Group();
    pivot.position.y = 0.018;
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Group();
      blade.rotation.z = -0.68 + i * 0.225;
      const paper = U.box(0.038, 0.15, 0.003, i % 2 ? cream : pink, 0, 0.075, 0);
      paper.castShadow = false;
      blade.add(paper);
      const rib = U.box(0.0025, 0.145, 0.005, ribMat, 0, 0.076, 0.0025);
      blade.add(rib);
      pivot.add(blade);
    }
    const pin = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 5, 16), ribMat);
    pin.rotation.x = Math.PI / 2;
    pin.position.y = 0.012;
    pivot.add(pin);
    g.add(pivot);
    const petal = glowSprite(petalTexture(), 0xffd8e2, 0.06, 0.65);
    petal.position.set(0.105, 0.09, 0.03);
    g.add(petal);
    return g;
  }

  function tokenHanabi(M) {
    const g = new THREE.Group();
    const boxMat = std(0x843f38, 0.62, 0.1, 0x2a0b09, 0.25);
    const box = U.box(0.105, 0.03, 0.066, boxMat, 0, 0.028, 0);
    g.add(box);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.014), basic(0xf2d8ae));
    label.position.set(0, 0.028, 0.0338);
    g.add(label);
    const sparkMat = std(0xb9a58c, 0.8, 0.05);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.13, 6), sparkMat);
    stick.position.set(0.034, 0.085, 0.008);
    stick.rotation.z = -0.5;
    g.add(stick);
    const tip = new THREE.Vector3(0.034 + Math.sin(0.5) * 0.065, 0.085 + Math.cos(0.5) * 0.065, 0.008);
    const ember = glowSprite(U.softGlowTexture('rgba(255,255,235,1)', 'rgba(255,138,70,0.55)', 48), 0xffce86, 0.075, 0.95);
    ember.position.copy(tip);
    g.add(ember);
    for (let i = 0; i < 4; i++) {
      const s = glowSprite(U.softGlowTexture('rgba(255,245,220,1)', 'rgba(255,160,80,0.45)', 32), 0xffb765, 0.022, 0.8);
      s.position.set(tip.x + Math.sin(i * 2.1) * 0.022, tip.y + Math.cos(i * 1.7) * 0.02, tip.z + 0.006);
      g.add(s);
    }
    return g;
  }

  function tokenCloudsea(M) {
    const g = new THREE.Group();
    const l = miniLantern(0.58, U.softGlowTexture('rgba(255,230,190,1)', 'rgba(255,160,90,0.45)', 48), 0xffa75e);
    l.group.position.y = 0.018;
    g.add(l.group);
    return g;
  }

  function tokenIsles(M) {
    const g = new THREE.Group();
    const brass = std(0xb08a51, 0.32, 0.8, 0x2b1a08, 0.15);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.007, 0.065, 8), brass);
    post.position.y = 0.05;
    g.add(post);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.003, 5, 24), brass);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.09;
    g.add(ring);
    const bird = new THREE.Group();
    bird.position.y = 0.118;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), brass);
    body.scale.set(1.45, 0.8, 0.85);
    bird.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 8, 6), brass);
    head.position.set(0.028, 0.008, 0);
    bird.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.018, 5), std(0x8e6a3c, 0.4, 0.6));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.044, 0.006, 0);
    bird.add(beak);
    [-1, 1].forEach((s) => {
      const wing = U.box(0.06, 0.0025, 0.02, std(0x53716d, 0.5, 0.3), s * 0.026, 0.008, 0);
      wing.rotation.z = s * 0.22;
      bird.add(wing);
    });
    const tail = U.box(0.035, 0.004, 0.012, brass, -0.038, 0.002, 0);
    tail.rotation.z = 0.12;
    bird.add(tail);
    g.add(bird);
    return g;
  }

  function tokenDunes(M) {
    const g = new THREE.Group();
    const brass = std(0xb08a51, 0.35, 0.78, 0x2b1a08, 0.12);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.082, 8), brass);
    post.position.set(-0.045, 0.06, 0);
    g.add(post);
    const arm = U.box(0.09, 0.004, 0.004, brass, -0.005, 0.101, 0);
    g.add(arm);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.028, 4), M.brassDark);
    string.position.set(0.037, 0.086, 0);
    g.add(string);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.027, 0.038, 10, 1, true), brass);
    bell.position.set(0.037, 0.054, 0);
    g.add(bell);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0025, 4, 14), brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0.037, 0.036, 0);
    g.add(rim);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), M.brassDark);
    clapper.position.set(0.037, 0.03, 0);
    g.add(clapper);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 5, 16), std(0x5f3124, 0.85, 0.05));
    strap.rotation.x = Math.PI / 2;
    strap.position.y = 0.02;
    g.add(strap);
    return g;
  }

  function tokenIce(M) {
    const g = new THREE.Group();
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xb9f3ed,
      roughness: 0.12,
      metalness: 0.15,
      emissive: 0x2c9a98,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
      fog: false
    });
    const specs = [[-0.023, 0.06, 0.008, 0.016, 0.115, -0.2], [0.014, 0.05, -0.006, 0.021, 0.085, 0.18], [0.03, 0.035, 0.012, 0.013, 0.06, 0.34]];
    specs.forEach((s) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(s[3], s[4], 5), iceMat);
      cone.position.set(s[0], s[1], s[2]);
      cone.rotation.z = s[5];
      g.add(cone);
    });
    const glow = glowSprite(U.softGlowTexture('rgba(210,255,250,1)', 'rgba(110,225,220,0.4)', 48), 0x9ff6ed, 0.13, 0.45);
    glow.position.set(0, 0.07, 0.01);
    g.add(glow);
    return g;
  }

  function tokenFirefly(M) {
    const g = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xd8f4e4, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.2,
      side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, fog: false
    });
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.09, 14, 1, true), glass);
    jar.position.y = 0.065;
    g.add(jar);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.006, 14), glass);
    bottom.position.y = 0.02;
    g.add(bottom);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.02, 10), std(0x7a5333, 0.85, 0.02));
    cork.position.y = 0.116;
    g.add(cork);
    const fire = glowSprite(U.softGlowTexture('rgba(255,255,210,1)', 'rgba(245,215,80,0.55)', 48), 0xffef9a, 0.075, 0.95);
    fire.position.set(-0.004, 0.078, 0);
    g.add(fire);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 5, 4), basic(0xfff3a6));
      s.position.set(-0.014 + i * 0.012, 0.05 + i * 0.014, (i - 1) * 0.01);
      g.add(s);
    }
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0025, 4, 14, Math.PI), std(0x8a6c46, 0.45, 0.7));
    handle.position.set(0, 0.095, 0.037);
    handle.rotation.set(Math.PI / 2, 0, 0);
    g.add(handle);
    return g;
  }

  function tokenBooksea(M) {
    const g = new THREE.Group();
    const cover = std(0x624d3b, 0.75, 0.12, 0x1d130d, 0.15);
    const pages = std(0xf0e1c4, 0.9, 0.01, 0x4e4232, 0.05);
    const book = new THREE.Group();
    book.position.y = 0.028;
    [-1, 1].forEach((s) => {
      const half = U.box(0.06, 0.004, 0.085, s < 0 ? cover : pages, s * 0.03, 0.012, 0);
      half.rotation.z = s * 0.16;
      book.add(half);
      const page = U.box(0.055, 0.005, 0.078, s < 0 ? pages : cover, s * 0.03, 0.016, 0);
      page.rotation.z = s * 0.16;
      book.add(page);
    });
    book.add(U.box(0.008, 0.02, 0.088, cover, 0, 0.018, 0));
    g.add(book);
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.066), new THREE.MeshBasicMaterial({
      map: pageTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false
    }));
    leaf.position.set(0.064, 0.087, 0.012);
    leaf.rotation.set(-0.5, 0.4, 0.3);
    g.add(leaf);
    const glow = glowSprite(U.softGlowTexture('rgba(255,236,200,1)', 'rgba(210,160,90,0.42)', 48), 0xffd9a2, 0.13, 0.35);
    glow.position.set(0.02, 0.07, 0);
    g.add(glow);
    return g;
  }

  function tokenMoon(M) {
    const g = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xdfe9ff, roughness: 0.05, metalness: 0.08, transparent: true, opacity: 0.25,
      side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, fog: false
    });
    const bottle = new THREE.Mesh(new THREE.SphereGeometry(0.043, 18, 14), glass);
    bottle.position.y = 0.062;
    bottle.scale.set(1, 0.92, 1);
    g.add(bottle);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.017, 0.036, 10), glass);
    neck.position.y = 0.108;
    g.add(neck);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.014, 8), std(0x775133, 0.85, 0.02));
    cork.position.y = 0.13;
    g.add(cork);
    const starMat = basic(0xfff6d0, { toneMapped: false });
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.0028, 0), starMat);
      const a = i * 2.3;
      s.position.set(Math.cos(a) * 0.019, 0.056 + Math.sin(i * 1.4) * 0.022, Math.sin(a) * 0.012);
      g.add(s);
    }
    const glow = glowSprite(U.softGlowTexture('rgba(230,240,255,1)', 'rgba(120,160,255,0.4)', 48), 0xbcd2ff, 0.15, 0.5);
    glow.position.y = 0.064;
    g.add(glow);
    return g;
  }

  function tokenMeadow(M) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0021, 0.085, 5), std(0x6b7350, 0.85, 0.02));
    stem.position.y = 0.06;
    g.add(stem);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), std(0xd8c79c, 0.9, 0.02));
    core.position.y = 0.107;
    g.add(core);
    const puffMat = new THREE.MeshBasicMaterial({
      color: 0xfff5e4, transparent: true, opacity: 0.2, depthWrite: false, fog: false
    });
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.033, 10, 8), puffMat);
    puff.position.y = 0.107;
    g.add(puff);
    const rayMat = basic(0xfff8ec, { opacity: 0.75 });
    for (let i = 0; i < 10; i++) {
      const a = i * 0.62;
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0012, 0.035, 3), rayMat);
      ray.position.set(Math.cos(a) * 0.017, 0.107 + Math.sin(i * 1.7) * 0.012, Math.sin(a) * 0.017);
      ray.rotation.z = Math.cos(a) * 0.9;
      ray.rotation.x = Math.sin(a) * 0.9;
      g.add(ray);
    }
    const seed = glowSprite(U.softGlowTexture('rgba(255,255,250,1)', 'rgba(255,225,190,0.35)', 32), 0xfff0dc, 0.045, 0.8);
    seed.position.set(0.07, 0.075, 0.014);
    g.add(seed);
    return g;
  }

  /* ———————————————————— 窗外的回应 ———————————————————— */
  /* 每个效果都是一组藏在自己幻境里的小东西：不点就不动，点完各自收场 */
  function shell(life) {
    const group = new THREE.Group();
    group.visible = false;
    const fx = {
      group: group,
      life: life,
      age: 0,
      active: false,
      trigger() {
        this.age = 0;
        this.active = true;
        group.visible = true;
        if (this.reset) this.reset();
      },
      stop() {
        this.active = false;
        group.visible = false;
      },
      update(dt, t) {
        if (!this.active) return;
        this.age += dt;
        this.tick(this.age, dt, t);
        if (this.age >= this.life) this.stop();
      }
    };
    return fx;
  }

  function bubbleTexture() {
    const c = U.makeCanvas(64, 64);
    const x = c.getContext('2d');
    x.strokeStyle = 'rgba(238,255,252,0.95)';
    x.lineWidth = 2.4;
    x.beginPath();
    x.arc(32, 32, 24, 0, TAU);
    x.stroke();
    x.strokeStyle = 'rgba(160,240,235,0.4)';
    x.lineWidth = 4.5;
    x.beginPath();
    x.arc(32, 32, 24.5, 0.35, 1.5);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.beginPath();
    x.ellipse(23, 21, 4.2, 2.6, -0.6, 0, TAU);
    x.fill();
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  function birdTexture() {
    const c = U.makeCanvas(64, 48);
    const x = c.getContext('2d');
    x.strokeStyle = '#ffffff';
    x.fillStyle = '#ffffff';
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.lineWidth = 3.4;
    x.beginPath();
    x.moveTo(31, 30);
    x.bezierCurveTo(22, 22, 15, 12, 4, 11);
    x.bezierCurveTo(12, 22, 20, 29, 31, 33);
    x.moveTo(33, 30);
    x.bezierCurveTo(42, 22, 49, 12, 60, 11);
    x.bezierCurveTo(52, 22, 44, 29, 33, 33);
    x.stroke();
    x.beginPath();
    x.ellipse(32, 32, 4.4, 2.6, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.moveTo(32, 34);
    x.lineTo(29, 42);
    x.lineTo(35, 42);
    x.closePath();
    x.fill();
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  function trainWindowsTexture() {
    const c = U.makeCanvas(256, 64);
    const x = c.getContext('2d');
    for (let i = 0; i < 4; i++) {
      const wx = 12 + i * 61;
      const g = x.createLinearGradient(0, 12, 0, 50);
      g.addColorStop(0, 'rgba(255,228,168,0.98)');
      g.addColorStop(0.55, 'rgba(255,188,110,0.96)');
      g.addColorStop(1, 'rgba(222,138,72,0.9)');
      x.fillStyle = g;
      x.fillRect(wx, 12, 38, 38);
      x.fillStyle = 'rgba(255,247,220,0.55)';
      x.fillRect(wx + 6, 18, 9, 24);
      x.strokeStyle = 'rgba(30,22,22,0.85)';
      x.lineWidth = 2.5;
      x.strokeRect(wx, 12, 38, 38);
    }
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  function beamTexture() {
    const c = U.makeCanvas(128, 64);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,226,168,0.85)');
    g.addColorStop(0.35, 'rgba(255,196,124,0.3)');
    g.addColorStop(1, 'rgba(255,180,110,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 64);
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, 64);
    v.addColorStop(0, 'rgba(255,255,255,0)');
    v.addColorStop(0.5, 'rgba(255,255,255,1)');
    v.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = v;
    x.fillRect(0, 0, 128, 64);
    x.globalCompositeOperation = 'source-over';
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  function smokeTexture() {
    const c = U.makeCanvas(64, 64);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(224,220,232,0.7)');
    g.addColorStop(0.45, 'rgba(184,182,204,0.3)');
    g.addColorStop(1, 'rgba(150,150,180,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(32, 32, 30, 0, TAU);
    x.fill();
    return U.canvasTexture(c, { clamp: true, srgb: true });
  }

  /* 星潮：一列夜车贴着星海开过去 */
  function buildNightTrain(tex) {
    const fx = shell(7.4);
    const g = fx.group;
    const train = new THREE.Group();
    train.position.set(-13.5, 1.88, -14.8);
    train.scale.setScalar(1.7);
    g.add(train);

    const body = std(0x4d5a80, 0.4, 0.42, 0x2f4270, 1.05);
    const cabMat = std(0x644356, 0.46, 0.34, 0x42243a, 0.85);
    const trim = std(0xe0b273, 0.24, 0.86, 0xb3792f, 1.25);
    const dark = std(0x1b2236, 0.6, 0.3, 0x0d1324, 0.6);

    /* 窗外没有灯，给夜车补一盏跟着走的小灯，免得车身只剩一排窗 */
    const trainLight = new THREE.PointLight(0xffc296, 1.7, 16, 2);
    trainLight.position.set(-0.4, 2.6, 3.2);
    train.add(trainLight);

    /* 车身下面垫一层暖光，让深色轮廓不淹没在星海里 */
    const underglow = glowSprite(tex.glow, 0xffb877, 11, 0);
    underglow.scale.set(11, 1.9, 1);
    underglow.position.set(-13.5, 1.0, -15.2);
    g.add(underglow);

    const engine = new THREE.Group();
    engine.position.x = 0.55;
    engine.add(U.box(1.5, 0.16, 0.55, dark, 0, 0.2, 0));
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.245, 1.0, 14), body);
    boiler.rotation.z = Math.PI / 2;
    boiler.position.set(0.16, 0.47, 0);
    engine.add(boiler);
    [-0.04, 0.34].forEach((bx) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.045, 14), trim);
      band.rotation.z = Math.PI / 2;
      band.position.set(bx, 0.47, 0);
      engine.add(band);
    });
    engine.add(U.box(0.6, 0.62, 0.52, cabMat, -0.52, 0.52, 0));
    engine.add(U.box(0.68, 0.05, 0.58, trim, -0.52, 0.845, 0));
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.34, 10), dark);
    chimney.position.set(0.52, 0.9, 0);
    engine.add(chimney);
    const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.072, 0.07, 10), dark);
    flare.position.set(0.52, 1.09, 0);
    engine.add(flare);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), trim);
    dome.position.set(0.2, 0.73, 0);
    engine.add(dome);
    engine.add(U.box(0.1, 0.44, 0.58, trim, 1.25, 0.32, 0));

    const engineWinMat = new THREE.MeshBasicMaterial({
      color: 0xffc886, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false
    });
    [-0.66, -0.38].forEach((wx) => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.17), engineWinMat);
      win.position.set(wx, 0.57, 0.269);
      engine.add(win);
    });
    const lamp = glowSprite(tex.spark, 0xffdca8, 0.85, 0.95);
    lamp.position.set(1.0, 0.57, 0.02);
    engine.add(lamp);
    const lampGlow = glowSprite(tex.glow, 0xffb46a, 2.2, 0.35);
    lampGlow.position.copy(lamp.position);
    engine.add(lampGlow);

    const beamMat = new THREE.MeshBasicMaterial({
      map: tex.beam, color: 0xffc98a, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      toneMapped: false, fog: false
    });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.0), beamMat);
    beam.position.set(3.7, 0.57, 0.03);
    engine.add(beam);

    const wheelGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.07, 12);
    [0.06, 0.62].forEach((wx) => {
      [-0.27, 0.27].forEach((wz) => {
        const wheel = new THREE.Mesh(wheelGeo, dark);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.19, wz);
        engine.add(wheel);
      });
    });
    train.add(engine);

    const carMats = [];
    for (let ci = 0; ci < 3; ci++) {
      const car = new THREE.Group();
      car.position.x = -0.95 - ci * 1.22;
      car.add(U.box(1.14, 0.56, 0.52, ci === 1 ? cabMat : body, 0, 0.52, 0));
      car.add(U.box(1.2, 0.05, 0.56, trim, 0, 0.83, 0));
      car.add(U.box(1.16, 0.09, 0.5, dark, 0, 0.25, 0));
      const roofLight = new THREE.Mesh(
        new THREE.BoxGeometry(1.16, 0.018, 0.54),
        basic(0xffbf7a, { opacity: 0.55, additive: true, depthWrite: false })
      );
      roofLight.position.set(0, 0.858, 0);
      car.add(roofLight);
      const wm = new THREE.MeshBasicMaterial({
        map: tex.windows, transparent: true, opacity: 0, depthWrite: false,
        toneMapped: false, fog: false
      });
      const wgeo = new THREE.PlaneGeometry(1.02, 0.3);
      const front = new THREE.Mesh(wgeo, wm);
      front.position.set(0, 0.585, 0.269);
      car.add(front);
      const back = new THREE.Mesh(wgeo, wm);
      back.position.set(0, 0.585, -0.269);
      back.rotation.y = Math.PI;
      car.add(back);
      [-0.32, 0.32].forEach((wx) => {
        [-0.27, 0.27].forEach((wz) => {
          const wheel = new THREE.Mesh(wheelGeo, dark);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.19, wz);
          car.add(wheel);
        });
      });
      const glow = glowSprite(tex.glow, 0xffb978, 1.8, 0);
      glow.position.set(0, 0.52, 0.3);
      car.add(glow);
      train.add(car);
      carMats.push({ wm: wm, glow: glow.material, delay: 0.4 + ci * 0.34 });
    }

    const smoke = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex.smoke, color: 0xdaddee, transparent: true, opacity: 0,
        depthWrite: false, fog: false
      }));
      s.scale.set(0.48, 0.48, 1);
      train.add(s);
      smoke.push({ s: s, seed: i / 16, ph: i * 1.7 });
    }

    fx.reset = () => {
      train.visible = true;
      train.position.set(-13.5, 1.88, -14.8);
      underglow.material.opacity = 0;
      carMats.forEach((c) => { c.wm.opacity = 0; c.glow.opacity = 0; });
      smoke.forEach((s) => { s.s.material.opacity = 0; });
      beamMat.opacity = 0;
      engineWinMat.opacity = 0;
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.1);
      const x = -13.5 + age * 4.6;
      train.position.x = x;
      train.position.y = 1.88 + Math.sin(age * 1.1) * 0.03;
      train.rotation.z = Math.sin(age * 0.9) * 0.007;
      underglow.position.x = x;
      underglow.material.opacity = 0.2 * fade;
      engineWinMat.opacity = U.clamp((age - 0.15) / 0.5, 0, 1) * fade;
      carMats.forEach((c, i) => {
        const on = U.clamp((age - c.delay) / 0.42, 0, 1);
        c.wm.opacity = on * fade;
        c.glow.opacity = on * (0.26 + Math.sin(t * 2.2 + i * 1.7) * 0.05) * fade;
      });
      lamp.material.opacity = 0.9 * fade;
      lampGlow.material.opacity = (0.32 + Math.sin(t * 3.2) * 0.07) * fade;
      beamMat.opacity = 0.46 * fade;
      smoke.forEach((s) => {
        const u = (age * 0.78 + s.seed) % 1;
        s.s.position.set(1.02 - u * 1.55, 1.08 + u * 0.95, 0.1 + Math.sin(u * 6 + s.ph) * 0.12);
        const sc = 0.26 + u * 0.6;
        s.s.scale.set(sc, sc, 1);
        s.s.material.opacity = Math.sin(u * Math.PI) * 0.3 * fade;
      });
      if (x > 14.6) train.visible = false;
    };
    return fx;
  }

  /* 深海：海螺的回音变成一圈一圈的声波，气泡跟着往上走 */
  function buildAbyssEcho(tex) {
    const fx = shell(9.4);
    const g = fx.group;
    const center = new V3(0, 2.25, -16.5);

    const rings = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x9ff4e4, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false, fog: false
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 72), mat);
      ring.position.copy(center);
      ring.position.z += i * 0.03;
      ring.scale.setScalar(0.6);
      g.add(ring);
      rings.push({ mesh: ring, mat: mat, offset: i * 0.78 });
    }

    const centerGlow = glowSprite(tex.spark, 0x9ff5e8, 3.2, 0);
    centerGlow.position.copy(center);
    g.add(centerGlow);
    const blur = glowSprite(tex.glow, 0x49c9c0, 7.5, 0);
    blur.position.set(0, 2.4, -18.5);
    g.add(blur);

    const N = 70;
    const bubbles = makePoints(N, tex.spark, 0xb6fbf1, 0.12, 0, true);
    const pos = bubbles.geometry.attributes.position;
    const bdata = [];
    const rng = U.mulberry32(771);
    for (let i = 0; i < N; i++) {
      bdata.push({
        x: (rng() - 0.5) * 8,
        y0: -1.3 + rng() * 1.2,
        z: -14.5 - rng() * 6,
        sp: 0.7 + rng() * 1.5,
        ph: rng() * TAU
      });
    }
    g.add(bubbles);

    const big = [];
    for (let i = 0; i < 5; i++) {
      const s = glowSprite(tex.bubble, 0xe6fffb, 0.42, 0);
      const sc = 0.75 + rng() * 0.5;
      s.scale.set(0.42 * sc, 0.42 * sc, 1);
      s.position.set((rng() - 0.5) * 4.5, -1.2, -14 - rng() * 4.5);
      g.add(s);
      big.push({ s: s, ph: rng(), sp: 0.14 + rng() * 0.08, x: s.position.x });
    }

    fx.reset = () => {
      bubbles.material.opacity = 0;
      centerGlow.material.opacity = 0;
      blur.material.opacity = 0;
      rings.forEach((r) => { r.mat.opacity = 0; });
      big.forEach((b) => { b.s.material.opacity = 0; });
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.5);
      rings.forEach((r) => {
        const p = ((age + r.offset) % 2.6) / 2.6;
        const sc = 0.55 + p * 3.9;
        r.mesh.scale.set(sc, sc, 1);
        r.mat.opacity = Math.sin(p * Math.PI) * 0.42 * fade;
      });
      centerGlow.material.opacity = (0.22 + 0.2 * Math.sin(age * 2.3)) * fade;
      centerGlow.scale.setScalar(2.9 + Math.sin(age * 1.9) * 0.25);
      blur.material.opacity = 0.14 * fade;
      bubbles.material.opacity = 0.78 * fade;
      for (let i = 0; i < N; i++) {
        const d = bdata[i];
        const y = -1.3 + ((age * d.sp + d.ph) % 5.9);
        pos.setXYZ(
          i,
          d.x + Math.sin(age * 0.9 + d.ph) * 0.26,
          y,
          d.z + Math.cos(age * 0.7 + d.ph) * 0.18
        );
      }
      pos.needsUpdate = true;
      big.forEach((b) => {
        const q = (age * b.sp + b.ph) % 1;
        b.s.position.y = -1.4 + q * 6.6;
        b.s.position.x = b.x + Math.sin(age * 0.8 + b.ph * TAU) * 0.3;
        b.s.material.opacity = Math.sin(q * Math.PI) * 0.5 * fade;
      });
    };
    return fx;
  }

  /* 樱夜：扇起一阵风，花瓣绕着窗口打转，纸灯从湖面升起来 */
  function buildSakuraWind(tex) {
    const fx = shell(10.6);
    const g = fx.group;
    const N = 112;
    const petals = makePoints(N, tex.petal, 0xffffff, 0.24, 0.95, false);
    const pos = petals.geometry.attributes.position;
    const colors = new Float32Array(N * 3);
    const rng = U.mulberry32(612);
    const pdata = [];
    const tints = [0xffe9ef, 0xffd2dd, 0xf5bccb, 0xfff4f0, 0xf0c0dc];
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      pdata.push({
        a0: rng() * TAU,
        rad: 1.1 + rng() * 3.3,
        y0: -1.0 + rng() * 5.2,
        spin: 0.28 + rng() * 0.5,
        rise: 0.22 + rng() * 0.4,
        ph: rng() * TAU,
        z: -13.5 - rng() * 5
      });
      col.set(tints[Math.floor(rng() * tints.length)]);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    petals.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    petals.material.vertexColors = true;
    petals.material.needsUpdate = true;
    g.add(petals);

    const lanterns = [];
    const lspec = [[-2.4, -16.2, 0.0], [0.2, -15.0, 0.9], [2.5, -17.4, 1.7], [4.3, -15.8, 2.5]];
    lspec.forEach((l, i) => {
      const m = miniLantern(1.6, tex.warm, 0xffb183);
      m.paper.emissiveIntensity = 1.0;
      m.group.position.set(l[0], -0.75, l[1]);
      g.add(m.group);
      lanterns.push({ obj: m.group, paper: m.paper, glow: m.glow, x: l[0], z: l[1], delay: l[2], rise: 4.4 + (i % 2) * 0.9, ph: i * 1.9 });
    });

    fx.reset = () => {
      petals.material.opacity = 0;
      lanterns.forEach((l) => {
        l.obj.position.set(l.x, -0.75, l.z);
        l.obj.visible = true;
        l.paper.opacity = 0;
        l.glow.opacity = 0;
      });
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.6);
      petals.material.opacity = 0.92 * fade;
      for (let i = 0; i < N; i++) {
        const d = pdata[i];
        const ang = d.a0 + age * d.spin;
        const rad = d.rad * (0.86 + 0.14 * Math.sin(age * 1.1 + d.ph));
        pos.setXYZ(
          i,
          0.3 + Math.cos(ang) * rad * 1.3 + Math.sin(age * 1.7 + d.ph) * 0.25,
          -0.8 + ((d.y0 + 0.8 + age * d.rise) % 6.4),
          d.z + Math.sin(ang) * rad * 0.42
        );
      }
      pos.needsUpdate = true;
      lanterns.forEach((l) => {
        const q = U.clamp((age - l.delay) / 7.0, 0, 1);
        const on = q > 0 ? 1 : 0;
        l.obj.position.set(l.x + Math.sin(age * 0.4 + l.ph) * 0.38, -0.72 + q * l.rise, l.z);
        l.paper.opacity = (on ? 0.92 : 0) * fade;
        l.glow.opacity = (on ? 0.5 : 0) * (0.7 + 0.3 * Math.sin(age * 2.6 + l.ph)) * fade;
        l.paper.emissiveIntensity = 0.95 + Math.sin(age * 2.1 + l.ph) * 0.2;
      });
    };
    return fx;
  }

  /* 花火：擦亮火柴，近处连开三朵 */
  function buildHanabiBloom(tex) {
    const fx = shell(6.8);
    const g = fx.group;
    const rng = U.mulberry32(932);
    const palette = [0xffd18a, 0xffa3b7, 0xa9e8ff];
    const origins = [[-3.4, 4.15, -14.9], [0.6, 4.45, -15.7], [3.9, 4.05, -14.7]];
    const delays = [0.85, 2.05, 3.2];
    const bursts = [];

    for (let b = 0; b < 3; b++) {
      const N = 132;
      const pts = makePoints(N, tex.spark, palette[b], 0.23, 0, true);
      const pos = pts.geometry.attributes.position;
      const data = [];
      for (let i = 0; i < N; i++) {
        const u = rng() * 2 - 1;
        const a = rng() * TAU;
        const r = Math.sqrt(Math.max(0, 1 - u * u));
        const sp = 1.0 + rng() * 2.3;
        data.push({
          px: 0, py: 0, pz: 0,
          vx: Math.cos(a) * r * sp,
          vy: u * sp * 0.9 + 0.3,
          vz: Math.sin(a) * r * sp * 0.55,
          vx0: Math.cos(a) * r * sp,
          vy0: u * sp * 0.9 + 0.3,
          vz0: Math.sin(a) * r * sp * 0.55
        });
      }
      g.add(pts);
      const flash = glowSprite(tex.glow, palette[b], 5.8, 0);
      flash.position.set(origins[b][0], origins[b][1], origins[b][2]);
      g.add(flash);
      const refl = glowSprite(tex.glow, palette[b], 4.0, 0);
      refl.scale.set(5.2, 1.5, 1);
      refl.position.set(origins[b][0], -1.95, origins[b][2] + 0.8);
      g.add(refl);
      const rocket = glowSprite(tex.spark, palette[b], 0.4, 0);
      rocket.scale.set(0.1, 1.05, 1);
      rocket.visible = false;
      g.add(rocket);
      bursts.push({
        pts: pts, mat: pts.material, pos: pos, data: data,
        flash: flash, refl: refl, rocket: rocket,
        origin: new V3(origins[b][0], origins[b][1], origins[b][2]),
        delay: delays[b], fired: false
      });
    }

    fx.reset = () => {
      bursts.forEach((b) => {
        b.fired = false;
        b.pts.visible = false;
        b.mat.opacity = 0;
        b.flash.material.opacity = 0;
        b.refl.material.opacity = 0;
        b.rocket.visible = false;
        b.data.forEach((d) => {
          d.px = d.py = d.pz = 0;
          d.vx = d.vx0;
          d.vy = d.vy0;
          d.vz = d.vz0;
        });
      });
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.2);
      bursts.forEach((b) => {
        const lt = age - b.delay;
        if (lt < -0.8) {
          b.rocket.visible = false;
          return;
        }
        if (lt < 0) {
          const k = (lt + 0.8) / 0.8;
          b.rocket.visible = true;
          b.rocket.position.set(
            b.origin.x + Math.sin(k * 9) * 0.08,
            -1.9 + (b.origin.y + 1.9) * k,
            b.origin.z
          );
          b.rocket.material.opacity = 0.9;
          b.pts.visible = false;
          b.flash.material.opacity = 0;
          b.refl.material.opacity = 0;
          return;
        }
        b.rocket.visible = false;
        if (!b.fired) {
          b.fired = true;
          b.pts.visible = true;
        }
        const q = Math.min(1, lt / 2.4);
        const drag = Math.exp(-1.55 * dt);
        for (let i = 0; i < b.data.length; i++) {
          const d = b.data[i];
          d.vx *= drag;
          d.vz *= drag;
          d.vy = d.vy * drag - 0.9 * dt;
          d.px += d.vx * dt;
          d.py += d.vy * dt;
          d.pz += d.vz * dt;
          b.pos.setXYZ(i, b.origin.x + d.px, b.origin.y + d.py, b.origin.z + d.pz);
        }
        b.pos.needsUpdate = true;
        b.mat.opacity = Math.pow(1 - q, 1.5) * fade;
        b.pts.visible = q < 1;
        b.flash.material.opacity = Math.max(0, 1 - lt / 0.55) * 0.75;
        b.flash.scale.setScalar(2.1 + lt * 4.2);
        b.refl.material.opacity = Math.max(0, 1 - lt / 2.3) * 0.3 * fade;
      });
    };
    return fx;
  }

  /* 云海：一排纸灯从云里升上去 */
  function buildCloudLanterns(tex) {
    const fx = shell(12.2);
    const g = fx.group;
    const rng = U.mulberry32(1187);
    const lanterns = [];
    for (let i = 0; i < 11; i++) {
      const scale = 2.6 + rng() * 1.4;
      const m = miniLantern(scale, tex.warm, 0xffa458);
      m.paper.color.setHex(0xffc184);
      m.paper.emissiveIntensity = 1.1;
      const x = -6.5 + rng() * 13;
      const z = -13.8 - rng() * 6.2;
      m.group.position.set(x, 0.1, z);
      g.add(m.group);
      lanterns.push({
        obj: m.group, paper: m.paper, glow: m.glow,
        x: x, z: z, ph: rng() * TAU, delay: i * 0.38 + rng() * 0.25,
        rise: 4.2 + rng() * 1.8
      });
    }
    fx.reset = () => {
      lanterns.forEach((l) => {
        l.obj.position.set(l.x, 0.1, l.z);
        l.paper.opacity = 0;
        l.glow.opacity = 0;
      });
    };
    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.6);
      lanterns.forEach((l) => {
        const q = U.clamp((age - l.delay) / 7.4, 0, 1);
        l.obj.position.set(
          l.x + Math.sin(age * 0.32 + l.ph) * 0.55,
          0.05 + q * l.rise + Math.sin(age * 0.7 + l.ph) * 0.08,
          l.z
        );
        l.paper.opacity = (q > 0 ? 0.94 : 0) * fade;
        l.glow.opacity = (q > 0 ? 0.58 : 0) * (0.75 + 0.25 * Math.sin(age * 2 + l.ph)) * fade;
        l.paper.emissiveIntensity = 1.1 + Math.sin(age * 1.9 + l.ph) * 0.22;
      });
    };
    return fx;
  }

  /* 浮岛：铜鸟领着鸟群穿过岛与岛之间，种子往下落 */
  function buildIslesFlight(tex) {
    const fx = shell(11.0);
    const g = fx.group;
    const rng = U.mulberry32(1421);
    const birds = [];
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex.bird, color: 0x17343a, transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false, fog: false
      });
      const s = new THREE.Sprite(mat);
      const size = 0.56 + rng() * 0.55;
      s.scale.set(size, size, 1);
      s.position.set(-11, 2, -15);
      g.add(s);
      birds.push({
        s: s, mat: mat, size: size,
        speed: 1.4 + rng() * 1.4,
        off: -2 + rng() * 8,
        y: 1.4 + rng() * 3.1,
        z: -13.8 - rng() * 6,
        ph: rng() * TAU
      });
    }

    const N = 26;
    const seeds = makePoints(N, tex.spark, 0xd8ffcf, 0.14, 0, true);
    const spos = seeds.geometry.attributes.position;
    const sdata = [];
    for (let i = 0; i < N; i++) {
      sdata.push({
        x: -7 + rng() * 14,
        z: -14 - rng() * 7,
        ph: rng() * TAU,
        sp: 0.32 + rng() * 0.4
      });
    }
    g.add(seeds);

    fx.reset = () => {
      birds.forEach((b) => {
        b.s.position.set(-11, b.y, b.z);
        b.mat.opacity = 0;
      });
      seeds.material.opacity = 0;
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.5);
      birds.forEach((b) => {
        const x = -11 + age * b.speed + b.off;
        b.s.position.set(x, b.y + Math.sin(age * 1.25 + b.ph) * 0.34, b.z);
        const flap = 0.5 + 0.5 * Math.abs(Math.sin(age * 6.2 + b.ph));
        b.s.scale.set(b.size, b.size * flap, 1);
        b.mat.opacity = (x > 12 ? 0 : 0.94) * fade;
      });
      seeds.material.opacity = 0.9 * fade;
      for (let i = 0; i < N; i++) {
        const d = sdata[i];
        const y = 5.6 - ((age * d.sp + d.ph * 0.8) % 6.4);
        spos.setXYZ(
          i,
          d.x + Math.sin(age * 0.55 + d.ph) * 0.5,
          y,
          d.z + Math.cos(age * 0.4 + d.ph) * 0.3
        );
      }
      spos.needsUpdate = true;
    };
    return fx;
  }

  /* 沙海：驼铃一响，沙丘背面走出一队影子 */
  function buildDunesCaravan(tex) {
    const fx = shell(13.4);
    const g = fx.group;
    const rng = U.mulberry32(1543);
    const camels = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex.camel, color: 0x3b2d43, transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false, fog: false
      });
      const s = new THREE.Sprite(mat);
      s.scale.set(1.6, 1.0, 1);
      const baseX = -10.5 + i * 2.15;
      const z = -17.4 - rng() * 1.6;
      s.position.set(baseX, -0.58, z);
      g.add(s);
      const c = {
        s: s, mat: mat, baseX: baseX, z: z,
        speed: 0.8 + rng() * 0.12,
        ph: i * 1.3 + rng() * 0.6,
        glow: null
      };
      if (i % 2 === 1) {
        const gl = glowSprite(tex.spark, 0xffcf8a, 0.24, 0);
        gl.position.set(baseX + 0.52, -0.34, z + 0.04);
        g.add(gl);
        c.glow = gl;
      }
      camels.push(c);
    }

    fx.reset = () => {
      camels.forEach((c) => {
        c.s.position.set(c.baseX, -0.58, c.z);
        c.mat.opacity = 0;
        if (c.glow) c.glow.material.opacity = 0;
      });
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.6);
      camels.forEach((c) => {
        const x = c.baseX + age * c.speed;
        const y = -0.58 + Math.sin(age * 1.55 + c.ph) * 0.03;
        c.s.position.set(x, y, c.z);
        c.s.material.rotation = Math.sin(age * 0.9 + c.ph) * 0.012;
        c.mat.opacity = (x > 12.5 ? 0 : 0.86) * fade;
        if (c.glow) {
          c.glow.position.set(x + 0.52, y + 0.3, c.z + 0.04);
          c.glow.material.opacity = (0.24 + 0.12 * Math.sin(age * 3.1 + c.ph)) * fade;
        }
      });
    };
    return fx;
  }

  /* 冰原：极光从地平线铺开，冰屑往上浮 */
  function buildIceAurora(tex) {
    const fx = shell(11.6);
    const g = fx.group;
    const ribbons = [];
    const specs = [
      { w: 42, h: 7.2, x: -1.5, y: 5.2, z: -27.5, ph: 0.0, rep: 1.5, delay: 0.0 },
      { w: 36, h: 6.3, x: 2.0, y: 5.9, z: -30.5, ph: 1.4, rep: 1.9, delay: 0.5 },
      { w: 46, h: 7.8, x: -3.0, y: 4.7, z: -33.5, ph: 2.6, rep: 1.15, delay: 1.0 }
    ];
    specs.forEach((r, i) => {
      const map = tex.aurora.clone();
      map.needsUpdate = true;
      map.wrapS = THREE.RepeatWrapping;
      map.repeat.set(r.rep, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: map, color: i === 1 ? 0xa8ffe4 : 0x9ceeff, transparent: true, opacity: 0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false, fog: false
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), mat);
      mesh.position.set(r.x, r.y, r.z);
      mesh.rotation.z = (i - 1) * 0.05;
      g.add(mesh);
      ribbons.push({ mesh: mesh, mat: mat, map: map, ph: r.ph, delay: r.delay, x: r.x, i: i });
    });

    const N = 42;
    const sparks = makePoints(N, tex.spark, 0xc8fff4, 0.1, 0, true);
    const pos = sparks.geometry.attributes.position;
    const sdata = [];
    const rng = U.mulberry32(1657);
    for (let i = 0; i < N; i++) {
      sdata.push({
        x: -3 + rng() * 8,
        y0: -0.7 + rng() * 1.0,
        z: -13 - rng() * 5,
        sp: 0.35 + rng() * 0.55,
        ph: rng() * TAU
      });
    }
    g.add(sparks);

    fx.reset = () => {
      ribbons.forEach((r) => { r.mat.opacity = 0; });
      sparks.material.opacity = 0;
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.6);
      ribbons.forEach((r) => {
        const on = U.clamp((age - r.delay) / 1.6, 0, 1);
        r.mat.opacity = on * (0.42 + Math.sin(age * 0.55 + r.ph) * 0.09) * fade;
        r.map.offset.x = -age * 0.014 * (r.i + 1);
        r.mesh.position.x = r.x + Math.sin(age * 0.09 + r.ph) * 1.1;
      });
      sparks.material.opacity = 0.75 * fade;
      for (let i = 0; i < N; i++) {
        const d = sdata[i];
        const y = -0.7 + ((age * d.sp + d.ph * 0.5) % 4.2);
        pos.setXYZ(
          i,
          d.x + Math.sin(age * 0.8 + d.ph) * 0.28,
          y,
          d.z + Math.cos(age * 0.6 + d.ph) * 0.2
        );
      }
      pos.needsUpdate = true;
    };
    return fx;
  }

  /* 萤森：萤火在窗外围成一圈，像一只慢慢睁开的眼睛 */
  function buildFireflyRing(tex) {
    const fx = shell(9.2);
    const g = fx.group;
    const N = 132;
    const pts = makePoints(N, tex.spark, 0xeaffa0, 0.17, 0, true);
    const pos = pts.geometry.attributes.position;
    const data = [];
    const rng = U.mulberry32(1789);
    const cx = 0.2, cy = 2.7, cz = -14.8;
    for (let i = 0; i < N; i++) {
      data.push({
        sx: (rng() - 0.5) * 15,
        sy: 1.0 + rng() * 4.6,
        sz: -13.5 - rng() * 5.5,
        ang: rng() * TAU,
        rr: 1.02 + rng() * 0.24,
        ph: rng() * TAU
      });
    }
    g.add(pts);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa8ff8a, transparent: true, opacity: 0,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false, fog: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.045, 64), ringMat);
    ring.position.set(cx, cy, cz);
    g.add(ring);
    const core = glowSprite(tex.glow, 0xc8ff9a, 1.6, 0);
    core.position.set(cx, cy, cz);
    g.add(core);

    fx.reset = () => {
      pts.material.opacity = 0;
      ringMat.opacity = 0;
      core.material.opacity = 0;
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.5);
      const gather = U.easeOutCubic(U.clamp(age / 2.7, 0, 1));
      const scatter = Math.max(0, age - 4.7);
      pts.material.opacity = 0.98 * fade;
      for (let i = 0; i < N; i++) {
        const d = data[i];
        const grow = d.rr + scatter * 1.25;
        const ang = d.ang + age * 0.22 + scatter * 0.9;
        const tx = cx + Math.cos(ang) * grow;
        const ty = cy + Math.sin(ang) * grow * 0.92;
        const tz = cz + Math.sin(ang) * grow * 0.22 + Math.sin(age * 1.2 + d.ph) * 0.06;
        pos.setXYZ(
          i,
          U.lerp(d.sx, tx, gather),
          U.lerp(d.sy, ty, gather),
          U.lerp(d.sz, tz, gather)
        );
      }
      pos.needsUpdate = true;
      const on = U.clamp((age - 2.3) / 0.7, 0, 1) * U.clamp((5.8 - age) / 1.2, 0, 1);
      ringMat.opacity = on * 0.4 * fade;
      ring.scale.setScalar(1 + Math.sin(age * 1.8) * 0.02);
      core.material.opacity = on * (0.1 + Math.sin(age * 2.2) * 0.04) * fade;
    };
    return fx;
  }

  /* 书海：书页离开书脊，成群飞过窗口 */
  function buildBookFlight(tex) {
    const fx = shell(11.2);
    const g = fx.group;
    const rng = U.mulberry32(1913);
    const coverMat = std(0x6a4934, 0.78, 0.08, 0x1c110a, 0.12);
    coverMat.transparent = true;
    const pageMat = new THREE.MeshBasicMaterial({
      map: tex.page, side: THREE.DoubleSide, transparent: true, opacity: 1,
      depthWrite: false, toneMapped: false, fog: false
    });
    const spineMat = std(0x3d2a1e, 0.7, 0.1);
    spineMat.transparent = true;

    function makeBook() {
      const b = new THREE.Group();
      b.add(U.box(0.46, 0.026, 0.32, coverMat, 0, 0, 0));
      [-1, 1].forEach((s) => {
        const page = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), pageMat);
        page.position.set(s * 0.105, 0.16, 0);
        page.rotation.y = s * -0.42;
        page.rotation.x = -0.05;
        b.add(page);
      });
      b.add(U.box(0.018, 0.04, 0.33, spineMat, 0, 0.018, 0));
      return b;
    }

    const books = [];
    for (let i = 0; i < 7; i++) {
      const b = makeBook();
      const y = 1.2 + rng() * 3.2;
      const z = -14 - rng() * 5;
      b.position.set(-9 + i * 2.55, y, z);
      b.scale.setScalar(0.72 + rng() * 0.35);
      g.add(b);
      books.push({
        obj: b, y: y, z: z, ph: rng() * TAU,
        speed: 1.5 + rng() * 1.1,
        spin: 0.4 + rng() * 0.5,
        tilt: (rng() - 0.5) * 0.5
      });
    }

    const sheets = [];
    for (let i = 0; i < 13; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex.page, color: 0xfff0d6, transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false, fog: false
      });
      const s = new THREE.Sprite(mat);
      s.scale.set(0.26, 0.34, 1);
      const y = 1.0 + rng() * 3.6;
      const z = -13.5 - rng() * 6;
      s.position.set(-9.5 + i * 1.6, y, z);
      g.add(s);
      sheets.push({ s: s, mat: mat, y: y, z: z, ph: rng() * TAU, speed: 1.6 + rng() * 0.9 });
    }

    const N = 24;
    const scraps = makePoints(N, tex.page, 0xfff0d6, 0.24, 0, false);
    const spos = scraps.geometry.attributes.position;
    const sdata = [];
    for (let i = 0; i < N; i++) {
      sdata.push({
        x: -10 + i * 0.9,
        y: 1.0 + rng() * 3.8,
        z: -14 - rng() * 5,
        sp: 1.5 + rng() * 1.0,
        ph: rng() * TAU
      });
    }
    g.add(scraps);

    fx.reset = () => {
      pageMat.opacity = 0;
      coverMat.opacity = 1;
      books.forEach((b, i) => {
        b.obj.position.set(-9 + i * 2.55, b.y, b.z);
        b.obj.rotation.set(0, 0, 0);
      });
      sheets.forEach((s) => { s.mat.opacity = 0; });
      scraps.material.opacity = 0;
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.6);
      pageMat.opacity = 0.96 * fade;
      coverMat.opacity = fade;
      spineMat.opacity = fade;
      books.forEach((b) => {
        b.obj.position.x = -9 + age * b.speed + b.ph * 0.5 % 16;
        b.obj.position.y = b.y + Math.sin(age * 0.9 + b.ph) * 0.3;
        b.obj.rotation.y = age * b.spin + b.ph;
        b.obj.rotation.z = Math.sin(age * 0.8 + b.ph) * 0.35 + b.tilt;
        b.obj.rotation.x = Math.sin(age * 0.6 + b.ph) * 0.2;
        if (b.obj.position.x > 12) b.obj.visible = false;
        else b.obj.visible = true;
      });
      sheets.forEach((s) => {
        s.s.position.x = -9.5 + age * s.speed + s.ph % 18;
        s.s.position.y = s.y + Math.sin(age * 1.1 + s.ph) * 0.28;
        s.mat.rotation = age * 0.8 + s.ph;
        s.mat.opacity = 0.85 * fade;
        s.s.visible = s.s.position.x < 12;
      });
      scraps.material.opacity = 0.55 * fade;
      for (let i = 0; i < N; i++) {
        const d = sdata[i];
        const x = -11 + ((d.x + 11 + age * d.sp) % 23);
        spos.setXYZ(i, x, d.y + Math.sin(age * 0.8 + d.ph) * 0.32, d.z);
      }
      spos.needsUpdate = true;
    };
    return fx;
  }

  /* 月面：几颗流星从地球背后划过去 */
  function buildMoonMeteors(tex) {
    const fx = shell(8.8);
    const g = fx.group;
    const rng = U.mulberry32(2027);
    const meteors = [];
    for (let i = 0; i < 6; i++) {
      const len = 3.6 + rng() * 1.8;
      const mat = new THREE.SpriteMaterial({
        map: tex.streak, color: 0xffffff, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false
      });
      const s = new THREE.Sprite(mat);
      s.scale.set(len, 0.38 + rng() * 0.14, 1);
      const head = glowSprite(tex.spark, 0xe8f4ff, 0.45, 0);
      g.add(s, head);
      const d = {
        x0: -11 + rng() * 10,
        y0: 6.3 - rng() * 1.4,
        z: -18 - rng() * 4.5,
        dx: 5.0 + rng() * 2.2,
        dy: -2.3 - rng() * 0.9,
        delay: i * 0.78,
        len: len,
        s: s, mat: mat, head: head
      };
      d.ang = Math.atan2(d.dy, d.dx);
      s.material.rotation = d.ang;
      d.head.scale.set(0.45, 0.45, 1);
      meteors.push(d);
    }

    fx.reset = () => {
      meteors.forEach((m) => {
        m.mat.opacity = 0;
        m.head.material.opacity = 0;
        m.s.position.set(m.x0, m.y0, m.z);
      });
    };

    fx.tick = (age, dt, t) => {
      meteors.forEach((m) => {
        const lt = age - m.delay;
        if (lt < 0 || lt > 1.6) {
          m.mat.opacity = 0;
          m.head.material.opacity = 0;
          return;
        }
        const x = m.x0 + m.dx * lt;
        const y = m.y0 + m.dy * lt;
        m.s.position.set(x, y, m.z);
        m.head.position.set(
          x + Math.cos(m.ang) * m.len * 0.42,
          y + Math.sin(m.ang) * m.len * 0.42,
          m.z + 0.01
        );
        const on = U.clamp(lt / 0.12, 0, 1) * U.clamp((1.6 - lt) / 0.6, 0, 1);
        m.mat.opacity = on;
        m.head.material.opacity = on;
      });
    };
    return fx;
  }

  /* 花野：蒲公英的种子乘着风过窗 */
  function buildMeadowSeeds(tex) {
    const fx = shell(10.6);
    const g = fx.group;
    const N = 104;
    const pts = makePoints(N, tex.spark, 0xfff2d6, 0.16, 0, false);
    const pos = pts.geometry.attributes.position;
    const data = [];
    const rng = U.mulberry32(2111);
    for (let i = 0; i < N; i++) {
      data.push({
        x: -11 + rng() * 13,
        y: -0.8 + rng() * 5.2,
        z: -13.5 - rng() * 6.5,
        ph: rng() * TAU,
        sp: 0.45 + rng() * 0.35
      });
    }
    g.add(pts);

    const puffs = [];
    for (let i = 0; i < 12; i++) {
      const s = glowSprite(tex.spark, 0xfff6e2, 0.2, 0);
      s.position.set(-8 + rng() * 12, 0.5 + rng() * 3.6, -14 - rng() * 5);
      g.add(s);
      puffs.push({ s: s, y: s.position.y, z: s.position.z, ph: rng() * TAU, sp: 0.55 + rng() * 0.25 });
    }

    fx.reset = () => {
      pts.material.opacity = 0;
      puffs.forEach((p) => { p.s.material.opacity = 0; });
    };

    fx.tick = (age, dt, t) => {
      const fade = fadeWindow(age, fx.life, 1.6);
      pts.material.opacity = 0.92 * fade;
      for (let i = 0; i < N; i++) {
        const d = data[i];
        const x = -11 + ((d.x + 11 + age * 0.62) % 22);
        pos.setXYZ(
          i,
          x,
          d.y + Math.sin(age * 0.55 + d.ph) * 0.32,
          d.z + Math.cos(age * 0.36 + d.ph) * 0.5
        );
      }
      pos.needsUpdate = true;
      puffs.forEach((p) => {
        p.s.position.x = -11 + ((p.z * -3 + 11 + age * p.sp) % 22);
        p.s.position.y = p.y + Math.sin(age * 0.7 + p.ph) * 0.4;
        p.s.material.opacity = 0.68 * fade;
      });
    };
    return fx;
  }

  /* ———————————————————— 组装：一张茶几，十二件信物 ———————————————————— */
  const TOKEN_BUILDERS = {
    abyss: tokenAbyss,
    cosmos: tokenCosmos,
    sakura: tokenSakura,
    hanabi: tokenHanabi,
    cloudsea: tokenCloudsea,
    isles: tokenIsles,
    dunes: tokenDunes,
    ice: tokenIce,
    firefly: tokenFirefly,
    booksea: tokenBooksea,
    moon: tokenMoon,
    meadow: tokenMeadow
  };

  WP.buildWonders = function (scene, M, dreams) {
    const tex = {
      spark: U.softGlowTexture('rgba(255,255,255,1)', 'rgba(206,232,255,0.5)', 64),
      glow: U.softGlowTexture('rgba(255,246,230,1)', 'rgba(255,186,124,0.42)', 96),
      warm: U.softGlowTexture('rgba(255,238,202,1)', 'rgba(255,166,92,0.5)', 64),
      smoke: smokeTexture(),
      petal: petalTexture(),
      camel: camelTexture(),
      aurora: auroraTexture(),
      streak: streakTexture(),
      page: pageTexture(),
      bird: birdTexture(),
      bubble: bubbleTexture(),
      windows: trainWindowsTexture(),
      beam: beamTexture()
    };

    const effects = {
      abyss: buildAbyssEcho(tex),
      cosmos: buildNightTrain(tex),
      sakura: buildSakuraWind(tex),
      hanabi: buildHanabiBloom(tex),
      cloudsea: buildCloudLanterns(tex),
      isles: buildIslesFlight(tex),
      dunes: buildDunesCaravan(tex),
      ice: buildIceAurora(tex),
      firefly: buildFireflyRing(tex),
      booksea: buildBookFlight(tex),
      moon: buildMoonMeteors(tex),
      meadow: buildMeadowSeeds(tex)
    };
    Object.keys(effects).forEach((k) => {
      const world = dreams.worlds[k];
      if (world && world.group) world.group.add(effects[k].group);
    });

    /* 信物摆在茶几右后方，正对着默认机位；只有入梦之后才出现 */
    const root = new THREE.Group();
    root.name = 'dreamToken';
    root.position.set(0.84, 0.4095, -0.06);
    root.rotation.y = -0.24;
    root.visible = false;
    scene.add(root);

    const halo = glowSprite(tex.warm, 0xffc894, 0.6, 0.12);
    halo.position.y = 0.1;
    root.add(halo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc98e, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false,
      side: THREE.DoubleSide, toneMapped: false, fog: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.148, 0.162, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    root.add(ring);

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 12, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    hit.position.y = 0.1;
    hit.scale.set(1.18, 1, 1.18);
    root.add(hit);

    const holders = {};
    Object.keys(TOKEN_BUILDERS).forEach((k) => {
      const holder = new THREE.Group();
      holder.add(tokenBase(M));
      const relic = TOKEN_BUILDERS[k](M);
      holder.add(relic);
      holder.visible = false;
      root.add(holder);
      holders[k] = { group: holder, relic: relic };
    });

    let current = null;
    let bounce = 0;
    let grow = 0;
    const TOKEN_SCALE = 1.18;

    const item = {
      key: 'dreamToken',
      group: root,
      lights: [],
      on: true,
      interactive: 'dreamToken',
      hover() {
        const r = RELICS[current];
        return r ? r.hover : ['碰一下信物', 'TOUCH THE RELIC'];
      },
      onClick() {
        if (!current || !effects[current] || !dreams.active) return null;
        effects[current].trigger();
        bounce = 1;
        const r = RELICS[current];
        return { toast: r.toast, notes: r.notes };
      }
    };
    root.userData.pickItem = item;

    const W = {
      item: item,
      tokens: holders,
      effects: effects,
      hint(name) {
        return RELICS[name] ? RELICS[name].hint : null;
      },
      sync(name) {
        const key = RELICS[name] ? name : null;
        current = key;
        bounce = 0;
        grow = 0;
        root.visible = !!key;
        Object.keys(holders).forEach((k) => {
          holders[k].group.visible = k === key;
          holders[k].group.scale.setScalar(TOKEN_SCALE * 0.82);
        });
        Object.keys(effects).forEach((k) => {
          if (k !== key) effects[k].stop();
        });
        if (key) {
          const h = holders[key];
          h.relic.rotation.y = 0;
          h.group.rotation.y = 0;
        }
      },
      trigger() {
        return item.onClick();
      },
      update(dt, t) {
        if (!root.visible || !current) return;
        grow = Math.min(1, grow + dt * 2.6);
        const pop = 0.82 + 0.18 * U.easeOutCubic(grow) + bounce * 0.05;
        const h = holders[current];
        h.group.scale.setScalar(TOKEN_SCALE * pop);
        h.group.rotation.y = Math.sin(t * 0.38 + 0.5) * 0.38;
        h.relic.rotation.y = Math.sin(t * 0.26 + 2.1) * 0.22;

        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        ringMat.opacity = (0.14 + pulse * 0.13 + bounce * 0.18) * U.clamp(grow * 2, 0, 1);
        ring.scale.setScalar(1 + pulse * 0.06 + bounce * 0.12);
        halo.material.opacity = (0.08 + pulse * 0.06 + bounce * 0.22) * grow;
        bounce = Math.max(0, bounce - dt * 1.5);

        if (effects[current]) effects[current].update(dt, t);
      }
    };

    W.sync(dreams.active);
    WP.Wonders = W;
    WP.dreamToken = item;
    return W;
  };


})();
