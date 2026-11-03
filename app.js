// ============================================================
// WOSHICND — logique de l'appli (vanilla JS, pas de build)
// ============================================================

const state = {
  theme: localStorage.getItem('woshicnd-theme') || 'light',
  lang: localStorage.getItem('woshicnd-lang') || 'fr',
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
    scope: 'all',
    shuffled: false,
    blind: false,
    pool: [],
    index: 0,
  },
  explorer: {
    current: '火鸡', // point de départ par défaut : bien connecté (composants + usages)
    history: [],
  },
};

// Traduit un champ bilingue { fr, en } selon la langue courante.
function t(obj) { return obj ? obj[state.lang] : obj; }

// Chaînes d'interface (hors contenu pédagogique, qui vit dans data.js)
const UI = {
  wordsLoaded: { fr: 'MOTS CHARGÉS', en: 'WORDS LOADED' },
  listen: { fr: '🔊 ECOUTER', en: '🔊 LISTEN' },
  key: { fr: 'clé', en: 'key' },
  words: { fr: 'MOTS', en: 'WORDS' },
  phrasesCount: { fr: 'PHRASES', en: 'PHRASES' },
  radicauxTitle: { fr: 'Radicaux', en: 'Radicals' },
  radicauxSub: { fr: 'CLIQUE UNE CLÉ POUR VOIR TOUS LES MOTS QUI LA PARTAGENT', en: 'CLICK A KEY TO SEE EVERY WORD THAT SHARES IT' },
  radicalResultsSub: { fr: 'TOUS LES MOTS AVEC CETTE CLÉ', en: 'ALL WORDS WITH THIS KEY' },
  wordLinked: { fr: 'MOT LIÉ', en: 'WORD LINKED' },
  wordsLinked: { fr: 'MOTS LIÉS', en: 'WORDS LINKED' },
  noWordsYet: { fr: 'Aucun mot pour l\'instant.', en: 'No words yet.' },
  revisionTitle: { fr: 'Révision', en: 'Review' },
  revisionSub: { fr: 'FLASHCARDS · LES MOTS "À REVOIR" REVIENNENT EN PRIORITÉ', en: 'FLASHCARDS · WORDS MARKED "REVIEW" COME BACK FIRST' },
  scopeAll: { fr: 'Tout', en: 'All' },
  tapToReveal: { fr: 'TAPE POUR RÉVÉLER', en: 'TAP TO REVEAL' },
  retry: { fr: '✗ à revoir', en: '✗ review again' },
  know: { fr: '✓ je savais', en: '✓ I knew it' },
  noWordsCategory: { fr: 'Pas de mots dans cette catégorie pour l\'instant.', en: 'No words in this category yet.' },
  grammarTitle: { fr: 'Grammaire', en: 'Grammar' },
  grammarSub: { fr: 'PIÈGES ET RÈGLES QUI CHANGENT TOUT', en: 'TRAPS AND RULES THAT CHANGE EVERYTHING' },
  ecritureTitle: { fr: 'Écriture', en: 'Writing' },
  ecritureSub: { fr: 'TRACE LE CARACTÈRE PAR-DESSUS LE MODÈLE', en: 'TRACE THE CHARACTER OVER THE TEMPLATE' },
  characters: { fr: 'CARACTÈRES', en: 'CHARACTERS' },
  prev: { fr: '← précédent', en: '← previous' },
  next: { fr: 'suivant →', en: 'next →' },
  prevLabel: { fr: 'précédent', en: 'previous' },
  nextLabel: { fr: 'suivant', en: 'next' },
  listenLabel: { fr: 'ECOUTER', en: 'LISTEN' },
  clear: { fr: 'effacer', en: 'clear' },
  shuffleOn: { fr: '🔀 aléatoire', en: '🔀 random' },
  shuffleOff: { fr: '↧ alphabétique', en: '↧ alphabetical' },
  blindOn: { fr: '🙈 mode aveugle', en: '🙈 blind mode' },
  blindOff: { fr: '👁 avec modèle', en: '👁 with template' },
  traceToCheck: { fr: 'TRACE POUR VÉRIFIER', en: 'TRACE TO CHECK' },
  wellWritten: { fr: 'BIEN ÉCRIT', en: 'WELL WRITTEN' },
  needsWork: { fr: 'À RETRAVAILLER', en: 'NEEDS WORK' },
  explorerTitle: { fr: 'Explorer', en: 'Explore' },
  explorerSub: { fr: 'TAPE UN MOT AUTOUR POUR LE RECENTRER', en: 'TAP A WORD AROUND IT TO RECENTER' },
  explorerBack: { fr: '← retour', en: '← back' },
  explorerDeadEnd: { fr: 'pas de fiche pour ce composant', en: 'no entry for this component' },
  explore: { fr: 'explorer', en: 'explore' },
  explorerSearch: { fr: '汉字 · pinyin · français · English', en: '汉字 · pinyin · English' },
  dictLoading: { fr: 'chargement du dictionnaire…', en: 'loading dictionary…' },
  dictError: { fr: 'dictionnaire indisponible (connexion ?)', en: 'dictionary unavailable (offline?)' },
  noResults: { fr: 'aucun résultat', en: 'no results' },
  secDefinition: { fr: 'DÉFINITION', en: 'DEFINITION' },
  secComposition: { fr: 'COMPOSITION', en: 'COMPOSITION' },
  secRadical: { fr: 'RADICAL', en: 'RADICAL' },
  secFamily: { fr: 'FAMILLE DU RADICAL', en: 'RADICAL FAMILY' },
  secWordsWith: { fr: 'MOTS AVEC', en: 'WORDS WITH' },
  etymPhonetic: { fr: 'phono-sémantique', en: 'phonetic compound' },
  etymIdeographic: { fr: 'idéogramme composé', en: 'ideographic compound' },
  etymPictographic: { fr: 'pictogramme', en: 'pictograph' },
  etymSense: { fr: 'sens', en: 'meaning' },
  etymSound: { fr: 'son', en: 'sound' },
  legendSense: { fr: 'sens', en: 'meaning' },
  legendSound: { fr: 'son', en: 'sound' },
  legendRadical: { fr: 'radical', en: 'radical' },
  legendWord: { fr: 'mot', en: 'word' },
  dictSources: { fr: 'Dictionnaire : CC-CEDICT (CC BY-SA 4.0) · Décomposition : Make Me a Hanzi (LGPL 3.0)', en: 'Dictionary: CC-CEDICT (CC BY-SA 4.0) · Decomposition: Make Me a Hanzi (LGPL 3.0)' },
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
  document.getElementById('themeThumb').className = `theme-toggle-thumb ${state.theme}`;
  document.getElementById('themeLabel').textContent = state.theme === 'light' ? 'DAY' : 'NIGHT';
  localStorage.setItem('woshicnd-theme', state.theme);

  // En PWA installée sur iOS, toute zone que #app ne couvre pas exactement
  // (arrondi, barre du home indicator) laisse voir le fond par défaut du
  // WebView — blanc. On force html/body à suivre la même couleur de fond.
  const bg = getComputedStyle(app).getPropertyValue('--bg').trim();
  document.documentElement.style.background = bg;
  document.body.style.background = bg;
  // Safari semble ne lire la balise theme-color qu'au chargement initial pour
  // certaines zones système, sans réagir à une mise à jour JS ultérieure —
  // on la met à jour quand même (utile dans d'autres contextes/versions),
  // mais les deux balises statiques media=prefers-color-scheme restent le
  // filet de sécurité principal pour ce cas précis.
  document.getElementById('themeColorMeta').setAttribute('content', bg);
  document.getElementById('themeColorMetaDark').setAttribute('content', bg);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  // le fantôme du mode écriture dépend des couleurs du thème : on attend que
  // la classe .light/.dark soit peinte avant de relire les variables CSS,
  // sinon le canvas capture encore les anciennes couleurs.
  if (state.category === 'ecriture') requestAnimationFrame(() => requestAnimationFrame(renderContent));
});

