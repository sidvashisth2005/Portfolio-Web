import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, Bins, box, cyl, paint, place, gableRoof, roofTiles } from './kit.js';
import { toon, triToon, glow, textTexture } from './toon.js';
import { stone, boards, wood } from './textures.js';
import { LAYOUT } from './land.js';

// The exam stadium where HackNITR 7.0 is fought: a stone bowl under a ring of tiled roofs, a grass field with a
// few trees, 6,200 spectators (one per participant) who rise and cheer as you arrive, crimson banners, lanterns
// strung round the rim, the result on a great hanging banner, and the trophy on its dais.
export const ARENA = LAYOUT.arena;

export function buildArena(scene, { mobile }) {
  const g = new THREE.Group();
  g.position.copy(ARENA);
  scene.add(g);
  const bins = new Bins();
  const r = rng(99);
  const updates = [];
  const STEPS = 10, R0 = 52, R1 = 92, H0 = 4, H1 = 30;

  // stands: stone steps turned on a lathe, with a plastered outer wall and a tiled roof ring on posts
  const prof = [new THREE.Vector2(R0 - 0.01, 0), new THREE.Vector2(R0, H0)];
  for (let i = 0; i < STEPS; i++) {
    const rr = R0 + ((R1 - R0) * (i + 1)) / STEPS, y = H0 + ((H1 - H0) * (i + 1)) / STEPS;
    prof.push(new THREE.Vector2(rr - (R1 - R0) / STEPS, y), new THREE.Vector2(rr, y));
  }
  prof.push(new THREE.Vector2(R1 + 2, H1), new THREE.Vector2(R1 + 2, 0));
  const lathe = new THREE.LatheGeometry(prof, mobile ? 72 : 128);
  g.add(new THREE.Mesh(lathe, triToon(stone(), 0.2, { vertexColors: false, color: 0xb0a594 })));
  // the arena wall around the field, with gates
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.4, R0 + 0.4, H0 + 0.6, 96, 1, true), toon(0xd8c9b0, { side: THREE.DoubleSide })).translateY((H0 + 0.6) / 2));
  // the roof ring: tiled gable sections on posts all the way round
  const RS = mobile ? 28 : 40;
  for (let i = 0; i < RS; i++) {
    const a = (i / RS) * Math.PI * 2;
    const x = Math.cos(a) * (R1 - 3), z = Math.sin(a) * (R1 - 3);
    const len = (2 * Math.PI * (R1 - 3)) / RS + 0.4;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, H1 + 12, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0)), new THREE.Vector3(1, 1, 1));
    bins.addAll(gableRoof(12, len, 2.6, 1.2, 0x4a4552).map((p) => ['roof', p]), m);
    bins.add('wood', box(0.9, 12, 0.9, 0x4a2e22, { at: [Math.cos(a) * (R1 - 8), H1 + 6, Math.sin(a) * (R1 - 8)] }));
    bins.add('wood', box(0.9, 12, 0.9, 0x4a2e22, { at: [Math.cos(a) * (R1 + 1.5), H1 + 6, Math.sin(a) * (R1 + 1.5)] }));
  }
  // the outer wall
  // the outer wall: tall red boards banded in grey, the anime's stadium
  const wallM = triToon(boards(), 0.16, { vertexColors: false, color: 0xc0392b, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R1 + 2.2, R1 + 3, H1 + 8, 128, 1, true), wallM).translateY((H1 + 8) / 2));
  [H1 * 0.35, H1 * 0.75].forEach((y) => g.add(new THREE.Mesh(new THREE.CylinderGeometry(R1 + 3.4, R1 + 3.4, 1.4, 128, 1, true), toon(0xb8b0a8, { side: THREE.DoubleSide })).translateY(y)));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R1 + 3.6, R1 + 3.6, 1.6, 128, 1, true), toon(0xd8d0c6, { side: THREE.DoubleSide })).translateY(H1 + 8));

  // the field: grass, a sand ring and a few trees, the dais at the centre
  g.add(new THREE.Mesh(new THREE.CircleGeometry(R0, 96).rotateX(-Math.PI / 2), toon(0x6f9a3e)).translateY(0.1));
  const sand = new THREE.Mesh(new THREE.RingGeometry(R0 - 7, R0, 96).rotateX(-Math.PI / 2), toon(0xc9a978));
  sand.position.y = 0.15;
  g.add(sand);
  bins.add('stone', cyl(12, 13, 2.6, 40, 0x8d7d70, { at: [0, 1.3, 0] }));
  bins.add('stone', cyl(9, 9.6, 1.2, 40, 0xb3a492, { at: [0, 3.2, 0] }));
  [[-30, -14], [28, 20], [-18, 30]].forEach(([x, z]) => {
    bins.add('wood', cyl(0.6, 0.9, 7, 7, 0x5a3a2a, { at: [x, 3.5, z] }));
    bins.add('leaf', place(paint(new THREE.IcosahedronGeometry(4.6, 1), 0x4f8a3a), { at: [x, 9, z] }));
  });

  // spectators: a little figure (body, head, a raised arm), 6,200 of them in the stands
  const fig = mergeGeometries([
    paint(new THREE.CylinderGeometry(0.42, 0.55, 1.5, 6), 0xffffff).translate(0, 0.75, 0),
    paint(new THREE.SphereGeometry(0.38, 8, 6), 0xf0c8a0).translate(0, 1.85, 0),
    paint(new THREE.BoxGeometry(0.2, 0.9, 0.2), 0xffffff).translate(0.45, 1.75, 0),
  ]);
  const N = mobile ? 2600 : 6200;
  const fans = new THREE.InstancedMesh(fig, toon(0xffffff, { vertexColors: true }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  const CLOTH = [0xe0182d, 0x2b4a6e, 0x3f7f7a, 0xd9772b, 0xf0e6d6, 0x4a4552, 0x6b3a8e, 0x8a6a2a, 0x1a1214];
  for (let i = 0; i < N; i++) {
    const k = Math.floor(r() * STEPS);
    const rIn = R0 + ((R1 - R0) * k) / STEPS, rOut = R0 + ((R1 - R0) * (k + 1)) / STEPS;
    const rr = (rIn + rOut) / 2 + (r() - 0.5) * 1.2, a = r() * Math.PI * 2;
    const y = H0 + ((H1 - H0) * (k + 1)) / STEPS;
    m4.compose(new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr), q.setFromAxisAngle(up, -a - Math.PI / 2), new THREE.Vector3(1, 0.9 + r() * 0.25, 1));
    fans.setMatrixAt(i, m4);
    fans.setColorAt(i, c.set(CLOTH[Math.floor(r() * CLOTH.length)]));
  }
  // they bob and wave; cheering lifts them off their seats
  const cheer = { value: 0 }, time = { value: 0 };
  fans.material.onBeforeCompile = (sh) => {
    sh.uniforms.uCheer = cheer; sh.uniforms.uTime = time;
    sh.vertexShader = 'uniform float uCheer; uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      float ph = float(gl_InstanceID) * 1.7;
      float hop = max(0.0, sin(uTime * (4.0 + mod(ph, 3.0)) + ph)) * (0.08 + uCheer * 0.6);
      transformed.y += hop;
      if (position.x > 0.3) transformed.y += uCheer * 0.4 * (0.5 + 0.5 * sin(uTime * 8.0 + ph));`);
  };
  fans.material.customProgramCacheKey = () => 'fans';
  fans.instanceColor.needsUpdate = true;
  fans.frustumCulled = false;
  g.add(fans);

  // crimson banners hung from the roof ring, kanji on each
  const ban = textTexture((x, w, h) => {
    x.fillStyle = '#b8232c'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1a0a0e'; x.fillRect(0, 0, w, h * 0.06); x.fillRect(0, h * 0.94, w, h * 0.06);
    x.fillStyle = '#f4ead8'; x.font = `${w * 0.7}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('勝', w / 2, h * 0.3); x.fillText('大', w / 2, h * 0.58); x.fillText('会', w / 2, h * 0.8);
  }, 128, 512);
  const bm = new THREE.MeshBasicMaterial({ map: ban, side: THREE.DoubleSide, fog: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(4, 16), bm);
    b.position.set(Math.cos(a) * (R1 - 7.4), H1 + 2, Math.sin(a) * (R1 - 7.4));
    b.rotation.y = -a - Math.PI / 2;
    g.add(b);
  }
  // the result: a great banner over the north stand
  const res = textTexture((x, w, h) => {
    x.fillStyle = '#f0e6d6'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#b8232c'; x.lineWidth = 18; x.strokeRect(20, 20, w - 40, h - 40);
    x.fillStyle = '#1a0a0e'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 ${h * 0.42}px "Big Shoulders Display", sans-serif`; x.fillText('RANK 1 · HACKNITR 7.0', w / 2, h * 0.42);
    x.fillStyle = '#b8232c'; x.font = `500 ${h * 0.11}px "Azeret Mono", monospace`;
    x.fillText('6,200+ PARTICIPANTS · 20+ COUNTRIES · SOLE PRESENTER', w / 2, h * 0.78);
  }, 2048, 420);
  const rb = new THREE.Mesh(new THREE.PlaneGeometry(70, 14.4), new THREE.MeshBasicMaterial({ map: res, fog: true, side: THREE.DoubleSide }));
  rb.position.set(0, H1 + 26, -(R1 - 4));
  g.add(rb);
  bins.add('wood', box(74, 1.2, 1.2, 0x3a2418, { at: [0, H1 + 33.6, -(R1 - 4)] }));
  [-36, 36].forEach((x) => bins.add('wood', box(1.4, 22, 1.4, 0x3a2418, { at: [x, H1 + 23, -(R1 - 4)] })));

  // lanterns round the rim
  const LN = mobile ? 48 : 90;
  const lan = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10), glow(0xff6a3a), LN);
  for (let i = 0; i < LN; i++) { const a = (i / LN) * Math.PI * 2; m4.makeTranslation(Math.cos(a) * (R1 - 1), H1 + 8.4 - Math.abs(Math.sin(i * 1.3)) * 0.8, Math.sin(a) * (R1 - 1)); lan.setMatrixAt(i, m4); }
  g.add(lan);

  // the trophy on the dais, turning slowly in a ring of gold light
  const cup = [[0, 0], [2.2, 0], [2.2, 0.5], [0.7, 0.9], [0.5, 2.6], [0.9, 3.0], [2.6, 3.6], [3.2, 5.8], [3.4, 7.4], [3.0, 7.5], [2.7, 5.9], [0.01, 5.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const gold = toon(0xffc93a, { emissive: 0x4a3000 });
  const trophy = new THREE.Group();
  trophy.position.y = 3.8;
  trophy.add(new THREE.Mesh(new THREE.LatheGeometry(cup, 40), gold));
  [-1, 1].forEach((s) => { const hnd = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.28, 8, 20, Math.PI), gold); hnd.position.set(s * 3.3, 5.8, 0); hnd.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; trophy.add(hnd); });
  g.add(trophy);
  const halo = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.1, 64), glow(0xffd60a, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  halo.position.y = 8.6;
  g.add(halo);
  updates.push((t) => { trophy.rotation.y = t * 0.4; halo.rotation.z = t * 0.2; halo.scale.setScalar(1 + Math.sin(t * 2) * 0.05); });

  bins.build({
    roof: toon(0xffffff, { vertexColors: true, map: roofTiles() }), wood: triToon(wood(), 0.34),
    stone: triToon(stone(), 0.2), leaf: toon(0xffffff, { vertexColors: true }),
  }, g);

  return {
    group: g,
    // cheering: 0..1 as the camera drops into the bowl
    update(t, cheering = 0) { time.value = t; cheer.value = cheering; updates.forEach((f) => f(t)); },
  };
}
