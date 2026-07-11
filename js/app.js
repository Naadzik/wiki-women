// app.js — entry point, global state, pub/sub wiring
import * as i18n   from './i18n.js?v=14';
import * as stats  from './stats.js?v=14';
import * as filters from './filters.js?v=14';
import * as search  from './search.js?v=14';
import * as map     from './map.js?v=14';
import * as panel   from './panel.js?v=14';
import * as timeline from './timeline.js?v=14';
import * as replay   from './replay.js?v=14';

// ── Continent definitions ─────────────────────────────────────────────────────

export const CONTINENT_ISO3 = {
  europe: new Set([
    'ALB','AND','ARM','AUT','AZE','BEL','BGR','BIH','BLR','CHE','CYP','CZE',
    'DEU','DNK','ESP','EST','FIN','FRA','GBR','GEO','GRC','HRV','HUN','IRL',
    'ISL','ITA','KAZ','LIE','LTU','LUX','LVA','MCO','MDA','MKD','MLT','MNE',
    'NLD','NOR','POL','PRT','ROU','RUS','SMR','SRB','SVK','SVN','SWE','TUR',
    'UKR','VAT','XKX',
  ]),
  africa: new Set([
    'AGO','BDI','BEN','BFA','BWA','CAF','CIV','CMR','COD','COG','COM','CPV',
    'DJI','DZA','EGY','ERI','ESH','ETH','GAB','GHA','GIN','GMB','GNB','GNQ',
    'KEN','LBR','LBY','LSO','MAR','MDG','MLI','MOZ','MRT','MUS','MWI','NAM',
    'NER','NGA','RWA','SDN','SEN','SLE','SOM','SSD','STP','SWZ','SYC','TCD',
    'TGO','TUN','TZA','UGA','ZAF','ZMB','ZWE',
  ]),
  north_america: new Set([
    'ATG','BHS','BLZ','BRB','CAN','CRI','CUB','DMA','DOM','GRD','GTM','HND',
    'HTI','JAM','KNA','LCA','MEX','NIC','PAN','SLV','TTO','USA','VCT',
  ]),
  south_america: new Set([
    'ARG','BOL','BRA','CHL','COL','ECU','GUY','PER','PRY','SUR','URY','VEN',
  ]),
  asia: new Set([
    'AFG','ARE','BGD','BHR','BRN','BTN','CHN','HKG','IDN','IND','IRN','IRQ',
    'ISR','JOR','JPN','KGZ','KHM','KOR','KWT','LAO','LBN','LKA','MAC','MDV',
    'MMR','MNG','MYS','NPL','OMN','PAK','PHL','PRK','PSE','QAT','SAU','SGP',
    'SYR','THA','TJK','TKM','TLS','TWN','UZB','VNM','YEM',
  ]),
  oceania: new Set([
    'AUS','FJI','FSM','KIR','MHL','NRU','NZL','PLW','PNG','SLB','TON','TUV',
    'VUT','WSM',
  ]),
  antarctica: new Set(['ATA']),
};

// Geographic bounding boxes [lon0, lat0], [lon1, lat1]
const CONTINENT_BOUNDS = {
  europe:        [[-25, 34],   [65, 72]],
  africa:        [[-20, -40],  [55, 40]],
  north_america: [[-170, 5],   [-50, 75]],
  south_america: [[-85, -60],  [-30, 15]],
  asia:          [[25, -10],   [150, 80]],
  oceania:       [[100, -50],  [180, 25]],
  antarctica:    [[-180, -90], [180, -55]],
};

// ── URL overrides ───────────────────────────────────────────────────────────
// Query params win over localStorage so a link on a slide / QR code opens the
// app in a deterministic state, e.g. app.html?lang=en&theme=light&present
const _params = new URLSearchParams(location.search);

function initialLang() {
  const p = _params.get('lang');
  if (p === 'en' || p === 'pl') return p;
  return localStorage.getItem('ww-lang') || 'en';
}
function initialDark() {
  const p = _params.get('theme');
  if (p === 'dark')  return true;
  if (p === 'light') return false;
  return localStorage.getItem('ww-dark') === 'true';
}

