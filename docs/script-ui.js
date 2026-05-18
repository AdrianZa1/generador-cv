// Frontend helper: backend URL from meta tag (define only if not defined)
if (typeof BACKEND_URL === 'undefined') {
  var BACKEND_URL = document.querySelector('meta[name="backend-url"]')?.content || '';
}

// ===================== LÓGICA DE INTERFAZ Y FORMULARIOS =====================

let tutorialState = null;
let tutorialCalloutTimer = null;
let tutorialRepositionHandler = null;
let tutorialAutoAdvanceTimer = null;

function setTutorialHint(html) {
  const hint = document.getElementById('tutorial-hint');
  if (!hint) return;
  if (!html) {
    hint.style.display = 'none';
    hint.innerHTML = '';
    return;
  }
  hint.style.display = '';
  hint.innerHTML = html;
}

function ensureTutorialCallout() {
  let callout = document.getElementById('tutorial-callout');
  if (callout) return callout;
  callout = document.createElement('div');
  callout.id = 'tutorial-callout';
  callout.className = 'tutorial-callout';
  callout.style.display = 'none';
  document.body.appendChild(callout);
  return callout;
}

function clearTutorialTimers() {
  if (tutorialCalloutTimer) { clearTimeout(tutorialCalloutTimer); tutorialCalloutTimer = null; }
  if (tutorialAutoAdvanceTimer) { clearTimeout(tutorialAutoAdvanceTimer); tutorialAutoAdvanceTimer = null; }
}

function removeTutorialRepositionHandler() {
  if (!tutorialRepositionHandler) return;
  window.removeEventListener('scroll', tutorialRepositionHandler, true);
  window.removeEventListener('resize', tutorialRepositionHandler);
  tutorialRepositionHandler = null;
}

function hideTutorialCallout() {
  clearTutorialTimers();
  removeTutorialRepositionHandler();
  const callout = document.getElementById('tutorial-callout');
  if (callout) {
    callout.style.display = 'none';
    callout.innerHTML = '';
  }
}

function positionTutorialCallout(target, message, options = {}) {
  const callout = ensureTutorialCallout();
  clearTutorialTimers();
  removeTutorialRepositionHandler();

  callout.innerHTML = `
    <div class="tutorial-callout-body">
      <div class="tutorial-callout-message">${message}</div>
      ${options.lines && options.lines.length ? `<div class="tutorial-callout-lines">${options.lines.map(line => `<div class="tutorial-callout-line">${line}</div>`).join('')}</div>` : ''}
      ${options.showNextButton ? `<div class="tutorial-callout-actions"><button type="button" class="btn primary tutorial-callout-next">${esc(options.nextLabel || 'Siguiente')}</button></div>` : ''}
      ${options.showClose === false ? '' : '<button type="button" class="tutorial-callout-close" aria-label="Cerrar">×</button>'}
    </div>`;
  callout.style.display = 'block';

  const closeBtn = callout.querySelector('.tutorial-callout-close');
  if (closeBtn) closeBtn.onclick = () => endIntroTour();
  const nextBtn = callout.querySelector('.tutorial-callout-next');
  if (nextBtn) nextBtn.onclick = () => {
    clearTutorialTimers();
    advanceTutorial();
  };

  const place = () => {
    const rect = target.getBoundingClientRect();
    const bubble = callout.getBoundingClientRect();
    const gap = 14;
    let top = rect.bottom + gap + window.scrollY;
    let left = rect.left + window.scrollX;

    if (options.placement === 'right') {
      top = rect.top + window.scrollY - 4;
      left = rect.right + gap + window.scrollX;
    } else if (options.placement === 'top') {
      top = rect.top + window.scrollY - bubble.height - gap;
      left = rect.left + window.scrollX;
    } else {
      top = rect.bottom + gap + window.scrollY;
      left = rect.left + window.scrollX;
    }

    const maxLeft = window.scrollX + window.innerWidth - bubble.width - 16;
    const minLeft = window.scrollX + 16;
    const maxTop = window.scrollY + window.innerHeight - bubble.height - 16;
    if (left > maxLeft) left = maxLeft;
    if (left < minLeft) left = minLeft;
    if (top > maxTop) top = rect.top + window.scrollY - bubble.height - gap;
    if (top < window.scrollY + 16) top = window.scrollY + 16;

    callout.style.left = `${left}px`;
    callout.style.top = `${top}px`;
  };

  tutorialRepositionHandler = () => place();
  window.addEventListener('scroll', tutorialRepositionHandler, true);
  window.addEventListener('resize', tutorialRepositionHandler);
  requestAnimationFrame(place);

  if (options.autoAdvanceAfter) {
    tutorialAutoAdvanceTimer = setTimeout(() => {
      if (tutorialState && tutorialState.active) advanceTutorial();
    }, options.autoAdvanceAfter);
  }

  return callout;
}

function clearTutorialHighlights() {
  document.querySelectorAll('.tutorial-focus').forEach(el => el.classList.remove('tutorial-focus'));
  document.querySelectorAll('.tutorial-preview-focus').forEach(el => el.classList.remove('tutorial-preview-focus'));
}

function focusTutorialTarget(selector) {
  clearTutorialHighlights();
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  el.classList.add(selector === '.cv-name' ? 'tutorial-preview-focus' : 'tutorial-focus');
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  if (typeof el.focus === 'function') el.focus({ preventScroll: true });
  return el;
}

function isMobileViewport() {
  return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
}

function startIntroTour() {
  const mobile = isMobileViewport();
  tutorialState = {
    active: true,
    step: 0,
    steps: [
      {
        selector: '#f-name',
        hint: mobile
          ? '<strong>Paso 1.</strong> Escribe tu nombre y presiona <strong>Siguiente</strong>.'
          : '<strong>Paso 1.</strong> Escribe aquí tu nombre y presiona Enter.',
        focusPage: 1,
        placement: 'bottom',
        showNextButton: mobile,
        nextLabel: 'Siguiente'
      },
      { selector: '.cv-name', hint: '<strong>Paso 2.</strong> Aquí se muestra automáticamente tu nombre en la plantilla.', placement: 'right', showNextButton: true, nextLabel: 'Siguiente', autoAdvanceAfter: 123000 },
      { selector: '#download-pdf-footer', hint: '<strong>Último paso.</strong> Una vez completada tu plantilla, puedes descargarla en el botón Descargar PDF.', placement: 'bottom', focusPage: 1 }
    ]
  };
  showTutorialStep(0);
}

