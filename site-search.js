(() => {
  const SEARCH_PAGES = [
    'index.html',
    'educacion.html',
    'gestion-riesgo.html',
    'prehospitalario.html',
    'operaciones.html',
    'direccion.html',
    'rrhh.html',
    'quienes-somos.html',
    'servicios.html',
    'contacto.html',
    'publicaciones.html',
    'libro-pcad.html'
  ];
  const PAGE_CONTENT_SELECTOR = 'main';
  const SEARCH_STOP_WORDS = new Set([
    'a', 'al', 'algo', 'como', 'con', 'cual', 'cuando', 'de', 'del', 'donde',
    'el', 'ella', 'ellas', 'ellos', 'en', 'es', 'esa', 'ese', 'eso', 'esta',
    'este', 'esto', 'la', 'las', 'lo', 'los', 'me', 'mi', 'mis', 'para', 'por',
    'que', 'se', 'su', 'sus', 'un', 'una', 'unas', 'uno', 'unos', 'y'
  ]);
  let indexPromise;

  const normalize = value => (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();

  const slugify = value => normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'seccion';

  function ensureHeadingIds(root) {
    const used = new Set([...root.querySelectorAll('[id]')].map(element => element.id));
    const counts = new Map();

    root.querySelectorAll('main h1, main h2, main h3, main h4').forEach(heading => {
      if (heading.id) return;
      const base = `site-search-${slugify(heading.textContent)}`;
      let count = counts.get(base) || 0;
      let id = count ? `${base}-${count + 1}` : base;
      while (used.has(id)) {
        count += 1;
        id = `${base}-${count + 1}`;
      }
      counts.set(base, count + 1);
      used.add(id);
      heading.id = id;
    });
  }

  function getPageEntries(path, parsedDocument) {
    const main = parsedDocument.querySelector(PAGE_CONTENT_SELECTOR);
    if (!main) return [];

    main.querySelectorAll('script, style, nav, form, [hidden], [aria-hidden="true"]').forEach(element => element.remove());
    ensureHeadingIds(parsedDocument);

    const documentTitle = parsedDocument.title.trim();
    const pageTitle = parsedDocument.querySelector('h1')?.textContent.trim()
      || documentTitle
      || path;
    const description = parsedDocument.querySelector('meta[name="description"]')?.content.trim() || '';
    const entries = [];
    const mainText = main.textContent.replace(/\s+/g, ' ').trim();
    const overviewText = [documentTitle, description, mainText].filter(Boolean).join(' ');
    if (overviewText) {
      entries.push({
        title: pageTitle,
        text: overviewText,
        href: path,
        kind: 'overview'
      });
    }

    main.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
      const block = heading.closest('article, section') || heading.parentElement;
      const text = (block?.textContent || heading.textContent).replace(/\s+/g, ' ').trim();
      if (text) {
        entries.push({
          title: heading.textContent.trim(),
          text,
          href: `${path}#${encodeURIComponent(heading.id)}`,
          kind: 'section'
        });
      }
    });
    return entries;
  }

  async function fetchPageEntries(path) {
    const response = await fetch(path, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`No se pudo consultar ${path} (HTTP ${response.status}).`);
    const html = await response.text();
    const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
    return getPageEntries(path, parsedDocument);
  }

  async function fetchBookEntries() {
    const response = await fetch('libro-pcad-pages.json', { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`No se pudo consultar el índice del Libro Azul (HTTP ${response.status}).`);
    const pages = await response.json();
    if (!Array.isArray(pages)) throw new Error('El índice del Libro Azul tiene un formato inesperado.');

    return pages.map(page => {
      const pageLabel = page.page >= 3
        ? `página impresa ${page.page + 1} (imagen ${page.page})`
        : `imagen ${page.page}`;
      return {
        title: `Libro Azul PCAD · ${pageLabel}`,
        text: page.text || '',
        href: `libro-pcad.html#pagina=${page.page}`,
        kind: 'book'
      };
    });
  }

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = Promise.all([
        ...SEARCH_PAGES.map(fetchPageEntries),
        fetchBookEntries()
      ]).then(groups => groups.flat()).catch(error => {
        indexPromise = null;
        throw error;
      });
    }
    return indexPromise;
  }

  function makeSnippet(entry, terms) {
    const text = entry.text.replace(/\s+/g, ' ').trim();
    const normalizedText = normalize(text);
    const position = Math.min(...terms.map(term => {
      const index = normalizedText.indexOf(term);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    }));
    if (position === Number.MAX_SAFE_INTEGER) return text.slice(0, 170);
    const start = Math.max(0, position - 65);
    const end = Math.min(text.length, start + 190);
    return `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
  }

  function scoreEntry(entry, terms) {
    const title = normalize(entry.title);
    const text = normalize(entry.text);
    if (!terms.every(term => title.includes(term) || text.includes(term))) return -1;
    const entryText = `${title} ${text}`;
    const score = terms.reduce((total, term) => {
      if (title.includes(term)) total += 5;
      if (text.includes(term)) total += 1;
      return total;
    }, entry.kind === 'overview' ? -2 : 0);
    return score + (entryText.includes(terms.join(' ')) ? 4 : 0);
  }

  function createResult(entry, snippet) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'site-search-result-link';
    link.href = entry.href;

    const title = document.createElement('strong');
    title.textContent = entry.title;
    const excerpt = document.createElement('span');
    excerpt.textContent = snippet;
    link.append(title, excerpt);
    item.appendChild(link);
    return item;
  }

  function initialize() {
    const navLinks = document.getElementById('navLinks') || document.querySelector('.nav-links');
    document.querySelectorAll('.navbar, .simple-header').forEach(header => {
      if (header.previousElementSibling?.classList.contains('site-header-spacer')) return;

      const spacer = document.createElement('div');
      spacer.className = 'site-header-spacer';
      header.before(spacer);
      const updateSpacer = () => {
        spacer.style.height = `${header.getBoundingClientRect().height}px`;
      };
      updateSpacer();
      if ('ResizeObserver' in window) {
        new ResizeObserver(updateSpacer).observe(header);
      } else {
        window.addEventListener('resize', updateSpacer);
      }
    });

    const styleSheet = document.createElement('link');
    styleSheet.rel = 'stylesheet';
    styleSheet.href = 'site-search.css';
    document.head.appendChild(styleSheet);

    if (navLinks && !navLinks.querySelector('.site-search-nav-item')) {
      const item = document.createElement('li');
      item.className = 'site-search-nav-item';
      item.innerHTML = '<button class="site-search-trigger" type="button" aria-haspopup="dialog" aria-controls="siteSearchDialog"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Buscar</span></button>';
      const homeItem = navLinks.querySelector(':scope > li > a[href="index.html"], :scope > li > a[href="#inicio"]')?.closest('li');
      if (homeItem) homeItem.after(item);
      else navLinks.prepend(item);
    }

    const overlay = document.createElement('div');
    overlay.className = 'site-search-overlay';
    overlay.id = 'siteSearchDialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'siteSearchTitle');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="site-search-panel">
        <header class="site-search-header">
          <div>
            <p>Protección Civil ZOEDAN Apure</p>
            <h2 id="siteSearchTitle">Buscar en el sitio</h2>
          </div>
          <button class="site-search-close" type="button" aria-label="Cerrar buscador">&times;</button>
        </header>
        <form class="site-search-form" role="search">
          <label class="site-search-label" for="siteSearchInput">¿Qué información necesitas?</label>
          <div class="site-search-input-wrap">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input id="siteSearchInput" type="search" autocomplete="off" placeholder="Ej.: primeros auxilios, gestión de riesgo, bradipnea">
            <button type="submit">Buscar</button>
          </div>
          <p class="site-search-hint">Busca en las páginas públicas y en las 109 páginas impresas del Libro Azul PCAD (108 imágenes digitalizadas).</p>
        </form>
        <p class="site-search-status" role="status" aria-live="polite"></p>
        <ol class="site-search-results" aria-label="Resultados de búsqueda"></ol>
      </section>`;
    document.body.appendChild(overlay);

    const trigger = document.querySelector('.site-search-trigger');
    const closeButton = overlay.querySelector('.site-search-close');
    const form = overlay.querySelector('.site-search-form');
    const input = overlay.querySelector('#siteSearchInput');
    const status = overlay.querySelector('.site-search-status');
    const results = overlay.querySelector('.site-search-results');

    const closeSearch = (restoreFocus = true) => {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('site-search-open');
      if (restoreFocus) trigger?.focus();
    };

    const openSearch = () => {
      navLinks?.classList.remove('active');
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('site-search-open');
      window.setTimeout(() => input.focus(), 20);
    };

    trigger?.addEventListener('click', openSearch);
    closeButton.addEventListener('click', closeSearch);
    results.addEventListener('click', event => {
      if (event.target.closest('.site-search-result-link')) closeSearch(false);
    });
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeSearch();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('is-open')) closeSearch();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const queryTerms = normalize(input.value).split(/[^a-z0-9]+/).filter(Boolean);
      const meaningfulTerms = queryTerms.filter(term => !SEARCH_STOP_WORDS.has(term));
      const terms = meaningfulTerms.length ? meaningfulTerms : queryTerms;
      results.replaceChildren();
      if (!terms.length) {
        status.textContent = 'Escribe una palabra o tema para comenzar.';
        return;
      }

      status.textContent = 'Buscando en las páginas del sitio y en el Libro Azul…';
      try {
        const entries = await loadIndex();
        const matches = entries
          .map(entry => ({ entry, score: scoreEntry(entry, terms) }))
          .filter(match => match.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12);

        if (!matches.length) {
          status.textContent = 'No encontramos coincidencias. Prueba con otras palabras o revisa la ortografía.';
          return;
        }

        matches.forEach(({ entry }) => results.appendChild(createResult(entry, makeSnippet(entry, terms))));
        status.textContent = `${matches.length} resultado${matches.length === 1 ? '' : 's'} encontrado${matches.length === 1 ? '' : 's'}.`;
      } catch (error) {
        console.error('Error al buscar información del sitio:', error);
        status.textContent = 'No se pudo cargar el índice de búsqueda. Comprueba tu conexión e inténtalo de nuevo.';
      }
    });

    ensureHeadingIds(document);
    if (window.location.hash.startsWith('#site-search-')) {
      window.requestAnimationFrame(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
