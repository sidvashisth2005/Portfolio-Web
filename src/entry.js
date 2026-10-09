// The loader is pure HTML + CSS, so let the browser paint it before any app code runs.
// Styles stay here so they're inlined in the page head; the app chunk is fetched and run after the first frame.
import './fonts.css';
import './styles.css';

requestAnimationFrame(() => setTimeout(() => import('./main.js'), 0));
