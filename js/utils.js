// utils.js — shared helpers and constants used across modules

/** The "365 in 365 days" project kick-off date. */
export const PROJECT_START = '2025-03-21';

/** True when dark mode is active. */
export function isDark() {
  return document.documentElement.classList.contains('dark');
}

/**
 * Deduplicate an article list by title (the same article can appear under
 * several countries). Keeps first occurrence.
 */
export function uniqueByTitle(articles) {
  const seen = new Set();
  return articles.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
}

/** Count awards by type across a list of articles → { cw, da, anm }. */
export function countAwardTypes(articles) {
  let cw = 0, da = 0, anm = 0;
  for (const article of articles) {
    for (const award of article.awards) {
      if (award.type === 'cw') cw++;
      else if (award.type === 'da') da++;
      else if (award.type === 'anm') anm++;
    }
  }
  return { cw, da, anm };
}

/**
 * Count unique articles that are a "first woman in role" in ANY of their
 * countries. Pass the flat (pre-dedup) article list: the same article can be
 * flagged in one country and not another (e.g. listed under two countries but
 * first-in-role in only one), and first-occurrence dedup would miscount it.
 */
export function countFirstWomen(articles) {
  const titles = new Set();
  for (const a of articles) if (a.isFirstWoman) titles.add(a.title);
  return titles.size;
}

/** Set an element's textContent by id, ignoring missing elements. */
export function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