function endIntroTour() {
  if (!tutorialState) return;
  tutorialState.active = false;
  tutorialState.step = 0;
  tutorialState = null;
  clearTutorialHighlights();
  hideTutorialCallout();
  setTutorialHint('');
}

function showTutorialStep(stepIndex) {
  if (!tutorialState || !tutorialState.steps[stepIndex]) return;
  hideTutorialCallout();
  tutorialState.step = stepIndex;
  const step = tutorialState.steps[stepIndex];
  if (step.focusPage) showPage(step.focusPage);
  setTutorialHint('');
  const el = focusTutorialTarget(step.selector);
  if (step.selector === '#f-name' && el) {
    el.setAttribute('placeholder', 'Escribe tu nombre aquí y presiona Enter');
  }
  if (el) {
    positionTutorialCallout(el, step.hint, {
      placement: step.placement || 'bottom',
      autoAdvanceAfter: step.autoAdvanceAfter,
      showClose: true,
      lines: step.lines || [],
      showNextButton: !!step.showNextButton,
      nextLabel: step.nextLabel || 'Siguiente'
    });
  }
}

function advanceTutorial() {
  if (!tutorialState || !tutorialState.active) return;
  const nextStep = tutorialState.step + 1;
  if (nextStep >= tutorialState.steps.length) {
    setTutorialHint('<strong>Listo.</strong> Ya puedes completar tu hoja de vida y exportarla como PDF cuando quieras.');
    clearTutorialHighlights();
    return;
  }
  showTutorialStep(nextStep);
}

function updateReferencesVisibility() {
  const tplSel = document.getElementById('template-select');
  const refs = document.getElementById('references-section');
  if (!refs) return;
  refs.style.display = (tplSel && tplSel.value === 'template-2') ? '' : 'none';
}

// Palette selector for template-2 (moderno)
const paletteOptions = [
  { name: 'Verde', primary: '#16a34a', primary600: '#15803d', primary50: '#ecfdf3', primary100: '#dcfce7' },
  { name: 'Azul', primary: '#2563eb', primary600: '#1f4fc4', primary50: '#ecf3ff', primary100: '#dff2ff' },
  { name: 'Morado', primary: '#6d28d9', primary600: '#5b21b6', primary50: '#f3e8ff', primary100: '#ede9fe' },
  { name: 'Naranja', primary: '#f59e0b', primary600: '#d97706', primary50: '#fff7ed', primary100: '#ffedd5' },
  { name: 'Gris', primary: '#374151', primary600: '#1f2937', primary50: '#f8fafc', primary100: '#f1f5f9' }
];

function renderPaletteSelector() {
  const container = document.getElementById('palette-selector');
  if (!container) return;
  container.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'palette-container';
  paletteOptions.forEach((p, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'palette-swatch';
    btn.title = p.name;
    btn.style.background = p.primary;
    btn.dataset.idx = idx;
    btn.addEventListener('click', () => { applyPalette(idx); markSelectedSwatch(idx); });
    wrap.appendChild(btn);
  });
  container.appendChild(wrap);
  // label
  const label = document.createElement('div'); label.className = 'palette-label'; label.textContent = 'Color (Moderna)';
  container.appendChild(label);
  updatePaletteVisibility();
}

function markSelectedSwatch(idx) {
  const container = document.querySelectorAll('.palette-swatch');
  container.forEach(el => el.classList.toggle('selected', Number(el.dataset.idx) === idx));
}

function applyPalette(idx) {
  const p = paletteOptions[idx];
  if (!p) return;
  document.documentElement.style.setProperty('--primary', p.primary);
  document.documentElement.style.setProperty('--primary-600', p.primary600);
  document.documentElement.style.setProperty('--primary-50', p.primary50);
  document.documentElement.style.setProperty('--primary-100', p.primary100);
  // re-render preview if needed
  sync();
}

function updatePaletteVisibility() {
  const sel = document.getElementById('template-select');
  const container = document.getElementById('palette-selector');
  if (!container || !sel) return;
  container.style.display = sel.value === 'template-2' ? 'flex' : 'none';
}

function addEntry(type) {
  const id = ++counters[type];
  entries[type].push({ id, company: '', role: '', dates: '', desc: '' });
  renderEntries(type);
  sync();
}

function removeEntry(type, id) {
  entries[type] = entries[type].filter(e => e.id !== id);
  renderEntries(type);
  sync();
}

function renderEntries(type) {
  const container = document.getElementById(type + '-list');
  if (!container) return;
  container.innerHTML = '';

  entries[type].forEach(e => {
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `
      <button class="entry-remove" onclick="removeEntry('${type}', ${e.id})"><i class="ti ti-x"></i></button>
      <div class="field-row">
        <div>
          <label>${type==='exp'?'Empresa':'Institución'}</label>
          <input type="text" value="${esc(e.company)}" oninput="updateEntryText('${type}', ${e.id}, 'company', this)">
        </div>
        <div>
          <label>${type==='exp'?'Cargo':'Título'}</label>
          <input type="text" value="${esc(e.role)}" oninput="updateEntryText('${type}', ${e.id}, 'role', this)">
        </div>
      </div>
      <div class="field-row full" style="margin-top:8px">
        <label>Período</label>
        <input type="text" placeholder="2024-2025 ene-dic" value="${esc(e.dates)}" onblur="autoFormatPeriod(this)" oninput="updateEntryText('${type}', ${e.id}, 'dates', this)">
      </div>
      ${type === 'exp' ? `
        <div class="field-row full" style="margin-top:8px">
          <label>Descripción</label>
          <div style="display:flex; gap:8px; align-items:flex-start; width:100%">
            <textarea placeholder="Una breve descripción" oninput="updateEntryText('${type}', ${e.id}, 'desc', this)">${esc(e.desc)}</textarea>
            <div style="display:flex; align-items:flex-start; flex-direction:column; gap:6px">
              <button class="add-btn" type="button" onclick="improveEntryDesc(${e.id})">Mejorar</button>
              <button class="add-btn" type="button" onclick="createEntryDesc(${e.id})">Crear</button>
            </div>
          </div>
        </div>` : ''}
    `;
    container.appendChild(div);
  });
}

