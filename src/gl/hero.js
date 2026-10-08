import * as THREE from 'three';
import { makeRenderer, isMobile } from './utils.js';

// The portrait is drawn twice in one shader: a crimson ink/halftone version and the real colour photo.
// A decaying fluid trail painted by the cursor decides where colour shows through.
const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const trailFrag = /* glsl */ `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform vec2 uPrevMouse;
uniform float uStrength;
uniform float uAspect;
uniform float uDecay;
uniform vec2 uTexel;
varying vec2 vUv;

float segDist(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
void main(){
  // soft diffusion so the trail spreads like ink in water
  float c = texture2D(uPrev, vUv).r * 0.6;
  c += texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r * 0.1;
  c += texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r * 0.1;
  c += texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r * 0.1;
  c += texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r * 0.1;
  c *= uDecay;
  vec2 asp = vec2(uAspect, 1.0);
  float d = segDist(vUv * asp, uPrevMouse * asp, uMouse * asp);
  float brush = smoothstep(0.11, 0.0, d) * uStrength;
  gl_FragColor = vec4(max(c, brush), 0.0, 0.0, 1.0);
}
`;

const compFrag = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uTrail;
uniform vec2 uRes;
uniform float uImgAspect;
uniform float uTime;
uniform vec2 uParallax;
uniform float uReveal;
varying vec2 vUv;

void main(){
  vec2 frag = vUv * uRes;
  float imgH = min(uRes.y * 0.93, uRes.x * 0.92 / uImgAspect);
  float imgW = imgH * uImgAspect;
  vec2 origin = vec2((uRes.x - imgW) * 0.5 + uParallax.x * 18.0, uParallax.y * 10.0 - imgH * (1.0 - uReveal) * 0.25);
  vec2 iuv = (frag - origin) / vec2(imgW, imgH);
  if (iuv.x < 0.0 || iuv.x > 1.0 || iuv.y < 0.0 || iuv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
  vec4 tex = texture2D(uTex, iuv);
  float mask = texture2D(uTrail, vUv).r;
  mask = smoothstep(0.05, 0.75, mask);

  float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  // halftone dots in the shadows
  vec2 g = fract(frag / 5.0) - 0.5;
  float dotR = (1.0 - lum) * 0.62;
  float ht = 1.0 - smoothstep(dotR - 0.08, dotR + 0.08, length(g));
  vec3 inkDark = vec3(0.05, 0.015, 0.025);
  vec3 crimson = vec3(0.878, 0.094, 0.176);
  vec3 hot = vec3(1.0, 0.55, 0.5);
  float tone = smoothstep(0.08, 0.75, lum);
  vec3 ink = mix(inkDark, crimson, tone);
  ink = mix(ink, hot, smoothstep(0.62, 0.95, lum) * 0.7);
  ink = mix(ink, inkDark, ht * 0.55 * (1.0 - tone));

  vec3 colour = tex.rgb * 1.04;
  vec3 col = mix(ink, colour, mask);
  // glowing rim where ink meets colour
  float rim = smoothstep(0.02, 0.35, mask) * (1.0 - smoothstep(0.35, 0.9, mask));
  col += crimson * rim * 0.9;
  // fade the feet into the floor
  float a = tex.a * smoothstep(0.0, 0.12, iuv.y);
  gl_FragColor = vec4(col * a, a);
}
`;

export function createHero(canvas, texture, image, { auto = true } = {}) {
  const renderer = makeRenderer(canvas, { alpha: true, antialias: false });
  const size = isMobile() ? 256 : 512;
  const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const rts = [new THREE.WebGLRenderTarget(size, size, opts), new THREE.WebGLRenderTarget(size, size, opts)];
  let ping = 0;

  const quad = new THREE.PlaneGeometry(2, 2);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const trailU = {
    uPrev: { value: null },
    uMouse: { value: new THREE.Vector2(0.5, 0.62) },
    uPrevMouse: { value: new THREE.Vector2(0.5, 0.62) },
    uStrength: { value: 0 },
    uAspect: { value: 1 },
    uDecay: { value: 0.972 },
    uTexel: { value: new THREE.Vector2(1 / size, 1 / size) },
  };
  const trailScene = new THREE.Scene();
  trailScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ uniforms: trailU, vertexShader: vert, fragmentShader: trailFrag })));

  const compU = {
    uTex: { value: texture },
    uTrail: { value: null },
    uRes: { value: new THREE.Vector2() },
    uImgAspect: { value: image.width / image.height },
    uTime: { value: 0 },
    uParallax: { value: new THREE.Vector2() },
    uReveal: { value: 0 },
  };
  const compScene = new THREE.Scene();
  compScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ uniforms: compU, vertexShader: vert, fragmentShader: compFrag, transparent: true, premultipliedAlpha: true })));

  const mouse = new THREE.Vector2(0.5, 0.62);
  const prev = mouse.clone();
  let lastMove = -10;
  let userActive = false;
  const parallaxTarget = new THREE.Vector2();

  function onMove(x, y) {
    const r = canvas.getBoundingClientRect();
    if (r.width === 0) return;
    mouse.set((x - r.left) / r.width, 1 - (y - r.top) / r.height);
    parallaxTarget.set((x / window.innerWidth - 0.5) * 2, (y / window.innerHeight - 0.5) * -2);
    lastMove = performance.now() / 1000;
    userActive = true;
  }
  window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => e.touches[0] && onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    compU.uRes.value.copy(s);
    trailU.uAspect.value = w / Math.max(h, 1);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    uniforms: compU,
    resize,
    render(time) {
      // When idle for 2.5s, an "auto cursor" wanders over the face so the effect is always alive.
      const idle = auto && time - lastMove > 2.5;
      if (idle) {
        userActive = false;
        const a = time * 0.9;
        mouse.set(0.5 + Math.cos(a) * 0.16, 0.6 + Math.sin(a * 1.3) * 0.12);
      }
      const moved = prev.distanceTo(mouse);
      trailU.uPrevMouse.value.copy(prev);
      trailU.uMouse.value.copy(mouse);
      trailU.uStrength.value = Math.min(1, moved * 40 + (userActive ? 0.25 : 0.18));
      trailU.uPrev.value = rts[ping].texture;
      renderer.setRenderTarget(rts[1 - ping]);
      renderer.render(trailScene, cam);
      renderer.setRenderTarget(null);
      ping = 1 - ping;
      prev.copy(mouse);

      compU.uTrail.value = rts[ping].texture;
      compU.uTime.value = time;
      compU.uParallax.value.lerp(parallaxTarget, 0.05);
      renderer.render(compScene, cam);
    },
  };
}
