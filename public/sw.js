// Service worker cache cleaner to prevent stale chunk and HTML caching
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim()).then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', () => {
  // Always let the browser fetch directly from the network
  return;
});

