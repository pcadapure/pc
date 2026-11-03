const CACHE_NAME = 'pcad-apure-v95';
const APP_SHELL = [
  './',
  './index.html',
  './publicaciones.html',
  './articulos.html',
  './article-images.js',
  './articulos.js',
  './home-articles.js',
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
  './img/pc ilustrado.jpg',
  './img/taller-primeros-auxilios.jpg',
  './img/MAPA DE RIESGO.png',
  './img/pc.jpg',
  './img/DA.jpg',
  './img/GR.jpg',
  './img/CAPT.jpg',
  './img/rescate-estructura.jpg',
  './img/charla-escolar.jpg',
  './img/charla-comunidad-escolar.jpg',
  './img/inmovilizacion-paciente.jpg',
  './img/simulacro-escolar.jpg',
  './img/proteccion-sismo-aula.jpg',
  './img/rescate-sismo.jpg',
  './img/libro-pcad/pagina-001.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
  const requestUrl = new URL(url);

  // 1. IGNORAR COMPLETAMENTE Firebase Storage y Firestore
  if (url.includes('firebasestorage.googleapis.com') || url.includes('firestore.googleapis.com')) {
    return;
  }

  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // Consult the network first so published pages and assets replace stale cached versions.
  event.respondWith(
    fetch(new Request(event.request, { cache: 'no-cache' })).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone())));
      }
      return response;
    }).catch(async error => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;
      throw error;
    })
  );
});
