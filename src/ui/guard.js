// A light deterrent against casual inspection: the developer-tools and view-source shortcuts do nothing, and the
// right-click menu is off except on links, form fields and selected text, so opening a link in a new tab or copying
// still works. It stops nobody determined (the browser's own menu still opens the tools); nothing secret is ever
// sent to the browser anyway: the API keys live in the server functions.
export function guard() {
  addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey, k = e.code;
    const tools = e.key === 'F12'
      || (mod && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC'].includes(k)) // Ctrl+Shift+I / J / C
      || (e.metaKey && e.altKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyU'].includes(k)) // Cmd+Option+I / J / C / U on a Mac
      || (mod && !e.shiftKey && !e.altKey && k === 'KeyU'); // view source
    if (tools) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  addEventListener('contextmenu', (e) => {
    if (e.target.closest?.('a, input, textarea, select, [contenteditable]') || String(window.getSelection?.() || '')) return;
    e.preventDefault();
  });
}
