import * as THREE from 'three';
import { makeRenderer, isMobile, compileAsync } from './utils.js';

// Fixed full-screen layer: drifting topographic contours plus a bundle of glowing silk ribbons.
// uInvert flips the world from ink-black to crimson during the hero zoom-out.
const frag = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uInvert;
uniform float uRibbons;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy / uRes.y);
  vec2 m = uMouse - 0.5;
  float t = uTime * 0.025;

  // Topographic contours
  float n = fbm(p * 1.15 + vec2(t, -t * 0.6) + m * 0.18);
  float k = n * 9.0;
  float f = abs(fract(k) - 0.5);
  float w = fwidth(k) * 1.2;
  float contour = 1.0 - smoothstep(0.0, w, f - 0.0);
  contour *= smoothstep(0.0, 0.35, n) * 0.9;

  vec3 voidC = vec3(0.024, 0.024, 0.031);
  vec3 deep = vec3(0.50, 0.035, 0.08);
  vec3 crimson = vec3(0.878, 0.094, 0.176);
  vec3 base = mix(voidC, deep, uInvert);
  // vignette glow
  float vg = smoothstep(1.2, 0.1, length((uv - vec2(0.5, 0.45)) * vec2(uRes.x / uRes.y, 1.0)));
  base += mix(vec3(0.05, 0.0, 0.01), vec3(0.18, 0.01, 0.03), uInvert) * vg;

  vec3 lineC = mix(crimson * 0.42, vec3(0.0), uInvert);
  vec3 col = mix(base, lineC, contour * mix(0.55, 0.5, uInvert));

  // Silk ribbons: many thin strands that braid along a diagonal sweep
  vec3 glow = vec3(0.0);
  float x = uv.x * 2.4 - 0.2;
  for (int i = 0; i < 14; i++){
    float fi = float(i);
    float y = 0.58 - uv.x * 0.32
      + 0.10 * sin(x * 1.7 + uTime * 0.22 + fi * 0.21)
      + 0.035 * sin(x * 4.3 - uTime * 0.31 + fi * 0.57)
      + (fi - 7.0) * 0.0045 * (1.0 + sin(x * 2.0 + uTime * 0.2));
    y += m.y * 0.04;
    float d = abs(uv.y - y);
    float g = 0.0009 / (d + 0.0018);
    float fade = smoothstep(0.0, 0.25, uv.x) * smoothstep(1.05, 0.55, uv.x);
    vec3 strand = mix(crimson, vec3(1.0, 0.42, 0.36), fract(fi * 0.37));
    glow += strand * g * fade * 0.32;
  }
  col += glow * uRibbons * (1.0 - uInvert * 0.75);

  // grain
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createBackground(canvas, invert) {
  const scale = isMobile() ? 0.5 : 0.65;
  const renderer = makeRenderer(canvas, { alpha: false, antialias: false, pixelRatio: Math.min(window.devicePixelRatio, 2) * scale });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uRes: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uInvert: invert || { value: 0 },
    uRibbons: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: frag,
    depthTest: false,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  const target = new THREE.Vector2(0.5, 0.5);
  window.addEventListener('pointermove', (e) => target.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight), { passive: true });

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    uniforms.uRes.value.copy(s);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    uniforms,
    compile: () => compileAsync(renderer, scene, camera),
    render(time) {
      uniforms.uTime.value = time;
      uniforms.uMouse.value.lerp(target, 0.04);
      renderer.render(scene, camera);
    },
  };
}