// ---------------- LANGUE ----------------
function applyLang() {
  document.getElementById('langLabel').textContent = state.lang.toUpperCase();
  document.getElementById('langThumb').className = `theme-toggle-thumb ${state.lang === 'fr' ? 'light' : 'dark'}`;
  document.documentElement.lang = state.lang;
  localStorage.setItem('woshicnd-lang', state.lang);
}

document.getElementById('langToggle').addEventListener('click', () => {
  state.lang = state.lang === 'fr' ? 'en' : 'fr';
  applyLang();
  renderMenu();
  renderContent();
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
        <span>${t(c.label)}</span>
        <span class="menu-item-sub">${t(c.sub)}</span>
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

  document.getElementById('wordCount').textContent = `${VOCAB.length} ${t(UI.wordsLoaded)}`;
}

// ---------------- WORD CARD ----------------
function tagLabel(tag) { return t(TAG_LABEL[tag]) || tag; }

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

  const meanings = entry.parts.map(p => `<b>${p.char}</b> ${t(p.meaning)}`).join(' · ');
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
      <div class="breakdown-logic">💡 ${t(entry.logic)}</div>
      ${entry.note ? `<div class="breakdown-note">${t(entry.note)}</div>` : ''}
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
      <div class="word-fr">${em ? `<span class="word-fr-emoji">${em}</span> ` : ''}${t(entry.gloss)}</div>
      <div class="word-card-actions">
        <button class="btn-audio" data-speak="${entry.hanzi}">${t(UI.listen)}</button>
        ${entry.rad ? `<span class="word-radical-chip" data-radical="${entry.rad}">${t(UI.key)} ${entry.rad}</span>` : ''}
        <span class="word-radical-chip" data-explore="${entry.hanzi}">🕸 ${t(UI.explore)}</span>
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
  container.querySelectorAll('[data-explore]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      state.category = 'explorer';
      state.explorer.current = chip.dataset.explore;
      state.explorer.history = [];
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
    const domains = [...new Set(words.map(w => t(w.domain)))];
    content.innerHTML = `
      ${pageHeader(t(cat.label), t(cat.sub) + ' · ' + words.length + ' ' + t(UI.phrasesCount))}
      ${domains.map(d => `
        <div class="domain-block">
          <h3 class="domain-title">${d}</h3>
          <div class="word-grid">${words.filter(w => t(w.domain) === d).map(renderWordCard).join('')}</div>
        </div>
      `).join('')}
    `;
  } else {
    content.innerHTML = `
      ${pageHeader(t(cat.label), t(cat.sub) + ' · ' + words.length + ' ' + t(UI.words))}
      <div class="word-grid">${words.map(renderWordCard).join('')}</div>
    `;
  }
  wireWordGrid(content);
}

