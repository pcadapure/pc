const CACHE_NAME = 'pcad-apure-v100';
const OFFLINE_CACHE_NAME = 'pcad-apure-offline-v1';
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
const OFFLINE_CONTENT = [
  './index.html',
  './articulos.html',
  './articulos.js',
  './article-images.js',
  './gestion-riesgo.html',
  './educacion.html',
  './prehospitalario.html',
  './operaciones.html',
  './home-articles.js',
  './site-search.js',
  './site-search.css',
  './styles.css',
  './script.js',
  './sw.js',
  './manifest.webmanifest',
  './img/pc logo.png',
  './img/taller-primeros-auxilios.jpg',
  './img/heridas-hemorragias.jpg',
  './img/rcp-atragantamiento.jpg',
  './img/inmovilizacion-paciente.jpg',
  './img/quemaduras-orientacion.jpg',
  './img/mordeduras-serpientes-picaduras.jpg',
  './img/calor-deshidratacion.jpg',
  './img/proteccion-sismo-aula.jpg',
  './img/tsunami-ruta-evacuacion.jpg',
  './img/inundaciones-crecida-rio.jpg',
  './img/numeros-emergencia-911.jpg',
  './img/deslizamientos-senales-alerta.jpg',
  './img/riesgos-quimicos-derrame.jpg',
  './img/incendios-vivienda-humo.jpg',
  './img/brigadas-comites-escolares.jpg',
  './img/charla-comunidad-escolar.jpg',
  './img/simulacro-escolar.jpg',
  './img/senales-seguridad-rutas-evacuacion.jpg',
  './img/senales-seguridad-rutas-evacuacion-detalle.jpg',
  './img/emergencia-escolar-primeros-pasos.jpg',
  './img/mochila-recursos-escolares.jpg',
  './img/plan-familiar-mochila-emergencia.jpg',
  './img/accidente-transito-pas.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_OFFLINE_CONTENT') {
    const responsePort = event.ports[0];
    event.waitUntil((async () => {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const results = await Promise.allSettled(OFFLINE_CONTENT.map(async path => {
        const url = new URL(path, self.registration.scope);
        const response = await fetch(new Request(url.href, { cache: 'reload' }));
        if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
        await cache.put(url.href, response);
      }));
      const cached = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - cached;
      if (cached === 0) {
        throw new Error('No se pudo descargar ningún recurso. Comprueba tu conexión e inténtalo de nuevo.');
      }
      responsePort?.postMessage({ success: true, cached, failed });
    })().catch(error => {
      console.error('No se pudo preparar el contenido sin conexión:', error);
      responsePort?.postMessage({ success: false, error: error.message });
    }));
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith('pcad-apure-v') && key !== CACHE_NAME).map(key => caches.delete(key))
      )),
      (async () => {
        if (!(await caches.has(OFFLINE_CACHE_NAME))) return;
        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const results = await Promise.allSettled(OFFLINE_CONTENT.map(async path => {
          const url = new URL(path, self.registration.scope);
          try {
            const response = await fetch(new Request(url.href, { cache: 'no-cache' }));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await cache.put(url.href, response);
          } catch (error) {
            if (!(await cache.match(url.href))) throw error;
            console.warn(`Se conserva la copia sin conexión de ${path}:`, error);
          }
        }));
        const failed = results.filter(result => result.status === 'rejected');
        if (failed.length) {
          console.error(`${failed.length} recursos sin conexión no se pudieron actualizar.`);
        }
      })()
    ])
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
