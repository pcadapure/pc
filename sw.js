const CACHE_NAME = 'pcad-apure-v54';
const APP_SHELL = [
  './',
  './index.html',
  './publicaciones.html',
  './rrhh.html',
  './educacion.html',
  './libro-pcad.html',
  './libro-pcad.js',
  './libro-pcad-pages.json',
  './site-search.js',
  './site-search.css',
  './gestion-riesgo.html',
  './prehospitalario.html',
  './operaciones.html',
  './servicios.html',
  './quienes-somos.html',
  './contacto.html',
  './styles.css',
  './script.js',
  './apure-map.js',
  './rrhh-portal.js',
  './manifest.webmanifest',
  './img/pc logo.png',
  './img/libro-pcad/pagina-001.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isHtmlRequest = event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html');

  // 1. IGNORAR COMPLETAMENTE Firebase Storage y Firestore
  if (url.includes('firebasestorage.googleapis.com') || url.includes('firestore.googleapis.com')) {
    return;
  }

  // 2. Actualizar las páginas HTML desde la red y conservar una copia nueva
  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseCopy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Manejo normal para recursos locales y externos
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseCopy));
        return response;
      });
    })
  );
});
