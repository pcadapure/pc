function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

document.addEventListener('DOMContentLoaded', () => {
  let deferredInstallPrompt = null;

  if (!window.location.pathname.toLowerCase().endsWith('admin.html') && !window.matchMedia('(display-mode: standalone)').matches) {
    const installButton = document.createElement('button');
    installButton.id = 'installAppBtn';
    installButton.className = 'install-app-btn';
    installButton.type = 'button';
    installButton.hidden = true;
    installButton.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i> Instalar aplicación';
    document.body.appendChild(installButton);

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installButton.hidden = false;
    });

    installButton.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      installButton.hidden = true;
      deferredInstallPrompt = null;
    });
  }

  if (!document.getElementById('fbModalOverlay') && !window.location.pathname.toLowerCase().endsWith('admin.html')) {
    const emergencyPanel = document.createElement('div');
    emergencyPanel.innerHTML = `
      <div class="fb-modal-overlay" id="fbModalOverlay">
        <div class="fb-modal-card">
          <div class="fb-modal-header">
            <h3>Crear Reporte de Emergencia</h3>
            <button class="fb-modal-close" id="closeFbModalBtn" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="fb-modal-body">
            <div class="fb-user-badge">
              <div class="fb-user-avatar"><i class="fa-solid fa-user-shield"></i></div>
              <div class="fb-user-info"><div class="name">Ciudadano / Reportante</div><div class="tag"><i class="fa-solid fa-earth-americas"></i> Envío directo a Sala de Guardia</div></div>
            </div>
            <div class="fb-incident-selector">
              <div class="incident-chip selected" data-type="Accidente de Tránsito"><i class="fa-solid fa-car-burst"></i> Accidente Tránsito</div>
              <div class="incident-chip" data-type="Emergencia Médica / Traslado"><i class="fa-solid fa-heart-pulse"></i> Emergencia Médica</div>
              <div class="incident-chip" data-type="Inundación / Crecida"><i class="fa-solid fa-house-tsunami"></i> Inundación / Crecida</div>
              <div class="incident-chip" data-type="Incendio / Estructural"><i class="fa-solid fa-fire"></i> Incendio / Fuego</div>
            </div>
            <textarea class="fb-textarea" id="incidentDetails" rows="2" placeholder="Describe brevemente lo ocurrido..."></textarea>
            <div class="fb-location-box">
              <div class="location-box-header"><div class="location-title"><i class="fa-solid fa-location-dot"></i> Ubicación del Incidente</div><span class="gps-status" id="gpsStatusBadge">Esperando capturar GPS</span></div>
              <div class="location-details" id="locationDetailsText">Presiona <strong>"Obtener mi GPS actual"</strong> para adjuntar tus coordenadas.</div>
              <div class="location-actions"><button type="button" class="btn-gps-auto" id="getGpsBtn"><i class="fa-solid fa-crosshairs"></i> Obtener mi GPS actual</button></div>
            </div>
          </div>
          <div class="fb-modal-footer"><button class="fb-submit-btn" id="sendWhatsappBtn" type="button"><i class="fa-brands fa-whatsapp"></i> Enviar Reporte a Protección Civil</button></div>
        </div>
      </div>`;
    document.body.appendChild(emergencyPanel.firstElementChild);
  }

  if (!window.location.pathname.toLowerCase().endsWith('admin.html') && !document.querySelector('.float-emergency-btn')) {
    const emergencyLink = document.createElement('a');
    emergencyLink.className = 'float-emergency-btn';
    emergencyLink.id = 'floatEmergencyBtn';
    emergencyLink.href = 'tel:911';
    emergencyLink.title = 'Llamar a emergencias 911';
    emergencyLink.setAttribute('aria-label', 'Llamar a emergencias 911');
    emergencyLink.innerHTML = '<i class="fa-solid fa-phone-volume" aria-hidden="true"></i>';
    document.body.appendChild(emergencyLink);
  }

  // NÚMERO DE WHATSAPP INSTITUCIONAL
  const WHATSAPP_NUMBER = "584264744951";

  const firebaseConfig = {
    apiKey: "AIzaSyCle8I3oesdZgcMk3I_tkKb3KoOXA3hnrs",
    authDomain: "pcad-50836.firebaseapp.com",
    projectId: "pcad-50836",
    storageBucket: "pcad-50836.firebasestorage.app",
    messagingSenderId: "454412949206",
    appId: "1:454412949206:web:b42fecdecab90e9e7f1b77",
    measurementId: "G-DREWP95N4V"
  };

  // Inicializar Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebase.firestore();
  window.db = db;

  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(error => {
      console.error('No se pudo registrar el service worker:', error);
    });
  }

  // ELEMENTOS DEL MODAL TIPO FACEBOOK
  const fbModalOverlay = document.getElementById('fbModalOverlay');
  const closeFbModalBtn = document.getElementById('closeFbModalBtn');
  const reportEmergencyNav = document.getElementById('reportEmergencyNav');
  const floatEmergencyBtn = document.getElementById('floatEmergencyBtn');
  const getGpsBtn = document.getElementById('getGpsBtn');
  const gpsStatusBadge = document.getElementById('gpsStatusBadge');
  const locationDetailsText = document.getElementById('locationDetailsText');
  const sendWhatsappBtn = document.getElementById('sendWhatsappBtn');
  const incidentChips = document.querySelectorAll('.incident-chip');
  const incidentDetails = document.getElementById('incidentDetails');
  const requestServiceNav = document.getElementById('requestServiceNav');
  const serviceModalOverlay = document.getElementById('serviceModalOverlay');
  const closeServiceModalBtn = document.getElementById('closeServiceModalBtn');
  const serviceRequestForm = document.getElementById('serviceRequestForm');
  const sendServiceRequestBtn = document.getElementById('sendServiceRequestBtn');

  let currentGpsData = null;
  let selectedIncidentType = "Accidente de Tránsito";

  // ABRIR Y CERRAR MODAL
  function openModal() {
    fbModalOverlay.classList.add('active');
  }

  function closeModal() {
    fbModalOverlay.classList.remove('active');
  }

  if (reportEmergencyNav) reportEmergencyNav.addEventListener('click', () => {
    if (navLinks) navLinks.classList.remove('active');
    openModal();
  });
  if (floatEmergencyBtn) floatEmergencyBtn.addEventListener('click', openModal);
  if (closeFbModalBtn) closeFbModalBtn.addEventListener('click', closeModal);

  document.querySelectorAll('.simple-header a[href="tel:911"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      openModal();
    });
  });

  if (fbModalOverlay) {
    fbModalOverlay.addEventListener('click', (e) => {
      if (e.target === fbModalOverlay) closeModal();
    });
  }

  function openServiceModal() {
    if (serviceModalOverlay) serviceModalOverlay.classList.add('active');
  }

  function closeServiceModal() {
    if (serviceModalOverlay) serviceModalOverlay.classList.remove('active');
  }

  if (requestServiceNav) requestServiceNav.addEventListener('click', openServiceModal);
  if (closeServiceModalBtn) closeServiceModalBtn.addEventListener('click', closeServiceModal);
  if (serviceModalOverlay) serviceModalOverlay.addEventListener('click', event => {
    if (event.target === serviceModalOverlay) closeServiceModal();
  });

  if (serviceRequestForm) serviceRequestForm.addEventListener('submit', async event => {
    event.preventDefault();
    const name = document.getElementById('serviceName').value.trim();
    const phone = document.getElementById('servicePhone').value.trim();
    const service = document.getElementById('serviceType').value;
    const details = document.getElementById('serviceDetails').value.trim();

    sendServiceRequestBtn.disabled = true;
    sendServiceRequestBtn.innerText = 'Enviando...';
    try {
      await db.collection('solicitudes_servicio').add({
        nombre: name,
        telefono: phone,
        servicio: service,
        detalles: details,
        fechaHora: firebase.firestore.FieldValue.serverTimestamp(),
        estatus: 'Pendiente'
      });
    } catch (error) {
      console.error('Error al guardar la solicitud de servicio:', error);
    }

    const message = `*SOLICITUD DE SERVICIO - PROTECCIÓN CIVIL*\n\n*Nombre:* ${name}\n*Teléfono:* ${phone}\n*Servicio:* ${service}\n*Detalles:* ${details}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    serviceRequestForm.reset();
    closeServiceModal();
    sendServiceRequestBtn.disabled = false;
    sendServiceRequestBtn.innerText = 'Solicitar por WhatsApp';
  });

  // VISOR DE IMAGENES EN LA MISMA PAGINA
  const imageViewerOverlay = document.getElementById('imageViewerOverlay');
  const imageViewerClose = document.getElementById('imageViewerClose');
  const imageViewerImage = document.getElementById('imageViewerImage');
  const postDetailOverlay = document.getElementById('postDetailOverlay');
  const postDetailClose = document.getElementById('postDetailClose');
  const postDetailTitle = document.getElementById('postDetailTitle');
  const postDetailDate = document.getElementById('postDetailDate');
  const postDetailGallery = document.getElementById('postDetailGallery');
  const postDetailText = document.getElementById('postDetailText');
  const postDetailReactions = document.getElementById('postDetailReactions');
  const postShareButton = document.getElementById('postShareButton');

  function closeImageViewer() {
    if (!imageViewerOverlay) return;
    imageViewerOverlay.classList.remove('active');
    if (imageViewerImage) imageViewerImage.removeAttribute('src');
  }

  document.addEventListener('click', event => {
    const imageLink = event.target.closest('.image-link');
    if (!imageLink) return;

    const muroCard = imageLink.closest('.muro-card');
    if (muroCard) {
      event.preventDefault();
      openPostDetail(muroCard);
      return;
    }
    if (!imageViewerOverlay || !imageViewerImage) return;

    event.preventDefault();
    event.stopPropagation();
    const image = imageLink.querySelector('img');
    imageViewerImage.src = imageLink.href;
    imageViewerImage.alt = image ? image.alt : 'Imagen ampliada';
    imageViewerOverlay.classList.add('active');
  });

  if (imageViewerClose) imageViewerClose.addEventListener('click', closeImageViewer);
  if (imageViewerOverlay) imageViewerOverlay.addEventListener('click', event => {
    if (event.target === imageViewerOverlay) closeImageViewer();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeImageViewer();
  });

  function closePostDetail() {
    if (postDetailOverlay) postDetailOverlay.classList.remove('active');
  }

  function openPostDetail(card) {
    if (!postDetailOverlay) return;
    postDetailTitle.textContent = card.dataset.title || 'Sin título';
    postDetailDate.textContent = card.dataset.date || 'Reciente';
    postDetailText.textContent = card.dataset.content || '';
    postDetailOverlay.dataset.postId = card.dataset.postId || '';
    postDetailOverlay.dataset.shareTitle = card.dataset.title || 'Publicación';
    postDetailOverlay.dataset.shareText = card.dataset.content || '';
    const reactions = JSON.parse(card.dataset.reactions || '{}');
    postDetailReactions.innerHTML = ['meGusta', 'apoyo', 'importante'].map(reaction => `
      <button class="reaction-button" data-reaction="${reaction}" data-post-id="${card.dataset.postId}" type="button">
        <i class="fa-solid ${reaction === 'meGusta' ? 'fa-thumbs-up' : reaction === 'apoyo' ? 'fa-hands-helping' : 'fa-circle-exclamation'}"></i>
        ${reaction === 'meGusta' ? 'Me gusta' : reaction === 'apoyo' ? 'Apoyo' : 'Importante'}
        <span>${reactions[reaction] || 0}</span>
      </button>
    `).join('');
    postDetailGallery.innerHTML = card.dataset.images
      ? JSON.parse(card.dataset.images).map(imageUrl => `
          <img src="${imageUrl}" alt="${card.dataset.title || 'Imagen de la publicación'}">
        `).join('')
      : '';
    postDetailOverlay.classList.add('active');
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.reaction-button')) return;
    const card = event.target.closest('.muro-card');
    if (card) openPostDetail(card);
  });

  document.addEventListener('keydown', event => {
    const card = event.target.closest('.muro-card');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openPostDetail(card);
    }
  });

  if (postDetailClose) postDetailClose.addEventListener('click', closePostDetail);
  if (postDetailOverlay) postDetailOverlay.addEventListener('click', event => {
    if (event.target === postDetailOverlay) closePostDetail();
  });
  if (postShareButton) postShareButton.addEventListener('click', async () => {
    const title = postDetailOverlay.dataset.shareTitle || 'Publicación';
    const text = postDetailOverlay.dataset.shareText || '';
    const shareData = { title, text, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${title}\n\n${text}\n\n${window.location.href}`);
        postShareButton.innerHTML = '<i class="fa-solid fa-check"></i> Enlace copiado';
        setTimeout(() => { postShareButton.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Compartir publicación'; }, 1800);
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error('No se pudo compartir la publicación:', error);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePostDetail();
  });

  // SELECCIÓN DE TIPO DE INCIDENCIA
  incidentChips.forEach(chip => {
    chip.addEventListener('click', () => {
      incidentChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedIncidentType = chip.getAttribute('data-type');
    });
  });

  // CAPTURA DE UBICACIÓN GPS DEL NAVEGADOR
  if (getGpsBtn) getGpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      gpsStatusBadge.className = "gps-status error";
      gpsStatusBadge.innerText = "GPS no soportado";
      locationDetailsText.innerText = "Tu navegador no permite captura automática. Usa la guía de abajo para enviarla manualmente.";
      return;
    }

    gpsStatusBadge.className = "gps-status";
    gpsStatusBadge.innerText = "Obteniendo datos...";
    getGpsBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        const accuracy = Math.round(position.coords.accuracy);

        currentGpsData = { lat, lon, link: `https://maps.google.com/?q=${lat},${lon}` };

        gpsStatusBadge.className = "gps-status success";
        gpsStatusBadge.innerText = "GPS Capturado";
        locationDetailsText.innerHTML = `<strong>Coordenadas:</strong> ${lat}, ${lon}<br><small style="color:#28a745;">Precisión estimada: ~${accuracy} metros.</small>`;
        getGpsBtn.disabled = false;
      },
      (error) => {
        gpsStatusBadge.className = "gps-status error";
        gpsStatusBadge.innerText = "Permiso denegado / Error";
        locationDetailsText.innerText = "No se pudo obtener el GPS automático. Por favor sigue los pasos para enviarla desde WhatsApp.";
        getGpsBtn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  // GUARDAR EN FIRESTORE Y ENVIAR REPORTE VÍA WHATSAPP
  if (sendWhatsappBtn && incidentDetails) sendWhatsappBtn.addEventListener('click', async () => {
    const obs = incidentDetails.value.trim();

    // Registra en la base de datos para la Sala de Guardia
    try {
      await db.collection('reportes_emergencia').add({
        tipoIncidencia: selectedIncidentType,
        detalles: obs || 'Sin observaciones adicionales',
        gps: currentGpsData ? {
          latitud: currentGpsData.lat,
          longitud: currentGpsData.lon,
          mapLink: currentGpsData.link
        } : null,
        fechaHora: firebase.firestore.FieldValue.serverTimestamp(),
        estatus: 'Pendiente'
      });
    } catch (error) {
      console.error("Error al respaldar en Firestore:", error);
    }

    // Estructura el mensaje de WhatsApp
    let message = `🚨 *REPORTE DE EMERGENCIA - PROTECCIÓN CIVIL* 🚨\n\n`;
    message += `📌 *Tipo de Evento:* ${selectedIncidentType}\n`;
    
    if (obs !== "") {
      message += `📝 *Detalles:* ${obs}\n`;
    }

    if (currentGpsData) {
      message += `📍 *Ubicación GPS:* ${currentGpsData.link}\n`;
    } else {
      message += `📍 *Ubicación GPS:* (Enviando ubicación precisa en tiempo real desde el chat)\n`;
    }

    message += `\n⚠️ *Por favor, despachen unidad de atención.*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
    closeModal();
  });

  // MENÚ HAMBURGUESA
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');

  if (hamburgerBtn && navLinks) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('active'));
    });
  }

  // SLIDER HERO DINÁMICO DESDE FIRESTORE
  const slidesWrapper = document.querySelector('.slides-wrapper');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const manualSlides = slidesWrapper
    ? Array.from(slidesWrapper.querySelectorAll('.hero-slide')).map(slide => slide.cloneNode(true))
    : [];
  let slides = [];
  let currentSlide = 0;

  function showSlide(index) {
    if (slides.length === 0) return;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
  }

  // Escucha cambios en vivo de las diapositivas creadas en el Panel Admin
  if (slidesWrapper) db.collection('carrusel')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      if (snapshot.empty) {
        slides = Array.from(slidesWrapper.querySelectorAll('.hero-slide'));
        showSlide(currentSlide);
        return;
      }

      slidesWrapper.innerHTML = '';
      manualSlides.forEach(slide => slidesWrapper.appendChild(slide.cloneNode(true)));
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();

        slidesWrapper.innerHTML += `
          <div class="hero-slide">
            <div class="slide-text-content">
              <h1 class="hero-title">${data.title}</h1>
              <p class="hero-description">${data.description}</p>
            </div>
            <div class="slide-image-content">
              <a href="${data.imageUrl}" target="_blank" rel="noopener noreferrer" class="image-link" aria-label="Abrir imagen de ${data.title}">
                <img src="${data.imageUrl}" alt="${data.title}" class="person-img">
              </a>
            </div>
          </div>
        `;
      });

      slides = document.querySelectorAll('.hero-slide');
      currentSlide = 0;
  showSlide(currentSlide);
    }, (error) => {
      console.error("Error al cargar el carrusel:", error);
      slides = document.querySelectorAll('.hero-slide');
      showSlide(currentSlide);
    });

  cargarMuroNoticias(db);

  // Navegación de botones del Slider
  if (nextBtn && prevBtn) {
    nextBtn.addEventListener('click', () => {
      if (slides.length === 0) return;
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
    });

    prevBtn.addEventListener('click', () => {
      if (slides.length === 0) return;
      currentSlide = (currentSlide - 1 + slides.length) % slides.length;
      showSlide(currentSlide);
    });
  }
});

// ------------------------------------
  // MURO DE NOTICIAS EN VIVO DESDE FIRESTORE
  // ------------------------------------
// Función para cargar el muro de forma segura
function cargarMuroNoticias(database) {
  const muroGridContainer = document.getElementById('muroGridContainer');
  if (!muroGridContainer) return;

  // Obtener la instancia de firestore de forma segura
  const firestoreDB = database || window.db || (firebase.apps.length ? firebase.firestore() : null);

  if (!firestoreDB) {
    console.error("Firestore no está inicializado.");
    return;
  }

  firestoreDB.collection('muro')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      if (snapshot.empty) {
        muroGridContainer.innerHTML = `
          <div class="empty-muro" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
            <p>No hay publicaciones recientes en el muro por el momento.</p>
          </div>
        `;
        return;
      }

      muroGridContainer.innerHTML = '';

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const postImages = Array.isArray(data.imageUrls)
          ? data.imageUrls.filter(imageUrl => typeof imageUrl === 'string' && imageUrl)
          : (data.imageUrl ? [data.imageUrl] : []);
        
        let fechaFormateada = "Reciente";
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          fechaFormateada = data.createdAt.toDate().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }

        muroGridContainer.innerHTML += `
          <article class="muro-card" tabindex="0" role="button"
            data-post-id="${escapeHTML(doc.id)}"
            data-title="${escapeHTML(data.title || 'Sin título')}"
            data-date="${escapeHTML(fechaFormateada)}"
            data-content="${escapeHTML(data.content || '')}"
            data-reactions='${escapeHTML(JSON.stringify(data.reacciones || {}))}'
            data-images='${escapeHTML(JSON.stringify(postImages))}'>
            ${data.imageUrl ? `
              <div class="muro-card-image">
                <a href="${data.imageUrl}" target="_blank" rel="noopener noreferrer" class="image-link" aria-label="Abrir imagen de ${data.title || 'Noticia'}">
                  <img src="${data.imageUrl}" alt="${data.title || 'Noticia'}" loading="lazy">
                </a>
              </div>
            ` : ''}
            <div class="muro-card-content">
              <span class="muro-card-date">
                <i class="fa-regular fa-calendar-days"></i> ${fechaFormateada}
              </span>
              <h3 class="muro-card-title">${data.title || 'Sin título'}</h3>
              <p class="muro-card-text">${data.content || ''}</p>
              <div class="muro-reactions" data-post-id="${escapeHTML(doc.id)}">
                <button class="reaction-button" data-reaction="meGusta" type="button"><i class="fa-solid fa-thumbs-up"></i> Me gusta <span>${data.reacciones?.meGusta || 0}</span></button>
                <button class="reaction-button" data-reaction="apoyo" type="button"><i class="fa-solid fa-hands-helping"></i> Apoyo <span>${data.reacciones?.apoyo || 0}</span></button>
                <button class="reaction-button" data-reaction="importante" type="button"><i class="fa-solid fa-circle-exclamation"></i> Importante <span>${data.reacciones?.importante || 0}</span></button>
              </div>
            </div>
          </article>
        `;
      });
    }, (error) => {
      console.error("Error al cargar el Muro de Noticias:", error);
    });
}

async function reaccionarNoticia(postId, reaction, button) {
  const reactionKey = `muro-reaction-${postId}`;
  if (localStorage.getItem(reactionKey)) return;

  const firestoreDB = window.db;
  if (!firestoreDB) return;

  try {
    await firestoreDB.runTransaction(async transaction => {
      const reference = firestoreDB.collection('muro').doc(postId);
      const snapshot = await transaction.get(reference);
      const reactions = snapshot.data()?.reacciones || {};
      transaction.update(reference, {
        reacciones: {
          meGusta: Number(reactions.meGusta || 0),
          apoyo: Number(reactions.apoyo || 0),
          importante: Number(reactions.importante || 0),
          [reaction]: Number(reactions[reaction] || 0) + 1
        }
      });
    });
    localStorage.setItem(reactionKey, reaction);
    button.classList.add('selected');
    const count = button.querySelector('span');
    if (count) count.textContent = String(Number(count.textContent || 0) + 1);
  } catch (error) {
    console.error('No se pudo guardar la reacción:', error);
    button.title = 'No se pudo guardar. Revisa los permisos de Firestore.';
  }
}

document.addEventListener('click', event => {
  const reactionButton = event.target.closest('.reaction-button');
  if (!reactionButton) return;
  event.preventDefault();
  event.stopPropagation();
  const reactions = reactionButton.closest('.muro-reactions, .post-detail-reactions');
  const postId = reactionButton.dataset.postId || reactions.dataset.postId;
  reaccionarNoticia(postId, reactionButton.dataset.reaction, reactionButton);
});
