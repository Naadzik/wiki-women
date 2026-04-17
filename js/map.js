// map.js — D3 choropleth world map
import { state, onCountryClick, buildCountryMap } from './app.js?v=11';
import { t, getLang } from './i18n.js?v=11';

const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ── ISO numeric → alpha-3 lookup ─────────────────────────────────────────────
// Source: ISO 3166-1 (selected entries covering the dataset)
const NUM_TO_ISO3 = {
  4:'AFG',8:'ALB',12:'DZA',20:'AND',24:'AGO',28:'ATG',32:'ARG',36:'AUS',
  40:'AUT',31:'AZE',44:'BHS',48:'BHR',50:'BGD',52:'BRB',56:'BEL',84:'BLZ',
  204:'BEN',64:'BTN',68:'BOL',70:'BIH',72:'BWA',76:'BRA',96:'BRN',100:'BGR',
  854:'BFA',108:'BDI',116:'KHM',120:'CMR',124:'CAN',132:'CPV',140:'CAF',
  144:'LKA',152:'CHL',156:'CHN',170:'COL',174:'COM',178:'COG',180:'COD',
  188:'CRI',192:'CUB',196:'CYP',203:'CZE',208:'DNK',262:'DJI',212:'DMA',
  214:'DOM',218:'ECU',818:'EGY',222:'SLV',226:'GNQ',232:'ERI',233:'EST',
  231:'ETH',238:'FLK',242:'FJI',246:'FIN',250:'FRA',266:'GAB',270:'GMB',
  268:'GEO',276:'DEU',288:'GHA',300:'GRC',308:'GRD',320:'GTM',324:'GIN',
  624:'GNB',328:'GUY',332:'HTI',340:'HND',348:'HUN',356:'IND',360:'IDN',
  364:'IRN',368:'IRQ',372:'IRL',376:'ISR',380:'ITA',388:'JAM',392:'JPN',
  400:'JOR',398:'KAZ',404:'KEN',296:'KIR',408:'PRK',410:'KOR',414:'KWT',
  417:'KGZ',418:'LAO',428:'LVA',422:'LBN',426:'LSO',430:'LBR',434:'LBY',
  438:'LIE',440:'LTU',442:'LUX',450:'MDG',454:'MWI',462:'MDV',458:'MYS',
  466:'MLI',470:'MLT',584:'MHL',478:'MRT',480:'MUS',484:'MEX',583:'FSM',
  496:'MNG',504:'MAR',508:'MOZ',516:'NAM',520:'NRU',524:'NPL',528:'NLD',
  540:'NCL',554:'NZL',558:'NIC',562:'NER',566:'NGA',578:'NOR',512:'OMN',
  586:'PAK',585:'PLW',591:'PAN',598:'PNG',600:'PRY',604:'PER',608:'PHL',
  616:'POL',620:'PRT',630:'PRI',634:'QAT',642:'ROU',643:'RUS',646:'RWA',
  659:'KNA',662:'LCA',670:'VCT',882:'WSM',674:'SMR',678:'STP',682:'SAU',
  686:'SEN',688:'SRB',690:'SYC',694:'SLE',703:'SVK',705:'SVN',706:'SOM',
  710:'ZAF',716:'ZWE',724:'ESP',144:'LKA',729:'SDN',740:'SUR',752:'SWE',
  756:'CHE',760:'SYR',762:'TJK',764:'THA',626:'TLS',768:'TGO',776:'TON',
  780:'TTO',788:'TUN',792:'TUR',795:'TKM',798:'TUV',800:'UGA',804:'UKR',
  784:'ARE',840:'USA',858:'URY',860:'UZB',548:'VUT',862:'VEN',704:'VNM',
  887:'YEM',894:'ZMB',736:'SDN',
  // missing from compact block above
  104:'MMR',  // Myanmar / Burma
  191:'HRV',  // Croatia
  352:'ISL',  // Iceland
  826:'GBR',  // United Kingdom
  // territories / additional
  10:'ATA',344:'HKG',446:'MAC',275:'PSE',158:'TWN',336:'VAT',
  304:'DNK',  // Greenland → Denmark
  // partial: Western Sahara
  732:'ESH',
  // Kosovo uses XKX (not in standard numeric → skip, handle separately)
  // South Sudan
  728:'SSD',
  // Timor-Leste
  626:'TLS',
  // North Macedonia
  807:'MKD',
  // Montenegro
  499:'MNE',
  // Serbia (was part of SCG)
  // Belarus
  112:'BLR',
  // Moldova
  498:'MDA',
  // Armenia
  51:'ARM',
  // Georgia
  268:'GEO',
  // Maldives
  462:'MDV',
  // Micronesia
  583:'FSM',
  // Monaco
  492:'MCO',
  // San Marino
  674:'SMR',
  // Liechtenstein
  438:'LIE',
  // Andorra
  20:'AND',
  // Belize
  84:'BLZ',
  // Guyana
  328:'GUY',
  // Suriname
  740:'SUR',
  // Cape Verde
  132:'CPV',
  // Comoros
  174:'COM',
  // Equatorial Guinea
  226:'GNQ',
  // Guinea-Bissau
  624:'GNB',
  // Eswatini (Swaziland)
  748:'SWZ',
  // Lesotho
  426:'LSO',
  // Namibia
  516:'NAM',
  // Mozambique
  508:'MOZ',
  // Malawi
  454:'MWI',
  // Zambia
  894:'ZMB',
  // Rwanda
  646:'RWA',
  // Burundi
  108:'BDI',
  // Uganda
  800:'UGA',
  // Tanzania
  834:'TZA',
  // Kenya
  404:'KEN',
  // Ethiopia
  231:'ETH',
  // Somalia
  706:'SOM',
  // Djibouti
  262:'DJI',
  // Eritrea
  232:'ERI',
  // Chad
  148:'TCD',
  // Niger
  562:'NER',
  // Mali
  466:'MLI',
  // Burkina Faso
  854:'BFA',
  // Senegal
  686:'SEN',
  // Gambia
  270:'GMB',
  // Guinea-Bissau
  624:'GNB',
  // Guinea
  324:'GIN',
  // Sierra Leone
  694:'SLE',
  // Liberia
  430:'LBR',
  // Cote d'Ivoire
  384:'CIV',
  // Ghana
  288:'GHA',
  // Togo
  768:'TGO',
  // Benin
  204:'BEN',
  // Nigeria
  566:'NGA',
  // Cameroon
  120:'CMR',
  // Central African Republic
  140:'CAF',
  // Congo
  178:'COG',
  // DRC
  180:'COD',
  // Gabon
  266:'GAB',
  // Equatorial Guinea
  226:'GNQ',
  // Angola
  24:'AGO',
  // Botswana
  72:'BWA',
  // Zimbabwe
  716:'ZWE',
  // South Africa
  710:'ZAF',
};