// ── Global state ──────────────────────────────────────────────────────────────
export const state = {
  lang:      initialLang(),
  darkMode:  initialDark(),
  colorMode: 'articles',   // 'articles' | 'awards'
  presentMode: _params.has('present'),
  selectedCountry: null,       // iso3 string (or namePolish for null-iso3 entries)
  panelMode: 'list',           // 'list' | 'country' | 'special' | 'award-date'
  awardDateContext: null,      // { type, date } when panelMode === 'award-date'
  navHistory: [],              // stack of {panelMode, selectedCountry, awardDateContext}
  activeFilters: {
    editorialActions: [],  // e.g. ['cee2025']
    awardTypes:       [],  // e.g. ['cw']
    noAwards:         false,
    firstWomen:       false,
    search:           '',
    continent:        null,   // null | Set<iso3>
    asOfDate:         null,   // null | 'YYYY-MM-DD'
  },
};

// Raw data loaded once from JSON
let _data = null;

// Continent change tracking for zoom-reset detection
let _prevContinent = undefined;

// ── Filter logic ──────────────────────────────────────────────────────────────
export function applyFilters(data) {
  const { editorialActions, awardTypes, noAwards, firstWomen, search: q, continent, asOfDate } = state.activeFilters;
  const sq = q.trim().toLowerCase();

  const filterCountry = (country) => {
    // Continent filter
    if (continent !== null && (!country.iso3 || !continent.has(country.iso3))) return null;

    // Country name match: a search that matches the country name keeps all its
    // articles (so typing "Tuvalu" surfaces the country, not just article titles).
    const countryNameMatch = !!sq && (
      (country.nameEnglish && country.nameEnglish.toLowerCase().includes(sq)) ||
      (country.namePolish  && country.namePolish.toLowerCase().includes(sq))
    );

    // Apply asOfDate: keep only articles created on/before the date,
    // and strip awards given after the date. Articles with no created date are always kept.
    let articles = country.articles;
    if (asOfDate) {
      articles = articles
        .filter(a => !a.created || a.created <= asOfDate)
        .map(a => ({
          ...a,
          awards: a.awards.filter(aw => !aw.date || aw.date <= asOfDate),
        }));
    }

    // Country-level "no awards" check: exclude the whole country if ANY article has an award
    if (noAwards && articles.some(a => a.awards.length > 0)) return null;

    const filtered = articles.filter(article => {
      const matchesAction =
        editorialActions.length === 0 ||
        article.editorialActions.some(a => editorialActions.includes(a));

      const matchesAward =
        awardTypes.length === 0 ||
        article.awards.some(a => awardTypes.includes(a.type));

      const matchesFirstWoman =
        !firstWomen || article.isFirstWoman;

      const matchesSearch =
        !sq ||
        countryNameMatch ||
        article.title.toLowerCase().includes(sq);

      return matchesAction && matchesAward && matchesFirstWoman && matchesSearch;
    });

    if (filtered.length === 0) return null;
    return { ...country, articles: filtered };
  };

  return {
    ...data,
    countries:   data.countries.map(filterCountry).filter(Boolean),
    unrecognized: data.unrecognized.map(filterCountry).filter(Boolean),
  };
}

// ── Event handlers ────────────────────────────────────────────────────────────

/** Returns the active continent key from the DOM (source of truth). */
function activeContinentKey() {
  return document.querySelector('.continent-btn.active')?.dataset.continent ?? null;
}

/** Syncs continent button active states to state.activeFilters.continent. */
function syncContinentButtons() {
  document.querySelectorAll('.continent-btn[data-continent]').forEach(btn => {
    btn.classList.toggle('active', state.activeFilters.continent === CONTINENT_ISO3[btn.dataset.continent]);
  });
}

