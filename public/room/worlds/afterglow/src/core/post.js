import * as THREE from 'three';
import { EffectComposer } from '../../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/addons/postprocessing/OutputPass.js';
import { ShaderPass } from '../../vendor/addons/postprocessing/ShaderPass.js';
import { isSmall } from './util.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color('#fff0d0') },
    uAspect: { value: 1 },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.028 },
    uAberration: { value: 0.0014 },
    uSaturation: { value: 1.0 },
    uContrast: { value: 1.0 },
    uTint: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
    uDither: { value: 1 / 255 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uWarp;
    uniform float uFlash;
    uniform vec3 uFlashColor;
    uniform float uAspect;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uSaturation;
    uniform float uContrast;
    uniform vec3 uTint;
    uniform float uDither;
    varying vec2 vUv;

    float hash21(vec2 p){
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    vec2 rot(vec2 p, float a){
      float c = cos(a), s = sin(a);
      return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    }
    void main(){
      vec2 uv = vUv;
      vec2 p = uv - 0.5;
      vec2 pa = p * vec2(uAspect, 1.0);
      float r = length(pa);
      float w = clamp(uWarp, 0.0, 1.0);

      // 漩涡与收缩
      float swirl = w * 1.15 * (1.0 - smoothstep(0.0, 0.85, r));
      vec2 q = rot(pa, swirl);
      float pinch = 1.0 - w * 0.32 + w * 0.24 * smoothstep(0.0, 1.0, r);
      q *= pinch;
      uv = 0.5 + q / vec2(uAspect, 1.0);

      // 径向色差
      vec2 dir = normalize(pa + 1e-5);
      float ab = uAberration + w * 0.022;
      vec2 off = dir * ab * (0.25 + r);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;

      // 虹膜转场：外围收黑，边缘留一圈暖光
      float edge = 1.08 - w * 1.08;
      float iris = smoothstep(edge + 0.18, edge - 0.03, r);
      col *= mix(0.035, 1.0, iris);
      float rim = smoothstep(0.035, 0.0, abs(r - edge)) * smoothstep(0.08, 0.45, w);
      col += uFlashColor * rim * 0.85;

      // 调色
      col *= uTint;
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      col = max(col, vec3(0.0));

      // 暗角
      float v = smoothstep(0.35, 1.25, r * 1.25);
      col *= 1.0 - v * uVignette;

      // 闪光
      col += uFlashColor * uFlash * 1.6;

      // 胶片颗粒 + 抖动
      float g = hash21(gl_FragCoord.xy + uTime * 91.7) - 0.5;
      col += g * uGrain;
      col += (hash21(gl_FragCoord.xy * 1.37 + 7.0) - 0.5) * uDither;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x030508, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 0, 6.5);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.72, 0.72, 0.18);
  composer.addPass(bloom);

  const output = new OutputPass();
  composer.addPass(output);

  const grade = new ShaderPass(GradeShader);
  grade.renderToScreen = true;
  composer.addPass(grade);

  function size() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const maxPixels = isSmall() ? 1_900_000 : 3_000_000;
    const px = w * h * ratio * ratio;
    if (px > maxPixels) ratio = Math.max(0.75, Math.sqrt(maxPixels / (w * h)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    grade.uniforms.uAspect.value = w / h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    bloom.setSize(Math.floor(w / 2), Math.floor(h / 2));
  }
  size();

  return {
    renderer,
    composer,
    renderPass,
    bloom,
    grade,
    scene,
    camera,
    size,
    useChapter(chapter) {
      renderPass.scene = chapter.scene;
      renderPass.camera = chapter.camera;
    },
    render() {
      composer.render();
    },
    setWarp(v) {
      grade.uniforms.uWarp.value = v;
    },
    setFlash(v) {
      grade.uniforms.uFlash.value = v;
    },
    setFlashColor(c) {
      grade.uniforms.uFlashColor.value.set(c);
    },
    setTime(t) {
      grade.uniforms.uTime.value = t;
    },
  };
}
