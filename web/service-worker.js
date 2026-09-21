const CACHE = 'feather-markdown-v7';
const SHELL = ['/', '/app.css', '/app.js', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  const requestURL = new URL(event.request.url);
  if (requestURL.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok || response.type === 'opaque') {
          caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
