// stats.js — stats bar numbers
import { uniqueByTitle, countAwardTypes, countFirstWomen, setText } from './utils.js?v=18';

export function init() {
  // Nothing to set up — DOM elements already exist in HTML
}

export function update(filteredData, meta) {
  const allCountries = [...filteredData.countries, ...filteredData.unrecognized];
  const flatArticles = allCountries.flatMap(c => c.articles);

  // Deduplicate by title — the same article may appear in multiple countries
  const uniqueArticles = uniqueByTitle(flatArticles);

  const totalCountries = filteredData.countries.length;  // UN members only
  const { cw, da, anm } = countAwardTypes(uniqueArticles);
  // Counted on the flat list: the flag is country-relative (see utils.js)
  const totalFirstWomen = countFirstWomen(flatArticles);

  // UN coverage: how many UN members have ≥1 article vs total UN members
  const unTotal = meta?.unMembersTotal ?? 193;
  const coveragePct = Math.round((totalCountries / unTotal) * 100);

  setText('stat-articles', uniqueArticles.length);
  setText('stat-countries', totalCountries);
  setText('stat-coverage', `${coveragePct}%`);
  setText('stat-cw',  cw);
  setText('stat-da',  da);
  setText('stat-anm', anm);
  setText('stat-firstwomen', totalFirstWomen);
}
