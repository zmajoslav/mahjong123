/* Service worker: cache static assets for offline play and faster repeat visits */
const CACHE_NAME = 'mahjong-v14';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/es/',
  '/fr/',
  '/de/',
  '/pt/',
  '/pl/',
  '/it/',
  '/nl/',
  '/ru/',
  '/ja/',
  '/zh/',
  '/ko/',
  '/ar/',
  '/hi/',
  '/tr/',
  '/sv/',
  '/cs/',
  '/sk/',
  '/uk/',
  '/ro/',
  '/el/',
  '/id/',
  '/th/',
  '/vi/',
  '/hu/',
  '/privacy.html',
  '/terms.html',
  '/i18n/strings.js',
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
  if (url.pathname.startsWith('/api/')) return;

  var isHtml = event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
  var isJs = url.pathname.endsWith('.js');

  /* Network-first for HTML and JS to avoid stale cache causing "stuck on second refresh" */
  if (isHtml || isJs) {
    event.respondWith(
      fetch(event.request).then(function (res) {
        var clone = res.clone();
        if (res.status === 200 && (isHtml || isJs || url.pathname.endsWith('.css'))) {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return res;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          if (cached) return cached;
          if (isHtml) {
            return caches.match('/index.html').then(function (c) {
              return c || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            });
          }
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  /* Cache-first for CSS, txt, xml, images */
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        var clone = res.clone();
        if (res.status === 200 && (url.pathname.endsWith('.css') || url.pathname.endsWith('.txt') ||
            url.pathname.endsWith('.xml') || /\.(png|jpg|svg|ico|webp)$/i.test(url.pathname))) {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return res;
      }).catch(function () {
        return caches.match(event.request).then(function (c) {
          return c || new Response('', { status: 503 });
        });
      });
    })
  );
});