function renderGrammarPage() {
  const content = document.getElementById('content');
  content.innerHTML = `
    ${pageHeader(t(UI.grammarTitle), t(UI.grammarSub))}
    <div class="grammar-list">
      ${GRAMMAR.map(g => `
        <div class="grammar-card">
          <h3 class="grammar-title">${t(g.title)}</h3>
          <p class="grammar-rule">${t(g.rule)}</p>
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
                  <div class="grammar-example-fr">${t(ex.fr)}</div>
                  ${ex.note ? `<div class="grammar-example-note">${t(ex.note)}</div>` : ''}
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
        <div class="radical-card-meaning">${t(r.meaning)}</div>
        <div class="radical-card-count">${count} ${t(count > 1 ? UI.wordsLinked : UI.wordLinked)}</div>
      </div>
    `;
  }).join('');

  let resultsHtml = '';
  if (state.selectedRadical) {
    const matches = computeRadicalMatches(state.selectedRadical).filter(v => v.hanzi !== state.selectedRadical);
    const r = RADICALS[state.selectedRadical];
    resultsHtml = `
      <div class="radical-results">
        ${pageHeader(`${state.selectedRadical} · ${t(r.meaning)}`, `${t(UI.radicalResultsSub)} · ${matches.length}`)}
        <div class="word-grid">${matches.map(renderWordCard).join('') || `<div class="flash-empty">${t(UI.noWordsYet)}</div>`}</div>
      </div>
    `;
  }

  content.innerHTML = `
    ${pageHeader(t(UI.radicauxTitle), t(UI.radicauxSub))}
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
  return [{ id: 'all', label: UI.scopeAll }, ...CATEGORIES.filter(c => VOCAB.some(v => v.cat === c.id)).map(c => ({ id: c.id, label: c.label }))];
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
    <button class="flash-scope-btn ${state.flash.scope === s.id ? 'active' : ''}" data-scope="${s.id}">${t(s.label)}</button>
  `).join('');

  const deck = state.flash.deck;
  const entry = deck[state.flash.index];

  let cardHtml;
  if (!entry) {
    cardHtml = `<div class="flash-empty">${t(UI.noWordsCategory)}</div>`;
  } else if (!state.flash.revealed) {
    cardHtml = `
      <div class="flash-card" id="flashCard">
        <span class="flash-progress">${state.flash.index + 1} / ${deck.length}</span>
        <div class="flash-hanzi">${entry.hanzi}</div>
        <div class="flash-hint">${t(UI.tapToReveal)}</div>
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
          <div class="flash-fr">${t(entry.gloss)}</div>
          <div class="flash-logic">💡 ${t(entry.logic)}</div>
        </div>
      </div>
      <div class="flash-controls">
        <button class="flash-btn retry" id="btnRetry">${t(UI.retry)}</button>
        <button class="btn-audio" id="btnFlashAudio">${t(UI.listen)}</button>
        <button class="flash-btn know" id="btnKnow">${t(UI.know)}</button>
      </div>
    `;
  }

  content.innerHTML = `
    ${pageHeader(t(UI.revisionTitle), t(UI.revisionSub))}
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
function writeScopes() {
  return [{ id: 'all', label: UI.scopeAll }, ...CATEGORIES.filter(c => VOCAB.some(v => v.cat === c.id)).map(c => ({ id: c.id, label: c.label }))];
}

function buildCharacterPool(scope) {
  const map = new Map(); // char -> { pinyin, meaning }
  const isHanzi = (c) => /[一-鿿]/.test(c);
  const includeAll = !scope || scope === 'all';

  if (includeAll) {
    Object.entries(RADICALS).forEach(([char, r]) => {
      if (isHanzi(char)) map.set(char, { pinyin: r.pinyin, meaning: r.meaning });
    });
  }

  const vocabPool = includeAll ? VOCAB : VOCAB.filter(v => v.cat === scope);

  vocabPool.forEach(v => {
    if (v.hanzi.length === 1 && isHanzi(v.hanzi) && !map.has(v.hanzi)) {
      map.set(v.hanzi, { pinyin: v.pinyin, meaning: v.gloss });
    }
  });
  vocabPool.forEach(v => {
    (v.parts || []).forEach(p => {
      if (p.char.length === 1 && isHanzi(p.char) && !map.has(p.char)) {
        // Ce caractère n'a pas de sens autonome (ex. 菠 n'existe que dans 菠萝) :
        // on montre le mot réel où il apparaît plutôt que juste sa composition,
        // sinon "菠" affiche seulement "艹(plante) + 波(son)" sans répondre à
        // "qu'est-ce que ça veut dire".
        map.set(p.char, {
          pinyin: p.pinyin,
          meaning: p.meaning,
          context: {
            fr: `dans ${v.hanzi} (${v.pinyin}) : ${v.gloss.fr}`,
            en: `in ${v.hanzi} (${v.pinyin}): ${v.gloss.en}`,
          },
        });
      }
    });
  });

  let list = [...map.entries()].map(([char, info]) => ({ char, ...info }));

  if (state.write.shuffled) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  } else {
    list.sort((a, b) => a.char.localeCompare(b.char, 'zh'));
  }
  return list;
}

function rebuildWritePool() {
  state.write.pool = buildCharacterPool(state.write.scope);
  state.write.index = 0;
}

function renderEcriturePage() {
  if (state.write.pool.length === 0) rebuildWritePool();
  const pool = state.write.pool;
  const item = pool[state.write.index];
  const em = item ? emojiFor(item.char) : '';

  const scopes = writeScopes();
  const scopeHtml = scopes.map(s => `
    <button class="flash-scope-btn ${state.write.scope === s.id ? 'active' : ''}" data-wscope="${s.id}">${t(s.label)}</button>
  `).join('');

  const content = document.getElementById('content');
  content.innerHTML = `
    ${pageHeader(t(UI.ecritureTitle), `${t(UI.ecritureSub)} · ${pool.length} ${t(UI.characters)}`)}
    <div class="write-wrap">
      <div class="flash-scope write-scope-row">
        <button class="flash-scope-btn shuffle-chip ${state.write.shuffled ? 'active' : ''}" id="btnShuffle">${state.write.shuffled ? t(UI.shuffleOn) : t(UI.shuffleOff)}</button>
        <button class="flash-scope-btn shuffle-chip ${state.write.blind ? 'active' : ''}" id="btnBlind">${state.write.blind ? t(UI.blindOn) : t(UI.blindOff)}</button>
        ${scopeHtml}
      </div>
      ${item ? `
      <div class="write-info">
        <span class="write-progress">${state.write.index + 1} / ${pool.length}</span>
        ${em ? `<span class="write-emoji">${em}</span>` : ''}
        <span class="write-pinyin">${item.pinyin}</span>
        <span class="write-meaning">${t(item.context || item.meaning)}</span>
      </div>
      ${item.context ? `<div class="write-meaning-sub">${t(item.meaning)}</div>` : ''}
      <div class="canvas-stack" id="canvasStack">
        <canvas id="bgCanvas"></canvas>
        <canvas id="fgCanvas"></canvas>
      </div>
      <div class="write-status" id="writeStatus">${t(UI.traceToCheck)}</div>
      <div class="write-controls">
        <button class="flash-btn" id="btnPrev">← <span class="btn-label">${t(UI.prevLabel)}</span></button>
        <button class="btn-audio" id="btnWriteAudio">🔊 <span class="btn-label">${t(UI.listenLabel)}</span></button>
        <button class="flash-btn" id="btnClear">🗑 <span class="btn-label">${t(UI.clear)}</span></button>
        <button class="flash-btn" id="btnNext"><span class="btn-label">${t(UI.nextLabel)}</span> →</button>
      </div>
      ` : `<div class="flash-empty">${t(UI.noWordsCategory)}</div>`}
    </div>
  `;

  content.querySelectorAll('[data-wscope]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.write.scope = btn.dataset.wscope;
      rebuildWritePool();
      renderContent();
    });
  });
  document.getElementById('btnShuffle').addEventListener('click', () => {
    state.write.shuffled = !state.write.shuffled;
    rebuildWritePool();
    renderContent();
  });
  document.getElementById('btnBlind').addEventListener('click', () => {
    state.write.blind = !state.write.blind;
    renderContent();
  });

  if (!item) return;

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
    fg.getContext('2d').clearRect(0, 0, fg.width, fg.height);
    resetWriteFeedback();
  });
}

