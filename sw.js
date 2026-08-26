const CACHE_NAME = 'pcad-apure-v1';
const APP_SHELL = [
  './',
  './index.html',
  './publicaciones.html',
  './servicios.html',
  './prevencion.html',
  './quienes-somos.html',
  './contacto.html',
  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './img/pc logo.png',
  './img/banner-mpprijp.jpg'
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

  // 1. IGNORAR COMPLETAMENTE Firebase Storage y Firestore
  if (url.includes('firebasestorage.googleapis.com') || url.includes('firestore.googleapis.com')) {
    return; // Deja que el navegador maneje la petición de forma nativa sin pasar por el Service Worker
  }

  // 2. Manejo normal para los archivos locales de tu web
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