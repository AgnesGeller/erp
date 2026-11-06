const CACHE_PREFIX = 'diszkertek-erp-';
const CACHE_NAME = CACHE_PREFIX + '0.16.8';
const FILES = ['./assets/js/erp-startup.js?v=0.16.8', './assets/js/erp-reference-model.js', './assets/js/erp-reference-files.js', './assets/js/erp-references.js', './assets/js/erp-dialogs.js', './assets/js/erp-workplan-media.js', './assets/js/erp-survey-store.js', './assets/js/erp-survey-model.js', './assets/js/erp-survey-archive.js', './assets/js/erp-references.js?v=0.16.8', './assets/js/erp-workplan-model.js', './assets/js/erp-sortable.js', './assets/js/erp-execution-model.js', './assets/js/erp-execution-state.js', './assets/js/erp-execution-editor.js', './', './index.html', './assets/style.css?v=0.16.8', './assets/js/main.js?v=0.16.8', './assets/js/erp-dialogs.js?v=0.16.8', './assets/js/erp-office.js?v=0.16.8', './assets/js/erp-finance.js?v=0.16.8', './assets/js/erp-maintenance.js?v=0.16.8', './assets/js/erp-workpack.js?v=0.16.8', './assets/js/erp-office-navigation.js?v=0.16.8', './assets/js/erp-calendar.js?v=0.16.8', './assets/js/erp-calendar-editor.js?v=0.16.8', './assets/js/erp-calendar-model.js?v=0.16.8', './assets/js/erp-maintenance-model.js?v=0.16.8', './assets/js/erp-office-setup.js?v=0.16.8',
  './assets/js/erp-api.js?v=0.16.8', './assets/js/erp-dates.js?v=0.16.8', './assets/js/erp-customers.js?v=0.16.8', './assets/js/erp-clients.js?v=0.16.8', './assets/js/erp-staff.js?v=0.16.8', './assets/js/erp-workplans.js?v=0.16.8', './assets/js/erp-materials.js?v=0.16.8', './assets/js/erp-material-model.js?v=0.16.8', './assets/js/erp-worksheets.js?v=0.16.8', './assets/js/erp-worksheet-model.js?v=0.16.8', './assets/js/erp-entries.js?v=0.16.8', './assets/js/erp-entry-model.js?v=0.16.8', './assets/js/erp-quote-engine.js', './assets/js/erp-quote-tools.js', './assets/js/erp-workplan-model.js?v=0.16.8', './assets/js/erp-workplan-media.js?v=0.16.8', './assets/js/erp-site-works.js?v=0.16.8', './assets/js/erp-quotes.js?v=0.16.8', './assets/js/erp-quote-engine.js?v=0.16.8', './assets/js/erp-quote-tools.js?v=0.16.8', './assets/js/erp-calculator-import.js?v=0.16.8', './assets/js/erp-surveys.js?v=0.16.8', './assets/js/erp-survey-model.js?v=0.16.8', './assets/js/erp-survey-store.js?v=0.16.8', './assets/js/erp-survey-archive.js?v=0.16.8', './assets/vendor/fflate-0.8.2.js', './assets/js/erp-project-roles.js?v=0.16.8',
  './manifest.webmanifest?v=0.16.8', './assets/logo.png', './assets/icon-d-192-v1.png', './assets/icon-d-512-v1.png',
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
/* Kizárólag az ERP saját service workerének értesítései. */
self.addEventListener('push',event=>{event.waitUntil((async()=>{let data={};try{data=event.data?.json()??{};}catch{}const tag=typeof data.tag==='string'&&data.tag.startsWith('erp-calendar-')?data.tag:'erp-calendar';await self.registration.showNotification('DÍSZKERTEK – naptári emlékeztető',{body:'Közeleg egy naptári időpontod. A részleteket a saját ERP-naptáradban láthatod.',icon:new URL('./assets/icon-d-192-v1.png',self.registration.scope).href,badge:new URL('./assets/icon-d-192-v1.png',self.registration.scope).href,tag,data:{url:new URL('./?calendar=1',self.registration.scope).href},requireInteraction:true});})());});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const home=new URL('./',self.registration.scope);const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){const u=new URL(client.url);if(u.origin===home.origin&&u.pathname.startsWith(home.pathname)){await client.focus();client.postMessage({type:'ERP_CALENDAR_OPEN'});return;}}await self.clients.openWindow(new URL('./?calendar=1',home).href);})());});