/** Called by filters/search whenever filter state changes. */
export function onFilterChange() {
  if (!_data) return;

  // Detect continent being cleared externally (e.g. by clearAll)
  if (_prevContinent !== undefined && _prevContinent !== null && state.activeFilters.continent === null) {
    map.zoomReset();
  }
  _prevContinent = state.activeFilters.continent;
  syncContinentButtons();

  const filtered = applyFilters(_data);
  map.update(filtered);
  stats.update(filtered, _data.meta);
  if (state.panelMode === 'list') {
    const cKey = activeContinentKey();
    panel.showCountriesList(filtered, cKey ? i18n.t(`continents.${cKey}`) : null);
  } else if (state.panelMode === 'award-date' && state.awardDateContext) {
    _showAwardDate(state.awardDateContext.type, state.awardDateContext.date);
  } else {
    panel.update(state.selectedCountry, filtered);
  }
  filters.updateCounts(filtered);
  timeline.update(filtered);
}

/** Push current panel state onto the history stack and sync the back button. */
function pushHistory() {
  state.navHistory.push({
    panelMode:        state.panelMode,
    selectedCountry:  state.selectedCountry,
    awardDateContext: state.awardDateContext,
  });
  syncBackButton();
}

/** Show or hide the back button depending on whether there is history. */
function syncBackButton() {
  const btn = document.getElementById('panel-close');
  if (btn) btn.hidden = state.navHistory.length === 0;
}

/** Called when user clicks an award date badge in the panel. */
export function onAwardDateClick(awardType, date) {
  if (!_data) return;
  pushHistory();
  state.selectedCountry = null;
  state.panelMode = 'award-date';
  state.awardDateContext = { type: awardType, date };
  map.deselectAll();
  _showAwardDate(awardType, date);
}

function _showAwardDate(awardType, date) {
  if (!_data) return;

  // Build a dataset containing only articles with this specific award date
  const filterForAward = (c) => {
    const filtered = c.articles.filter(a =>
      a.awards.some(aw => aw.type === awardType && aw.date === date)
    );
    return filtered.length > 0 ? { ...c, articles: filtered } : null;
  };
  const awardFiltered = {
    ..._data,
    countries:    _data.countries.map(filterForAward).filter(Boolean),
    unrecognized: _data.unrecognized.map(filterForAward).filter(Boolean),
  };

  // Color the map based only on articles from this award nomination
  map.update(awardFiltered);

  // Collect entries for panel + dim unrelated countries
  const entries = [];
  for (const c of [...awardFiltered.countries, ...awardFiltered.unrecognized]) {
    for (const a of c.articles) entries.push({ article: a, country: c });
  }
  const keys = new Set(entries.map(e => e.country.iso3 || e.country.namePolish));
  map.highlightSet(keys);

  panel.showAwardDateList(awardType, date, entries);
}

/** Called when user clicks a country on the map. */
export function onCountryClick(countryKey) {
  // Only push history when transitioning from list/special/award-date → country
  if (state.panelMode !== 'country') pushHistory();
  state.selectedCountry = countryKey;
  state.panelMode = 'country';
  if (!_data) return;
  const filtered = applyFilters(_data);
  panel.show(countryKey, filtered);
  map.highlightRelated(countryKey, getRelatedCountryKeys(countryKey));
}

function getRelatedCountryKeys(countryKey) {
  if (!_data) return new Set();
  const selected = findCountryRaw(countryKey);
  if (!selected) return new Set();
  const titles = new Set(selected.articles.map(a => a.title));
  const related = new Set();
  for (const c of [..._data.countries, ..._data.unrecognized]) {
    const key = c.iso3 || c.namePolish;
    if (key === countryKey) continue;
    if (c.articles.some(a => titles.has(a.title))) related.add(key);
  }
  return related;
}

