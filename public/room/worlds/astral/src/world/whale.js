import * as THREE from 'three';
import { makeGlowTexture, makeStarTexture, tween, rand, clamp } from '../util.js';

const WHALE_NOISE = /* glsl */`
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0,0.0)), f.x),
               mix(hash21(i + vec2(0.0,1.0)), hash21(i + vec2(1.0,1.0)), f.x), f.y);
  }
  float fbm2(vec2 p) {
    float v = 0.0; float a = 0.55;
    for (int i = 0; i < 4; i++) { v += a * noise2(p); p = p * 2.06 + 3.7; a *= 0.5; }
    return v;
  }
`;

const OUTLINE = [
  [8.0, 0.25],
  [7.6, 1.0],
  [6.7, 1.65],
  [5.2, 2.0],
  [3.3, 2.02],
  [2.35, 2.15],
  [1.62, 3.0],
  [1.28, 2.05],
  [-0.5, 1.85],
  [-3.4, 1.5],
  [-5.7, 0.95],
  [-7.35, 2.05],
  [-6.55, 0.38],
  [-7.55, -1.0],
  [-5.55, -0.48],
  [-3.9, -1.12],
  [-1.1, -1.62],
  [1.8, -1.82],
  [4.45, -1.55],
  [6.4, -1.05],
  [7.55, -0.45],
  [8.0, 0.05],
];

const FIN = [
  [5.05, -1.15],
  [3.4, -2.45],
  [2.5, -3.15],
  [2.3, -2.0],
  [3.4, -1.2],
];

