import * as THREE from 'three';
import { PAL, part, toon, glow, textTexture } from './toon.js';

// The crimson city at night: instanced towers whose windows are drawn in the shader (so any tower size works),
// the hero's rooftop with its props, the portrait billboard and neon signs, under a horizon that glows red.
const towerVert = /* glsl */ `
uniform float uHull;
varying vec3 vWorld;
varying vec3 vN;
varying float vId;
#include <fog_pars_vertex>
void main() {
  // a box's outline: grow each half-extent by uHull world units, whatever the instance's scale
  vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 p = position + sign(position) * uHull / s;
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vId = float(gl_InstanceID);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const towerFrag = /* glsl */ `
uniform vec3 uLight;
uniform vec3 uBase;
uniform vec3 uRim;
uniform vec3 uWarm;
uniform vec3 uRed;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vN;
varying float vId;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN);
  float d = dot(n, uLight);
  float tone = d > 0.45 ? 1.0 : d > -0.1 ? 0.6 : 0.36;
  vec3 col = uBase * tone;
  // the red glow of the horizon washes the lower floors
  col += uRim * (1.0 - smoothstep(0.0, 140.0, vWorld.y)) * (0.35 + 0.65 * max(0.0, -n.z)) * 0.5;
  if (abs(n.y) < 0.5) {
    float u = dot(vWorld.xz, vec2(-n.z, n.x));
    vec2 g = vec2(u / 1.8, vWorld.y / 2.6);
    vec2 cell = floor(g), f = fract(g);
    float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.28, f.y) * step(f.y, 0.78) * step(4.0, vWorld.y);
    float r = hash(cell + floor(vId + 0.5) * 7.31); // the id is interpolated: round it, or every pixel gets its own random
    float lit = step(0.7, r) * win;
    vec3 wc = mix(uWarm, uRed, step(0.92, r));
    float flicker = 0.8 + 0.2 * sin(uTime * (0.6 + r * 2.0) + r * 50.0);
    col = mix(col, col * 0.45, win);
    col = mix(col, wc * flicker, lit);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
const hullFrag = /* glsl */ `
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  #include <fog_fragment>
}`;

const skyVert = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const skyFrag = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uMoonDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.45, h));
  // the arena's glow on the horizon ahead
  float ahead = max(0.0, dot(normalize(vec3(d.x, 0.0, d.z)), vec3(0.0, 0.0, -1.0)));
  col += uGlow * pow(ahead, 6.0) * (1.0 - smoothstep(0.0, 0.35, h)) * 0.9;
  // the moon, a flat disc with a soft halo
  float m = dot(d, normalize(uMoonDir));
  col = mix(col, vec3(1.0, 0.93, 0.9), smoothstep(0.9994, 0.9996, m));
  col += vec3(1.0, 0.35, 0.4) * pow(max(0.0, m), 300.0) * 0.35;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