function autoFormatPeriod(el) {
  if (!el) return;
  const v = (el.value||'').trim();
  // If user entered only years like "2024-2025", append months example
  const m = v.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (m) {
    el.value = `${m[1]}-${m[2]} ene-dic`;
    // trigger input event if present
    const ev = new Event('input', { bubbles: true });
    el.dispatchEvent(ev);
  }
}

function normalizeImprovedText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\.\.+/g, '.')
    .trim();
}

async function rewriteTextFormal(originalText, contextPrompt) {
  const currentText = normalizeImprovedText(originalText);
  if (!currentText) return '';

  const systemPrompt = 'Eres un asistente experto en redacción de CV en español. Reescribe el texto en un tono más formal, claro y profesional, sin cambiar el significado. Devuelve solo el texto final.';
  const userPrompt = `${contextPrompt}\n\nTexto original:\n${currentText}`;

  try {
    const rewritten = await callOpenAI(systemPrompt, userPrompt);
    const cleaned = normalizeImprovedText(rewritten);
    return cleaned || currentText;
  } catch (err) {
    console.error('rewriteTextFormal error', err);
    return currentText;
  }
}

function improveEntryDesc(id) {
  const entry = entries.exp.find(x => x.id === id);
  if (!entry) return showMessageModal('Entrada no encontrada', { title: 'Error' });
  const existingText = normalizeImprovedText(entry.desc);
  if (!existingText) {
    showMessageModal('Primero escribe una descripción en el campo y luego presiona Mejorar.', { title: 'Falta texto' });
    return;
  }

  const wait = showWaitingModal('Mejorando descripción...');
  rewriteTextFormal(existingText, `Reescribe una descripción de experiencia laboral para un CV. Mantén el rol ${entry.role || 'del puesto'} y la empresa ${entry.company || 'indicada'} en un tono formal y profesional.`)
    .then(out => {
      entry.desc = out;
      renderEntries('exp');
      sync();
      showMessageModal('Descripción mejorada y aplicada', { title: 'Hecho' });
    })
    .catch(err => {
      console.error(err);
      showMessageModal('No se pudo mejorar el texto.', { title: 'Aviso' });
    })
    .finally(() => { try { wait.close(); } catch(e){} });
}

function createEntryDesc(id) {
  const entry = entries.exp.find(x => x.id === id);
  if (!entry) return showMessageModal('Entrada no encontrada', { title: 'Error' });
  const questions = [
    { q: `¿Cuál fue tu responsabilidad principal como ${entry.role || 'cargo'} en ${entry.company || 'la empresa'}?`, placeholder: 'Describe la responsabilidad principal' },
    { q: 'Describe un logro destacable en ese puesto', placeholder: 'Ej: aumenté ventas, coordiné eventos, resolví incidencias' },
    { q: '¿Qué herramientas, procesos o métodos utilizaste?', placeholder: 'Ej: Excel, inventarios, atención al público, logística' },
    { q: '¿Cuántas personas, clientes o áreas involucró tu trabajo?', placeholder: 'Ej: equipo de 4, varios clientes, cobertura nacional' },
    { q: '¿Cómo resumirías tu contribución en una frase?', placeholder: 'Frase breve de resumen' }
  ];
  showQuestionModal({ title: 'Crear descripción', intro: 'Te haré 5 preguntas para generar una descripción profesional.', questions }, (answers) => {
    showConfirmModal('¿Quieres que la IA genere la descripción? (recomendado)', async (useAI) => {
      if (useAI) {
        const proceedWithAI = async () => {
          const wait = showWaitingModal('Generando con IA...');
          try {
            const system = 'Eres un asistente que genera descripciones profesionales para CV en español. Mantén máximo 150 palabras.';
            const userPrompt = `Contexto: experiencia en ${entry.company||''} como ${entry.role||''}. Respuestas: ${answers.join(' | ')}`;
            let out = await callOpenAI(system, userPrompt);
            out = truncateWords(out, 150);
            if (!out) out = generateTextFromAnswers('exp', answers, { company: entry.company, role: entry.role });
            entry.desc = out; renderEntries('exp'); sync(); showMessageModal('Descripción creada y añadida', { title: 'Listo' });
          } catch (err) {
            console.error(err);
            const fallback = generateTextFromAnswers('exp', answers, { company: entry.company, role: entry.role });
            entry.desc = fallback; renderEntries('exp'); sync(); showMessageModal('No se pudo usar la IA, se aplicó una descripción generada localmente', { title: 'Aviso' });
          } finally { try { wait.close(); } catch(e){} }
        };
        if (!getAIKey()) {
          promptForApiKey((k) => { if (k) proceedWithAI(); else showMessageModal('Clave no guardada, usando generación local.', { title: 'Aviso' }); });
        } else proceedWithAI();
      } else {
        const gen = generateTextFromAnswers('exp', answers, { company: entry.company, role: entry.role });
        entry.desc = gen; renderEntries('exp'); sync(); showMessageModal('Descripción creada y añadida', { title: 'Listo' });
      }
    });
  });
}

