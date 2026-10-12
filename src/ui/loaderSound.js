// The 一閃 score: a short cue synthesized with Web Audio (no audio files), scheduled on the audio clock
// against the loader's own timings so each hit lands on its frame.
//   intro  · a low drone and breath, the brush painting 一 left to right, a koto run as the name rises, ink drops
//   cut    · a riser that sucks back to silence, a subtle blade shing, a taiko impact on the white flash
//   reveal · a whoosh as the halves part, ka-ka-DON on the drums, a koto chord as the hero lands
// Browsers only allow sound after the visitor interacts, so the cue starts on the first tap or key and joins the
// animation where it is. A choice to mute is remembered.
const KEY = 'sv-sound';
const SWEEPS = new Set(['brush', 'riser', 'whoosh']);
const FRAME = 16; // ms

// Shared graph: compressor → master, a generated hall reverb, and a noise buffer for the breathy voices.
export function graph(ac) {
  const out = ac.createDynamicsCompressor();
  out.threshold.value = -16; out.knee.value = 10; out.ratio.value = 3.5; out.attack.value = 0.002; out.release.value = 0.3;
  const master = ac.createGain();
  master.gain.value = 1.2;
  // a brick-wall limiter last, so the louder mix never clips
  const lim = ac.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
  out.connect(master).connect(lim).connect(ac.destination);
  const sr = ac.sampleRate;
  const len = Math.round(sr * 2.6);
  const ir = ac.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) { const k = 1 - i / len; d[i] = (Math.random() * 2 - 1) * k * k * k; }
  }
  const verb = ac.createConvolver();
  verb.buffer = ir;
  const wet = ac.createGain();
  wet.gain.value = 0.34;
  verb.connect(wet).connect(out);
  const noise = ac.createBuffer(1, sr * 2, sr);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // soft clipper: adds the harmonics that let the drums read on phone and laptop speakers (which can't play their fundamentals)
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = (i / 511.5) - 1; curve[i] = Math.tanh(x * 3) / Math.tanh(3); }
  return { ac, out, master, verb, noise, curve, drone: null };
}

const E = 0.0001;
// an output channel with level, pan and a reverb send
function chan(g, { gain = 1, pan = 0, wet = 0.25 } = {}) {
  const { ac } = g;
  const v = ac.createGain();
  v.gain.value = gain;
  let p = null;
  if (ac.createStereoPanner) { p = ac.createStereoPanner(); p.pan.value = pan; v.connect(p).connect(g.out); } else v.connect(g.out);
  const s = ac.createGain();
  s.gain.value = wet;
  v.connect(s).connect(g.verb);
  return { v, p };
}
function noise(g, t, dur) {
  const s = g.ac.createBufferSource();
  s.buffer = g.noise; s.loop = true;
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  return s;
}
function filt(ac, type, f, q = 1) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function osc(ac, type, f, t, dur) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o; }
// percussive envelope: E → peak in a, exponential decay over d
function perc(param, t, peak, a, d) { param.setValueAtTime(E, t); param.exponentialRampToValueAtTime(peak, t + a); param.exponentialRampToValueAtTime(E, t + a + d); }

// a plucked string, close enough to a koto at this length
function pluck(g, t, f, gain, pan) {
  const { ac } = g;
  const { v } = chan(g, { gain, pan, wet: 0.4 });
  const lp = filt(ac, 'lowpass', 4200, 2);
  lp.frequency.setValueAtTime(4200, t);
  lp.frequency.exponentialRampToValueAtTime(700, t + 0.35);
  const a = ac.createGain();
  perc(a.gain, t, 1, 0.003, 1.1);
  lp.connect(a).connect(v);
  osc(ac, 'sawtooth', f, t, 1.2).connect(lp);
  const o2 = osc(ac, 'triangle', f * 2.001, t, 1.2);
  const g2 = ac.createGain(); g2.gain.value = 0.35; o2.connect(g2).connect(lp);
}

