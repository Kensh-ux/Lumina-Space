/* 窗畔 · 主程序：渲染管线、室内布光、交互与时间 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const CFG = WP.CONFIG;

  if (typeof THREE === 'undefined') {
    const label = document.getElementById('loadingLabel');
    if (label) label.textContent = '没有找到 THREE，请检查 vendor 目录';
    return;
  }
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

  const MOBILE = window.matchMedia('(max-width: 900px)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const WINDOW_GAIN = 0.8;

  /* 初始陈设：屏风与望远镜现在一进屋就在，串灯留到夜里再点 */
  const DEFAULT_OBJECTS = {
    piano: true, record: true, guitar: true, musicBox: true, windChime: true,
    pendant: true, floorLamp: true, candles: true, stringLights: false, sconce: true,
    rug: true, armchair: true, table: true, toyTrain: true, shelves: true, wallArt: true, vase: true,
    letters: true, rockingChair: true, sideTable: true, screen: true,
    cat: true, plant: true, knitting: true, aquarium: true,
    penguin: true, seal: true, bear: true, bunny: true,
    telescope: true, globe: true
  };

  const ACTIONS = {
    piano: ['轻触琴键', 'PLAY A PHRASE'],
    record: ['放上唱针', 'DROP THE NEEDLE'],
    cat: ['挠挠下巴', 'PET THE CAT'],
    guitar: ['拨一下琴弦', 'STRUM THE STRINGS'],
    musicBox: ['上紧发条', 'WIND THE BOX'],
    windChime: ['摇一摇风铃', 'RING THE CHIME'],
    toyTrain: ['让火车跑快些', 'WIND THE TRAIN'],
    armchair: ['换一只靠垫', 'SWAP THE CUSHION'],
    telescope: ['凑近目镜', 'LOOK THROUGH'],
    penguin: ['抱一下企鹅', 'HUG THE PENGUIN'],
    seal: ['拍拍海豹', 'PAT THE SEAL'],
    bear: ['摸摸小熊', 'POKE THE BEAR'],
    bunny: ['碰碰兔耳', 'BOOP THE BUNNY'],
    aquarium: ['撒一点鱼食', 'FEED THE FISH'],
    globe: ['转一转地球', 'SPIN THE GLOBE'],
    rockingChair: ['坐上去摇一摇', 'ROCK A WHILE'],
    sideTable: ['点亮台灯', 'LIGHT THE LAMP'],
    screen: ['展开屏风', 'UNFOLD THE SCREEN'],
    sconce: ['拨亮壁灯', 'LIGHT THE SCONCE'],
    dreamToken: ['碰一下信物', 'TOUCH THE RELIC']
  };

  const APP = {
    renderer: null, scene: null, camera: null,
    composer: null, bloom: null, fxaa: null, finish: null, hdr: false,
    room: null, furniture: null, street: null, dreams: null, wonders: null, mats: null,
    windowLight: null, roomHemi: null, roomAmb: null,
    dust: null, dustData: null, dustBase: null,
    pickables: [],
    raycaster: null, ndc: null,
    hover: null,
    pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    pointerRaw: { x: 0, y: 0 },
    clock: null, startedAt: 0, intro: 0, scopeUntil: 0,
    running: false, pianoHinted: false, catHinted: false,
    suspended: false,
    frame: 0,
    quality: { scale: MOBILE ? 0.68 : 1, slow: 0, span: 0, lastDrop: 0, shadowEvery: 3 }
  };

  const WARM_FILL = new THREE.Color(0x9d8b72);
  const AMB_FILL = new THREE.Color(0x4a3527);
  const WHITE = new THREE.Color(0xffffff);

  /* ———————————————————— 后期：最后的胶片味 ———————————————————— */
  const FINISH_VERT = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const FINISH_FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uAberration;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);

      // 镜头边缘的轻微色散（只在边缘生效，中心省两次采样）
      vec3 col = texture2D(tDiffuse, uv).rgb;
      if (uAberration > 0.001 && r2 > 0.045) {
        float ab = uAberration * 0.0016 * r2;
        col.r = texture2D(tDiffuse, uv + d * ab).r;
        col.b = texture2D(tDiffuse, uv - d * ab).b;
      }

      // 冷暖分离：阴影偏青蓝，高光偏琥珀
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col *= mix(vec3(0.985, 0.995, 1.035), vec3(1.045, 1.005, 0.95), smoothstep(0.02, 0.62, l));

      // 柔和暗角（与界面里的 scrim 叠加，但不能太重）
      vec2 vd = d * vec2(1.12, 1.0);
      float vig = smoothstep(1.18, 0.24, length(vd));
      col *= mix(1.0, 0.3 + 0.7 * vig, uVignette);

      // 线性 → sRGB
      col = pow(max(col, 0.0), vec3(1.0 / 2.2));

      // 一点点对比与饱和
      col = (col - 0.5) * 1.03 + 0.5;
      l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, 1.045);
      col = clamp(col, 0.0, 1.0);

      // 胶片颗粒 + 抖动，避免暗部起带（一次 hash 兼顾两者）
      float n = hash(gl_FragCoord.xy * 0.73 + fract(uTime) * 143.0);
      col += (n - 0.5) * (uGrain + 0.0039);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `;

  /* ———————————————————— 小工具 ———————————————————— */
  function nextFrame() {
    // 后台标签页里 rAF 会被暂停，用定时器兜底，保证载入不会卡死
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      requestAnimationFrame(() => setTimeout(finish, 0));
      setTimeout(finish, 48);
    });
  }

  function progress(p, label) {
    if (WP.UI && WP.UI.setLoading) WP.UI.setLoading(p, label);
  }

  function pixelRatio() {
    /* 桌面端把有效像素比落在 1~1.5：DPR=1 的屏幕也能满分辨率渲染，
       DPR=2 的屏幕不额外放大到 2x，兼顾清晰度与帧率 */
    const cap = MOBILE ? 1.6 : 1.5;
    const base = Math.min(Math.max(window.devicePixelRatio || 1, 1), cap);
    const q = APP.quality ? APP.quality.scale : 1;
    /* 允许低于 1：DPR=1 的屏幕也要能靠内部分辨率换帧率 */
    return Math.max(0.5, base * q);
  }

  /* 每 2.4 秒统计一次：超预算（>24ms）的帧占四成以上才降一档，
     目标是让画面重新咬住 60fps；开场 6.5 秒内不判定，避开装场景与字体加载 */
  function updateQuality(dt) {
    const q = APP.quality;
    if (!q) return;
    q.shadowEvery = q.scale < 0.72 ? 4 : 3;
    const elapsed = APP.clock ? APP.clock.elapsedTime : 99;
    if (elapsed < 6.5) return;
    q.span += dt;
    /* 一次几百毫秒的卡顿多半来自切场景或编译着色器，不当作常态掉帧 */
    if (dt > 0.024 && dt < 0.12) q.slow += dt;
    if (q.span < 2.4) return;

    const now = performance.now();
    if (q.slow > q.span * 0.4 && now - q.lastDrop > 1800 && q.scale > 0.56) {
      q.scale = Math.max(0.55, q.scale - 0.07);
      q.lastDrop = now;
      resize();
    }
    q.slow = 0;
    q.span = 0;
  }

  async function waitForFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const list = [
      '400 20px "Noto Serif SC"',
      '500 20px "Noto Serif SC"',
      '600 20px "Noto Serif SC"',
      '300 20px "Cormorant"',
      'italic 400 20px "Cormorant"',
      '400 12px "Plex Mono"'
    ];
    const timeout = new Promise((resolve) => setTimeout(resolve, 3200));
    try {
      await Promise.race([Promise.allSettled(list.map((f) => document.fonts.load(f))), timeout]);
      await Promise.race([document.fonts.ready, timeout]);
    } catch (e) {
      /* 字体慢一点也没关系，画布里会退回到系统宋体 */
    }
  }

  /* ———————————————————— 渲染器与相机 ———————————————————— */
  function createRenderer() {
    const el = document.getElementById('scene');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c12);

    const camera = new THREE.PerspectiveCamera(CFG.camera.fov, 1, 0.05, 260);
    camera.position.fromArray(CFG.camera.pos);
    camera.lookAt(new THREE.Vector3().fromArray(CFG.camera.look));

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(Math.max(1, window.innerWidth), Math.max(1, window.innerHeight), false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.LinearEncoding;
    renderer.autoClear = true;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement);

    /* 把显卡支持的各向异性上限交给贴图工具，远处的地板与墙面不会再抖成网 */
    if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
      U.MAX_ANISO = Math.min(16, renderer.capabilities.getMaxAnisotropy() || 8);
    }

    APP.scene = scene;
    APP.camera = camera;
    APP.renderer = renderer;
    APP.raycaster = new THREE.Raycaster();
    /* 默认阈值是一整米：细线（海豹胡须）和点状气泡会把远处的点击抢走，收紧到指面大小 */
    APP.raycaster.params.Line.threshold = 0.02;
    APP.raycaster.params.Points.threshold = 0.03;
    APP.ndc = new THREE.Vector2();
  }

  function createComposer() {
    const renderer = APP.renderer;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const pr = renderer.getPixelRatio();

    let rt;
    if (renderer.capabilities.isWebGL2) {
      rt = new THREE.WebGLRenderTarget(Math.round(w * pr), Math.round(h * pr), {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        encoding: THREE.LinearEncoding,
        depthBuffer: true,
        stencilBuffer: false,
        /* 4x MSAA 在集显上代价过高；满分辨率 + FXAA 已能压住窗棂与百叶的细线抖动 */
        samples: 0
      });
      rt.texture.name = 'window.hdr';
      APP.hdr = true;
    }

    const composer = rt ? new THREE.EffectComposer(renderer, rt) : new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(APP.scene, APP.camera));

    /* 阈值太低会把窗台这类大面积亮面也卷进泛光，低分辨率模糊后
       在坐垫上叠出波纹；抬到 0.8 只留下灯泡、灯罩这类真正的亮点 */
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.55, 0.8);
    composer.addPass(bloom);

    const fxaa = new THREE.ShaderPass(THREE.FXAAShader);
    composer.addPass(fxaa);

    const finish = new THREE.ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uVignette: { value: 0.42 },
        uGrain: { value: 0.03 },
        uAberration: { value: 1.0 }
      },
      vertexShader: FINISH_VERT,
      fragmentShader: FINISH_FRAG
    });
    composer.addPass(finish);
    finish.renderToScreen = true;

    APP.composer = composer;
    APP.bloom = bloom;
    APP.fxaa = fxaa;
    APP.finish = finish;
    resize();
  }

  function resize() {
    if (!APP.renderer) return;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const pr = pixelRatio();

    APP.renderer.setPixelRatio(pr);
    APP.renderer.setSize(w, h, false);

    const camera = APP.camera;
    const aspect = w / h;
    camera.aspect = aspect;
    let fov = CFG.camera.fov;
    if (aspect < 0.78) fov = 72;
    else if (aspect < 1.05) fov = 66;
    else if (aspect < 1.35) fov = 61;
    camera.fov = fov;
    camera.updateProjectionMatrix();

    if (APP.composer) {
      if (APP.hdr) {
        APP.composer.setSize(Math.round(w * pr), Math.round(h * pr));
      } else {
        APP.composer.setPixelRatio(pr);
        APP.composer.setSize(w, h);
      }
    }
    /* 泛光本质是模糊，半分辨率足够，还省掉四级降采样的带宽 */
    if (APP.bloom) {
      APP.bloom.setSize(
        Math.max(1, Math.round(w * pr * 0.5)),
        Math.max(1, Math.round(h * pr * 0.5))
      );
    }
    if (APP.fxaa) {
      APP.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    }
  }

  /* ———————————————————— 室内外布置 ———————————————————— */
  function addFurniture(M) {
    const items = WP.buildFurniture(M);
    Object.keys(items).forEach((key) => {
      const item = items[key];
      if (!item || !item.group) return;
      const on = DEFAULT_OBJECTS[key] !== undefined ? DEFAULT_OBJECTS[key] : item.on !== false;
      item.on = on;
      item.group.visible = on;
      item.baseLights = (item.lights || []).map((l) => l.intensity);
      APP.scene.add(item.group);
    });
    APP.furniture = items;
    return items;
  }

  function setupInterior(M) {
    APP.scene.environment = M.envMap;

    /* 窗口光用一盏点光：面光源的 LTC 逐像素代价太高，点光已足够把窗光铺进房间 */
    const win = new THREE.PointLight(0xffc093, 1.92, 10, 2);
    win.position.set(0, 1.95, -3.2);
    APP.scene.add(win);
    APP.windowLight = win;

    const hemi = new THREE.HemisphereLight(0xbfa88a, 0x1d130d, 0.2);
    APP.scene.add(hemi);
    APP.roomHemi = hemi;

    const amb = new THREE.AmbientLight(0x5a4433, 0.13);
    APP.scene.add(amb);
    APP.roomAmb = amb;
  }

  function createDust(M) {
    const count = MOBILE ? 90 : 155;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const data = [];
    const rng = U.mulberry32(919);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -3.7 + rng() * 7.4;
      pos[i * 3 + 1] = 0.34 + rng() * 2.72;
      pos[i * 3 + 2] = -3.15 + rng() * 5.95;
      data.push({
        baseX: pos[i * 3],
        vy: 0.008 + rng() * 0.024,
        phase: rng() * Math.PI * 2,
        sway: 0.035 + rng() * 0.11,
        speed: 0.16 + rng() * 0.3
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: MOBILE ? 0.026 : 0.031,
      map: M.glowTex,
      color: 0xffd8a4,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    APP.scene.add(points);
    APP.dust = points;
    APP.dustData = data;
  }

  function updateDust(dt, t) {
    if (!APP.dust) return;
    const attr = APP.dust.geometry.attributes.position;
    const arr = attr.array;
    const data = APP.dustData;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      let y = arr[i * 3 + 1] + d.vy * dt;
      if (y > 3.36) y = 0.28;
      arr[i * 3] = d.baseX + Math.sin(t * d.speed + d.phase) * d.sway;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  }

  /* ———————————————————— 声音 ———————————————————— */
  function ensureAudio(quiet) {
    if (WP.Audio.isOn()) return true;
    const ok = WP.Audio.enable();
    if (ok) {
      WP.Audio.setMood(APP.street ? APP.street.mood : 'dusk');
      if (APP.furniture && APP.furniture.record) {
        WP.Audio.setRecord(!!APP.furniture.record.isPlaying);
      }
      if (WP.UI) WP.UI.setSound(true);
      if (!quiet && WP.UI) WP.UI.toast('环境声已开启 · 风从窗缝里进来', 2600);
    } else if (!quiet && WP.UI) {
      WP.UI.toast('这个浏览器没有可用的声音', 2600);
    }
    return ok;
  }

  function toggleSound() {
    if (WP.Audio.isOn()) {
      WP.Audio.disable();
      if (WP.UI) {
        WP.UI.setSound(false);
        WP.UI.toast('房间安静下来', 1800);
      }
      return;
    }
    const ok = ensureAudio(true);
    if (WP.UI) WP.UI.setSound(ok);
    if (ok) {
      WP.Audio.chime();
      if (WP.UI) WP.UI.toast('环境声已开启 · 戴上耳机更近一些', 2800);
    }
  }

  /* ———————————————————— 陈设开关 ———————————————————— */
  function setObject(key, on) {
    const item = APP.furniture && APP.furniture[key];
    if (!item) return;
    item.on = !!on;
    item.group.visible = !!on;
    if (key === 'record' && !on) {
      item.isPlaying = false;
      if (WP.Audio) WP.Audio.setRecord(false);
      if (WP.Music) WP.Music.pause();
    }
    if (key === 'musicBox' && !on && item.stop) item.stop();
    if (key === 'telescope' && on && WP.Audio.isOn()) {
      /* 望远镜没有声音，但让它出现时有一点点轻响 */
      WP.Audio.click();
    }
    if (WP.UI) WP.UI.setObject(key, !!on);
    if (window.WP && WP.emit) WP.emit('object', { key, on: !!on });
  }

  /* ———————————————————— 交互 ———————————————————— */
  function pickAt(clientX, clientY) {
    if (!APP.pickables.length) return null;
    const rect = APP.renderer.domElement.getBoundingClientRect();
    APP.ndc.set(
      ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
    );
    APP.raycaster.setFromCamera(APP.ndc, APP.camera);
    const list = APP.pickables.filter((g) => g.visible);
    const hits = APP.raycaster.intersectObjects(list, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.pickItem) o = o.parent;
    return o && o.visible ? o.userData.pickItem : null;
  }

  function hoverLabel(item) {
    if (!item) return null;
    if (item.key === 'record') {
      return item.isPlaying ? ['抬起唱针', 'LIFT THE NEEDLE'] : ['放上唱针', 'DROP THE NEEDLE'];
    }
    if (item.key === 'piano') {
      return item.notes && item.notes.length ? ['再弹一遍', 'ONCE MORE'] : ACTIONS.piano;
    }
    const fallback = ACTIONS[item.key] || ['点一下', 'TOUCH'];
    if (typeof item.hover === 'function') {
      try {
        const label = item.hover();
        if (Array.isArray(label) && label[0]) return [label[0], label[1] || fallback[1]];
        if (label) return [label, fallback[1]];
      } catch (e) {
        /* 贴纸状态读不到时，退回默认文案 */
      }
    }
    return fallback;
  }

  function setHover(item) {
    const el = document.getElementById('scene');
    if (APP.hover === item) return;
    APP.hover = item;
    if (el) el.classList.toggle('is-hovering', !!item);
    if (!item) {
      if (WP.UI) WP.UI.hideTooltip();
      return;
    }
    const label = hoverLabel(item);
    if (label && WP.UI) {
      WP.UI.tooltip(APP.pointerRaw.x, APP.pointerRaw.y, label[0], label[1]);
    }
  }

  function handlePointerMove(e) {
    APP.pointerRaw.x = e.clientX;
    APP.pointerRaw.y = e.clientY;
    if (e.pointerType === 'touch') return;

    APP.pointer.tx = U.clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
    APP.pointer.ty = U.clamp(-(e.clientY / window.innerHeight - 0.5) * 2, -1, 1);

    const now = performance.now();
    if (now - (APP.lastHover || 0) < 48) return;
    APP.lastHover = now;
    const item = pickAt(e.clientX, e.clientY);
    setHover(item);
    if (item) {
      const label = hoverLabel(item);
      if (label && WP.UI) WP.UI.tooltip(e.clientX, e.clientY, label[0], label[1]);
    }
  }

  function activatePiano(item) {
    const hadSound = WP.Audio.isOn();
    ensureAudio(true);
    const hasSound = WP.Audio.isOn();
    item.playPhrase();
    if (WP.UI) {
      if (!hadSound && hasSound) WP.UI.toast('琴声和窗外的风一起响起来', 2800);
      else if (!APP.pianoHinted) WP.UI.toast('一架旧钢琴 · 再点一次，再弹一遍', 3400);
    }
    APP.pianoHinted = true;
  }

  function activateRecord(item) {
    ensureAudio(true);
    let on;
    if (WP.Music && WP.Music.hasTracks && WP.Music.hasTracks()) {
      on = WP.Music.toggle();
      item.isPlaying = !!on;
    } else {
      on = item.toggle();
    }
    WP.Audio.setRecord(!!on);
    if (on) {
      if (WP.UI) {
        const title = WP.Music && WP.Music.current ? WP.Music.current() : null;
        WP.UI.toast(
          WP.Audio.isOn()
            ? '唱针落下 · ' + (title ? title.title : '黑胶开始转动')
            : '唱针落下 · 打开环境声才能听见',
          2600
        );
      }
    } else if (WP.UI) {
      WP.UI.toast('唱针抬起，房间安静下来', 2000);
    }
    if (APP.hover === item && WP.UI) {
      const label = hoverLabel(item);
      WP.UI.tooltip(APP.pointerRaw.x, APP.pointerRaw.y, label[0], label[1]);
    }
  }

  function activateCat(item) {
    item.onClick();
    if (WP.Audio.isOn()) WP.Audio.meow();
    if (!APP.catHinted && WP.UI) {
      WP.UI.toast(WP.Audio.isOn() ? '它抬起头，喵了一声' : '它抬起头，眯了眯眼', 2400);
      APP.catHinted = true;
    }
  }

  function activateGuitar(item) {
    const hadSound = WP.Audio.isOn();
    ensureAudio(true);
    item.strum();
    if (WP.UI) {
      if (!hadSound && WP.Audio.isOn()) WP.UI.toast('六根弦里还留着一点风', 2600);
      else if (!APP.guitarHinted) WP.UI.toast('靠在椅边的旧吉他 · 音有些松了', 3000);
    }
    APP.guitarHinted = true;
  }

  function activateWindChime(item) {
    item.onClick();
    if (WP.Audio.isOn()) {
      [96, 100, 103, 100, 96].forEach((n, i) => WP.Audio.note(n, i * 0.08, 0.05));
    }
    if (!APP.chimeHinted && WP.UI) {
      WP.UI.toast('风铃自己找到了一小段风', 2700);
      APP.chimeHinted = true;
    }
  }

  function activateToyTrain(item) {
    item.onClick();
    if (WP.Audio.isOn()) {
      WP.Audio.note(52, 0, 0.08);
      WP.Audio.note(59, 0.12, 0.06);
      WP.Audio.note(64, 0.24, 0.05);
    }
    if (!APP.trainHinted && WP.UI) {
      WP.UI.toast('小火车在茶几旁绕圈跑起来 · 汽笛只有一点点响', 3000);
      APP.trainHinted = true;
    }
  }

  function activateArmchair(item) {
    const color = item.onClick();
    if (WP.Audio.isOn()) WP.Audio.note(72, 0, 0.035);
    if (WP.UI) WP.UI.toast('换了一只' + color + '的靠垫', 1900);
  }

  function activateTelescope(item) {
    ensureAudio(true);
    APP.scopeUntil = (APP.clock ? APP.clock.elapsedTime : 0) + 4.2;
    if (WP.Audio.isOn()) {
      WP.Audio.note(79, 0, 0.04);
      WP.Audio.note(86, 0.1, 0.035);
    }
    if (WP.UI) WP.UI.toast('凑近目镜 · 窗外的光被轻轻拉近了一点', 2600);
  }

  /* 玩偶、水族箱这些小东西：摸一下就有回应，不强迫打开环境声 */
  function activateDoll(item) {
    item.onClick();
    if (WP.Audio.isOn()) {
      const base = { penguin: 76, seal: 72, bear: 67, bunny: 79 }[item.kind] || 72;
      WP.Audio.note(base, 0, 0.045);
      WP.Audio.note(base + 4, 0.09, 0.03);
    }
    if (!APP.dollHinted && WP.UI) {
      WP.UI.toast('它晃了晃，像是在等下一次被抱起来', 3000);
      APP.dollHinted = true;
    }
  }

  function activateAquarium(item) {
    item.onClick();
    if (WP.Audio.isOn()) {
      [84, 88, 91, 96].forEach((n, i) => WP.Audio.note(n, i * 0.075, 0.022));
    }
    if (!APP.aquariumHinted && WP.UI) {
      WP.UI.toast('鱼食落进水里，鱼群绕着水草转了一圈', 3000);
      APP.aquariumHinted = true;
    }
  }

  function activateGlobe(item) {
    item.onClick();
    if (!APP.globeHinted && WP.UI) {
      WP.UI.toast('地球在指尖转了一圈 · 窗外还是那条街', 3000);
      APP.globeHinted = true;
    }
  }

  function activateMusicBox(item) {
    const hadSound = WP.Audio.isOn();
    ensureAudio(true);
    const on = item.onClick();
    if (on && WP.Audio.isOn()) {
      const melody = [76, 79, 81, 84, 81, 79, 76, 72];
      melody.forEach((n, i) => WP.Audio.note(n, 0.08 + i * 0.28, 0.05));
    }
    if (WP.UI) {
      if (on) WP.UI.toast(hadSound || WP.Audio.isOn() ? '发条转起来，盒子里有人在跳舞' : '盒盖开了，里面静悄悄', 3000);
      else WP.UI.toast('盒盖合上，舞步停在半空', 1800);
    }
    APP.musicBoxHinted = true;
  }

  function activateRockingChair(item) {
    item.onClick();
    if (!APP.rockingHinted && WP.UI) {
      WP.UI.toast('椅子自己摇了起来，吱呀，吱呀', 2800);
      APP.rockingHinted = true;
    }
  }

  function activateSideTable(item) {
    const on = item.onClick();
    if (WP.Audio.isOn()) WP.Audio.click();
    if (WP.UI) WP.UI.toast(on ? '台灯亮了，书页暖了一点' : '台灯熄了，房间暗了一块', 1800);
  }

  function activateScreen(item) {
    const open = item.onClick();
    if (!APP.screenHinted && WP.UI) {
      WP.UI.toast(open ? '屏风展开 · 山水慢慢显出来' : '屏风折起 · 房间又宽了一些', 2400);
      APP.screenHinted = true;
    }
  }

  function activateSconce(item) {
    const on = item.onClick();
    if (WP.Audio.isOn()) WP.Audio.click();
    if (WP.UI) WP.UI.toast(on ? '壁灯拨亮了，窗框多了一道暖边' : '壁灯熄了，只剩窗外的光', 1800);
  }

  /* 幻境信物：只在梦里出现，点一下，窗外会多出一段只属于这个夜晚的动静 */
  function activateDreamToken(item) {
    if (!APP.dreams || !APP.dreams.active) return;
    const wasOn = WP.Audio.isOn();
    const result = item.onClick();
    if (!result) return;
    if (!wasOn) ensureAudio(true);
    if (WP.Audio.isOn() && result.notes) {
      result.notes.forEach((n) => WP.Audio.note(n[0], n[1], n[2] || 0.04));
    }
    if (WP.UI) WP.UI.toast(result.toast, 3600);
  }

  function handleClick(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const item = pickAt(e.clientX, e.clientY);
    if (!item) return;
    switch (item.interactive) {
      case 'record': activateRecord(item); break;
      case 'piano': activatePiano(item); break;
      case 'cat': activateCat(item); break;
      case 'guitar': activateGuitar(item); break;
      case 'windChime': activateWindChime(item); break;
      case 'toyTrain': activateToyTrain(item); break;
      case 'armchair': activateArmchair(item); break;
      case 'telescope': activateTelescope(item); break;
      case 'doll': activateDoll(item); break;
      case 'aquarium': activateAquarium(item); break;
      case 'globe': activateGlobe(item); break;
      case 'musicBox': activateMusicBox(item); break;
      case 'rockingChair': activateRockingChair(item); break;
      case 'sideTable': activateSideTable(item); break;
      case 'screen': activateScreen(item); break;
      case 'sconce': activateSconce(item); break;
      case 'dreamToken': activateDreamToken(item); break;
      default:
        if (typeof item.onClick === 'function') item.onClick();
    }
  }

  function wireInteractions() {
    const canvas = APP.renderer.domElement;
    const pickables = [];
    Object.keys(APP.furniture).forEach((key) => {
      const item = APP.furniture[key];
      if (item.interactive && item.group) pickables.push(item.group);
    });
    if (WP.dreamToken && WP.dreamToken.group) pickables.push(WP.dreamToken.group);
    APP.pickables = pickables;

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', () => {
      setHover(null);
      APP.pointer.tx = 0;
      APP.pointer.ty = 0;
    });
    canvas.addEventListener('click', handleClick);

    const piano = APP.furniture.piano;
    if (piano) {
      piano.onNote = (midi, i, at) => {
        if (WP.Audio.isOn()) WP.Audio.note(midi, at, 0.07);
      };
    }
    const guitar = APP.furniture.guitar;
    if (guitar) {
      guitar.onStrum = () => {
        if (WP.Audio.isOn()) {
          if (WP.Audio.strum) WP.Audio.strum();
          else WP.Audio.chime();
        }
      };
    }
    /* 唱片机与唱片柜共用同一张唱片：无论从哪边播放，唱盘都跟着转 */
    if (WP.Music && WP.Music.setHook) {
      WP.Music.setHook((state) => {
        const rec = APP.furniture.record;
        if (rec) rec.isPlaying = !!state.playing;
        if (WP.Audio && WP.Audio.isOn()) WP.Audio.setRecord(!!state.playing);
      });
    }
    if (FINE_POINTER) {
      canvas.addEventListener('pointerdown', () => {
        if (!WP.Audio.isOn()) return;
        WP.Audio.click();
      });
    }
  }

  /* ———————————————————— 光景 ———————————————————— */
  function handleMood(name) {
    if (!APP.street) return;
    if (APP.street.mood === name) {
      if (WP.UI) WP.UI.setMood(name);
      return;
    }
    APP.street.setMood(name);
  }

  function syncAmbience(t) {
    if (!APP.street) return;
    const st = APP.street.state;
    const r = APP.renderer;
    if (r) r.toneMappingExposure = st.exposure;

    const win = APP.windowLight;
    if (win) {
      win.color.copy(st.windowColor);
      win.intensity = st.windowLight * WINDOW_GAIN;
    }

    if (APP.roomHemi) {
      APP.roomHemi.color.copy(st.windowColor).lerp(WARM_FILL, 0.46);
      APP.roomHemi.groundColor.copy(AMB_FILL);
      APP.roomHemi.intensity = 0.045 + st.windowLight * 0.021;
    }
    if (APP.roomAmb) {
      APP.roomAmb.color.copy(st.windowColor).lerp(AMB_FILL, 0.55);
      APP.roomAmb.intensity = 0.028 + st.windowLight * 0.012;
    }

    /* 室内灯具随窗外光景一起呼吸：白天收敛，雨夜更暖 */
    const lampScale = U.clamp(0.4 + st.lamp * 0.62, 0.35, 1.35);
    if (APP.furniture) {
      Object.keys(APP.furniture).forEach((key) => {
        const item = APP.furniture[key];
        if (!item || !item.lights || !item.lights.length) return;
        item.moodGain = lampScale;
        /* 烛火、台灯与壁灯自己管明暗，这里只把光景增益交给它们 */
        if (key === 'candles' || item.manualLights) return;
        const base = item.baseLights || [];
        item.lights.forEach((l, i) => {
          if (base[i] !== undefined) l.intensity = base[i] * lampScale;
        });
      });
    }

    if (APP.dust) {
      APP.dust.material.color.copy(st.windowColor).lerp(WHITE, 0.32);
      APP.dust.material.opacity = 0.035 + st.windowLight * 0.02;
    }

    if (APP.bloom) {
      APP.bloom.strength = 0.27 + st.lamp * 0.06 + st.wet * 0.08;
    }
    if (APP.finish) {
      const u = APP.finish.material.uniforms;
      u.uTime.value = t;
      u.uVignette.value = 0.18 + st.vignette * 0.3;
      u.uGrain.value = st.grain;
      u.uAberration.value = st.aberration;
    }
  }

  /* ———————————————————— 相机：开场与呼吸 ———————————————————— */
  const INTRO_POS = new THREE.Vector3(0.62, 1.71, 3.28);
  const INTRO_LOOK = new THREE.Vector3(-0.78, 1.86, -3.6);
  const BASE_POS = new THREE.Vector3().fromArray(CFG.camera.pos);
  const BASE_LOOK = new THREE.Vector3().fromArray(CFG.camera.look);
  /* 竖屏时把视线压低一些，让窗成为主角，而不是天花板 */
  const PORTRAIT_POS = new THREE.Vector3(0.06, 1.52, 2.4);
  const PORTRAIT_LOOK = new THREE.Vector3(-0.02, 0.92, -3.6);
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  function updateCamera(dt, t) {
    const camera = APP.camera;
    if (!camera) return;
    const portrait = camera.aspect < 0.78;

    APP.pointer.x = U.damp(APP.pointer.x, APP.pointer.tx, 4.4, dt);
    APP.pointer.y = U.damp(APP.pointer.y, APP.pointer.ty, 3.6, dt);

    if (APP.startedAt > 0) {
      APP.intro = Math.min(1, (t - APP.startedAt) / 8.5);
    }
    const k = U.easeInOutCubic(APP.intro);

    tmpPos.lerpVectors(INTRO_POS, portrait ? PORTRAIT_POS : BASE_POS, k);
    tmpLook.lerpVectors(INTRO_LOOK, portrait ? PORTRAIT_LOOK : BASE_LOOK, k);

    const breathe = Math.sin(t * 0.33) * 0.006;
    const drift = Math.sin(t * 0.11) * 0.018;
    const influence = 0.32 + k * 0.68;

    camera.position.set(
      tmpPos.x + APP.pointer.x * 0.11 * influence + drift,
      tmpPos.y + APP.pointer.y * 0.045 * influence + breathe,
      tmpPos.z
    );
    camera.lookAt(
      tmpLook.x + APP.pointer.x * 0.17 * influence + drift * 0.6,
      tmpLook.y + APP.pointer.y * 0.1 * influence + breathe * 0.8,
      tmpLook.z
    );

    /* 凑近望远镜时镜头收一点，过几秒再退回来 */
    const wantedFov = t < APP.scopeUntil ? 44 : CFG.camera.fov;
    if (Math.abs(camera.fov - wantedFov) > 0.02) {
      camera.fov = U.damp(camera.fov, wantedFov, 2.6, dt);
      camera.updateProjectionMatrix();
    }
  }

  /* ———————————————————— 主循环 ———————————————————— */
  function animate() {
    if (!APP.running) return;
    requestAnimationFrame(animate);
    /* 打开另一个世界时把房间挂起：保留循环但不再渲染，省下 GPU 给 iframe */
    if (APP.suspended) {
      APP.clock.getDelta();
      return;
    }
    const dt = Math.min(APP.clock.getDelta(), 0.05);
    const t = APP.clock.elapsedTime;

    WP.clock.time.value = t;
    WP.clock.wind.value = 0.5 + Math.sin(t * 0.1) * 0.5;

    if (APP.street) APP.street.update(dt, t);
    if (APP.dreams) APP.dreams.update(dt, t);
    if (APP.wonders) APP.wonders.update(dt, t);

    if (APP.furniture) {
      const items = APP.furniture;
      Object.keys(items).forEach((key) => {
        const item = items[key];
        if (item.update && item.group.visible) item.update(t, dt);
      });
    }

    /* 尘埃漂得慢，隔帧上传位置就够，省掉一半缓冲提交 */
    if (APP.frame % 2 === 0) updateDust(dt * 2, t);
    updateCamera(dt, t);
    syncAmbience(t);
    updateQuality(dt);

    /* 阴影不必每帧重烘：人车移动很慢，隔几帧更新肉眼几乎看不出来 */
    APP.frame++;
    const shadowEvery = APP.quality.shadowEvery || 3;
    if (APP.frame % shadowEvery === 0) APP.renderer.shadowMap.needsUpdate = true;

    APP.composer.render();
  }

  /* ———————————————————— 启动 ———————————————————— */
  function initUI() {
    const UI = WP.UI;
    if (!UI) return;
    UI.init({
      onMood(name) {
        handleMood(name);
      },
      onToggle(key, on) {
        setObject(key, on);
      },
      onSoundToggle() {
        toggleSound();
      },
      onMusicToggle() {
        if (WP.Music) WP.Music.toggle();
      },
      onImmerse() {
        UI.hideTooltip();
      },
      onAboutClose() {
        /* 回到窗边，什么也不做 */
      }
    });
    UI.setSound(false);
  }

  async function boot() {
    try {
      createRenderer();
      initUI();
      progress(0.05, '正在把窗推开');
      await nextFrame();

      progress(0.1, '正在等字体醒来');
      await waitForFonts();
      progress(0.17, '正在调和颜色');
      await nextFrame();

      const M = WP.buildMaterials();
      APP.mats = M;
      progress(0.28, '正在刨光木纹');
      await nextFrame();

      const room = WP.buildRoom(APP.scene, M);
      APP.room = room;
      APP.scene.add(room);
      progress(0.42, '正在装好窗框与窗帘');
      await nextFrame();

      addFurniture(M);
      /* 家具按单品合批；唱片机转盘、串灯灯泡、烛火与猫被单独排除 */
      Object.keys(APP.furniture).forEach((key) => {
        const item = APP.furniture[key];
        if (!item.group || (item.group.userData && item.group.userData.noMerge)) return;
        U.mergeStatic(item.group, { exclude: item.mergeExclude || [] });
      });
      progress(0.56, '正在摆好三十一件陈设');
      await nextFrame();

      progress(0.66, '正在点亮街灯');
      await nextFrame();

      const street = WP.buildStreet(APP.scene, M);
      APP.street = street;
      street.onMoodChange = (name, meta) => {
        if (WP.UI) WP.UI.setMood(name);
        if (APP.wonders) APP.wonders.sync(name);
        if (WP.UI && meta && meta.quote) WP.UI.toast(meta.quote, 3900);
        WP.emit('mood', { mood: name });
      };

      progress(0.8, '正在铺一条会呼吸的街');
      await nextFrame();

      /* 十二重幻境与六种街景共用同一套光景状态机 */
      APP.dreams = WP.buildDreams(APP.scene, M, street);
      /* 幻境信物与窗外的十二段小奇迹：挂在各自的世界里，平时不亮 */
      APP.wonders = WP.buildWonders(APP.scene, M, APP.dreams, street);

      setupInterior(M);
      createDust(M);
      wireInteractions();

      /* 初始陈设状态同步到侧栏 */
      const initial = {};
      Object.keys(APP.furniture).forEach((key) => {
        initial[key] = !!APP.furniture[key].on;
      });
      WP.UI.buildObjects(initial);
      WP.UI.setMood(street.mood);
      WP.UI.setSound(false);
      WP.Audio.setMood(street.mood);

      createComposer();
      progress(0.9, '正在擦亮最后一块玻璃');
      await nextFrame();

      try {
        APP.renderer.compile(APP.scene, APP.camera);
      } catch (e) {
        /* 个别旧显卡不支持预编译，直接进入首帧 */
      }
      APP.clock = new THREE.Clock();
      APP.renderer.shadowMap.autoUpdate = false;
      APP.renderer.shadowMap.needsUpdate = true;
      APP.running = true;
      animate();
      await nextFrame();
      await nextFrame();

      progress(1, '窗已经开了');
      await new Promise((resolve) => setTimeout(resolve, 420));
      APP.startedAt = APP.clock.elapsedTime;
      WP.UI.finishLoading();
      if (WP.Bridge && WP.Bridge.onAppReady) WP.Bridge.onAppReady();
    } catch (err) {
      console.error('[窗畔] 启动失败', err);
      const label = document.getElementById('loadingLabel');
      if (label) label.textContent = '窗没有打开 · 请打开控制台查看原因';
      const pct = document.getElementById('loadingPct');
      if (pct) pct.textContent = '!!';
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 180));

  /* 暴露一份调试入口，方便本机验收与自动化测试 */
  WP.APP = APP;
  WP.setMood = handleMood;
  WP.setObject = setObject;
  WP.setSound = function (on) {
    if (on) ensureAudio(false);
    else if (WP.Audio.isOn()) toggleSound();
  };
  WP.setImmersion = function (on) {
    if (WP.UI) WP.UI.setImmersion(!!on);
  };
  WP.setSuspended = function (on) {
    APP.suspended = !!on;
  };
  /* 给桥接层与自动化测试用的轻量事件总线 */
  WP.emit = function (type, detail) {
    try {
      window.dispatchEvent(new CustomEvent('windowlight:' + type, { detail: detail || {} }));
    } catch (e) {
      /* 老浏览器没有 CustomEvent 构造器时静默跳过 */
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
