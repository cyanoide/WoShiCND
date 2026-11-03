#!/usr/bin/env python3
"""
Génère les données du dictionnaire de l'appli à partir de deux sources libres :
  - CC-CEDICT (CC BY-SA 4.0)  : mots, pinyin, traductions anglaises
  - Make Me a Hanzi dictionary.txt (LGPL v3, dérivé d'Unihan + CJKlib) :
    radical, décomposition, étymologie (phonétique / sémantique) par caractère

  - hanziDB.csv (MIT, d'après la liste de fréquence de Jun Da) : rang de fréquence
    et niveau HSK par caractère (optionnel)

Usage : python3 -I tools/build_data.py <cedict_ts.u8> <mmh_dictionary.txt> <dossier_sortie> [hanziDB.csv]
Sorties : hanzi.json, radicals.json, words.json
"""
import collections
import csv
import json
import os
import re
import sys

TONE_MARKS = {
    'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ',
}
IDS_RE = re.compile(r'[⿰-⿿？?]')
SYLLABLE_RE = re.compile(r'^([A-Za-zü:]+?)([1-5])$')

TOP_CHARS = 2000          # caractères les plus présents dans CEDICT conservés pour les mots
MAX_WORD_LEN = 4
MAX_GLOSSES = 2
MAX_READINGS_PER_WORD = 3


def numeric_to_marked(syl):
    m = SYLLABLE_RE.match(syl)
    if not m:
        return syl
    base, tone = m.group(1), int(m.group(2))
    base = base.replace('u:', 'ü').replace('U:', 'Ü').replace('v', 'ü')
    if tone == 5:
        return base
    low = base.lower()
    idx = None
    if 'a' in low:
        idx = low.index('a')
    elif 'e' in low:
        idx = low.index('e')
    elif 'ou' in low:
        idx = low.index('o')
    else:
        for i in range(len(low) - 1, -1, -1):
            if low[i] in 'aeiouü':
                idx = i
                break
    if idx is None:
        return base
    ch = low[idx]
    marked = TONE_MARKS[ch][tone - 1]
    if base[idx].isupper():
        marked = marked.upper()
    return base[:idx] + marked + base[idx + 1:]


def pinyin_marked(raw):
    return ' '.join(numeric_to_marked(s) for s in raw.split(' '))


def parse_cedict(path):
    entries = []
    line_re = re.compile(r'^(\S+) (\S+) \[([^\]]*)\] /(.*)/\s*$')
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#'):
                continue
            m = line_re.match(line)
            if not m:
                continue
            trad, simp, py, defs = m.groups()
            entries.append((trad, simp, py, [d for d in defs.split('/') if d]))
    return entries


def is_skippable(glosses):
    if not glosses:
        return True
    first = glosses[0].lower()
    if first.startswith(('surname ', 'variant of', 'old variant', 'japanese variant', 'erhua variant',
                         'also written', 'see ', 'used in ', 'abbr. for')):
        return all(g.lower().startswith(('see ', 'variant of', 'old variant', 'surname', 'cl:')) for g in glosses)
    return False


def clean_glosses(glosses):
    out = []
    for g in glosses:
        if g.startswith('CL:'):
            continue
        g = re.sub(r'\s+', ' ', g).strip()
        if len(g) > 70:
            g = g[:67].rstrip() + '…'
        out.append(g)
        if len(out) == MAX_GLOSSES:
            break
    return out


def load_frequency(path):
    """char -> (rang de fréquence, niveau HSK ou 0)"""
    out = {}
    with open(path, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            ch = row.get('charcter') or row.get('character')
            if not ch:
                continue
            out[ch] = (int(row['frequency_rank']), int(row['hsk_level'] or 0))
    return out


def main(cedict_path, mmh_path, out_dir, freq_path=None):
    os.makedirs(out_dir, exist_ok=True)

    # ---- caractères (Make Me a Hanzi) ----
    hanzi = {}
    rad_count = collections.Counter()
    with open(mmh_path, encoding='utf-8') as f:
        for line in f:
            r = json.loads(line)
            ch = r['character']
            ety = r.get('etymology') or {}
            decomp = r.get('decomposition', '')
            # '？' marque une décomposition incomplète dans la source : on l'ignore plutôt
            # que d'afficher des composants partiels trompeurs (ex. 水 -> 亅)
            comps = [] if ('？' in decomp or '?' in decomp) else [c for c in IDS_RE.sub('', decomp) if c.strip()]
            rec = {}
            if r.get('pinyin'):
                rec['p'] = ' / '.join(dict.fromkeys(r['pinyin']))
            if r.get('definition'):
                rec['d'] = r['definition']
            if r.get('radical'):
                rec['r'] = r['radical']
                rad_count[r['radical']] += 1
            etype = ety.get('type')
            if etype:
                rec['t'] = {'pictophonetic': 'p', 'ideographic': 'i', 'pictographic': 'g'}.get(etype, '')
            if ety.get('phonetic'):
                rec['ph'] = ety['phonetic']
            if ety.get('semantic'):
                rec['se'] = ety['semantic']
            if ety.get('hint'):
                rec['h'] = ety['hint']
            if comps:
                rec['c'] = comps
            hanzi[ch] = rec

    if freq_path:
        for ch, (rank, hsk) in load_frequency(freq_path).items():
            if ch in hanzi:
                hanzi[ch]['f'] = rank
                if hsk:
                    hanzi[ch]['l'] = hsk

    radicals = []
    for r, n in rad_count.most_common():
        info = hanzi.get(r, {})
        radicals.append({'r': r, 'n': n, 'p': info.get('p', ''), 'd': info.get('d', '')})

    # ---- mots (CC-CEDICT) ----
    entries = parse_cedict(cedict_path)
    char_freq = collections.Counter()
    for _trad, simp, _py, _d in entries:
        if len(simp) <= MAX_WORD_LEN:
            for c in set(simp):
                if c in hanzi:
                    char_freq[c] += 1
    top = {c for c, _ in char_freq.most_common(TOP_CHARS)}

    words = []
    seen_readings = collections.Counter()
    for trad, simp, py, glosses in entries:
        if len(simp) > MAX_WORD_LEN or is_skippable(glosses):
            continue
        if not all(c in top for c in simp):
            continue
        if seen_readings[simp] >= MAX_READINGS_PER_WORD:
            continue
        gl = clean_glosses(glosses)
        if not gl:
            continue
        seen_readings[simp] += 1
        words.append([simp, trad if trad != simp else '', pinyin_marked(py), '; '.join(gl)])

    def dump(name, obj):
        p = os.path.join(out_dir, name)
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        print(f'{name}: {os.path.getsize(p) / 1024:.0f} KB')

    dump('hanzi.json', hanzi)
    dump('radicals.json', radicals)
    dump('words.json', words)
    print(f'{len(hanzi)} caractères, {len(radicals)} radicaux, {len(words)} mots')


if __name__ == '__main__':
    if len(sys.argv) not in (4, 5):
        sys.exit(__doc__)
    main(*sys.argv[1:])
