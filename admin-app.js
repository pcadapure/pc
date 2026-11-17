// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAelCoep_iWnJXmIoKig8HNPkolhg9s3hw",
  authDomain: "pagina-de-proteccion-civil.firebaseapp.com",
  projectId: "pagina-de-proteccion-civil",
  storageBucket: "pagina-de-proteccion-civil.firebasestorage.app",
  messagingSenderId: "281045838889",
  appId: "1:281045838889:web:aa5dfa923fed6b58e3c038",
  measurementId: "G-0NGSMQQQR9"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
window.db = db;
const supabaseClient = window.supabase.createClient(
  'https://spsktxmwsrmkaanqqcud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwc2t0eG13c3Jta2FhbnFxY3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Njk3ODMsImV4cCI6MjEwMzM0NTc4M30.cRW2fWRsDuuph82Al1s1aso2y01Ug53iVnfaZ8q8eCc'
);

const adminLogin = document.getElementById('adminLogin');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginButton = document.getElementById('adminLoginButton');
const adminLoginError = document.getElementById('adminLoginError');
const adminLogout = document.getElementById('adminLogout');
const adminAuth = firebase.auth();

function showLoginError(message) {
  adminLoginError.textContent = message;
  adminLoginError.hidden = false;
}

if (adminLoginForm) adminLoginForm.addEventListener('submit', async event => {
  event.preventDefault();
  adminLoginError.hidden = true;
  adminLoginButton.disabled = true;
  adminLoginButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
  try {
    await adminAuth.signInWithEmailAndPassword(
      document.getElementById('adminEmail').value.trim(),
      document.getElementById('adminPassword').value
    );
  } catch (error) {
    showLoginError('Correo o contraseña incorrectos.');
    adminLoginButton.disabled = false;
    adminLoginButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión';
  }
});

if (adminLogout) adminLogout.addEventListener('click', () => adminAuth.signOut());

adminAuth.onAuthStateChanged(user => {
  document.body.classList.toggle('admin-authenticated', Boolean(user));
  if (user && adminLoginError) adminLoginError.hidden = true;
});

const adminMenuToggle = document.getElementById('adminMenuToggle');
const adminNavigation = document.getElementById('adminNavigation');

if (adminMenuToggle && adminNavigation) {
  adminMenuToggle.addEventListener('click', () => {
    const isOpen = adminNavigation.classList.toggle('mobile-open');
    adminMenuToggle.setAttribute('aria-expanded', String(isOpen));
    adminMenuToggle.setAttribute('aria-label', isOpen ? 'Cerrar navegación' : 'Abrir navegación');
  });

  adminNavigation.addEventListener('click', event => {
    if (event.target.closest('.btn-tab')) {
      adminNavigation.classList.remove('mobile-open');
      adminMenuToggle.setAttribute('aria-expanded', 'false');
      adminMenuToggle.setAttribute('aria-label', 'Abrir navegación');
    }
  });
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function formatFirestoreDate(timestamp) {
  if (!timestamp) return 'Reciente';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Reciente' : date.toLocaleString();
}

function getSafeMapLink(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'maps.google.com' ? url.href : '';
  } catch {
    return '';
  }
}

function getWhatsAppNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `58${digits.slice(1)}` : digits;
}

