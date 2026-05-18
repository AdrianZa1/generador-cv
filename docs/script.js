// Frontend helper: backend URL from meta tag (define only if not defined)
if (typeof BACKEND_URL === 'undefined') {
  var BACKEND_URL = document.querySelector('meta[name="backend-url"]')?.content || '';
}

// ===================== CONTROLADOR PRINCIPAL =====================
function initInputListeners() {
  ['f-name', 'f-title', 'f-location', 'f-bio'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      let v = this.value;
      if (autocorrectEnabled) v = autocorrectText(v, id);
      if (v !== this.value) this.value = v;
      // clear inline error when user types
      clearFieldError(id);
      sync();
    });
    el.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter') return;
      if (!tutorialState || !tutorialState.active) return;
      const currentStep = tutorialState.steps[tutorialState.step];
      if (!currentStep || currentStep.selector !== `#${id}`) return;
      e.preventDefault();
      advanceTutorial();
    });
  });

  // Listeners estáticos
  const cedulaEl = document.getElementById('f-cedula');
  if (cedulaEl) {
    cedulaEl.setAttribute('inputmode', 'numeric');
    cedulaEl.setAttribute('maxlength', '10');
    cedulaEl.addEventListener('input', () => { sanitizeCedulaInput(cedulaEl); clearFieldError('f-cedula'); sync(); });
    cedulaEl.addEventListener('blur', () => { sanitizeCedulaInput(cedulaEl); validateCedula(); sync(); });
  }

  const dobTextEl = document.getElementById('f-dob');
  const dobPickerEl = document.getElementById('f-dob-picker');
  const dobPickerBtn = document.getElementById('f-dob-picker-btn');
  if (dobTextEl) {
    dobTextEl.setAttribute('inputmode', 'numeric');
    dobTextEl.setAttribute('maxlength', '10');
    dobTextEl.addEventListener('input', () => {
      dobTextEl.value = formatDateIsoInput(dobTextEl.value);
      syncDobPicker();
      clearFieldError('f-dob');
      sync();
    });
    dobTextEl.addEventListener('blur', () => { validateDob(); syncDobPicker(); sync(); });
  }
  if (dobPickerEl) {
    dobPickerEl.addEventListener('change', () => {
      if (dobTextEl) dobTextEl.value = dobPickerEl.value || '';
      clearFieldError('f-dob');
      sync();
    });
  }
  if (dobPickerBtn) dobPickerBtn.addEventListener('click', openDobPicker);

  const skillInp = document.getElementById('f-skill');
  if (skillInp) skillInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } });

  const langInp = document.getElementById('f-language');
  if (langInp) langInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addLanguage(); } });

  const emailEl = document.getElementById('f-email');
  if (emailEl) emailEl.addEventListener('input', () => { validateEmail(); sync(); });
    if (emailEl) emailEl.addEventListener('keydown', e => { if (e.key === 'Enter' && tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#f-email') { e.preventDefault(); advanceTutorial(); } });

    const phoneEl = document.getElementById('f-phone');
    if (phoneEl) {
      phoneEl.setAttribute('inputmode', 'tel');
      phoneEl.addEventListener('input', () => { sanitizePhoneInput(phoneEl); clearFieldError('f-phone'); sync(); });
      phoneEl.addEventListener('blur', () => { sanitizePhoneInput(phoneEl); validatePhone(); sync(); });
      phoneEl.addEventListener('keydown', e => { if (e.key === 'Enter' && tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#f-phone') { e.preventDefault(); advanceTutorial(); } });
    }

    const locationEl = document.getElementById('f-location');
    if (locationEl) locationEl.addEventListener('keydown', e => { if (e.key === 'Enter' && tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#f-location') { e.preventDefault(); advanceTutorial(); } });

  // Foto y Limpieza
  const photoFile = document.getElementById('f-photo-file');
  if (photoFile) photoFile.addEventListener('change', function() {
    const reader = new FileReader();
    reader.onload = e => { 
      document.getElementById('f-photo').value = e.target.result; 
      sync(); 
    };
    reader.readAsDataURL(this.files[0]);
  });

  // Botones de acción
  ['download-pdf', 'download-pdf-footer'].forEach(id => {
    const button = document.getElementById(id);
    if (button) button.onclick = downloadPDF;
  });
  document.getElementById('btn-next').onclick = () => showPage(2);
  document.getElementById('btn-back').onclick = () => showPage(1);
  document.getElementById('add-exp').onclick = () => addEntry('exp');
  document.getElementById('add-edu').onclick = () => addEntry('edu');
  const addPortfolioBtn = document.getElementById('btn-add-portfolio');
  if (addPortfolioBtn) addPortfolioBtn.onclick = addPortfolio;
  const portfolioType = document.getElementById('f-portfolio-type');
  if (portfolioType) portfolioType.addEventListener('change', updatePortfolioFormVisibility);
  const portfolioFile = document.getElementById('f-portfolio-file');
  if (portfolioFile) portfolioFile.addEventListener('change', () => {
    const file = portfolioFile.files && portfolioFile.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      portfolioFile.value = '';
      showMessageModal('El archivo supera 5 MB. Usa un enlace o sube un archivo más liviano.', { title: 'Archivo muy grande' });
    }
  });
  const createBioBtn = document.getElementById('btn-create-bio');
  if (createBioBtn) createBioBtn.onclick = createBioInteractive;
  const improveBioBtn = document.getElementById('btn-improve-bio');
  if (improveBioBtn) improveBioBtn.onclick = improveBioInteractive;
  const cfgAi = document.getElementById('btn-config-ai');
  if (cfgAi) cfgAi.onclick = () => promptForApiKey();

  const tplSel = document.getElementById('template-select');
  if (tplSel) tplSel.addEventListener('change', () => { updateReferencesVisibility(); sync(); });
  if (tplSel) tplSel.addEventListener('change', () => { updatePaletteVisibility(); });
}

async function downloadPDF() {
  if (tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#download-pdf-footer') {
    endIntroTour();
  }
  const el = document.getElementById('cv-output');
  const wait = showWaitingModal('Generando PDF...');
  const { jsPDF } = window.jspdf;
  const tpl = document.getElementById('template-select').value;
  // Intentar generación server-side de alta fidelidad primero (si el servidor la soporta)
  try {
    const serverOk = await generatePdfServer(el, wait);
    if (serverOk) return; // ya descargado
    // Si no hay soporte server-side, usar generador de PDF basado en texto (seleccionable)
    await generateTextPDF(tpl, wait);
  } catch (err) {
    console.error('Error generando PDF de texto', err);
    // Fallback: intentar el método antiguo con imagen
    let margin = 40; 
    if (tpl === 'template-2') margin = 10;
    // Fallback mejorado: usar html2pdf (html2canvas + jsPDF) y esperar a que las fuentes se carguen
    try {
      await document.fonts.ready;
      // Clonar el elemento de vista previa y aplicar estilos computados en línea
      function cloneWithInlineStyles(node) {
        const clone = node.cloneNode(true);
        const origElements = node.querySelectorAll('*');
        const cloneElements = clone.querySelectorAll('*');
        // Inline styles for root
        const rootStyle = window.getComputedStyle(node);
        clone.style.cssText = Array.from(rootStyle).map(p => `${p}: ${rootStyle.getPropertyValue(p)};`).join(' ');
        for (let i = 0; i < origElements.length; i++) {
          const s = window.getComputedStyle(origElements[i]);
          const cs = Array.from(s).map(p => `${p}: ${s.getPropertyValue(p)};`).join(' ');
          cloneElements[i].style.cssText = cs;
        }
        return clone;
      }

      const preview = el;
      const clone = cloneWithInlineStyles(preview);
      // Establecer tamaño fijo apropiado para A4 en px (aprox. 595pt * 1.333 = 793px)
      clone.style.width = '793px';
      clone.style.boxSizing = 'border-box';
      clone.style.background = '#ffffff';
      // Colocar el clon en un contenedor oculto pero renderable
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.appendChild(clone);
      document.body.appendChild(container);

      const marginInInches = margin / 72; // convert points to inches for html2pdf margin
      const opt = {
        margin: marginInInches,
        filename: 'Mi_CV.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      html2pdf().set(opt).from(clone).save().then(() => {
        document.body.removeChild(container);
        wait.close();
      }).catch(e => { document.body.removeChild(container); wait.close(); console.error('html2pdf error', e); });
    } catch (e) {
      console.error('Fallback html2pdf failed', e);
      wait.close();
    }
  }
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Clona un nodo y aplica estilos computados en línea a todos los elementos (útil para enviar al servidor)
function cloneWithInlineStyles(node) {
  const clone = node.cloneNode(true);
  const origElements = node.querySelectorAll('*');
  const cloneElements = clone.querySelectorAll('*');
  // Inline styles for root
  const rootStyle = window.getComputedStyle(node);
  clone.style.cssText = Array.from(rootStyle).map(p => `${p}: ${rootStyle.getPropertyValue(p)};`).join(' ');
  for (let i = 0; i < origElements.length; i++) {
    const s = window.getComputedStyle(origElements[i]);
    const cs = Array.from(s).map(p => `${p}: ${s.getPropertyValue(p)};`).join(' ');
    cloneElements[i].style.cssText = cs;
  }
  return clone;
}

// Intentar generar PDF en el servidor (requiere endpoint /generate-pdf)
async function generatePdfServer(previewEl, waitModal) {
  try {
    await document.fonts.ready;
    const clone = cloneWithInlineStyles(previewEl);
    // Construir head limpio: clonar head pero sin scripts
    const headClone = document.head.cloneNode(true);
    headClone.querySelectorAll('script').forEach(s => s.remove());
    // Formar documento completo
    const html = `<!doctype html><html>${headClone.outerHTML}<body>${clone.outerHTML}</body></html>`;

    const url = (BACKEND_URL || '') + '/generate-pdf';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html })
    });
    if (!r.ok) {
      console.warn('Server PDF generation failed', await r.text());
      return false;
    }
    const blob = await r.blob();
    const urlBlob = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlBlob;
    a.download = 'Mi_CV.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(urlBlob);
    if (waitModal && typeof waitModal.close === 'function') waitModal.close();
    return true;
  } catch (err) {
    console.error('generatePdfServer error', err);
    if (waitModal && typeof waitModal.close === 'function') waitModal.close();
    return false;
  }
}

function savePdfBytes(bytes, fileName) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function generateTextPDF(tpl, waitModal) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = tpl === 'template-2' ? 28 : 40;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  function addSectionTitle(title) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin, y);
    y += 18;
  }

  function addTextBlock(text, opts = {}) {
    const size = opts.size || 11;
    const style = opts.style || 'normal';
    pdf.setFontSize(size);
    pdf.setFont('helvetica', style);
    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
      if (y > pageHeight - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += size + 4;
    });
    y += 6;
  }

  // Header: nombre y título
  const name = (document.getElementById('f-name')||{}).value || 'Tu Nombre';
  const title = (document.getElementById('f-title')||{}).value || 'Tu Título';
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(name, margin, y);
  y += 26;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(title, margin, y);
  y += 20;

  // Contact/meta
  const metaIds = ['f-cedula','f-dob','f-location','f-phone','f-email'];
  const metas = metaIds.map(id => ({ id, v: (document.getElementById(id)||{}).value } )).filter(x => x.v);
  if (metas.length) {
    pdf.setFontSize(10); pdf.setFont('helvetica','normal');
    metas.forEach(m => { if (y > pageHeight - margin) { pdf.addPage(); y = margin; } pdf.text(`${m.v}`, margin, y); y += 14; });
    y += 6;
  }

  // Perfil
  const bio = (document.getElementById('f-bio')||{}).value;
  if (bio) { addSectionTitle('Perfil'); addTextBlock(bio, { size: 11 }); }

  // Experiencia
  if (entries.exp && entries.exp.length) {
    addSectionTitle('Experiencia');
    entries.exp.forEach(e => {
      const heading = `${e.role || 'Cargo'} — ${e.company || ''}${e.dates ? ' · ' + e.dates : ''}`;
      addTextBlock(heading, { size: 11, style: 'bold' });
      if (e.desc) addTextBlock(e.desc, { size: 10 });
    });
  }

  // Educación
  if (entries.edu && entries.edu.length) {
    addSectionTitle('Educación');
    entries.edu.forEach(e => {
      const heading = `${e.role || 'Título'} — ${e.company || ''}${e.dates ? ' · ' + e.dates : ''}`;
      addTextBlock(heading, { size: 11, style: 'bold' });
    });
  }

  // Adjuntos opcionales (portafolio web, certificados, proyectos, evidencias)
  if (entries.portfolio && entries.portfolio.length) {
    addSectionTitle('Adjuntos opcionales');
    entries.portfolio.forEach(item => {
      const typeText = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Otro';
      const linkText = item.title || item.fileName || item.link || 'Adjunto';
      if (y > pageHeight - margin) { pdf.addPage(); y = margin; }
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      pdf.text(typeText, margin, y);
      y += 12;
      pdf.setFontSize(11); pdf.setFont('helvetica','bold');
      pdf.text(linkText, margin, y);
      if (item.link) {
        try {
          const href = new URL(item.link, window.location.href).href;
          pdf.link(margin, y - 10, pdf.getTextWidth(linkText), 14, { url: href });
        } catch (e) {}
      }
      if (item.fileName) {
        y += 12;
        pdf.setFontSize(10); pdf.setFont('helvetica','normal');
        pdf.text(`Archivo: ${item.fileName}`, margin, y);
      }
      y += 18;
    });
  }

  // Habilidades y Idiomas
  if (skills && skills.length) { addSectionTitle('Habilidades'); addTextBlock(skills.join(', '), { size: 11 }); }
  if (languages && languages.length) { addSectionTitle('Idiomas'); addTextBlock(languages.join(', '), { size: 11 }); }

  // Guardar
  const basePdfBytes = pdf.output('arraybuffer');
  const attachments = (entries.portfolio || []).filter(item => item.fileData && item.fileType === 'application/pdf');
  if (attachments.length) {
    // Prefer server-side merge if backend is configured
    if (BACKEND_URL) {
      try {
        const url = (BACKEND_URL || '') + '/merge-pdfs';
        // convert basePdfBytes (ArrayBuffer) to base64
        function arrayBufferToBase64(buffer) {
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary);
        }
        const payload = {
          basePdf: arrayBufferToBase64(basePdfBytes),
          attachments: attachments.map(a => ({ fileName: a.fileName, fileData: a.fileData }))
        };
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (r.ok) {
          const blob = await r.blob();
          const urlBlob = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = urlBlob; a.download = 'Mi_CV_con_adjuntos.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlBlob);
          if (waitModal && typeof waitModal.close === 'function') waitModal.close();
          return;
        }
        console.warn('Server merge failed, falling back to client merge', await r.text());
      } catch (e) {
        console.error('Server merge-pdfs error', e);
      }
    }

    // Fallback: try client-side merge (pdf-lib in browser)
    if (window.PDFLib && window.PDFLib.PDFDocument) {
      try {
        const merged = await mergePdfAttachments(basePdfBytes, attachments);
        savePdfBytes(merged, 'Mi_CV.pdf');
      } catch (err) {
        console.error('No se pudieron anexar los PDFs', err);
        savePdfBytes(basePdfBytes, 'Mi_CV.pdf');
      }
    } else {
      savePdfBytes(basePdfBytes, 'Mi_CV.pdf');
    }
  } else {
    savePdfBytes(basePdfBytes, 'Mi_CV.pdf');
  }
  if (waitModal && typeof waitModal.close === 'function') waitModal.close();
}

