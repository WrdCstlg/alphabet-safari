// Alphabet Safari Service Worker
//  - App code: network-first, so updates arrive immediately, with an offline fallback.
//  - Recorded phonics clips and images: cache-first (they only change with a new CACHE_NAME).
//  - api/ (desktop text-to-speech) is never cached here.
const CACHE_NAME = 'alphabet-safari-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './content.js',
  './script.js',
  './manifest.json',
  './assets/mascot.jpg',
  './assets/star_badge.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isCacheFirst(url) {
  return url.origin === self.location.origin &&
    (url.pathname.includes('/assets/audio/') || /\.(png|jpe?g|ico)$/.test(url.pathname));
}

function putInCache(request, response) {
  if (response && response.ok && response.type !== 'opaque') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.includes('/api/')) return;

  if (isCacheFirst(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => putInCache(request, res)))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => putInCache(request, res))
      .catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        // Only page navigations fall back to the app shell; a missing script or clip should fail
        // normally rather than receive HTML.
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
