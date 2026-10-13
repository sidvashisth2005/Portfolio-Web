// The front door. Every visit to the site's address, a refresh included, opens the 3D village (/world). The last
// button of its tour comes back here with ?site=2d, which shows this 2D site for that visit only: the flag is
// dropped from the address straight away, so a refresh goes back to the village.
// Crawlers, browsers without WebGL 2 and deep links (#section) stay on this 2D site.
(function () {
  try { localStorage.removeItem('sv-site'); } catch (e) { /* storage blocked: nothing was remembered anyway */ }
  if (/[?&]site=2d(&|$)/.test(location.search)) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* keep the flag */ }
    return;
  }
  if (location.hash || navigator.webdriver) return;
  if (/bot|crawl|spider|slurp|lighthouse|headless|facebookexternalhit|whatsapp|telegram|twitter|linkedin|embedly|preview/i.test(navigator.userAgent)) return;
  try { if (!document.createElement('canvas').getContext('webgl2')) return; } catch (e) { return; }
  location.replace('world' + location.search);
})();
