import * as THREE from 'three';
import { fbm, smooth, rng, Bins, box, paint, place, gableRoof, roofTiles, breathe } from './kit.js';
import { toon, triToon, textTexture } from './toon.js';
import { plaster, wood, stone, grass, rock } from './textures.js';

let fine = null;
function fineSteps() {
  if (fine) return fine;
  fine = new THREE.DataTexture(new Uint8Array([46, 92, 140, 196, 255]), 5, 1, THREE.RedFormat);
  fine.minFilter = fine.magFilter = THREE.NearestFilter;
  fine.generateMipmaps = false;
  fine.needsUpdate = true;
  return fine;
}

// The valley: a flat village floor ringed by forested hills, a great cliff to the north carved with the village
// crest, a river with an arched bridge, the village wall, and an anime sunset over all of it.
export const LAYOUT = {
  wallR: 300,
  gateZ: 300,
  riverZ: 150,
  arena: new THREE.Vector3(470, 0, -60),
  cliffZ: -385,
  // the other stops on the journey: [x, ground, z] and the radius kept clear of houses and trees
  // scale: each place is modelled at 1:1 and built bigger, so it reads from across the valley
  shrine: { at: [-440, 16, -30], clear: 120, scale: 1.5 },
  library: { at: [-160, 0, -102], clear: 52, scale: 1.4 },
  training: { at: [65, 0, -178], clear: 58, scale: 1.35 },
  memorial: { at: [90, 0, 246], clear: 46, scale: 1.5 },
  mast: { at: [70, 214, -385], scale: 1.5 },
  summit: { at: [12, 214, -385], scale: 1.3 },
};
// the carved portrait sits left of the headquarters as seen from the main street, so the crest disc never hides it
export const FACE_X = -64;
export const reserved = (x, z) => ['shrine', 'library', 'training', 'memorial'].some((k) => Math.hypot(x - LAYOUT[k].at[0], z - LAYOUT[k].at[2]) < LAYOUT[k].clear);

export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm(x * 0.0035 + 3, z * 0.0035 - 7) * 70 + fbm(x * 0.013, z * 0.013) * 12;
  h *= smooth(320, 560, r); // the village floor is flat
  h += smooth(650, 1300, r) * 180 * (0.6 + 0.8 * fbm(x * 0.002, z * 0.002)); // the far ring of mountains
  h += smooth(-420, -700, z) * smooth(900, 200, Math.abs(x)) * 160; // the mountain the cliff belongs to
  const a = LAYOUT.arena;
  h *= smooth(130, 230, Math.hypot(x - a.x, z - a.z)); // a level pad for the stadium
  if (z > LAYOUT.gateZ - 20) h *= smooth(24, 90, Math.abs(x)); // the road out of the gate runs level through the hills
  const s = LAYOUT.shrine.at; // the shrine stands on a levelled terrace in the western hills
  const k = smooth(120, 70, Math.hypot(x - s[0], z - s[2]));
  return h + (s[1] - h) * k;
}

