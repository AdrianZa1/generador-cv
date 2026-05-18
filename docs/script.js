// Frontend helper: backend URL from meta tag (define only if not defined)
if (typeof BACKEND_URL === 'undefined') {
  var BACKEND_URL = document.querySelector('meta[name="backend-url"]')?.content || '';
}

// ===================== CONTROLADOR PRINCIPAL =====================
function initInputListeners() {
  const doSync = () => { if (typeof sync === 'function') sync(); };
  const callGlobal = (name, ...args) => {
    const fn = window[name];
    if (typeof fn === 'function') return fn(...args);
    return undefined;
  };
  ['f-name', 'f-title', 'f-location', 'f-bio'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
      let v = this.value;
      if (autocorrectEnabled) v = autocorrectText(v, id);
      if (v !== this.value) this.value = v;
      // clear inline error when user types
      clearFieldError(id);
      doSync();
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
  ['f-cedula', 'f-dob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', doSync);
  });

  const dobInput = document.getElementById('f-dob');
  const dobPicker = document.getElementById('f-dob-picker');
  const dobPickerBtn = document.getElementById('f-dob-picker-btn');
  if (dobInput && dobPicker) {
    dobPicker.addEventListener('change', () => {
      dobInput.value = dobPicker.value || '';
      doSync();
    });
  }
  if (dobPickerBtn && dobPicker) {
    dobPickerBtn.addEventListener('click', () => {
      if (dobInput && dobInput.value) {
        dobPicker.value = dobInput.value;
      }
      dobPicker.focus();
      if (typeof dobPicker.showPicker === 'function') {
        dobPicker.showPicker();
      } else {
        dobPicker.click();
      }
    });
  }

  const addLangBtn = document.getElementById('add-language');
  if (addLangBtn) addLangBtn.addEventListener('click', () => callGlobal('addLanguageEntry'));

  const emailEl = document.getElementById('f-email');
  if (emailEl) emailEl.addEventListener('input', () => { validateEmail(); sync(); });
    if (emailEl) emailEl.addEventListener('keydown', e => { if (e.key === 'Enter' && tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#f-email') { e.preventDefault(); advanceTutorial(); } });

    const phoneEl = document.getElementById('f-phone');
    if (phoneEl) phoneEl.addEventListener('keydown', e => { if (e.key === 'Enter' && tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#f-phone') { e.preventDefault(); advanceTutorial(); } });

    const locationEl = document.getElementById('f-location');
    if (locationEl) locationEl.addEventListener('keydown', e => { if (e.key === 'Enter' && tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#f-location') { e.preventDefault(); advanceTutorial(); } });

  // Foto y Limpieza
  const photoFile = document.getElementById('f-photo-file');
  if (photoFile) photoFile.addEventListener('change', function() {
    const reader = new FileReader();
    reader.onload = e => { 
      document.getElementById('f-photo').value = e.target.result; 
      doSync(); 
    };
    reader.readAsDataURL(this.files[0]);
  });

  // Botones de acción
  document.getElementById('download-pdf').onclick = downloadPDF;
  document.getElementById('btn-next').onclick = () => callGlobal('showPage', 2);
  document.getElementById('btn-back').onclick = () => callGlobal('showPage', 1);
  document.getElementById('add-exp').onclick = () => callGlobal('addEntry', 'exp');
  document.getElementById('add-edu').onclick = () => callGlobal('addEntry', 'edu');
  const addSkillBtn = document.getElementById('add-skill');
  if (addSkillBtn) addSkillBtn.onclick = addSkillEntry;
  const addPortfolioBtn = document.getElementById('btn-add-portfolio');
  if (addPortfolioBtn) addPortfolioBtn.onclick = () => callGlobal('addPortfolio');
  const portfolioType = document.getElementById('f-portfolio-type');
  if (portfolioType) portfolioType.addEventListener('change', () => callGlobal('updatePortfolioFormVisibility'));
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
  if (createBioBtn) createBioBtn.onclick = () => callGlobal('createBioInteractive');
  const improveBioBtn = document.getElementById('btn-improve-bio');
  if (improveBioBtn) improveBioBtn.onclick = () => callGlobal('improveBioInteractive');
  const cfgAi = document.getElementById('btn-config-ai');
  if (cfgAi) cfgAi.onclick = () => callGlobal('promptForApiKey');

  const tplSel = document.getElementById('template-select');
  if (tplSel) tplSel.addEventListener('change', () => { callGlobal('updateReferencesVisibility'); doSync(); });
  if (tplSel) tplSel.addEventListener('change', () => { callGlobal('updatePaletteVisibility'); });
}

function renderSkillEntries() {
  const list = document.getElementById('skill-list');
  if (!list) return;
  list.innerHTML = '';
  skills.forEach((skill, idx) => {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'entry-remove';
    removeBtn.innerHTML = '<i class="ti ti-x"></i>';
    removeBtn.addEventListener('click', () => {
      skills.splice(idx, 1);
      renderSkillEntries();
      if (typeof sync === 'function') sync();
    });

    const row = document.createElement('div');
    row.className = 'field-row full';
    row.style.marginBottom = '0';

    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = 'Habilidad';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ej: Comunicación, liderazgo, ventas';
    input.value = skill || '';
    input.addEventListener('input', function() {
      skills[idx] = this.value;
      if (typeof sync === 'function') sync();
    });

    wrap.appendChild(label);
    wrap.appendChild(input);
    row.appendChild(wrap);
    card.appendChild(removeBtn);
    card.appendChild(row);
    list.appendChild(card);
  });
}

function addSkillEntry() {
  skills.push('');
  renderSkillEntries();
  if (typeof sync === 'function') sync();
  requestAnimationFrame(() => {
    const list = document.getElementById('skill-list');
    const inputs = list ? list.querySelectorAll('input') : [];
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

async function downloadPDF() {
  if (tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '#download-pdf') {
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

  if (attachments.length && window.PDFLib && window.PDFLib.PDFDocument) {
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
  if (waitModal && typeof waitModal.close === 'function') waitModal.close();
}

async function mergePdfAttachments(basePdfBytes, attachments) {
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(basePdfBytes);

  for (const item of attachments) {
    try {
      const attachmentBytes = dataUrlToUint8Array(item.fileData);
      const attachmentDoc = await PDFDocument.load(attachmentBytes);
      const pages = await pdfDoc.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
      pages.forEach(page => pdfDoc.addPage(page));
    } catch (err) {
      console.error('No se pudo anexar el PDF adjunto', err, item.fileName);
    }
  }

  return pdfDoc.save();
}

function boot() {
  const callGlobal = (name, ...args) => {
    const fn = window[name];
    if (typeof fn === 'function') return fn(...args);
    return undefined;
  };
  initInputListeners();
  renderSkillEntries();
  callGlobal('renderLanguageChips');
  callGlobal('renderPortfolioItems');
  callGlobal('renderPaletteSelector');
  callGlobal('updatePortfolioFormVisibility');
  callGlobal('sync');
  setTimeout(() => {
    callGlobal('showConfirmModal', '¿Necesitas o quieres un tutorial para usar la página?', (ok) => {
      if (ok) {
        callGlobal('startIntroTour');
      } else {
        callGlobal('setTutorialHint', '');
        callGlobal('clearTutorialHighlights');
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
