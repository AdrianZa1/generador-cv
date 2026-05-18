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

function isMobileTourMode() {
  return window.innerWidth <= 768 || (navigator && navigator.maxTouchPoints > 0);
}

function startIntroTour() {
  const mobileMode = isMobileTourMode();
  tutorialState = {
    active: true,
    step: 0,
    steps: [
      { selector: '#f-name', hint: mobileMode ? '<strong>Paso 1.</strong> Escribe aquí tu nombre y presiona Siguiente.' : '<strong>Paso 1.</strong> Escribe aquí tu nombre y presiona Enter.', focusPage: 1, placement: 'bottom', showNextButton: mobileMode, nextLabel: 'Siguiente' },
      { selector: '.cv-name', hint: '<strong>Paso 2.</strong> Aquí se muestra automáticamente tu nombre en la plantilla.', placement: 'right', showNextButton: true, nextLabel: 'Siguiente', autoAdvanceAfter: 123000 },
      { selector: '#download-pdf', hint: '<strong>Último paso.</strong> Una vez completada tu plantilla, puedes descargarla en el botón Descargar PDF.', placement: 'bottom', focusPage: 1 }
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
    el.setAttribute('placeholder', step.showNextButton ? 'Escribe tu nombre aquí y presiona Siguiente' : 'Escribe tu nombre aquí y presiona Enter');
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
  entries[type] = entries[type] || [];
  if (typeof counters[type] === 'undefined') counters[type] = 0;
  const id = ++counters[type];
  const empty = { id, company: '', role: '', dates: '', desc: '' };
  entries[type].push(empty);
  renderEntries(type);
  sync();
  requestAnimationFrame(() => {
    const list = document.getElementById(type === 'exp' ? 'exp-list' : 'edu-list');
    if (!list) return;
    const inputs = list.querySelectorAll('input[data-entry-id]');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

function removeEntry(type, id) {
  entries[type] = (entries[type] || []).filter(e => e.id !== id);
  renderEntries(type);
  sync();
}

function renderEntries(type) {
  const container = document.getElementById(type === 'exp' ? 'exp-list' : 'edu-list');
  if (!container) return;
  container.innerHTML = '';
  (entries[type] || []).forEach(e => {
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `
      <button class="entry-remove" type="button" onclick="removeEntry('${type}', ${e.id})"><i class="ti ti-x"></i></button>
      <div class="field-row">
        <div>
          <label>${type === 'exp' ? 'Empresa' : 'Institución'}</label>
          <input data-entry-id="${e.id}" type="text" value="${esc(e.company || '')}" oninput="updateEntryText('${type}', ${e.id}, 'company', this)">
        </div>
        <div>
          <label>${type === 'exp' ? 'Cargo' : 'Título'}</label>
          <input type="text" value="${esc(e.role || '')}" oninput="updateEntryText('${type}', ${e.id}, 'role', this)">
        </div>
      </div>
      <div class="field-row full" style="margin-top:8px">
        <label>Período</label>
        <input type="text" placeholder="2024-2025 ene-dic" value="${esc(e.dates || '')}" onblur="autoFormatPeriod(this)" oninput="updateEntryText('${type}', ${e.id}, 'dates', this)">
      </div>
      ${type === 'exp' ? `
      <div class="field-row full" style="margin-top:8px">
        <label>Descripción</label>
        <div style="display:flex; gap:8px; align-items:flex-start; width:100%">
          <textarea placeholder="Una breve descripción" oninput="updateEntryText('${type}', ${e.id}, 'desc', this)">${esc(e.desc || '')}</textarea>
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

async function improveEntryDesc(id) {
  const entry = entries.exp.find(x => x.id === id);
  if (!entry) return showMessageModal('Entrada no encontrada', { title: 'Error' });

  const current = String(entry.desc || '').trim();
  if (!current) {
    showMessageModal('Primero escribe una descripción para poder mejorarla.', { title: 'Aviso' });
    return;
  }

  const applyImprovement = (text) => {
    const improved = String(text || '').trim();
    if (!improved) return;
    entry.desc = improved;
    renderEntries('exp');
    sync();
    showMessageModal('Descripción mejorada y aplicada', { title: 'Hecho' });
  };

  const localImprovement = () => {
    const improved = (typeof localImproveEntryDesc === 'function') ? localImproveEntryDesc(current) : localImproveBio(current);
    applyImprovement(improved);
  };

  if (typeof getAIKey === 'function' && getAIKey()) {
    const wait = showWaitingModal('Mejorando con IA...');
    try {
      const system = 'Eres un asistente que mejora descripciones profesionales para CV en español. Conserva el significado, usa tono formal y máximo 150 palabras.';
      const userPrompt = `Mejora este texto de experiencia laboral sin hacer preguntas y sin cambiar los datos importantes. Texto: "${current}"`;
      let out = await callOpenAI(system, userPrompt);
      out = truncateWords(out, 150);
      applyImprovement(out || ((typeof localImproveEntryDesc === 'function') ? localImproveEntryDesc(current) : localImproveBio(current)));
    } catch (err) {
      console.error(err);
      localImprovement();
    } finally {
      try { wait.close(); } catch (e) {}
    }
    return;
  }

  localImprovement();
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
  // Mejora inmediata y silenciosa del texto del resumen profesional.
  const bioEl = document.getElementById('f-bio');
  if (!bioEl) return;
  const current = bioEl.value || '';
  if (!current.trim()) { showMessageModal('El resumen está vacío. Escribe algo y vuelve a intentar.', { title: 'Aviso' }); return; }

  const tryLocal = (replacement) => {
    const improved = replacement || localImproveBio(current);
    // Animar escritura y actualizar
    animateTextareaTyping(bioEl, improved, () => {} ).then(() => { sync(); showMessageModal('Resumen mejorado', { title: 'Listo' }); });
  };

  // Si hay clave de IA, usarla automáticamente; si no, usar mejora local.
  if (typeof getAIKey === 'function' && getAIKey()) {
    const wait = showWaitingModal('Mejorando con IA...');
    (async () => {
      try {
        const system = 'Eres un asistente que mejora y formaliza resúmenes profesionales en español. Mantén máximo 150 palabras y lenguaje formal.';
        const userPrompt = `Mejora este resumen profesional, mantén el sentido pero hazlo más formal y profesional. Texto: "${current}"`;
        let out = await callOpenAI(system, userPrompt);
        out = (typeof truncateWords === 'function') ? truncateWords(out, 150) : out;
        if (!out || !out.trim()) throw new Error('IA no devolvió texto');
        tryLocal(out.trim());
      } catch (err) {
        console.error('IA mejora fallida:', err);
        tryLocal();
      } finally { try { wait.close(); } catch(e){} }
    })();
  } else {
    tryLocal();
  }
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
  skills.push('');
  renderSkillCards();
  sync();
  requestAnimationFrame(() => {
    const list = document.getElementById('skill-list');
    const inputs = list ? list.querySelectorAll('input[data-skill-index]') : [];
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

function renderSkillCards() {
  const c = document.getElementById('skill-list');
  if (!c) return;
  c.innerHTML = '';
  skills.forEach((skill, idx) => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <button class="entry-remove" type="button" onclick="removeSkill(${idx})"><i class="ti ti-x"></i></button>
      <div class="field-row full" style="margin-bottom:0">
        <div>
          <label>Habilidad</label>
          <input type="text" value="${esc(skill)}" placeholder="Ej: Comunicación, liderazgo, ventas" data-skill-index="${idx}" oninput="updateSkillText(${idx}, this)">
        </div>
      </div>
    `;
    c.appendChild(card);
  });
}

function updateSkillText(idx, el) {
  let v = el.value;
  if (autocorrectEnabled) v = autocorrectText(v, 'f-title');
  skills[idx] = v;
  if (v !== el.value) el.value = v;
  sync();
}

function removeSkill(idx) {
  skills.splice(idx, 1);
  renderSkillCards();
  sync();
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
    const name = typeof l === 'string' ? l : (l.name || '');
    const pct = typeof l === 'object' && typeof l.percent !== 'undefined' ? ` (${Number(l.percent) || 0}%)` : '';
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.innerHTML = `<span onclick="editLanguage(${idx})" style="cursor:pointer">${esc(name)}${esc(pct)}</span><button onclick="removeLanguage(${idx})">×</button>`;
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
  const title = titleEl ? titleEl.value.trim() : '';
  const link = linkEl ? linkEl.value.trim() : '';
  if (!title && !link) return;
  if (!link) {
    showMessageModal('Para portafolio web, agrega el enlace.', { title: 'Falta el enlace' });
    return;
  }
  const addItem = () => {
    entries.portfolio.push({ id: ++counters.portfolio, type: 'portafolio web', title, link, fileData: '', fileName: '', fileType: '' });
    if (titleEl) titleEl.value = '';
    if (linkEl) linkEl.value = '';
    renderPortfolioItems();
    sync();
  };
  if (titleEl) titleEl.value = '';
  if (linkEl) linkEl.value = '';
  addItem();
}

function renderLanguageCards() {
  const container = document.getElementById('language-list');
  if (!container) return;
  container.innerHTML = '';
  languages.forEach((l, idx) => {
    const name = typeof l === 'string' ? l : (l.name || '');
    const pct = typeof l === 'object' && typeof l.percent !== 'undefined' ? (Number(l.percent) || 0) : 0;
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <button class="entry-remove" type="button" onclick="removeLanguageEntry(${idx})"><i class="ti ti-x"></i></button>
      <div class="field-row">
        <div style="flex:1">
          <label>Idioma</label>
          <input type="text" value="${esc(name)}" placeholder="Ej: Español, Inglés" oninput="updateLanguageName(${idx}, this)">
        </div>
        <div style="width:120px">
          <label>Nivel (%)</label>
          <input type="number" min="0" max="100" value="${esc(pct)}" oninput="updateLanguagePercent(${idx}, this)">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function addLanguageEntry() {
  languages.push({ name: '', percent: 0 });
  renderLanguageCards();
  sync();
  requestAnimationFrame(() => {
    const list = document.getElementById('language-list');
    const inputs = list ? list.querySelectorAll('input') : [];
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

function updateLanguageName(idx, el) {
  if (!languages[idx]) languages[idx] = { name: '', percent: 0 };
  let v = el.value;
  if (typeof autocorrectEnabled !== 'undefined' && autocorrectEnabled) v = autocorrectText(v, 'f-title');
  if (v !== el.value) el.value = v;
  languages[idx].name = v;
  sync();
}

function updateLanguagePercent(idx, el) {
  if (!languages[idx]) languages[idx] = { name: '', percent: 0 };
  let v = parseInt(el.value, 10);
  if (isNaN(v)) v = 0;
  if (v < 0) v = 0; if (v > 100) v = 100;
  languages[idx].percent = v;
  el.value = v;
  sync();
}

function removeLanguageEntry(idx) { languages.splice(idx, 1); renderLanguageCards(); sync(); }

function removePortfolio(id) {
  entries.portfolio = entries.portfolio.filter(item => item.id !== id);
  renderPortfolioItems();
  sync();
}

function addReferenceEntry() {
  const input = document.getElementById('f-reference');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  references.push(value);
  input.value = '';
  renderReferenceCards();
  sync();
}

function renderReferenceCards() {
  const container = document.getElementById('references-list');
  if (!container) return;
  container.innerHTML = '';
  references.forEach((ref, idx) => {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.innerHTML = `
      <button class="entry-remove" type="button" onclick="removeReferenceEntry(${idx})"><i class="ti ti-x"></i></button>
      <div class="field-row full" style="margin-bottom:0">
        <div>
          <label>Referencia</label>
          <input type="text" value="${esc(ref)}" placeholder="Nombre - Contacto" oninput="updateReferenceText(${idx}, this)">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateReferenceText(idx, el) {
  let v = el.value;
  if (autocorrectEnabled) v = autocorrectText(v, 'f-title');
  references[idx] = v;
  if (v !== el.value) el.value = v;
  sync();
}

function removeReferenceEntry(idx) {
  references.splice(idx, 1);
  renderReferenceCards();
  sync();
}

function getPortfolioDisplayTitle(item) {
  const rawTitle = String(item?.title || '').trim();
  if (!rawTitle) return '';
  if (rawTitle.toLowerCase() === 'portafolio web') return '';
  return rawTitle;
}

function renderPortfolioItems() {
  const container = document.getElementById('portfolio-list');
  if (!container) return;
  container.innerHTML = '';

  entries.portfolio.forEach(item => {
    const displayTitle = getPortfolioDisplayTitle(item);
    const div = document.createElement('div');
    div.className = 'entry-card';
    div.innerHTML = `
      <button class="entry-remove" onclick="removePortfolio(${item.id})"><i class="ti ti-x"></i></button>
      <div class="field-row">
        <div>
          <label>Portafolio</label>
          <input type="text" value="${esc(displayTitle)}" placeholder="Ej: Portafolio personal, Behance, GitHub" oninput="updatePortfolioText(${item.id}, 'title', this)">
        </div>
        <div>
          <label>Enlace del portafolio web</label>
          <input type="text" value="${esc(item.link)}" placeholder="https://..." oninput="updatePortfolioText(${item.id}, 'link', this)">
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderReferenceList() {
  const refs = references || [];
  if (!refs.length) return '';
  const items = refs.map(ref => `<div class="cv-reference-item">${esc(ref)}</div>`).join('');
  return `<div class="cv-section"><div class="cv-section-title">Referencias</div><div class="cv-references-list">${items}</div></div>`;
}

function updatePortfolioFormVisibility() {
  const addBtn = document.getElementById('btn-add-portfolio');
  if (addBtn) addBtn.disabled = false;
}

function updatePortfolioText(id, field, el) {
  const item = entries.portfolio.find(x => x.id === id);
  if (!item) return;
  let v = el.value;
  if (autocorrectEnabled && field === 'title') v = autocorrectText(v, 'f-title');
  item[field] = v;
  if (v !== el.value) el.value = v;
  sync();
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

function showPage(n) {
  const p1 = document.getElementById('form-page-1'), p2 = document.getElementById('form-page-2');
  if (n === 2) {
    const nameVal = val('f-name'), titleVal = val('f-title');
    let firstMissing = null;
    if (!nameVal) { showFieldError('f-name', 'Completa tu nombre.'); firstMissing = firstMissing || 'f-name'; }
    if (!titleVal) { showFieldError('f-title', 'Completa tu título profesional.'); firstMissing = firstMissing || 'f-title'; }
    if (firstMissing) { const el = document.getElementById(firstMissing); if (el) el.focus(); return; }
    if (!validateEmail()) return;
  }
  p1.style.display = n === 1 ? '' : 'none';
  p2.style.display = n === 2 ? '' : 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  let languagesHTML = '';
  if (languages && languages.length) {
    const items = languages.map(l => {
      const name = typeof l === 'string' ? l : (l.name || '');
      const pct = typeof l === 'object' && typeof l.percent !== 'undefined' ? Number(l.percent) : null;
      return `<span class="cv-skill-tag">${esc(name)}${pct !== null ? ' (' + esc(String(pct)) + '%)' : ''}</span>`;
    }).join('');
    languagesHTML = `<div class="cv-section"><div class="cv-section-title">Idiomas</div><div class="cv-skills-list">${items}</div></div>`;
  }
  const referencesHTML = references.length ? `<div class="cv-section"><div class="cv-section-title">Referencias</div><div class="cv-references-list">${references.map(ref => `<div class="cv-reference-item">${esc(ref)}</div>`).join('')}</div></div>` : '';
  const portfolioHTML = entries.portfolio.length ? `<div class="cv-section"><div class="cv-section-title">Adjuntos opcionales</div><div class="cv-portfolio-list">${entries.portfolio.map(item => {
    const rawTitle = String(item.title || '').trim();
    const safeTitle = rawTitle.toLowerCase() === 'portafolio web' ? '' : rawTitle;
    const displayTitle = safeTitle || 'Portafolio';
    const linkLabel = item.link ? `<a class="cv-portfolio-link" href="${esc(safeHref(item.link))}" target="_blank" rel="noopener noreferrer">${esc(displayTitle)}</a>` : `<span class="cv-portfolio-text">${esc(displayTitle)}</span>`;
    return `<div class="cv-portfolio-item">${linkLabel}</div>`;
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
          ${referencesHTML}
          ${portfolioHTML}
        </div>
        <div class="cv-main">
          <div class="cv-name">${esc(name || 'Tu Nombre')}</div>
          <div class="cv-job-title">${esc(title || 'Tu Título')}</div>
          ${bio ? `<div class="cv-section"><div class="cv-section-title">Perfil</div><div class="cv-bio">${esc(bio)}</div></div>` : ''}
          ${expHTML}
          ${eduHTML}
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
}

function boot() {
  initInputListeners();
  renderSkillCards();
  renderLanguageCards();
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

window.addEntry = addEntry;
window.showPage = showPage;
window.addSkill = addSkill;
window.renderSkillCards = renderSkillCards;
window.addLanguage = addLanguage;
window.renderLanguageChips = renderLanguageChips;
window.renderLanguageCards = renderLanguageCards;
window.addLanguageEntry = addLanguageEntry;
window.updateLanguageName = updateLanguageName;
window.updateLanguagePercent = updateLanguagePercent;
window.removeLanguageEntry = removeLanguageEntry;
window.addPortfolio = addPortfolio;
window.renderPortfolioItems = renderPortfolioItems;
window.updatePortfolioFormVisibility = updatePortfolioFormVisibility;
window.updateReferencesVisibility = updateReferencesVisibility;
window.renderPaletteSelector = renderPaletteSelector;
window.updatePaletteVisibility = updatePaletteVisibility;
window.sync = sync;
window.showConfirmModal = showConfirmModal;
window.showQuestionModal = showQuestionModal;
window.showWaitingModal = showWaitingModal;
window.showMessageModal = showMessageModal;
window.promptForApiKey = promptForApiKey;
window.createBioInteractive = createBioInteractive;
window.improveBioInteractive = improveBioInteractive;
window.startIntroTour = startIntroTour;
window.setTutorialHint = setTutorialHint;
window.clearTutorialHighlights = clearTutorialHighlights;

