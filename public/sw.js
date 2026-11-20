// FreshRoute service worker: the app shell works offline; API and video always go to the network.
const CACHE = 'freshroute-v2'; // bump to drop files cached by earlier deploys
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  // Map tiles: cache-first so recently driven areas still draw in a dead zone.
  if (url.hostname === 'tiles.openfreemap.org') {
    e.respondWith(caches.open('freshroute-tiles').then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => (r.ok && c.put(e.request, r.clone()), r))));
    return;
  }
  if (url.origin !== location.origin) return;
  // App: network first, cached copy when offline. Page navigations fall back to the shell.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
        return r;
      })
      .catch(async () => (await caches.match(e.request)) || (e.request.mode === 'navigate' ? caches.match('/') : Response.error())),
  );
});
