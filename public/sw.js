// Cache Version 2 - Forces immediate upgrade on phone browsers
const CACHE_NAME = 'shopnearfin-v2-' + Date.now();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first for all navigation and JS/CSS updates
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
