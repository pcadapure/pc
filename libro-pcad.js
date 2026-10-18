document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('bookSearchInput');
  const searchStatus = document.getElementById('bookSearchStatus');
  const searchResults = document.getElementById('bookSearchResults');
  const pageImage = document.getElementById('bookPageImage');
  const pageImageLink = document.getElementById('bookPageImageLink');
  const pageText = document.getElementById('bookPageText');
  const pageStatus = document.getElementById('bookReaderStatus');
  const currentPageNumber = document.getElementById('currentPageNumber');
  const readerPageCount = document.getElementById('readerPageCount');
  const pageIndicator = document.getElementById('bookPageIndicator');
  const pageJumpForm = document.getElementById('pageJumpForm');
  const pageJumpInput = document.getElementById('pageJumpInput');
  const previousPageButton = document.getElementById('previousPageButton');
  const nextPageButton = document.getElementById('nextPageButton');
  const firstPageButton = document.getElementById('firstPageButton');
  const lastPageButton = document.getElementById('lastPageButton');
  const menuButton = document.getElementById('bookMenuButton');
  const navigation = document.getElementById('bookNavigation');
  const PRINTED_PAGE_COUNT = 109;
  let bookPages = [];
  let activePage = 1;

  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(error => {
      console.error('No se pudo registrar el service worker:', error);
    });
  }

  function normalizeText(value) {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  }

  function getPageFromHash() {
    const match = window.location.hash.match(/^#pagina=(\d+)$/);
    return match ? Number(match[1]) : 1;
  }

  function getPageLabel(page) {
    return page.page >= 3
      ? `Página ${page.page + 1} del libro (imagen ${page.page})`
      : `Imagen ${page.page}`;
  }

  function showPage(pageNumber, updateAddress = true) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > bookPages.length) return;

    activePage = pageNumber;
    const page = bookPages[pageNumber - 1];
    const printedPageNumber = page.page >= 3 ? page.page + 1 : null;
    pageImage.src = page.src;
    pageImage.alt = `${getPageLabel(page)} del Libro Azul PCAD`;
    pageImageLink.href = page.src;
    currentPageNumber.textContent = printedPageNumber
      ? `Página ${printedPageNumber} (imagen ${page.page})`
      : `Imagen ${page.page}`;
    readerPageCount.textContent = `${bookPages.length} imágenes · libro de ${PRINTED_PAGE_COUNT} páginas`;
    pageIndicator.textContent = printedPageNumber
      ? `Página ${printedPageNumber} del libro · imagen ${page.page} de ${bookPages.length}`
      : `Imagen ${page.page} de ${bookPages.length} · libro de ${PRINTED_PAGE_COUNT} páginas`;
    pageJumpInput.value = String(page.page);
    pageJumpInput.max = String(bookPages.length);
    pageText.textContent = page.text || 'No se pudo reconocer texto en esta página; puedes consultarla en la imagen.';
    pageStatus.textContent = '';
    previousPageButton.disabled = pageNumber === 1;
    firstPageButton.disabled = pageNumber === 1;
    nextPageButton.disabled = pageNumber === bookPages.length;
    lastPageButton.disabled = pageNumber === bookPages.length;

    if (updateAddress) {
      const hash = `#pagina=${page.page}`;
      if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
    }
  }

  function createSearchResult(page, queryTerms) {
    const button = document.createElement('button');
    button.className = 'book-search-result';
    button.type = 'button';
    button.setAttribute('aria-label', `Abrir ${getPageLabel(page)}`);

    const title = document.createElement('strong');
    title.textContent = getPageLabel(page);

    const excerpt = document.createElement('span');
    const lines = page.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const matchingLine = lines.find(line => {
      const normalizedLine = normalizeText(line);
      return queryTerms.some(term => normalizedLine.includes(term));
    });
    const preview = matchingLine || page.text.replace(/\s+/g, ' ').trim();
    excerpt.textContent = preview.length > 220 ? `${preview.slice(0, 217)}…` : preview;

    button.append(title, excerpt);
    button.addEventListener('click', () => showPage(page.page));
    return button;
  }

  function searchBook() {
    const query = normalizeText(searchInput.value).trim();
    const queryTerms = query.split(/\s+/).filter(Boolean);
    searchResults.replaceChildren();
    searchResults.hidden = queryTerms.length === 0;
    searchStatus.textContent = '';
    if (queryTerms.length === 0) return;

    const matches = bookPages.filter(page => {
      const pageText = normalizeText(page.text);
      return queryTerms.every(term => pageText.includes(term));
    });

    if (matches.length === 0) {
      searchStatus.textContent = `No se encontraron páginas para «${searchInput.value.trim()}».`;
      return;
    }

    const shownMatches = matches.slice(0, 20);
    shownMatches.forEach(page => searchResults.appendChild(createSearchResult(page, queryTerms)));
    searchStatus.textContent = matches.length > shownMatches.length
      ? `El tema aparece en ${matches.length} páginas. Se muestran las primeras ${shownMatches.length}.`
      : `El tema aparece en ${matches.length} ${matches.length === 1 ? 'página' : 'páginas'}.`;
  }

  searchInput.addEventListener('input', searchBook);
  pageJumpForm.addEventListener('submit', event => {
    event.preventDefault();
    const pageNumber = Number(pageJumpInput.value);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > bookPages.length) {
      pageStatus.textContent = `Escribe un número entre 1 y ${bookPages.length}.`;
      return;
    }
    showPage(pageNumber);
  });
  previousPageButton.addEventListener('click', () => showPage(activePage - 1));
  nextPageButton.addEventListener('click', () => showPage(activePage + 1));
  firstPageButton.addEventListener('click', () => showPage(1));
  lastPageButton.addEventListener('click', () => showPage(bookPages.length));
  pageImage.addEventListener('error', () => {
    pageStatus.textContent = 'No se pudo cargar la imagen de esta página. Comprueba tu conexión e inténtalo de nuevo.';
    console.error(`No se pudo cargar la página ${activePage} del Libro Azul PCAD.`);
  });
  window.addEventListener('hashchange', () => showPage(getPageFromHash(), false));

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isExpanded));
      menuButton.setAttribute('aria-label', isExpanded ? 'Abrir menú' : 'Cerrar menú');
      navigation.classList.toggle('active', !isExpanded);
    });
    navigation.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navigation.classList.remove('active');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  async function loadBook() {
    const response = await fetch('libro-pcad-pages.json');
    if (!response.ok) throw new Error(`No se pudo cargar el índice del libro (HTTP ${response.status}).`);

    const pages = await response.json();
    if (!Array.isArray(pages) || pages.length === 0 || pages.some((page, index) =>
      page.page !== index + 1 || typeof page.src !== 'string' || typeof page.text !== 'string'
    )) {
      throw new Error('El índice del libro está incompleto o tiene un formato incorrecto.');
    }

    bookPages = pages;
    document.getElementById('bookTotalPages').textContent = `${PRINTED_PAGE_COUNT} páginas impresas · ${pages.length} imágenes`;
    showPage(getPageFromHash());
  }

  loadBook().catch(error => {
    searchStatus.textContent = 'No se pudo cargar el libro. Recarga la página cuando tengas conexión.';
    pageStatus.textContent = error.message;
    console.error('Error al cargar el Libro Azul PCAD:', error);
  });
});
