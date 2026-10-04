const query = (q: string) => !!(window.matchMedia && window.matchMedia(q).matches);

export const prefersReducedMotion = () => query('(prefers-reduced-motion: reduce)');
export const prefersMoreContrast = () => query('(prefers-contrast: more)');
