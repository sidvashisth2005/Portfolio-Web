import * as THREE from 'three';

// The anime pass: ink lines drawn from the depth buffer (silhouettes from depth jumps, creases from changes in
// the surface's slope), then a light grade: warm grain and a soft vignette. One render, one fullscreen pass.
const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const frag = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uNear, uFar, uLine, uTime;
uniform vec3 uInk;
varying vec2 vUv;
float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return uNear * uFar / ((uFar - uNear) * d - uFar); // negative view-space z
}
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 col = texture2D(tColor, vUv).rgb;
  vec2 o = uTexel * uLine;
  float z = -viewZ(vUv);
  float zl = -viewZ(vUv - vec2(o.x, 0.0)), zr = -viewZ(vUv + vec2(o.x, 0.0));
  float zd = -viewZ(vUv - vec2(0.0, o.y)), zu = -viewZ(vUv + vec2(0.0, o.y));
  // silhouettes: a neighbour much nearer or farther than this pixel
  float jump = max(max(abs(zl - z), abs(zr - z)), max(abs(zd - z), abs(zu - z))) / z;
  float sil = smoothstep(0.012, 0.03, jump);
  // creases: 1/z is linear across a flat face, so its second difference only lights up where the slope turns
  float iz = 1.0 / z;
  float lap = abs(1.0 / zl + 1.0 / zr - 2.0 * iz) + abs(1.0 / zd + 1.0 / zu - 2.0 * iz);
  float crease = smoothstep(0.09, 0.2, lap / iz) * (1.0 - smoothstep(60.0, 260.0, z));
  // lines thin out into the haze
  float fade = 1.0 - smoothstep(280.0, 1100.0, z);
  float ink = max(sil, crease * 0.7) * fade;
  if (z > uFar * 0.98) ink = 0.0; // the sky
  col = mix(col, uInk, ink * 0.9);
  // grade: grain and vignette
  col += (h(vUv * 1000.0 + uTime) - 0.5) * 0.02;
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function createPost(renderer, { scale = 1 } = {}) {
  const size = new THREE.Vector2();
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1), samples: 0 });
  rt.depthTexture.type = THREE.UnsignedIntType;
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
    uniforms: {
      tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, uTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.5 }, uFar: { value: 4000 }, uLine: { value: 1 }, uTime: { value: 0 }, uInk: { value: new THREE.Color(0x1a0a0c) },
    },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const qs = new THREE.Scene();
  qs.add(quad);
  const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    target: rt, // the world renders into this, so its shaders are compiled for it
    setSize(w, h) {
      renderer.getDrawingBufferSize(size);
      rt.setSize(Math.round(size.x * scale), Math.round(size.y * scale));
      mat.uniforms.uTexel.value.set(1 / (size.x * scale), 1 / (size.y * scale));
      mat.uniforms.uLine.value = Math.max(1, renderer.getPixelRatio() * scale * 0.9);
    },
    render(scene, camera, t) {
      mat.uniforms.uNear.value = camera.near; mat.uniforms.uFar.value = camera.far; mat.uniforms.uTime.value = t % 100;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(qs, qc);
    },
  };
}
