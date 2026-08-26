// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCle8I3oesdZgcMk3I_tkKb3KoOXA3hnrs",
  authDomain: "pcad-50836.firebaseapp.com",
  projectId: "pcad-50836",
  storageBucket: "pcad-50836.firebasestorage.app",
  messagingSenderId: "454412949206",
  appId: "1:454412949206:web:b42fecdecab90e9e7f1b77"
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
};

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
let initialLoad = true;

db.collection('reportes_emergencia')
  .orderBy('fechaHora', 'desc')
  .onSnapshot(snapshot => {
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
      console.error(err);
      alert("Error al guardar en el carrusel: " + err.message);
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