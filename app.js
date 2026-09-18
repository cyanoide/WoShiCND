// ============================================================
// WOSHICND — logique de l'appli (vanilla JS, pas de build)
// ============================================================

const state = {
  theme: localStorage.getItem('woshicnd-theme') || 'light',
  category: 'fondations',
  openCards: new Set(),
  selectedRadical: null,
  flash: {
    scope: 'all',
    deck: [],
    index: 0,
    revealed: false,
  },
  write: {
    pool: [],
    index: 0,
  },
};

const PROGRESS_KEY = 'woshicnd-progress'; // { [id]: 'know' | 'retry' }

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress(p) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

// ---------------- THEME ----------------
function applyTheme() {
  const app = document.getElementById('app');
  app.classList.remove('light', 'dark');
  app.classList.add(state.theme);
  app.dataset.theme = state.theme;
  document.getElementById('themeThumb').textContent = state.theme === 'light' ? '☀' : '☾';
  document.getElementById('themeThumb').className = `theme-toggle-thumb ${state.theme}`;
  document.getElementById('themeLabel').textContent = state.theme === 'light' ? 'DAY' : 'NIGHT';
  localStorage.setItem('woshicnd-theme', state.theme);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
});

// ---------------- AUDIO (Web Speech API) ----------------
let zhVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  zhVoice = voices.find(v => v.lang === 'zh-CN') || voices.find(v => v.lang && v.lang.startsWith('zh')) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

function speak(hanzi) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(hanzi);
  utter.lang = 'zh-CN';
  if (zhVoice) utter.voice = zhVoice;
  utter.rate = 0.85;
  speechSynthesis.speak(utter);
}

// ---------------- MENU ----------------
function renderMenu() {
  const list = document.getElementById('menuList');
  list.innerHTML = CATEGORIES.map(c => `
    <li class="menu-item ${state.category === c.id ? 'selected' : ''}" data-cat="${c.id}">
      <span class="menu-item-indicator">${state.category === c.id ? '▸' : '·'}</span>
      <span class="menu-item-labels">
        <span>${c.label}</span>
        <span class="menu-item-sub">${c.sub}</span>
      </span>
      ${state.category === c.id ? '<span class="menu-item-arrow">→</span>' : ''}
    </li>
  `).join('');

  list.querySelectorAll('.menu-item').forEach(el => {
    el.addEventListener('click', () => {
      state.category = el.dataset.cat;
      state.openCards.clear();
      state.selectedRadical = null;
      renderMenu();
      renderContent();
    });
  });

  document.getElementById('wordCount').textContent = `${VOCAB.length} MOTS CHARGÉS`;
}

// ---------------- WORD CARD ----------------
function tagLabel(tag) { return TAG_LABEL[tag] || tag; }

function emojiFor(char) { return EMOJI[char] || ''; }

function renderBreakdown(entry) {
  const parts = entry.parts.map((p, i) => {
    const clickable = RADICALS[p.char] ? `data-radical="${p.char}"` : '';
    const em = emojiFor(p.char);
    return `
      <div class="breakdown-part ${clickable ? 'word-radical-chip' : ''}" ${clickable} style="cursor:${clickable ? 'pointer' : 'default'}">
        ${em ? `<span class="breakdown-part-emoji">${em}</span>` : ''}
        <span class="breakdown-part-char">${p.char}</span>
        <span class="breakdown-part-pinyin">${p.pinyin}</span>
        <span class="breakdown-part-tag ${p.tag}">${tagLabel(p.tag)}</span>
      </div>
      ${i < entry.parts.length - 1 ? '<span class="breakdown-plus">+</span>' : ''}
    `;
  }).join('');

  const meanings = entry.parts.map(p => `<b>${p.char}</b> ${p.meaning}`).join(' · ');
  const resultEmoji = emojiFor(entry.hanzi);
  const isSentence = entry.cat === 'phrases';

  return `
    <div class="word-breakdown">
      <div class="breakdown-parts">
        ${parts}
        ${isSentence ? '' : `
          <span class="breakdown-arrow">→</span>
          <div class="breakdown-part breakdown-result">
            ${resultEmoji ? `<span class="breakdown-part-emoji">${resultEmoji}</span>` : ''}
            <span class="breakdown-part-char" style="font-size:22px">${entry.hanzi}</span>
          </div>
        `}
      </div>
      <div class="breakdown-meaning">${meanings}</div>
      <div class="breakdown-logic">💡 ${entry.logic}</div>
      ${entry.note ? `<div class="breakdown-note">${entry.note}</div>` : ''}
    </div>
  `;
}