function resetWriteFeedback() {
  const stack = document.getElementById('canvasStack');
  const status = document.getElementById('writeStatus');
  if (stack) stack.classList.remove('good', 'bad');
  if (status) {
    status.textContent = t(UI.traceToCheck);
    status.className = 'write-status';
  }
}

// Résolution de travail fixe pour la comparaison pixel par pixel (indépendante du DPR de l'écran)
const SCORE_SIZE = 120;
const SCORE_MIN_INK = 60; // px encrés minimum avant de juger le tracé

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
  const accent = styles.getPropertyValue('--accent').trim();
  const good = styles.getPropertyValue('--good').trim();
  const bad = styles.getPropertyValue('--bad').trim();
  const fontStack = '"PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif';

  bgCtx.strokeStyle = border;
  bgCtx.lineWidth = 1;
  bgCtx.strokeRect(0.5, 0.5, size - 1, size - 1);
  bgCtx.setLineDash([6, 6]);
  bgCtx.beginPath();
  bgCtx.moveTo(size / 2, 0); bgCtx.lineTo(size / 2, size);
  bgCtx.moveTo(0, size / 2); bgCtx.lineTo(size, size / 2);
  bgCtx.stroke();
  bgCtx.setLineDash([]);

  // Mode aveugle : pas de fantôme, seulement la grille — on écrit de mémoire.
  // Le fantôme utilise la couleur d'accent (pas --text) : en thème sombre, un texte
  // gris clair à faible opacité sur fond noir devient quasi invisible, alors que
  // l'accent (jaune en dark, bleu en light) reste lisible dans les deux thèmes.
  if (!state.write.blind) {
    bgCtx.globalAlpha = 0.22;
    bgCtx.fillStyle = accent;
    bgCtx.font = `${size * 0.72}px ${fontStack}`;
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    bgCtx.fillText(char, size / 2, size / 2 + size * 0.03);
    bgCtx.globalAlpha = 1;
  }

  // --- masques de référence (hors-écran) pour noter le tracé ---
  // 1) coreInk = le glyphe exact (sert de dénominateur pour la COUVERTURE :
  //    combien du VRAI caractère a été recouvert).
  // 2) toleranceInk = le glyphe épaissi par offsets (sert de zone tolérée pour la
  //    PRÉCISION : une main qui ne suit pas le modèle au pixel près n'est pas pénalisée).
  // Comparer la couverture au masque dilaté plutôt qu'au glyphe réel plafonnerait
  // le score bien avant 100%, même pour un tracé parfait — d'où les deux masques.
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = SCORE_SIZE;
  maskCanvas.height = SCORE_SIZE;
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.fillStyle = '#000';
  maskCtx.font = `${SCORE_SIZE * 0.72}px ${fontStack}`;
  maskCtx.textAlign = 'center';
  maskCtx.textBaseline = 'middle';
  const cx = SCORE_SIZE / 2, cy = SCORE_SIZE / 2 + SCORE_SIZE * 0.03;

  maskCtx.fillText(char, cx, cy);
  const coreData = maskCtx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
  const coreInk = new Uint8Array(SCORE_SIZE * SCORE_SIZE);
  let coreCount = 0;
  for (let i = 0; i < SCORE_SIZE * SCORE_SIZE; i++) {
    if (coreData[i * 4 + 3] > 128) { coreInk[i] = 1; coreCount++; }
  }

  const dilate = SCORE_SIZE * 0.09;
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    maskCtx.fillText(char, cx + Math.cos(angle) * dilate, cy + Math.sin(angle) * dilate);
  }
  const toleranceData = maskCtx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;
  const toleranceInk = new Uint8Array(SCORE_SIZE * SCORE_SIZE);
  for (let i = 0; i < SCORE_SIZE * SCORE_SIZE; i++) {
    if (toleranceData[i * 4 + 3] > 128) toleranceInk[i] = 1;
  }

  // --- premier plan : tracé de l'utilisateur ---
  const fgCtx = fg.getContext('2d');
  fgCtx.scale(dpr, dpr);
  fgCtx.strokeStyle = accent;
  // Épaisseur proche de celle des traits du glyphe modèle : un tracé même
  // approximatif doit pouvoir recouvrir une bonne partie du caractère.
  fgCtx.lineWidth = size * 0.045;
  fgCtx.lineCap = 'round';
  fgCtx.lineJoin = 'round';

  const scoreCanvas = document.createElement('canvas');
  scoreCanvas.width = SCORE_SIZE;
  scoreCanvas.height = SCORE_SIZE;
  const scoreCtx = scoreCanvas.getContext('2d');

  function checkWriting() {
    scoreCtx.clearRect(0, 0, SCORE_SIZE, SCORE_SIZE);
    scoreCtx.drawImage(fg, 0, 0, fg.width, fg.height, 0, 0, SCORE_SIZE, SCORE_SIZE);
    const drawnData = scoreCtx.getImageData(0, 0, SCORE_SIZE, SCORE_SIZE).data;

    let drawnCount = 0, coreOverlap = 0, toleranceOverlap = 0;
    for (let i = 0; i < SCORE_SIZE * SCORE_SIZE; i++) {
      if (drawnData[i * 4 + 3] > 64) {
        drawnCount++;
        if (coreInk[i]) coreOverlap++;
        if (toleranceInk[i]) toleranceOverlap++;
      }
    }

    const status = document.getElementById('writeStatus');
    if (!status) return; // page changée entre-temps
    if (drawnCount < SCORE_MIN_INK) { resetWriteFeedback(); return; }

    const coverage = coreCount ? coreOverlap / coreCount : 0;
    const precision = drawnCount ? toleranceOverlap / drawnCount : 0;
    // La couverture du caractère pèse plus lourd que la précision : la tolérance
    // spatiale (glyphe gonflé) absorbe déjà l'imprécision du doigt/souris, donc
    // ce qui doit vraiment être exigeant, c'est d'avoir tracé TOUT le caractère.
    const score = coverage * 0.65 + precision * 0.35;
    const isGood = score >= 0.65;

    stack.classList.toggle('good', isGood);
    stack.classList.toggle('bad', !isGood);
    status.className = `write-status ${isGood ? 'good' : 'bad'}`;
    status.textContent = `${isGood ? '✓' : '✗'} ${t(isGood ? UI.wellWritten : UI.needsWork)} (${Math.round(score * 100)}%)`;

    // recolore le tracé en vert/rouge pour un retour visuel immédiat
    fgCtx.save();
    fgCtx.globalCompositeOperation = 'source-atop';
    fgCtx.fillStyle = isGood ? good : bad;
    fgCtx.fillRect(0, 0, size, size);
    fgCtx.restore();
  }

  let drawing = false;
  let last = null;
  let checkTimer = null;

  function pos(e) {
    const rect = fg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e) {
    drawing = true;
    last = pos(e);
    fg.setPointerCapture(e.pointerId);
    clearTimeout(checkTimer);
    // une nouvelle touche efface la teinte de correction précédente pour ce trait
    fgCtx.strokeStyle = accent;
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
  function end() {
    if (!drawing) return;
    drawing = false;
    last = null;
    clearTimeout(checkTimer);
    checkTimer = setTimeout(checkWriting, 400);
  }

  fg.addEventListener('pointerdown', start);
  fg.addEventListener('pointermove', move);
  fg.addEventListener('pointerup', end);
  fg.addEventListener('pointerleave', end);
  fg.addEventListener('pointercancel', end);
}