const skyVert = 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const skyFrag = /* glsl */ `
uniform vec3 uTop, uMid, uLow, uSun, uSunDir;
uniform float uTime;
varying vec3 vDir;
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.07; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uLow, uMid, smoothstep(-0.05, 0.22, h));
  col = mix(col, uTop, smoothstep(0.2, 0.75, h));
  float sd = max(0.0, dot(d, uSunDir));
  // the sun: a flat disc, then a wide warm bloom along the horizon
  col += uSun * pow(sd, 18.0) * 0.55 + uSun * pow(sd, 3.0) * 0.18 * (1.0 - smoothstep(0.0, 0.4, h));
  col = mix(col, vec3(1.0, 0.93, 0.78), smoothstep(0.9975, 0.998, sd));
  // anime clouds: long flat banks, cut into hard bands of light and shade
  if (h > 0.0) {
    vec2 p = d.xz / (h + 0.18) * 0.7 + vec2(uTime * 0.003, 0.0);
    float n = fbm(p * vec2(0.45, 1.5));
    float c = smoothstep(0.6, 0.63, n);
    // each bank is lit along its lower, sunward edge and falls into dusky rose above
    float rim = smoothstep(0.6, 0.66, fbm(p * vec2(0.45, 1.5) + vec2(0.0, 0.06)));
    vec3 cShade = mix(uMid, vec3(0.75, 0.42, 0.45), 0.55);
    vec3 cLit = mix(uSun, vec3(1.0, 0.88, 0.72), 0.5);
    vec3 cc = mix(cLit, cShade, step(0.5, rim));
    cc = mix(cc, cLit, pow(sd, 4.0) * 0.6);
    col = mix(col, cc, c * smoothstep(0.02, 0.1, h) * (1.0 - smoothstep(0.35, 0.7, h)));
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

// river water: stylised ripples that drift downstream, catching the sunset
const waterVert = 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; }';
const waterFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uDeep, uShine;
varying vec3 vW;
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
void main() {
  vec2 p = vW.xz * vec2(0.08, 0.35) + vec2(uTime * 0.25, 0.0);
  float n = vn(p) * 0.6 + vn(p * 2.3 + 4.0) * 0.4;
  float line = smoothstep(0.62, 0.66, n) * (1.0 - smoothstep(0.7, 0.74, n));
  vec3 col = mix(uDeep, uShine, line * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export async function buildLand(scene, { mobile, sunDir }) {
  const g = new THREE.Group();
  scene.add(g);
  const updates = [];

  // sky
  const skyU = {
    uTop: { value: new THREE.Color(0x2a0d2a) }, uMid: { value: new THREE.Color(0xb3263a) }, uLow: { value: new THREE.Color(0xff8a4a) },
    uSun: { value: new THREE.Color(0xffb36a) }, uSunDir: { value: sunDir.clone() }, uTime: { value: 0 },
  };
  g.add(new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU })));
  updates.push((t) => { skyU.uTime.value = t; });

  await breathe();
  // terrain, coloured by height and slope: meadow, forest floor, rock, a little snow on the far peaks
  const size = 3600, seg = mobile ? 140 : 220;
  const tg = new THREE.PlaneGeometry(size, size, seg, seg);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  tg.computeVertexNormals();
  const col = new Float32Array(pos.count * 3), nrm = tg.attributes.normal;
  const meadow = new THREE.Color(0x6f8f3a), floor = new THREE.Color(0x3b5a2a), rockC = new THREE.Color(0x6e5a52), snow = new THREE.Color(0xf1e6e0), dirt = new THREE.Color(0x9b7a52);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), steep = 1 - nrm.getY(i);
    const r = Math.hypot(x, z);
    c.copy(r < 300 ? meadow : floor).lerp(dirt, r < 300 ? 0.15 * fbm(x * 0.05, z * 0.05) : 0);
    c.lerp(rockC, smooth(0.25, 0.5, steep) + smooth(160, 240, y) * 0.6);
    c.lerp(snow, smooth(250, 300, y));
    col.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const terrain = new THREE.Mesh(tg, triToon(grass(), 0.06));
  g.add(terrain);

  const bins = new Bins();
  const r = rng(77);

  await breathe();
  // the cliff: a wall of stratified rock, its face carved with the village crest
  const cz = LAYOUT.cliffZ;
  const cg = new THREE.BoxGeometry(560, 210, 80, 96, 36, 6);
  const cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
    const front = z > 0 ? 1 : 0, foot = smooth(40, -90, y); // the face leans back and spreads at its foot
    const n = fbm(x * 0.03 + 9, y * 0.04) - 0.5;
    const crack = Math.pow(Math.abs(Math.sin(x * 0.11 + fbm(y * 0.02, x * 0.01) * 6)), 12); // vertical fissures
    let zz = z + front * (n * 26 + foot * 34 - crack * 6 - smooth(-20, 90, y) * 14) + (fbm(x * 0.008, 3) - 0.5) * 34;
    // a smoothed face in the middle of the cliff, where the portrait is carved
    // (and a second, smaller one to the right for the crest)
    const face = front * Math.max(smooth(100, 84, Math.abs(x - FACE_X)) * smooth(-80, -60, y) * (1 - smooth(78, 94, y)), smooth(54, 40, Math.abs(x - 140)) * smooth(-30, -14, y) * (1 - smooth(52, 66, y)));
    zz += (36 - zz) * face;
    cp.setZ(i, zz);
    cp.setX(i, x * (1 + foot * 0.12) + (fbm(y * 0.05, x * 0.01) - 0.5) * 12);
    if (y > 70) cp.setY(i, y + (fbm(x * 0.018, 7) - 0.45) * 60);
  }
  cg.computeVertexNormals();
  const cc = new Float32Array(cp.count * 3);
  for (let i = 0; i < cp.count; i++) {
    const y = cp.getY(i), band = Math.floor((y + 90 + fbm(cp.getX(i) * 0.01, 1) * 20) / 13) % 4;
    c.set([0xb08a70, 0x9a7764, 0xc29c7e, 0x8c6c5c][band]);
    c.lerp(new THREE.Color(0x5f4a44), smooth(0.2, 0.0, cg.attributes.normal.getY(i) + 0.2) * 0.25);
    c.lerp(new THREE.Color(0x4f7a30), smooth(78, 100, y) * 0.85); // moss and grass on the crown
    cc.set([c.r, c.g, c.b], i * 3);
  }
  cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  const cliff = new THREE.Mesh(cg, triToon(rock(), 0.022));
  cliff.position.set(0, 103, cz);
  g.add(cliff);
  await breathe();
  // the crest: a ring cut by one slash, 一閃 down its side, painted into the stone
  const crest = textTexture((x, w, h) => {
    x.clearRect(0, 0, w, h);
    // carved: a dark cut with a light lip below it, as stone catches the low sun
    const carve = (draw) => { x.save(); x.translate(0, w * 0.008); x.strokeStyle = x.fillStyle = 'rgba(255,214,180,.35)'; draw(); x.restore(); x.strokeStyle = x.fillStyle = 'rgba(46,18,18,.85)'; draw(); };
    x.textAlign = 'center'; x.textBaseline = 'middle';
    carve(() => { x.lineWidth = w * 0.04; x.beginPath(); x.arc(w * 0.42, h * 0.5, w * 0.31, 0, Math.PI * 2); x.stroke(); });
    carve(() => { x.font = `${w * 0.36}px "Dela Gothic One", sans-serif`; x.fillText('閃', w * 0.42, h * 0.53); });
    x.fillStyle = 'rgba(224,24,45,.9)';
    x.font = `${w * 0.13}px "Dela Gothic One", sans-serif`;
    x.fillText('一', w * 0.88, h * 0.36); x.fillText('閃', w * 0.88, h * 0.6);
  }, 1024, 1024);
  const crestM = new THREE.Mesh(new THREE.PlaneGeometry(76, 76), new THREE.MeshBasicMaterial({ map: crest, transparent: true, depthWrite: false, fog: true }));
  crestM.position.set(140, 124, cz + 37);
  g.add(crestM);

  await breathe();
  // the cliff's monument, made for this village: the portfolio's own face carved into the rock, as the anime's
  // villages carve their leaders. The relief is baked from a portrait (img/carve.webp: height in red, the carved
  // area in alpha) and raised out of the smoothed face; 作る戦略家 is cut down its left side.
  const carve = new THREE.Group();
  carve.position.set(FACE_X, 116, cz + 36.4);
  g.add(carve);
  const CW = 146, CS = mobile ? 130 : 240;
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true }); // read back on the CPU: a GPU canvas stalls the page here
    cx.drawImage(img, 0, 0);
    const px = cx.getImageData(0, 0, img.width, img.height).data;
    const sample = (u, v) => {
      const X = Math.min(img.width - 1, Math.max(0, Math.round(u * (img.width - 1))));
      const Y = Math.min(img.height - 1, Math.max(0, Math.round((1 - v) * (img.height - 1))));
      const k = (Y * img.width + X) * 4;
      return [px[k] / 255, px[k + 3] / 255];
    };
    const geo = new THREE.PlaneGeometry(CW, CW, CS, CS);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    const col = new Float32Array(p.count * 3), stoneC = new THREE.Color(0xc79d80), deepC = new THREE.Color(0x4f3830), c2 = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const [h, a] = sample(uv.getX(i), uv.getY(i));
      // carved where alpha says so: the head stands out of the wall; elsewhere the plane sinks back into the rock
      p.setZ(i, a * (h * 28 + 0.6) - (1 - a) * 5);
      c2.copy(deepC).lerp(stoneC, Math.min(1, 0.15 + h * 1.1));
      col.set([c2.r, c2.g, c2.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    // five tones of stone (the rest of the world uses three) so the features of the face read clearly
    carve.add(new THREE.Mesh(geo, triToon(rock(), 0.05, { gradientMap: fineSteps() })));
  };
  img.src = 'img/carve.webp';
  const cut = textTexture((x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${w * 0.78}px "Dela Gothic One", sans-serif`;
    [...'作る戦略家'].forEach((ch, i) => {
      const y = h * (0.1 + i * 0.2);
      x.fillStyle = 'rgba(255,214,180,.3)'; x.fillText(ch, w / 2, y + w * 0.03);
      x.fillStyle = 'rgba(52,22,20,.85)'; x.fillText(ch, w / 2, y);
    });
  }, 160, 800);
  const cutM = new THREE.Mesh(new THREE.PlaneGeometry(14, 70), new THREE.MeshBasicMaterial({ map: cut, transparent: true, depthWrite: false, fog: true }));
  cutM.position.set(FACE_X - 90, 116, cz + 37.2);
  g.add(cutM);

  await breathe();
  // river and banks
  const rz = LAYOUT.riverZ;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 18, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    vertexShader: waterVert, fragmentShader: waterFrag,
    uniforms: { uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x2c4f6a) }, uShine: { value: new THREE.Color(0xffc48a) } },
  }));
  water.position.set(0, 0.25, rz);
  g.add(water);
  updates.push((t) => { water.material.uniforms.uTime.value = t; });
  [-1, 1].forEach((s) => bins.add('stone', box(1200, 1.4, 2, 0x8d7d70, { at: [0, 0.5, rz + s * 10] })));

  // the arched bridge on the main street: a curved deck with red rails
  const span = 30, steps = 14;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const z0 = rz + span / 2 - t0 * span, z1 = rz + span / 2 - t1 * span;
    const y0 = Math.sin(t0 * Math.PI) * 3.4 + 1.2, y1 = Math.sin(t1 * Math.PI) * 3.4 + 1.2;
    const len = Math.hypot(z1 - z0, y1 - y0), ang = Math.atan2(y1 - y0, z0 - z1);
    bins.add('wood', box(13, 0.5, len + 0.1, 0x6b4630, { at: [0, (y0 + y1) / 2, (z0 + z1) / 2], rot: [ang, 0, 0] }));
    [-6.2, 6.2].forEach((x) => {
      bins.add('red', box(0.35, 0.35, len + 0.1, 0xc0262e, { at: [x, (y0 + y1) / 2 + 2.2, (z0 + z1) / 2], rot: [ang, 0, 0] }));
      if (i % 2 === 0) bins.add('red', box(0.4, 2.3, 0.4, 0xc0262e, { at: [x, y0 + 1.1, z0] }));
    });
  }

  await breathe();
  // the village wall: plastered stone with a tiled coping, broken only at the gate
  const W = LAYOUT.wallR, segs = mobile ? 90 : 150;
  const segL = (2 * Math.PI * W) / segs + 0.3;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.07) continue; // the gate
    const x = Math.cos(a) * W, z = Math.sin(a) * W, ry = -a + Math.PI / 2;
    bins.add('plaster', box(segL, 12, 3, 0xe9dcc6, { at: [x, 6, z], rot: [0, ry, 0] }));
    bins.add('stone', box(segL, 2.4, 3.6, 0x7f6f66, { at: [x, 1.2, z], rot: [0, ry, 0] }));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 12, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
    bins.addAll(gableRoof(3, segL, 1.4, 0.8, 0x4a4552).map((p) => ['roof', p]), m);
  }

  const mats = {
    stone: triToon(stone(), 0.2), plaster: triToon(plaster(), 0.14), wood: triToon(wood(), 0.32),
    red: triToon(wood(), 0.32), roof: toon(0xffffff, { vertexColors: true, map: roofTiles() }),
  };
  bins.build(mats, g);
  return { group: g, mats, update: (t) => updates.forEach((f) => f(t)) };
}
