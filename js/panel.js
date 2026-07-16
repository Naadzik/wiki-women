// panel.js — country side panel
import { findCountry, findCountryRaw, onCountryClick, onAwardDateClick } from './app.js?v=16';
import { t, getLang } from './i18n.js?v=16';

const WIKI_BASE = 'https://pl.wikipedia.org/wiki/';

// ── ISO3 → ISO2 for flag emojis ───────────────────────────────────────────────
const ISO3_TO_ISO2 = {
  'AFG':'AF','ALB':'AL','DZA':'DZ','AND':'AD','AGO':'AO','ATG':'AG',
  'SAU':'SA','ARG':'AR','ARM':'AM','AUS':'AU','AUT':'AT','AZE':'AZ',
  'BHS':'BS','BHR':'BH','BGD':'BD','BRB':'BB','BEL':'BE','BLZ':'BZ',
  'BEN':'BJ','BTN':'BT','BLR':'BY','BOL':'BO','BIH':'BA','BWA':'BW',
  'BRA':'BR','BRN':'BN','BGR':'BG','BFA':'BF','BDI':'BI',
  'CHL':'CL','CHN':'CN','HRV':'HR','CYP':'CY','TCD':'TD','MNE':'ME',
  'CZE':'CZ','DNK':'DK','COD':'CD','DMA':'DM','DOM':'DO','DJI':'DJ',
  'EGY':'EG','ECU':'EC','ERI':'ER','EST':'EE','ETH':'ET',
  'FJI':'FJ','PHL':'PH','FIN':'FI','FRA':'FR',
  'GAB':'GA','GMB':'GM','GHA':'GH','GRC':'GR','GRD':'GD','GEO':'GE',
  'GUY':'GY','GTM':'GT','GIN':'GN','GNB':'GW','GNQ':'GQ',
  'HTI':'HT','ESP':'ES','NLD':'NL','HND':'HN',
  'IND':'IN','IDN':'ID','IRQ':'IQ','IRN':'IR','IRL':'IE','ISL':'IS','ISR':'IL',
  'JAM':'JM','JPN':'JP','YEM':'YE','JOR':'JO',
  'KHM':'KH','CMR':'CM','CAN':'CA','QAT':'QA','KAZ':'KZ','KEN':'KE',
  'KIR':'KI','COL':'CO','COM':'KM','COG':'CG','KOR':'KR','PRK':'KP',
  'CRI':'CR','CUB':'CU','KWT':'KW','KGZ':'KG',
  'LAO':'LA','LSO':'LS','LBN':'LB','LBR':'LR','LBY':'LY','LIE':'LI',
  'LTU':'LT','LUX':'LU','LVA':'LV',
  'MKD':'MK','MDG':'MG','MWI':'MW','MDV':'MV','MYS':'MY','MLI':'ML',
  'MLT':'MT','MAR':'MA','MRT':'MR','MUS':'MU','MEX':'MX','FSM':'FM',
  'MMR':'MM','MDA':'MD','MCO':'MC','MNG':'MN','MOZ':'MZ',
  'NAM':'NA','NRU':'NR','NPL':'NP','DEU':'DE','NER':'NE','NGA':'NG',
  'NIC':'NI','NOR':'NO','NZL':'NZ',
  'OMN':'OM',
  'PAK':'PK','PLW':'PW','PAN':'PA','PNG':'PG','PRY':'PY','PER':'PE',
  'POL':'PL','PRT':'PT',
  'ZAF':'ZA','CAF':'CF','CPV':'CV','RUS':'RU','ROU':'RO','RWA':'RW',
  'KNA':'KN','LCA':'LC','VCT':'VC','SLV':'SV','WSM':'WS','SMR':'SM',
  'SEN':'SN','SRB':'RS','SYC':'SC','SLE':'SL','SGP':'SG','SVK':'SK',
  'SVN':'SI','SOM':'SO','LKA':'LK','USA':'US','SDN':'SD','SSD':'SS',
  'SUR':'SR','SWZ':'SZ','SYR':'SY','CHE':'CH','SWE':'SE',
  'TJK':'TJ','THA':'TH','TZA':'TZ','TLS':'TL','TGO':'TG','TON':'TO',
  'TTO':'TT','TUN':'TN','TUR':'TR','TKM':'TM','TUV':'TV',
  'UGA':'UG','UKR':'UA','URY':'UY','UZB':'UZ',
  'VUT':'VU','VEN':'VE','HUN':'HU','GBR':'GB','VNM':'VN','ITA':'IT',
  'CIV':'CI','MHL':'MH','SLB':'SB','STP':'ST','ZMB':'ZM','ZWE':'ZW',
  'ARE':'AE','ATA':'AQ','HKG':'HK','MAC':'MO','PSE':'PS','TWN':'TW',
  'VAT':'VA','XKX':'XK','ESH':'EH',
};