// ---------------- EXPLORER (dictionnaire + réseau de mots, façon graphe) ----------------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function findVocabByHanzi(key) { return VOCAB.find(v => v.hanzi === key); }

const firstReading = (p) => (p || '').split(' / ')[0];
// Libellé venant du dictionnaire : anglais seulement, même en mode FR pour l'instant.
const enLabel = (text) => ({ fr: text, en: text, enOnly: true });
const shortLabel = (text) => {
  const first = String(text).split(';')[0].trim();
  return first.length > 36 ? first.slice(0, 34) + '…' : first;
};

// Résout une clé (caractère ou mot) vers une fiche : d'abord le vocabulaire
// curé (traductions FR), puis le dictionnaire complet.
function resolveNode(key) {
  const v = findVocabByHanzi(key);
  const rec = Dict.ready() ? Dict.char(key) : null;
  if (v) return { key, kind: 'vocab', hanzi: v.hanzi, pinyin: v.pinyin, label: v.gloss, emoji: emojiFor(v.hanzi), vocab: v, rec };
  if (key.length === 1) {
    const cur = RADICALS[key];
    if (cur) return { key, kind: 'char', hanzi: key, pinyin: cur.pinyin, label: cur.meaning, emoji: emojiFor(key), rec };
    if (rec) return { key, kind: 'char', hanzi: key, pinyin: firstReading(rec.p), label: enLabel(rec.d || ''), emoji: emojiFor(key), rec };
    return null;
  }
  if (Dict.ready()) {
    const entries = Dict.word(key);
    if (entries) return { key, kind: 'word', hanzi: key, pinyin: entries[0][2], label: enLabel(entries[0][3]), emoji: emojiFor(key), entries };
  }
  return null;
}

