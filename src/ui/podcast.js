// Podcast player: a waveform canvas that idles on its own and reacts to the real audio once playing.
export function initPodcast() {
  const audio = document.getElementById('player-audio');
  const btn = document.getElementById('player-btn');
  const label = document.getElementById('player-label');
  const bar = document.getElementById('player-progress');
  const canvas = document.getElementById('player-wave');
  if (!audio || !canvas) return { render() {} };
  const g = canvas.getContext('2d');
  let analyser = null, data = null;

  function setupAudio() {
    if (analyser) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      data = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      analyser = null;
    }
  }

  btn.addEventListener('click', () => {
    setupAudio();
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });
  audio.addEventListener('play', () => { btn.setAttribute('aria-pressed', 'true'); label.textContent = 'Pause'; });
  audio.addEventListener('pause', () => { btn.setAttribute('aria-pressed', 'false'); label.textContent = 'Play with sound'; });
  audio.addEventListener('timeupdate', () => { bar.style.width = `${(audio.currentTime / (audio.duration || 1)) * 100}%`; });

  function size() {
    const r = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.max(1, r.width * d);
    canvas.height = Math.max(1, r.height * d);
  }
  size();
  window.addEventListener('resize', size);

  return {
    render(time) {
      const W = canvas.width, H = canvas.height;
      g.clearRect(0, 0, W, H);
      const bars = 56;
      const gap = W / bars;
      const playing = analyser && !audio.paused;
      if (playing) analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars; i++) {
        let v;
        if (playing) v = data[Math.floor((i / bars) * data.length * 0.8)] / 255;
        else v = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(time * 2.2 + i * 0.45)) * (0.6 + 0.4 * Math.sin(i * 1.7));
        const h = Math.max(3, v * H);
        g.fillStyle = i % 9 === 4 ? '#FFD60A' : '#E0182D';
        g.globalAlpha = playing ? 1 : 0.75;
        g.fillRect(i * gap + gap * 0.2, H - h, gap * 0.6, h);
      }
      g.globalAlpha = 1;
    },
  };
}