// Features that have null IDs in TopoJSON — matched by properties.name
const FEATURE_NAME_TO_KEY = {
  'Kosovo':     'XKX',          // unrecognized, iso3=XKX in data
  'Somaliland': 'Somaliland',   // unrecognized, keyed by namePolish
  'N. Cyprus':  'Cypr Północny',// unrecognized, keyed by namePolish
};

/** Resolve a TopoJSON feature to its data map key (iso3 or namePolish). */
function featureKey(d) {
  return NUM_TO_ISO3[+d.id] ?? FEATURE_NAME_TO_KEY[d.properties?.name];
}

// ── State ────────────────────────────────────────────────────────────────────
let _svg, _path, _projection, _zoom;
let _countryDataMap = new Map();  // iso3 → country object (filtered)
let _rawDataMap     = new Map();  // iso3 → country object (all data)
let _maxArticles = 1;
let _maxAwards   = 1;
let _onDblClickResetCb = null;

// ── Colour helpers ───────────────────────────────────────────────────────────

function articlesColor(count) {
  if (!count) return 'var(--map-no-data)';
  const scale = d3.scaleSequentialSqrt()
    .domain([0, Math.max(_maxArticles, 1)])
    .interpolator(d3.interpolateBlues);
  // Ensure count=1 is always visible (floor at 0.15)
  return scale(Math.max(count, _maxArticles * 0.08));
}

function awardsColor(count) {
  if (!count) return 'var(--map-no-data)';
  const scale = d3.scaleSequentialSqrt()
    .domain([0, Math.max(_maxAwards, 1)])
    .interpolator(d3.interpolateOranges);
  return scale(Math.max(count, _maxAwards * 0.08));
}