// Jusqu'à 8 mots liés autour du centre : ses composants (avec leur rôle :
// son / sens), son radical, puis les mots qui l'utilisent. Pas de lien "même
// radical" entre frères : la famille d'un radical a sa propre section dessous.
function getOrbitSatellites(center) {
  const results = [];
  const seen = new Set([center.key]);
  const MAX = 8;
  const add = (relation, ch, pinyin, meaning, role) => {
    if (seen.has(ch) || results.length >= MAX) return;
    seen.add(ch);
    results.push({ relation, role, char: ch, pinyin, meaning, node: resolveNode(ch) });
  };
  const roleOfTag = (tag) => (tag === 'son' ? 'sound' : tag === 'mot' ? 'word' : 'sense');

  if (center.vocab && center.vocab.parts) {
    center.vocab.parts.forEach(p => add('component', p.char, p.pinyin, p.meaning, roleOfTag(p.tag)));
  }

  if (center.kind === 'word') {
    const syl = center.pinyin.split(' ');
    [...center.key].forEach((ch, i) => {
      const r = Dict.char(ch);
      add('component', ch, syl.length === center.key.length ? syl[i] : firstReading(r && r.p), enLabel(r ? r.d || '' : ''), 'word');
    });
  }

  const rec = center.rec;
  if (center.key.length === 1 && rec) {
    (rec.c || []).filter(c => c !== center.key).slice(0, 4).forEach(c => {
      const cr = Dict.char(c);
      const role = c === rec.ph ? 'sound' : c === rec.se ? 'sense' : 'part';
      add('component', c, firstReading(cr && cr.p), enLabel(cr ? cr.d || '' : ''), role);
    });
    const canon = Dict.canonical(rec.r || center.key);
    const radMeaning = (ch) => { const r = Dict.char(ch); return (RADICALS[ch] && RADICALS[ch].meaning) || enLabel(r ? r.d || '' : ''); };
    const radPinyin = (ch) => { const r = Dict.char(ch); return firstReading(r && r.p); };
    if (rec.r && rec.r !== center.key) add('radical', rec.r, radPinyin(rec.r), radMeaning(rec.r), 'radical');
    // un radical (ou sa forme réduite) montre sa variante et quelques-uns de ses caractères
    if (center.key === canon || Dict.canonical(center.key) === canon) {
      if (center.key !== canon) add('radical', canon, radPinyin(canon), radMeaning(canon), 'radical');
      Dict.variants(canon).forEach(v => add('radical', v, radPinyin(v), radMeaning(v), 'radical'));
      let n = 0;
      for (const c of Dict.family(canon, 12)) {
        if (n >= 3) break;
        if (seen.has(c)) continue;
        const cr = Dict.char(c);
        add('family', c, firstReading(cr && cr.p), enLabel(cr ? cr.d || '' : ''), 'sense');
        n++;
      }
    }
  }

  if (center.key.length === 1) {
    let curated = 0;
    for (const entry of VOCAB) {
      if (curated >= 3 || results.length >= MAX) break;
      if (entry.hanzi === center.key || seen.has(entry.hanzi)) continue;
      if (entry.parts && entry.parts.some(p => p.char === center.key)) {
        add('usedIn', entry.hanzi, entry.pinyin, entry.gloss, 'word');
        curated++;
      }
    }
    if (Dict.ready()) {
      Dict.wordsWith(center.key, 14).forEach(w => add('usedIn', w[0], w[2], enLabel(w[3]), 'word'));
    }
  }
  return results;
}

const chipHtml = (ch, sub) => {
  const rec = Dict.ready() ? Dict.char(ch) : null;
  const py = rec ? firstReading(rec.p) : '';
  return `<button class="dict-chip" data-key="${esc(ch)}"><span class="dict-chip-char">${esc(ch)}</span>${py ? `<span class="dict-chip-py">${esc(py)}</span>` : ''}${sub ? `<span class="dict-chip-sub">${esc(sub)}</span>` : ''}</button>`;
};
const rowHtml = (w) => `<button class="dict-row" data-key="${esc(w[0])}"><span class="dict-row-hanzi">${esc(w[0])}${w[1] ? `<small>${esc(w[1])}</small>` : ''}</span><span class="dict-row-py">${esc(w[2])}</span><span class="dict-row-gloss">${esc(w[3])}</span></button>`;

function renderExplorerDetails(center) {
  if (!Dict.ready()) {
    return `<div class="dict-note">${esc(state.explorer.dictError ? t(UI.dictError) : t(UI.dictLoading))}</div>`;
  }
  const rec = center.rec;
  const sections = [];

  // Définition(s)
  const defLines = [];
  if (center.kind === 'word') {
    center.entries.forEach(w => defLines.push(`<div class="dict-def-line"><span class="dict-def-py">${esc(w[2])}</span> ${esc(w[3])}</div>`));
  } else {
    if (rec && rec.d) defLines.push(`<div class="dict-def-line">${esc(rec.d)}</div>`);
    (Dict.word(center.key) || []).slice(0, 2).forEach(w => defLines.push(`<div class="dict-def-line"><span class="dict-def-py">${esc(w[2])}</span> ${esc(w[3])}</div>`));
  }
  if (defLines.length) sections.push(`<section class="dict-sec"><h3>${esc(t(UI.secDefinition))}<span class="dict-en">EN</span></h3>${defLines.join('')}</section>`);

  // Composition / étymologie
  if (center.key.length > 1) {
    sections.push(`<section class="dict-sec"><h3>${esc(t(UI.secComposition))}</h3><div class="dict-chips">${[...new Set([...center.key])].map(c => chipHtml(c)).join('')}</div></section>`);
  } else if (rec && (rec.t || rec.c)) {
    let etym = '';
    if (rec.t === 'p' && rec.ph && rec.se) {
      etym = `<div class="dict-etym"><b>${esc(t(UI.etymPhonetic))}</b> — ${esc(t(UI.etymSense))} ${chipHtml(rec.se, rec.h)} + ${esc(t(UI.etymSound))} ${chipHtml(rec.ph)}</div>`;
    } else if (rec.t === 'i') {
      etym = `<div class="dict-etym"><b>${esc(t(UI.etymIdeographic))}</b>${rec.h ? ` — ${esc(rec.h)}` : ''}</div>`;
    } else if (rec.t === 'g') {
      etym = `<div class="dict-etym"><b>${esc(t(UI.etymPictographic))}</b>${rec.h ? ` — ${esc(rec.h)}` : ''}</div>`;
    }
    const comps = (rec.c || []).filter(c => c !== center.key);
    if (etym || comps.length) {
      sections.push(`<section class="dict-sec"><h3>${esc(t(UI.secComposition))}</h3>${etym}${comps.length ? `<div class="dict-chips">${comps.map(c => chipHtml(c)).join('')}</div>` : ''}</section>`);
    }
  }

  // Radical + famille
  const rad = center.key.length === 1 ? Dict.canonical((rec && rec.r) || center.key) : null;
  if (rad && Dict.familySize(rad) > 0) {
    const meaningOf = (ch) => { const rr = Dict.char(ch); const m = RADICALS[ch] ? t(RADICALS[ch].meaning) : (rr && rr.d) || ''; return m ? shortLabel(m) : ''; };
    const forms = [...new Set([rec && rec.r, rad, ...Dict.variants(rad)].filter(Boolean))].filter(f => f !== center.key);
    const size = Dict.familySize(rad);
    sections.push(`<section class="dict-sec"><h3>${esc(t(UI.secRadical))}</h3><div class="dict-chips">${forms.map(f => chipHtml(f, meaningOf(f))).join('')}</div></section>`);
    if (size > 1) {
      sections.push(`<section class="dict-sec"><h3>${esc(t(UI.secFamily))} ${esc(rad)} · ${size}</h3><div class="dict-chips">${Dict.family(rad, 60).filter(c => c !== center.key).map(c => chipHtml(c)).join('')}</div></section>`);
    }
  }

  // Mots liés
  const base = center.key.length > 1 ? [...new Set([...center.key])].slice(0, 2) : [center.key];
  base.forEach(ch => {
    const list = Dict.wordsWith(ch, 24).filter(w => w[0] !== center.key);
    if (list.length) sections.push(`<section class="dict-sec"><h3>${esc(t(UI.secWordsWith))} ${esc(ch)}</h3><div class="dict-rows">${list.map(rowHtml).join('')}</div></section>`);
  });

  sections.push(`<div class="dict-credit">${esc(t(UI.dictSources))}</div>`);
  return sections.join('');
}

