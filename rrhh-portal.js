(() => {
  const forms = {
    ascenso: {
      title: 'Solicitud de ascenso',
      description: 'Descarga esta planilla para presentar formalmente tu solicitud de ascenso ante Recursos Humanos.',
      fields: [
        'Nombre y apellido', 'Cédula de identidad', 'Cargo y grado actual',
        'Cargo o grado solicitado', 'Dependencia / unidad', 'Antigüedad en el cargo'
      ],
      details: 'Motivos y experiencia relacionada con la solicitud'
    },
    servicio: {
      title: 'Solicitud de servicio',
      description: 'Utiliza este formato para describir el servicio o requerimiento institucional que necesitas tramitar.',
      fields: [
        'Nombre y apellido del solicitante', 'Cédula de identidad', 'Cargo / dependencia',
        'Servicio solicitado', 'Lugar y fecha requerida', 'Persona de contacto / teléfono'
      ],
      details: 'Descripción y justificación de la solicitud'
    },
    permiso: {
      title: 'Solicitud de vacaciones, permiso o reposo',
      description: 'Indica el tipo de solicitud y el período correspondiente. Recursos Humanos revisará los requisitos aplicables.',
      fields: [
        'Nombre y apellido', 'Cédula de identidad', 'Cargo / dependencia',
        'Tipo de solicitud', 'Período o fechas solicitadas', 'Teléfono de contacto'
      ],
      details: 'Motivo y observaciones (adjuntar recaudos, cuando corresponda)'
    },
    constancia: {
      title: 'Solicitud de constancia de trabajo',
      description: 'Completa los datos para solicitar una constancia u otro documento relacionado con tu situación laboral.',
      fields: [
        'Nombre y apellido', 'Cédula de identidad', 'Cargo / dependencia',
        'Documento requerido', 'A quién va dirigida', 'Teléfono de contacto'
      ],
      details: 'Uso o motivo de la solicitud'
    },
    datos: {
      title: 'Actualización de datos del personal',
      description: 'Usa esta planilla para informar cambios en tus datos personales o laborales.',
      fields: [
        'Nombre y apellido', 'Cédula de identidad', 'Cargo / dependencia',
        'Dato que desea actualizar', 'Información anterior', 'Información nueva'
      ],
      details: 'Observaciones y documentos anexos'
    },
    pagos: {
      title: 'Consulta de pagos y guardias',
      description: 'Registra la información de referencia para que Recursos Humanos pueda revisar tu consulta.',
      fields: [
        'Nombre y apellido', 'Cédula de identidad', 'Cargo / dependencia',
        'Mes o período consultado', 'Guardia / turno (si aplica)', 'Teléfono de contacto'
      ],
      details: 'Describe la consulta o incidencia y anota las fechas relacionadas'
    }
  };

  const modal = document.getElementById('rrhhFormModal');
  const dialog = modal?.querySelector('.rrhh-form-modal');
  const closeButton = document.getElementById('rrhhModalClose');
  const downloadButton = document.getElementById('rrhhDownloadForm');
  const titleElement = document.getElementById('rrhhModalTitle');
  const descriptionElement = document.getElementById('rrhhModalDescription');
  const statusElement = document.getElementById('rrhhModalStatus');

  if (!modal || !dialog || !closeButton || !downloadButton) return;

  let selectedForm = null;
  let previousFocus = null;
  let previousOverflow = '';

  function openModal(formKey, trigger) {
    selectedForm = forms[formKey];
    if (!selectedForm) return;

    previousFocus = trigger;
    titleElement.textContent = selectedForm.title;
    descriptionElement.textContent = selectedForm.description;
    statusElement.textContent = '';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousOverflow;
    previousFocus?.focus();
  }

  function addLabeledField(doc, label, x, y, width, lineCount = 1) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(45, 58, 78);
    doc.text(label, x, y);

    const lineY = y + (lineCount === 1 ? 8 : 9);
    for (let line = 0; line < lineCount; line += 1) {
      doc.setDrawColor(170, 182, 198);
      doc.line(x, lineY + line * 8, x + width, lineY + line * 8);
    }
    return y + (lineCount === 1 ? 17 : 10 + lineCount * 8);
  }

  function downloadPdf() {
    const PdfConstructor = window.jspdf?.jsPDF;
    if (!PdfConstructor) {
      statusElement.textContent = 'No se pudo cargar el generador PDF. Revisa tu conexión e inténtalo de nuevo.';
      return;
    }

    const doc = new PdfConstructor({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 17;
    const contentWidth = pageWidth - margin * 2;
    const titleLines = doc.splitTextToSize(selectedForm.title.toUpperCase(), contentWidth - 8);

    doc.setFillColor(0, 47, 125);
    doc.rect(0, 0, pageWidth, 39, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PROTECCIÓN CIVIL Y ADMINISTRACIÓN DE DESASTRES — ZOEDAN APURE', margin, 11);
    doc.setFontSize(15);
    doc.text(titleLines, margin, 23);

    let y = 47;
    doc.setTextColor(80, 91, 108);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('PLANILLA REFERENCIAL · Completar en letra legible y presentar en la sede.', margin, y);
    y += 12;

    selectedForm.fields.forEach((field, index) => {
      const column = index % 2;
      const x = margin + column * (contentWidth / 2 + 4);
      const width = contentWidth / 2 - 4;
      if (column === 0 && index > 0) y += 2;
      addLabeledField(doc, field, x, y, width);
      if (column === 1 || index === selectedForm.fields.length - 1) y += 17;
    });

    y += 2;
    y = addLabeledField(doc, selectedForm.details, margin, y, contentWidth, 3);
    y += 8;
    y = addLabeledField(doc, 'Lugar y fecha', margin, y, contentWidth);
    y += 18;

    const signatureGap = 8;
    const signatureWidth = (contentWidth - signatureGap * 2) / 3;
    ['Firma del solicitante', 'V.º B.º jefatura inmediata', 'Recibido / sello de RRHH'].forEach((label, index) => {
      const x = margin + index * (signatureWidth + signatureGap);
      doc.setDrawColor(100, 112, 130);
      doc.line(x, y + 8, x + signatureWidth, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 86, 102);
      doc.text(label, x, y + 13);
    });

    const footerY = doc.internal.pageSize.getHeight() - 17;
    doc.setDrawColor(220, 225, 232);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    doc.setFontSize(8);
    doc.setTextColor(95, 105, 120);
    doc.text('El trámite está sujeto a revisión, validación y firma por parte de la institución.', margin, footerY);

    const filename = selectedForm.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    doc.save(`planilla-${filename}.pdf`);
    statusElement.textContent = 'Planilla descargada. Imprímela, complétala y preséntala en la sede para su validación y firma.';
  }

  document.querySelectorAll('[data-rrhh-form]').forEach(trigger => {
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', modal.id);
    trigger.addEventListener('click', () => openModal(trigger.dataset.rrhhForm, trigger));

    const card = trigger.closest('.rrhh-resource-card');
    card?.addEventListener('click', event => {
      if (event.target.closest('button, a')) return;
      openModal(trigger.dataset.rrhhForm, trigger);
    });
  });

  closeButton.addEventListener('click', closeModal);
  downloadButton.addEventListener('click', downloadPdf);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('active')) return;
    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = [closeButton, downloadButton];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();