export const voices = {
  // low bed under the whole loader; joins late if sound is unlocked mid-way
  drone(g, t) {
    if (g.drone) return;
    const { ac } = g;
    const { v } = chan(g, { wet: 0.5 });
    const lp = filt(ac, 'lowpass', 520, 0.8);
    const amp = ac.createGain();
    amp.gain.setValueAtTime(E, t);
    amp.gain.exponentialRampToValueAtTime(0.05, t + 1.2);
    lp.connect(amp).connect(v);
    const oscs = [[73.42, 0], [146.83, -7], [146.83, 7], [220, 4]].map(([f, d]) => { const o = osc(ac, 'sawtooth', f, t, 30); o.detune.value = d; o.connect(lp); return o; });
    // breath
    const n = noise(g, t, 30);
    const bp = filt(ac, 'bandpass', 520, 0.7);
    const ng = ac.createGain(); ng.gain.value = 0.05;
    n.connect(bp).connect(ng).connect(lp);
    g.drone = { amp, lp, srcs: [...oscs, n] };
  },
  droneOut(g, t, dur = 1.6) {
    const d = g.drone;
    if (!d) return;
    d.amp.gain.cancelScheduledValues(t);
    d.amp.gain.setTargetAtTime(E, t, dur / 4);
    d.srcs.forEach((s) => { try { s.stop(t + dur * 1.6); } catch { /* already stopped */ } });
    g.drone = null;
  },
  // the brush painting 一: bristle noise sweeping up and across, eased like the wipe
  brush(g, t, dur = 1) {
    const { ac } = g;
    const { v, p } = chan(g, { wet: 0.3 });
    const bp = filt(ac, 'bandpass', 500, 0.9);
    bp.frequency.setValueAtTime(450, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(E, t);
    a.gain.exponentialRampToValueAtTime(0.32, t + dur * 0.5);
    a.gain.exponentialRampToValueAtTime(E, t + dur * 1.05);
    p?.pan.setValueAtTime(-0.75, t);
    p?.pan.linearRampToValueAtTime(0.75, t + dur);
    noise(g, t, dur * 1.1).connect(bp).connect(a).connect(v);
  },
  // a koto run up the miyako-bushi scale as the letters rise
  run(g, t) {
    [293.66, 311.13, 392, 440, 466.16, 587.33, 622.25, 783.99].forEach((f, i) => pluck(g, t + i * 0.056, f, 0.05 + i * 0.006, -0.5 + i / 7));
  },
  // an ink drop: a quick upward plip
  drop(g, t, pan = 0) {
    const { ac } = g;
    const { v } = chan(g, { gain: 0.16, pan, wet: 0.45 });
    const o = osc(ac, 'sine', 650, t, 0.25);
    o.frequency.exponentialRampToValueAtTime(1900, t + 0.05);
    const a = ac.createGain();
    perc(a.gain, t, 1, 0.004, 0.14);
    o.connect(a).connect(v);
  },
  // the breath before the cut: noise and tone climb, the drone opens, then everything sucks back to silence
  riser(g, t, dur) {
    const { ac } = g;
    const { v } = chan(g, { wet: 0.35 });
    const bp = filt(ac, 'bandpass', 300, 2.2);
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(5200, t + dur);
    const a = ac.createGain();
    a.gain.setValueAtTime(E, t);
    a.gain.exponentialRampToValueAtTime(0.26, t + dur - 0.025);
    a.gain.linearRampToValueAtTime(0, t + dur);
    noise(g, t, dur).connect(bp).connect(a).connect(v);
    const o = osc(ac, 'sine', 160, t, dur);
    o.frequency.exponentialRampToValueAtTime(760, t + dur);
    const og = ac.createGain();
    og.gain.setValueAtTime(E, t);
    og.gain.exponentialRampToValueAtTime(0.05, t + dur - 0.025);
    og.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(og).connect(v);
    const d = g.drone;
    if (d) {
      d.lp.frequency.setValueAtTime(520, t);
      d.lp.frequency.exponentialRampToValueAtTime(1800, t + dur);
      d.amp.gain.cancelScheduledValues(t);
      d.amp.gain.setValueAtTime(0.05, t);
      d.amp.gain.linearRampToValueAtTime(0.08, t + dur - 0.03);
      d.amp.gain.linearRampToValueAtTime(0.01, t + dur);
    }
  },
  // the blade: a short, airy shing that crosses the stereo field with the slash, and a faint metallic ring
  slice(g, t) {
    const { ac } = g;
    const { v, p } = chan(g, { gain: 0.65, wet: 0.45 });
    p?.pan.setValueAtTime(-0.6, t);
    p?.pan.linearRampToValueAtTime(0.6, t + 0.16);
    const hp = filt(ac, 'highpass', 4200, 0.7);
    const bp = filt(ac, 'bandpass', 6500, 0.8);
    bp.frequency.setValueAtTime(5000, t);
    bp.frequency.exponentialRampToValueAtTime(9000, t + 0.12);
    const a = ac.createGain();
    perc(a.gain, t, 0.55, 0.004, 0.22);
    noise(g, t, 0.3).connect(hp).connect(bp).connect(a).connect(v);
    [2793, 3729, 4699, 5588].forEach((f, i) => {
      const o = osc(ac, 'sine', f * (1 + (Math.random() - 0.5) * 0.004), t, 1);
      const og = ac.createGain();
      perc(og.gain, t, 0.05 - i * 0.008, 0.003, 0.5 + i * 0.12);
      o.connect(og).connect(v);
    });
  },
  // taiko: a pitched skin over a sub thump; size scales weight and tail
  taiko(g, t, size = 1, pan = 0) {
    const { ac } = g;
    const { v } = chan(g, { gain: 0.8 * size, pan, wet: 0.32 });
    const sh = ac.createWaveShaper();
    sh.curve = g.curve;
    const pre = ac.createGain();
    pre.gain.value = 3.2;
    pre.connect(sh).connect(v);
    const o = osc(ac, 'sine', 130, t, 1.6 * size);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.3);
    const a = ac.createGain();
    perc(a.gain, t, 0.42, 0.003, 1.0 * size);
    o.connect(a).connect(pre);
    // the skin: a mid tone that carries the hit on small speakers
    const sk = osc(ac, 'triangle', 340, t, 0.5);
    sk.frequency.exponentialRampToValueAtTime(160, t + 0.12);
    const sa = ac.createGain();
    perc(sa.gain, t, 0.8, 0.002, 0.32 * size);
    sk.connect(sa).connect(pre);
    // the stick
    const bp = filt(ac, 'bandpass', 1800, 0.8);
    const na = ac.createGain();
    perc(na.gain, t, 0.7, 0.001, 0.06);
    noise(g, t, 0.15).connect(bp).connect(na).connect(v);
  },
  // ka: a rim click
  ka(g, t, pan = 0) {
    const { ac } = g;
    const { v } = chan(g, { gain: 0.32, pan, wet: 0.25 });
    const bp = filt(ac, 'bandpass', 2400, 3);
    const a = ac.createGain();
    perc(a.gain, t, 1, 0.001, 0.05);
    noise(g, t, 0.1).connect(bp).connect(a).connect(v);
    const o = osc(ac, 'square', 880, t, 0.06);
    const oa = ac.createGain();
    perc(oa.gain, t, 0.25, 0.001, 0.03);
    o.connect(oa).connect(v);
  },
  // the white flash: a big taiko with a sub drop and a washed crash
  impact(g, t) {
    voices.taiko(g, t, 1.25);
    const { ac } = g;
    const { v } = chan(g, { wet: 0.6 });
    const sub = osc(ac, 'sine', 62, t, 1.6);
    sub.frequency.exponentialRampToValueAtTime(34, t + 0.9);
    const sa = ac.createGain();
    perc(sa.gain, t, 0.3, 0.004, 1.3);
    sub.connect(sa).connect(v);
    // the crack of the hit, in the range small speakers play
    const mid = filt(ac, 'bandpass', 950, 0.9);
    const ma = ac.createGain();
    perc(ma.gain, t, 0.55, 0.001, 0.28);
    noise(g, t, 0.4).connect(mid).connect(ma).connect(v);
    const hp = filt(ac, 'highpass', 3200, 0.7);
    const ca = ac.createGain();
    perc(ca.gain, t, 0.24, 0.002, 0.9);
    noise(g, t, 1).connect(hp).connect(ca).connect(v);
  },
  // the halves parting: two airy sweeps moving apart, peaking where the halves move fastest
  whoosh(g, t, dur) {
    const { ac } = g;
    [-0.65, 0.65].forEach((pan, i) => {
      const { v } = chan(g, { pan, wet: 0.3 });
      const bp = filt(ac, 'bandpass', 1800, 1.3);
      bp.frequency.setValueAtTime(2000 - i * 300, t);
      bp.frequency.exponentialRampToValueAtTime(520, t + dur);
      const a = ac.createGain();
      a.gain.setValueAtTime(E, t);
      a.gain.exponentialRampToValueAtTime(0.42, t + dur * 0.48);
      a.gain.exponentialRampToValueAtTime(E, t + dur);
      noise(g, t, dur).connect(bp).connect(a).connect(v);
    });
  },
  // the hero lands: a soft koto chord and a bell
  resolve(g, t) {
    [146.83, 220, 293.66, 440].forEach((f, i) => pluck(g, t + i * 0.035, f, 0.07, -0.3 + i * 0.2));
    const { ac } = g;
    const { v } = chan(g, { gain: 0.06, wet: 0.7 });
    [1174.66, 1174.66 * 2.76].forEach((f, i) => {
      const o = osc(ac, 'sine', f, t, 3);
      const a = ac.createGain();
      perc(a.gain, t, i ? 0.35 : 1, 0.004, 2.4);
      o.connect(a).connect(v);
    });
  },
};