function navigateExplorer(key) {
  if (key !== state.explorer.current) state.explorer.history.push(state.explorer.current);
  state.explorer.current = key;
  renderContent();
  const inner = document.getElementById('content');
  if (inner) inner.scrollTop = 0;
}

// Recherche : vocabulaire curé (FR/EN) d'abord, puis le dictionnaire complet
function runExplorerSearch(query) {
  const box = document.getElementById('orbitSearchResults');
  if (!box) return;
  const q = query.trim();
  if (!q) { box.innerHTML = ''; return; }
  if (!Dict.ready()) { box.innerHTML = `<div class="dict-note">${esc(t(state.explorer.dictError ? UI.dictError : UI.dictLoading))}</div>`; return; }

  const lq = q.toLowerCase();
  const nq = lq.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  const rows = [];
  const seen = new Set();

  VOCAB.forEach(v => {
    if (rows.length >= 5 || seen.has(v.hanzi)) return;
    const py = v.pinyin.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
    const hit = v.hanzi.includes(q) ||
      (nq.length >= 2 && py.startsWith(nq)) ||
      (lq.length >= 2 && (v.gloss.fr.toLowerCase().includes(lq) || v.gloss.en.toLowerCase().includes(lq)));
    if (hit) { seen.add(v.hanzi); rows.push({ key: v.hanzi, hanzi: v.hanzi, pinyin: v.pinyin, gloss: t(v.gloss), curated: true }); }
  });

  Dict.search(q, 14).forEach(r => {
    if (seen.has(r.key)) return;
    seen.add(r.key);
    if (r.type === 'char') {
      const c = Dict.char(r.key);
      rows.push({ key: r.key, hanzi: r.key, pinyin: firstReading(c && c.p), gloss: (c && c.d) || '' });
    } else {
      rows.push({ key: r.key, hanzi: r.key, trad: r.word[1], pinyin: r.word[2], gloss: r.word[3] });
    }
  });

  box.innerHTML = rows.length
    ? rows.map(r => `<button class="dict-row${r.curated ? ' curated' : ''}" data-key="${esc(r.key)}"><span class="dict-row-hanzi">${esc(r.hanzi)}${r.trad ? `<small>${esc(r.trad)}</small>` : ''}</span><span class="dict-row-py">${esc(r.pinyin)}</span><span class="dict-row-gloss">${esc(r.gloss)}</span></button>`).join('')
    : `<div class="dict-note">${esc(t(UI.noResults))}</div>`;
  box.querySelectorAll('[data-key]').forEach(el => el.addEventListener('click', () => navigateExplorer(el.dataset.key)));
}

function onDictLoaded() {
  if (state.category !== 'explorer') return;
  const inp = document.getElementById('orbitSearch');
  if (inp && inp.value.trim()) { runExplorerSearch(inp.value); renderDetailsOnly(); }
  else renderContent();
}

// Remplit la zone de détails sans recréer la page (pour ne pas casser la saisie)
function renderDetailsOnly() {
  const box = document.getElementById('explorerDetails');
  const center = resolveNode(state.explorer.current) || resolveNode('火鸡');
  if (box && center) box.innerHTML = renderExplorerDetails(center);
  document.querySelectorAll('#explorerDetails [data-key]').forEach(el => el.addEventListener('click', () => navigateExplorer(el.dataset.key)));
}

