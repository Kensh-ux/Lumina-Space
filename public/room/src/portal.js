/* 窗畔 · 茶几旁的三界钥匙
   一枚黄铜浑天仪，搁在胡桃木底座上。三颗小星各是一种颜色，
   点一下，就打开「请选择不同的世界」。 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const WP = window.WP;
  if (WP.worldPortal) return;

  const GEMS = [0x9fc3de, 0xc8a878, 0xe0a06b];
  const SPOT = new THREE.Vector3(1.17, 0, -0.3);

  function build(M) {
    const g = new THREE.Group();
    g.position.copy(SPOT);
    g.rotation.y = -0.38;
    g.scale.setScalar(1.12);
    g.userData.noMerge = true;

    /* 底座：胡桃木圆台，压一圈黄铜线 */
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.122, 0.034, 32), M.darkWood);
    base.position.y = 0.017;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const inlay = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.003, 6, 44), M.brass);
    inlay.rotation.x = Math.PI / 2;
    inlay.position.y = 0.035;
    g.add(inlay);

    const foot = new THREE.Mesh(new THREE.TorusGeometry(0.119, 0.0028, 6, 48), M.brass);
    foot.rotation.x = Math.PI / 2;
    foot.position.y = 0.005;
    g.add(foot);

    /* 立柱与黄铜托 */
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.018, 0.105, 14), M.brassDark);
    stem.position.y = 0.087;
    stem.castShadow = true;
    g.add(stem);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.014, 20), M.brass);
    cup.position.y = 0.145;
    g.add(cup);

    /* 托与浑天仪之间留一道缝，让它看起来是浮着的 */
    const wick = WP.U.sprite(M.glowTex, 0xffc98a, 0.2, 0.12);
    wick.scale.set(0.1, 0.26, 1);
    wick.position.y = 0.21;
    g.add(wick);

    const cradle = new THREE.Group();
    cradle.position.y = 0.335;
    g.add(cradle);

    const ringGeo = new THREE.TorusGeometry(0.118, 0.0042, 6, 64);
    const ringA = new THREE.Mesh(ringGeo, M.brass);
    ringA.rotation.set(0.26, 0, 0.16);
    ringA.castShadow = true;
    cradle.add(ringA);

    const ringB = new THREE.Mesh(ringGeo, M.brass);
    ringB.rotation.set(0.26, Math.PI / 2, -0.16);
    ringB.castShadow = true;
    cradle.add(ringB);

    const equator = new THREE.Mesh(new THREE.TorusGeometry(0.126, 0.0036, 6, 72), M.brassDark);
    equator.rotation.x = Math.PI / 2;
    equator.castShadow = true;
    cradle.add(equator);

    /* 三颗星：蓝、木、橙，对应门后的三个世界 */
    const gems = [];
    GEMS.forEach((hex, i) => {
      const a = (i / GEMS.length) * Math.PI * 2 + Math.PI / 2;
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.0115, 12, 10),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(1.35) })
      );
      gem.position.set(Math.cos(a) * 0.126, 0, Math.sin(a) * 0.126);
      cradle.add(gem);
      gems.push(gem);

      const aura = WP.U.sprite(M.glowTex, hex, 0.5, 0.062);
      aura.position.copy(gem.position);
      aura.material.blending = THREE.AdditiveBlending;
      cradle.add(aura);
    });

    /* 中心的钥匙芯 */
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 20, 14),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a4).multiplyScalar(1.5) })
    );
    cradle.add(orb);

    const halo = WP.U.sprite(M.glowTex, 0xffcf96, 0.36, 0.24);
    cradle.add(halo);

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 0.33;
    hit.userData.noMerge = true;
    g.add(hit);

    return { group: g, cradle, ringA, ringB, orb, halo, gems };
  }

  function createItem(M) {
    const parts = build(M);
    let flash = 0;

    const item = {
      key: 'worldPortal',
      group: parts.group,
      lights: [],
      on: true,
      interactive: 'worldPortal',
      hover() {
        return ['选择另一个世界', 'CHOOSE ANOTHER WORLD'];
      },
      onClick() {
        flash = 1;
        if (WP.Audio && WP.Audio.isOn() && WP.Audio.chime) WP.Audio.chime();
        if (window.WB && WB.worlds && WB.worlds.open) WB.worlds.open();
        else if (WP.UI) WP.UI.toast('世界之门还没装好 · 请刷新页面', 2400);
        return true;
      },
      update(t, dt) {
        const d = Math.min(dt, 0.2);
        parts.cradle.rotation.y = t * 0.16;
        parts.cradle.position.y = 0.335 + Math.sin(t * 0.9) * 0.006;
        parts.ringA.rotation.z = 0.16 + Math.sin(t * 0.5) * 0.07;
        parts.ringB.rotation.z = -0.16 + Math.sin(t * 0.42 + 1.3) * 0.07;
        const breathe = 1 + Math.sin(t * 1.7) * 0.05 + flash * 0.55;
        parts.orb.scale.setScalar(breathe);
        parts.halo.material.opacity = 0.32 + Math.sin(t * 1.3) * 0.07 + flash * 0.32;
        parts.halo.scale.setScalar(0.24 * (1 + Math.sin(t * 1.1) * 0.04 + flash * 0.5));
        parts.gems.forEach((gem, i) => {
          gem.scale.setScalar(1 + Math.sin(t * 1.9 + i * 2.1) * 0.12);
        });
        flash = WP.U.damp(flash, 0, 3.2, d);
      }
    };
    parts.group.userData.pickItem = item;
    return item;
  }

  function attach() {
    if (WP.worldPortal) return true;
    const APP = WP.APP;
    if (!APP || !APP.scene || !APP.furniture || !Array.isArray(APP.pickables)) return false;
    if (APP.startedAt == null || !document.body.classList.contains('ready')) return false;

    const M = APP.mats || WP.buildMaterials();
    const item = createItem(M);
    APP.scene.add(item.group);
    APP.furniture.worldPortal = item;
    if (APP.pickables.indexOf(item.group) < 0) APP.pickables.push(item.group);
    WP.worldPortal = item;
    hint();
    return true;
  }

  function hint() {
    if (document.body.classList.contains('is-embedded')) return;
    setTimeout(() => {
      if (!document.body.classList.contains('ready')) return;
      if (window.WB && WB.worlds && WB.worlds.isOpen && WB.worlds.isOpen()) return;
      if (WP.UI && WP.UI.toast) {
        WP.UI.toast('茶几旁多了一枚世界钥匙 · 点一下，换一个世界', 4600);
      }
    }, 3200);
  }

  if (window.MutationObserver) {
    const obs = new MutationObserver(() => {
      if (attach()) obs.disconnect();
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  window.addEventListener('load', attach);
  const retry = setInterval(() => {
    if (attach()) clearInterval(retry);
  }, 1200);
  setTimeout(() => clearInterval(retry), 30000);
  attach();

  WP.worldPortal = WP.worldPortal || null;
  WP.openWorlds = function () {
    if (window.WB && WB.worlds && WB.worlds.open) {
      WB.worlds.open();
      return true;
    }
    return false;
  };
})();