function createBioInteractive() {
  const questions = [
    { q: '¿Cuál es tu especialidad o título profesional?', placeholder: 'Ej: Enfermera, Docente, Contador, Abogado' },
    { q: '¿Cuántos años de experiencia tienes?', placeholder: 'Ej: 3 años en tu área' },
    { q: 'Menciona 2-3 habilidades clave o fortalezas', placeholder: 'Ej: comunicación, liderazgo, organización' },
    { q: '¿Cuál es tu objetivo profesional a corto plazo?', placeholder: 'Ej: crecer en mi área y asumir más responsabilidades' },
    { q: '¿Qué te diferencia como profesional?', placeholder: 'Ej: atención al detalle, empatía, responsabilidad' }
  ];
  showQuestionModal({ title: 'Crear resumen profesional', intro: '', questions }, (answers) => {
    showConfirmModal('¿Quieres que la IA genere tu resumen profesional? (recomendado)', async (useAI) => {
      if (useAI) {
        const proceedWithAI = async () => {
          const wait = showWaitingModal('Generando con IA...');
          try {
            const system = 'Eres un asistente que genera resúmenes profesionales para CV en español. Mantén máximo 150 palabras.';
            const userPrompt = `Perfil: respuestas: ${answers.join(' | ')}`;
            let out = await callOpenAI(system, userPrompt);
            out = truncateWords(out, 150);
            if (!out) out = generateTextFromAnswers('profile', answers);
            const bioEl = document.getElementById('f-bio'); if (bioEl) bioEl.value = out;
            sync(); showMessageModal('Resumen generado e insertado', { title: 'Listo' });
          } catch (err) {
            console.error(err);
            const fallback = generateTextFromAnswers('profile', answers);
            const bioEl = document.getElementById('f-bio'); if (bioEl) bioEl.value = fallback;
            sync(); showMessageModal('No se pudo usar la IA, se aplicó una descripción generada localmente', { title: 'Aviso' });
          } finally { try { wait.close(); } catch(e){} }
        };
        if (!getAIKey()) {
          promptForApiKey((k) => { if (k) proceedWithAI(); else showMessageModal('Clave no guardada, usando generación local.', { title: 'Aviso' }); });
        } else proceedWithAI();
      } else {
        const gen = generateTextFromAnswers('profile', answers);
        const bioEl = document.getElementById('f-bio'); if (bioEl) bioEl.value = gen;
        sync(); showMessageModal('Resumen generado e insertado', { title: 'Listo' });
      }
    });
  });
}

function improveBioInteractive() {
  const current = (document.getElementById('f-bio')||{}).value || '';
  const existingText = normalizeImprovedText(current);
  if (!existingText) {
    showMessageModal('Primero escribe un resumen en el campo y luego presiona Mejorar.', { title: 'Falta texto' });
    return;
  }

  const wait = showWaitingModal('Mejorando resumen...');
  rewriteTextFormal(existingText, 'Reescribe este resumen profesional para un CV. Hazlo más formal, claro y convincente, sin cambiar el contenido esencial.')
    .then(out => {
      const bioEl = document.getElementById('f-bio');
      if (bioEl) bioEl.value = out || current;
      sync();
      showMessageModal('Resumen mejorado e insertado', { title: 'Hecho' });
    })
    .catch(err => {
      console.error(err);
      showMessageModal('No se pudo mejorar el texto.', { title: 'Aviso' });
    })
    .finally(() => { try { wait.close(); } catch(e){} });
}

function updateEntryText(type, id, field, el) {
  let v = el.value;
  if (autocorrectEnabled) v = autocorrectText(v, field);
  const entry = entries[type].find(x => x.id === id);
  if (entry) entry[field] = v;
  if (v !== el.value) el.value = v;
  sync();
}

function addSkill() {
  const inp = document.getElementById('f-skill');
  const v = inp.value.trim();
  if (!v || skills.includes(v)) return;
  skills.push(v);
  inp.value = '';
  renderSkillChips();
  sync();
}

function renderSkillChips() {
  const c = document.getElementById('skill-chips');
  if (!c) return;
  c.innerHTML = '';
  skills.forEach((s, idx) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.innerHTML = `<span onclick="editSkill(${idx})" style="cursor:pointer">${esc(s)}</span><button onclick="removeSkill(${idx})">×</button>`;
    c.appendChild(chip);
  });
}

function removeSkill(idx) { skills.splice(idx, 1); renderSkillChips(); sync(); }
function editSkill(idx) {
  const newVal = prompt("Editar habilidad:", skills[idx]);
  if (newVal !== null && newVal.trim() !== "") { skills[idx] = newVal.trim(); renderSkillChips(); sync(); }
}

function addLanguage() {
  const inp = document.getElementById('f-language');
  const v = inp.value.trim();
  if (!v || languages.includes(v)) return;
  languages.push(v);
  inp.value = '';
  renderLanguageChips();
  sync();
}

function renderLanguageChips() {
  const c = document.getElementById('language-chips');
  if (!c) return;
  c.innerHTML = '';
  languages.forEach((l, idx) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.innerHTML = `<span onclick="editLanguage(${idx})" style="cursor:pointer">${esc(l)}</span><button onclick="removeLanguage(${idx})">×</button>`;
    c.appendChild(chip);
  });
}

function removeLanguage(idx) { languages.splice(idx, 1); renderLanguageChips(); sync(); }
function editLanguage(idx) {
  const newVal = prompt("Editar idioma:", languages[idx]);
  if (newVal !== null && newVal.trim() !== "") { languages[idx] = newVal.trim(); renderLanguageChips(); sync(); }
}