// The intro, in seconds from when its CSS animations started; offsets match the keyframes in styles.css.
// The cut is scored from the loader's GSAP timeline instead (see loader.js), so it follows that timeline even if it lags.
const INTRO = [[0, 'drone'], [0.1, 'brush', 1], [0.3, 'run'], [0.9, 'drop', 0.85], [0.96, 'drop', 0.9], [1.02, 'drop', -0.85]];

// One score per page load. Browsers only allow sound after a tap or key, so entry.js loads this on the visitor's
// first one and hands over the audio context it made inside that gesture. The loader reports its cut as 'sv:sfx' events.
let inst = null;
export function loaderSound(ac, fromButton = false) {
  const root = document.getElementById('preloader');
  if (inst || !root) return inst; // already running, or the loader is gone and there's nothing left to score
  inst = createLoaderSound(root.querySelector('.pl-half--a .pl-sound'), ac, fromButton);
  document.addEventListener('sv:sfx', (e) => { const { name, arg, late } = e.detail; if (name === 'end') inst.end(); else inst.hit(name, arg, late); });
  // follow the intro from when its CSS animations started (same clock as performance.now()); once the cut has begun, only its hits remain
  if (root.classList.contains('is-cutting')) return inst;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const a = reduce ? null : root.querySelector('.pl-half--a .pl-ch')?.getAnimations?.()[0];
  if (a?.startTime != null) inst.intro(a.startTime);
  else if (a) a.ready.then(() => inst.intro(a.startTime), () => inst.intro(null));
  else inst.intro(null);
  return inst;
}