function smoothShape(points, samples = 260) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'catmullrom',
    0.22,
  );
  const pts = curve.getPoints(samples).map((p) => new THREE.Vector2(p.x, p.y));
  const shape = new THREE.Shape(pts);
  return { shape, pts };
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export class ConstellationWhale {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.baseScale = 1.95;
    this.callPulse = 0;
    this.visible = true;
    this.opacityScale = 1;
    this.z = -58;
    this.group = new THREE.Group();
    this.group.position.set(18, 11.4, this.z);
    this.group.scale.set(-this.baseScale, this.baseScale, this.baseScale);
    this.scene.add(this.group);
    this._build();
  }

  _build() {
    const { shape, pts } = smoothShape(OUTLINE);
    const finShape = smoothShape(FIN, 80).shape;

    this.bodyUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#a9c9ec') },
      uOpacity: { value: 0.5 },
      uCall: { value: 0 },
    };

    const bodyMat = new THREE.ShaderMaterial({
      uniforms: this.bodyUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        varying vec2 vPos;
        void main() {
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vPos;
        uniform float uTime, uOpacity, uCall;
        uniform vec3 uColor;
        ${WHALE_NOISE}
        void main() {
          vec2 p = vPos * 0.24;
          float n = fbm2(p + vec2(uTime * 0.012, -uTime * 0.008));
          float veins = smoothstep(0.48, 0.75, fbm2(p * 2.4 - uTime * 0.01));
          float body = 0.022 + 0.07 * n + 0.034 * veins;
          vec3 col = uColor * (0.34 + n * 0.7 + uCall * 1.2);
          col += vec3(0.3, 0.48, 0.66) * uCall * 0.16;
          gl_FragColor = vec4(col, body * uOpacity * (0.78 + uCall * 0.8));
        }
      `,
    });

    const bodyGeo = new THREE.ShapeGeometry(shape, 32);
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.renderOrder = 1;
    this.group.add(this.body);

    const finGeo = new THREE.ShapeGeometry(finShape, 24);
    this.fin = new THREE.Mesh(finGeo, bodyMat);
    this.fin.position.z = 0.01;
    this.group.add(this.fin);

    // outline, doubled for a soft edge
    const linePts = pts.map((p) => new THREE.Vector3(p.x, p.y, 0.02));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    this.lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#d4ecff'),
      transparent: true,
      opacity: 0.66,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.outline = new THREE.LineLoop(lineGeo, this.lineMat);
    this.outline.renderOrder = 2;
    this.group.add(this.outline);

    this.softLineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#9ec8f4'),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const softOutline = new THREE.LineLoop(lineGeo, this.softLineMat);
    softOutline.scale.set(1.015, 1.03, 1);
    softOutline.renderOrder = 1;
    this.group.add(softOutline);

    // constellation stars inside the body
    const internal = [];
    let guard = 0;
    while (internal.length < 34 && guard < 3000) {
      guard++;
      const x = rand(-7.2, 7.6);
      const y = rand(-2.5, 2.5);
      if (!pointInPoly(x, y, pts)) continue;
      if (Math.hypot(x - 6.5, y - 0.4) < 1.4) continue;
      internal.push([x, y]);
    }
    const outlineStars = [];
    for (let i = 0; i < pts.length; i += 4) {
      const p = pts[i];
      outlineStars.push([p.x, p.y, rand(9.0, 14.0)]);
    }
    const totalStars = internal.length + outlineStars.length;
    const starPositions = new Float32Array(totalStars * 3);
    const starSizes = new Float32Array(totalStars);
    internal.forEach(([x, y], i) => {
      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = 0.035;
      starSizes[i] = i % 6 === 0 ? rand(24.0, 34.0) : rand(12.0, 21.0);
    });
    outlineStars.forEach(([x, y, size], i) => {
      const k = internal.length + i;
      starPositions[k * 3] = x;
      starPositions[k * 3 + 1] = y;
      starPositions[k * 3 + 2] = 0.04;
      starSizes[k] = size;
    });
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    this.starUniforms = {
      uOpacity: { value: 0.7 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color('#d7ecff') },
    };
    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.starUniforms,
        uAtlas: { value: makeStarTexture(128) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aSize;
        uniform float uPixelRatio;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPixelRatio * (34.0 / max(1.0, -mvPosition.z));
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uAtlas;
        uniform float uOpacity;
        uniform vec3 uColor;
        void main() {
          float a = texture2D(uAtlas, gl_PointCoord).a;
          gl_FragColor = vec4(uColor * 2.05, a * uOpacity);
          if (gl_FragColor.a < 0.002) discard;
        }
      `,
    });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.starPoints.renderOrder = 3;
    this.group.add(this.starPoints);

    // diffuse star-dust veil so the constellation keeps a readable body
    const veil = [];
    let veilGuard = 0;
    while (veil.length < 760 && veilGuard < 40000) {
      veilGuard++;
      const x = rand(-7.3, 7.7);
      const y = rand(-2.55, 2.55);
      if (!pointInPoly(x, y, pts)) continue;
      if (Math.hypot(x - 6.5, y - 0.4) < 1.1) continue;
      veil.push([x, y]);
    }
    const veilPositions = new Float32Array(veil.length * 3);
    const veilSizes = new Float32Array(veil.length);
    veil.forEach(([x, y], i) => {
      veilPositions[i * 3] = x;
      veilPositions[i * 3 + 1] = y;
      veilPositions[i * 3 + 2] = 0.028;
      veilSizes[i] = rand(2.0, 4.8);
    });
    const veilGeo = new THREE.BufferGeometry();
    veilGeo.setAttribute('position', new THREE.BufferAttribute(veilPositions, 3));
    veilGeo.setAttribute('aSize', new THREE.BufferAttribute(veilSizes, 1));
    this.veilUniforms = {
      uOpacity: { value: 0.35 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color('#bcd9f6') },
    };
    const veilMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.veilUniforms,
        uAtlas: { value: makeStarTexture(64) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aSize;
        uniform float uPixelRatio;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPixelRatio * (34.0 / max(1.0, -mvPosition.z));
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uAtlas;
        uniform float uOpacity;
        uniform vec3 uColor;
        void main() {
          float a = texture2D(uAtlas, gl_PointCoord).a;
          gl_FragColor = vec4(uColor * 1.5, a * uOpacity);
          if (gl_FragColor.a < 0.002) discard;
        }
      `,
    });
    this.veil = new THREE.Points(veilGeo, veilMat);
    this.veil.renderOrder = 1;
    this.group.add(this.veil);

    // connect nearby stars into a constellation web
    const lineVerts = [];
    for (let i = 0; i < internal.length; i++) {
      for (let j = i + 1; j < internal.length; j++) {
        const d = Math.hypot(internal[i][0] - internal[j][0], internal[i][1] - internal[j][1]);
        if (d < 1.95 && Math.random() < 0.14) {
          lineVerts.push(internal[i][0], internal[i][1], 0.03, internal[j][0], internal[j][1], 0.03);
        }
      }
    }
    const webGeo = new THREE.BufferGeometry();
    webGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
    this.webMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#86b6e9'),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.web = new THREE.LineSegments(webGeo, this.webMat);
    this.web.renderOrder = 1;
    this.group.add(this.web);

    // the eye of the whale
    this.eye = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeStarTexture(256),
      color: new THREE.Color('#eaf6ff'),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }));
    this.eye.position.set(6.5, 0.4, 0.05);
    this.eye.scale.set(1.4, 1.4, 1);
    this.group.add(this.eye);

    // wide ghost halo
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(512, 1.5),
      color: new THREE.Color('#8fc4f2'),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }));
    this.halo.position.set(1.0, 0.8, -0.2);
    this.halo.scale.set(34, 14, 1);
    this.group.add(this.halo);

    // generous invisible hit area
    this.hit = new THREE.Mesh(
      new THREE.PlaneGeometry(16.5, 7.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.hit.position.z = 0.1;
    this.group.add(this.hit);
    this.hit.userData.whale = true;
  }

  setPalette(p) {
    this._palette = p;
    this.bodyUniforms.uColor.value.copy(p.whale);
    this.lineMat.color.copy(p.whale).lerp(new THREE.Color('#ffffff'), 0.35);
    this.softLineMat.color.copy(p.whale);
    this.starUniforms.uColor.value.copy(p.whale).lerp(new THREE.Color('#ffffff'), 0.5);
    this.veilUniforms.uColor.value.copy(p.whale).lerp(new THREE.Color('#ffffff'), 0.3);
    this.eye.material.color.copy(p.whale).lerp(new THREE.Color('#ffffff'), 0.6);
    this.halo.material.color.copy(p.whale);
    this.opacityScale = p.whaleOpacity;
  }

  setVisible(visible) {
    this.visible = visible;
  }

  setPixelRatio(v) {
    this.starUniforms.uPixelRatio.value = v;
    this.veilUniforms.uPixelRatio.value = v;
  }

  call() {
    this.callPulse = 1;
    tween(4200, (t) => {
      this.callPulse = 1 - t;
    }, { ease: (t) => t });
    tween(1600, (t) => {
      this.eye.scale.setScalar(1.4 + Math.sin(t * Math.PI) * 2.0);
    });
  }

  update(dt, elapsed, cameraQuaternion) {
    this.bodyUniforms.uTime.value = elapsed;
    this.callPulse = clamp(this.callPulse, 0, 1);

    const cycle = 88;
    const x = 29 - ((elapsed * 0.8 + 48) % cycle);
    const y = 10.4 + Math.sin(elapsed * 0.12) * 0.8;
    this.group.position.set(x, y, this.z);
    this.group.quaternion.copy(cameraQuaternion);
    const sway = Math.sin(elapsed * 0.45) * 0.04 + Math.sin(elapsed * 1.8) * 0.007;
    this.group.rotateZ(sway);
    const scale = this.baseScale * (1 + this.callPulse * 0.03);
    this.group.scale.set(-scale, scale, scale);

    const edgeFade = Math.min(
      clamp((29 - x) / 12, 0, 1),
      clamp((x + 59) / 12, 0, 1),
    );
    const alpha = this.opacityScale * edgeFade * (this.visible ? 1 : 0);
    const flicker = 0.88 + 0.12 * Math.sin(elapsed * 0.8);

    this.bodyUniforms.uOpacity.value = alpha * 1.05;
    this.bodyUniforms.uCall.value = this.callPulse;
    this.lineMat.opacity = alpha * 0.55 * flicker;
    this.softLineMat.opacity = alpha * 0.24;
    this.starUniforms.uOpacity.value = alpha * 1.35;
    this.veilUniforms.uOpacity.value = alpha * 0.5;
    this.webMat.opacity = alpha * 0.11;
    this.eye.material.opacity = alpha * 0.95;
    this.halo.material.opacity = alpha * 0.3;
    this.group.visible = alpha > 0.002;
  }
}
