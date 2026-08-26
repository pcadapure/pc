self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. IGNORAR COMPLETAMENTE Firebase Storage y Firestore
  if (url.includes('firebasestorage.googleapis.com') || url.includes('firestore.googleapis.com')) {
    return; // Deja que el navegador maneje la petición de forma nativa sin pasar por el Service Worker
  }

  // 2. Manejo normal para los archivos locales de tu web
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});