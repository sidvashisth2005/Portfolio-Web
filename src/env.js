// Feature checks that don't need Three.js, so the first bundle stays small.
export const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

// Cheap capability check at startup (creating a real context costs real time); scenes confirm it when they build.
export const hasWebGL = () => typeof WebGLRenderingContext !== 'undefined';
