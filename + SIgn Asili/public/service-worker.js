// Service Worker for Sign Asili PWA
const CACHE_NAME = 'sign-asili-v1';
const urlsToCache = [
  '/mobile-integration.html',
  '/styles.css',
  '/asili-talk.html',
  '/scripts/asili-talk.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