function colorForFeature(d) {
  const key = featureKey(d);
  if (!key) return 'var(--map-no-data)';
  const country = _countryDataMap.get(key);
  if (!country) return 'var(--map-no-data)';

  if (state.colorMode === 'awards') {
    const awards = country.articles.flatMap(a => a.awards).length;
    return awardsColor(awards);
  }
  return articlesColor(country.articles.length);
}

function getCountryStats(iso3) {
  const country = _countryDataMap.get(iso3);
  if (!country) return null;
  const cw  = country.articles.flatMap(a => a.awards).filter(a => a.type === 'cw').length;
  const da  = country.articles.flatMap(a => a.awards).filter(a => a.type === 'da').length;
  const anm = country.articles.flatMap(a => a.awards).filter(a => a.type === 'anm').length;
  return { country, cw, da, anm };
}

// ── Legend ───────────────────────────────────────────────────────────────────

function updateLegend() {
  const maxVal = state.colorMode === 'awards' ? _maxAwards : _maxArticles;
  document.getElementById('legend-max').textContent = maxVal;
  const grad = document.getElementById('legend-gradient');
  if (state.colorMode === 'awards') {
    grad.style.background = document.documentElement.classList.contains('dark')
      ? 'linear-gradient(to right, var(--map-no-data), #e6550d)'
      : 'linear-gradient(to right, var(--map-no-data), #e6550d)';
  } else {
    grad.style.background = document.documentElement.classList.contains('dark')
      ? 'linear-gradient(to right, var(--map-no-data), #4ea8ff)'
      : 'linear-gradient(to right, var(--map-no-data), #084594)';
  }
}

// ── Tooltip ──────────────────────────────────────────────────────────────────

const tooltip = document.getElementById('tooltip');

function showTooltip(event, iso3) {
  const stats = getCountryStats(iso3);
  const country = _countryDataMap.get(iso3) || _rawDataMap.get(iso3);
  if (!country) return;

  const name = getLang() === 'pl' ? country.namePolish : country.nameEnglish;
  let html = `<div class="tooltip-country">${name}</div>`;

  if (stats) {
    html += `<div class="tooltip-stat">${t('stats.articles')}: ${stats.country.articles.length}</div>`;
    const parts = [];
    if (stats.cw)  parts.push(`${stats.cw} CW`);
    if (stats.da)  parts.push(`${stats.da} DA`);
    if (stats.anm) parts.push(`${stats.anm} ANM`);
    if (parts.length) html += `<div class="tooltip-stat">${parts.join(' · ')}</div>`;
  } else {
    html += `<div class="tooltip-stat" style="opacity:0.6">–</div>`;
  }

  tooltip.innerHTML = html;
  tooltip.classList.add('visible');
  positionTooltip(event);
}