function createLoaderSound(button, ac, fromButton) {
  const label = button?.querySelector('.pl-sound__t');
  let muted = false;
  try { muted = localStorage.getItem(KEY) === 'off'; } catch { /* storage blocked */ }
  // the first tap was on the sound button itself: that's a yes
  if (fromButton && muted) { muted = false; try { localStorage.removeItem(KEY); } catch { /* */ } }
  const plan = []; // { at: performance.now() ms, name, arg, keep }
  let g = null, next = 0, closed = false;

  const state = () => (muted ? 'off' : ac?.state === 'running' ? 'on' : 'blocked');
  function show() {
    if (!button) return;
    const s = state();
    button.dataset.state = s;
    button.setAttribute('aria-pressed', String(s === 'on'));
    if (label) label.textContent = s === 'on' ? 'Sound on' : s === 'off' ? 'Sound off' : 'Tap for sound';
  }
  // schedule everything planned that hasn't been; hits already in the past are skipped, the drone joins late
  function flush() {
    show();
    if (muted || closed || !ac || ac.state !== 'running') return;
    g ||= graph(ac);
    const now = performance.now();
    const lat = ac.outputLatency || ac.baseLatency || 0;
    for (; next < plan.length; next++) {
      const e = plan[next];
      let t = ac.currentTime + (e.at - now) / 1000 - lat;
      const late = (now - e.at) / 1000; // how far past its mark, not counting output latency
      if (late > 0.04 && SWEEPS.has(e.name)) {
        // a sweep that's already under way joins for what's left of it, still ending on its mark
        if (e.arg - late >= 0.12) { voices[e.name](g, ac.currentTime, e.arg - late); window.__sfx?.push({ name: e.name, at: now, arg: e.arg - late }); }
        continue;
      }
      // a hit plays even a frame or two late (the frame it belongs to is only now being drawn); one long gone is dropped
      if (late > 0.25 && !e.keep) continue;
      t = Math.max(t, ac.currentTime);
      voices[e.name](g, t, e.arg);
      window.__sfx?.push({ name: e.name, at: e.at, arg: e.arg });
    }
  }
  const add = (anchor, list) => {
    list.forEach(([s, name, arg]) => plan.push({ at: anchor + s * 1000, name, arg, keep: name === 'drone' }));
    plan.sort((a, b) => a.at - b.at);
    flush();
  };

  if (ac) ac.onstatechange = flush;
  button?.addEventListener('click', () => {
    if (!ac || closed) return;
    if (muted) { muted = false; try { localStorage.removeItem(KEY); } catch { /* */ } if (g) g.master.gain.setTargetAtTime(1.2, ac.currentTime, 0.05); }
    else if (ac.state === 'running') {
      muted = true;
      try { localStorage.setItem(KEY, 'off'); } catch { /* */ }
      if (g) g.master.gain.setTargetAtTime(0, ac.currentTime, 0.05);
    }
    ac.resume().then(flush, show);
    show();
  });
  show();

  return {
    // anchor: when the CSS intro started, on the performance.now() clock (null when the intro doesn't play)
    intro(anchor) { add(anchor ?? performance.now(), anchor == null ? [[0, 'drone']] : INTRO); },
    // a hit now; late: how far past its mark the caller already is, in seconds
    // (hits land one frame out, when the frame the caller just drew reaches the screen)
    hit(name, arg, late = 0) { add(performance.now() + FRAME - late * 1000, [[0, name, arg]]); },
    // the cue is over: let the tails ring out, then release the audio device
    end() {
      setTimeout(() => { closed = true; ac?.close?.().catch(() => {}); }, 4000);
    },
  };
}
