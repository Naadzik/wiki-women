// stats.js — stats bar numbers
export function init() {
  // Nothing to set up — DOM elements already exist in HTML
}

export function update(filteredData, meta) {
  const allCountries = [...filteredData.countries, ...filteredData.unrecognized];
  const allArticles  = allCountries.flatMap(c => c.articles);

  // Deduplicate by title — the same article may appear in multiple countries
  const seen = new Set();
  const uniqueArticles = allArticles.filter(a => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });

  const totalArticles  = uniqueArticles.length;
  const totalCountries = filteredData.countries.length;  // UN members only
  const totalCw  = uniqueArticles.flatMap(a => a.awards).filter(a => a.type === 'cw').length;
  const totalDa  = uniqueArticles.flatMap(a => a.awards).filter(a => a.type === 'da').length;
  const totalAnm = uniqueArticles.flatMap(a => a.awards).filter(a => a.type === 'anm').length;
  const totalFirstWomen = uniqueArticles.filter(a => a.isFirstWoman).length;

  // UN coverage: how many UN members have ≥1 article vs total UN members in raw data
  const unTotal = meta?.unMembersTotal ?? 193;
  const coveragePct = Math.round((totalCountries / unTotal) * 100);

  setText('stat-articles', totalArticles);
  setText('stat-countries', totalCountries);
  setText('stat-coverage', `${coveragePct}%`);
  setText('stat-cw',  totalCw);
  setText('stat-da',  totalDa);
  setText('stat-anm', totalAnm);
  setText('stat-firstwomen', totalFirstWomen);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