async function mergePdfAttachments(basePdfBytes, attachments) {
  const { PDFDocument } = window.PDFLib;
  // Create a new PDF and import pages from the base PDF first,
  // then append pages from each attachment in the provided order.
  const newPdf = await PDFDocument.create();

  try {
    const baseDoc = await PDFDocument.load(basePdfBytes);
    const basePages = await newPdf.copyPages(baseDoc, baseDoc.getPageIndices());
    basePages.forEach(p => newPdf.addPage(p));
  } catch (err) {
    console.error('No se pudo leer el PDF base', err);
  }

  for (const item of attachments) {
    try {
      const attachmentBytes = dataUrlToUint8Array(item.fileData);
      const attachmentDoc = await PDFDocument.load(attachmentBytes);
      const pages = await newPdf.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
      pages.forEach(p => newPdf.addPage(p));
    } catch (err) {
      console.error('No se pudo anexar el PDF adjunto', err, item.fileName);
    }
  }

  return newPdf.save();
}

function boot() {
  initInputListeners();
  renderSkillChips();
  renderLanguageChips();
  renderPortfolioItems();
  renderPaletteSelector();
  updatePortfolioFormVisibility();
  sync();
  setTimeout(() => {
    showConfirmModal('¿Necesitas o quieres un tutorial para usar la página?', (ok) => {
      if (ok) {
        startIntroTour();
      } else {
        setTutorialHint('');
        clearTutorialHighlights();
      }
    }, { title: 'Tutorial inicial', yesText: 'Aceptar', noText: 'Cancelar' });
  }, 200);
  
  const start = Date.now();
  const tryShow = () => {
    if (document.getElementById('modal-root')) {
      // Lógica de tour omitida para brevedad pero funcional si se define startIntroTour
      return;
    }
    if (Date.now() - start < 2000) setTimeout(tryShow, 50);
  };
  tryShow();

}

boot();
