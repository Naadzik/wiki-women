// panel.js — country side panel
import { findCountry, findCountryRaw, onCountryClick, onAwardDateClick } from './app.js?v=18';
import { t, tPlural, getLang } from './i18n.js?v=18';
import { countAwardTypes } from './utils.js?v=18';

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
  renderArticleList(country ? country.articles : []);

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
    renderArticleList(country.articles, _articlesList);
  }

  _unrecognizedNote.hidden = true;
}

// ── Renderers ─────────────────────────────────────────────────────────────────

function renderAwardSummary(articles) {
  const { cw, da, anm } = countAwardTypes(articles);

  const parts = [];
  if (cw)  parts.push(`<span class="badge-cw">${t('awards.cw')} ×${cw}</span>`);
  if (da)  parts.push(`<span class="badge-da">${t('awards.da')} ×${da}</span>`);
  if (anm) parts.push(`<span class="badge-anm">${t('awards.anm')} ×${anm}</span>`);

  const count = articles.length;
  const countSpan = `<span class="panel-article-count">${count} ${tPlural('count.article', count)}</span>`;

  _awardSummary.innerHTML = countSpan + (parts.length ? ' ' + parts.join(' ') : '');
}

function renderArticleList(articles, container) {
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
  appendAwardBadges(meta, article, true);

  for (const action of article.editorialActions) {
    const tag = document.createElement('span');
    tag.className = 'action-tag';
    tag.textContent = t(`actions.${action}`);
    meta.appendChild(tag);
  }

  if (meta.childElementCount > 0) item.appendChild(meta);

  // First-woman marker
  if (article.isFirstWoman) item.appendChild(firstWomanMarker());

  return item;
}

/**
 * Append one badge per award to `container`. When `clickable`, a dated badge
 * navigates to the shared award-date view on click.
 */
function appendAwardBadges(container, article, clickable) {
  for (const award of article.awards) {
    const badge = document.createElement('span');
    badge.className = `badge-${award.type}`;
    let label = t(`awards.${award.type}`);
    if (award.date) {
      label += ` ${award.date}`;
      if (clickable) {
        badge.classList.add('badge-clickable');
        badge.title = award.date;
        badge.addEventListener('click', (e) => {
          e.preventDefault();
          onAwardDateClick(award.type, award.date);
        });
      }
    }
    badge.textContent = label;
    container.appendChild(badge);
  }
}

function firstWomanMarker() {
  const fw = document.createElement('div');
  fw.className = 'first-woman-marker';
  fw.textContent = t('panel.firstWoman');
  return fw;
}

/** Show list of all articles sharing an award date across all countries. */
export function showAwardDateList(awardType, date, entries) {
  _content.hidden = false;
  _countryName.textContent = `${t(`awards.${awardType}`)} ${date}`;
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

  _awardSummary.innerHTML = `<span class="panel-article-count">${byTitle.size} ${tPlural('count.article', byTitle.size)}</span>`;

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

  // Also show other awards on this article (for context; not clickable here)
  const meta = document.createElement('div');
  meta.className = 'article-meta';
  appendAwardBadges(meta, article, false);
  if (article.isFirstWoman) item.appendChild(firstWomanMarker());
  if (meta.childElementCount > 0) item.appendChild(meta);

  return item;
}

// ── Countries list helpers ────────────────────────────────────────────────────

function sortCountries(countries, sortBy = 'articles') {
  const lang = getLang();
  // Precompute counts once per country (not once per comparison)
  const decorated = countries.map(c => {
    const { cw, da, anm } = countAwardTypes(c.articles);
    return { c, cw, other: da + anm, name: lang === 'pl' ? c.namePolish : c.nameEnglish };
  });

  decorated.sort((a, b) => {
    if (sortBy === 'cw') {
      if (a.cw !== b.cw) return b.cw - a.cw;
      const diff = b.c.articles.length - a.c.articles.length;
      if (diff !== 0) return diff;
    } else {
      const diff = b.c.articles.length - a.c.articles.length;
      if (diff !== 0) return diff;
      if (a.cw !== b.cw) return b.cw - a.cw;
      if (a.other !== b.other) return b.other - a.other;
    }
    return a.name.localeCompare(b.name, lang);
  });

  return decorated.map(d => d.c);
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

  const { cw, da, anm } = countAwardTypes(country.articles);

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