function renderWordCard(entry) {
  const open = state.openCards.has(entry.id);
  const em = emojiFor(entry.hanzi);
  const isSentence = entry.cat === 'phrases';
  return `
    <div class="word-card ${open ? 'open' : ''}" data-id="${entry.id}">
      <div class="word-card-top">
        <span class="word-hanzi ${isSentence ? 'word-hanzi-sentence' : ''}">${entry.hanzi}</span>
        ${isSentence ? '' : `<span class="word-pinyin">${entry.pinyin}</span>`}
      </div>
      ${isSentence ? `<div class="word-pinyin word-pinyin-sentence">${entry.pinyin}</div>` : ''}
      <div class="word-fr">${em ? `<span class="word-fr-emoji">${em}</span> ` : ''}${entry.fr}</div>
      <div class="word-card-actions">
        <button class="btn-audio" data-speak="${entry.hanzi}">🔊 écouter</button>
        ${entry.rad ? `<span class="word-radical-chip" data-radical="${entry.rad}">clé ${entry.rad}</span>` : ''}
      </div>
      ${open ? renderBreakdown(entry) : ''}
    </div>
  `;
}

function wireWordGrid(container) {
  container.querySelectorAll('.word-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-speak]') || e.target.closest('[data-radical]')) return;
      const id = card.dataset.id;
      if (state.openCards.has(id)) state.openCards.delete(id);
      else state.openCards.add(id);
      renderContent();
    });
  });
  container.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(btn.dataset.speak);
    });
  });
  container.querySelectorAll('[data-radical]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      state.category = 'radicaux';
      state.selectedRadical = chip.dataset.radical;
      state.openCards.clear();
      renderMenu();
      renderContent();
    });
  });
}

// ---------------- PAGES ----------------
function pageHeader(title, sub) {
  return `
    <div class="page-header">
      <h2 class="page-title">${title}</h2>
      <div class="page-sub">${sub}</div>
      <div class="page-rule"></div>
    </div>
  `;
}

function renderVocabPage(catId) {
  const cat = CATEGORIES.find(c => c.id === catId);
  const words = VOCAB.filter(v => v.cat === catId);
  const content = document.getElementById('content');

  if (catId === 'phrases') {
    const domains = [...new Set(words.map(w => w.domain))];
    content.innerHTML = `
      ${pageHeader(cat.label, cat.sub + ' · ' + words.length + ' PHRASES')}
      ${domains.map(d => `
        <div class="domain-block">
          <h3 class="domain-title">${d}</h3>
          <div class="word-grid">${words.filter(w => w.domain === d).map(renderWordCard).join('')}</div>
        </div>
      `).join('')}
    `;
  } else {
    content.innerHTML = `
      ${pageHeader(cat.label, cat.sub + ' · ' + words.length + ' MOTS')}
      <div class="word-grid">${words.map(renderWordCard).join('')}</div>
    `;
  }
  wireWordGrid(content);
}

function renderGrammarPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    ${pageHeader('Grammaire', 'PIÈGES ET RÈGLES QUI CHANGENT TOUT')}
    <div class="grammar-list">
      ${GRAMMAR.map(g => `
        <div class="grammar-card">
          <h3 class="grammar-title">${g.title}</h3>
          <p class="grammar-rule">${g.rule}</p>
          <div class="grammar-examples">
            ${g.examples.map(ex => `
              <div class="grammar-example ${ex.ok ? 'ok' : 'bad'}">
                <span class="grammar-example-mark">${ex.ok ? '✅' : '❌'}</span>
                <div class="grammar-example-body">
                  <div class="grammar-example-hanzi">
                    ${ex.hanzi}
                    ${ex.ok ? `<button class="btn-audio" data-speak="${ex.hanzi}">🔊</button>` : ''}
                  </div>
                  <div class="grammar-example-pinyin">${ex.pinyin}</div>
                  <div class="grammar-example-fr">${ex.fr}</div>
                  ${ex.note ? `<div class="grammar-example-note">${ex.note}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  content.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); speak(btn.dataset.speak); });
  });
}

function computeRadicalMatches(radChar) {
  return VOCAB.filter(v =>
    v.rad === radChar ||
    (v.parts && v.parts.some(p => p.char === radChar)) ||
    v.hanzi === radChar
  );
}

function renderRadicauxPage() {
  const content = document.getElementById('content');
  const radicalEntries = Object.entries(RADICALS);

  const grid = radicalEntries.map(([char, r]) => {
    const count = computeRadicalMatches(char).length;
    const active = state.selectedRadical === char;
    const em = emojiFor(char);
    return `
      <div class="radical-card ${active ? 'active' : ''}" data-radical="${char}">
        <div class="radical-card-char">${char}${em ? ` <span class="radical-card-emoji">${em}</span>` : ''}</div>
        <div class="radical-card-pinyin">${r.pinyin}</div>
        <div class="radical-card-meaning">${r.meaning}</div>
        <div class="radical-card-count">${count} MOT${count > 1 ? 'S' : ''} LIÉ${count > 1 ? 'S' : ''}</div>
      </div>
    `;
  }).join('');

  let resultsHtml = '';
  if (state.selectedRadical) {
    const matches = computeRadicalMatches(state.selectedRadical).filter(v => v.hanzi !== state.selectedRadical);
    const r = RADICALS[state.selectedRadical];
    resultsHtml = `
      <div class="radical-results">
        ${pageHeader(`${state.selectedRadical} · ${r.meaning}`, `TOUS LES MOTS AVEC CETTE CLÉ · ${matches.length}`)}
        <div class="word-grid">${matches.map(renderWordCard).join('') || '<div class="flash-empty">Aucun mot pour l\'instant.</div>'}</div>
      </div>
    `;
  }

  content.innerHTML = `
    ${pageHeader('Radicaux', 'CLIQUE UNE CLÉ POUR VOIR TOUS LES MOTS QUI LA PARTAGENT')}
    <div class="radical-grid">${grid}</div>
    ${resultsHtml}
  `;

  content.querySelectorAll('.radical-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedRadical = card.dataset.radical;
      state.openCards.clear();
      renderContent();
    });
  });
  wireWordGrid(content);
}

// ---------------- RÉVISION (flashcards) ----------------
function flashScopes() {
  return [{ id: 'all', label: 'Tout' }, ...CATEGORIES.filter(c => VOCAB.some(v => v.cat === c.id)).map(c => ({ id: c.id, label: c.label }))];
}

function buildDeck() {
  const progress = loadProgress();
  let pool = state.flash.scope === 'all' ? [...VOCAB] : VOCAB.filter(v => v.cat === state.flash.scope);
  // mélange
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // priorise les mots marqués "à revoir"
  pool.sort((a, b) => {
    const aRetry = progress[a.id] === 'retry' ? 0 : 1;
    const bRetry = progress[b.id] === 'retry' ? 0 : 1;
    return aRetry - bRetry;
  });
  state.flash.deck = pool;
  state.flash.index = 0;
  state.flash.revealed = false;
}

function renderRevisionPage() {
  const content = document.getElementById('content');
  if (state.flash.deck.length === 0) buildDeck();

  const scopes = flashScopes();
  const scopeHtml = scopes.map(s => `
    <button class="flash-scope-btn ${state.flash.scope === s.id ? 'active' : ''}" data-scope="${s.id}">${s.label}</button>
  `).join('');

  const deck = state.flash.deck;
  const entry = deck[state.flash.index];

  let cardHtml;
  if (!entry) {
    cardHtml = `<div class="flash-empty">Pas de mots dans cette catégorie pour l'instant.</div>`;
  } else if (!state.flash.revealed) {
    cardHtml = `
      <div class="flash-card" id="flashCard">
        <span class="flash-progress">${state.flash.index + 1} / ${deck.length}</span>
        <div class="flash-hanzi">${entry.hanzi}</div>
        <div class="flash-hint">TAPE POUR RÉVÉLER</div>
      </div>
    `;
  } else {
    const em = emojiFor(entry.hanzi);
    cardHtml = `
      <div class="flash-card" id="flashCard">
        <span class="flash-progress">${state.flash.index + 1} / ${deck.length}</span>
        <div class="flash-hanzi">${entry.hanzi}</div>
        <div class="flash-back">
          ${em ? `<div class="flash-emoji">${em}</div>` : ''}
          <div class="flash-pinyin">${entry.pinyin}</div>
          <div class="flash-fr">${entry.fr}</div>
          <div class="flash-logic">💡 ${entry.logic}</div>
        </div>
      </div>
      <div class="flash-controls">
        <button class="flash-btn retry" id="btnRetry">✗ à revoir</button>
        <button class="btn-audio" id="btnFlashAudio">🔊 écouter</button>
        <button class="flash-btn know" id="btnKnow">✓ je savais</button>
      </div>
    `;
  }

  content.innerHTML = `
    ${pageHeader('Révision', 'FLASHCARDS · LES MOTS "À REVOIR" REVIENNENT EN PRIORITÉ')}
    <div class="flash-wrap">
      <div class="flash-scope">${scopeHtml}</div>
      ${cardHtml}
    </div>
  `;

  content.querySelectorAll('.flash-scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.flash.scope = btn.dataset.scope;
      buildDeck();
      renderContent();
    });
  });

  const flashCard = document.getElementById('flashCard');
  if (flashCard && !state.flash.revealed) {
    flashCard.addEventListener('click', () => {
      state.flash.revealed = true;
      renderContent();
    });
  }

  function advance(result) {
    if (entry) {
      const progress = loadProgress();
      progress[entry.id] = result;
      saveProgress(progress);
    }
    state.flash.index++;
    state.flash.revealed = false;
    if (state.flash.index >= deck.length) buildDeck();
    renderContent();
  }

  const btnKnow = document.getElementById('btnKnow');
  const btnRetry = document.getElementById('btnRetry');
  const btnFlashAudio = document.getElementById('btnFlashAudio');
  if (btnKnow) btnKnow.addEventListener('click', () => advance('know'));
  if (btnRetry) btnRetry.addEventListener('click', () => advance('retry'));
  if (btnFlashAudio) btnFlashAudio.addEventListener('click', (e) => { e.stopPropagation(); speak(entry.hanzi); });
}

