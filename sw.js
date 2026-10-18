// Alphabet Safari Service Worker
//  - App code: network-first, so updates arrive immediately, with an offline fallback.
//  - Recorded phonics clips and images: cache-first (they only change with a new CACHE_NAME).
//  - api/ (desktop text-to-speech) is never cached here.
const CACHE_NAME = 'alphabet-safari-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './content.js',
  './script.js',
  './manifest.json',
  './privacy.html',
  './assets/fonts/fonts.css',
  './assets/fonts/noto-emoji-subset-8ed309.woff2',
  './assets/mascot-256.webp',
  './assets/star-256.webp',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the HTTP cache, so a new CACHE_NAME never precaches a stale copy
  // that the host (e.g. GitHub Pages' max-age=600) still considers fresh.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE.map((url) => new Request(url, { cache: 'reload' }))))
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
    (url.pathname.includes('/assets/audio/') || /\.(png|jpe?g|ico|webp|woff2)$/.test(url.pathname));
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

  // Revalidate app code with the server so a heuristically "fresh" HTTP-cache copy can't
  // keep an old script.js running after an update. (A navigate-mode Request can't be
  // re-initialised, hence building a new one from the URL.)
  const networkRequest = url.origin === self.location.origin
    ? new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : request;

  event.respondWith(
    fetch(networkRequest)
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
