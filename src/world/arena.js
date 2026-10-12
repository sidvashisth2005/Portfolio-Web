import * as THREE from 'three';
import { PAL, part, toon, glow, textTexture } from './toon.js';

// The HackNITR 7.0 arena: stepped stands holding one light for each of the 6,200 participants, a stage with the
// trophy, spotlights sweeping in, a crimson neon roof ring and a big screen with the result.
export const ARENA = new THREE.Vector3(0, 0, -520);

const crowdVert = /* glsl */ `
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uSize;
uniform float uPulse;
varying vec3 vColor;
varying float vA;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * (1.5 + aPhase * 2.5) + aPhase * 40.0);
  vA = tw;
  vColor = mix(aColor, vec3(1.0), uPulse * 0.5);
  gl_PointSize = clamp(uSize * (0.7 + 0.6 * tw + uPulse) * (190.0 / -mvPosition.z), 1.0, 7.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const crowdFrag = /* glsl */ `
varying vec3 vColor;
varying float vA;
#include <fog_pars_fragment>
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vA;
  gl_FragColor = vec4(vColor * (1.0 + 2.0 * smoothstep(0.25, 0.0, d)), a);
  #include <fog_fragment>
}`;

// a light beam: additive cone that fades along its length and at its edges
const beamVert = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
const beamFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vV;
void main() {
  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
  float along = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.7, 1.0, vUv.y));
  gl_FragColor = vec4(uColor * edge * along * uOpacity, 1.0);
}`;