function addPortfolio() {
  const titleEl = document.getElementById('f-portfolio-title');
  const linkEl = document.getElementById('f-portfolio-link');
  const typeEl = document.getElementById('f-portfolio-type');
  const fileEl = document.getElementById('f-portfolio-file');
  if (!typeEl) return;
  const rawType = typeEl.value.trim();
  if (!rawType) {
    showMessageModal('Primero selecciona el tipo de adjunto.', { title: 'Falta el tipo' });
    return;
  }
  const title = titleEl.value.trim();
  const link = linkEl.value.trim();
  const type = rawType;
  const file = fileEl.files && fileEl.files[0];
  if (!title && !link && !file) return;
  if (type === 'portafolio web' && !link) {
    showMessageModal('Para portafolio web, agrega el enlace.', { title: 'Falta el enlace' });
    return;
  }
  if (type === 'certificado' && !file) {
    showMessageModal('Para certificado, sube el archivo PDF.', { title: 'Falta el archivo' });
    return;
  }
  if (type === 'proyecto' && !link && !file) {
    showMessageModal('Para proyecto, agrega un enlace o sube un archivo.', { title: 'Falta información' });
    return;
  }
  if (type === 'evidencia' && !file) {
    showMessageModal('Para evidencia de trabajo, sube una imagen o PDF.', { title: 'Falta el archivo' });
    return;
  }
  const addItem = (fileData = null, fileName = '', fileType = '') => {
    entries.portfolio.push({ id: ++counters.portfolio, type, title, link, fileData, fileName, fileType });
    if (titleEl) titleEl.value = '';
    if (linkEl) linkEl.value = '';
    if (fileEl) fileEl.value = '';
    updatePortfolioFormVisibility();
    renderPortfolioItems();
    sync();
  };
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      showMessageModal('El archivo supera 5 MB. Usa un enlace o sube un archivo más liviano.', { title: 'Archivo muy grande' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => addItem(String(reader.result || ''), file.name, file.type || '');
    reader.onerror = () => showMessageModal('No se pudo leer el archivo seleccionado.', { title: 'Error' });
    reader.readAsDataURL(file);
    return;
  }
  if (titleEl) titleEl.value = '';
  if (linkEl) linkEl.value = '';
  addItem();
}

function removePortfolio(id) {
  entries.portfolio = entries.portfolio.filter(item => item.id !== id);
  renderPortfolioItems();
  sync();
}

function renderPortfolioItems() {
  const container = document.getElementById('portfolio-list');
  if (!container) return;
  container.innerHTML = '';

  entries.portfolio.forEach(item => {
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `
      <button class="entry-remove" onclick="removePortfolio(${item.id})"><i class="ti ti-x"></i></button>
      <div class="field-row">
        <div>
          <label>Tipo</label>
          <select onchange="updatePortfolioText(${item.id}, 'type', this)">
            ${['portafolio web','certificado','proyecto','evidencia','otro'].map(option => `<option value="${esc(option)}" ${item.type === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}
          </select>
        </div>
        <div style="${needsPortfolioTitle(item.type) ? '' : 'display:none'}">
          <label>Título</label>
          <input type="text" value="${esc(item.title)}" oninput="updatePortfolioText(${item.id}, 'title', this)">
        </div>
      </div>
      <div class="field-row full" style="margin-top:8px">
        <div style="${needsPortfolioLink(item.type) ? '' : 'display:none'}">
          <label>Enlace o URL</label>
          <input type="text" value="${esc(item.link)}" oninput="updatePortfolioText(${item.id}, 'link', this)">
        </div>
        <div style="${needsPortfolioFile(item.type) ? '' : 'display:none'}">
          <label>Archivo</label>
          <input type="file" accept="image/*,application/pdf" onchange="updatePortfolioFile(${item.id}, this)">
          <div class="help-text">${item.fileName ? (item.fileType === 'application/pdf' ? `PDF adjunto: ${esc(item.fileName)}. Se anexará al final del CV.` : `Archivo actual: ${esc(item.fileName)}`) : 'Opcional: PDF o imagen'}</div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function needsPortfolioTitle(type) {
  return ['portafolio web', 'certificado', 'proyecto', 'evidencia', 'otro'].includes(type);
}

function needsPortfolioLink(type) {
  return ['portafolio web', 'proyecto', 'otro'].includes(type);
}

function needsPortfolioFile(type) {
  return ['certificado', 'proyecto', 'evidencia', 'otro'].includes(type);
}

function getPortfolioConfig(type) {
  const normalized = String(type || '').trim();
  return {
    showTitle: needsPortfolioTitle(normalized),
    showLink: needsPortfolioLink(normalized),
    showFile: needsPortfolioFile(normalized),
    fileAccept: normalized === 'certificado' ? 'application/pdf' : 'image/*,application/pdf'
  };
}

function updatePortfolioFormVisibility() {
  const typeEl = document.getElementById('f-portfolio-type');
  const titleWrap = document.getElementById('portfolio-title-field');
  const linkWrap = document.getElementById('portfolio-link-field');
  const fileWrap = document.getElementById('portfolio-file-field');
  const fileEl = document.getElementById('f-portfolio-file');
  if (!typeEl || !titleWrap || !linkWrap || !fileWrap) return;
  const cfg = getPortfolioConfig(typeEl.value);
  titleWrap.style.display = cfg.showTitle ? '' : 'none';
  linkWrap.style.display = cfg.showLink ? '' : 'none';
  fileWrap.style.display = cfg.showFile ? '' : 'none';
  if (fileEl) fileEl.setAttribute('accept', cfg.fileAccept);
  const addBtn = document.getElementById('btn-add-portfolio');
  if (addBtn) addBtn.disabled = !typeEl.value.trim();
}

function updatePortfolioText(id, field, el) {
  const item = entries.portfolio.find(x => x.id === id);
  if (!item) return;
  let v = el.value;
  if (autocorrectEnabled && field === 'title') v = autocorrectText(v, 'f-title');
  item[field] = v;
  if (v !== el.value) el.value = v;
  if (field === 'type') {
    const cfg = getPortfolioConfig(v);
    const row = el.closest('.entry-card');
    if (row) {
      const titleWrap = row.querySelectorAll('.field-row')[0]?.children?.[1];
      const linkWrap = row.querySelectorAll('.field-row')[1]?.children?.[0];
      const fileWrap = row.querySelectorAll('.field-row')[1]?.children?.[1];
      if (titleWrap) titleWrap.style.display = cfg.showTitle ? '' : 'none';
      if (linkWrap) linkWrap.style.display = cfg.showLink ? '' : 'none';
      if (fileWrap) fileWrap.style.display = cfg.showFile ? '' : 'none';
      const input = row.querySelector('input[type="file"]');
      if (input) input.setAttribute('accept', cfg.fileAccept);
    }
    if (!cfg.showTitle) item.title = '';
    if (!cfg.showLink) item.link = '';
    if (!cfg.showFile) { item.fileData = ''; item.fileName = ''; item.fileType = ''; }
  }
  sync();
}

function updatePortfolioFile(id, input) {
  const item = entries.portfolio.find(x => x.id === id);
  if (!item || !input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    input.value = '';
    showMessageModal('El archivo supera 5 MB. Usa un enlace o sube un archivo más liviano.', { title: 'Archivo muy grande' });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    item.fileData = String(reader.result || '');
    item.fileName = file.name;
    item.fileType = file.type || '';
    sync();
    renderPortfolioItems();
  };
  reader.onerror = () => showMessageModal('No se pudo leer el archivo seleccionado.', { title: 'Error' });
  reader.readAsDataURL(file);
}

function safeHref(url) {
  const value = String(url || '').trim();
  if (!value) return '#';
  try {
    const parsed = new URL(value, window.location.href);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '#';
    return parsed.href;
  } catch {
    return '#';
  }
}

function showWaitingModal(message) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal style-glass">
      <div class="modal-header">
        <div>
          <div class="modal-title">${esc(message)}</div>
          <div class="modal-sub">Proceso en curso</div>
        </div>
      </div>
      <div class="modal-body">Por favor espera...</div>
      <div class="modal-footer"><button class="btn ghost" onclick="(this.closest('.modal-overlay')||this).remove()">Cerrar</button></div>
    </div>`;
  root.appendChild(overlay);
  return { close: () => overlay.remove() };
}

function showMessageModal(message, options = {}) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  const okText = options.okText || 'Aceptar';
  const title = options.title || '';
  overlay.innerHTML = `
    <div class="modal style-glass style-accent">
      <div class="modal-header">
        <div>
          ${title ? `<div class="modal-title">${esc(title)}</div>` : ''}
          <div class="modal-sub">${esc(message)}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn primary" id="__msg_ok">${esc(okText)}</button>
      </div>
    </div>`;
  root.appendChild(overlay);
  const btn = overlay.querySelector('#__msg_ok');
  const close = () => overlay.remove();
  if (btn) btn.addEventListener('click', () => { close(); if (typeof options.onClose === 'function') options.onClose(); });
  return { close };
}

function showFieldError(fieldId, message) {
  const errId = 'err-' + fieldId.replace(/^f-/, '');
  const errEl = document.getElementById(errId);
  const field = document.getElementById(fieldId);
  if (errEl) { errEl.style.display = ''; errEl.textContent = message; }
  if (field) field.classList.add('input-error');
}

function showQuestionModal(options, onComplete) {
  // options: { title, intro, questions: [{q, placeholder}], maxQuestions }
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  const modal = document.createElement('div'); modal.className = 'modal style-glass';
  let idx = -1;
  const answers = [];
  let header;

  function render() {
    modal.innerHTML = '';
    header = document.createElement('div'); header.className = 'modal-header';
    header.innerHTML = `<div><div class="modal-title">${esc(options.title||'')}</div><div class="modal-sub">${esc(options.intro||'')}</div></div><button class="modal-close" aria-label="Cerrar">×</button>`;
    modal.appendChild(header);
    const closeBtn = header.querySelector('.modal-close');
    if (closeBtn) closeBtn.onclick = () => overlay.remove();

    const body = document.createElement('div'); body.className = 'modal-body';
    const container = document.createElement('div'); container.style.minHeight = '80px';

    if (idx === -1) {
      // Intro screen
      container.innerHTML = `<p>Se harán ${options.questions.length} preguntas para generar el texto. Presiona Siguiente para comenzar.</p>`;
    } else {
      const q = options.questions[idx];
      container.innerHTML = `<label style="font-weight:700">${esc(q.q)}</label><div style="height:8px"></div>`;
      const input = document.createElement(q.multiline ? 'textarea' : 'input');
      if (q.multiline) input.rows = 4; else input.type = 'text';
      input.style.width = '100%';
      input.placeholder = q.placeholder || '';
      input.value = answers[idx] || '';
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !q.multiline) { e.preventDefault(); next(); } });
      container.appendChild(input);
      // focus
      setTimeout(() => input.focus(), 60);
    }

    body.appendChild(container);
    modal.appendChild(body);

    const footer = document.createElement('div'); footer.className = 'modal-footer';
    const btnBack = document.createElement('button'); btnBack.className = 'btn ghost'; btnBack.textContent = 'Atrás';
    const btnNext = document.createElement('button'); btnNext.className = 'btn primary'; btnNext.textContent = idx === options.questions.length-1 ? 'Terminar' : 'Siguiente';
    footer.appendChild(btnBack); footer.appendChild(btnNext);
    modal.appendChild(footer);

    btnBack.onclick = () => { if (idx <= -1) { overlay.remove(); } else { idx--; render(); } };
    btnNext.onclick = () => next();

    function next() {
      if (idx === -1) { idx = 0; render(); return; }
      // read input
      const inputEl = modal.querySelector('.modal-body').querySelector('input, textarea');
      answers[idx] = inputEl ? inputEl.value.trim() : '';
      if (idx < options.questions.length - 1) { idx++; render(); return; }
      // finish
      overlay.remove();
      if (typeof onComplete === 'function') onComplete(answers);
    }
  }

  modal.addEventListener('click', (e) => e.stopPropagation());
  overlay.addEventListener('click', () => overlay.remove());
  overlay.appendChild(modal);
  root.appendChild(overlay);
  render();
  return { close: () => overlay.remove() };
}

function showConfirmModal(message, onConfirm, options = {}) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  const yesText = options.yesText || 'Sí';
  const noText = options.noText || 'No';
  const title = options.title || 'Confirmar';
  overlay.innerHTML = `
    <div class="modal style-glass style-accent">
      <div class="modal-header"><div><div class="modal-title">${esc(title)}</div><div class="modal-sub">${esc(message)}</div></div></div>
      <div class="modal-footer"><button class="btn ghost" id="__no">${esc(noText)}</button><button class="btn primary" id="__yes">${esc(yesText)}</button></div>
    </div>`;
  root.appendChild(overlay);
  const yes = overlay.querySelector('#__yes');
  const no = overlay.querySelector('#__no');
  yes.onclick = () => { overlay.remove(); if (typeof onConfirm === 'function') onConfirm(true); };
  no.onclick = () => { overlay.remove(); if (typeof onConfirm === 'function') onConfirm(false); };
  return { close: () => overlay.remove() };
}

function setAIKey(key) { try { localStorage.setItem('openai_api_key', key || ''); } catch(e) {} }
function getAIKey() { try { return localStorage.getItem('openai_api_key') || ''; } catch(e) { return ''; } }

function promptForApiKey(onSaved) {
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal style-glass">
      <div class="modal-header"><div><div class="modal-title">Configurar clave de IA</div><div class="modal-sub">Introduce tu clave de OpenAI (se guarda localmente)</div></div></div>
      <div class="modal-body"><input id="__api_key_input" style="width:100%" placeholder="sk-..."/></div>
      <div class="modal-footer"><button class="btn ghost" id="__cancel">Cancelar</button><button class="btn primary" id="__save">Guardar</button></div>
    </div>`;
  root.appendChild(overlay);
  const inp = overlay.querySelector('#__api_key_input'); inp.value = getAIKey();
  overlay.querySelector('#__cancel').onclick = () => overlay.remove();
  overlay.querySelector('#__save').onclick = () => { setAIKey(inp.value.trim()); overlay.remove(); if (typeof onSaved === 'function') onSaved(inp.value.trim()); };
  return { close: () => overlay.remove() };
}

async function callOpenAI(systemPrompt, userPrompt) {
  // Prefer server-side proxy (reads OPENAI_API_KEY from .env)
  try {
    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const r = await fetch((BACKEND_URL || '') + '/api/gpt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, max_tokens: 400 }) });
    if (r.ok) {
      const j = await r.json();
      if (j && j.text) return j.text;
    }
  } catch (e) {
    console.warn('Proxy /api/gpt failed', e);
  }
  // Fallback: try direct call from client if API key present
  const key = getAIKey();
  if (!key) throw new Error('API key no configurada y proxy no disponible');
  const body = {
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 400,
    temperature: 0.7
  };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('OpenAI error: ' + res.status + ' ' + txt);
  }
  const j = await res.json();
  const content = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  return content || '';
}

function truncateWords(s, maxWords) {
  if (!s) return s;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return parts.join(' ');
  return parts.slice(0, maxWords).join(' ');
}

function generateTextFromAnswers(context, answers, meta) {
  let text = '';
  if (context === 'profile') {
    const [spec, years, skillsAns, objective, diff] = answers.map(a => a || '').slice(0,5);
    const parts = [];
    if (spec) parts.push(`${spec}`);
    if (years) parts.push(`${years} de experiencia`);
    if (skillsAns) parts.push(`Habilidades: ${skillsAns}`);
    if (objective) parts.push(`${objective}`);
    if (diff) parts.push(`Me destaco por ${diff}`);
    text = parts.join('. ') + '.';
  } else if (context === 'exp') {
    const [resp, ach, tools, impact, summary] = answers.map(a => a || '').slice(0,5);
    const head = meta && meta.role ? `${meta.role} en ${meta.company}` : '';
    const parts = [];
    if (head) parts.push(head);
    if (resp) parts.push(`Responsable de ${resp}`);
    if (ach) parts.push(`Logro: ${ach}`);
    if (tools) parts.push(`Herramientas: ${tools}`);
    if (impact) parts.push(`Impacto: ${impact}`);
    if (summary) parts.push(summary);
    text = parts.join('. ') + '.';
  }
  text = text.replace(/\s+\./g, '.').replace(/\.\.+/g, '.');
  return truncateWords(text, 150);
}

function clearFieldError(fieldId) {
  const errId = 'err-' + fieldId.replace(/^f-/, '');
  const errEl = document.getElementById(errId);
  const field = document.getElementById(fieldId);
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  if (field) field.classList.remove('input-error');
}

function validateEmail() {
  const el = document.getElementById('f-email');
  const err = document.getElementById('err-email');
  if (!el) return true;
  const v = el.value.trim();
  const ok = v !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (err) { err.style.display = ok ? 'none' : ''; err.textContent = ok ? '' : 'Email inválido o vacío'; }
  el.classList.toggle('input-error', !ok);
  return ok;
}

function validatePhone() {
  const el = document.getElementById('f-phone');
  if (!el) return true;
  const v = el.value.trim();
  const ok = v === '' || v.length >= 7;
  el.classList.toggle('input-error', !ok);
  return ok;
}

function sanitizeCedulaInput(el) {
  if (!el) return;
  const next = String(el.value || '').replace(/\D/g, '').slice(0, 10);
  if (next !== el.value) el.value = next;
}

function sanitizePhoneInput(el) {
  if (!el) return;
  const next = String(el.value || '').replace(/[^0-9+\s()-]/g, '');
  if (next !== el.value) el.value = next;
}

function formatDateIsoInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  if (digits.length <= 4) return year;
  if (digits.length <= 6) return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

function isIsoDate(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function syncDobPicker() {
  const textEl = document.getElementById('f-dob');
  const pickerEl = document.getElementById('f-dob-picker');
  if (!textEl || !pickerEl) return;
  pickerEl.value = isIsoDate(textEl.value.trim()) ? textEl.value.trim() : '';
}

function validateCedula() {
  const el = document.getElementById('f-cedula');
  const err = document.getElementById('err-cedula');
  if (!el) return true;
  const v = el.value.trim();
  const ok = v === '' || /^\d{10}$/.test(v);
  if (err) { err.style.display = ok ? 'none' : ''; err.textContent = ok ? '' : 'La cédula debe tener 10 dígitos numéricos.'; }
  el.classList.toggle('input-error', !ok);
  return ok;
}

function validateDob() {
  const el = document.getElementById('f-dob');
  const err = document.getElementById('err-dob');
  if (!el) return true;
  const v = el.value.trim();
  const ok = isIsoDate(v);
  if (err) { err.style.display = ok ? 'none' : ''; err.textContent = ok ? '' : 'Usa el formato AAAA-MM-DD.'; }
  el.classList.toggle('input-error', !ok);
  return ok;
}

function openDobPicker() {
  const pickerEl = document.getElementById('f-dob-picker');
  if (!pickerEl) return;
  if (typeof pickerEl.showPicker === 'function') {
    pickerEl.showPicker();
    return;
  }
  pickerEl.focus();
  pickerEl.click();
}

function showPage(n) {
  const p1 = document.getElementById('form-page-1'), p2 = document.getElementById('form-page-2');
  if (n === 2) {
    const nameVal = val('f-name'), titleVal = val('f-title');
    let firstMissing = null;
    if (!nameVal) { showFieldError('f-name', 'Completa tu nombre.'); firstMissing = firstMissing || 'f-name'; }
    if (!titleVal) { showFieldError('f-title', 'Completa tu título profesional.'); firstMissing = firstMissing || 'f-title'; }
    if (firstMissing) { const el = document.getElementById(firstMissing); if (el) el.focus(); return; }
    if (!validateEmail()) return;
    if (!validatePhone()) return;
    if (!validateCedula()) return;
    if (!validateDob()) return;
  }
  if (p1) p1.style.display = n === 1 ? '' : 'none';
  if (p2) p2.style.display = n === 2 ? '' : 'none';
  const panel = document.querySelector('.panel-form');
  if (panel) panel.scrollTop = 0;
}

function sync() {
  const name = val('f-name'), title = val('f-title'), bio = val('f-bio'), photo = val('f-photo');
  const metaParts = [];
  const fields = [
    {id:'f-cedula', icon:'ti-id-badge', label: 'C.I: '},
    {id:'f-dob', icon:'ti-calendar', label: ''},
    {id:'f-location', icon:'ti-map-pin', label: ''},
    {id:'f-phone', icon:'ti-phone', label: ''},
    {id:'f-email', icon:'ti-mail', label: ''}
  ];

  fields.forEach(f => {
    const v = val(f.id);
    if (v) metaParts.push(`<span><i class="ti ${f.icon}" style="font-size:11px"></i> ${f.label}${esc(v)}</span>`);
  });

  const initials = name.split(' ').map(x => x[0] || '').slice(0, 2).join('').toUpperCase() || '?';
  const avatarHTML = photo ? `<img src="${esc(photo)}">` : `<span>${initials}</span>`;

  const expHTML = entries.exp.length ? `<div class="cv-section"><div class="cv-section-title">Experiencia</div>${entries.exp.map(e => `
    <div class="cv-entry">
      <div class="cv-entry-title">${esc(e.role || 'Cargo')}</div>
      <div class="cv-entry-sub">${esc(e.company || 'Empresa')} ${e.dates ? '&middot; ' + esc(e.dates) : ''}</div>
      ${e.desc ? `<div class="cv-entry-desc">${esc(e.desc)}</div>` : ''}
    </div>`).join('')}</div>` : '';

  const eduHTML = entries.edu.length ? `<div class="cv-section"><div class="cv-section-title">Educación</div>${entries.edu.map(e => `
    <div class="cv-entry">
      <div class="cv-entry-title">${esc(e.role || 'Título')}</div>
      <div class="cv-entry-sub">${esc(e.company || 'Institución')} ${e.dates ? '&middot; ' + esc(e.dates) : ''}</div>
    </div>`).join('')}</div>` : '';

  const skillsHTML = skills.length ? `<div class="cv-section"><div class="cv-section-title">Habilidades</div><div class="cv-skills-list">${skills.map(s => `<span class="cv-skill-tag">${esc(s)}</span>`).join('')}</div></div>` : '';
  const languagesHTML = languages.length ? `<div class="cv-section"><div class="cv-section-title">Idiomas</div><div class="cv-skills-list">${languages.map(l => `<span class="cv-skill-tag">${esc(l)}</span>`).join('')}</div></div>` : '';
  const portfolioHTML = entries.portfolio.length ? `<div class="cv-section"><div class="cv-section-title">Adjuntos opcionales</div><div class="cv-portfolio-list">${entries.portfolio.map(item => {
    const safeTitle = esc(item.title || item.fileName || 'Adjunto');
    const typeLabel = esc(item.type || 'otro');
    const fileLabel = item.fileName ? `<div class="cv-portfolio-file">Archivo: ${esc(item.fileName)}</div>` : '';
    const linkLabel = item.link ? `<a class="cv-portfolio-link" href="${esc(safeHref(item.link))}" target="_blank" rel="noopener noreferrer">${safeTitle}</a>` : `<span class="cv-portfolio-text">${safeTitle}</span>`;
    return `<div class="cv-portfolio-item"><div class="cv-portfolio-type">${typeLabel}</div>${linkLabel}${fileLabel}</div>`;
  }).join('')}</div></div>` : '';

  const tpl = document.getElementById('template-select').value;
  const output = document.getElementById('cv-output');

  if (tpl === 'template-2') {
    output.innerHTML = `
      <div class="cv-template template-2">
        <div class="cv-side">
          <div class="cv-avatar">${avatarHTML}</div>
          <div class="cv-meta">${metaParts.join('')}</div>
          ${skillsHTML}
          ${languagesHTML}
        </div>
        <div class="cv-main">
          <div class="cv-name">${esc(name || 'Tu Nombre')}</div>
          <div class="cv-job-title">${esc(title || 'Tu Título')}</div>
          ${bio ? `<div class="cv-section"><div class="cv-section-title">Perfil</div><div class="cv-bio">${esc(bio)}</div></div>` : ''}
          ${expHTML}
          ${eduHTML}
          ${portfolioHTML}
        </div>
      </div>`;
  } else {
    output.innerHTML = `
      <div class="cv-template ${tpl}">
        <div class="cv-header">
          <div style="flex:1">
            <div class="cv-name">${esc(name || 'Tu Nombre')}</div>
            <div class="cv-job-title">${esc(title || 'Tu Título')}</div>
            <div class="cv-meta">${metaParts.join('')}</div>
          </div>
          <div class="cv-avatar">${avatarHTML}</div>
        </div>
        ${bio ? `<div class="cv-section"><div class="cv-section-title">Perfil</div><div class="cv-bio">${esc(bio)}</div></div>` : ''}
        ${expHTML}
        ${eduHTML}
        ${portfolioHTML}
        ${skillsHTML}
        ${languagesHTML}
      </div>`;
  }

  if (tutorialState && tutorialState.active && tutorialState.steps[tutorialState.step]?.selector === '.cv-name') {
    const previewName = output.querySelector('.cv-name');
    if (previewName) previewName.classList.add('tutorial-preview-focus');
  }
  // Debugging: log when sync runs and size of generated HTML
  try {
    console.log('sync() executed — preview length:', output ? (output.innerHTML || '').length : 0);
  } catch (e) { /* ignore */ }
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
      return;
    }
    if (Date.now() - start < 2000) setTimeout(tryShow, 50);
  };
  tryShow();
}