// ---------------- ÉCRITURE (tracé au doigt / à la souris) ----------------
function buildCharacterPool() {
  const map = new Map(); // char -> { pinyin, meaning }
  const isHanzi = (c) => /[一-鿿]/.test(c);

  Object.entries(RADICALS).forEach(([char, r]) => {
    if (isHanzi(char)) map.set(char, { pinyin: r.pinyin, meaning: r.meaning });
  });
  VOCAB.forEach(v => {
    if (v.hanzi.length === 1 && isHanzi(v.hanzi) && !map.has(v.hanzi)) {
      map.set(v.hanzi, { pinyin: v.pinyin, meaning: v.fr });
    }
  });
  VOCAB.forEach(v => {
    (v.parts || []).forEach(p => {
      if (p.char.length === 1 && isHanzi(p.char) && !map.has(p.char)) {
        map.set(p.char, { pinyin: p.pinyin, meaning: p.meaning });
      }
    });
  });

  return [...map.entries()]
    .map(([char, info]) => ({ char, ...info }))
    .sort((a, b) => a.char.localeCompare(b.char, 'zh'));
}

function renderEcriturePage() {
  if (state.write.pool.length === 0) state.write.pool = buildCharacterPool();
  const pool = state.write.pool;
  const item = pool[state.write.index];

  const content = document.getElementById('content');
  content.innerHTML = `
    ${pageHeader('Écriture', `TRACE LE CARACTÈRE PAR-DESSUS LE MODÈLE · ${pool.length} CARACTÈRES`)}
    <div class="write-wrap">
      <div class="write-info">
        <span class="write-progress">${state.write.index + 1} / ${pool.length}</span>
        <span class="write-pinyin">${item.pinyin}</span>
        <span class="write-meaning">${item.meaning}</span>
      </div>
      <div class="canvas-stack" id="canvasStack">
        <canvas id="bgCanvas"></canvas>
        <canvas id="fgCanvas"></canvas>
      </div>
      <div class="write-controls">
        <button class="flash-btn" id="btnPrev">← précédent</button>
        <button class="btn-audio" id="btnWriteAudio">🔊 écouter</button>
        <button class="flash-btn" id="btnClear">effacer</button>
        <button class="flash-btn" id="btnNext">suivant →</button>
      </div>
    </div>
  `;

  setupWriteCanvas(item.char);

  document.getElementById('btnPrev').addEventListener('click', () => {
    state.write.index = (state.write.index - 1 + pool.length) % pool.length;
    renderEcriturePage();
  });
  document.getElementById('btnNext').addEventListener('click', () => {
    state.write.index = (state.write.index + 1) % pool.length;
    renderEcriturePage();
  });
  document.getElementById('btnWriteAudio').addEventListener('click', () => speak(item.char));
  document.getElementById('btnClear').addEventListener('click', () => {
    const fg = document.getElementById('fgCanvas');
    const ctx = fg.getContext('2d');
    ctx.clearRect(0, 0, fg.width, fg.height);
  });
}

