(() => {
  const container = document.getElementById('homePopularContent');
  const storageKey = 'pcad-content-views';
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

  async function trackContentView(kind, contentId, title) {
    const db = window.db;
    if (!db) {
      console.error('No se pudo registrar la consulta: Firestore no está inicializado.');
      return;
    }
    if (!['articulo', 'publicacion'].includes(kind)) {
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
            views: snapshot.data().views + 1
          });
        } else {
          transaction.set(reference, {
            kind,
            title: safeTitle,
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

  function renderPopularItems(items) {
    if (!container) return;

    const heading = document.createElement('h3');
    heading.className = 'home-popular-title';
    heading.textContent = 'Lo más consultado hoy';

    const list = document.createElement('ol');
    list.className = 'home-popular-list';

    items.forEach((item, index) => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'home-popular-card';
      link.href = item.kind === 'articulo'
        ? `articulos.html#articulo/${encodeURIComponent(item.contentId)}`
        : `publicaciones.html?publicacion=${encodeURIComponent(item.contentId)}`;

      const rank = document.createElement('span');
      rank.className = 'home-popular-rank';
      rank.textContent = String(index + 1).padStart(2, '0');

      const copy = document.createElement('span');
      copy.className = 'home-popular-copy';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const count = document.createElement('span');
      count.textContent = `${new Intl.NumberFormat('es-VE').format(item.views)} consultas`;
      copy.append(title, count);
      link.append(rank, copy);
      listItem.append(link);
      list.append(listItem);
    });

    const privacyNote = document.createElement('p');
    privacyNote.className = 'home-popular-privacy';
    privacyNote.textContent = 'Conteo anónimo: una consulta por contenido y navegador al día.';
    container.replaceChildren(heading, list, privacyNote);
  }

  function loadPopularItems() {
    if (!container) return;
    const db = window.db;
    if (!db) {
      console.error('No se pudieron cargar las consultas más populares: Firestore no está inicializado.');
      showMessage('Las consultas más populares no están disponibles en este momento.');
      return;
    }

    db.collection('visitas_contenido_diarias')
      .doc(date)
      .collection('items')
      .orderBy('views', 'desc')
      .limit(8)
      .get()
      .then(snapshot => {
        const items = snapshot.docs
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
          .slice(0, 4);

        if (items.length) {
          renderPopularItems(items);
        } else {
          showMessage('Aún no hay consultas registradas hoy.');
        }
      })
      .catch(error => {
        console.error('No se pudieron cargar las consultas más populares:', error);
        showMessage('No se pudieron cargar las consultas más populares.');
      });
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

  document.addEventListener('DOMContentLoaded', () => {
    loadPopularItems();
    trackCurrentArticle();
  });
  window.addEventListener('hashchange', trackCurrentArticle);
})();
