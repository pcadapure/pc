(() => {
  const container = document.getElementById('homePopularContent');
  const storageKey = 'pcad-content-views';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyAelCoep_iWnJXmIoKig8HNPkolhg9s3hw',
    authDomain: 'pagina-de-proteccion-civil.firebaseapp.com',
    projectId: 'pagina-de-proteccion-civil',
    storageBucket: 'pagina-de-proteccion-civil.firebasestorage.app',
    messagingSenderId: '281045838889',
    appId: '1:281045838889:web:aa5dfa923fed6b58e3c038',
    measurementId: 'G-0NGSMQQQR9'
  };
  const dateParts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const date = `${dateParts.find(part => part.type === 'year').value}-${dateParts.find(part => part.type === 'month').value}-${dateParts.find(part => part.type === 'day').value}`;
  const pendingViews = new Set();
  let viewedContent = new Set();

  try {
    const savedViews = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (savedViews.date === date && Array.isArray(savedViews.items)) {
      viewedContent = new Set(savedViews.items.filter(item => typeof item === 'string'));
    }
  } catch (error) {
    console.error('No se pudo leer el registro diario local de consultas:', error);
  }

  function getDatabase() {
    if (window.db?.collection) return window.db;
    if (!window.firebase?.apps || typeof window.firebase.firestore !== 'function') {
      throw new Error('El SDK de Firestore no está disponible.');
    }
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    window.db = window.firebase.firestore();
    return window.db;
  }

  async function trackContentView(kind, contentId, title) {
    if (!['pagina', 'articulo', 'publicacion'].includes(kind)) {
      console.error('No se pudo registrar la consulta: tipo de contenido no válido.');
      return;
    }
    if (typeof contentId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(contentId)) {
      console.error('No se pudo registrar la consulta: identificador de contenido no válido.');
      return;
    }

    const documentId = `${kind}--${contentId}`;
    if (viewedContent.has(documentId) || pendingViews.has(documentId)) return;
    pendingViews.add(documentId);

    try {
      const db = getDatabase();
      const reference = db.collection('visitas_contenido_diarias')
        .doc(date)
        .collection('items')
        .doc(documentId);
      const safeTitle = String(title || 'Contenido de Protección Civil')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);

      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists) {
          transaction.update(reference, {
            date,
            views: snapshot.data().views + 1
          });
        } else {
          transaction.set(reference, {
            kind,
            title: safeTitle,
            date,
            views: 1
          });
        }
      });

      viewedContent.add(documentId);
      localStorage.setItem(storageKey, JSON.stringify({
        date,
        items: [...viewedContent]
      }));
    } catch (error) {
      console.error('No se pudo registrar la consulta del contenido:', error);
    } finally {
      pendingViews.delete(documentId);
    }
  }

  window.trackContentView = trackContentView;

  function showMessage(message) {
    if (!container) return;
    const status = document.createElement('p');
    status.className = 'home-popular-status';
    status.setAttribute('role', 'status');
    status.textContent = message;
    container.replaceChildren(status);
  }

  let popularItems = [];
  let activePopularIndex = 0;

  function renderPopularItems(items) {
    if (!container) return;

    const heading = document.createElement('h3');
    heading.className = 'home-popular-title';
    heading.textContent = 'Más consultado hoy';

    const list = document.createElement('ol');
    list.className = 'home-popular-list';
    items.forEach((item, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'home-popular-slide';

      const link = document.createElement('a');
      link.className = 'home-popular-card';
      link.href = item.kind === 'articulo'
        ? `articulos.html#articulo/${encodeURIComponent(item.contentId)}`
        : `publicaciones.html?publicacion=${encodeURIComponent(item.contentId)}`;

      const cardHeading = document.createElement('span');
      cardHeading.className = 'home-popular-card-heading';

      const rank = document.createElement('span');
      rank.className = 'home-popular-rank';
      rank.textContent = String(index + 1).padStart(2, '0');

      const kindIcon = document.createElement('i');
      kindIcon.className = `home-popular-icon fa-solid ${item.kind === 'articulo' ? 'fa-book-medical' : 'fa-newspaper'}`;
      kindIcon.setAttribute('aria-hidden', 'true');
      cardHeading.append(rank, kindIcon);

      const kindLabel = document.createElement('span');
      kindLabel.className = 'home-popular-kind';
      kindLabel.textContent = item.kind === 'articulo' ? 'Artículo' : 'Publicación';

      const title = document.createElement('strong');
      title.className = 'home-popular-item-title';
      title.textContent = item.title;

      const count = document.createElement('span');
      count.className = 'home-popular-count';
      count.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
      const countText = document.createElement('span');
      countText.textContent = `${new Intl.NumberFormat('es-VE').format(item.views)} vistas hoy`;
      count.append(countText);

      link.append(cardHeading, kindLabel, title, count);
      listItem.append(link);
      list.append(listItem);
    });

    const carousel = document.createElement('div');
    carousel.className = 'home-popular-carousel';

    const previousButton = document.createElement('button');
    previousButton.className = 'home-popular-arrow';
    previousButton.type = 'button';
    previousButton.setAttribute('aria-label', 'Ver contenido más consultado anterior');
    previousButton.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
    previousButton.disabled = items.length < 2;

    const position = document.createElement('span');
    position.className = 'home-popular-position';
    position.setAttribute('aria-live', 'polite');
    position.textContent = `${activePopularIndex + 1} de ${items.length}`;

    const nextButton = document.createElement('button');
    nextButton.className = 'home-popular-arrow';
    nextButton.type = 'button';
    nextButton.setAttribute('aria-label', 'Ver siguiente contenido más consultado');
    nextButton.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
    nextButton.disabled = items.length < 2;
    carousel.append(previousButton, list, nextButton);

    const controls = document.createElement('div');
    controls.className = 'home-popular-controls';
    controls.append(position);

    const privacyNote = document.createElement('p');
    privacyNote.className = 'home-popular-privacy';
    privacyNote.textContent = 'Vistas de hoy; se cuenta una consulta por contenido y navegador al día.';
    container.replaceChildren(heading, carousel, controls, privacyNote);

    const getVisibleCards = () => window.matchMedia('(max-width: 640px)').matches
      ? 1
      : window.matchMedia('(max-width: 900px)').matches ? 2 : 3;
    const getSlideLeft = slide => slide.offsetLeft - list.offsetLeft;
    const updatePosition = () => {
      const slides = [...list.children];
      const firstVisible = slides.reduce((closestIndex, slide, index) => (
        Math.abs(getSlideLeft(slide) - list.scrollLeft) <
          Math.abs(getSlideLeft(slides[closestIndex]) - list.scrollLeft)
          ? index
          : closestIndex
      ), 0);
      activePopularIndex = firstVisible;
      position.textContent = `${firstVisible + 1} de ${items.length}`;
    };
    const goToRelativeSlide = direction => {
      const targetIndex = (activePopularIndex + direction * getVisibleCards() + items.length) % items.length;
      list.scrollTo({ left: getSlideLeft(list.children[targetIndex]), behavior: 'smooth' });
    };
    previousButton.addEventListener('click', () => goToRelativeSlide(-1));
    nextButton.addEventListener('click', () => goToRelativeSlide(1));
    list.addEventListener('scroll', updatePosition, { passive: true });
    list.scrollLeft = list.children[activePopularIndex]
      ? getSlideLeft(list.children[activePopularIndex])
      : 0;
    updatePosition();
  }

  function loadPopularItems() {
    if (!container) return;
    try {
      getDatabase()
        .collection('visitas_contenido_diarias')
        .doc(date)
        .collection('items')
        .orderBy('views', 'desc')
        .onSnapshot(snapshot => {
          popularItems = snapshot.docs
            .map(document => {
              const data = document.data();
              const separatorIndex = document.id.indexOf('--');
              const kind = document.id.slice(0, separatorIndex);
              const contentId = document.id.slice(separatorIndex + 2);
              if (
                separatorIndex < 1 ||
                !['articulo', 'publicacion'].includes(kind) ||
                data.kind !== kind ||
                typeof data.title !== 'string' ||
                !Number.isInteger(data.views) ||
                data.views < 1 ||
                !/^[A-Za-z0-9_-]{1,120}$/.test(contentId)
              ) return null;

              return { kind, contentId, title: data.title, views: data.views };
            })
            .filter(Boolean)
            .sort((first, second) => second.views - first.views)
            .slice(0, 8);

          if (!popularItems.length) {
            activePopularIndex = 0;
            showMessage('Aún no hay consultas registradas hoy.');
            return;
          }

          activePopularIndex = Math.max(0, Math.min(activePopularIndex, popularItems.length - 1));
          renderPopularItems(popularItems);
        }, error => {
          console.error('No se pudieron cargar las consultas más populares:', error);
          showMessage(error?.code === 'permission-denied'
            ? 'Firestore no permite leer las consultas. Publica las reglas actualizadas de firestore.rules.'
            : 'No se pudieron cargar las consultas más populares.');
        });
    } catch (error) {
      console.error('No se pudieron cargar las consultas más populares:', error);
      showMessage(error?.code === 'permission-denied'
        ? 'Firestore no permite leer las consultas. Publica las reglas actualizadas de firestore.rules.'
        : 'No se pudieron cargar las consultas más populares.');
    }
  }

  function trackCurrentArticle() {
    if (!window.location.pathname.toLowerCase().endsWith('/articulos.html')) return;
    const match = window.location.hash.match(/^#articulo\/([^/?#]+)/);
    if (!match) return;

    let contentId;
    try {
      contentId = decodeURIComponent(match[1]);
    } catch (error) {
      console.error('No se pudo interpretar el identificador del artículo:', error);
      return;
    }

    const source = document.getElementById(contentId);
    const title = source?.querySelector('.article-heading h2')?.textContent.trim();
    if (title) trackContentView('articulo', contentId, title);
  }

  function trackCurrentPage() {
    const pageId = window.location.pathname
      .split('/')
      .pop()
      .replace(/\.html$/i, '')
      .toLowerCase() || 'index';
    const title = document.title.trim() || pageId;
    trackContentView('pagina', pageId, title);
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadPopularItems();
    trackCurrentPage();
    trackCurrentArticle();
  });
  window.addEventListener('hashchange', trackCurrentArticle);
})();
