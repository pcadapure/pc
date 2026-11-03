document.addEventListener('DOMContentLoaded', () => {
  const articleGrid = document.getElementById('homeRandomArticles');
  const pauseButton = document.getElementById('homeArticlesPause');
  const nextButton = document.getElementById('homeArticlesNext');
  if (!articleGrid || !pauseButton || !nextButton) return;

  const categoryIcons = {
    salud: 'fa-kit-medical',
    desastres: 'fa-triangle-exclamation',
    escolar: 'fa-people-group',
    preparacion: 'fa-shield-heart',
    seguridad: 'fa-car-burst'
  };
  const articlesPage = new URL('articulos.html', window.location.href);
  const batchSize = 3;
  let articles = [];
  let remainingArticles = [];
  let rotationTimer = null;
  let rotationPaused = false;

  function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  function nextBatch() {
    const batch = [];
    const size = Math.min(batchSize, articles.length);

    while (batch.length < size) {
      if (remainingArticles.length === 0) {
        remainingArticles = shuffle(
          articles.filter(article => !batch.some(selected => selected.id === article.id))
        );
      }
      batch.push(remainingArticles.shift());
    }

    return batch;
  }

  function createCard(article) {
    const link = document.createElement('a');
    link.className = 'home-random-article-card';
    link.href = `${articlesPage.pathname}#articulo/${encodeURIComponent(article.id)}`;

    const image = document.createElement('img');
    image.className = 'home-random-article-image';
    image.src = article.image;
    image.alt = article.imageAlt;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      const fallbackUrl = new URL(article.imageFallback, window.location.href).href;
      if (image.src !== fallbackUrl) {
        image.src = article.imageFallback;
        image.alt = article.imageFallbackAlt;
      } else {
        image.hidden = true;
      }
    });

    const copy = document.createElement('div');
    copy.className = 'home-random-article-copy';

    const category = document.createElement('span');
    category.className = 'home-random-article-category';
    const icon = document.createElement('i');
    icon.className = `fa-solid ${categoryIcons[article.category] || 'fa-book-open'}`;
    icon.setAttribute('aria-hidden', 'true');
    category.append(icon, document.createTextNode(article.categoryName));

    const title = document.createElement('h3');
    title.textContent = article.title;

    const excerpt = document.createElement('p');
    excerpt.textContent = article.excerpt;

    const readMore = document.createElement('span');
    readMore.className = 'home-random-article-link';
    const arrow = document.createElement('i');
    arrow.className = 'fa-solid fa-arrow-right';
    arrow.setAttribute('aria-hidden', 'true');
    readMore.append(document.createTextNode('Leer artículo'), arrow);

    copy.append(category, title, excerpt, readMore);
    link.append(image, copy);
    return link;
  }

  function renderBatch() {
    articleGrid.replaceChildren(...nextBatch().map(createCard));
  }

  function stopRotation() {
    window.clearInterval(rotationTimer);
    rotationTimer = null;
  }

  function startRotation() {
    stopRotation();
    if (!rotationPaused && document.visibilityState !== 'hidden') {
      rotationTimer = window.setInterval(renderBatch, 10000);
    }
  }

  function updatePauseButton() {
    pauseButton.setAttribute('aria-pressed', String(rotationPaused));
    const icon = pauseButton.querySelector('i');
    const label = pauseButton.querySelector('span');
    icon.className = `fa-solid ${rotationPaused ? 'fa-play' : 'fa-pause'}`;
    label.textContent = rotationPaused ? 'Reanudar' : 'Pausar';
  }

  function showLoadError(error) {
    console.error('No se pudieron cargar los artículos destacados.', error);
    const message = document.createElement('p');
    message.className = 'home-articles-status';
    message.setAttribute('role', 'status');
    message.append(
      document.createTextNode('No se pudieron cargar los artículos en este momento. '),
      Object.assign(document.createElement('a'), {
        href: articlesPage.pathname,
        textContent: 'Consulta la biblioteca completa.'
      })
    );
    articleGrid.replaceChildren(message);
  }

  pauseButton.addEventListener('click', () => {
    rotationPaused = !rotationPaused;
    updatePauseButton();
    startRotation();
  });

  nextButton.addEventListener('click', () => {
    renderBatch();
    startRotation();
  });

  document.addEventListener('visibilitychange', startRotation);

  fetch(articlesPage.href)
    .then(response => {
      if (!response.ok) {
        throw new Error(`La biblioteca respondió con el estado ${response.status}.`);
      }
      return response.text();
    })
    .then(html => {
      const documentFromArticles = new DOMParser().parseFromString(html, 'text/html');
      articles = [...documentFromArticles.querySelectorAll('#articleSources .learning-article')]
        .map(source => ({
          id: source.id,
          category: source.dataset.category || '',
          categoryName: source.querySelector('.article-category-label')?.textContent.trim() || 'Guía ciudadana',
          title: source.querySelector('.article-heading h2')?.textContent.trim() || '',
          excerpt: source.querySelector('.article-heading p')?.textContent.trim() || '',
          image: window.articleCardImages[source.id]?.src || window.articleCategoryImages[source.dataset.category] || window.articleCategoryImages.salud,
          imageAlt: window.articleCardImages[source.id]?.alt || window.articleCategoryImageDescriptions[source.dataset.category] || window.articleCategoryImageDescriptions.salud,
          imageFallback: window.articleCategoryImages[source.dataset.category] || window.articleCategoryImages.salud,
          imageFallbackAlt: window.articleCategoryImageDescriptions[source.dataset.category] || window.articleCategoryImageDescriptions.salud
        }))
        .filter(article => article.id && article.title);

      if (articles.length === 0) {
        throw new Error('La biblioteca no contiene artículos disponibles.');
      }

      remainingArticles = shuffle(articles);
      renderBatch();
      pauseButton.disabled = false;
      nextButton.disabled = false;
      startRotation();
    })
    .catch(showLoadError);
});