function renderExplorerPage() {
  const content = document.getElementById('content');
  const center = resolveNode(state.explorer.current) || resolveNode('火鸡');
  const satellites = getOrbitSatellites(center);
  const em = center.emoji;
  const centerLabel = center.label.enOnly ? shortLabel(t(center.label)) : t(center.label);

  const ORBIT_DURATION = 50; // secondes pour un tour complet — lent et calme

  content.innerHTML = `
    ${pageHeader(t(UI.explorerTitle), t(UI.explorerSub))}
    <div class="orbit-search">
      <input id="orbitSearch" type="search" inputmode="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${esc(t(UI.explorerSearch))}">
      <div class="orbit-search-results" id="orbitSearchResults"></div>
    </div>
    <div class="orbit-toolbar">
      <button class="flash-btn" id="btnOrbitBack" ${state.explorer.history.length ? '' : 'disabled'}>${t(UI.explorerBack)}</button>
    </div>
    <div class="orbit-wrap" id="orbitWrap">
      <div class="orbit-ring"></div>
      <div class="orbit-center">
        ${em ? `<div class="orbit-emoji">${em}</div>` : ''}
        <div class="orbit-hanzi">${esc(center.hanzi)}</div>
        <div class="orbit-pinyin">${esc(center.pinyin)}</div>
        <div class="orbit-label">${esc(centerLabel)}</div>
      </div>
      ${satellites.map((s, i) => {
        const delay = -(i / satellites.length) * ORBIT_DURATION;
        const satEmoji = (s.node && s.node.emoji) || emojiFor(s.char);
        const tip = s.meaning ? (s.meaning.enOnly ? shortLabel(t(s.meaning)) : t(s.meaning)) : '';
        return `
        <div class="orbit-track" style="animation-duration:${ORBIT_DURATION}s; animation-delay:${delay}s;">
          <div class="orbit-satellite ${s.node ? 'navigable' : 'leaf'} rel-${s.relation} role-${s.role}" style="animation-duration:${ORBIT_DURATION}s; animation-delay:${delay}s;" ${s.node ? `data-key="${esc(s.node.key)}"` : ''} title="${esc(tip || t(UI.explorerDeadEnd))}">
            ${satEmoji ? `<span class="orbit-sat-emoji">${satEmoji}</span>` : `<span class="orbit-sat-dot"></span>`}
            <span class="orbit-sat-char">${esc(s.char)}</span>
            <span class="orbit-sat-pinyin">${esc(s.pinyin)}</span>
          </div>
        </div>
      `;
      }).join('')}
    </div>
    <div class="orbit-legend">
      <span class="lg lg-sense">${esc(t(UI.legendSense))}</span>
      <span class="lg lg-sound">${esc(t(UI.legendSound))}</span>
      <span class="lg lg-radical">${esc(t(UI.legendRadical))}</span>
      <span class="lg lg-word">${esc(t(UI.legendWord))}</span>
    </div>
    <div class="orbit-audio-row">
      <button class="btn-audio orbit-audio" data-speak="${esc(center.hanzi)}">🔊 <span class="btn-label">${t(UI.listenLabel)}</span></button>
    </div>
    <div class="explorer-details" id="explorerDetails">${renderExplorerDetails(center)}</div>
  `;

  sizeOrbit();

  const input = document.getElementById('orbitSearch');
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runExplorerSearch(input.value), 120);
  });

  document.getElementById('btnOrbitBack').addEventListener('click', () => {
    const prev = state.explorer.history.pop();
    if (prev) { state.explorer.current = prev; renderContent(); }
  });
  content.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); speak(btn.dataset.speak); });
  });
  content.querySelectorAll('.orbit-satellite.navigable, #explorerDetails [data-key]').forEach(el => {
    el.addEventListener('click', () => navigateExplorer(el.dataset.key));
  });

  if (!Dict.ready()) {
    Dict.load().then(onDictLoaded).catch(() => {
      state.explorer.dictError = true;
      if (state.category === 'explorer') renderDetailsOnly();
    });
  }
}

// Le rayon d'orbite (en px) est fourni aux pistes via une variable CSS,
// calculé à partir de la taille réelle du conteneur (responsive).
function sizeOrbit() {
  const wrap = document.getElementById('orbitWrap');
  const centerEl = document.querySelector('.orbit-center');
  const satEl = document.querySelector('.orbit-satellite');
  if (!wrap || !centerEl || !satEl) return;

  // Rayon calculé à partir des tailles RÉELLEMENT rendues (pas un ratio du
  // conteneur à l'aveugle) : garantit qu'un satellite ne chevauche jamais le
  // centre, quelle que soit la taille d'écran. gap = marge visible entre eux.
  const gap = 14;
  const desired = (centerEl.clientWidth / 2) + (satEl.clientWidth / 2) + gap;
  const maxAllowed = (wrap.clientWidth / 2) - (satEl.clientWidth / 2) - 4;
  const radius = Math.min(desired, maxAllowed);

  wrap.querySelectorAll('.orbit-track').forEach(track => {
    track.style.setProperty('--r', radius + 'px');
  });
}

// ---------------- ROUTER ----------------
function renderContent() {
  if (state.category === 'explorer') return renderExplorerPage();
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

// ---------------- DIAGNOSTIC (3 taps sur "SYS.VER") ----------------
// Affiche les vraies dimensions mesurées sur l'appareil, pour comprendre la
// bande en bas sur iPhone sans deviner : capture d'écran de ce panneau = données.
function showDebugPanel() {
  let panel = document.getElementById('debugPanel');
  if (panel) { panel.remove(); return; }

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const safe = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
  probe.remove();

  const h = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'n/a';
    const r = el.getBoundingClientRect();
    return `${Math.round(r.top)}→${Math.round(r.bottom)} (h=${Math.round(r.height)})`;
  };
  const vv = window.visualViewport;
  const lines = [
    `standalone: ${window.navigator.standalone === true} / display-mode: ${window.matchMedia('(display-mode: standalone)').matches}`,
    `inner: ${window.innerWidth}×${window.innerHeight}`,
    `visualViewport: ${vv ? `${Math.round(vv.width)}×${Math.round(vv.height)} top=${Math.round(vv.offsetTop)}` : 'n/a'}`,
    `screen: ${screen.width}×${screen.height}  dpr=${window.devicePixelRatio}`,
    `html clientH: ${document.documentElement.clientHeight}  body clientH: ${document.body.clientHeight}`,
    `safe-area (t r b l): ${safe}`,
    `.app: ${h('.app')}`,
    `.layout: ${h('.layout')}`,
    `.panel-left: ${h('.panel-left')}`,
    `.panel-right: ${h('.panel-right')}`,
    `.bg-grid: ${h('.bg-grid')}`,
    `.safe-bottom-fill: ${h('.safe-bottom-fill')}`,
    `scrollY: ${window.scrollY}  (tap pour fermer)`,
  ];

  panel = document.createElement('pre');
  panel.id = 'debugPanel';
  panel.textContent = lines.join('\n');
  panel.style.cssText = 'position:fixed;left:8px;right:8px;top:max(60px,env(safe-area-inset-top));z-index:9999;margin:0;padding:10px;background:#000;color:#0f0;font:11px/1.45 monospace;white-space:pre-wrap;border:1px solid #0f0;';
  panel.addEventListener('click', () => panel.remove());
  document.body.appendChild(panel);
}

(function wireDebugTap() {
  const el = document.getElementById('sysVer');
  if (!el) return;
  let taps = 0, timer = null;
  el.addEventListener('click', () => {
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => { taps = 0; }, 1500);
    if (taps >= 3) { taps = 0; showDebugPanel(); }
  });
})();

// ---------------- INIT ----------------
applyTheme();
applyLang();
renderMenu();
renderContent();
startNoise();

// Enregistrement du service worker (mode hors-ligne)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
