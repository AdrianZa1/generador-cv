// ===================== ESTADO Y CONFIGURACIÓN =====================
let entries = { exp: [], edu: [], portfolio: [] };
let skills = [];
let languages = [];
let references = [];
let counters = { exp: 0, edu: 0, portfolio: 0, ref: 0 };
let autocorrectEnabled = true;

const autocorrectDictionary = {
  'desarrolador': 'desarrollador',
  'desarrolladorr': 'desarrollador',
  'ingienero': 'ingeniero',
  'ingenero': 'ingeniero',
  'experienciaa': 'experiencia',
  'descripsion': 'descripción',
  'direccion': 'dirección'
};

const autocorrectVocabulary = [
  'desarrollador','desarrolladora','ingeniero','ingeniera','ingeniería','experiencia','descripción','direccion','dirección',
  'arquitecto','arquitectura','fullstack','frontend','backend','devops','qa','tester','analista','python','javascript',
  'java','react','vue','angular','node.js','sql','postgresql','mysql','mongodb','git','github','aws','azure','cloud','ti'
];

// ===================== UTILIDADES DE TEXTO =====================
function levenshtein(a, b) {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const v0 = new Array(lb + 1).fill(0).map((_, i) => i);
  let v1 = new Array(lb + 1).fill(0);
  for (let i = 0; i < la; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < lb; j++) {
      const cost = a[i].toLowerCase() === b[j].toLowerCase() ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let k = 0; k <= lb; k++) v0[k] = v1[k];
  }
  return v1[lb];
}

function findClosestWord(word) {
  if (!word || word.length < 3) return null;
  let best = null, bestDist = Infinity;
  for (const cand of autocorrectVocabulary) {
    const dist = levenshtein(word.toLowerCase(), cand.toLowerCase());
    if (dist < bestDist) { bestDist = dist; best = cand; }
  }
  const threshold = word.length <= 4 ? 1 : 2;
  return bestDist <= threshold ? best : null;
}

function autocorrectText(text, fieldId) {
  if (!text) return text;
  const leading = (text.match(/^\s*/) || [''])[0];
  const trailing = (text.match(/\s*$/) || [''])[0];
  let core = text.slice(leading.length, text.length - trailing.length);

  Object.keys(autocorrectDictionary).forEach(k => {
    const re = new RegExp('\\b' + k + '\\b', 'ig');
    core = core.replace(re, autocorrectDictionary[k]);
  });

  if (fieldId === 'f-location' || fieldId === 'f-title' || fieldId === 'role' || fieldId === 'company') {
    core = titleCaseSpanish(core);
  } else if (fieldId === 'f-name') {
    core = core.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
  } else if (['f-bio', 'desc'].includes(fieldId)) {
    if (core.length > 0) core = core.charAt(0).toUpperCase() + core.slice(1);
  }

  if (!['f-location', 'f-name'].includes(fieldId)) {
    core = core.replace(/[A-Za-zÀ-ÖØ-öø-ÿñÑáéíóúÁÉÍÓÚüÜ]+/g, tok => {
      if (/\d/.test(tok)) return tok;
      const lower = tok.toLowerCase();
      if (lower === 'ti') return 'TI';
      const suggestion = findClosestWord(tok);
      if (suggestion) {
        if (tok === tok.toUpperCase()) return suggestion.toUpperCase();
        if (tok[0] === tok[0].toUpperCase()) return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
        return suggestion.toLowerCase();
      }
      return tok;
    });
  }
  return leading + core + trailing;
}

function titleCaseSpanish(s) {
  if (!s) return s;
  const small = new Set(['y','e','de','del','la','el','los','las','en','a','al','por','para','con','sin','sobre','una','un','unos','unas']);
  return s.split(/(\s+)/).map((token, idx) => {
    if (/^\s+$/.test(token)) return token;
    const lw = token.toLowerCase();
    if (lw === 'ti') return 'TI';
    if (idx === 0 || !small.has(lw)) return lw.charAt(0).toUpperCase() + lw.slice(1);
    return lw;
  }).join('');
}

// ===================== HELPERS DOM =====================
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(s) { return esc(s); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function animateTextareaTyping(textarea, newText, onProgress) {
  const prevReadOnly = textarea.readOnly;
  textarea.readOnly = true;
  textarea.value = '';
  for (let i = 0; i < newText.length; i++) {
    textarea.value += newText[i];
    if (i % 4 === 0 && onProgress) onProgress(textarea.value);
    await sleep(18);
  }
  if (onProgress) onProgress(textarea.value);
  textarea.readOnly = prevReadOnly;
}