export function buildCity(scene, { mobile, light, portrait }) {
  const group = new THREE.Group();
  scene.add(group);
  const updates = [];

  // sky and stars
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.ShaderMaterial({
    vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(0x050508) }, uHorizon: { value: new THREE.Color(PAL.fog) },
      uGlow: { value: new THREE.Color(0x8e0e1c) }, uMoonDir: { value: new THREE.Vector3(-0.45, 0.42, -0.78) },
    },
  }));
  group.add(sky);
  const starN = mobile ? 500 : 1200;
  const sp = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const th = rand() * Math.PI * 2, ph = Math.acos(0.15 + rand() * 0.85);
    sp.set([Math.sin(ph) * Math.cos(th) * 1600, Math.cos(ph) * 1600, Math.sin(ph) * Math.sin(th) * 1600], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffe6e9, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 })));

  // ground and streets
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), toon(0x0a0709));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // towers: a fixed few for the hero's block, then a seeded scatter that keeps the arena and the flight path clear
  const fixed = [
    [0, 0, 30, 40, 30], // the hero's roof (top at y = 40)
    [-30, -28, 20, 44, 22], // under the billboard
    [30, -18, 18, 54, 18], [-8, 34, 22, 34, 20], [38, 26, 16, 46, 16], [-46, 18, 18, 30, 18],
  ];
  const towers = [...fixed];
  const count = mobile ? 320 : 820;
  let guard = 0;
  while (towers.length < count && guard++ < count * 20) {
    const x = (rand() - 0.5) * 1100, z = 160 - rand() * 760;
    if (Math.hypot(x, z + 520) < 150) continue; // the arena
    if (Math.abs(x) < 26 && z < -40 && z > -420) continue; // the avenue the camera flies down
    if (Math.hypot(x, z) < 58) continue; // the hero's block
    const far = Math.min(1, Math.hypot(x, z) / 500);
    const w = 10 + rand() * 16, dd = 10 + rand() * 16;
    const h = 14 + rand() * rand() * (70 + far * 60);
    towers.push([x, z, w, h, dd]);
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const uni = {
    uLight: { value: light.clone().normalize() }, uBase: { value: new THREE.Color(0x16131b) }, uRim: { value: new THREE.Color(0x5a0a14) },
    uWarm: { value: new THREE.Color(0xffc98a) }, uRed: { value: new THREE.Color(0xff3347) }, uTime: { value: 0 }, uHull: { value: 0 },
  };
  const bodyMat = new THREE.ShaderMaterial({ vertexShader: towerVert, fragmentShader: towerFrag, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, uni]) });
  bodyMat.uniforms.uTime = uni.uTime;
  const hullMat = new THREE.ShaderMaterial({ vertexShader: towerVert, fragmentShader: hullFrag, fog: true, side: THREE.BackSide, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uHull: { value: 0.32 } }]) });
  const body = new THREE.InstancedMesh(box, bodyMat, towers.length);
  const hull = new THREE.InstancedMesh(box, hullMat, towers.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  towers.forEach(([x, z, w, h, d], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i < fixed.length ? 0 : (rand() < 0.8 ? 0 : rand() * 0.5));
    m4.compose(v.set(x, h / 2, z), q, sc.set(w, h, d));
    body.setMatrixAt(i, m4);
    hull.setMatrixAt(i, m4);
  });
  body.frustumCulled = hull.frustumCulled = false;
  group.add(body, hull);

  // a few rooftop beacons across the skyline
  const beacons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 8, 6), glow(PAL.hot), 60);
  for (let i = 0; i < 60; i++) {
    const t = towers[fixed.length + Math.floor(rand() * (towers.length - fixed.length))];
    m4.makeTranslation(t[0], t[3] + 0.8, t[1]);
    beacons.setMatrixAt(i, m4);
  }
  group.add(beacons);
  updates.push((time) => { uni.uTime.value = time; beacons.material.opacity = 0.4 + 0.6 * (Math.sin(time * 2.2) > 0 ? 1 : 0.2); });
  beacons.material.transparent = true;

  // the rooftop: parapet, water tank, AC units, stair hut, antenna
  const roof = new THREE.Group();
  roof.position.set(0, 40, 0);
  group.add(roof);
  const steel = toon(PAL.steel), wine = toon(PAL.wine);
  [[0, 15, 30, 1.2, 0.8], [0, -15, 30, 1.2, 0.8], [15, 0, 0.8, 1.2, 30], [-15, 0, 0.8, 1.2, 30]].forEach(([x, z, w, h, d]) => roof.add(part(new THREE.BoxGeometry(w, h, d), 0, { at: [x, h / 2, z], mat: steel, line: 0.06 })));
  const tank = new THREE.Group();
  tank.position.set(-8, 0, 6);
  tank.add(part(new THREE.CylinderGeometry(2.6, 2.6, 4.6, 20), 0, { at: [0, 5.6, 0], mat: wine, line: 0.09 }));
  tank.add(part(new THREE.ConeGeometry(2.8, 1.2, 20), 0, { at: [0, 8.5, 0], mat: wine, line: 0.08 }));
  [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([x, z]) => tank.add(part(new THREE.CylinderGeometry(0.18, 0.18, 3.4, 6), 0, { at: [x, 1.7, z], mat: steel, line: 0.04 })));
  roof.add(tank);
  [[7, 8], [10, 8], [7, 11]].forEach(([x, z]) => roof.add(part(new THREE.BoxGeometry(2.4, 1.6, 2.4), 0, { at: [x, 0.8, z], mat: steel, line: 0.06 })));
  roof.add(part(new THREE.BoxGeometry(5, 3.6, 4), 0, { at: [9, 1.8, -9], mat: wine, line: 0.08 }));
  roof.add(part(new THREE.CylinderGeometry(0.12, 0.2, 14, 6), 0, { at: [-11, 7, -10], mat: steel, line: 0.04 }));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), glow(PAL.hot, { transparent: true }));
  tip.position.set(-11, 14.2, -10);
  roof.add(tip);
  updates.push((time) => { tip.material.opacity = Math.sin(time * 3) > 0.2 ? 1 : 0.15; });

  // the billboard: the portrait in ink on a steel frame, lit by a crimson neon border
  const bb = new THREE.Group();
  bb.position.set(-28, 44, -26);
  bb.rotation.y = 0.74; // faces the rooftop
  group.add(bb);
  const bw = 22, bh = 26.5;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true, toneMapped: false }));
  screen.position.y = bh / 2 + 4;
  bb.add(screen);
  portrait.then((tex) => { screen.material.map = tex; screen.material.needsUpdate = true; }, () => {});
  bb.add(part(new THREE.BoxGeometry(bw + 1.4, bh + 1.4, 0.6), 0, { at: [0, bh / 2 + 4, -0.4], mat: steel, line: 0.1 }));
  const neon = glow(PAL.crimson);
  [[0, bh + 4.7, bw + 1.6, 0.35], [0, 3.3, bw + 1.6, 0.35]].forEach(([x, y, w, h]) => { const n = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), neon); n.position.set(x, y, 0.1); bb.add(n); });
  [[-(bw / 2 + 0.8), bh / 2 + 4], [bw / 2 + 0.8, bh / 2 + 4]].forEach(([x, y]) => { const n = new THREE.Mesh(new THREE.BoxGeometry(0.35, bh + 1.8, 0.4), neon); n.position.set(x, y, 0.1); bb.add(n); });
  [-5, 5].forEach((x) => bb.add(part(new THREE.BoxGeometry(0.6, 4, 0.6), 0, { at: [x, 2, -0.6], mat: steel, line: 0.05 })));

  // neon kanji: 作る戦略家 down the side of a tower, and a 一閃 sign facing the avenue
  const vsign = textTexture((g, w, h) => {
    g.fillStyle = '#0a0306'; g.fillRect(0, 0, w, h);
    g.font = `${w * 0.78}px "Dela Gothic One", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff2e44'; g.shadowBlur = 30; g.fillStyle = '#ff4a5c';
    [...'作る戦略家'].forEach((ch, i) => g.fillText(ch, w / 2, h * (0.1 + i * 0.2)));
  }, 160, 800);
  const vs = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 22), new THREE.MeshBasicMaterial({ map: vsign, fog: true, toneMapped: false }));
  vs.position.set(30 - 9.2, 34, -18 + 9.3);
  vs.rotation.y = -Math.PI / 4;
  group.add(vs);
  const hsign = textTexture((g, w, h) => {
    g.fillStyle = '#0a0306'; g.fillRect(0, 0, w, h);
    g.font = `${h * 0.62}px "Dela Gothic One", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff2e44'; g.shadowBlur = 40; g.fillStyle = '#ffffff'; g.fillText('一閃', w * 0.3, h / 2);
    g.font = `900 ${h * 0.34}px "Big Shoulders Display", sans-serif`; g.fillStyle = '#ff4a5c'; g.fillText('THE ARC', w * 0.72, h / 2);
  }, 1024, 256);
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(28, 7), new THREE.MeshBasicMaterial({ map: hsign, fog: true, toneMapped: false }));
  hs.position.set(0, 58, -150);
  group.add(hs);
  const gantry = part(new THREE.BoxGeometry(30, 8, 0.8), 0, { at: [0, 58, -150.5], mat: steel, line: 0.1 });
  group.add(gantry);
  [-14, 14].forEach((x) => group.add(part(new THREE.BoxGeometry(0.8, 54, 0.8), 0, { at: [x, 27, -150.6], mat: steel, line: 0.06 })));

  // street lamps down the avenue
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), glow(0xffc98a), 40);
  for (let i = 0; i < 40; i++) { m4.makeTranslation(i % 2 ? 18 : -18, 6, -50 - Math.floor(i / 2) * 18); lamps.setMatrixAt(i, m4); }
  group.add(lamps);

  return { group, towers, update: (time) => updates.forEach((f) => f(time)) };
}