// ------------------------------------
// CONTROL DE PESTAÑAS (CORREGIDO)
// ------------------------------------
window.showTab = function(tabId, element) {
  // Ocultar todas las pestañas
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Desactivar todos los botones de la barra lateral
  document.querySelectorAll('.sidebar nav button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar la pestaña seleccionada
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Activar el botón presionado
  if (element) {
    element.classList.add('active');
  }

  if (tabId === 'analytics-tab') loadAnalytics();
};

const analyticsPeriod = document.getElementById('analyticsPeriod');
const analyticsDate = document.getElementById('analyticsDate');
const analyticsChart = document.getElementById('analyticsChart');
const analyticsStatus = document.getElementById('analyticsStatus');
const analyticsTopContent = document.getElementById('analyticsTopContent');
const analyticsRecords = [];
let analyticsLoaded = false;
let analyticsRequest = null;
let selectedAnalyticsDate = null;

function getCaracasDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}-${parts.find(part => part.type === 'day').value}`;
}

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getAnalyticsBuckets(period, today) {
  const todayDate = new Date(`${today}T00:00:00Z`);
  if (period === 'weekly') {
    const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
    const currentMonday = shiftDateKey(today, -mondayOffset);
    return Array.from({ length: 4 }, (_, index) => {
      const start = shiftDateKey(currentMonday, (index - 3) * 7);
      return { start, end: shiftDateKey(start, 6), label: new Date(`${start}T00:00:00Z`).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) };
    });
  }

  if (period === 'monthly') {
    const currentMonth = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1));
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + index - 11, 1));
      const start = date.toISOString().slice(0, 10);
      const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      return { start, end, label: date.toLocaleDateString('es-VE', { month: 'short', year: '2-digit', timeZone: 'UTC' }) };
    });
  }

  if (period === 'annual') {
    return Array.from({ length: 5 }, (_, index) => {
      const year = todayDate.getUTCFullYear() - 4 + index;
      return { start: `${year}-01-01`, end: `${year}-12-31`, label: String(year) };
    });
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(today, index - 6);
    return { start: date, end: date, label: new Date(`${date}T00:00:00Z`).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) };
  });
}

function getAnalyticsTotal(start, end) {
  return analyticsRecords.reduce((total, record) => (
    record.date >= start && record.date <= end ? total + record.views : total
  ), 0);
}

function renderAnalyticsTable() {
  if (!analyticsTopContent) return;
  const rankedContent = new Map();
  const records = selectedAnalyticsDate
    ? analyticsRecords.filter(record => record.date === selectedAnalyticsDate)
    : analyticsRecords;
  records.forEach(record => {
    const key = `${record.kind}--${record.contentId}`;
    const existing = rankedContent.get(key);
    if (existing) {
      existing.views += record.views;
    } else {
      rankedContent.set(key, { ...record });
    }
  });

  const rows = [...rankedContent.values()]
    .sort((first, second) => second.views - first.views || first.title.localeCompare(second.title, 'es'))
    .slice(0, 20)
    .map((record, index) => {
      const row = document.createElement('tr');
      const rank = document.createElement('td');
      rank.textContent = String(index + 1);
      const title = document.createElement('td');
      title.textContent = record.title;
      const kind = document.createElement('td');
      kind.textContent = ({ pagina: 'Página', articulo: 'Artículo', publicacion: 'Publicación' })[record.kind];
      const views = document.createElement('td');
      views.textContent = new Intl.NumberFormat('es-VE').format(record.views);
      row.append(rank, title, kind, views);
      return row;
    });

  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = selectedAnalyticsDate
      ? 'No se registraron vistas para el día seleccionado.'
      : 'Todavía no hay vistas registradas en este período.';
    row.append(cell);
    rows.push(row);
  }
  analyticsTopContent.replaceChildren(...rows);
}

function drawAnalyticsChart() {
  if (!analyticsChart || !analyticsPeriod) return;
  const today = getCaracasDateKey();
  const period = analyticsPeriod.value;
  const buckets = selectedAnalyticsDate
    ? [{
      start: selectedAnalyticsDate,
      end: selectedAnalyticsDate,
      label: new Date(`${selectedAnalyticsDate}T00:00:00Z`).toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      })
    }]
    : getAnalyticsBuckets(period, today);
  const values = buckets.map(bucket => getAnalyticsTotal(bucket.start, bucket.end));
  const chartTitles = {
    daily: 'Vistas por día · últimos 7 días',
    weekly: 'Vistas por semana · últimas 4 semanas',
    monthly: 'Vistas por mes · últimos 12 meses',
    annual: 'Vistas por año · últimos 5 años'
  };
  const visibleChartTitle = selectedAnalyticsDate
    ? `Vistas del ${buckets[0].label}`
    : chartTitles[period];
  const title = document.getElementById('analyticsChartTitle');
  if (title) title.textContent = visibleChartTitle;
  analyticsChart.setAttribute('aria-label', `${visibleChartTitle}. ${values.map((value, index) => `${buckets[index].label}: ${value} vistas`).join('; ')}`);

  const width = analyticsChart.clientWidth;
  if (!width) return;
  const height = 270;
  const scale = window.devicePixelRatio || 1;
  analyticsChart.width = Math.floor(width * scale);
  analyticsChart.height = Math.floor(height * scale);
  const context = analyticsChart.getContext('2d');
  if (!context) return;
  context.scale(scale, scale);
  context.clearRect(0, 0, width, height);

  const padding = { top: 18, right: 12, bottom: 42, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...values);
  context.font = '12px Inter, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.strokeStyle = '#e5ebf2';
  context.fillStyle = '#64748b';
  for (let line = 0; line <= 4; line += 1) {
    const y = padding.top + (chartHeight * line) / 4;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillText(
      new Intl.NumberFormat('es-VE', { notation: maxValue > 9999 ? 'compact' : 'standard', maximumFractionDigits: 1 })
        .format(Math.round(maxValue * (4 - line) / 4)),
      padding.left - 8,
      y
    );
  }

  const slotWidth = chartWidth / buckets.length;
  const barWidth = Math.min(42, slotWidth * 0.62);
  context.textAlign = 'center';
  context.textBaseline = 'top';
  buckets.forEach((bucket, index) => {
    const barHeight = (values[index] / maxValue) * (chartHeight - 8);
    const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
    const y = padding.top + chartHeight - barHeight;
    context.fillStyle = '#1671e8';
    context.beginPath();
    context.roundRect(x, y, barWidth, Math.max(0, barHeight), [5, 5, 0, 0]);
    context.fill();
    context.fillStyle = '#64748b';
    context.font = `${period === 'annual' ? 11 : 10}px Inter, sans-serif`;
    context.fillText(bucket.label, x + barWidth / 2, height - padding.bottom + 12);
  });
}

function renderAnalytics() {
  const today = getCaracasDateKey();
  const todayYearStart = `${today.slice(0, 4)}-01-01`;
  const totalToday = getAnalyticsTotal(today, today);
  const totalWeek = getAnalyticsTotal(shiftDateKey(today, -6), today);
  const totalMonth = getAnalyticsTotal(shiftDateKey(today, -29), today);
  const totalYear = getAnalyticsTotal(todayYearStart, today);
  [
    ['analyticsTodayTotal', totalToday],
    ['analyticsWeekTotal', totalWeek],
    ['analyticsMonthTotal', totalMonth],
    ['analyticsYearTotal', totalYear]
  ].forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = new Intl.NumberFormat('es-VE').format(value);
  });
  const selectedDayTotal = document.getElementById('analyticsSelectedDayTotal');
  if (selectedDayTotal) {
    selectedDayTotal.textContent = selectedAnalyticsDate
      ? new Intl.NumberFormat('es-VE').format(getAnalyticsTotal(selectedAnalyticsDate, selectedAnalyticsDate))
      : '—';
  }
  const rankingTitle = document.getElementById('analyticsRankingTitle');
  const rankingDescription = document.getElementById('analyticsRankingDescription');
  if (rankingTitle) rankingTitle.textContent = selectedAnalyticsDate ? 'Más visto ese día' : 'Contenido más visto';
  if (rankingDescription) {
    rankingDescription.textContent = selectedAnalyticsDate
      ? new Date(`${selectedAnalyticsDate}T00:00:00Z`).toLocaleDateString('es-VE', { dateStyle: 'long', timeZone: 'UTC' })
      : 'Ordenado de mayor a menor';
  }
  if (analyticsStatus) {
    analyticsStatus.textContent = selectedAnalyticsDate
      ? `El ${new Date(`${selectedAnalyticsDate}T00:00:00Z`).toLocaleDateString('es-VE', { dateStyle: 'long', timeZone: 'UTC' })} se registraron ${new Intl.NumberFormat('es-VE').format(getAnalyticsTotal(selectedAnalyticsDate, selectedAnalyticsDate))} vistas.`
      : 'Rango: últimos cinco años. El conteo es anónimo y limitado a una vista por contenido, navegador y día; los datos comienzan a acumularse desde que se activa el registro.';
  }
  renderAnalyticsTable();
  drawAnalyticsChart();
}

function loadAnalytics(forceRefresh = false) {
  if (!analyticsStatus) return;
  if (forceRefresh) analyticsLoaded = false;
  if (analyticsLoaded || analyticsRequest) return analyticsRequest;

  const today = getCaracasDateKey();
  if (analyticsDate) analyticsDate.max = today;
  const start = `${Number(today.slice(0, 4)) - 4}-01-01`;
  analyticsStatus.textContent = 'Cargando visitas de los últimos cinco años...';
  analyticsRequest = db.collectionGroup('items')
    .where('date', '>=', start)
    .where('date', '<=', today)
    .get()
    .then(snapshot => {
      analyticsRecords.splice(0, analyticsRecords.length, ...snapshot.docs
        .map(document => {
          const data = document.data();
          const separatorIndex = document.id.indexOf('--');
          const kind = document.id.slice(0, separatorIndex);
          const contentId = document.id.slice(separatorIndex + 2);
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
            separatorIndex < 1 ||
            !['pagina', 'articulo', 'publicacion'].includes(kind) ||
            data.kind !== kind ||
            typeof data.title !== 'string' ||
            !Number.isInteger(data.views) ||
            data.views < 1
          ) return null;
          return { date: data.date, kind, contentId, title: data.title, views: data.views };
        })
        .filter(Boolean));
      analyticsLoaded = true;
      renderAnalytics();
    })
    .catch(error => {
      console.error('No se pudieron cargar las estadísticas de visitas:', error);
      analyticsStatus.textContent = error.code === 'permission-denied'
        ? `Firestore denegó la consulta. Confirma que las reglas incluyan match /{path=**}/items/{itemId} con lectura para isAdmin() y que hayas iniciado sesión como ${adminAuth.currentUser?.email || 'el administrador'}.`
        : `No se pudieron cargar las estadísticas (${error.code || 'error'}). ${error.message || 'Comprueba la conexión e inténtalo de nuevo.'}`;
    })
    .finally(() => {
      analyticsRequest = null;
    });
  return analyticsRequest;
}

async function loadSelectedAnalyticsDate(date) {
  if (!analyticsStatus) return;
  analyticsStatus.textContent = `Buscando las vistas del ${new Date(`${date}T00:00:00Z`).toLocaleDateString('es-VE', { dateStyle: 'long', timeZone: 'UTC' })}...`;
  try {
    const snapshot = await db.collection('visitas_contenido_diarias')
      .doc(date)
      .collection('items')
      .get();
    const selectedDayRecords = snapshot.docs
      .map(document => {
        const data = document.data();
        const separatorIndex = document.id.indexOf('--');
        const kind = document.id.slice(0, separatorIndex);
        const contentId = document.id.slice(separatorIndex + 2);
        if (
          separatorIndex < 1 ||
          !['pagina', 'articulo', 'publicacion'].includes(kind) ||
          data.kind !== kind ||
          typeof data.title !== 'string' ||
          !Number.isInteger(data.views) ||
          data.views < 1 ||
          !/^[A-Za-z0-9_-]{1,120}$/.test(contentId)
        ) return null;
        return { date, kind, contentId, title: data.title, views: data.views };
      })
      .filter(Boolean);

    for (let index = analyticsRecords.length - 1; index >= 0; index -= 1) {
      if (analyticsRecords[index].date === date) analyticsRecords.splice(index, 1);
    }
    analyticsRecords.push(...selectedDayRecords);
    renderAnalytics();
  } catch (error) {
    console.error('No se pudieron cargar las visitas del día seleccionado:', error);
    analyticsStatus.textContent = `No se pudieron consultar las vistas de ese día (${error.code || 'error'}). ${error.message || 'Comprueba la conexión e inténtalo de nuevo.'}`;
  }
}

analyticsPeriod?.addEventListener('change', drawAnalyticsChart);
document.getElementById('analyticsDateForm')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!analyticsDate?.value) return;
  const today = getCaracasDateKey();
  if (analyticsDate.value > today) {
    analyticsDate.setCustomValidity('Selecciona hoy o una fecha anterior.');
    analyticsDate.reportValidity();
    return;
  }
  analyticsDate.setCustomValidity('');
  selectedAnalyticsDate = analyticsDate.value;
  loadSelectedAnalyticsDate(selectedAnalyticsDate);
});
analyticsDate?.addEventListener('input', () => analyticsDate.setCustomValidity(''));
document.getElementById('analyticsDateReset')?.addEventListener('click', () => {
  selectedAnalyticsDate = null;
  if (analyticsDate) analyticsDate.value = '';
  if (analyticsLoaded) renderAnalytics();
  else loadAnalytics();
});
document.getElementById('analyticsRefresh')?.addEventListener('click', () => loadAnalytics(true));
window.addEventListener('resize', drawAnalyticsChart);

window.showPublicationManager = function(type, element) {
  document.querySelectorAll('.publication-management-block').forEach(block => {
    block.classList.toggle('active', block.id === `manage-${type}`);
  });
  document.querySelectorAll('.manager-tab').forEach(tab => {
    const isActive = tab === element;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
};

// ------------------------------------
// ELIMINACIÓN GENERAL (GLOBAL)
// ------------------------------------
window.deleteDoc = async function(collectionName, docId) {
  if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
    try {
      const documentReference = db.collection(collectionName).doc(docId);
      const documentSnapshot = await documentReference.get();
      const documentData = documentSnapshot.exists ? documentSnapshot.data() : null;

      await documentReference.delete();

      alert("Registro eliminado con éxito.");
    } catch (err) {
      console.error("Error al eliminar:", err);
      alert("Error al eliminar el registro: " + err.message);
    }
  }
};

// ------------------------------------
// ACTUALIZAR ESTATUS (GLOBAL)
// ------------------------------------
window.updateEstatus = async function(id, nuevoEstatus) {
  try {
    await db.collection('reportes_emergencia').doc(id).update({ estatus: nuevoEstatus });
  } catch (err) {
    console.error("Error al actualizar estatus:", err);
    alert("No se pudo actualizar el estatus.");
  }
};

window.deleteResolvedDoc = async function(collectionName, id, status) {
  const resolvedStatuses = ['Atendido', 'Falsa Alarma', 'Cancelado'];
  if (!resolvedStatuses.includes(status)) return;
  if (!confirm('¿Eliminar definitivamente este caso resuelto?')) return;
  try {
    await db.collection(collectionName).doc(id).delete();
  } catch (err) {
    console.error('Error al eliminar el caso:', err);
    alert('No se pudo eliminar el caso.');
  }
};

window.updateServiceEstatus = async function(id, nuevoEstatus) {
  try {
    await db.collection('solicitudes_servicio').doc(id).update({ estatus: nuevoEstatus });
  } catch (err) {
    console.error("Error al actualizar solicitud de servicio:", err);
    alert("No se pudo actualizar la solicitud.");
  }
};

// ------------------------------------
// 1.5. EDICIÓN DE SECCIONES
// ------------------------------------
const pageSelector = document.getElementById('select-pagina');
const pageForm = document.getElementById('form-paginas');
const pageTitle = document.getElementById('page-title');
const pageBody = document.getElementById('page-body');

window.loadPageData = async function(pageId) {
  if (!pageId || !pageTitle || !pageBody) return;

  pageTitle.value = '';
  pageBody.value = '';

  try {
    const pageSnapshot = await db.collection('paginas').doc(pageId).get();
    if (pageSnapshot.exists) {
      const pageData = pageSnapshot.data();
      pageTitle.value = pageData.title || '';
      pageBody.value = pageData.body || '';
    }
  } catch (err) {
    console.error("Error al cargar la sección:", err);
    alert("No se pudo cargar la sección: " + err.message);
  }
};

if (pageForm) {
  pageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const pageId = pageSelector ? pageSelector.value : '';
    const submitButton = pageForm.querySelector('button[type="submit"]');

    if (!pageId) return;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerText = 'Guardando...';
    }

    try {
      await db.collection('paginas').doc(pageId).set({
        title: pageTitle.value.trim(),
        body: pageBody.value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      alert('Sección actualizada con éxito.');
    } catch (err) {
      console.error("Error al guardar la sección:", err);
      alert("No se pudo actualizar la sección: " + err.message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = 'Actualizar Sección';
      }
    }
  });
}

if (pageSelector) window.loadPageData(pageSelector.value);

// ------------------------------------
// 1. SALA DE GUARDIA
// ------------------------------------
const emergenciasContainer = document.getElementById('emergenciasContainer');
const emergencySound = document.getElementById('emergencyAlertSound');
const soundToggle = document.getElementById('soundToggle');
const statEmergenciesPending = document.getElementById('statEmergenciesPending');
const statServicesPending = document.getElementById('statServicesPending');
const statPublications = document.getElementById('statPublications');
const statEmergenciesProcess = document.getElementById('statEmergenciesProcess');
let emergencyDocs = [];
let publicationCount = 0;

function updateDashboardStats() {
  const pendingEmergencies = emergencyDocs.filter(doc => (doc.data().estatus || 'Pendiente') === 'Pendiente').length;
  const processEmergencies = emergencyDocs.filter(doc => (doc.data().estatus || 'Pendiente') === 'En Proceso').length;
  const pendingServices = serviceRequestDocs.filter(doc => (doc.data().estatus || 'Pendiente') === 'Pendiente').length;
  if (statEmergenciesPending) statEmergenciesPending.textContent = pendingEmergencies;
  if (statServicesPending) statServicesPending.textContent = pendingServices;
  if (statPublications) statPublications.textContent = publicationCount;
  if (statEmergenciesProcess) statEmergenciesProcess.textContent = processEmergencies;
}
let initialLoad = true;

db.collection('reportes_emergencia')
  .orderBy('fechaHora', 'desc')
  .onSnapshot(snapshot => {
    emergencyDocs = snapshot.docs;
    updateDashboardStats();
    if (!initialLoad) {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' && soundToggle && soundToggle.checked) {
          if (emergencySound) emergencySound.play().catch(() => {});
        }
      });
    }
    initialLoad = false;

    if (!emergenciasContainer) return;

    if (snapshot.empty) {
      emergenciasContainer.innerHTML = '<p class="empty-state">Sin reportes registrados.</p>';
      return;
    }

    emergenciasContainer.innerHTML = '';
    snapshot.docs.forEach(doc => {
      const d = doc.data();
      const id = doc.id;
      const fecha = formatFirestoreDate(d.fechaHora);
      const statusClass = (d.estatus || 'Pendiente').toLowerCase().replace(/\s+/g, '-');
      const mapLink = d.gps ? getSafeMapLink(d.gps.mapLink) : '';

      emergenciasContainer.innerHTML += `
        <div class="card-emergencia status-${escapeHTML(statusClass)}">
          <div class="card-emergencia-header">
            <strong>${escapeHTML(d.tipoIncidencia || 'Emergencia')}</strong>
            <span class="badge-estatus ${escapeHTML(statusClass)}">${escapeHTML(d.estatus || 'Pendiente')}</span>
          </div>
          <p><small>${escapeHTML(fecha)}</small></p>
          <p><strong>Detalle:</strong> ${escapeHTML(d.detalles || 'Sin observaciones')}</p>
          ${mapLink ? `<a href="${escapeHTML(mapLink)}" target="_blank" rel="noopener noreferrer" class="btn-gps"><i class="fa-solid fa-location-dot"></i> Ver Coordenadas GPS</a>` : '<p><small>Sin GPS</small></p>'}
          <select onchange="updateEstatus('${escapeHTML(id)}', this.value)" class="select-estatus">
            <option value="Pendiente" ${d.estatus === 'Pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
            <option value="En Proceso" ${d.estatus === 'En Proceso' ? 'selected' : ''}>🚒 En Sitio</option>
            <option value="Atendido" ${d.estatus === 'Atendido' ? 'selected' : ''}>✅ Atendido</option>
            <option value="Falsa Alarma" ${d.estatus === 'Falsa Alarma' ? 'selected' : ''}>❌ Falsa Alarma</option>
          </select>
          ${['Atendido', 'Falsa Alarma'].includes(d.estatus) ? `<button class="btn-delete-resolved" onclick="deleteResolvedDoc('reportes_emergencia', '${escapeHTML(id)}', '${escapeHTML(d.estatus)}')"><i class="fa-solid fa-trash"></i> Eliminar caso</button>` : ''}
        </div>
      `;
    });
  }, err => console.error("Error en Sala de Guardia:", err));

const serviciosContainer = document.getElementById('serviciosContainer');
const serviceSearch = document.getElementById('serviceSearch');
const serviceStatusFilter = document.getElementById('serviceStatusFilter');
let serviceRequestDocs = [];

function renderServiceRequests() {
  if (!serviciosContainer) return;
  const searchTerm = (serviceSearch?.value || '').trim().toLowerCase();
  const selectedStatus = serviceStatusFilter?.value || 'all';
  const filteredDocs = serviceRequestDocs.filter(doc => {
    const data = doc.data();
    const status = data.estatus || 'Pendiente';
    const searchableText = [data.nombre, data.telefono, data.servicio, data.detalles]
      .filter(Boolean).join(' ').toLowerCase();
    return (selectedStatus === 'all' || status === selectedStatus) && searchableText.includes(searchTerm);
  });
  updateDashboardStats();

  if (!filteredDocs.length) {
    serviciosContainer.innerHTML = '<p class="empty-state">No hay solicitudes que coincidan con el filtro.</p>';
    return;
  }

  serviciosContainer.innerHTML = '';
  filteredDocs.forEach(doc => {
      const data = doc.data();
      const status = data.estatus || 'Pendiente';
      const statusClass = status.toLowerCase().replace(/\s+/g, '-');
      const whatsappNumber = getWhatsAppNumber(data.telefono);
      serviciosContainer.innerHTML += `
        <article class="service-request-card status-${escapeHTML(statusClass)}">
          <div class="service-request-header">
            <div><h4>${escapeHTML(data.servicio || 'Servicio solicitado')}</h4><p>${escapeHTML(formatFirestoreDate(data.fechaHora))}</p></div>
            <span class="badge-estatus ${escapeHTML(statusClass)}">${escapeHTML(status)}</span>
          </div>
          <dl class="service-request-details">
            <div><dt>Solicitante</dt><dd>${escapeHTML(data.nombre || 'Sin nombre')}</dd></div>
            <div><dt>WhatsApp</dt><dd>${whatsappNumber ? `<a href="https://wa.me/${escapeHTML(whatsappNumber)}" target="_blank" rel="noopener noreferrer">${escapeHTML(data.telefono || '')} <i class="fa-brands fa-whatsapp"></i></a>` : 'Sin teléfono válido'}</dd></div>
            <div><dt>Detalles</dt><dd>${escapeHTML(data.detalles || 'Sin detalles')}</dd></div>
          </dl>
          <select onchange="updateServiceEstatus('${escapeHTML(doc.id)}', this.value)" class="select-estatus" aria-label="Estado de solicitud">
            <option value="Pendiente" ${status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="En revisión" ${status === 'En revisión' ? 'selected' : ''}>En revisión</option>
            <option value="Atendido" ${status === 'Atendido' ? 'selected' : ''}>Atendido</option>
            <option value="Cancelado" ${status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
          ${['Atendido', 'Cancelado'].includes(status) ? `<button class="btn-delete-resolved" onclick="deleteResolvedDoc('solicitudes_servicio', '${escapeHTML(doc.id)}', '${escapeHTML(status)}')"><i class="fa-solid fa-trash"></i> Eliminar caso</button>` : ''}
        </article>`;
  });
}

serviceSearch?.addEventListener('input', renderServiceRequests);
serviceStatusFilter?.addEventListener('change', renderServiceRequests);

if (serviciosContainer) {
  db.collection('solicitudes_servicio').orderBy('fechaHora', 'desc').onSnapshot(snapshot => {
    serviceRequestDocs = snapshot.docs;
    renderServiceRequests();
  }, error => {
    console.error('Error en solicitudes de servicio:', error);
    serviciosContainer.innerHTML = '<p class="empty-state">No se pudieron cargar las solicitudes.</p>';
  });
}

// ------------------------------------
// 2. CARRUSEL HERO
// ------------------------------------
const formCarrusel = document.getElementById('form-carrusel');
const listCarrusel = document.getElementById('list-carrusel');
let editingCarruselId = null;
let editingMuroId = null;

function validateImageUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    if (url.hostname === 'postimg.cc' || url.hostname === 'www.postimg.cc') {
      throw new Error('Postimages page URL');
    }
    return url.href;
  } catch {
    if (/^https?:\/\/(www\.)?postimg\.cc\//i.test(value)) {
      throw new Error('Pega el "Direct link" de Postimages, no el enlace de la página. Debe empezar por https://i.postimg.cc/.');
    }
    throw new Error('Introduce una URL de imagen válida que empiece por http:// o https://.');
  }
}

function validateImageUrls(value) {
  const urls = String(value || '').split(/\r?\n/).map(url => url.trim()).filter(Boolean);
  return [...new Set(urls.map(validateImageUrl))];
}

function validateYoutubeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const validHost = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname.toLowerCase());
    const videoId = url.hostname.toLowerCase() === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : url.searchParams.get('v') || url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1];
    if (!validHost || !videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error();
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    throw new Error('Introduce una URL válida de YouTube (watch, youtu.be o Shorts).');
  }
}

async function uploadMuroPdf(file) {
  if (!file) return null;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('El archivo seleccionado debe ser un PDF.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('El PDF no puede superar los 10 MB.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `publicaciones/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabaseClient.storage.from('pc').upload(path, file, {
    contentType: 'application/pdf',
    upsert: false
  });
  if (uploadError) throw uploadError;
  const { data } = supabaseClient.storage.from('pc').getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
}

function getPublicationTypeLabel(data) {
  const hasPhoto = Boolean(data.imageUrl || (Array.isArray(data.imageUrls) && data.imageUrls.length));
  const hasPdf = Boolean(data.pdfUrl);
  const hasVideo = Boolean(data.youtubeUrl);
  const types = [];
  if (hasPhoto) types.push('<i class="fa-solid fa-image"></i> Foto');
  if (hasPdf) types.push('<i class="fa-solid fa-file-pdf"></i> PDF');
  if (hasVideo) types.push('<i class="fa-brands fa-youtube"></i> Video');
  return types.length ? types.join(' <span class="publication-type-separator">+</span> ') : 'Solo texto';
}

function resetCarruselEdit() {
  editingCarruselId = null;
  if (formCarrusel) formCarrusel.reset();
  const button = document.getElementById('btn-save-car');
  if (button) button.innerText = 'Guardar Slide';
  const cancelButton = document.getElementById('btn-cancel-car');
  if (cancelButton) cancelButton.hidden = true;
}

function resetMuroEdit() {
  editingMuroId = null;
  if (formMuro) formMuro.reset();
  const button = document.getElementById('btn-save-muro');
  if (button) button.innerText = 'Publicar en Muro';
  const cancelButton = document.getElementById('btn-cancel-muro');
  if (cancelButton) cancelButton.hidden = true;
}

window.editPublication = async function(type, id) {
  const documentSnapshot = await db.collection(type).doc(id).get();
  if (!documentSnapshot.exists) return;
  const data = documentSnapshot.data();

  if (type === 'carrusel') {
    editingCarruselId = id;
    document.getElementById('car-title').value = data.title || '';
    document.getElementById('car-desc').value = data.description || '';
    document.getElementById('car-image-url').value = data.imageUrl || '';
    document.getElementById('btn-save-car').innerText = 'Actualizar Slide';
    document.getElementById('btn-cancel-car').hidden = false;
    showTab('carrusel-tab');
  } else {
    editingMuroId = id;
    document.getElementById('muro-title').value = data.title || '';
    document.getElementById('muro-category').value = data.category || 'Noticias';
    document.getElementById('muro-content').value = data.content || '';
    document.getElementById('muro-image-urls').value = Array.isArray(data.imageUrls)
      ? data.imageUrls.join('\n')
      : data.imageUrl || '';
    document.getElementById('muro-youtube-url').value = data.youtubeUrl || '';
    document.getElementById('btn-save-muro').innerText = 'Actualizar Publicación';
    document.getElementById('btn-cancel-muro').hidden = false;
    showTab('muro-tab');
  }
};

document.getElementById('btn-cancel-car')?.addEventListener('click', resetCarruselEdit);
document.getElementById('btn-cancel-muro')?.addEventListener('click', resetMuroEdit);

if (formCarrusel) {
  formCarrusel.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('car-title').value.trim();
    const desc = document.getElementById('car-desc').value.trim();
    const imageUrl = validateImageUrl(document.getElementById('car-image-url').value.trim());
    const btn = document.getElementById('btn-save-car');

    btn.disabled = true;
    btn.innerText = "Guardando...";

    try {
      const slideData = {
        title,
        description: desc,
        imageUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (editingCarruselId) {
        delete slideData.createdAt;
        await db.collection('carrusel').doc(editingCarruselId).update(slideData);
      } else {
        await db.collection('carrusel').add(slideData);
      }

      const wasEditing = Boolean(editingCarruselId);
      resetCarruselEdit();
      alert(wasEditing ? "¡Slide actualizado!" : "¡Slide guardado en el Carrusel!");
    } catch (err) {
      console.error('Error al guardar en el carrusel:', {
        code: err.code,
        email: adminAuth.currentUser?.email || 'sin sesión',
        emailVerified: adminAuth.currentUser?.emailVerified ?? false
      }, err);
      alert(err.code === 'permission-denied'
        ? `Firestore rechazó el guardado. Cuenta conectada: ${adminAuth.currentUser?.email || 'ninguna'}. Publica las reglas actualizadas y verifica que el correo sea danielrvix@gmail.com.`
        : "Error al guardar en el carrusel: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerText = "Guardar Slide";
    }
  });
}

db.collection('carrusel').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
  if (!listCarrusel) return;
  listCarrusel.innerHTML = '';
  snapshot.docs.forEach(doc => {
    const d = doc.data();
    listCarrusel.innerHTML += `
      <div class="data-item">
        ${d.imageUrl ? `<img src="${escapeHTML(d.imageUrl)}" width="60" height="40" alt="" style="object-fit:cover; border-radius:4px;">` : ''}
        <div>
          <strong>${escapeHTML(d.title || 'Sin Título')}</strong>
          <p>${escapeHTML(d.description || '')}</p>
        </div>
        <div class="item-actions">
          <button onclick="editPublication('carrusel', '${doc.id}')" class="btn-edit" title="Editar slide"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteDoc('carrusel', '${doc.id}')" class="btn-del" title="Eliminar slide"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
  });
}, err => console.error("Error en Carrusel:", err));

// ------------------------------------
// 3. MURO DE NOTICIAS
// ------------------------------------
const formMuro = document.getElementById('form-muro');
const listMuro = document.getElementById('list-muro');

if (formMuro) {
  formMuro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('muro-title').value.trim();
    const category = document.getElementById('muro-category').value;
    const content = document.getElementById('muro-content').value.trim();
    const imageUrls = validateImageUrls(document.getElementById('muro-image-urls').value);
    const imageUrl = imageUrls[0] || '';
    const youtubeUrl = validateYoutubeUrl(document.getElementById('muro-youtube-url').value.trim());
    const pdfFile = document.getElementById('muro-pdf').files[0];
    const btn = document.getElementById('btn-save-muro');

    btn.disabled = true;
    btn.innerText = "Publicando...";

    try {
      btn.innerText = "Guardando noticia...";
      const uploadedPdf = await uploadMuroPdf(pdfFile);
      const postData = {
        title,
        author: 'Protección Civil Apure',
        category,
        content,
        imageUrl,
        imageUrls,
        youtubeUrl,
        ...(uploadedPdf ? { pdfUrl: uploadedPdf.url, pdfName: uploadedPdf.name } : {}),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (editingMuroId) {
        delete postData.createdAt;
        await db.collection('muro').doc(editingMuroId).update(postData);
      } else {
        await db.collection('muro').add(postData);
      }

      const wasEditing = Boolean(editingMuroId);
      resetMuroEdit();
      alert(wasEditing ? "¡Publicación actualizada!" : "¡Publicación guardada con éxito!");
    } catch (err) {
      console.error("Error al publicar en el muro:", err);
      alert(`No se pudo publicar: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerText = "Publicar en Muro";
    }
  });
}

db.collection('muro').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
  publicationCount = snapshot.size;
  updateDashboardStats();
  if (!listMuro) return;
  listMuro.innerHTML = '';
  snapshot.docs.forEach(doc => {
    const d = doc.data();
    listMuro.innerHTML += `
      <div class="data-item">
        ${d.imageUrl ? `<img src="${escapeHTML(d.imageUrl)}" width="60" height="40" alt="" style="object-fit:cover; border-radius:4px;">` : ''}
        <span class="publication-type-badge">${getPublicationTypeLabel(d)}</span>
        <div>
          <strong>${escapeHTML(d.title || 'Sin Título')}</strong>
          <p>${escapeHTML((d.content || '').substring(0, 80))}...</p>
        </div>
        <div class="item-actions">
          <button onclick="editPublication('muro', '${doc.id}')" class="btn-edit" title="Editar noticia"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteDoc('muro', '${doc.id}')" class="btn-del" title="Eliminar noticia"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
  });
}, err => console.error("Error en Muro:", err));