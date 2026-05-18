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
  const addRefBtn = document.getElementById('btn-add-reference');
  if (addRefBtn) addRefBtn.onclick = () => callGlobal('addReferenceEntry');
  const addPortfolioBtn = document.getElementById('btn-add-portfolio');
  if (addPortfolioBtn) addPortfolioBtn.onclick = () => callGlobal('addPortfolio');
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
      let v = this.value;
      if (typeof autocorrectEnabled !== 'undefined' && autocorrectEnabled) v = autocorrectText(v, 'f-title');
      if (v !== this.value) this.value = v;
      skills[idx] = v;
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
  const tpl = document.getElementById('template-select').value;
  // Priorizar PDF de texto con estilo de plantilla
  try {
    await generateTemplateTextPDF(tpl, wait);
    return;
  } catch (err) {
    console.error('Error generando PDF de texto con plantilla', err);
    // Fallback 1: PDF de texto básico
    try {
      await generateTextPDF(tpl, wait);
      return;
    } catch (e1) {
      console.error('Fallback PDF de texto básico fallido', e1);
      // Fallback 2: PDF visual por captura (último recurso)
      try {
        await generateStyledPDF(tpl, el, wait);
      } catch (e2) {
        console.error('Fallback PDF visual fallido', e2);
        wait.close();
      }
    }
  }
}

function normalizeLanguagesForPdf() {
  return (languages || []).map(lang => {
    if (typeof lang === 'string') return lang;
    if (lang && typeof lang === 'object') {
      const name = String(lang.name || '').trim();
      const percent = String(lang.percent ?? '').trim();
      return percent ? `${name} (${percent}%)` : name;
    }
    return '';
  }).filter(Boolean);
}

function normalizeSkillsForPdf() {
  return (skills || []).map(skill => {
    if (typeof skill === 'string') return skill.trim();
    return '';
  }).filter(Boolean);
}

function blobToArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer Blob'));
    reader.readAsArrayBuffer(blob);
  });
}

