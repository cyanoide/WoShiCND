// ============================================================
// WOSHICND — dictionnaire (CC-CEDICT + Make Me a Hanzi)
// Chargé en différé : ~6 Mo de JSON, mis en cache par le service worker.
// Données générées par tools/build_data.py (voir data/NOTICE.txt pour les licences).
// ============================================================

const Dict = (() => {
  let loadPromise = null;
  let ready = false;
  let hanzi = {};
  let radicals = [];
  let words = [];
  const wordsBySimp = new Map();
  const wordsByTrad = new Map();
  const wordsByChar = new Map();
  const charCount = new Map();
  const familyByRadical = new Map();
  const familyByPhonetic = new Map();
  let pyKeys = [];

  // Formes réduites des radicaux -> radical complet (氵 est 水 à gauche d'un caractère, etc.)
  const VARIANT_OF = { '氵': '水', '扌': '手', '亻': '人', '忄': '心', '钅': '金', '⺼': '肉', '犭': '犬', '礻': '示', '衤': '衣', '灬': '火', '刂': '刀', '讠': '言', '饣': '食', '纟': '糸', '⺮': '竹', '罒': '网', '艹': '艸', '⺶': '羊', '⺈': '刀', '⺌': '小' };
  const variantsOf = new Map();
  for (const [v, c] of Object.entries(VARIANT_OF)) {
    if (!variantsOf.has(c)) variantsOf.set(c, []);
    variantsOf.get(c).push(v);
  }
  const canonical = (r) => VARIANT_OF[r] || r;

  // "Nǚ" -> "nu", "xī'ān" -> "xian" : pinyin comparable sans tons ni espaces
  const normPinyin = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const isCJK = (c) => /[㐀-鿿豈-﫿]/.test(c);

  function build() {
    words.forEach((w, i) => {
      const [simp, trad] = w;
      if (!wordsBySimp.has(simp)) wordsBySimp.set(simp, []);
      wordsBySimp.get(simp).push(w);
      if (trad) {
        if (!wordsByTrad.has(trad)) wordsByTrad.set(trad, []);
        wordsByTrad.get(trad).push(w);
      }
      for (const c of new Set(simp)) {
        charCount.set(c, (charCount.get(c) || 0) + 1);
        if (!wordsByChar.has(c)) wordsByChar.set(c, []);
        wordsByChar.get(c).push(i);
      }
    });
    pyKeys = words.map(w => normPinyin(w[2]));
    for (const [ch, rec] of Object.entries(hanzi)) {
      if (!rec.r) continue;
      const key = canonical(rec.r);
      if (!familyByRadical.has(key)) familyByRadical.set(key, []);
      familyByRadical.get(key).push(ch);
    }
    for (const [ch, rec] of Object.entries(hanzi)) {
      if (!rec.ph) continue;
      if (!familyByPhonetic.has(rec.ph)) familyByPhonetic.set(rec.ph, []);
      familyByPhonetic.get(rec.ph).push(ch);
    }
    for (const list of familyByPhonetic.values()) {
      list.sort((a, b) => (charCount.get(b) || 0) - (charCount.get(a) || 0));
    }
    for (const list of familyByRadical.values()) {
      list.sort((a, b) => (charCount.get(b) || 0) - (charCount.get(a) || 0));
    }
  }

  function load() {
    if (loadPromise) return loadPromise;
    const get = (name) => fetch(`data/${name}`).then(r => {
      if (!r.ok) throw new Error(`${name}: ${r.status}`);
      return r.json();
    });
    loadPromise = Promise.all([get('hanzi.json'), get('radicals.json'), get('words.json')])
      .then(([h, r, w]) => { hanzi = h; radicals = r; words = w; build(); ready = true; })
      .catch(err => { loadPromise = null; throw err; });
    return loadPromise;
  }

  function wordsWith(ch, limit) {
    const idx = wordsByChar.get(ch) || [];
    const score = (w) => w[0].length * 1000 - [...w[0]].reduce((s, c) => s + (charCount.get(c) || 0), 0) / 100;
    return idx.map(i => words[i]).sort((a, b) => score(a) - score(b)).slice(0, limit);
  }

  function search(query, limit = 15) {
    const q = query.trim();
    if (!q || !ready) return [];
    const out = [];

    if ([...q].some(isCJK)) {
      const seen = new Set();
      const push = (w) => {
        const k = w[0] + '|' + w[2];
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ type: 'word', key: w[0], word: w });
      };
      if (q.length === 1 && hanzi[q]) out.push({ type: 'char', key: q });
      (wordsBySimp.get(q) || []).forEach(push);
      (wordsByTrad.get(q) || []).forEach(push);
      for (const w of words) {
        if (out.length >= limit * 4) break;
        if ((w[0].startsWith(q) || w[1].startsWith(q)) && w[0] !== q) push(w);
      }
      if (out.length < limit) {
        for (const w of words) {
          if (out.length >= limit * 4) break;
          if (w[0].includes(q) || w[1].includes(q)) push(w);
        }
      }
      return out.sort((a, b) => (a.key.length - b.key.length)).slice(0, limit);
    }

    const nq = normPinyin(q);
    const lq = q.toLowerCase();
    const useEnglish = lq.length >= 3;
    const wordRe = useEnglish ? new RegExp('(^|[^a-z])' + lq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    const scored = [];
    for (let i = 0; i < words.length; i++) {
      let s = 0;
      const py = pyKeys[i];
      if (nq && py === nq) s = 100;
      else if (nq && py.startsWith(nq)) s = 60 - Math.min(30, py.length - nq.length);
      if (useEnglish) {
        const g = words[i][3];
        const gl = g.toLowerCase();
        if (gl === lq || gl.startsWith(lq + ';') || gl.startsWith('to ' + lq)) s = Math.max(s, 95);
        else if (wordRe.test(g)) s = Math.max(s, gl.startsWith(lq) ? 80 : 50);
      }
      if (s > 0) {
        scored.push([s - words[i][0].length * 2, i]);
        if (scored.length > 3000) break;
      }
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, limit).map(([, i]) => ({ type: 'word', key: words[i][0], word: words[i] }));
  }

  return {
    load,
    ready: () => ready,
    char: (ch) => hanzi[ch] || null,
    word: (simp) => wordsBySimp.get(simp) || null,
    wordsWith,
    topChars: (n) => [...charCount.entries()].filter(([c]) => hanzi[c] && hanzi[c].p).sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]),
    soundFamily: (ph) => familyByPhonetic.get(ph) || [],
    canonical,
    variants: (radical) => variantsOf.get(radical) || [],
    family: (radical, limit = 80) => (familyByRadical.get(canonical(radical)) || []).slice(0, limit),
    familySize: (radical) => (familyByRadical.get(canonical(radical)) || []).length,
    charCount: (ch) => charCount.get(ch) || 0,
    radicals: () => radicals,
    search,
    isCJK,
  };
})();
