#!/usr/bin/env node
// fetch-created-dates.mjs
// Queries the Polish Wikipedia API for the TRUE creation timestamp (first
// revision) of every article in data/wikiwomen.json and reports how those
// compare to the `created` values already in the data.
//
// It does NOT modify wikiwomen.json — it writes a report to
// scripts/created-dates-report.json and prints a summary.
//
// Run from the repo root, in an environment with outbound network access:
//   node scripts/fetch-created-dates.mjs
//
// Notes:
// - Wikimedia requires a descriptive User-Agent; set one below.
// - If you run this behind an HTTPS proxy on Node >= 22.21, launch with
//   NODE_USE_ENV_PROXY=1 so Node honours HTTPS_PROXY.

import { readFile, writeFile } from 'node:fs/promises';

const API = 'https://pl.wikipedia.org/w/api.php';
const USER_AGENT = 'wiki-women-created-dates/1.0 (https://github.com/Naadzik/wiki-women; contact: User:Nadzik)';
const CONCURRENCY = 6;          // polite parallelism
const RETRIES = 3;

const dataPath = new URL('../data/wikiwomen.json', import.meta.url);
const data = JSON.parse(await readFile(dataPath, 'utf8'));

// Collect unique articles (same title can appear under several countries).
const byTitle = new Map();
for (const c of [...data.countries, ...data.unrecognized]) {
  for (const a of c.articles) {
    if (byTitle.has(a.title)) continue;
    byTitle.set(a.title, {
      title: a.title,
      isDraft: !!a.isDraft,
      // Drafts live in user space; query the draft path if present.
      queryTitle: a.isDraft && a.draftPath ? a.draftPath : a.title,
      currentCreated: a.created ?? null,
    });
  }
}
const articles = [...byTitle.values()];
console.error(`Querying ${articles.length} unique articles from pl.wikipedia…`);

async function firstRevision(queryTitle) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2',
    prop: 'revisions', titles: queryTitle,
    rvlimit: '1', rvdir: 'newer', rvprop: 'timestamp|user',
    redirects: '1',
  });
  const url = `${API}?${params}`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const page = json?.query?.pages?.[0];
      if (!page || page.missing) return { status: 'missing' };
      const rev = page.revisions?.[0];
      if (!rev?.timestamp) return { status: 'no-revision' };
      return { status: 'ok', timestamp: rev.timestamp, date: rev.timestamp.slice(0, 10), user: rev.user, resolvedTitle: page.title };
    } catch (err) {
      if (attempt === RETRIES) return { status: 'error', error: String(err.message || err) };
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
}

// Simple concurrency pool.
const results = [];
let idx = 0;
async function worker() {
  while (idx < articles.length) {
    const i = idx++;
    const a = articles[i];
    const rev = await firstRevision(a.queryTitle);
    results[i] = { ...a, wiki: rev };
    if ((i + 1) % 25 === 0) console.error(`  …${i + 1}/${articles.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Classify.
let match = 0, differ = 0, resolved = 0, stillMissing = 0, errored = 0;
const diffs = [];
for (const r of results) {
  const wikiDate = r.wiki.status === 'ok' ? r.wiki.date : null;
  if (r.wiki.status !== 'ok') {
    if (r.wiki.status === 'error') errored++; else stillMissing++;
    continue;
  }
  if (r.currentCreated == null) { resolved++; diffs.push({ ...r, kind: 'resolved-null', wikiDate }); }
  else if (r.currentCreated === wikiDate) match++;
  else { differ++; diffs.push({ ...r, kind: 'changed', wikiDate }); }
}

const report = {
  generatedAt: new Date().toISOString(),
  totalArticles: articles.length,
  summary: { match, differ, resolvedFromNull: resolved, stillMissingOnWiki: stillMissing, errored },
  differences: diffs.map(d => ({
    title: d.title,
    isDraft: d.isDraft,
    currentCreated: d.currentCreated,
    wikiCreated: d.wikiDate,
    wikiTimestamp: d.wiki.timestamp ?? null,
    firstAuthor: d.wiki.user ?? null,
    kind: d.kind,
  })),
};

const outPath = new URL('./created-dates-report.json', import.meta.url);
await writeFile(outPath, JSON.stringify(report, null, 2));

console.error('\n=== SUMMARY ===');
console.error(`match (already correct):     ${match}`);
console.error(`differ (date would change):  ${differ}`);
console.error(`resolved (was null):         ${resolved}`);
console.error(`still missing on wiki:       ${stillMissing}`);
console.error(`errored:                     ${errored}`);
console.error(`\nFull report written to scripts/created-dates-report.json`);
