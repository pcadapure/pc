document.addEventListener('DOMContentLoaded', () => {
  const sources = [...document.querySelectorAll('#articleSources .learning-article')];
  const listingView = document.getElementById('articleListingView');
  const detailView = document.getElementById('articleDetailView');
  const featuredContainer = document.getElementById('featuredArticle');
  const latestContainer = document.getElementById('latestArticles');
  const cardGrid = document.getElementById('articleCardGrid');
  const schoolTopicGrid = document.getElementById('schoolTopicGrid');
  const schoolPlanningGrid = document.getElementById('schoolPlanningGrid');
  const schoolQuickGrid = document.getElementById('schoolQuickGrid');
  const relatedContainer = document.getElementById('relatedArticles');
  const searchInput = document.getElementById('articleSearch');
  const detailSearchInput = document.getElementById('detailArticleSearch');
  const filterList = document.querySelector('#articleListingView .article-filter-list');
  const filterButtons = [...document.querySelectorAll('#articleListingView .article-filter')];
  const resultsCount = document.getElementById('articleResultsCount');
  const emptyState = document.getElementById('articleEmptyState');
  const titleElement = document.getElementById('articleDetailTitle');
  const categoryElement = document.getElementById('articleDetailCategory');
  const introElement = document.getElementById('articleDetailIntro');
  const guideBanner = document.getElementById('articleGuideBanner');
  const guideBannerCopy = document.getElementById('articleGuideBannerCopy');
  const guideTopic = document.getElementById('articleGuideTopic');
  const guideIcon = document.getElementById('articleGuideIcon');
  const contentElement = document.getElementById('articleDetailContent');

  if (
    sources.length === 0 || !listingView || !detailView || !featuredContainer ||
    !latestContainer || !cardGrid || !relatedContainer || !searchInput || !filterList ||
    !resultsCount || !emptyState || !titleElement || !categoryElement ||
    !introElement || !guideBanner || !guideBannerCopy || !guideTopic ||
    !guideIcon || !contentElement
  ) return;

  const categoryNames = {
    salud: 'Primeros auxilios',
    desastres: 'Gestión del riesgo',
    escolar: 'Organización escolar',
    preparacion: 'Preparación familiar',
    seguridad: 'Seguridad vial'
  };
  const categoryImages = window.articleCategoryImages;
  const categoryImageDescriptions = window.articleCategoryImageDescriptions;
  const articleImages = window.articleCardImages;
  const articleSupportingImages = {
    'senales-seguridad': [{
      src: 'img/senales-seguridad-rutas-evacuacion-detalle.jpg',
      alt: 'Ejemplos de señales de salida de emergencia, ruta de evacuación, punto de encuentro, extintor y uso obligatorio de equipo de protección.',
      caption: 'Ejemplos de señales de evacuación, punto de encuentro, equipos contra incendios, riesgo eléctrico y uso obligatorio de protección personal.'
    }],
    sismos: [{
      src: 'img/rescate-sismo.jpg',
      alt: 'Personal de respuesta trabaja en una zona afectada por un sismo.',
      caption: 'La búsqueda y el rescate en estructuras dañadas corresponden a equipos especializados; no ingreses en edificios afectados.'
    }]
  };
  const articleGuideSettings = {
    tsunamis: {
      topic: 'Tema 2',
      icon: 'fa-water',
      bannerDescription: 'Protocolo escolar de autoprotección ante maremotos y tsunamis.',
      phases: {
        antes: { label: 'Antes', title: 'Conoce tu zona y prepara la evacuación', icon: 'fa-map-location-dot' },
        durante: { label: 'Durante', title: 'Evacúa con rapidez y en orden a zonas altas', icon: 'fa-person-walking-arrow-right' },
        despues: { label: 'Después', title: 'Permanece a salvo y sigue las fuentes oficiales', icon: 'fa-tower-broadcast' }
      },
      keyPoints: [
        ['01', 'Señales naturales', 'Un sismo costero fuerte o cambios inusuales del mar pueden exigir evacuar de inmediato.'],
        ['02', 'Alerta oficial', 'Sigue las alarmas y las instrucciones de las autoridades locales.'],
        ['03', 'Evacúa a pie', 'Dirígete por una ruta segura a terreno alto o tierra adentro.'],
        ['04', 'No regreses', 'Espera la autorización oficial: pueden llegar varias olas durante horas.']
      ],
      alert: 'Ante un sismo costero fuerte o una alerta oficial, evacúa a pie hacia terreno alto. No esperes en la playa ni regreses hasta recibir autorización.'
    },
    inundaciones: {
      topic: 'Tema 3',
      icon: 'fa-cloud-showers-water',
      bannerDescription: 'Guía escolar de actuación ante lluvias intensas e inundaciones.',
      phases: {
        antes: { label: 'Antes', title: 'Limpia los desagües y prepara las rutas seguras', icon: 'fa-broom' },
        durante: { label: 'Durante', title: 'Activa el plan y evita cruzar el agua', icon: 'fa-house-flood-water' },
        despues: { label: 'Después', title: 'Regresa con precaución y evita la contaminación', icon: 'fa-helmet-safety' }
      },
      keyPoints: [
        ['01', 'Drenajes despejados', 'Mantén limpios desagües y bajantes con ayuda adulta y sin exponerte.'],
        ['02', 'Productos tóxicos', 'Guarda sustancias y materiales de laboratorio en un lugar alto, cerrado y seguro.'],
        ['03', 'Riesgo eléctrico', 'Aléjate de cables y equipos mojados; no restablezcas la electricidad sin revisión técnica.'],
        ['04', 'Limpieza segura', 'Usa botas y guantes y evita el contacto con agua de inundación y heridas.']
      ],
      alert: 'Nunca camines, nades ni conduzcas por agua de inundación. Sigue las rutas de evacuación y espera autorización oficial antes de regresar.'
    },
    incendios: {
      topic: 'Tema 4',
      icon: 'fa-fire',
      bannerDescription: 'Guía escolar de prevención y autoprotección ante incendios y exposición al humo.',
      phases: {
        antes: { label: 'Antes', title: 'Prevén incendios y mantén libres las salidas', icon: 'fa-plug-circle-check' },
        durante: { label: 'Durante', title: 'Evacúa sin demora y evita el humo', icon: 'fa-person-walking-arrow-right' },
        despues: { label: 'Después', title: 'Permanece en el punto seguro y no reingreses', icon: 'fa-people-group' }
      },
      keyPoints: [
        ['01', 'Instalación segura', 'No sobrecargues tomacorrientes y avisa a una persona adulta si ves cables dañados.'],
        ['02', 'Evacuación', 'Usa la ruta segura, las escaleras y el punto de encuentro; nunca uses ascensores.'],
        ['03', 'Humo', 'Mantente cerca del suelo y no cruces humo denso ni una puerta caliente.'],
        ['04', 'No reingreses', 'Espera autorización oficial e informa a los bomberos si alguien falta.']
      ],
      alert: 'Ante fuego o humo, activa el plan, evacúa y llama al 911 desde un lugar seguro. No intentes combatir un incendio ni rescatar a alguien si puedes quedar expuesto.'
    }
  };
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const articles = sources.map(source => ({
    id: source.id,
    category: source.dataset.category || 'salud',
    title: source.querySelector('.article-heading h2')?.textContent.trim() || '',
    excerpt: source.querySelector('.article-heading p')?.textContent.trim() || '',
    content: source.querySelector('.article-content'),
    searchText: normalize(source.textContent),
    image: articleImages[source.id]?.src || categoryImages[source.dataset.category] || categoryImages.salud,
    imageDescription: articleImages[source.id]?.alt || categoryImageDescriptions[source.dataset.category] || categoryImageDescriptions.salud,
    imageFallback: categoryImages[source.dataset.category] || categoryImages.salud,
    imageFallbackDescription: categoryImageDescriptions[source.dataset.category] || categoryImageDescriptions.salud
  }));
  const byId = new Map(articles.map(article => [article.id, article]));
  const categories = [...new Set(articles.map(article => article.category))]
    .sort((first, second) =>
      (categoryNames[first] || first).localeCompare(categoryNames[second] || second, 'es')
    );
  categories.forEach(category => {
    const button = document.createElement('button');
    button.className = 'article-filter';
    button.type = 'button';
    button.dataset.filter = category;
    button.setAttribute('aria-pressed', 'false');
    const label = categoryNames[category] || category.replace(/[-_]/g, ' ');
    const count = articles.filter(article => article.category === category).length;
    button.textContent = `${label} (${count})`;
    filterButtons.push(button);
    filterList.appendChild(button);
  });
  const categoryIcons = {
    salud: 'fa-kit-medical',
    desastres: 'fa-triangle-exclamation',
    escolar: 'fa-people-group',
    preparacion: 'fa-shield-heart',
    seguridad: 'fa-car-burst'
  };

  function createArticleGuideOptions(article) {
    const configuredGuide = articleGuideSettings[article.id];
    if (configuredGuide) return configuredGuide;

    const keyPoints = [];
    [...article.content.children].forEach(element => {
      if (element.matches('h3')) return;

      if (element.matches('ul, ol')) {
        [...element.querySelectorAll(':scope > li')].forEach(item => {
          if (keyPoints.length >= 4) return;
          const description = item.textContent.trim().replace(/\s+/g, ' ');
          keyPoints.push([
            String(keyPoints.length + 1).padStart(2, '0'),
            `Paso ${keyPoints.length + 1}`,
            description.length > 180 ? `${description.slice(0, 177).trimEnd()}…` : description
          ]);
        });
      }
    });

    if (keyPoints.length === 0) {
      const firstParagraph = article.content.querySelector('p');
      keyPoints.push([
        '01',
        'Orientación',
        firstParagraph?.textContent.trim() || article.excerpt
      ]);
    }

    return {
      topic: `Guía ${String(articles.indexOf(article) + 1).padStart(2, '0')}`,
      icon: categoryIcons[article.category] || 'fa-shield-halved',
      bannerDescription: article.excerpt,
      phases: {},
      keyPoints,
      alert: 'Ante una emergencia, llama al 911, sigue las instrucciones del operador y no te expongas al peligro.'
    };
  }

  function createImage(article, className) {
    const image = document.createElement('img');
    image.className = className;
    image.src = article.image;
    image.alt = article.imageDescription;
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      const fallbackUrl = new URL(article.imageFallback, window.location.href).href;
      if (image.src !== fallbackUrl) {
        image.src = article.imageFallback;
        image.alt = article.imageFallbackDescription;
      } else {
        image.hidden = true;
      }
    });
    return image;
  }

  function appendSupportingImages(article) {
    (articleSupportingImages[article.id] || []).forEach(supportingImage => {
      const figure = document.createElement('figure');
      figure.className = 'article-supporting-image';
      const image = document.createElement('img');
      image.src = supportingImage.src;
      image.alt = supportingImage.alt;
      image.loading = 'lazy';
      const caption = document.createElement('figcaption');
      caption.textContent = supportingImage.caption;
      figure.append(image, caption);
      contentElement.appendChild(figure);
    });
  }

  function createArticleLink(article, className, includeImage = true) {
    const link = document.createElement('a');
    link.className = className;
    link.href = `#articulo/${encodeURIComponent(article.id)}`;
    link.setAttribute('aria-label', `Leer artículo: ${article.title}`);

    if (includeImage) {
      const imageWrap = document.createElement('span');
      imageWrap.className = 'article-card-image';
      imageWrap.append(createImage(article, ''));
      link.appendChild(imageWrap);
    }

    const copy = document.createElement('span');
    copy.className = 'article-card-copy';
    const category = document.createElement('span');
    category.className = 'article-category-label';
    category.textContent = categoryNames[article.category] || 'Guía ciudadana';
    const heading = document.createElement('strong');
    heading.textContent = article.title;
    const excerpt = document.createElement('span');
    excerpt.className = 'article-card-excerpt';
    excerpt.textContent = article.excerpt;
    const readMore = document.createElement('span');
    readMore.className = 'article-card-read-more';
    readMore.innerHTML = 'Leer más <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
    copy.append(category, heading, excerpt, readMore);
    link.appendChild(copy);
    return link;
  }

  function renderArticleGroup(container, articleIds, className) {
    if (!container) return;
    articleIds.forEach(id => {
      const article = byId.get(id);
      if (article) container.appendChild(createArticleLink(article, className));
    });
  }

  function renderListing() {
    const featured = articles[0];
    featuredContainer.replaceChildren(createArticleLink(featured, 'article-feature-card'));

    articles.slice(1, 5).forEach(article => {
      latestContainer.appendChild(createArticleLink(article, 'article-latest-link', true));
    });

    articles.slice(5).forEach(article => {
      cardGrid.appendChild(createArticleLink(article, 'article-grid-card', true));
    });

    renderArticleGroup(schoolTopicGrid, [
      'sismos',
      'tsunamis',
      'inundaciones',
      'incendios',
      'deslizamientos',
      'riesgos-quimicos'
    ], 'school-topic-card');
    renderArticleGroup(schoolPlanningGrid, [
      'brigadas-escolares',
      'plan-riesgos-escolar',
      'evacuacion-simulacros',
      'senales-seguridad'
    ], 'school-planning-card');
    renderArticleGroup(schoolQuickGrid, [
      'numeros-emergencia',
      'mochila-escolar',
      'primeros-pasos-emergencia'
    ], 'school-quick-card');

    renderRelated(null);
    updateListing();
  }

  function shuffleArticleCards() {
    const cards = [...cardGrid.children];
    for (let index = cards.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
    }
    cardGrid.append(...cards);
  }

  function currentQuery() {
    return normalize(searchInput.value.trim() || detailSearchInput?.value.trim() || '');
  }

  function updateListing() {
    const query = currentQuery();
    const activeFilter = filterButtons.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'todos';
    const matchingArticles = articles.filter(article =>
      (activeFilter === 'todos' || article.category === activeFilter) &&
      (!query || article.searchText.includes(query))
    );
    const matchingIds = new Set(matchingArticles.map(article => article.id));

    document.querySelectorAll(
      '.article-feature-card, .article-latest-link, .article-grid-card, .school-topic-card, .school-planning-card, .school-quick-card'
    ).forEach(card => {
      card.hidden = !matchingIds.has(decodeURIComponent(card.hash.split('/')[1] || ''));
    });

    resultsCount.textContent = `${matchingArticles.length} ${matchingArticles.length === 1 ? 'artículo disponible' : 'artículos disponibles'}`;
    emptyState.hidden = matchingArticles.length !== 0;
  }

  function renderRelated(currentArticle) {
    relatedContainer.replaceChildren();
    const related = articles.filter(article => article.id !== currentArticle?.id);
    const prioritized = currentArticle
      ? [
          ...related.filter(article => article.category === currentArticle.category),
          ...related.filter(article => article.category !== currentArticle.category)
        ]
      : related;
    prioritized.slice(0, 5)
      .forEach(article => relatedContainer.appendChild(createArticleLink(article, 'article-related-link', false)));
  }

  function renderArticleGuide(article, options) {
    const guide = document.createElement('div');
    guide.className = 'article-guide-content';

    const phases = document.createElement('div');
    phases.className = 'article-guide-phases';
    let currentPhase = null;
    let sectionNumber = 0;

    [...article.content.children].forEach(element => {
      if (element.matches('h3')) {
        const headingText = element.textContent.trim();
        const phase = options.phases[normalize(headingText)] || {
          label: `Sección ${sectionNumber + 1}`,
          title: headingText,
          icon: options.icon
        };
        sectionNumber += 1;
        currentPhase = document.createElement('section');
        currentPhase.className = 'article-guide-phase';

        const heading = document.createElement('header');
        heading.className = 'article-guide-phase-heading';
        const number = document.createElement('span');
        number.className = 'article-guide-phase-number';
        number.textContent = String(sectionNumber);
        const icon = document.createElement('i');
        icon.className = `fa-solid ${phase.icon}`;
        icon.setAttribute('aria-hidden', 'true');
        const headingCopy = document.createElement('span');
        const label = document.createElement('span');
        label.className = 'article-guide-phase-label';
        label.textContent = phase.label;
        const title = document.createElement('h3');
        title.textContent = phase.title;
        headingCopy.append(label, title);
        heading.append(number, icon, headingCopy);
        currentPhase.appendChild(heading);
        phases.appendChild(currentPhase);
        return;
      }

      if (!currentPhase) {
        sectionNumber += 1;
        currentPhase = document.createElement('section');
        currentPhase.className = 'article-guide-phase';
        const heading = document.createElement('header');
        heading.className = 'article-guide-phase-heading';
        const number = document.createElement('span');
        number.className = 'article-guide-phase-number';
        number.textContent = String(sectionNumber);
        const icon = document.createElement('i');
        icon.className = `fa-solid ${options.icon}`;
        icon.setAttribute('aria-hidden', 'true');
        const headingCopy = document.createElement('span');
        const label = document.createElement('span');
        label.className = 'article-guide-phase-label';
        label.textContent = 'Acciones recomendadas';
        const title = document.createElement('h3');
        title.textContent = 'Pasos de actuación';
        headingCopy.append(label, title);
        heading.append(number, icon, headingCopy);
        currentPhase.appendChild(heading);
        phases.appendChild(currentPhase);
      }
      currentPhase.appendChild(element.cloneNode(true));
    });

    const keySection = document.createElement('section');
    keySection.className = 'article-guide-key-section';
    const keyHeading = document.createElement('div');
    keyHeading.className = 'article-guide-key-heading';
    const keyKicker = document.createElement('span');
    keyKicker.textContent = 'Recuerda';
    const keyTitle = document.createElement('h3');
    keyTitle.textContent = 'Puntos clave';
    keyHeading.append(keyKicker, keyTitle);

    const keyGrid = document.createElement('div');
    keyGrid.className = 'article-guide-key-grid';
    options.keyPoints.forEach(([number, title, description]) => {
      const card = document.createElement('article');
      card.className = 'article-guide-key-card';
      const cardHeading = document.createElement('div');
      const cardNumber = document.createElement('span');
      cardNumber.textContent = number;
      const cardTitle = document.createElement('h4');
      cardTitle.textContent = title;
      cardHeading.append(cardNumber, cardTitle);
      const copy = document.createElement('p');
      copy.textContent = description;
      card.append(cardHeading, copy);
      keyGrid.appendChild(card);
    });

    const alert = document.createElement('div');
    alert.className = 'article-guide-alert';
    alert.setAttribute('role', 'note');
    const alertIcon = document.createElement('i');
    alertIcon.className = 'fa-solid fa-triangle-exclamation';
    alertIcon.setAttribute('aria-hidden', 'true');
    const alertText = document.createElement('p');
    alertText.textContent = options.alert;
    alert.append(alertIcon, alertText);

    keySection.append(keyHeading, keyGrid);
    guide.append(phases, keySection, alert);
    return guide;
  }

  function showArticle(article) {
    if (!article) return false;
    const guideOptions = createArticleGuideOptions(article);
    listingView.hidden = true;
    detailView.hidden = false;
    detailView.classList.add('article-guide-page');
    document.body.classList.add('article-guide-page-active');
    titleElement.textContent = article.title;
    categoryElement.textContent = categoryNames[article.category] || 'Guía ciudadana';
    guideBanner.hidden = false;
    guideTopic.textContent = guideOptions.topic;
    guideIcon.className = `fa-solid ${guideOptions.icon}`;
    introElement.textContent = guideOptions.bannerDescription;
    guideBannerCopy.append(titleElement, introElement);
    guideBanner.style.setProperty('--article-guide-banner-image', `url("${article.image}")`);
    contentElement.replaceChildren(renderArticleGuide(article, guideOptions));
    appendSupportingImages(article);
    renderRelated(article);
    document.title = `${article.title} | Protección Civil ZOEDAN Apure`;
    window.scrollTo(0, 0);
    return true;
  }

  function showListing() {
    shuffleArticleCards();
    detailView.hidden = true;
    listingView.hidden = false;
    document.body.classList.remove('article-guide-page-active');
    document.title = 'Artículos y guías | Protección Civil ZOEDAN Apure';
  }

  function renderFromHash() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const articleId = hash.startsWith('articulo/')
      ? hash.slice('articulo/'.length)
      : byId.has(hash) ? hash : '';

    if (articleId && showArticle(byId.get(articleId))) return;
    showListing();
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(filterButton => {
        filterButton.setAttribute('aria-pressed', String(filterButton === button));
      });
      if (detailSearchInput) detailSearchInput.value = '';
      searchInput.value = '';
      updateListing();
    });
  });

  document.getElementById('articleSearchForm')?.addEventListener('submit', event => {
    event.preventDefault();
    updateListing();
    document.getElementById('articulos-temas')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('detailSearchForm')?.addEventListener('submit', event => {
    event.preventDefault();
    searchInput.value = detailSearchInput?.value || '';
    filterButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === 'todos'));
    });
    window.location.hash = 'articulos-temas';
    renderFromHash();
    updateListing();
    document.getElementById('articulos-temas')?.scrollIntoView({ behavior: 'smooth' });
  });

  searchInput.addEventListener('input', updateListing);
  detailSearchInput?.addEventListener('input', () => {
    searchInput.value = detailSearchInput.value;
  });
  window.addEventListener('hashchange', renderFromHash);

  renderListing();
  renderFromHash();
});
