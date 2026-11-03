document.addEventListener('DOMContentLoaded', () => {
  const map = document.getElementById('apureMapMunicipalities');
  const search = document.getElementById('apureMunicipalitySearch');
  const list = document.getElementById('apureMunicipalityList');
  const detail = document.getElementById('apureMapDetail');
  const reset = document.getElementById('apureMapReset');

  if (!map || !search || !list || !detail || !reset) return;

  const municipalityDetails = {
    achaguas: { name: 'Achaguas', capital: 'Achaguas' },
    biruaca: { name: 'Biruaca', capital: 'Biruaca' },
    'muñoz': { name: 'Muñoz', capital: 'Bruzual' },
    'páez': { name: 'Páez', capital: 'Guasdualito' },
    'pedro-camejo': { name: 'Pedro Camejo', capital: 'San Juan de Payara' },
    'romulo-gallegos': { name: 'Rómulo Gallegos', capital: 'Elorza' },
    'san-fernando': { name: 'San Fernando', capital: 'San Fernando de Apure' }
  };

  const shapes = [...map.querySelectorAll('[data-municipality]')];
  const options = [...list.querySelectorAll('[data-municipality]')];

  function normalized(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  }

  function clearSelection() {
    [...shapes, ...options].forEach(element => {
      element.classList.remove('is-selected');
      if (element.matches('button')) element.setAttribute('aria-pressed', 'false');
    });
  }

  function selectMunicipality(id) {
    const municipality = municipalityDetails[id];
    if (!municipality) return;

    clearSelection();
    shapes.find(shape => shape.dataset.municipality === id)?.classList.add('is-selected');
    const option = options.find(button => button.dataset.municipality === id);
    option?.classList.add('is-selected');
    option?.setAttribute('aria-pressed', 'true');

    detail.innerHTML = `
      <span class="apure-detail-kicker"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Municipio de Apure</span>
      <h3>${municipality.name}</h3>
      <p><strong>Capital municipal:</strong> ${municipality.capital}</p>
      <p>ZOEDAN Apure trabaja en el ámbito del estado. Para información ciudadana sobre prevención y gestión de riesgos, consulta la guía correspondiente.</p>
      <a class="apure-detail-link" href="gestion-riesgo.html">Ver guía de gestión de riesgo <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>`;
  }

  function filterMunicipalities() {
    const query = normalized(search.value.trim());
    options.forEach(option => {
      const matches = normalized(option.textContent).includes(query);
      option.hidden = !matches;
      option.setAttribute('aria-hidden', String(!matches));
    });
    shapes.forEach(shape => {
      const matches = normalized(municipalityDetails[shape.dataset.municipality]?.name || '').includes(query);
      shape.classList.toggle('is-filtered', Boolean(query) && !matches);
    });
  }

  shapes.forEach(shape => {
    shape.addEventListener('click', () => selectMunicipality(shape.dataset.municipality));
    shape.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      selectMunicipality(shape.dataset.municipality);
    });
  });

  options.forEach(option => {
    option.addEventListener('click', () => selectMunicipality(option.dataset.municipality));
  });

  search.addEventListener('input', filterMunicipalities);
  reset.addEventListener('click', () => {
    search.value = '';
    filterMunicipalities();
    clearSelection();
    detail.innerHTML = `
      <span class="apure-detail-kicker"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Estado Apure</span>
      <h3>Selecciona tu municipio</h3>
      <p>El mapa te ayuda a ubicar los municipios donde trabaja ZOEDAN Apure. Selecciona un área o usa el buscador.</p>`;
    search.focus();
  });
});