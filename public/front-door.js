// The front door. A first visit to the site opens the 3D village (/world); the last button of its tour comes back
// here with ?site=2d, and that choice is remembered, so later visits and refreshes stay on this 2D site.
// Crawlers, browsers without WebGL 2, deep links (#section) and visitors whose storage is blocked stay here too.
(function () {
  var KEY = 'sv-site';
  try {
    if (/[?&]site=2d(&|$)/.test(location.search)) {
      localStorage.setItem(KEY, '2d');
      history.replaceState(null, '', location.pathname + location.hash);
      return;
    }
    if (localStorage.getItem(KEY) === '2d') return;
  } catch (e) { return; }
  if (location.hash || navigator.webdriver) return;
  if (/bot|crawl|spider|slurp|lighthouse|headless|facebookexternalhit|whatsapp|telegram|twitter|linkedin|embedly|preview/i.test(navigator.userAgent)) return;
  try { if (!document.createElement('canvas').getContext('webgl2')) return; } catch (e) { return; }
  location.replace('world' + location.search);
})();