export function buildArena(scene, { mobile }) {
  const g = new THREE.Group();
  g.position.copy(ARENA);
  scene.add(g);
  const updates = [];
  const rnd = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

  // stands: a stepped bowl turned on a lathe
  const STEPS = 9, R0 = 46, R1 = 86, H0 = 2, H1 = 30;
  const prof = [new THREE.Vector2(R0 - 0.01, 0), new THREE.Vector2(R0, H0)];
  for (let i = 0; i < STEPS; i++) {
    const r = R0 + ((R1 - R0) * (i + 1)) / STEPS, y = H0 + ((H1 - H0) * (i + 1)) / STEPS;
    prof.push(new THREE.Vector2(r - (R1 - R0) / STEPS, y), new THREE.Vector2(r, y));
  }
  prof.push(new THREE.Vector2(R1 + 3, H1 + 4), new THREE.Vector2(R1 + 3, 0));
  const stands = part(new THREE.LatheGeometry(prof, mobile ? 64 : 120), 0, { mat: toon(0x1d0910), line: 0.35 });
  g.add(stands);

  // the field and its neon rings
  g.add(part(new THREE.CylinderGeometry(R0, R0, 0.6, 96), 0, { at: [0, 0.3, 0], mat: toon(0x0b080b), line: 0 }));
  [18, 32, 44].forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, i === 0 ? 0.35 : 0.2, 6, 128), glow(i === 0 ? PAL.crimson : PAL.deep));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.7;
    g.add(ring);
  });

  // one light per participant: 6,200 on desktop, a lighter crowd on phones
  const N = mobile ? 2600 : 6200;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), ph = new Float32Array(N);
  const warm = new THREE.Color(0xfff1e0), red = new THREE.Color(PAL.hot), gold = new THREE.Color(PAL.ki);
  for (let i = 0; i < N; i++) {
    const k = Math.floor(rnd() * STEPS);
    const rIn = R0 + ((R1 - R0) * k) / STEPS, rOut = R0 + ((R1 - R0) * (k + 1)) / STEPS;
    const r = rIn + 0.6 + rnd() * (rOut - rIn - 1.2), a = rnd() * Math.PI * 2;
    pos.set([Math.cos(a) * r, H0 + ((H1 - H0) * (k + 1)) / STEPS + 0.9 + rnd() * 0.6, Math.sin(a) * r], i * 3);
    const c = rnd() < 0.18 ? red : rnd() < 0.04 ? gold : warm;
    col.set([c.r, c.g, c.b], i * 3);
    ph[i] = rnd();
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  cg.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  cg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const crowdU = { uTime: { value: 0 }, uSize: { value: mobile ? 2.2 : 1.7 }, uPulse: { value: 0 } };
  const crowd = new THREE.Points(cg, new THREE.ShaderMaterial({
    vertexShader: crowdVert, fragmentShader: crowdFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, crowdU]),
  }));
  crowd.material.uniforms.uTime = crowdU.uTime;
  crowd.material.uniforms.uPulse = crowdU.uPulse;
  crowd.material.uniforms.uSize = crowdU.uSize;
  g.add(crowd);

  // the stage and the trophy
  g.add(part(new THREE.CylinderGeometry(11, 12, 2.4, 48), 0, { at: [0, 1.2, 0], mat: toon(0x14070b), line: 0.2 }));
  const edge = new THREE.Mesh(new THREE.TorusGeometry(11.2, 0.25, 6, 96), glow(PAL.hot));
  edge.rotation.x = Math.PI / 2; edge.position.y = 2.45;
  g.add(edge);
  const cup = [[0, 0], [2.2, 0], [2.2, 0.5], [0.7, 0.9], [0.5, 2.6], [0.9, 3.0], [2.6, 3.6], [3.2, 5.8], [3.4, 7.4], [3.0, 7.5], [2.7, 5.9], [0.01, 5.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const trophy = part(new THREE.LatheGeometry(cup, 40), 0, { at: [0, 2.4, 0], mat: toon(PAL.ki, { emissive: 0x3a2a00 }), line: 0.12 });
  g.add(trophy);
  [-1, 1].forEach((s) => {
    const handle = part(new THREE.TorusGeometry(1.5, 0.28, 8, 20, Math.PI), 0, { at: [s * 3.3, 8.2, 0], rot: [0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2], mat: toon(PAL.ki, { emissive: 0x3a2a00 }), line: 0.06 });
    g.add(handle);
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(5.5, 6.2, 64), glow(PAL.ki, { transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  halo.position.y = 7;
  g.add(halo);
  updates.push((time) => { trophy.rotation.y = time * 0.4; halo.rotation.z = time * 0.2; halo.scale.setScalar(1 + Math.sin(time * 2) * 0.05); });

  // light towers around the bowl with beams converging on the stage
  const beamMat = new THREE.ShaderMaterial({ vertexShader: beamVert, fragmentShader: beamFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uColor: { value: new THREE.Color(0xff6a78) }, uOpacity: { value: 0.32 } } });
  const beams = [];
  const TOWERS = 6;
  for (let i = 0; i < TOWERS; i++) {
    const a = (i / TOWERS) * Math.PI * 2 + 0.3;
    const base = new THREE.Vector3(Math.cos(a) * (R1 + 8), 0, Math.sin(a) * (R1 + 8));
    g.add(part(new THREE.BoxGeometry(1.6, 52, 1.6), 0, { at: [base.x, 26, base.z], mat: toon(PAL.steel), line: 0.1 }));
    const head = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 1.2), glow(0xffe1e4));
    head.position.set(base.x, 52, base.z);
    head.lookAt(0, 0, 0);
    g.add(head);
    const top = new THREE.Vector3(base.x, 52, base.z), aim = new THREE.Vector3(0, 3, 0);
    const len = top.distanceTo(aim);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 9, len, 24, 1, true), beamMat);
    cone.geometry.translate(0, -len / 2, 0);
    cone.position.copy(top);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim.clone().sub(top).normalize());
    beams.push({ cone, top, a });
    g.add(cone);
  }
  updates.push((time) => {
    beams.forEach((b, i) => {
      const aim = new THREE.Vector3(Math.sin(time * 0.6 + i) * 7, 3, Math.cos(time * 0.5 + i * 1.7) * 7);
      b.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim.sub(b.top).normalize());
    });
  });

  // roof ring
  const ring = part(new THREE.TorusGeometry(R1 + 4, 1.4, 10, 160), 0, { at: [0, H1 + 14, 0], rot: [Math.PI / 2, 0, 0], mat: toon(PAL.steel), line: 0.2 });
  g.add(ring);
  const neonRing = new THREE.Mesh(new THREE.TorusGeometry(R1 + 4, 0.35, 6, 200), glow(PAL.crimson));
  neonRing.rotation.x = Math.PI / 2; neonRing.position.y = H1 + 12.4;
  g.add(neonRing);

  // the big screen
  const scr = textTexture((c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#5a0712'); gr.addColorStop(0.5, '#e0182d'); gr.addColorStop(1, '#5a0712');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,.18)';
    for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.font = `900 ${h * 0.5}px "Big Shoulders Display", sans-serif`;
    c.fillText('RANK 1 · HACKNITR 7.0', w / 2, h * 0.42);
    c.font = `500 ${h * 0.12}px "Azeret Mono", monospace`;
    c.fillText('6,200+ PARTICIPANTS  ·  20+ COUNTRIES  ·  SOLE PRESENTER', w / 2, h * 0.8);
  }, 2048, 400);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(64, 12.5), new THREE.MeshBasicMaterial({ map: scr, fog: true, toneMapped: false }));
  screen.position.set(0, H1 + 24, -(R1 - 6));
  g.add(screen);
  g.add(part(new THREE.BoxGeometry(66, 14.5, 1.2), 0, { at: [0, H1 + 24, -(R1 - 5.2)], mat: toon(PAL.steel), line: 0.15 }));
  [-26, 26].forEach((x) => g.add(part(new THREE.BoxGeometry(1.2, 18, 1.2), 0, { at: [x, H1 + 9, -(R1 - 5)], mat: toon(PAL.steel), line: 0.08 })));

  const sign = textTexture((c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.font = `${h * 0.8}px "Dela Gothic One", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff2e44'; c.shadowBlur = 40; c.fillStyle = '#ff4a5c'; c.fillText('大会', w / 2, h / 2);
  }, 512, 256);
  const kj = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshBasicMaterial({ map: sign, transparent: true, fog: true, toneMapped: false, depthWrite: false }));
  kj.position.set(0, H1 + 40, -(R1 - 6));
  g.add(kj);

  return {
    group: g,
    // pulse: 0..1, the crowd flaring when the camera arrives
    update(time, pulse = 0) { crowdU.uTime.value = time; crowdU.uPulse.value = pulse; updates.forEach((f) => f(time)); },
  };
}