function positionTooltip(event) {
  const pad = 14;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  let x = event.clientX + pad;
  let y = event.clientY - th / 2;
  if (x + tw > window.innerWidth - pad)  x = event.clientX - tw - pad;
  if (y < pad) y = pad;
  if (y + th > window.innerHeight - pad) y = window.innerHeight - th - pad;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function init(filteredData, rawData) {
  // Build raw data map for tooltip lookups even for unfiltered countries
  _rawDataMap = buildCountryMap([...rawData.countries, ...rawData.unrecognized]);

  _svg = d3.select('#map-svg');
  const g = _svg.select('#map-countries');
  const borders = _svg.select('#map-borders');

  _projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([480, 250]);

  _path = d3.geoPath().projection(_projection);

  // Load world TopoJSON
  let world;
  try {
    world = await d3.json(WORLD_ATLAS_URL);
  } catch (err) {
    console.error('Failed to load world atlas:', err);
    document.getElementById('map-loading').innerHTML =
      `<p style="color:var(--muted);padding:20px;text-align:center">Failed to load map data.</p>`;
    return;
  }

  const countries = topojson.feature(world, world.objects.countries);
  const mesh      = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

  // Initial data maps
  _countryDataMap = buildCountryMap([...filteredData.countries, ...filteredData.unrecognized]);
  computeMaxima(filteredData);

  // Draw country paths
  g.selectAll('path.country-path')
    .data(countries.features)
    .join('path')
    .attr('class', d => {
      const key = featureKey(d);
      const hasData = key && _rawDataMap.has(key);
      return `country-path${hasData ? '' : ' no-data'}`;
    })
    .attr('d', _path)
    .attr('fill', d => colorForFeature(d))
    .on('mousemove', (event, d) => {
      const key = featureKey(d);
      if (key) showTooltip(event, key);
    })
    .on('mouseleave', hideTooltip)
    .on('click', (event, d) => {
      const key = featureKey(d);
      if (!key) return;
      if (!_rawDataMap.has(key)) return;
      onCountryClick(key);
    });

  // Draw borders mesh
  borders.append('path')
    .datum(mesh)
    .attr('class', 'map-borders')
    .attr('d', _path);

  // Hide loading spinner
  const loader = document.getElementById('map-loading');
  loader.classList.add('hidden');
  setTimeout(() => loader.remove(), 500);

  updateLegend();

  // Zoom & pan behaviour
  _zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
      borders.attr('transform', event.transform);
      // Scale stroke width inversely
      g.selectAll('.country-path')
        .attr('stroke-width', 0.4 / event.transform.k);
    });

  _svg.call(_zoom);

  // Double-click to reset zoom (and notify app to clear continent)
  _svg.on('dblclick.zoom', null);
  _svg.on('dblclick', () => {
    _svg.transition().duration(500).call(_zoom.transform, d3.zoomIdentity);
    if (_onDblClickResetCb) _onDblClickResetCb();
  });
}

// ── Update (on filter change) ─────────────────────────────────────────────────

export function update(filteredData) {
  _countryDataMap = buildCountryMap([...filteredData.countries, ...filteredData.unrecognized]);
  computeMaxima(filteredData);
  updateLegend();

  _svg?.select('#map-countries').selectAll('path.country-path')
    .transition().duration(350)
    .attr('fill', d => colorForFeature(d));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeMaxima(data) {
  let maxA = 1, maxW = 1;
  for (const c of [...data.countries, ...data.unrecognized]) {
    maxA = Math.max(maxA, c.articles.length);
    maxW = Math.max(maxW, c.articles.flatMap(a => a.awards).length);
  }
  _maxArticles = maxA;
  _maxAwards   = maxW;
}

export function highlightRelated(iso3, relatedKeys) {
  _svg?.select('#map-countries').selectAll('path.country-path')
    .classed('selected', d => featureKey(d) === iso3)
    .classed('dimmed', d => {
      const key = featureKey(d);
      if (!key || key === iso3) return false;
      return !relatedKeys.has(key);
    });
}

export function deselectAll() {
  _svg?.select('#map-countries').selectAll('path.country-path')
    .classed('selected', false)
    .classed('dimmed', false);
}

/** Highlight a set of country keys, dimming everything else (no single selection). */
export function highlightSet(keys) {
  _svg?.select('#map-countries').selectAll('path.country-path')
    .classed('selected', false)
    .classed('dimmed', d => {
      const key = featureKey(d);
      if (!key) return false;
      return !keys.has(key);
    });
}

export function updateTooltipLang() {
  // Tooltip re-renders on next mousemove — nothing to do proactively
}

/** Register a callback to be called when the user double-clicks (zoom reset). */
export function onDblClickReset(cb) {
  _onDblClickResetCb = cb;
}

/** Zoom map to a geographic bounding box [[lon0,lat0],[lon1,lat1]]. */
export function zoomToContinent(geoBounds) {
  if (!_svg || !_path || !_zoom) return;
  const [[lon0, lat0], [lon1, lat1]] = geoBounds;
  const poly = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[lon0, lat0], [lon1, lat0], [lon1, lat1], [lon0, lat1], [lon0, lat0]]],
    },
  };
  const [[x0, y0], [x1, y1]] = _path.bounds(poly);
  const width = 960, height = 500;
  const k = Math.min(8, 0.85 / Math.max((x1 - x0) / width, (y1 - y0) / height));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  _svg.transition().duration(750).call(
    _zoom.transform,
    d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-cx, -cy),
  );
}

/** Reset map zoom to initial state. */
export function zoomReset() {
  if (!_svg || !_zoom) return;
  _svg.transition().duration(500).call(_zoom.transform, d3.zoomIdentity);
}
