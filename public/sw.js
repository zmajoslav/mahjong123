/* Service worker: cache static assets for offline play and faster repeat visits */
const CACHE_NAME = 'mahjong-v1';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/client.js',
  '/solitaire-engine.js',
  '/robots.txt',
  '/sitemap.xml',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_URLS.map(function (u) {
        return new Request(u, { cache: 'reload' });
      })).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) {
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        var clone = res.clone();
        if (res.status === 200 && (url.pathname === '/' || url.pathname === '/index.html' ||
            url.pathname.endsWith('.css') || url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.txt') || url.pathname.endsWith('.xml'))) {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return res;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html').then(function (cached) {
            return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
