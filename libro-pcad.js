document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('bookSearchInput');
  const searchClear = document.getElementById('bookSearchClear');
  const searchStatus = document.getElementById('bookSearchStatus');
  const searchResults = document.getElementById('bookSearchResults');
  const pageImage = document.getElementById('bookPageImage');
  const pageImageLink = document.getElementById('bookPageImageLink');
  const imageViewer = document.getElementById('bookImageViewer');
  const imageViewerImage = document.getElementById('bookImageViewerImage');
  const imageViewerTitle = document.getElementById('bookImageViewerTitle');
  const imageViewerBack = document.getElementById('bookImageViewerBack');
  const imageViewerPrevious = document.getElementById('bookImageViewerPrevious');
  const imageViewerNext = document.getElementById('bookImageViewerNext');
  const imageViewerIndicator = document.getElementById('bookImageViewerIndicator');
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
  let indexedPages = [];
  let activePage = 1;
  let previousFocus = null;

  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(error => {
      console.error('No se pudo registrar el service worker:', error);
    });
  }

  function normalizeText(value) {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function cleanRecognizedText(value) {
    const lines = String(value).split(/\r?\n/);
    const headerCategories = line => {
      const words = normalizeText(line).split(' ').filter(Boolean);
      const matches = {
        protection: words.some(word => /^(?:protec|phote|piote|paotec)/.test(word)),
        civil: words.some(word => /^(?:civil|civ|ovil|cml|crac)$/.test(word) || (/^(?:protec|phote|piote|paotec)/.test(word) && /civil$/.test(word))),
        administration: words.some(word => /^(?:administr|admin|adm|aom|aomn|avini|adwn|ministr|lln|lnlstr|nstrac)/.test(word)),
        disasters: words.some(word => /^(?:desast|oesast|oasast|eesast|cesast)/.test(word))
      };
      return { words, count: Object.values(matches).filter(Boolean).length, matches };
    };
    let headerLineCount = 0;
    for (let index = 0; index < Math.min(lines.length, 4); index += 1) {
      const line = lines[index].trim();
      if (!line) {
        if (headerLineCount > 0) headerLineCount += 1;
        continue;
      }
      const { words, count, matches } = headerCategories(line);
      const isStandaloneHeader = count > 0 &&
        (count > 1 ||
          words.length <= 2 ||
          (matches.disasters && words.length <= 4 && words.some(word => /^(?:lln|lnlstr|nstrac)/.test(word))));
      const isHeaderContinuation = headerLineCount > 0 && count > 0 && words.length <= 4;
      const isCorruptedHeaderStart = index === 0 &&
        words.length <= 3 &&
        words.some(word => /^p[a-z]{5,}$/.test(word)) &&
        lines[index + 1] &&
        headerCategories(lines[index + 1]).matches.disasters;
      const isPageNumberBeforeHeader = index === 0 &&
        /^\d{1,3}$/.test(line) &&
        lines.slice(index + 1, index + 3).some(nextLine => {
          const nextHeader = headerCategories(nextLine);
          return nextHeader.count > 1 || (nextHeader.count > 0 && nextHeader.words.length <= 2);
        });
      if (isPageNumberBeforeHeader || isStandaloneHeader || isHeaderContinuation || isCorruptedHeaderStart) {
        headerLineCount += 1;
        continue;
      }
      break;
    }

    return lines.slice(headerLineCount).join('\n')
      .replace(/-\s*\r?\n\s*/g, '')
      .replace(/\bcorno\b/gi, match => match[0] === match[0].toUpperCase() ? 'Como' : 'como')
      .replace(/\b[Ii]as?\b/g, match => match[0] === match[0].toUpperCase()
        ? (match.length === 3 ? 'Las' : 'La')
        : (match.length === 3 ? 'las' : 'la'))
      .replace(/\b0(?=\s+(?:lesiones|deterioro|sustancia|provocados|reactiva|superior|antr[oó]pico|antr[oó]picas|momento))\b/gi, 'o')
      .replace(/\bfacililador(a)?\b/gi, (match, suffix = '') =>
        `${match[0] === match[0].toUpperCase() ? 'F' : 'f'}acilitador${suffix}`)
      .replace(/\bantr[oó]picasy\b/gi, match =>
        `${match.slice(0, -1)} y`)
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
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
    if (!imageViewer.hidden) {
      imageViewerImage.src = page.src;
      imageViewerImage.alt = pageImage.alt;
      imageViewerTitle.textContent = currentPageNumber.textContent;
      imageViewerIndicator.textContent = pageIndicator.textContent;
      imageViewerPrevious.disabled = pageNumber === 1;
      imageViewerNext.disabled = pageNumber === bookPages.length;
    }
    pageJumpInput.value = String(page.page);
    pageJumpInput.max = String(bookPages.length);
    pageText.textContent = cleanRecognizedText(page.text) || 'No se pudo reconocer texto en esta página; puedes consultarla en la imagen.';
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
    const cleanText = cleanRecognizedText(page.text);
    const lines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const matchingLine = lines.find(line => {
      const normalizedLine = normalizeText(line);
      return queryTerms.some(term => normalizedLine.includes(term));
    });
    const preview = matchingLine || cleanText.replace(/\s+/g, ' ').trim();
    excerpt.textContent = preview.length > 220 ? `${preview.slice(0, 217)}…` : preview;

    button.append(title, excerpt);
    button.addEventListener('click', () => {
      showPage(page.page);
      document.querySelector('.book-reader-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return button;
  }

  function searchBook() {
    const query = normalizeText(searchInput.value).trim();
    const queryTerms = query.split(/\s+/).filter(Boolean);
    searchClear.hidden = query.length === 0;
    searchResults.replaceChildren();
    searchResults.hidden = queryTerms.length === 0;
    searchStatus.textContent = '';
    if (queryTerms.length === 0) return;

    const phrase = queryTerms.join(' ');
    const rankedMatches = indexedPages.map(({ page, text }) => {
      const matchedTerms = queryTerms.filter(term => text.includes(term)).length;
      const phraseMatch = text.includes(phrase);
      return { page, matchedTerms, phraseMatch };
    }).filter(result => result.matchedTerms > 0)
      .sort((a, b) =>
        Number(b.phraseMatch) - Number(a.phraseMatch) ||
        b.matchedTerms - a.matchedTerms ||
        a.page.page - b.page.page);

    if (rankedMatches.length === 0) {
      searchStatus.textContent = `No se encontraron páginas para «${searchInput.value.trim()}».`;
      return;
    }

    const shownMatches = rankedMatches.slice(0, 20);
    shownMatches.forEach(({ page }) => searchResults.appendChild(createSearchResult(page, queryTerms)));
    searchStatus.textContent = rankedMatches.length > shownMatches.length
      ? `Encontramos ${rankedMatches.length} páginas. Se muestran las 20 coincidencias más relevantes.`
      : `Encontramos ${rankedMatches.length} ${rankedMatches.length === 1 ? 'página' : 'páginas'}; las coincidencias más relevantes aparecen primero.`;
  }

  searchInput.addEventListener('input', searchBook);
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchBook();
    searchInput.focus();
  });
  pageImageLink.addEventListener('click', event => {
    event.preventDefault();
    previousFocus = pageImageLink;
    imageViewerImage.src = pageImage.src;
    imageViewerImage.alt = pageImage.alt;
    imageViewerTitle.textContent = currentPageNumber.textContent;
    imageViewerIndicator.textContent = pageIndicator.textContent;
    imageViewerPrevious.disabled = activePage === 1;
    imageViewerNext.disabled = activePage === bookPages.length;
    imageViewer.hidden = false;
    imageViewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('book-image-viewer-open');
    imageViewerBack.focus();
  });
  function closeImageViewer() {
    if (imageViewer.hidden) return;
    imageViewer.hidden = true;
    imageViewer.setAttribute('aria-hidden', 'true');
    imageViewerImage.removeAttribute('src');
    document.body.classList.remove('book-image-viewer-open');
    if (previousFocus) previousFocus.focus();
  }
  imageViewerPrevious.addEventListener('click', () => showPage(activePage - 1));
  imageViewerNext.addEventListener('click', () => showPage(activePage + 1));
  imageViewerBack.addEventListener('click', closeImageViewer);
  imageViewer.addEventListener('click', event => {
    if (event.target === imageViewer) closeImageViewer();
  });
  document.addEventListener('keydown', event => {
    if (!imageViewer.hidden && event.key === 'ArrowLeft') {
      showPage(activePage - 1);
      return;
    }
    if (!imageViewer.hidden && event.key === 'ArrowRight') {
      showPage(activePage + 1);
      return;
    }
    if (event.key === 'Escape') closeImageViewer();
  });
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
    indexedPages = pages.map(page => ({
      page,
      text: normalizeText(cleanRecognizedText(page.text))
    }));
    document.getElementById('bookTotalPages').textContent = `${PRINTED_PAGE_COUNT} páginas impresas · ${pages.length} imágenes`;
    showPage(getPageFromHash());
  }

  loadBook().catch(error => {
    searchStatus.textContent = 'No se pudo cargar el libro. Recarga la página cuando tengas conexión.';
    pageStatus.textContent = error.message;
    console.error('Error al cargar el Libro Azul PCAD:', error);
  });
});
