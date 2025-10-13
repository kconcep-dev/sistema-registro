/**
 * Service Worker: gestiona una caché mínima para permitir el arranque rápido
 * de la aplicación y ofrecer una página de respaldo cuando no hay conexión.
 */
const CACHE_NAME = 'sistema-registro-shell-v1';
const CORE_ASSETS = [
  './',
  './inicio.html'
];

/**
 * Fase de instalación: precarga los recursos imprescindibles y tolera fallos
 * silenciosos para no bloquear la instalación si un archivo no está disponible.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => Promise.resolve())
  );
});

/**
 * Fase de activación: elimina versiones antiguas de la caché para evitar que
 * recursos obsoletos se sigan sirviendo a los usuarios.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

/**
 * Intercepta solicitudes GET: entrega recursos desde caché cuando existe una
 * copia local y ofrece la página principal como último recurso en navegación.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch((error) => {
        if (event.request.mode === 'navigate') {
          return caches.match('./inicio.html');
        }
        throw error;
      });
    })
  );
});
