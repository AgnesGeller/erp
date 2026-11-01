const CACHE_PREFIX = 'diszkertek-erp-';
const CACHE_NAME = CACHE_PREFIX + '0.1.9';
const FILES = ['./', './index.html', './assets/style.css?v=0.1.9', './assets/js/main.js?v=0.1.9', './assets/js/erp-office.js?v=0.1.9', './assets/js/erp-office-setup.js?v=0.1.9',
  './assets/js/erp-api.js?v=0.1.9', './assets/js/erp-dates.js?v=0.1.9', './assets/js/erp-customers.js?v=0.1.9', './assets/js/erp-project-roles.js?v=0.1.9',
  './manifest.webmanifest?v=0.1.9', './assets/logo.png', './assets/icon-d-192-v1.png', './assets/icon-d-512-v1.png',
  './assets/favicon-d-v1.png', './assets/apple-touch-icon-d-v1.png'];
const allowed = new Set(FILES.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const home = new URL('./', self.registration.scope);
  const navigation = event.request.mode === 'navigate' && url.origin === home.origin &&
    (url.pathname === home.pathname || url.pathname === new URL('./index.html', home).pathname);
  if (!navigation && !allowed.has(event.request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request, { cache: 'no-cache' });
      if (response.ok) await cache.put(navigation ? home.href : event.request, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(navigation ? home.href : event.request);
      if (saved) return saved;
      throw error;
    }
  })());
});