function setupWriteCanvas(char) {
  const stack = document.getElementById('canvasStack');
  const bg = document.getElementById('bgCanvas');
  const fg = document.getElementById('fgCanvas');
  const dpr = window.devicePixelRatio || 1;
  const size = stack.clientWidth;

  [bg, fg].forEach(c => {
    c.width = size * dpr;
    c.height = size * dpr;
    c.style.width = size + 'px';
    c.style.height = size + 'px';
  });

  // --- fond : grille 田字格 + caractère fantôme en transparence ---
  const bgCtx = bg.getContext('2d');
  bgCtx.scale(dpr, dpr);
  const styles = getComputedStyle(document.getElementById('app'));
  const border = styles.getPropertyValue('--border').trim();
  const text = styles.getPropertyValue('--text').trim();

  bgCtx.strokeStyle = border;
  bgCtx.lineWidth = 1;
  bgCtx.strokeRect(0.5, 0.5, size - 1, size - 1);
  bgCtx.setLineDash([6, 6]);
  bgCtx.beginPath();
  bgCtx.moveTo(size / 2, 0); bgCtx.lineTo(size / 2, size);
  bgCtx.moveTo(0, size / 2); bgCtx.lineTo(size, size / 2);
  bgCtx.stroke();
  bgCtx.setLineDash([]);

  bgCtx.globalAlpha = 0.16;
  bgCtx.fillStyle = text;
  bgCtx.font = `${size * 0.72}px "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif`;
  bgCtx.textAlign = 'center';
  bgCtx.textBaseline = 'middle';
  bgCtx.fillText(char, size / 2, size / 2 + size * 0.03);
  bgCtx.globalAlpha = 1;

  // --- premier plan : tracé de l'utilisateur ---
  const fgCtx = fg.getContext('2d');
  fgCtx.scale(dpr, dpr);
  const accent = styles.getPropertyValue('--accent').trim();
  fgCtx.strokeStyle = accent;
  fgCtx.lineWidth = 7;
  fgCtx.lineCap = 'round';
  fgCtx.lineJoin = 'round';

  let drawing = false;
  let last = null;

  function pos(e) {
    const rect = fg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e) {
    drawing = true;
    last = pos(e);
    fg.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!drawing) return;
    const p = pos(e);
    fgCtx.beginPath();
    fgCtx.moveTo(last.x, last.y);
    fgCtx.lineTo(p.x, p.y);
    fgCtx.stroke();
    last = p;
  }
  function end() { drawing = false; last = null; }

  fg.addEventListener('pointerdown', start);
  fg.addEventListener('pointermove', move);
  fg.addEventListener('pointerup', end);
  fg.addEventListener('pointerleave', end);
  fg.addEventListener('pointercancel', end);
}

// ---------------- ROUTER ----------------
function renderContent() {
  if (state.category === 'radicaux') return renderRadicauxPage();
  if (state.category === 'revision') return renderRevisionPage();
  if (state.category === 'grammaire') return renderGrammarPage();
  if (state.category === 'ecriture') return renderEcriturePage();
  return renderVocabPage(state.category);
}

// ---------------- NOISE OVERLAY ----------------
function startNoise() {
  const canvas = document.getElementById('noiseCanvas');
  const ctx = canvas.getContext('2d');
  const w = 256, h = 256;
  canvas.width = w; canvas.height = h;
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  function paint(alpha) {
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = alpha;
    }
    ctx.putImageData(imageData, 0, 0);
  }
  paint(15);
  setInterval(() => paint(12), 100);
}

// ---------------- INIT ----------------
applyTheme();
renderMenu();
renderContent();
startNoise();

// Enregistrement du service worker (mode hors-ligne)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
