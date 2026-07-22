import json, copy

DATA_PATH = '/home/user/wiki-women/data/wikiwomen.json'
SCRATCH = '/tmp/claude-0/-home-user-wiki-women/7a0d0019-4b27-5b39-ad51-ca792218b76e/scratchpad'

data = json.load(open(DATA_PATH, encoding='utf-8'))
mdf = json.load(open(f'{SCRATCH}/md_full.json', encoding='utf-8'))
diff = json.load(open(f'{SCRATCH}/diff.json', encoding='utf-8'))
resolved_dates = json.load(open(f'{SCRATCH}/resolved_dates.json', encoding='utf-8'))

md_by_country = {c['name']: {a['title']: a for a in c['articles']} for c in mdf['countries'] + mdf['unrecognized']}
by_name = {c['namePolish']: c for c in data['countries'] + data['unrecognized']}

# ---- 1. Fix: Maria Mambo Café missing her 'cw' award (caught by full validation) ----
fixed_awards = 0
for c in data['countries'] + data['unrecognized']:
    for a in c['articles']:
        if a['title'] == 'Maria Mambo Café':
            has_cw = any(w['type'] == 'cw' for w in a['awards'])
            if not has_cw:
                a['awards'].append({'type': 'cw', 'date': '2025-04-21'})
                fixed_awards += 1
print(f"Fixed missing CW award instances: {fixed_awards}")

# ---- 2. Add the 61 new articles (65 country,article pairs) ----
added = 0
for country_name, title, is_draft in diff['new_pairs']:
    country = by_name[country_name]
    md_article = md_by_country[country_name][title]
    created = resolved_dates.get(title)
    if created is None:
        raise SystemExit(f"UNRESOLVED DATE for {title!r} — aborting, should not happen")
    article = {
        'title': title,
        'isDraft': md_article['isDraft'],
        'draftPath': None,  # none of the 61 new titles are drafts (verified earlier)
        'awards': md_article['awards'],
        'editorialActions': md_article['editorialActions'],
        'isFirstWoman': md_article['isFirstWoman'],
        'created': created,
    }
    country['articles'].append(article)
    added += 1
print(f"Added (country,article) entries: {added}")

# ---- 3. Regenerate cwTimeline and createdTimeline from the COMPLETE final data ----
# (charts read these arrays directly — they are not recomputed live by the app)
all_countries = data['countries'] + data['unrecognized']
seen_titles = set()
unique_articles = []
for c in all_countries:
    for a in c['articles']:
        if a['title'] in seen_titles:
            continue
        seen_titles.add(a['title'])
        unique_articles.append(a)

created_dated = sorted([a['created'] for a in unique_articles if a['created']])
created_timeline = [{'date': d, 'cumulative': i + 1} for i, d in enumerate(created_dated)]

cw_dates = sorted([
    w['date'] for a in unique_articles for w in a['awards']
    if w['type'] == 'cw' and w['date']
])
cw_timeline = [{'date': d, 'cumulative': i + 1} for i, d in enumerate(cw_dates)]

print(f"createdTimeline: {len(data['createdTimeline'])} -> {len(created_timeline)}")
print(f"cwTimeline: {len(data['cwTimeline'])} -> {len(cw_timeline)}")
data['createdTimeline'] = created_timeline
data['cwTimeline'] = cw_timeline

# ---- 4. Update meta counts ----
total_articles = len(unique_articles)
total_drafts = sum(1 for a in unique_articles if a['isDraft'])
total_cw = sum(1 for a in unique_articles if any(w['type'] == 'cw' for w in a['awards']))
total_da = sum(1 for a in unique_articles if any(w['type'] == 'da' for w in a['awards']))
total_anm = sum(1 for a in unique_articles if any(w['type'] == 'anm' for w in a['awards']))

print(f"\nmeta before: {data['meta']}")
data['meta']['totalArticles'] = total_articles
data['meta']['totalPublished'] = total_articles - total_drafts
data['meta']['totalCw'] = total_cw
data['meta']['totalDa'] = total_da
data['meta']['totalAnm'] = total_anm
data['meta']['generatedAt'] = '2026-07-22T12:38:26.000Z'
print(f"meta after:  {data['meta']}")

out = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
open(DATA_PATH, 'w', encoding='utf-8').write(out)
print("\nwrote", DATA_PATH)
