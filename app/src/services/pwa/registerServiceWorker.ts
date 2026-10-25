import { logger } from '../logger';

/** Registers /sw.js (public/sw.js) once the page has loaded, so it never competes with the first paint. It is what
    lets the game install as an app and open offline. `bundleUrl` is the game's own hashed bundle (`import.meta.url`
    of the entry): its file name names the build, so every deploy gets a fresh worker and cache. A browser without
    service workers just plays online. `alsoKeep` are files the game may need offline without having loaded them yet
    (the worker that makes a week on the device). */
export function registerServiceWorker(bundleUrl: string, alsoKeep: string[] = [], nav: Navigator = navigator, win: Window = window): void {
  if (!('serviceWorker' in nav)) return;
  const register = () => {
    nav.serviceWorker.register(workerUrl(bundleUrl))
      .then(() => nav.serviceWorker.ready)
      .then((registration) => registration.active?.postMessage({ type: 'keep', urls: loadedFiles(win, alsoKeep) }))
      .catch((error: unknown) => logger.error('service worker not registered', error));
  };
  if (win.document.readyState === 'complete') register();
  else win.addEventListener('load', register, { once: true });
}

/** `/sw.js?v=main-D0X0CfP4.js` for a bundle at `…/assets/main-D0X0CfP4.js`. */
export function workerUrl(bundleUrl: string): string {
  const build = new URL(bundleUrl).pathname.split('/').pop() || 'dev';
  return '/sw.js?v=' + encodeURIComponent(build);
}

/** This page, every same-origin file it has loaded so far (what the worker could not see on the first visit) and
    `extra`, as absolute addresses. */
export function loadedFiles(win: Window, extra: string[] = []): string[] {
  const origin = win.location.origin;
  const files = win.performance.getEntriesByType('resource').map((entry) => entry.name);
  const wanted = [...extra].map((url) => new URL(url, win.location.href).href);
  return [...new Set([win.location.href, ...files, ...wanted])].filter((url) => url.startsWith(origin + '/'));
}