function saveBlobAsPdf(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function generateTemplateTextPDF(tpl, waitModal) {
  if (!window.pdfMake) throw new Error('pdfmake no está disponible');

  window.pdfMake.fonts = window.pdfMake.fonts || {};
  if (!window.pdfMake.fonts.Times) {
    window.pdfMake.fonts.Times = {
      normal: 'Times-Roman',
      bold: 'Times-Bold',
      italics: 'Times-Italic',
      bolditalics: 'Times-BoldItalic'
    };
  }

  const primary = (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#16a34a').trim() || '#16a34a';
  const name = (document.getElementById('f-name') || {}).value || 'Tu Nombre';
  const title = (document.getElementById('f-title') || {}).value || 'Tu Título';
  const bio = (document.getElementById('f-bio') || {}).value || '';
  const photoDataUrl = (document.getElementById('f-photo') || {}).value || '';

  const metaLines = [
    (document.getElementById('f-cedula') || {}).value,
    (document.getElementById('f-dob') || {}).value,
    (document.getElementById('f-location') || {}).value,
    (document.getElementById('f-phone') || {}).value,
    (document.getElementById('f-email') || {}).value
  ].filter(Boolean);

  const normalizedSkills = normalizeSkillsForPdf();
  const normalizedLanguages = normalizeLanguagesForPdf();
  const experiences = (entries && entries.exp) ? entries.exp : [];
  const education = (entries && entries.edu) ? entries.edu : [];
  const portfolio = (entries && entries.portfolio) ? entries.portfolio : [];

  const makeSectionTitle = (text) => ({ text, style: 'sectionTitle' });

  const expNodes = [];
  if (experiences.length) {
    expNodes.push(makeSectionTitle('EXPERIENCIA'));
    experiences.forEach(item => {
      const role = item.role || 'Cargo';
      const company = item.company || '';
      const dates = item.dates || '';
      expNodes.push({ text: `${role}${company ? ` - ${company}` : ''}${dates ? ` · ${dates}` : ''}`, style: 'entryTitle' });
      if (item.desc) expNodes.push({ text: item.desc, style: 'bodyText' });
      expNodes.push({ text: ' ', margin: [0, 2, 0, 0] });
    });
  }

  const eduNodes = [];
  if (education.length) {
    eduNodes.push(makeSectionTitle('EDUCACIÓN'));
    education.forEach(item => {
      const role = item.role || 'Título';
      const company = item.company || '';
      const dates = item.dates || '';
      eduNodes.push({ text: `${role}${company ? ` - ${company}` : ''}${dates ? ` · ${dates}` : ''}`, style: 'entryTitle' });
      eduNodes.push({ text: ' ', margin: [0, 2, 0, 0] });
    });
  }

  const portfolioNodes = [];
  if (portfolio.length) {
    portfolioNodes.push(makeSectionTitle('ADJUNTOS'));
    portfolio.forEach(item => {
      const baseLabel = String(item.title || '').trim().toLowerCase() === 'portafolio web' ? '' : (item.title || '').trim();
      const displayLabel = baseLabel || (item.link ? 'Portafolio' : 'Portafolio');
      if (item.link) {
        let href = item.link;
        try { href = new URL(item.link, window.location.href).href; } catch (e) {}
        portfolioNodes.push({ text: displayLabel, style: 'linkText', link: href });
      } else {
        portfolioNodes.push({ text: displayLabel, style: 'entryTitle' });
      }
      portfolioNodes.push({ text: ' ', margin: [0, 2, 0, 0] });
    });
  }

  const classicContent = [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: name, style: 'name' },
            { text: title, style: 'jobTitle' },
            { text: metaLines.join('  |  '), style: 'metaLine', margin: [0, 8, 0, 0] }
          ]
        },
        photoDataUrl ? { width: 82, image: photoDataUrl, fit: [72, 72], alignment: 'right' } : { width: 82, text: '' }
      ],
      columnGap: 12,
      margin: [0, 0, 0, 8]
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: '#d1d5db' }], margin: [0, 0, 0, 10] },
    ...(bio ? [makeSectionTitle('PERFIL'), { text: bio, style: 'bodyText' }] : []),
    ...expNodes,
    ...eduNodes,
    ...(normalizedSkills.length ? [makeSectionTitle('HABILIDADES'), { ul: normalizedSkills, style: 'bodyText' }] : []),
    ...(normalizedLanguages.length ? [makeSectionTitle('IDIOMAS'), { ul: normalizedLanguages, style: 'bodyText' }] : []),
    ...portfolioNodes
  ];

  const sideStack = [];
  if (photoDataUrl) {
    sideStack.push({ image: photoDataUrl, fit: [150, 150], margin: [0, 0, 0, 10], alignment: 'center' });
  } else {
    const initials = (name || 'NN').split(' ').map(part => part.trim().charAt(0)).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'NN';
    sideStack.push({ text: initials, style: 'avatarInitials', margin: [0, 14, 0, 18], alignment: 'center' });
  }
  metaLines.forEach(line => sideStack.push({ text: line, style: 'sideMeta' }));
  if (normalizedSkills.length) {
    sideStack.push({ text: 'HABILIDADES', style: 'sideTitle', margin: [0, 12, 0, 4] });
    normalizedSkills.forEach(skill => sideStack.push({ text: `• ${skill}`, style: 'sideMeta' }));
  }
  
   const referencesHTML = references.length ? `<div class="cv-section"><div class="cv-section-title">Referencias</div><div class="cv-references-list">${references.map(ref => `<div class="cv-reference-item">${esc(ref)}</div>`).join('')}</div></div>` : '';
  if (normalizedLanguages.length) {
    sideStack.push({ text: 'IDIOMAS', style: 'sideTitle', margin: [0, 12, 0, 4] });
    normalizedLanguages.forEach(lang => sideStack.push({ text: `• ${lang}`, style: 'sideMeta' }));
  }

  if (references.length) {
    sideStack.push({ text: 'REFERENCIAS', style: 'sideTitle', margin: [0, 12, 0, 4] });
    references.forEach(ref => sideStack.push({ text: `• ${ref}`, style: 'sideMeta' }));
  }

  if (portfolio.length) {
    sideStack.push({ text: 'PORTAFOLIO', style: 'sideTitle', margin: [0, 12, 0, 4] });
    portfolio.forEach(item => {
      const rawTitle = String(item.title || '').trim();
      const safeTitle = rawTitle.toLowerCase() === 'portafolio web' ? '' : rawTitle;
      const displayLabel = safeTitle || 'Portafolio';
      sideStack.push({ text: displayLabel, style: 'linkText', link: item.link ? (function () { try { return new URL(item.link, window.location.href).href; } catch (e) { return item.link; } })() : undefined });
    });
  }

  const modernMain = [
    { text: name, style: 'nameModern' },
    { text: title, style: 'jobTitleModern' },
    ...(bio ? [makeSectionTitle('PERFIL'), { text: bio, style: 'bodyText' }] : []),
    ...expNodes,
    ...eduNodes,
    ...portfolioNodes
  ];

  const modernContent = [
    {
      table: {
        widths: [180, '*'],
        body: [[
          { stack: sideStack, fillColor: '#e8f7ee', margin: [10, 10, 10, 10] },
          { stack: modernMain, margin: [14, 4, 0, 0] }
        ]]
      },
      layout: 'noBorders'
    }
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: tpl === 'template-2' ? [24, 24, 24, 24] : [32, 28, 32, 28],
    content: tpl === 'template-2' ? modernContent : classicContent,
    defaultStyle: {
      font: 'Times',
      fontSize: 10,
      color: '#111827',
      lineHeight: 1.25
    },
    styles: {
      name: { fontSize: 22, bold: true, color: '#0f172a' },
      nameModern: { fontSize: 34, bold: true, color: '#0f172a' },
      jobTitle: { fontSize: 12, bold: true, color: primary, margin: [0, 4, 0, 0] },
      jobTitleModern: { fontSize: 12, bold: true, color: primary, margin: [0, 4, 0, 8] },
      metaLine: { fontSize: 9, color: '#334155' },
      sectionTitle: { fontSize: 13, bold: true, color: '#0f172a', margin: [0, 12, 0, 6] },
      entryTitle: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 2, 0, 2] },
      bodyText: { fontSize: 10.5, color: '#1f2937', margin: [0, 0, 0, 6] },
      metaText: { fontSize: 9, color: '#475569', margin: [0, 0, 0, 2] },
      linkText: { fontSize: 10.5, color: '#1d4ed8', decoration: 'underline', margin: [0, 0, 0, 3] },
      sideMeta: { fontSize: 10, color: '#1f2937', margin: [0, 0, 0, 6] },
      sideTitle: { fontSize: 10, bold: true, color: '#0f172a' },
      avatarInitials: { fontSize: 44, bold: true, color: primary }
    }
  };

  const attachments = (entries.portfolio || []).filter(item => item.fileData && item.fileType === 'application/pdf');

  try {
    await new Promise((resolve, reject) => {
      pdfMake.createPdf(docDefinition).getBlob(async (blob) => {
        try {
          if (attachments.length && window.PDFLib && window.PDFLib.PDFDocument) {
            const basePdfBytes = await blobToArrayBuffer(blob);
            const merged = await mergePdfAttachments(basePdfBytes, attachments);
            savePdfBytes(merged, 'Mi_CV.pdf');
          } else {
            saveBlobAsPdf(blob, 'Mi_CV.pdf');
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  } finally {
    if (waitModal && typeof waitModal.close === 'function') waitModal.close();
  }
}

async function generateStyledPDF(tpl, previewEl, waitModal) {
  if (!previewEl) throw new Error('No se encontró la vista previa del CV');
  if (!window.html2canvas) throw new Error('html2canvas no está disponible');
  const { jsPDF } = window.jspdf;

  await document.fonts.ready;

  const clone = cloneWithInlineStyles(previewEl);
  clone.style.background = '#ffffff';
  clone.style.boxSizing = 'border-box';

  const width = Math.ceil(previewEl.getBoundingClientRect().width || previewEl.scrollWidth || 800);
  clone.style.width = `${width}px`;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${width}px`;
  container.style.background = '#ffffff';
  container.style.zIndex = '-1';
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width,
      windowWidth: width
    });

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = tpl === 'template-2' ? 18 : 24;
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const imgHeight = (canvas.height * printableWidth) / canvas.width;

    let renderedHeight = 0;
    pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, imgHeight, undefined, 'FAST');
    renderedHeight += printableHeight;

    while (renderedHeight < imgHeight) {
      pdf.addPage();
      const yOffset = margin - renderedHeight;
      pdf.addImage(imgData, 'JPEG', margin, yOffset, printableWidth, imgHeight, undefined, 'FAST');
      renderedHeight += printableHeight;
    }

    const basePdfBytes = pdf.output('arraybuffer');
    const attachments = (entries.portfolio || []).filter(item => item.fileData && item.fileType === 'application/pdf');

    if (attachments.length && window.PDFLib && window.PDFLib.PDFDocument) {
      const merged = await mergePdfAttachments(basePdfBytes, attachments);
      savePdfBytes(merged, 'Mi_CV.pdf');
    } else {
      savePdfBytes(basePdfBytes, 'Mi_CV.pdf');
    }
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
    if (waitModal && typeof waitModal.close === 'function') waitModal.close();
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
  if (skills && skills.length) {
    addSectionTitle('Habilidades');
    addTextBlock(skills.map(s => (typeof s === 'string' ? s : '')).filter(Boolean).join(', '), { size: 11 });
  }
  if (languages && languages.length) {
    addSectionTitle('Idiomas');
    const languageText = languages.map(lang => {
      if (typeof lang === 'string') return lang;
      if (lang && typeof lang === 'object') {
        const name = lang.name || '';
        const percent = (lang.percent !== undefined && lang.percent !== null && String(lang.percent) !== '')
          ? ` (${lang.percent}%)`
          : '';
        return `${name}${percent}`.trim();
      }
      return '';
    }).filter(Boolean).join(', ');
    addTextBlock(languageText, { size: 11 });
  }

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
