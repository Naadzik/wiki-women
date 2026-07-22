import re, json

MD = "/root/.claude/uploads/7a0d0019-4b27-5b39-ad51-ca792218b76e/40029433-wikiwomen_21_july_2026.md"
raw = open(MD, encoding='utf-8').read()
text = re.sub(r'\\(.)', r'\1', raw)
lines = text.split('\n')

def find_line(marker):
    for i, l in enumerate(lines):
        if marker in l:
            return i
    return None

un_start = find_line('== Państwa wg. ISO 3166-1 alfa-3 ==')
unrecognized_start = find_line('Częściowo rozpoznane państwa')
wyroznienia_start = find_line('== Wyróżnienia ==')

LINK_RE = re.compile(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]')
ICON_RE = re.compile(r'\{\{Ikona\|(cw|da|anm)\|[^}]*?(?:link\s*=\s*([^|}]+))?\}\}')
CW_DATE_RE = re.compile(r'ekspozycje/(\d{4}-\d{2}-\d{2})')

ACTION_MAP = {
    ('Akcje edycyjne', ':1'): 'tygodnietematyczne',
    ('Akcje edycyjne', 'CEE 2020'): 'cee2020',
    ('Akcje edycyjne', 'CEE 2024'): 'cee2024',
    ('Akcje edycyjne', 'CEE 2025'): 'cee2025',
    ('Akcje edycyjne', 'CEE 2026'): 'cee2026',
    ('Akcje edycyjne', ':0'): 'noblistki',
    ('Akcje edycyjne', 'Nieznane 2025'): 'nieznanekobiety2025',
    ('Akcje edycyjne', ':3'): 'nieznanekobiety2026',
    ('Akcje edycyjne', ':2'): 'wikilovespride2025',
}
REF_TAG_RE = re.compile(r'<ref\s+([^>]*?)/?>')
ATTR_RE = re.compile(r'(\w+)="([^"]*)"')
FIRST_WOMAN_REF = ('Uwagi', ':14')

def parse_paragraph(para):
    m = LINK_RE.search(para)
    if not m:
        return None
    target, display = m.group(1), m.group(2)
    if target.startswith('Wikipedysta:Nadzik/'):
        title = (display or target.split('/', 1)[1]).strip()
        is_draft = True
    else:
        title, is_draft = target.strip(), False

    actions = []
    is_first_woman = False
    for rm in REF_TAG_RE.finditer(para):
        attrs = dict(ATTR_RE.findall(rm.group(1)))
        name, group = attrs.get('name'), attrs.get('group')
        if (group, name) == FIRST_WOMAN_REF:
            is_first_woman = True
        key = (group, name)
        if key in ACTION_MAP and ACTION_MAP[key] not in actions:
            actions.append(ACTION_MAP[key])

    awards = []
    for im in ICON_RE.finditer(para):
        atype, link = im.group(1), im.group(2)
        date = None
        if link:
            dm = CW_DATE_RE.search(link)
            if dm:
                date = dm.group(1)
        awards.append({'type': atype, 'date': date})

    return {
        'title': title, 'isDraft': is_draft,
        'editorialActions': actions, 'isFirstWoman': is_first_woman,
        'awards': awards,
    }

def parse_table(start_line, end_line, name_pattern):
    block = lines[start_line:end_line]
    rows, current = [], []
    for l in block:
        if l.strip() == '|-':
            if current: rows.append(current)
            current = []
        else:
            current.append(l)
    if current: rows.append(current)

    results = []
    for row in rows:
        if not row: continue
        name, name_idx = None, None
        for i, l in enumerate(row):
            m = name_pattern.search(l)
            if m:
                name, name_idx = m.group(1).strip(), i
                break
        if name is None: continue

        bio_lines = []
        for l in row[name_idx+1:]:
            if l.lstrip().startswith('!'): break
            bio_lines.append(l)
        bio_text = re.sub(r'^\s*\|', '', '\n'.join(bio_lines))
        paragraphs = [p for p in re.split(r'\n\s*\n', bio_text) if p.strip()]
        articles = [a for a in (parse_paragraph(p) for p in paragraphs) if a]
        results.append((name, articles))
    return results

un_name_re = re.compile(r"\{\{państwo\|([^}]+)\}\}")
unrec_name_re = re.compile(r"^\|\[\[([^\]|]+)\]\]\s*$")

un_countries = parse_table(un_start, unrecognized_start, un_name_re)
unrecognized = parse_table(unrecognized_start, wyroznienia_start, unrec_name_re)

NON_UN_ISO = {'Hongkong','Makau','Palestyna','Tajwan','Watykan','Antarktyka'}
countries = [c for c in un_countries if c[0] not in NON_UN_ISO]
unrecognized_full = unrecognized + [c for c in un_countries if c[0] in NON_UN_ISO]

json.dump({
    'countries': [{'name': n, 'articles': a} for n, a in countries],
    'unrecognized': [{'name': n, 'articles': a} for n, a in unrecognized_full],
}, open('/tmp/claude-0/-home-user-wiki-women/7a0d0019-4b27-5b39-ad51-ca792218b76e/scratchpad/md_full.json', 'w'), ensure_ascii=False, indent=2)
print("saved md_full.json")

# Sanity checks against known cases
for name, arts in countries + unrecognized_full:
    for a in arts:
        if a['title'] == 'Brunilda Mersini':
            print('Brunilda Mersini:', a)
        if a['title'] == 'Anahita Ratebzad':
            print('Anahita Ratebzad:', a)
        if a['title'] == 'Zaruhi Postandżjan':
            print('Zaruhi Postandżjan:', a)