/** Called when user clicks the back button — navigates to the previous panel state. */
export function onPanelClose() {
  const prev = state.navHistory.pop();
  if (!prev) return;
  syncBackButton();

  state.panelMode        = prev.panelMode;
  state.selectedCountry  = prev.selectedCountry;
  state.awardDateContext = prev.awardDateContext;

  if (!_data) { panel.hide(); return; }

  const filtered = applyFilters(_data);

  if (prev.panelMode === 'country' && prev.selectedCountry) {
    panel.show(prev.selectedCountry, filtered);
    map.highlightRelated(prev.selectedCountry, getRelatedCountryKeys(prev.selectedCountry));
  } else if (prev.panelMode === 'award-date' && prev.awardDateContext) {
    _showAwardDate(prev.awardDateContext.type, prev.awardDateContext.date);
  } else if (prev.panelMode === 'special') {
    map.deselectAll();
    panel.showSpecialList(_data);
  } else {
    // list
    map.deselectAll();
    const cKey = activeContinentKey();
    panel.showCountriesList(filtered, cKey ? i18n.t(`continents.${cKey}`) : null);
  }
}

/** Called when user toggles language. */
function onLangToggle() {
  state.lang = state.lang === 'en' ? 'pl' : 'en';
  localStorage.setItem('ww-lang', state.lang);
  i18n.init(state.lang);
  i18n.applyToDOM();
  // Update lang button label (shows the OTHER language as the switch target)
  document.getElementById('lang-label').textContent = state.lang === 'en' ? 'PL' : 'EN';
  // Re-render dynamic content
  if (_data) {
    const filtered = applyFilters(_data);
    stats.update(filtered, _data.meta);
    filters.render(_data, filtered);
    const cKey = activeContinentKey();
    if (state.panelMode === 'list') panel.showCountriesList(filtered, cKey ? i18n.t(`continents.${cKey}`) : null);
    else if (state.selectedCountry) panel.show(state.selectedCountry, filtered);
    timeline.updateLabels();
    map.updateTooltipLang();
  }
}

/** Called when user toggles dark mode. */
function onDarkToggle() {
  state.darkMode = !state.darkMode;
  localStorage.setItem('ww-dark', state.darkMode);
  applyDarkMode();
  // Swap icon
  document.getElementById('icon-dark').style.display  = state.darkMode ? 'none'  : '';
  document.getElementById('icon-light').style.display = state.darkMode ? ''      : 'none';
  // Chart + map colours depend on dark mode — re-theme both
  if (_data) { timeline.applyTheme(); map.applyTheme(); }
}

function applyDarkMode() {
  document.documentElement.classList.toggle('dark', state.darkMode);
}

/** Toggle presentation mode (larger fonts, collapsible filters for projectors). */
function applyPresentMode() {
  document.body.classList.toggle('present', state.presentMode);
  document.getElementById('btn-present')?.classList.toggle('active', state.presentMode);
}

function togglePresentMode() {
  state.presentMode = !state.presentMode;
  applyPresentMode();
}