function getFlag(iso3) {
  if (!iso3) return '';
  const iso2 = ISO3_TO_ISO2[iso3];
  if (!iso2) return '';
  return [...iso2].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
let _content, _countryName, _awardSummary, _articlesList,
    _unrecognizedNote, _unrecognizedList;

let _sortBy = 'articles'; // 'articles' | 'cw'

export function init() {
  _content           = document.getElementById('panel-content');
  _countryName       = document.getElementById('panel-country-name');
  _awardSummary      = document.getElementById('panel-award-summary');
  _articlesList      = document.getElementById('panel-articles-list');
  _unrecognizedNote  = document.getElementById('panel-unrecognized-note');
  _unrecognizedList  = document.getElementById('panel-unrecognized-list');
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Show panel for a country key (iso3 or namePolish) against filtered data. */
export function show(countryKey, filteredData) {
  if (!countryKey) { hide(); return; }

  const country = findCountry(filteredData, countryKey);
  const rawCountry = findCountryRaw(countryKey);
  const displayCountry = country || rawCountry;
  if (!displayCountry) { hide(); return; }

  _content.hidden = false;

  const name = getLang() === 'pl' ? displayCountry.namePolish : displayCountry.nameEnglish;
  _countryName.textContent = name;

  // Award summary badges (from filtered articles, or zero if no match)
  renderAwardSummary(country ? country.articles : []);

  // Article list (filtered)
  renderArticleList(country ? country.articles : [], false);

  // Unrecognized territories linked to this country (not applicable here;
  // shown only in showSpecialList)
  _unrecognizedNote.hidden = true;
}

/** Called on filter change — re-renders current panel if open. */
export function update(selectedCountry, filteredData) {
  if (!selectedCountry || _content.hidden) return;
  show(selectedCountry, filteredData);
}

/** Hide the panel. */
export function hide() {
  _content.hidden = true;
}

/** Show ranked list of all countries sorted by article count. */
export function showCountriesList(filteredData, titleOverride = null) {
  _content.hidden = false;
  _countryName.textContent = titleOverride ?? t('panel.countriesTitle');
  _unrecognizedNote.hidden = true;
  _articlesList.innerHTML = '';

  // Sort controls
  _awardSummary.innerHTML = '';
  const sortBar = document.createElement('div');
  sortBar.className = 'sort-bar';

  const btnArticles = document.createElement('button');
  btnArticles.className = 'sort-btn' + (_sortBy === 'articles' ? ' active' : '');
  btnArticles.textContent = t('panel.sortByArticles');
  btnArticles.addEventListener('click', () => {
    _sortBy = 'articles';
    showCountriesList(filteredData, titleOverride);
  });

  const btnCw = document.createElement('button');
  btnCw.className = 'sort-btn' + (_sortBy === 'cw' ? ' active' : '');
  btnCw.textContent = t('panel.sortByCw');
  btnCw.addEventListener('click', () => {
    _sortBy = 'cw';
    showCountriesList(filteredData, titleOverride);
  });

  sortBar.appendChild(btnArticles);
  sortBar.appendChild(btnCw);
  _awardSummary.appendChild(sortBar);

  const all = sortCountries([...filteredData.countries, ...filteredData.unrecognized], _sortBy);
  for (const country of all) {
    _articlesList.appendChild(buildCountryRow(country));
  }
}

/** Show the special "all additional + unrecognized territories" list. */
export function showSpecialList(rawData) {
  _content.hidden = false;
  _countryName.textContent = t('panel.unrecognizedTitle');
  _awardSummary.innerHTML = '';

  const all = rawData.unrecognized;

  _articlesList.innerHTML = '';
  for (const country of all) {
    const heading = document.createElement('h3');
    heading.className = 'panel-section-heading';
    heading.textContent = getLang() === 'pl' ? country.namePolish : country.nameEnglish;
    _articlesList.appendChild(heading);
    renderArticleList(country.articles, false, _articlesList);
  }

  _unrecognizedNote.hidden = true;
}

// ── Renderers ─────────────────────────────────────────────────────────────────

function renderAwardSummary(articles) {
  const cw  = articles.flatMap(a => a.awards).filter(a => a.type === 'cw').length;
  const da  = articles.flatMap(a => a.awards).filter(a => a.type === 'da').length;
  const anm = articles.flatMap(a => a.awards).filter(a => a.type === 'anm').length;

  const parts = [];
  if (cw)  parts.push(`<span class="badge-cw">${t('awards.cw')} ×${cw}</span>`);
  if (da)  parts.push(`<span class="badge-da">${t('awards.da')} ×${da}</span>`);
  if (anm) parts.push(`<span class="badge-anm">${t('awards.anm')} ×${anm}</span>`);

  const count = articles.length;
  const countLabel = count === 1 ? t('panel.article') : t('panel.articles');
  const countSpan = `<span class="panel-article-count">${count} ${countLabel}</span>`;

  _awardSummary.innerHTML = countSpan + (parts.length ? ' ' + parts.join(' ') : '');
}

function renderArticleList(articles, _unused, container) {
  const target = container || _articlesList;
  if (!container) target.innerHTML = '';

  if (articles.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = '–';
    target.appendChild(empty);
    return;
  }

  for (const article of articles) {
    target.appendChild(buildArticleItem(article));
  }
}

function buildArticleItem(article) {
  const item = document.createElement('div');
  item.className = 'article-item';

  // Title row
  const titleRow = document.createElement('div');
  titleRow.className = 'article-title';

  const link = document.createElement('a');
  link.href = WIKI_BASE + encodeURIComponent(article.title.replace(/ /g, '_'));
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = article.title;
  titleRow.appendChild(link);

  // Draft label (inline with title)
  if (article.isDraft) {
    const draft = document.createElement('span');
    draft.className = 'draft-label';
    draft.textContent = t('panel.draft');
    titleRow.appendChild(draft);
  }

  item.appendChild(titleRow);

  // Meta row: badges + action tags
  const meta = document.createElement('div');
  meta.className = 'article-meta';

  for (const award of article.awards) {
    const badge = document.createElement('span');
    badge.className = `badge-${award.type}`;
    let label = t(`awards.${award.type}`);
    if (award.date) {
      label += ` ${formatDate(award.date)}`;
      badge.classList.add('badge-clickable');
      badge.title = award.date;
      badge.addEventListener('click', (e) => {
        e.preventDefault();
        onAwardDateClick(award.type, award.date);
      });
    }
    badge.textContent = label;
    meta.appendChild(badge);
  }

  for (const action of article.editorialActions) {
    const tag = document.createElement('span');
    tag.className = 'action-tag';
    tag.textContent = t(`actions.${action}`);
    meta.appendChild(tag);
  }

  if (meta.childElementCount > 0) item.appendChild(meta);

  // First-woman marker
  if (article.isFirstWoman) {
    const fw = document.createElement('div');
    fw.className = 'first-woman-marker';
    fw.textContent = t('panel.firstWoman');
    item.appendChild(fw);
  }

  return item;
}

/** Show list of all articles sharing an award date across all countries. */
export function showAwardDateList(awardType, date, entries) {
  _content.hidden = false;
  _countryName.textContent = `${t(`awards.${awardType}`)} ${formatDate(date)}`;
  _unrecognizedNote.hidden = true;
  _articlesList.innerHTML = '';

  // Group by article title so shared articles show all their countries
  const byTitle = new Map(); // title → { article, countries[] }
  for (const { article, country } of entries) {
    if (!byTitle.has(article.title)) {
      byTitle.set(article.title, { article, countries: [country] });
    } else {
      byTitle.get(article.title).countries.push(country);
    }
  }

  _awardSummary.innerHTML = `<span class="panel-article-count">${byTitle.size} ${byTitle.size === 1 ? t('panel.article') : t('panel.articles')}</span>`;

  for (const { article, countries } of byTitle.values()) {
    _articlesList.appendChild(buildAwardDateItem(article, countries));
  }
}

function buildAwardDateItem(article, countries) {
  const item = document.createElement('div');
  item.className = 'article-item';

  const titleRow = document.createElement('div');
  titleRow.className = 'article-title award-date-title';

  const link = document.createElement('a');
  link.href = WIKI_BASE + encodeURIComponent(article.title.replace(/ /g, '_'));
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = article.title;
  titleRow.appendChild(link);

  for (const country of countries) {
    const sep = document.createElement('span');
    sep.className = 'award-country-sep';
    sep.textContent = ' – ';
    titleRow.appendChild(sep);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'award-country-name';
    const name = getLang() === 'pl' ? country.namePolish : country.nameEnglish;
    const flag = getFlag(country.iso3);
    nameSpan.textContent = name + (flag ? ' ' + flag : '');
    titleRow.appendChild(nameSpan);
  }

  item.appendChild(titleRow);

  // Also show other awards on this article (for context)
  const meta = document.createElement('div');
  meta.className = 'article-meta';
  for (const aw of article.awards) {
    const badge = document.createElement('span');
    badge.className = `badge-${aw.type}`;
    let label = t(`awards.${aw.type}`);
    if (aw.date) label += ` ${formatDate(aw.date)}`;
    badge.textContent = label;
    meta.appendChild(badge);
  }
  if (article.isFirstWoman) {
    const fw = document.createElement('div');
    fw.className = 'first-woman-marker';
    fw.textContent = t('panel.firstWoman');
    item.appendChild(fw);
  }
  if (meta.childElementCount > 0) item.appendChild(meta);

  return item;
}

// ── Countries list helpers ────────────────────────────────────────────────────

function sortCountries(countries, sortBy = 'articles') {
  return [...countries].sort((a, b) => {
    const aCw = a.articles.flatMap(x => x.awards).filter(x => x.type === 'cw').length;
    const bCw = b.articles.flatMap(x => x.awards).filter(x => x.type === 'cw').length;

    if (sortBy === 'cw') {
      if (aCw !== bCw) return bCw - aCw;
      const diff = b.articles.length - a.articles.length;
      if (diff !== 0) return diff;
    } else {
      const diff = b.articles.length - a.articles.length;
      if (diff !== 0) return diff;
      if (aCw !== bCw) return bCw - aCw;
      const aOther = a.articles.flatMap(x => x.awards).filter(x => x.type !== 'cw').length;
      const bOther = b.articles.flatMap(x => x.awards).filter(x => x.type !== 'cw').length;
      if (aOther !== bOther) return bOther - aOther;
    }

    const aName = getLang() === 'pl' ? a.namePolish : a.nameEnglish;
    const bName = getLang() === 'pl' ? b.namePolish : b.nameEnglish;
    return aName.localeCompare(bName, getLang());
  });
}

function buildCountryRow(country) {
  const row = document.createElement('div');
  row.className = 'country-row';

  const name = getLang() === 'pl' ? country.namePolish : country.nameEnglish;
  const flag = getFlag(country.iso3);

  const nameEl = document.createElement('span');
  nameEl.className = 'country-row-name';
  nameEl.textContent = flag ? `${flag} ${name}` : name;

  const countEl = document.createElement('span');
  countEl.className = 'country-row-count';
  countEl.textContent = country.articles.length;

  row.appendChild(nameEl);
  row.appendChild(countEl);

  const cw  = country.articles.flatMap(a => a.awards).filter(a => a.type === 'cw').length;
  const da  = country.articles.flatMap(a => a.awards).filter(a => a.type === 'da').length;
  const anm = country.articles.flatMap(a => a.awards).filter(a => a.type === 'anm').length;

  if (cw || da || anm) {
    const badges = document.createElement('span');
    badges.className = 'country-row-badges';
    if (cw)  badges.appendChild(makeBadge('cw',  `×${cw}`));
    if (da)  badges.appendChild(makeBadge('da',  `×${da}`));
    if (anm) badges.appendChild(makeBadge('anm', `×${anm}`));
    row.appendChild(badges);
  }

  row.addEventListener('click', () => {
    onCountryClick(country.iso3 || country.namePolish);
  });

  return row;
}

function makeBadge(type, text) {
  const b = document.createElement('span');
  b.className = `badge-${type}`;
  b.textContent = text;
  return b;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  // dateStr: 'YYYY-MM-DD' → display as 'YYYY-MM-DD' (locale-agnostic, short)
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y) return dateStr;
  return `${y}-${m}-${d}`;
}
