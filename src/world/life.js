import * as THREE from 'three';
import { rng } from './kit.js';
import { toon } from './toon.js';
import { LAYOUT } from './land.js';

// Life in the village: people walking its streets and birds over the valley at sunset.
//
// Villagers walk set routes (the main street out to the gate, the two ring roads, round the headquarters' plaza,
// the residents' lanes), each at their own pace and distance from the kerb, bobbing and swaying as they go: a
// kimono and a head, some under a red paper umbrella. Three instanced meshes for all of them, posed on the CPU
// each frame (a few hundred matrices). Birds fly in loose flocks in wide circles over the roofs, wings beating
// and gliding in turn: two instanced wings each.
const KIMONO = [0x2b4a7a, 0xb8232c, 0x3f6a4a, 0x6a3a6a, 0xd9a24a, 0x3a3540, 0xe9dcc6, 0x7a4a2a, 0x2b6f74, 0xc96a8a];
const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68a5e, 0x9a6440];

export function buildLife(scene, { mobile }) {
  const r = rng(808);
  const g = new THREE.Group();
  scene.add(g);
  const Q = LAYOUT.quarter.at, G = LAYOUT.gateZ;
  // routes: lines walked to the end and back, or circles walked round
  const line = (a, b, y = 0) => ({ len: Math.hypot(b[0] - a[0], b[1] - a[1]), at(s, side, out) { const L = this.len, u = ((s % (2 * L)) + 2 * L) % (2 * L), k = (u < L ? u : 2 * L - u) / L, back = u >= L; const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L; out.set(a[0] + (b[0] - a[0]) * k - dz * side, y, a[1] + (b[1] - a[1]) * k + dx * side); return back ? Math.atan2(-dx, -dz) : Math.atan2(dx, dz); } });
  const ring = (R, y = 0, cx = 0, cz = 0) => ({ len: 2 * Math.PI * R, at(s, side, out) { const a = s / R; out.set(cx + Math.cos(a) * (R + side), y, cz + Math.sin(a) * (R + side)); return Math.atan2(-Math.sin(a), Math.cos(a)); } });
  const routes = [
    [line([0, G + 60], [0, 96]), 5.5, mobile ? 26 : 60], // the main street, through the gate and on up the road
    [ring(150), 6, mobile ? 14 : 40],
    [ring(230), 5, mobile ? 0 : 36],
    [ring(76), 4, mobile ? 10 : 24], // round the headquarters' plaza
    [line([Q[0] - 50, Q[2] - 26], [Q[0] + 60, Q[2] - 26], Q[1]), 3, mobile ? 8 : 14], // the residents' lanes
    [line([Q[0] - 50, Q[2] + 26], [Q[0] + 60, Q[2] + 26], Q[1]), 3, mobile ? 6 : 12],
  ];
  const people = [];
  routes.forEach(([route, spread, n]) => {
    for (let i = 0; i < n; i++) people.push({
      route, s: r() * route.len * 2, speed: (1.1 + r() * 0.7) * (r() < 0.5 ? -1 : 1) * (route.len > 900 ? 1.4 : 1),
      side: (r() - 0.5) * 2 * spread, phase: r() * 10, h: 0.9 + r() * 0.2, kid: r() < 0.12,
      // some stand and chat a while, then walk on
      pause: r() < 0.2 ? 4 + r() * 8 : 0, umbrella: r() < 0.18,
    });
  });
  const N = people.length;
  const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.42, 1.3, 8).translate(0, 0.65, 0), toon(0xffffff), N);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21, 10, 8), toon(0xffffff), N);
  const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.23, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), toon(0x1a1214), N);
  const umb = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 0.32, 12, 1, true), toon(0xc0262e, { side: THREE.DoubleSide }), N);
  const c = new THREE.Color();
  people.forEach((p, i) => {
    body.setColorAt(i, c.set(KIMONO[Math.floor(r() * KIMONO.length)]));
    head.setColorAt(i, c.set(SKIN[Math.floor(r() * SKIN.length)]));
    umb.setColorAt(i, c.set([0xc0262e, 0xd9a24a, 0x2b4a7a, 0xe9dcc6][i % 4]));
  });
  [body, head, umb].forEach((m) => { m.instanceColor.needsUpdate = true; });
  [body, head, hair, umb].forEach((m) => { m.frustumCulled = false; g.add(m); });

  // birds: flocks wheeling in wide circles over the village
  const FL = mobile ? 3 : 6, PER = mobile ? 6 : 9, B = FL * PER;
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, 0, 0, -0.25, 1.5, 0.05, -0.05], 3));
  wingGeo.computeVertexNormals();
  const wingMat = new THREE.MeshBasicMaterial({ color: 0x2a1418, side: THREE.DoubleSide, fog: true });
  const wings = [new THREE.InstancedMesh(wingGeo, wingMat, B), new THREE.InstancedMesh(wingGeo, wingMat, B)];
  wings.forEach((w) => { w.frustumCulled = false; g.add(w); });
  const flocks = Array.from({ length: FL }, (_, f) => ({ cx: (r() - 0.5) * 500, cz: (r() - 0.5) * 500 - 60, R: 90 + r() * 160, y: 110 + r() * 70, w: (0.05 + r() * 0.04) * (f % 2 ? -1 : 1), a0: r() * 7 }));
  const birds = Array.from({ length: B }, (_, i) => ({ f: flocks[Math.floor(i / PER)], dx: (r() - 0.5) * 16, dy: (r() - 0.5) * 6, dz: (r() - 0.5) * 16, ph: r() * 6, s: 0.8 + r() * 0.5 }));

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), zero = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let last = 0;
  return {
    update(t, cam) {
      const dt = Math.min(0.1, t - last || 0);
      last = t;
      people.forEach((p, i) => {
        // walking, or a pause to talk now and then
        const resting = p.pause && (t + p.phase * 3) % (p.pause * 3) < p.pause;
        if (!resting) p.s += p.speed * dt;
        const yaw = p.route.at(p.s, p.side, pos);
        const far = cam && pos.distanceToSquared(cam) > 700 * 700; // too far off to see: not posed
        if (far) { m4.makeScale(0, 0, 0); body.setMatrixAt(i, m4); head.setMatrixAt(i, m4); hair.setMatrixAt(i, m4); umb.setMatrixAt(i, m4); return; }
        const k = (p.kid ? 0.62 : 1) * p.h, w = t * 7 * Math.abs(p.speed) + p.phase;
        const bob = resting ? 0 : Math.abs(Math.sin(w)) * 0.06, sway = resting ? Math.sin(t + p.phase) * 0.03 : Math.sin(w) * 0.06;
        q.setFromEuler(e.set(0, yaw, sway));
        sc.set(k, k, k);
        pos.y += bob;
        m4.compose(pos, q, sc); body.setMatrixAt(i, m4);
        pos.y += 1.5 * k;
        m4.compose(pos, q, sc); head.setMatrixAt(i, m4); hair.setMatrixAt(i, m4);
        pos.y += 0.55 * k;
        m4.compose(pos, q, p.umbrella && !p.kid ? one : zero); umb.setMatrixAt(i, m4);
      });
      [body, head, hair, umb].forEach((m) => { m.instanceMatrix.needsUpdate = true; });
      birds.forEach((b, i) => {
        const a = b.f.a0 + t * b.f.w, fx = Math.cos(a), fz = Math.sin(a);
        pos.set(b.f.cx + fx * b.f.R + b.dx + Math.sin(t * 0.7 + b.ph) * 3, b.f.y + b.dy + Math.sin(t * 0.9 + b.ph) * 2, b.f.cz + fz * b.f.R + b.dz);
        const heading = Math.atan2(-fz * Math.sign(b.f.w), fx * Math.sign(b.f.w)) + Math.PI / 2;
        // beat for a while, then glide
        const beat = Math.sin(t * 9 + b.ph) * (Math.sin(t * 0.8 + b.ph) > -0.2 ? 0.7 : 0.08);
        [1, -1].forEach((s, k) => {
          q.setFromEuler(e.set(0, heading, s * beat, 'YXZ'));
          m4.compose(pos, q, sc.set(s * b.s, b.s, b.s));
          wings[k].setMatrixAt(i, m4);
        });
      });
      wings.forEach((w) => { w.instanceMatrix.needsUpdate = true; });
    },
  };
}
