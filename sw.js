const CACHE_NAME = 'sistema-registro-pwa-v1';
const OFFLINE_URL = new URL('./offline.html', self.location).href;

const PRECACHE_URLS = [
  './',
  './index.html',
  './login.html',
  './inicio.html',
  './consultar.html',
  './descartes.html',
  './inventario.html',
  './offline.html',
  './css/global.css',
  './css/login.css',
  './css/registro.css',
  './css/inicio.css',
  './css/consultar.css',
  './css/descartes.css',
  './css/inventario.css',
  './js/common.js',
  './js/login.js',
  './js/script.js',
  './js/inicio.js',
  './js/consultar.js',
  './js/descartes.js',
  './js/inventario.js',
  './assets/icons/icon-192.png',
  './assets/images/logo.png'
];

const PRECACHE_RESOURCES = PRECACHE_URLS.map((resource) => new URL(resource, self.location).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_RESOURCES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL));
      })
    );
  }
});
