function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function getYoutubeVideoId(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return '';
    const videoId = host === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : url.searchParams.get('v') || url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1];
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
  } catch {
    return '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let deferredInstallPrompt = null;
  const pageFileName = window.location.pathname.toLowerCase().split('/').pop();
  const isInformationOnlyPage = ['prehospitalario.html', 'operaciones.html'].includes(pageFileName);
  const appSettingsKey = 'pcad-app-settings';
  const defaultAppSettings = {
    textSize: 'normal',
    highContrast: false,
    reduceMotion: false,
    dataSaver: false,
    preferredMunicipality: '',
    notificationsEnabled: false
  };
  let appSettings = { ...defaultAppSettings };
  const isAdminPage = pageFileName === 'admin.html';
  let toggleAppNotifications = null;
  const municipalities = [
    ['achaguas', 'Achaguas'],
    ['biruaca', 'Biruaca'],
    ['muñoz', 'Muñoz'],
    ['páez', 'Páez'],
    ['pedro-camejo', 'Pedro Camejo'],
    ['romulo-gallegos', 'Rómulo Gallegos'],
    ['san-fernando', 'San Fernando']
  ];
  const bindServiceMunicipality = () => {
    const field = document.getElementById('serviceMunicipality');
    if (!field) return;
    field.value = appSettings.preferredMunicipality;
    if (field.dataset.preferenceBound) return;
    field.dataset.preferenceBound = 'true';
    field.addEventListener('change', () => {
      appSettings.preferredMunicipality = field.value;
      const preferenceField = document.getElementById('appPreferredMunicipality');
      if (preferenceField) preferenceField.value = field.value;
      try {
        localStorage.setItem(appSettingsKey, JSON.stringify(appSettings));
      } catch (error) {
        console.error('No se pudo guardar el municipio preferido:', error);
        const status = document.getElementById('appSettingsStatus');
        if (status) status.textContent = 'No se pudo guardar el municipio preferido en este dispositivo.';
      }
    });
  };

  if (!isAdminPage) {
    try {
      const savedSettings = localStorage.getItem(appSettingsKey);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings && typeof parsedSettings === 'object') {
          appSettings = {
            textSize: ['normal', 'large', 'larger'].includes(parsedSettings.textSize)
              ? parsedSettings.textSize
              : defaultAppSettings.textSize,
            highContrast: parsedSettings.highContrast === true,
            reduceMotion: parsedSettings.reduceMotion === true,
            dataSaver: parsedSettings.dataSaver === true,
            preferredMunicipality: municipalities.some(([id]) => id === parsedSettings.preferredMunicipality)
              ? parsedSettings.preferredMunicipality
              : defaultAppSettings.preferredMunicipality,
            notificationsEnabled: parsedSettings.notificationsEnabled === true
          };
        }
      }
    } catch (error) {
      console.error('No se pudieron cargar las preferencias de la aplicación:', error);
    }
    if (
      appSettings.notificationsEnabled &&
      (typeof Notification === 'undefined' || Notification.permission !== 'granted')
    ) {
      appSettings.notificationsEnabled = false;
    }

    const applyAppSettings = () => {
      document.documentElement.dataset.appTextSize = appSettings.textSize;
      document.documentElement.classList.toggle('app-high-contrast', appSettings.highContrast);
      document.documentElement.classList.toggle('app-reduce-motion', appSettings.reduceMotion);
    };

    applyAppSettings();

    const settingsOverlay = document.createElement('div');
    settingsOverlay.className = 'app-settings-overlay';
    settingsOverlay.id = 'appSettingsOverlay';
    settingsOverlay.hidden = true;
    settingsOverlay.innerHTML = `
      <section class="app-settings-panel" role="dialog" aria-modal="true" aria-labelledby="appSettingsTitle">
        <header class="app-settings-header">
          <div>
            <span class="app-settings-kicker">Personaliza tu experiencia</span>
            <h2 id="appSettingsTitle">Configuración</h2>
          </div>
          <button class="app-settings-close" type="button" aria-label="Cerrar configuración">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="app-settings-content">
          <fieldset class="app-settings-group">
            <legend><i class="fa-solid fa-text-height" aria-hidden="true"></i> Tamaño del texto</legend>
            <label class="app-settings-select-label" for="appTextSize">Elige el tamaño que te resulte más cómodo</label>
            <select id="appTextSize" name="textSize">
              <option value="normal">Normal</option>
              <option value="large">Grande</option>
              <option value="larger">Muy grande</option>
            </select>
          </fieldset>
          <fieldset class="app-settings-group">
            <legend><i class="fa-solid fa-universal-access" aria-hidden="true"></i> Accesibilidad</legend>
            <label class="app-settings-switch" for="appHighContrast">
              <span><strong>Mayor contraste</strong><small>Resalta enlaces, controles y límites visuales.</small></span>
              <input id="appHighContrast" name="highContrast" type="checkbox">
              <span class="app-settings-switch-ui" aria-hidden="true"></span>
            </label>
            <label class="app-settings-switch" for="appReduceMotion">
              <span><strong>Reducir movimiento</strong><small>Desactiva animaciones y transiciones decorativas.</small></span>
              <input id="appReduceMotion" name="reduceMotion" type="checkbox">
              <span class="app-settings-switch-ui" aria-hidden="true"></span>
            </label>
          </fieldset>
          <fieldset class="app-settings-group">
            <legend><i class="fa-solid fa-wifi" aria-hidden="true"></i> Conexión y datos</legend>
            <label class="app-settings-switch" for="appDataSaver">
              <span><strong>Ahorrar datos</strong><small>Retrasa la carga de imágenes hasta que estén cerca de la pantalla.</small></span>
              <input id="appDataSaver" name="dataSaver" type="checkbox">
              <span class="app-settings-switch-ui" aria-hidden="true"></span>
            </label>
            <p class="app-settings-status" id="appConnectionStatus" role="status" aria-live="polite"></p>
            <button class="app-settings-action" id="appDownloadOffline" type="button">
              <i class="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i> Preparar guías para uso sin conexión
            </button>
            <p class="app-settings-status" id="appOfflineStatus" role="status" aria-live="polite"></p>
          </fieldset>
          <fieldset class="app-settings-group">
            <legend><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> Mi municipio</legend>
            <label class="app-settings-select-label" for="appPreferredMunicipality">Usa este municipio como referencia al solicitar un servicio</label>
            <select id="appPreferredMunicipality" name="preferredMunicipality">
              <option value="">Sin municipio seleccionado</option>
              ${municipalities.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}
            </select>
          </fieldset>
          <fieldset class="app-settings-group">
            <legend><i class="fa-solid fa-bell" aria-hidden="true"></i> Avisos</legend>
            <label class="app-settings-switch" for="appNotifications">
              <span><strong>Nuevas publicaciones</strong><small>Avisos del navegador mientras la web está abierta. No son alertas oficiales de emergencia.</small></span>
              <input id="appNotifications" name="notificationsEnabled" type="checkbox">
              <span class="app-settings-switch-ui" aria-hidden="true"></span>
            </label>
            <p class="app-settings-status" id="appNotificationsStatus" role="status" aria-live="polite"></p>
          </fieldset>
          <section class="app-settings-group" aria-labelledby="appStorageTitle">
            <h3 class="app-settings-subtitle" id="appStorageTitle"><i class="fa-solid fa-database" aria-hidden="true"></i> Almacenamiento y privacidad</h3>
            <p class="app-settings-status" id="appStorageStatus" role="status" aria-live="polite">Consulta el espacio usado por este sitio.</p>
            <div class="app-settings-actions">
              <button class="app-settings-action" id="appRefreshStorage" type="button">Consultar espacio</button>
              <button class="app-settings-action" id="appPersistentStorage" type="button">Proteger datos sin conexión</button>
              <button class="app-settings-action" id="appClearCache" type="button">Borrar contenido descargado</button>
              <button class="app-settings-action app-settings-danger" id="appClearLocalData" type="button">Borrar datos de este dispositivo</button>
            </div>
            <p class="app-settings-help">Se borran solo datos locales de PC Apure. No se eliminan reportes ni información guardada en los sistemas institucionales. Los permisos de ubicación y avisos se administran desde el navegador.</p>
          </section>
          <p class="app-settings-status" id="appSettingsStatus" role="status" aria-live="polite">Los cambios se aplican automáticamente.</p>
        </div>
        <footer class="app-settings-footer">
          <button class="app-settings-reset" type="button"><i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i> Restaurar valores iniciales</button>
        </footer>
      </section>`;
    document.body.appendChild(settingsOverlay);
    bindServiceMunicipality();

    const settingsToggle = document.createElement('button');
    settingsToggle.className = 'app-settings-toggle';
    settingsToggle.id = 'appSettingsToggle';
    settingsToggle.type = 'button';
    settingsToggle.setAttribute('aria-label', 'Abrir configuración de accesibilidad');
    settingsToggle.setAttribute('aria-controls', settingsOverlay.id);
    settingsToggle.setAttribute('aria-expanded', 'false');
    settingsToggle.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
    settingsToggle.title = 'Configuración';
    document.body.appendChild(settingsToggle);

    const textSizeSelect = settingsOverlay.querySelector('#appTextSize');
    const highContrastInput = settingsOverlay.querySelector('#appHighContrast');
    const reduceMotionInput = settingsOverlay.querySelector('#appReduceMotion');
    const dataSaverInput = settingsOverlay.querySelector('#appDataSaver');
    const municipalitySelect = settingsOverlay.querySelector('#appPreferredMunicipality');
    const notificationsInput = settingsOverlay.querySelector('#appNotifications');
    const settingsStatus = settingsOverlay.querySelector('#appSettingsStatus');
    const connectionStatus = settingsOverlay.querySelector('#appConnectionStatus');
    const offlineStatus = settingsOverlay.querySelector('#appOfflineStatus');
    const notificationsStatus = settingsOverlay.querySelector('#appNotificationsStatus');
    const storageStatus = settingsOverlay.querySelector('#appStorageStatus');
    const settingsClose = settingsOverlay.querySelector('.app-settings-close');
    const settingsReset = settingsOverlay.querySelector('.app-settings-reset');
    const originalImageAttributes = new WeakMap();
    let offlinePrepared = false;
    let offlineDownloadSummary = '';

    const syncSettingsControls = () => {
      textSizeSelect.value = appSettings.textSize;
      highContrastInput.checked = appSettings.highContrast;
      reduceMotionInput.checked = appSettings.reduceMotion;
      dataSaverInput.checked = appSettings.dataSaver;
      municipalitySelect.value = appSettings.preferredMunicipality;
      notificationsInput.checked = appSettings.notificationsEnabled;
    };
    syncSettingsControls();

    const saveAppSettings = () => {
      applyAppSettings();
      applyDataSaver();
      try {
        localStorage.setItem(appSettingsKey, JSON.stringify(appSettings));
        settingsStatus.textContent = 'Preferencias guardadas en este dispositivo.';
      } catch (error) {
        console.error('No se pudieron guardar las preferencias de la aplicación:', error);
        settingsStatus.textContent = 'No se pudieron guardar las preferencias. Se aplicarán mientras esta página esté abierta.';
      }
      document.dispatchEvent(new CustomEvent('pcad-app-settings-change', {
        detail: { ...appSettings }
      }));
    };

    const updateConnectionStatus = () => {
      const connection = navigator.connection;
      const saveDataAvailable = Boolean(connection?.saveData);
      connectionStatus.textContent = navigator.onLine
        ? `Conexión: en línea${connection?.effectiveType ? ` (${connection.effectiveType})` : ''}${saveDataAvailable ? ' · ahorro de datos del dispositivo activo' : ''}.`
        : 'Sin conexión. Solo estarán disponibles páginas y recursos guardados previamente.';
    };

    const updateStorageStatus = async () => {
      if (!navigator.storage?.estimate) {
        storageStatus.textContent = 'Este navegador no permite consultar el espacio utilizado.';
        return;
      }

      storageStatus.textContent = 'Consultando el espacio utilizado…';
      try {
        const estimate = await navigator.storage.estimate();
        const usage = Number(estimate.usage || 0);
        const quota = Number(estimate.quota || 0);
        const megabytes = value => `${(value / 1024 / 1024).toFixed(1)} MB`;
        const appCacheCount = window.caches
          ? (await caches.keys()).filter(name => name.startsWith('pcad-apure-')).length
          : 0;
        storageStatus.textContent = `Este sitio usa ${megabytes(usage)} de ${quota ? megabytes(quota) : 'espacio disponible'}. Cachés de PC Apure: ${appCacheCount}.`;
      } catch (error) {
        console.error('No se pudo consultar el almacenamiento del sitio:', error);
        storageStatus.textContent = 'No se pudo consultar el almacenamiento. Inténtalo de nuevo.';
      }
    };

    const sendServiceWorkerMessage = async (message, timeout = 30000) => {
      if (!('serviceWorker' in navigator) || !('MessageChannel' in window)) {
        throw new Error('El service worker no está disponible. Abre la app desde HTTPS o localhost y vuelve a intentarlo.');
      }

      const registration = await navigator.serviceWorker.ready;
      const worker = navigator.serviceWorker.controller || registration.active;
      if (!worker) throw new Error('El service worker todavía se está iniciando. Recarga la página e inténtalo de nuevo.');

      return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = window.setTimeout(() => {
          channel.port1.close();
          reject(new Error('La operación tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.'));
        }, timeout);
        channel.port1.onmessage = event => {
          window.clearTimeout(timer);
          channel.port1.close();
          if (event.data?.success) resolve(event.data);
          else reject(new Error(event.data?.error || 'No se pudo completar la operación.'));
        };
        worker.postMessage(message, [channel.port2]);
      });
    };

    const clearAppCaches = async () => {
      if (!window.caches) return 0;
      const cacheNames = (await caches.keys()).filter(name => name.startsWith('pcad-apure-'));
      const results = await Promise.all(cacheNames.map(name => caches.delete(name)));
      return results.filter(Boolean).length;
    };

    const updateOfflineStatus = () => {
      const supported = 'serviceWorker' in navigator && /^https?:$/.test(window.location.protocol);
      const onlineText = offlinePrepared
        ? 'Las guías están preparadas para consulta sin conexión.'
        : navigator.onLine
          ? 'Con conexión; puedes descargar guías.'
          : 'Sin conexión; no se pueden descargar guías ahora.';
      offlineStatus.textContent = supported
        ? `${offlineDownloadSummary ? `${offlineDownloadSummary} ` : ''}${onlineText} Las publicaciones en vivo y los mapas externos requieren internet.`
        : 'El modo sin conexión requiere abrir el sitio mediante HTTPS o localhost.';
      settingsOverlay.querySelector('#appDownloadOffline').disabled = !supported || !navigator.onLine;
    };

    const updateNotificationsStatus = () => {
      if (!('Notification' in window)) {
        notificationsStatus.textContent = 'Este navegador no admite notificaciones.';
      } else if (Notification.permission === 'denied') {
        notificationsStatus.textContent = 'El navegador bloqueó los avisos. Cambia el permiso desde la configuración del navegador.';
      } else if (appSettings.notificationsEnabled && Notification.permission === 'granted') {
        notificationsStatus.textContent = 'Avisos de nuevas publicaciones activados mientras la web está abierta.';
      } else if (Notification.permission === 'granted') {
        notificationsStatus.textContent = 'Avisos desactivados. Actívalos para recibir nuevas publicaciones mientras la web está abierta.';
      } else {
        notificationsStatus.textContent = 'Necesitan permiso del navegador y conexión para recibir publicaciones nuevas.';
      }
    };

    const applyDataSaver = () => {
      const shouldSaveData = appSettings.dataSaver || Boolean(navigator.connection?.saveData);
      const configureImage = image => {
        if (!originalImageAttributes.has(image)) {
          originalImageAttributes.set(image, {
            loading: image.getAttribute('loading'),
            decoding: image.getAttribute('decoding'),
            fetchpriority: image.getAttribute('fetchpriority')
          });
        }

        if (shouldSaveData && !image.matches('.logo-pc, .footer-logo, .muro-profile-avatar')) {
          image.loading = 'lazy';
          image.decoding = 'async';
          image.fetchPriority = 'low';
          return;
        }

        const original = originalImageAttributes.get(image);
        for (const [attribute, value] of Object.entries(original)) {
          if (value === null) image.removeAttribute(attribute);
          else image.setAttribute(attribute, value);
        }
      };
      document.querySelectorAll('img').forEach(configureImage);

      if (!document.body.dataset.dataSaverObserver && 'MutationObserver' in window) {
        const observer = new MutationObserver(records => records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (node instanceof HTMLImageElement) configureImage(node);
            else if (node instanceof Element) node.querySelectorAll('img').forEach(configureImage);
          });
        }));
        observer.observe(document.body, { childList: true, subtree: true });
        document.body.dataset.dataSaverObserver = 'true';
      }
    };
    applyDataSaver();

    const refreshServiceMunicipality = () => {
      bindServiceMunicipality();
    };
    refreshServiceMunicipality();

    const closeSettings = () => {
      settingsOverlay.hidden = true;
      settingsToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('app-settings-open');
      settingsToggle.focus();
    };

    settingsToggle.addEventListener('click', () => {
      settingsOverlay.hidden = false;
      settingsToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('app-settings-open');
      settingsClose.focus();
    });
    settingsClose.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', event => {
      if (event.target === settingsOverlay) closeSettings();
    });
    settingsOverlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeSettings();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = [...settingsOverlay.querySelectorAll('button, select, input')]
          .filter(element => !element.disabled);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    });
    textSizeSelect.addEventListener('change', () => {
      appSettings.textSize = textSizeSelect.value;
      saveAppSettings();
    });
    highContrastInput.addEventListener('change', () => {
      appSettings.highContrast = highContrastInput.checked;
      saveAppSettings();
    });
    reduceMotionInput.addEventListener('change', () => {
      appSettings.reduceMotion = reduceMotionInput.checked;
      saveAppSettings();
    });
    dataSaverInput.addEventListener('change', () => {
      appSettings.dataSaver = dataSaverInput.checked;
      saveAppSettings();
    });
    municipalitySelect.addEventListener('change', () => {
      appSettings.preferredMunicipality = municipalitySelect.value;
      saveAppSettings();
      refreshServiceMunicipality();
    });
    settingsOverlay.querySelector('#appDownloadOffline').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      offlineStatus.textContent = 'Preparando guías para consulta sin conexión…';
      try {
            const result = await sendServiceWorkerMessage({ type: 'CACHE_OFFLINE_CONTENT' }, 60000);
        offlinePrepared = true;
        offlineDownloadSummary = result.failed
          ? `Se prepararon ${result.cached} recursos; ${result.failed} no se pudieron descargar.`
          : `Se prepararon ${result.cached} recursos para consulta sin conexión.`;
      } catch (error) {
        console.error('No se pudieron preparar las guías para uso sin conexión:', error);
        offlineStatus.textContent = error.message;
      } finally {
        updateOfflineStatus();
      }
    });
    settingsOverlay.querySelector('#appRefreshStorage').addEventListener('click', updateStorageStatus);
    const updateOfflineCacheStatus = async () => {
      if (!window.caches) return;
      try {
        if (await caches.has('pcad-apure-offline-v1')) {
          const cache = await caches.open('pcad-apure-offline-v1');
          const cachedResources = await cache.keys();
          offlinePrepared = cachedResources.length > 0;
          offlineDownloadSummary = offlinePrepared
            ? `${cachedResources.length} recursos guardados.`
            : '';
          updateOfflineStatus();
        }
      } catch (error) {
        console.error('No se pudo consultar el contenido sin conexión:', error);
        offlineStatus.textContent = 'No se pudo consultar el contenido guardado.';
      }
    };
    updateOfflineCacheStatus();
    settingsOverlay.querySelector('#appPersistentStorage').addEventListener('click', async event => {
      const button = event.currentTarget;
      if (!navigator.storage?.persist) {
        storageStatus.textContent = 'Este navegador no permite solicitar almacenamiento persistente.';
        return;
      }
      button.disabled = true;
      try {
        const persisted = await navigator.storage.persist();
        storageStatus.textContent = persisted
          ? 'El navegador protegerá los datos de este sitio frente al borrado automático cuando sea posible.'
          : 'El navegador no concedió almacenamiento persistente. Puedes seguir usando la app.';
      } catch (error) {
        console.error('No se pudo solicitar almacenamiento persistente:', error);
        storageStatus.textContent = 'No se pudo solicitar almacenamiento persistente.';
      } finally {
        button.disabled = false;
      }
    });
    settingsOverlay.querySelector('#appClearCache').addEventListener('click', async () => {
      if (!window.confirm('Se borrarán las páginas y guías guardadas de PC Apure en este dispositivo. ¿Continuar?')) return;
      try {
        const deleted = await clearAppCaches();
        offlinePrepared = false;
        offlineDownloadSummary = '';
        offlineStatus.textContent = `Se borraron ${deleted} cachés. Las páginas volverán a guardarse al visitarlas con conexión.`;
        await updateStorageStatus();
      } catch (error) {
        console.error('No se pudo borrar el contenido descargado:', error);
        offlineStatus.textContent = 'No se pudo borrar el contenido descargado.';
      }
    });
    settingsOverlay.querySelector('#appClearLocalData').addEventListener('click', async () => {
      if (!window.confirm('Se borrarán las preferencias, reacciones guardadas y cachés de PC Apure de este dispositivo. Los datos enviados a sistemas institucionales no se borrarán. ¿Continuar?')) return;
      try {
        const localKeys = Object.keys(localStorage).filter(key =>
          key === appSettingsKey || key.startsWith('muro-reaction-')
        );
        localKeys.forEach(key => localStorage.removeItem(key));
        appSettings = { ...defaultAppSettings };
        syncSettingsControls();
        applyAppSettings();
        applyDataSaver();
        refreshServiceMunicipality();
        toggleAppNotifications?.(false);
        document.dispatchEvent(new CustomEvent('pcad-app-settings-change', {
          detail: { ...appSettings }
        }));
        settingsStatus.textContent = 'Se borraron las preferencias y datos locales de PC Apure.';
        notificationsStatus.textContent = 'Avisos desactivados.';
        offlineStatus.textContent = 'El contenido descargado se borró.';
        offlinePrepared = false;
        offlineDownloadSummary = '';
        await clearAppCaches();
        await updateStorageStatus();
      } catch (error) {
        console.error('No se pudieron borrar los datos locales de PC Apure:', error);
        settingsStatus.textContent = 'No se pudieron borrar todos los datos. Inténtalo de nuevo.';
      }
    });
    notificationsInput.addEventListener('change', async () => {
      if (!notificationsInput.checked) {
        appSettings.notificationsEnabled = false;
        toggleAppNotifications?.(false);
        saveAppSettings();
        updateNotificationsStatus();
        return;
      }

      if (!('Notification' in window)) {
        notificationsInput.checked = false;
        notificationsStatus.textContent = 'Este navegador no admite notificaciones.';
        return;
      }
      try {
        const permission = Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
        appSettings.notificationsEnabled = permission === 'granted';
        notificationsInput.checked = appSettings.notificationsEnabled;
        let listenerUnavailable = false;
        if (appSettings.notificationsEnabled && toggleAppNotifications?.(true) === false) {
          appSettings.notificationsEnabled = false;
          notificationsInput.checked = false;
          notificationsStatus.textContent = 'No se pudo conectar con las publicaciones. Inténtalo más tarde.';
          listenerUnavailable = true;
        }
        saveAppSettings();
        if (!listenerUnavailable) updateNotificationsStatus();
      } catch (error) {
        console.error('No se pudo solicitar permiso para las notificaciones:', error);
        notificationsInput.checked = false;
        notificationsStatus.textContent = 'No se pudo activar el permiso de avisos.';
      }
    });
    settingsOverlay.querySelector('#appRefreshStorage').click();
    updateConnectionStatus();
    updateOfflineStatus();
    updateNotificationsStatus();
    window.addEventListener('online', () => {
      updateConnectionStatus();
      updateOfflineStatus();
    });
    window.addEventListener('offline', () => {
      updateConnectionStatus();
      updateOfflineStatus();
    });
    navigator.connection?.addEventListener?.('change', () => {
      updateConnectionStatus();
      applyDataSaver();
    });
    settingsReset.addEventListener('click', () => {
      appSettings = { ...defaultAppSettings };
      syncSettingsControls();
      saveAppSettings();
      refreshServiceMunicipality();
      toggleAppNotifications?.(false);
      updateNotificationsStatus();
      settingsStatus.textContent = 'Se restauraron las preferencias iniciales.';
    });
  }

  const heroHeader = document.querySelector('.hero-banner > .navbar');
  if (heroHeader) heroHeader.parentElement.before(heroHeader);

  document.querySelectorAll('.navbar, .simple-header').forEach(header => {
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

  if (!document.querySelector('script[data-site-search]')) {
    const siteSearchScript = document.createElement('script');
    siteSearchScript.src = 'site-search.js';
    siteSearchScript.dataset.siteSearch = 'true';
    siteSearchScript.async = true;
    siteSearchScript.onerror = () => {
      console.error('No se pudo cargar el buscador general del sitio.');
    };
    document.head.appendChild(siteSearchScript);
  }

  if (pageFileName === 'educacion.html') {
    const educationHero = document.querySelector('.education-page .info-hero');
    const activityLink = educationHero?.querySelector('a[href="#solicitar-actividad"]');
    if (educationHero && activityLink && !educationHero.querySelector('.education-book-link')) {
      const bookLink = document.createElement('a');
      bookLink.className = 'btn-pill education-hero-cta education-book-link';
      bookLink.href = 'libro-pcad.html';
      bookLink.setAttribute('aria-label', 'Abrir el Libro Azul PCAD para estudiar página por página');
      bookLink.innerHTML = '<i class="fa-solid fa-book-open-reader education-book-icon" aria-hidden="true"></i><span>Estudiar con el Libro Azul PCAD</span><i class="fa-solid fa-arrow-right education-book-arrow" aria-hidden="true"></i>';
      activityLink.after(bookLink);
    }
  }

  if (
    pageFileName !== 'admin.html' &&
    !['', 'index.html'].includes(pageFileName) &&
    !document.querySelector('.risk-guide-nav, .operations-guide-nav, .page-section-nav')
  ) {
    const contentRoot = document.querySelector('main') || document.body;
    const topLevelSections = [...contentRoot.querySelectorAll('section')].filter(section =>
      !section.parentElement.closest('section') &&
      !section.matches('.info-hero, .group-hero, .publications-hero, .hero-banner')
    );
    const destinations = [];

    function addDestination(element, heading) {
      const label = heading?.innerText?.replace(/\s+/g, ' ').trim();
      if (!label) return;

      if (!element.id) {
        const slug = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seccion';
        const baseId = `seccion-${slug}`;
        let id = baseId;
        let suffix = 2;
        while (document.getElementById(id)) {
          id = `${baseId}-${suffix}`;
          suffix += 1;
        }
        element.id = id;
      }

      element.classList.add('page-section-target');
      destinations.push({ id: element.id, label });
    }

    topLevelSections.forEach(section => {
      const cards = [
        ...section.querySelectorAll(':scope > article, :scope > a.contact-card, :scope > div > article')
      ];
      const titledCards = cards
        .map(card => ({ card, heading: card.querySelector('h2, h3, h4') }))
        .filter(item => item.heading?.innerText?.trim());

      if (topLevelSections.length <= 2 && titledCards.length >= 2 && titledCards.length <= 8) {
        titledCards.forEach(({ card, heading }) => addDestination(card, heading));
        return;
      }

      addDestination(section, section.querySelector('h2, h3'));
    });

    if (destinations.length >= 1) {
      const sectionNav = document.createElement('nav');
      sectionNav.className = 'page-section-nav';
      sectionNav.setAttribute('aria-label', 'Navegación rápida');

      destinations.forEach(({ id, label }) => {
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = label;
        sectionNav.appendChild(link);
      });

      const hero = [...contentRoot.children].find(child =>
        child.matches('.info-hero, .group-hero, .publications-hero, .hero-banner')
      );
      if (hero) {
        hero.after(sectionNav);
      } else if (topLevelSections[0]) {
        topLevelSections[0].before(sectionNav);
      }
    }
  }

  const sectionNav = document.querySelector('.page-section-nav, .risk-guide-nav, .operations-guide-nav');
  if (sectionNav && !sectionNav.parentElement.classList.contains('page-section-panel')) {
    const navPanel = document.createElement('section');
    navPanel.className = 'page-section-panel';
    navPanel.setAttribute('aria-labelledby', 'page-section-nav-title');

    const navTitle = document.createElement('h2');
    navTitle.id = 'page-section-nav-title';
    navTitle.className = 'page-section-nav-title';
    navTitle.textContent = 'Navegación rápida';

    sectionNav.removeAttribute('aria-label');
    sectionNav.setAttribute('aria-labelledby', navTitle.id);
    sectionNav.before(navPanel);
    navPanel.append(navTitle, sectionNav);
  }

  document.querySelectorAll('a[aria-label="Facebook"], a .fa-facebook-f').forEach(element => {
    const link = element.closest('a');
    if (!link) return;
    link.href = 'https://www.facebook.com/profile.php?id=61556602676193';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  document.querySelectorAll('a[aria-label="Instagram"], a .fa-instagram').forEach(element => {
    const link = element.closest('a');
    if (!link) return;
    link.href = 'https://www.instagram.com/pcivilapure/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

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

  if (!isInformationOnlyPage && !document.getElementById('serviceModalOverlay') && !window.location.pathname.toLowerCase().endsWith('admin.html')) {
    const servicePanel = document.createElement('div');
    servicePanel.innerHTML = `
      <div class="fb-modal-overlay" id="serviceModalOverlay">
        <div class="fb-modal-card service-modal-card">
          <div class="fb-modal-header">
            <h3>Solicitar Servicio</h3>
            <button class="fb-modal-close" id="closeServiceModalBtn" type="button" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <form class="service-form" id="serviceRequestForm">
            <div class="fb-modal-body">
              <p class="service-intro">Completa tus datos y describe el servicio que necesitas. Este formulario no es para emergencias.</p>
              <label for="serviceName">Nombre y apellido</label>
              <input id="serviceName" name="name" type="text" autocomplete="name" required>
              <label for="servicePhone">Teléfono de contacto</label>
              <input id="servicePhone" name="phone" type="tel" autocomplete="tel" required>
              <label for="serviceType">Tipo de servicio</label>
              <select id="serviceType" name="service" required>
                <option value="">Selecciona una opción</option>
                <option>Atención prehospitalaria</option>
                <option>Evaluación de riesgos</option>
                <option>Inspección preventiva de inmueble</option>
                <option>Evaluación de riesgos comunitarios</option>
                <option>Capacitación comunitaria</option>
                <option>Simulacro de evacuación</option>
                <option>Capacitación en primeros auxilios</option>
                <option>Charla de prevención</option>
                <option>Otra actividad educativa</option>
                <option>Asesoría en prevención</option>
                <option>Otro servicio</option>
              </select>
              <label for="serviceMunicipality">Municipio (opcional)</label>
              <select id="serviceMunicipality" name="municipality">
                <option value="">Selecciona un municipio</option>
                ${municipalities.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}
              </select>
              <label for="serviceDetails">Información de la solicitud</label>
              <textarea id="serviceDetails" name="details" rows="4" required placeholder="Describe qué servicio necesitas y agrega los detalles importantes..."></textarea>
            </div>
            <div class="fb-modal-footer">
              <button class="fb-submit-btn" id="sendServiceRequestBtn" type="submit"><i class="fa-brands fa-whatsapp"></i> Solicitar por WhatsApp</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(servicePanel.firstElementChild);
    bindServiceMunicipality();
  }

  if (!window.location.pathname.toLowerCase().endsWith('admin.html') && !document.querySelector('.float-emergency-btn')) {
    const emergencyLink = document.createElement('a');
    emergencyLink.className = 'float-emergency-btn';
    emergencyLink.id = 'floatEmergencyBtn';
    emergencyLink.href = '#';
    emergencyLink.title = 'Reportar emergencia';
    emergencyLink.setAttribute('aria-label', 'Abrir panel para reportar emergencia');
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

  // Firebase is optional while the app shell is being used offline.
  const firebaseAvailable = typeof firebase !== 'undefined';
  if (firebaseAvailable && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = firebaseAvailable && typeof firebase.firestore === 'function' ? firebase.firestore() : null;
  window.db = db;

  let stopNotificationListener = null;
  toggleAppNotifications = enabled => {
    if (!enabled) {
      stopNotificationListener?.();
      stopNotificationListener = null;
      return true;
    }
    if (!db || !('Notification' in window) || Notification.permission !== 'granted') return false;
    if (stopNotificationListener) return true;

    let isInitialSnapshot = true;
    stopNotificationListener = db.collection('muro')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .onSnapshot(snapshot => {
        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        snapshot.docChanges().filter(change => change.type === 'added').forEach(change => {
          const publication = change.doc.data();
          const title = String(publication.title || 'Nueva publicación').slice(0, 100);
          const body = String(publication.content || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 180);
          try {
            const notice = new Notification(title, {
              body: body || 'Consulta la nueva publicación de Protección Civil Apure.',
              icon: 'img/pc logo.png',
              tag: `pcad-publicacion-${change.doc.id}`
            });
            notice.addEventListener('click', () => {
              const publicationUrl = new URL('publicaciones.html', window.location.href);
              publicationUrl.searchParams.set('publicacion', change.doc.id);
              window.focus();
              window.location.href = publicationUrl.href;
              notice.close();
            });
          } catch (error) {
            console.error('No se pudo mostrar el aviso de una nueva publicación:', error);
          }
        });
      }, error => {
        console.error('No se pudieron escuchar nuevas publicaciones para avisos:', error);
        stopNotificationListener = null;
      });
    return true;
  };
  if (appSettings.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    toggleAppNotifications(true);
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    const hadServiceWorkerController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadServiceWorkerController) {
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(registration => {
      const activateWaitingWorker = worker => {
        if (worker?.state === 'installed' && registration.active) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      };
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        installingWorker?.addEventListener('statechange', () => {
          activateWaitingWorker(installingWorker);
        });
      });
      registration.update().catch(error => {
        console.error('No se pudo comprobar si hay una actualización del sitio:', error);
      });

      activateWaitingWorker(registration.waiting);
    }).catch(error => {
      console.error('No se pudo registrar el service worker:', error);
    });
  }

  const headerNavLinks = document.getElementById('navLinks');
  headerNavLinks?.querySelectorAll('#requestServiceNav, #reportEmergencyNav').forEach(button => {
    button.closest('li')?.remove();
  });
  if (pageFileName === 'servicios.html' && headerNavLinks) {
    headerNavLinks.querySelectorAll('a[href="index.html#solicitar"], a[href="tel:911"]').forEach(link => {
      link.closest('li')?.remove();
    });
    headerNavLinks.querySelectorAll(':scope > li:empty').forEach(item => item.remove());
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

  const navLinksContainer = document.getElementById('navLinks');
  const hasSharedNavHeader = navLinksContainer?.closest('.shared-nav-header');
  if (!hasSharedNavHeader) {
    if (navLinksContainer && !navLinksContainer.querySelector('.nav-dropdown')) {
      const divisionsItem = document.createElement('li');
      divisionsItem.className = 'nav-dropdown';
      divisionsItem.innerHTML = `
        <button class="nav-dropdown-toggle" type="button" aria-expanded="false">
          <span>Divisiones</span>
          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="nav-dropdown-menu">
          <a href="direccion.html">Dirección</a>
          <a href="operaciones.html">Operaciones</a>
          <a href="rrhh.html">Recursos Humanos</a>
          <a href="gestion-riesgo.html">Gestión de riesgo</a>
          <a href="educacion.html">Educación</a>
          <a href="libro-pcad.html">Libro de estudio PCAD</a>
          <a href="prehospitalario.html">Prehospitalaria</a>
        </div>`;
      navLinksContainer.insertBefore(divisionsItem, navLinksContainer.children[1] || null);
    }

    document.querySelectorAll('.nav-dropdown-menu').forEach(menu => {
      let studyLink = menu.querySelector('a[href="libro-pcad.html"]');
      if (!studyLink) {
        studyLink = document.createElement('a');
        menu.appendChild(studyLink);
      }
      studyLink.href = 'libro-pcad.html';
      studyLink.textContent = 'Libro de estudio PCAD';
    });

    navLinksContainer?.querySelectorAll('.guard-groups-dropdown, a[href^="grupo-guardia-"]').forEach(item => {
      (item.matches('a') ? item.closest('li') : item)?.remove();
    });

    if (pageFileName !== 'index.html' && navLinksContainer && !navLinksContainer.querySelector('.administrative-nav-link')) {
      const administrativeItem = document.createElement('li');
      administrativeItem.className = 'administrative-nav-link';
      administrativeItem.innerHTML = '<a href="index-grupos-guardia.html">Administrativos</a>';
      navLinksContainer.appendChild(administrativeItem);
    }

    if (navLinksContainer) {
      let socialItem = navLinksContainer.querySelector('.social-nav-item');
      if (!socialItem) {
        socialItem = document.createElement('li');
        socialItem.className = 'social-nav-item';
      }
      socialItem.innerHTML = `
        <div class="social-icons">
          <a href="#" aria-label="TikTok" title="TikTok"><i class="fa-brands fa-tiktok" aria-hidden="true"></i></a>
          <a href="#" aria-label="YouTube" title="YouTube"><i class="fa-brands fa-youtube" aria-hidden="true"></i></a>
          <a href="https://www.facebook.com/profile.php?id=61556602676193" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a>
          <a href="https://www.instagram.com/pcivilapure/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><i class="fa-brands fa-instagram" aria-hidden="true"></i></a>
        </div>`;
      navLinksContainer.appendChild(socialItem);
    }

    if (navLinksContainer) {
      const legacyItems = [...navLinksContainer.children].filter(item => {
        const href = item.querySelector(':scope > a')?.getAttribute('href');
        return ['servicios.html', 'contacto.html'].includes(href);
      });
      legacyItems.forEach(item => item.remove());

      const ensureHeaderLink = (href, label) => {
        const existingLink = [...navLinksContainer.querySelectorAll(':scope > li > a')]
          .find(link => link.getAttribute('href') === href);
        if (existingLink) return existingLink.closest('li');

        const item = document.createElement('li');
        item.innerHTML = `<a href="${href}">${label}</a>`;
        navLinksContainer.appendChild(item);
        return item;
      };

      ensureHeaderLink('publicaciones.html', 'Publicaciones');
      if (pageFileName !== 'articulos.html') {
        ensureHeaderLink('articulos.html', 'Artículos');
      }
      ensureHeaderLink('quienes-somos.html', 'Quiénes Somos');

      const orderedItems = [
        navLinksContainer.querySelector(':scope > li > a[href="index.html"], :scope > li > a[href="#inicio"]')?.closest('li'),
        navLinksContainer.querySelector(':scope > li.nav-dropdown'),
        navLinksContainer.querySelector(':scope > li > a[href="articulos.html"]')?.closest('li'),
        navLinksContainer.querySelector(':scope > li > a[href="publicaciones.html"]')?.closest('li'),
        navLinksContainer.querySelector(':scope > li > a[href="quienes-somos.html"]')?.closest('li'),
        navLinksContainer.querySelector(':scope > li.administrative-nav-link'),
        navLinksContainer.querySelector(':scope > li.social-nav-item')
      ].filter((item, index, items) => item && items.indexOf(item) === index);

      orderedItems.forEach(item => navLinksContainer.appendChild(item));
    }
  }

  const navDropdowns = document.querySelectorAll('.nav-dropdown');
  navDropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const isOpen = dropdown.classList.contains('open');
      navDropdowns.forEach(item => {
        item.classList.remove('open');
        const itemToggle = item.querySelector('.nav-dropdown-toggle');
        if (itemToggle) itemToggle.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        dropdown.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-dropdown')) {
      navDropdowns.forEach(dropdown => {
        dropdown.classList.remove('open');
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
    if (!event.target.closest('.simple-header, .navbar')) {
      document.getElementById('navLinks')?.classList.remove('active');
    }
  });

  const overlayElements = () => [
    fbModalOverlay,
    serviceModalOverlay,
    imageViewerOverlay,
    postDetailOverlay
  ].filter(Boolean);

  function showOverlay(overlay) {
    if (!overlay) return;
    overlay.classList.add('active');
    if (history.state?.pcadOverlay !== overlay.id) {
      history.pushState({ pcadOverlay: overlay.id }, '', window.location.href);
    }
  }

  function hideOverlay(overlay, fromHistory = false) {
    if (!overlay) return;
    overlay.classList.remove('active');
    if (!fromHistory && history.state?.pcadOverlay === overlay.id) history.back();
  }

  function resetOverlaysFromHistory() {
    overlayElements().forEach(overlay => overlay.classList.remove('active'));
    if (imageViewerImage) imageViewerImage.removeAttribute('src');
    if (postDetailGallery) postDetailGallery.innerHTML = '';
    if (postDetailPdf) postDetailPdf.innerHTML = '';
  }

  window.addEventListener('popstate', resetOverlaysFromHistory);

  // ABRIR Y CERRAR MODAL
  function openModal(event) {
    if (event) event.preventDefault();
    showOverlay(fbModalOverlay);
  }

  function closeModal() {
    hideOverlay(fbModalOverlay);
  }

  function callEmergency(event) {
    event.preventDefault();
    window.location.href = 'tel:911';
  }

  if (reportEmergencyNav) reportEmergencyNav.addEventListener('click', (event) => {
    event.preventDefault();
    openModal(event);
  });
  document.querySelectorAll('.navbar a[href="tel:911"]').forEach(link => {
    link.addEventListener('click', callEmergency);
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

  function openServiceModal(preselectedType = '') {
    const serviceTypeField = document.getElementById('serviceType');
    const serviceDetailsField = document.getElementById('serviceDetails');
    const municipalityField = document.getElementById('serviceMunicipality');

    if (serviceTypeField) {
      serviceTypeField.value = preselectedType || serviceTypeField.value || '';
    }
    if (municipalityField && !municipalityField.value) {
      municipalityField.value = appSettings.preferredMunicipality;
    }

    showOverlay(serviceModalOverlay);

    if (serviceDetailsField) {
      requestAnimationFrame(() => serviceDetailsField.focus());
    }
  }

  function closeServiceModal() {
    hideOverlay(serviceModalOverlay);
  }

  if (requestServiceNav) requestServiceNav.addEventListener('click', () => openServiceModal());
  document.querySelectorAll('.service-card-action').forEach(button => {
    button.addEventListener('click', () => {
      const selectedType = button.dataset.serviceType || '';
      openServiceModal(selectedType);
    });
  });
  if (closeServiceModalBtn) closeServiceModalBtn.addEventListener('click', closeServiceModal);
  if (serviceModalOverlay) serviceModalOverlay.addEventListener('click', event => {
    if (event.target === serviceModalOverlay) closeServiceModal();
  });

  const clearServiceFieldError = event => {
    const field = event.target;
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      field.setCustomValidity('');
    }
  };
  serviceRequestForm?.addEventListener('input', clearServiceFieldError);
  serviceRequestForm?.addEventListener('change', clearServiceFieldError);

  if (serviceRequestForm) serviceRequestForm.addEventListener('submit', async event => {
    event.preventDefault();
    const nameField = document.getElementById('serviceName');
    const phoneField = document.getElementById('servicePhone');
    const serviceField = document.getElementById('serviceType');
    const municipalityField = document.getElementById('serviceMunicipality');
    const detailsField = document.getElementById('serviceDetails');
    const name = nameField.value.trim();
    const phone = phoneField.value.trim();
    const service = serviceField.value;
    const municipality = municipalityField?.value ? municipalityField.selectedOptions[0].textContent : '';
    const details = detailsField.value.trim();

    nameField.setCustomValidity(name ? '' : 'Escribe tu nombre y apellido.');
    phoneField.setCustomValidity(phone ? '' : 'Escribe tu teléfono de contacto.');
    serviceField.setCustomValidity(service ? '' : 'Selecciona el servicio que necesitas.');
    detailsField.setCustomValidity(details ? '' : 'Describe qué servicio necesitas.');
    if (!serviceRequestForm.reportValidity()) return;

    sendServiceRequestBtn.disabled = true;
    sendServiceRequestBtn.innerText = 'Enviando...';
    if (db) {
      try {
        await db.collection('solicitudes_servicio').add({
          nombre: name,
          telefono: phone,
          servicio: service,
          municipio: municipality,
          detalles: details,
          fechaHora: firebase.firestore.FieldValue.serverTimestamp(),
          estatus: 'Pendiente'
        });
      } catch (error) {
        console.error('Error al guardar la solicitud de servicio:', error);
      }
    } else {
      console.warn('La solicitud no se guardó en Firestore porque la app está sin conexión. Se abrirá WhatsApp si está disponible.');
    }

    const message = `*SOLICITUD DE SERVICIO - PROTECCIÓN CIVIL*\n\n*Nombre:* ${name}\n*Teléfono:* ${phone}\n*Servicio:* ${service}${municipalityField?.value ? `\n*Municipio:* ${municipality}` : ''}\n*Detalles:* ${details}`;
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
  const postDetailAuthor = document.getElementById('postDetailAuthor');
  const postDetailCategory = document.getElementById('postDetailCategory');
  const postDetailDate = document.getElementById('postDetailDate');
  const postDetailGallery = document.getElementById('postDetailGallery');
  const postDetailText = document.getElementById('postDetailText');
  const postDetailReactions = document.getElementById('postDetailReactions');
  const postShareButton = document.getElementById('postShareButton');
  const postDetailPdf = document.getElementById('postDetailPdf');

  function closeImageViewer() {
    if (!imageViewerOverlay) return;
    hideOverlay(imageViewerOverlay);
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
    showOverlay(imageViewerOverlay);
  });

  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const imageLink = image.closest('.muro-card-image .image-link');
    const detailImage = image.closest('.post-detail-gallery img');
    if (imageLink) imageLink.remove();
    if (detailImage) detailImage.remove();
  }, true);

  if (imageViewerClose) imageViewerClose.addEventListener('click', closeImageViewer);
  if (imageViewerOverlay) imageViewerOverlay.addEventListener('click', event => {
    if (event.target === imageViewerOverlay) closeImageViewer();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeImageViewer();
  });

  function closePostDetail() {
    hideOverlay(postDetailOverlay);
    if (postDetailGallery) postDetailGallery.innerHTML = '';
    if (postDetailPdf) postDetailPdf.innerHTML = '';
  }

  function renderPostMedia(slides, activeSlide = 0) {
    if (!postDetailGallery || !slides.length) {
      if (postDetailGallery) postDetailGallery.innerHTML = '';
      return;
    }
    const safeSlide = Math.max(0, Math.min(activeSlide, slides.length - 1));
    postDetailGallery.innerHTML = `
      <div class="post-media-slide">${slides[safeSlide]}</div>
      ${slides.length > 1 ? `
        <div class="post-media-controls">
          <button class="post-media-button" type="button" data-media-slide="${safeSlide - 1}" ${safeSlide === 0 ? 'disabled' : ''} aria-label="Contenido anterior"><i class="fa-solid fa-chevron-left"></i></button>
          <span>${safeSlide + 1} / ${slides.length}</span>
          <button class="post-media-button" type="button" data-media-slide="${safeSlide + 1}" ${safeSlide === slides.length - 1 ? 'disabled' : ''} aria-label="Contenido siguiente"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      ` : ''}
    `;
    postDetailGallery.querySelectorAll('img').forEach(image => {
      image.addEventListener('error', () => image.closest('a')?.remove(), { once: true });
    });
  }

  function getYoutubeEmbedMarkup(videoId, title) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return `<div class="post-media-video-slide">
      <div class="post-detail-video">
        <iframe src="https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1${/^https?:$/.test(window.location.protocol) ? `&origin=${encodeURIComponent(window.location.origin)}` : ''}" title="${escapeHTML(title)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
    </div>`;
  }

  function openPostDetail(card) {
    if (!postDetailOverlay) return;
    const publicationUrl = new URL(window.location.href);
    publicationUrl.searchParams.set('publicacion', card.dataset.postId || '');
    history.pushState({ pcadOverlay: postDetailOverlay.id }, '', publicationUrl.href);
    document.title = `${card.dataset.title || 'Publicación'} | Protección Civil Apure`;
    const description = (card.dataset.content || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    const imageUrl = card.dataset.images ? JSON.parse(card.dataset.images)[0] : '';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description || 'Publicación oficial de Protección Civil Apure.');
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', card.dataset.title || 'Publicación | Protección Civil Apure');
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description || 'Publicación oficial de Protección Civil Apure.');
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', publicationUrl.href);
    if (imageUrl) document.querySelector('meta[property="og:image"]')?.setAttribute('content', imageUrl);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', card.dataset.title || 'Publicación | Protección Civil Apure');
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description || 'Publicación oficial de Protección Civil Apure.');
    if (imageUrl) document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', imageUrl);
    if (postDetailAuthor) postDetailAuthor.textContent = card.dataset.author || 'Protección Civil Apure';
    if (postDetailCategory) postDetailCategory.textContent = card.dataset.category || 'Noticias';
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
    const youtubeId = getYoutubeVideoId(card.dataset.youtubeUrl || '');
    const pdfLink = card.dataset.pdfUrl
      ? `<a class="post-pdf-link" href="${escapeHTML(card.dataset.pdfUrl)}" download target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Descargar ${escapeHTML(card.dataset.pdfName || 'documento PDF')}</a>`
      : '';
    const images = card.dataset.images ? JSON.parse(card.dataset.images) : [];
    const mediaSlides = [];
    if (youtubeId) {
      mediaSlides.push(getYoutubeEmbedMarkup(youtubeId, card.dataset.title || 'Video de la publicación'));
    }
    images.forEach(imageUrl => {
      mediaSlides.push(`
        <div class="post-detail-single-image">
          <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(card.dataset.title || 'Imagen de la publicación')}">
        </div>
      `);
    });
    renderPostMedia(mediaSlides);
    if (postDetailPdf) postDetailPdf.innerHTML = pdfLink;
    showOverlay(postDetailOverlay);
  }

  document.addEventListener('click', event => {
    const mediaButton = event.target.closest('[data-media-slide]');
    if (mediaButton) {
      event.preventDefault();
      const card = postDetailOverlay?.dataset.postId
        ? document.querySelector(`.muro-card[data-post-id="${CSS.escape(postDetailOverlay.dataset.postId)}"]`)
        : null;
      if (card) {
        const youtubeId = getYoutubeVideoId(card.dataset.youtubeUrl || '');
        const images = card.dataset.images ? JSON.parse(card.dataset.images) : [];
        const slides = [];
        if (youtubeId) slides.push(getYoutubeEmbedMarkup(youtubeId, card.dataset.title || 'Video de la publicación'));
        images.forEach(imageUrl => {
          slides.push(`<div class="post-detail-single-image"><img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(card.dataset.title || 'Imagen de la publicación')}"></div>`);
        });
        renderPostMedia(slides, Number(mediaButton.dataset.mediaSlide));
      }
      return;
    }
    if (event.target.closest('.reaction-button, .muro-pdf-link, .post-pdf-link')) return;
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
    const shareMessage = `Mira esta publicación en la web de Protección Civil:\n${window.location.href}`;
    const shareData = { title: 'Mira esta publicación', text: shareMessage };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareMessage);
        postShareButton.innerHTML = '<i class="fa-solid fa-check"></i> Enlace copiado';
        setTimeout(() => { postShareButton.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Compartir publicación'; }, 1800);
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error('No se pudo compartir la publicación:', error);
    }
  });
  document.querySelectorAll('[data-share-network]').forEach(button => {
    button.addEventListener('click', async () => {
      const shareUrl = window.location.href;
      const shareMessage = `Mira esta publicación en la web de Protección Civil:\n${shareUrl}`;
      const network = button.dataset.shareNetwork;
      if (network === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer');
      } else if (network === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
      } else if (network === 'instagram') {
        await navigator.clipboard.writeText(shareMessage);
        button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Enlace copiado';
        setTimeout(() => { button.innerHTML = '<i class="fa-brands fa-instagram" aria-hidden="true"></i> Instagram'; }, 1800);
      }
    });
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
  if (slidesWrapper && db) db.collection('carrusel')
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

  const publicationSearch = document.getElementById('publicationSearch');
  const publicationCategory = document.getElementById('publicationCategory');
  let publicationDocs = [];
  let openedFromUrl = false;

  // Obtener la instancia de firestore de forma segura
  const firestoreDB = database || window.db ||
    (typeof firebase !== 'undefined' && firebase.apps.length ? firebase.firestore() : null);

  if (!firestoreDB) {
    console.error("Firestore no está inicializado.");
    return;
  }

  const homePreviewLimit = 4;

  function renderPublications() {
    const searchTerm = (publicationSearch?.value || '').trim().toLowerCase();
    const selectedCategory = publicationCategory?.value || 'all';
    const filteredDocs = publicationDocs.filter(doc => {
      const data = doc.data();
      const category = data.category || 'Noticias';
      const searchableText = [data.title, data.content, data.author || 'Protección Civil Apure', category]
        .filter(Boolean).join(' ').toLowerCase();
      return (selectedCategory === 'all' || category === selectedCategory) && searchableText.includes(searchTerm);
    });

    const shouldLimitHomePreview = !publicationSearch && !publicationCategory && window.location.pathname.toLowerCase().endsWith('index.html');
    const visibleDocs = shouldLimitHomePreview ? filteredDocs.slice(0, homePreviewLimit) : filteredDocs;

    if (!visibleDocs.length) {
      muroGridContainer.innerHTML = '<div class="empty-muro"><p>No hay publicaciones que coincidan con la búsqueda.</p></div>';
      return;
    }

    muroGridContainer.innerHTML = '';
    visibleDocs.forEach((doc) => {
        const data = doc.data();
        const postImages = Array.isArray(data.imageUrls)
          ? [...new Set(data.imageUrls.filter(imageUrl => typeof imageUrl === 'string' && imageUrl))]
          : (data.imageUrl ? [data.imageUrl] : []);
        
        let fechaFormateada = "Reciente";
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          fechaFormateada = data.createdAt.toDate().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }

        muroGridContainer.innerHTML += `
          <article class="muro-card" tabindex="0" role="button"
            data-post-id="${escapeHTML(doc.id)}"
            data-title="${escapeHTML(data.title || 'Sin título')}"
            data-date="${escapeHTML(fechaFormateada)}"
            data-author="${escapeHTML(data.author || 'Protección Civil Apure')}"
            data-category="${escapeHTML(data.category || 'Noticias')}"
            data-content="${escapeHTML(data.content || '')}"
            data-youtube-url="${escapeHTML(data.youtubeUrl || '')}"
            data-pdf-url="${escapeHTML(data.pdfUrl || '')}"
            data-pdf-name="${escapeHTML(data.pdfName || 'Documento PDF')}"
            data-reactions='${escapeHTML(JSON.stringify(data.reacciones || {}))}'
            data-images='${escapeHTML(JSON.stringify(postImages))}'>
            <div class="muro-card-profile">
              <img src="img/pc logo.png" alt="" class="muro-profile-avatar">
              <div><strong>Protección Civil Apure</strong><span><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Cuenta institucional</span></div>
            </div>
            <div class="muro-card-meta">
              <span class="muro-card-category"><i class="fa-solid fa-tag" aria-hidden="true"></i> ${escapeHTML(data.category || 'Noticias')}</span>
              <span class="muro-card-official"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Publicación oficial</span>
              <span class="muro-card-date"><i class="fa-regular fa-calendar-days" aria-hidden="true"></i> ${fechaFormateada}</span>
            </div>
            <div class="muro-card-content">
              <h3 class="muro-card-title">${data.title || 'Sin título'}</h3>
              <p class="muro-card-author">Por ${escapeHTML(data.author || 'Protección Civil Apure')}</p>
              <p class="muro-card-text">${data.content || ''}</p>
              ${data.pdfUrl ? `<a class="muro-pdf-link" href="${escapeHTML(data.pdfUrl)}" download target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Descargar ${escapeHTML(data.pdfName || 'documento PDF')}</a>` : ''}
            </div>
            ${postImages.length ? `
              <div class="muro-card-image">
                <a href="${postImages[0]}" class="image-link" aria-label="Abrir foto de ${data.title || 'Noticia'}">
                  <img src="${postImages[0]}" alt="${data.title || 'Noticia'}" loading="lazy">
                </a>
                ${postImages.length > 1 ? `<span class="muro-image-count"><i class="fa-solid fa-images" aria-hidden="true"></i> ${postImages.length} fotos</span>` : ''}
              </div>
            ` : (getYoutubeVideoId(data.youtubeUrl || '') ? `<div class="muro-card-video"><div class="video-placeholder"><i class="fa-brands fa-youtube"></i><span>Ver video en la publicación</span></div></div>` : '')}
            <div class="muro-reactions" data-post-id="${escapeHTML(doc.id)}">
              <button class="reaction-button" data-reaction="meGusta" type="button"><i class="fa-solid fa-thumbs-up"></i> Me gusta <span>${data.reacciones?.meGusta || 0}</span></button>
              <button class="reaction-button" data-reaction="apoyo" type="button"><i class="fa-solid fa-hands-helping"></i> Apoyo <span>${data.reacciones?.apoyo || 0}</span></button>
              <button class="reaction-button" data-reaction="importante" type="button"><i class="fa-solid fa-circle-exclamation"></i> Importante <span>${data.reacciones?.importante || 0}</span></button>
            </div>
          </article>
        `;
        muroGridContainer.querySelectorAll('.muro-card:last-child .muro-card-image img').forEach(image => {
          image.addEventListener('error', () => image.closest('.image-link')?.remove(), { once: true });
        });
    });

    if (shouldLimitHomePreview && filteredDocs.length > homePreviewLimit) {
      const seeMoreButton = document.createElement('button');
      seeMoreButton.type = 'button';
      seeMoreButton.className = 'muro-see-more';
      seeMoreButton.textContent = 'Ver más';
      seeMoreButton.addEventListener('click', () => {
        window.location.href = 'publicaciones.html';
      });
      muroGridContainer.appendChild(seeMoreButton);
    }

    if (!openedFromUrl) {
      const publicationId = new URLSearchParams(window.location.search).get('publicacion');
      const targetCard = publicationId ? muroGridContainer.querySelector(`[data-post-id="${CSS.escape(publicationId)}"]`) : null;
      if (targetCard) {
        openedFromUrl = true;
        targetCard.click();
      }
    }
  }

  publicationSearch?.addEventListener('input', renderPublications);
  publicationCategory?.addEventListener('change', renderPublications);

  firestoreDB.collection('muro')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      publicationDocs = snapshot.docs;
      const categories = [...new Set(publicationDocs.map(doc => doc.data().category || 'Noticias'))].sort();
      if (publicationCategory) {
        publicationCategory.innerHTML = '<option value="all">Todas las categorías</option>';
        categories.forEach(category => {
          publicationCategory.innerHTML += `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`;
        });
      }
      renderPublications();
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
