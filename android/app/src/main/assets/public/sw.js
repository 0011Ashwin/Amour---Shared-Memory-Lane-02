// Service Worker for Us Forever
const CACHE_NAME = 'us-forever-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Let the browser handle standard non-GET and API or Firestore requests
  if (e.request.method !== 'GET' || e.request.url.includes('/api/') || e.request.url.includes('firestore.googleapis.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // Cache static chunk files dynamically on load
        if (response.status === 200 && (e.request.url.endsWith('.js') || e.request.url.endsWith('.css') || e.request.url.endsWith('.png') || e.request.url.endsWith('.jpg') || e.request.url.endsWith('.svg') || e.request.url.includes('fonts.googleapis.com'))) {
          const clonableResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clonableResponse);
          });
        }
        return response;
      }).catch(() => {
        // Handle physical network disconnect gracefully
        return caches.match('/');
      });
    })
  );
});
