/* Stargazer's service worker, registered by src/services/pwa/registerServiceWorker.ts as /sw.js?v=<build>, where
   <build> is the game's own hashed bundle name. A deploy changes it, so each deploy installs a fresh worker with a
   cache of its own, and the previous cache is dropped once the new worker takes over.

   Nothing is downloaded ahead of time: the files a player actually opens are kept as they load, so the game comes
   back offline after one visit. Pages are network first (a new deploy shows at once when online); the hashed files
   under /assets/ never change, so they come from the cache first. Other origins (Supabase, Google Fonts) are left
   alone: scores and sign-in always go to the network. */
const CACHE = 'stargazer-' + (new URL(self.location.href).searchParams.get('v') ?? 'dev');

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('stargazer-') && n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

/* The first visit loads before this worker is in charge, so the page sends the files it already has
   ({ type: 'keep', urls }) and they are fetched again into the cache. */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'keep' || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => typeof u === 'string' && new URL(u).origin === self.location.origin);
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(urls.map((u) => cache.add(u).catch(() => undefined)))));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') event.respondWith(networkFirst(request));
  else if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request));
  else event.respondWith(networkFirst(request));
});

async function keep(request, response) {
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await keep(request, await fetch(request));
  } catch (error) {
    /* offline: the page as last seen; a page with a query (?skin=…) or another path falls back to the game */
    const cached = await caches.match(request, { ignoreSearch: true, ignoreVary: true })
      ?? (request.mode === 'navigate' ? await caches.match('/', { ignoreSearch: true, ignoreVary: true }) : undefined);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  /* ignoreVary: a host may answer `Vary: Origin`, and a module script asks with an Origin header the copy kept
     through the page's list did not; a hashed file is the same file either way */
  return (await caches.match(request, { ignoreVary: true })) ?? keep(request, await fetch(request));
}
