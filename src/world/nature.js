import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, fbm, paint, place } from './kit.js';
import { toon } from './toon.js';
import { LAYOUT, reserved } from './land.js';

// The forest the village hides in: two kinds of tree (tall layered cedars and round broadleaf canopies), lumpy
// cel-shaded foliage, thousands of them instanced; and leaves drifting through the air around the camera.
function lumpy(r, detail, seed, color) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + (fbm(v.x * 0.4 + seed, v.y * 0.4 + v.z * 0.3) - 0.5) * 0.5;
    p.setXYZ(i, v.x * k, v.y * k * 0.85, v.z * k);
  }
  g.computeVertexNormals();
  return paint(g, color);
}
function cedar() {
  const parts = [paint(new THREE.CylinderGeometry(0.5, 0.9, 10, 7), 0x4a3226).translate(0, 5, 0)];
  [[0, 6, 7.5, 9], [0, 11, 6, 8], [0, 15.5, 4.4, 7], [0, 19, 2.6, 5]].forEach(([x, y, rr, h], i) => {
    const c = new THREE.ConeGeometry(rr, h, 9, 1);
    const p = c.attributes.position;
    for (let k = 0; k < p.count; k++) { if (p.getY(k) < -h / 2 + 0.01) { const a = Math.atan2(p.getZ(k), p.getX(k)); const f = 1 + Math.sin(a * 5 + i) * 0.12; p.setX(k, p.getX(k) * f); p.setZ(k, p.getZ(k) * f); } }
    c.computeVertexNormals();
    parts.push(place(paint(c, [0x2f5a2c, 0x3a6a30, 0x447a34, 0x4f8a3a][i]), { at: [x, y, 0] }));
  });
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}
function broadleaf() {
  const parts = [paint(new THREE.CylinderGeometry(0.6, 1.1, 9, 7), 0x5a3a2a).translate(0, 4.5, 0)];
  [[0, 11, 0, 6, 0x4f8a3a], [3.4, 9, 1.5, 4.2, 0x5f9a42], [-3, 9.6, -1.2, 4.4, 0x467d35], [0.6, 14, -0.4, 4, 0x6aa648]].forEach(([x, y, z, rr, c], i) => parts.push(place(lumpy(rr, 1, i * 3.1, c), { at: [x, y, z] })));
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

export function buildForest(scene, { mobile, heightAt }) {
  const g = new THREE.Group();
  scene.add(g);
  const r = rng(9);
  const mat = toon(0xffffff, { vertexColors: true });
  const kinds = [cedar(), broadleaf()];
  const N = mobile ? 900 : 2600;
  const spots = [[], []];
  const A = LAYOUT.arena;
  let tries = 0;
  while (spots[0].length + spots[1].length < N && tries++ < N * 12) {
    // dense outside the wall, a few parks and gardens inside it
    const inside = r() < 0.12;
    const rr = inside ? 80 + r() * 200 : 325 + Math.pow(r(), 0.8) * 900, a = r() * Math.PI * 2;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.hypot(x - A.x, z - A.z) < 140) continue;
    if (z > LAYOUT.gateZ - 10 && Math.abs(x) < 40 && z < LAYOUT.gateZ + 200) continue; // the road out of the gate
    if (z < LAYOUT.cliffZ + 60 && z > LAYOUT.cliffZ - 60 && Math.abs(x) < 280) continue; // the cliff
    if (reserved(x, z)) continue;
    if (inside && (Math.abs(x) < 30 || Math.abs(Math.hypot(x, z) - 150) < 14 || Math.abs(z - LAYOUT.riverZ) < 18)) continue;
    const y = heightAt(x, z);
    if (y > 230) continue;
    // cedars climb the hills, broadleaf crowd the valley
    const k = y > 40 || r() < 0.35 ? 0 : 1;
    spots[k].push([x, y, z, 0.8 + r() * 1.1, r() * Math.PI * 2]);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  kinds.forEach((geo, k) => {
    const im = new THREE.InstancedMesh(geo, mat, spots[k].length);
    spots[k].forEach(([x, y, z, s, a], i) => {
      m4.compose(new THREE.Vector3(x, y - 0.5, z), q.setFromAxisAngle(up, a), new THREE.Vector3(s, s * (0.9 + r() * 0.3), s));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, c.setHSL(0.27 + (r() - 0.5) * 0.06, 0.5, 0.42 + r() * 0.16).multiplyScalar(1.9));
    });
    im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    g.add(im);
  });
  return { group: g };
}

// leaves on the wind: a loop of falling, spinning leaves kept in a box around the camera
const leafVert = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec3 uCam;
varying vec3 vColor;
#include <fog_pars_vertex>
mat3 rot(vec3 a){ float c=cos(a.x), s=sin(a.x); mat3 rx = mat3(1,0,0, 0,c,s, 0,-s,c); c=cos(a.y); s=sin(a.y); mat3 ry = mat3(c,0,-s, 0,1,0, s,0,c); c=cos(a.z); s=sin(a.z); mat3 rz = mat3(c,s,0, -s,c,0, 0,0,1); return rz*ry*rx; }
void main() {
  float t = uTime * (0.25 + aSeed.w * 0.3);
  vec3 box = vec3(140.0, 60.0, 140.0);
  vec3 p = aSeed.xyz * box;
  p.y -= t * 9.0;
  p.x += t * 14.0 + sin(t * 2.0 + aSeed.w * 30.0) * 3.0;
  p.z += cos(t * 1.6 + aSeed.x * 20.0) * 3.0;
  // wrap around the camera
  p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
  vec3 local = rot(vec3(t * 3.0 + aSeed.x * 9.0, t * 2.0, aSeed.z * 7.0)) * (position * 0.38);
  vec4 mvPosition = viewMatrix * vec4(p + local, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vColor = mix(vec3(0.42, 0.62, 0.22), vec3(0.95, 0.5, 0.16), step(0.7, aSeed.w));
  #include <fog_vertex>
}`;
const leafFrag = /* glsl */ `
varying vec3 vColor;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
export function buildLeaves(scene, { mobile }) {
  const N = mobile ? 110 : 260;
  // a leaf: a pointed diamond
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.9, 0, -0.45, 0, 0, 0, -0.9, 0, 0, 0.9, 0, 0, -0.9, 0, 0.45, 0, 0], 3));
  const geo = new THREE.InstancedBufferGeometry().copy(base);
  geo.instanceCount = N;
  const seed = new Float32Array(N * 4), r = rng(5);
  for (let i = 0; i < N * 4; i++) seed[i] = r();
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  const u = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } };
  const mat = new THREE.ShaderMaterial({ vertexShader: leafVert, fragmentShader: leafFrag, side: THREE.DoubleSide, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, u]) });
  mat.uniforms.uTime = u.uTime; mat.uniforms.uCam = u.uCam;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { update(t, cam) { u.uTime.value = t; u.uCam.value.copy(cam); } };
}
