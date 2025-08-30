const CACHE_NAME = 'visitantes-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './icon-192.png',
    './icon-512.png',
    './manifest.json'
    // Agrega aquí otros archivos estáticos como el sonido beep.mp3
];

// Evento de instalación: se abre el caché y se añaden los archivos base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento fetch: intercepta las peticiones de red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en el caché, lo devuelve.
        if (response) {
          return response;
        }
        // Si no, lo busca en la red.
        return fetch(event.request);
      })
  );
});