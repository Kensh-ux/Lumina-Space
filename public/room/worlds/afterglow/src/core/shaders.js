// 共用的 GLSL 片段：噪声、光谱、星空。
export const NOISE = /* glsl */ `
float hash11(float p){
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash31(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}
float fbm3(vec3 p){
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise3(p);
    p = p * 2.03 + vec3(17.1, 9.2, 4.7);
    amp *= 0.5;
  }
  return sum;
}
float fbm3low(vec3 p){
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * noise3(p);
    p = p * 2.04 + vec3(7.3, 3.1, 9.7);
    amp *= 0.5;
  }
  return sum;
}
float ridged(vec3 p){
  float n = fbm3low(p);
  return 1.0 - abs(n * 2.0 - 1.0);
}
`;

export const SPECTRAL = /* glsl */ `
vec3 spectral(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(1.00, 0.18, 0.07), vec3(1.00, 0.52, 0.10), smoothstep(0.00, 0.20, t));
  c = mix(c, vec3(1.00, 0.91, 0.58), smoothstep(0.18, 0.38, t));
  c = mix(c, vec3(0.48, 0.98, 0.64), smoothstep(0.36, 0.55, t));
  c = mix(c, vec3(0.32, 0.80, 1.00), smoothstep(0.53, 0.72, t));
  c = mix(c, vec3(0.42, 0.46, 1.00), smoothstep(0.70, 0.86, t));
  c = mix(c, vec3(0.74, 0.44, 1.00), smoothstep(0.84, 1.00, t));
  return c;
}
vec3 blackbody(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.55, 0.07, 0.01), vec3(0.95, 0.25, 0.04), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.00, 0.55, 0.16), smoothstep(0.22, 0.55, t));
  c = mix(c, vec3(1.00, 0.83, 0.52), smoothstep(0.45, 0.75, t));
  c = mix(c, vec3(1.00, 0.96, 0.88), smoothstep(0.70, 0.92, t));
  c = mix(c, vec3(0.76, 0.86, 1.00), smoothstep(0.90, 1.00, t));
  return c;
}
`;

export const STARS = /* glsl */ `
float starCell(vec3 dir, float scale, float threshold, float sharp){
  vec3 p = dir * scale;
  vec3 i = floor(p);
  vec3 f = fract(p) - 0.5;
  float h = hash31(i);
  if (h < threshold) return 0.0;
  vec3 off = vec3(hash31(i + 11.1), hash31(i + 31.7), hash31(i + 57.3)) - 0.5;
  float d = length(f - off * 0.62);
  return smoothstep(sharp, 0.0, d) * pow((h - threshold) / max(1.0 - threshold, 0.001), 2.2);
}
vec3 starField(vec3 d, float time){
  float s = 0.0;
  s += starCell(d, 110.0, 0.900, 0.075) * 1.5;
  s += starCell(d, 240.0, 0.940, 0.050) * 2.0;
  s += starCell(d, 510.0, 0.968, 0.032) * 2.8;
  float tint = smoothstep(0.2, 0.9, noise3(d * 8.0 + 2.0));
  vec3 col = mix(vec3(0.80, 0.88, 1.0), vec3(1.0, 0.88, 0.70), tint);
  return col * s;
}
vec3 backdrop(vec3 d, vec3 colA, vec3 colB){
  float n = fbm3(d * 2.3 + vec3(1.2, 4.5, 8.1));
  float n2 = fbm3low(d * 5.5 - vec3(3.0, 1.0, 2.2));
  vec3 c = vec3(0.004, 0.007, 0.012);
  c += colA * pow(smoothstep(0.42, 0.9, n), 2.0) * 0.5;
  c += colB * pow(smoothstep(0.55, 0.95, n2), 3.0) * 0.35;
  c += vec3(0.006, 0.009, 0.014);
  return c;
}
`;

export const VERT_PASS = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
