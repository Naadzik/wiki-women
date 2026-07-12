#!/usr/bin/env python3
"""Fill missing `created` dates in data/wikiwomen.json from the Quarry export.

Only fills entries whose `created` is currently null. Never overwrites an
existing date (all existing dates were verified identical to the wiki).
Leaves the 7 uncertain names untouched for manual reconciliation.

Sources of a fill, in order:
  1. exact title match (main namespace) in the Quarry CSV
  2. diacritics-normalized title match
  3. draft (user-namespace) match via draftPath
  4. hardcoded transliteration matches (articles moved to a Polish spelling)

Run: python3 scripts/apply-created-dates.py <quarry.csv>
"""
import csv, sys, json, unicodedata, re

CSV = sys.argv[1]
DATA = 'data/wikiwomen.json'

# Verified transliteration matches (your data's title -> current wiki title).
# These were moved/re-transliterated by other editors; date comes from the
# moved article. Hardcoded so the update is explicit and reviewable.
TRANSLIT = {
    'Reema bint Bandar Al Saud':  'Rima bint Bandar Al Su’ud',
    'Zaruhi Postandżjan':         'Zaruhi Postandżian',
    'Sahiba Gafarowa':            'Sahibə Qafarova',
    'Taira Tairowa':              'Tahirə Tahirova',
    'Marina Waśko':               'Maryna Waśko',
    'Gordana Djurović':           'Gordana Đurović',
    'Jihan al-Mosli':             'Dżihan al-Musli',
    'Eleni Skoura':               'Eleni Skura',
    'Shanaz Ibrahim Ahmed':       'Szanaz Ibrahim Ahmad',
    'Leila Sharaf':               'Lajla Szaraf',
    'Olga Perepechina':           'Olga Pieriepieczina',
    'Najla El Mangoush':          'Nadżla al-Mangusz',
    'Monika Zajkova':             'Monika Zajkowa',
    'Tatyana Zalevskaya':         'Tatjana Zalewska',
    'Sükhbaataryn Yanjmaa':       'Süchbaataryn Jandżmaa',
    'Nizoramoh Zarifowa':         'Nizoramo Zaripowa',
    'Samiha Khalil':              'Samiha Chalil',
}

# Manually confirmed dates (looked up by the maintainer). Some articles were
# moved to a Polish transliteration; the date is the original creation date.
MANUAL = {
    'Nancy Pelosi':                 '2019-11-22',
    'Jeanine Áñez':                 '2019-11-19',
    'Rawya Ateya':                  '2025-10-08',  # now: Rawija Atijja
    'Lateefa Al Gaood':             '2025-10-13',  # now: Latifa al-Ka’ud
    'Hind Abdul Rahman al-Muftah':  '2025-08-23',  # now: Hind al-Muftah
    'Blaise Metreweli':             '2025-06-20',
    # 'Aleksandra Kot' intentionally left null — the Skoczilenko match was a
    # false positive (confirmed a different person); date still unknown.
}

def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = s.translate(str.maketrans('łŁøØđĐħĦ', 'llooddhh'))
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()

rows = list(csv.DictReader(open(CSV, encoding='utf-8')))
ns0 = {r['title']: r for r in rows if r['page_namespace'] == '0'}
ns2 = {r['title']: r for r in rows if r['page_namespace'] == '2'}
ns0_norm = {}
for t, r in ns0.items():
    ns0_norm.setdefault(norm(t), r)

def date_for(title, is_draft, draft_key):
    """Return (date, method) or (None, None)."""
    if is_draft and draft_key and draft_key in ns2:
        return ns2[draft_key]['created'][:10], 'draft'
    if title in ns0:
        return ns0[title]['created'][:10], 'exact'
    nk = norm(title)
    if nk in ns0_norm:
        return ns0_norm[nk]['created'][:10], 'normalized'
    if title in TRANSLIT:
        moved = TRANSLIT[title]
        if moved in ns0:
            return ns0[moved]['created'][:10], 'translit'
    return None, None

data = json.loads(open(DATA, encoding='utf-8').read())

# Resolve a date per unique title once.
resolved = {}   # title -> (date, method)
for c in data['countries'] + data['unrecognized']:
    for a in c['articles']:
        if a['title'] in resolved: continue
        if a.get('created') is not None: continue  # never overwrite
        if a['title'] in MANUAL:
            resolved[a['title']] = (MANUAL[a['title']], 'manual')
            continue
        dk = (a['draftPath'].split(':', 1)[1] if a.get('draftPath') and ':' in a['draftPath'] else a.get('draftPath'))
        d, method = date_for(a['title'], bool(a.get('isDraft')), dk)
        if d:
            resolved[a['title']] = (d, method)

# Apply to every occurrence (titles repeat across countries).
occurrences = 0
by_method = {}
for c in data['countries'] + data['unrecognized']:
    for a in c['articles']:
        if a.get('created') is None and a['title'] in resolved:
            d, method = resolved[a['title']]
            a['created'] = d
            occurrences += 1
            by_method[method] = by_method.get(method, 0) + 1

# Remaining nulls (unique) for reporting.
remaining = sorted({a['title'] for c in data['countries'] + data['unrecognized']
                    for a in c['articles'] if a.get('created') is None})

out = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
open(DATA, 'w', encoding='utf-8').write(out)

print(f"unique titles filled: {len(resolved)}  (by method: {by_method})")
print(f"article occurrences updated: {occurrences}")
print(f"remaining null titles: {len(remaining)}")
for t in remaining:
    print(f"   still null: {t}")