/** Called when color mode (by articles / by awards) changes. */
export function onColorModeChange(mode) {
  state.colorMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (_data) map.update(applyFilters(_data));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a Map<key, country> from a country list for fast lookup. */
export function buildCountryMap(countries) {
  const m = new Map();
  for (const c of countries) {
    // Primary key: iso3 (if available), secondary: namePolish
    if (c.iso3) m.set(c.iso3, c);
    m.set(c.namePolish, c);
  }
  return m;
}

/** Get a country from filtered data by key (iso3 or namePolish). */
export function findCountry(filteredData, key) {
  if (!key) return null;
  const all = [...filteredData.countries, ...filteredData.unrecognized];
  return all.find(c => c.iso3 === key || c.namePolish === key) || null;
}

/** Get a country from RAW data by key. */
export function findCountryRaw(key) {
  if (!_data || !key) return null;
  const all = [..._data.countries, ..._data.unrecognized];
  return all.find(c => c.iso3 === key || c.namePolish === key) || null;
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function syncHeaderHeight() {
  const h = document.getElementById('site-header')?.offsetHeight ?? 90;
  document.documentElement.style.setProperty('--header-height', h + 'px');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  // Apply saved dark mode before render to avoid flash
  applyDarkMode();
  if (state.darkMode) {
    document.getElementById('icon-dark').style.display  = 'none';
    document.getElementById('icon-light').style.display = '';
  }

  // Apply presentation mode if requested via ?present
  applyPresentMode();

  // Measure header height for sticky panel positioning
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  // Init i18n
  i18n.init(state.lang);
  i18n.applyToDOM();
  document.getElementById('lang-label').textContent = state.lang === 'en' ? 'PL' : 'EN';

  // Wire static controls
  document.getElementById('btn-lang').addEventListener('click', onLangToggle);
  document.getElementById('btn-dark').addEventListener('click', onDarkToggle);
  document.getElementById('btn-present')?.addEventListener('click', togglePresentMode);
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => onColorModeChange(btn.dataset.mode));
  });
  document.getElementById('panel-close')?.addEventListener('click', onPanelClose);
  syncBackButton();

  // Keyboard shortcut: P toggles presentation mode (ignored while typing)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'p' && e.key !== 'P') return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    togglePresentMode();
  });

  // First-women stat chip toggles the first-woman filter
  document.getElementById('stat-firstwomen-btn')?.addEventListener('click', () => {
    if (!_data) return;
    state.activeFilters.firstWomen = !state.activeFilters.firstWomen;
    document.getElementById('btn-first-women')?.classList.toggle('active', state.activeFilters.firstWomen);
    onFilterChange();
  });
  document.getElementById('stat-countries-btn')?.addEventListener('click', () => {
    if (!_data) return;
    state.selectedCountry = null;
    state.panelMode = 'list';
    state.navHistory = [];
    syncBackButton();
    map.deselectAll();
    const cKey = activeContinentKey();
    const filtered = applyFilters(_data);
    panel.showCountriesList(filtered, cKey ? i18n.t(`continents.${cKey}`) : null);
  });

  // Load data
  try {
    const resp = await fetch('data/wikiwomen.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _data = await resp.json();
  } catch (err) {
    document.getElementById('map-loading').innerHTML =
      `<p style="color:var(--muted);padding:20px;text-align:center">Failed to load data: ${err.message}</p>`;
    return;
  }

  const filtered = applyFilters(_data);

  // Init modules (order matters for some dependencies)
  stats.init();
  stats.update(filtered, _data.meta);

  filters.init(_data, filtered);
  search.init();

  await map.init(filtered, _data);
  panel.init();
  panel.showCountriesList(filtered);

  timeline.init(_data.cwTimeline, _data.createdTimeline);
  replay.init(_data);

  // Wire continent buttons
  document.querySelectorAll('.continent-btn[data-continent]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.continent;
      const iso3Set = CONTINENT_ISO3[key];
      if (state.activeFilters.continent === iso3Set) {
        // Deselect: clear filter, reset zoom
        state.activeFilters.continent = null;
        map.zoomReset();
      } else {
        // Select: set filter, zoom to continent
        state.activeFilters.continent = iso3Set;
        map.zoomToContinent(CONTINENT_BOUNDS[key]);
      }
      // Show countries list in panel (clear history — continent change resets context)
      state.selectedCountry = null;
      state.panelMode = 'list';
      state.navHistory = [];
      syncBackButton();
      map.deselectAll();
      onFilterChange();
    });
  });

  // Double-click map resets both zoom and continent filter
  map.onDblClickReset(() => {
    state.activeFilters.continent = null;
    onFilterChange();
  });

  // Show "disputed territories" note
  if (_data.unrecognized.length > 0) {
    const note = document.getElementById('additional-note');
    note.hidden = false;
    document.getElementById('btn-show-additional')?.addEventListener('click', () => {
      pushHistory();
      state.selectedCountry = null;
      state.panelMode = 'special';
      panel.showSpecialList(_data);
    });
  }
}

document.addEventListener('DOMContentLoaded', boot);
