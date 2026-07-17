// map.js — D3 choropleth world map
import { state, onCountryClick, buildCountryMap } from './app.js?v=18';
import { t, getLang } from './i18n.js?v=18';
import { isDark, countAwardTypes } from './utils.js?v=18';

// Vendored locally (was cdn.jsdelivr.net/npm/world-atlas@2) so the map loads offline.
const WORLD_ATLAS_URL = 'data/countries-110m.json?v=18';

// ── ISO numeric → alpha-3 lookup ─────────────────────────────────────────────
// Source: ISO 3166-1 (entries covering the dataset), sorted by numeric code.
// Note: 304 (Greenland) is intentionally mapped to DNK; 736 is the pre-2011
// numeric code for Sudan kept alongside 729 for older atlas data.
const NUM_TO_ISO3 = {
  4:'AFG',8:'ALB',10:'ATA',12:'DZA',20:'AND',24:'AGO',28:'ATG',31:'AZE',
  32:'ARG',36:'AUS',40:'AUT',44:'BHS',48:'BHR',50:'BGD',51:'ARM',52:'BRB',
  56:'BEL',64:'BTN',68:'BOL',70:'BIH',72:'BWA',76:'BRA',84:'BLZ',96:'BRN',
  100:'BGR',104:'MMR',108:'BDI',112:'BLR',116:'KHM',120:'CMR',124:'CAN',132:'CPV',
  140:'CAF',144:'LKA',148:'TCD',152:'CHL',156:'CHN',158:'TWN',170:'COL',174:'COM',
  178:'COG',180:'COD',188:'CRI',191:'HRV',192:'CUB',196:'CYP',203:'CZE',204:'BEN',
  208:'DNK',212:'DMA',214:'DOM',218:'ECU',222:'SLV',226:'GNQ',231:'ETH',232:'ERI',
  233:'EST',238:'FLK',242:'FJI',246:'FIN',250:'FRA',262:'DJI',266:'GAB',268:'GEO',
  270:'GMB',275:'PSE',276:'DEU',288:'GHA',296:'KIR',300:'GRC',304:'DNK',308:'GRD',
  320:'GTM',324:'GIN',328:'GUY',332:'HTI',336:'VAT',340:'HND',344:'HKG',348:'HUN',
  352:'ISL',356:'IND',360:'IDN',364:'IRN',368:'IRQ',372:'IRL',376:'ISR',380:'ITA',
  384:'CIV',388:'JAM',392:'JPN',398:'KAZ',400:'JOR',404:'KEN',408:'PRK',410:'KOR',
  414:'KWT',417:'KGZ',418:'LAO',422:'LBN',426:'LSO',428:'LVA',430:'LBR',434:'LBY',
  438:'LIE',440:'LTU',442:'LUX',446:'MAC',450:'MDG',454:'MWI',458:'MYS',462:'MDV',
  466:'MLI',470:'MLT',478:'MRT',480:'MUS',484:'MEX',492:'MCO',496:'MNG',498:'MDA',
  499:'MNE',504:'MAR',508:'MOZ',512:'OMN',516:'NAM',520:'NRU',524:'NPL',528:'NLD',
  540:'NCL',548:'VUT',554:'NZL',558:'NIC',562:'NER',566:'NGA',578:'NOR',583:'FSM',
  584:'MHL',585:'PLW',586:'PAK',591:'PAN',598:'PNG',600:'PRY',604:'PER',608:'PHL',
  616:'POL',620:'PRT',624:'GNB',626:'TLS',630:'PRI',634:'QAT',642:'ROU',643:'RUS',
  646:'RWA',659:'KNA',662:'LCA',670:'VCT',674:'SMR',678:'STP',682:'SAU',686:'SEN',
  688:'SRB',690:'SYC',694:'SLE',703:'SVK',704:'VNM',705:'SVN',706:'SOM',710:'ZAF',
  716:'ZWE',724:'ESP',728:'SSD',729:'SDN',732:'ESH',736:'SDN',740:'SUR',748:'SWZ',
  752:'SWE',756:'CHE',760:'SYR',762:'TJK',764:'THA',768:'TGO',776:'TON',780:'TTO',
  784:'ARE',788:'TUN',792:'TUR',795:'TKM',798:'TUV',800:'UGA',804:'UKR',807:'MKD',
  818:'EGY',826:'GBR',834:'TZA',840:'USA',854:'BFA',858:'URY',860:'UZB',862:'VEN',
  882:'WSM',887:'YEM',894:'ZMB',
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

// Micro-states and small island nations that are invisible (or absent) at
// 110m resolution. They carry the talk's "every country" claim, so we draw a
// clickable dot at these [lon, lat] positions regardless of polygon size.
const MICROSTATE_COORDS = {
  AND:[1.52,42.55], ATG:[-61.80,17.12], BHR:[50.55,26.07], BRB:[-59.54,13.19],
  CPV:[-23.62,15.12], COM:[43.33,-11.65], DMA:[-61.37,15.41], GRD:[-61.68,12.12],
  KIR:[-157.36,1.87], LIE:[9.55,47.16], MDV:[73.51,3.20], MHL:[171.18,7.13],
  MLT:[14.38,35.90], MCO:[7.42,43.74], FSM:[158.16,6.92], NRU:[166.93,-0.52],
  PLW:[134.58,7.51], KNA:[-62.73,17.30], LCA:[-60.98,13.91], VCT:[-61.20,13.25],
  WSM:[-172.10,-13.76], SMR:[12.46,43.94], STP:[6.61,0.19], SYC:[55.49,-4.68],
  SGP:[103.82,1.35], TON:[-175.20,-21.18], TUV:[178.68,-8.52], VAT:[12.45,41.90],
  MUS:[57.55,-20.35], BHS:[-77.40,25.03], XKX:[20.90,42.60],
};

// ── State ────────────────────────────────────────────────────────────────────
let _svg, _path, _projection, _zoom;
let _countryDataMap = new Map();  // iso3 → country object (filtered)
let _rawDataMap     = new Map();  // iso3 → country object (all data)
let _maxArticles = 1;
let _maxAwards   = 1;
let _onDblClickResetCb = null;

// ── Colour helpers ───────────────────────────────────────────────────────────

// Ramp endpoints. In light mode we ramp light→dark (interpolateBlues/Oranges);
// on a dark background that makes the highest-value countries read as
// near-black holes, so in dark mode we ramp a visible dark tone → bright.
const RAMP_HIGH = {
  articles: { light: '#084594', dark: '#7dc0ff' },
  awards:   { light: '#e6550d', dark: '#ffab5e' },
};
const ARTICLES_DARK = d3.interpolateRgb('#17385c', RAMP_HIGH.articles.dark);
const AWARDS_DARK   = d3.interpolateRgb('#5c3410', RAMP_HIGH.awards.dark);

// Cap the colour scale so a single high outlier (e.g. one country with 21) does
// not compress the low end, where most countries sit (1–9). Anything ≥ cap gets
// the darkest colour; the legend shows "10+". Set to Infinity to revert.
const COLOR_SCALE_CAP = 10;

/** Effective scale maximum: the data max, but never above the cap. */
function scaleMax(dataMax) {
  return Math.min(Math.max(dataMax, 1), COLOR_SCALE_CAP);
}

// Scales are rebuilt only when maxima or theme change (rebuildScales), not per
// country per frame — the day-by-day replay recolours the map ~450 times.
let _articlesScale = null;
let _awardsScale   = null;

function rebuildScales() {
  _articlesScale = d3.scaleSequentialSqrt()
    .domain([0, scaleMax(_maxArticles)])
    .interpolator(isDark() ? ARTICLES_DARK : d3.interpolateBlues);
  _awardsScale = d3.scaleSequentialSqrt()
    .domain([0, scaleMax(_maxAwards)])
    .interpolator(isDark() ? AWARDS_DARK : d3.interpolateOranges);
}

/** Apply a cached scale with a visibility floor (8%) and the cap clamp. */
function rampColor(scale, count) {
  if (!count || !scale) return 'var(--map-no-data)';
  const eff = scale.domain()[1];
  return scale(Math.min(Math.max(count, eff * 0.08), eff));
}

/** Colour for a data key (iso3/namePolish) using the current colour mode. */
function colorForKey(key) {
  const country = _countryDataMap.get(key);
  if (!country) return 'var(--map-no-data)';
  if (state.colorMode === 'awards') {
    return rampColor(_awardsScale, country.articles.flatMap(a => a.awards).length);
  }
  return rampColor(_articlesScale, country.articles.length);
}

function colorForFeature(d) {
  const key = featureKey(d);
  if (!key) return 'var(--map-no-data)';
  return colorForKey(key);
}

function getCountryStats(iso3) {
  const country = _countryDataMap.get(iso3);
  if (!country) return null;
  return { country, ...countAwardTypes(country.articles) };
}

// ── Legend ───────────────────────────────────────────────────────────────────

function updateLegend() {
  const awards = state.colorMode === 'awards';
  const maxVal = awards ? _maxAwards : _maxArticles;
  document.getElementById('legend-max').textContent =
    maxVal > COLOR_SCALE_CAP ? COLOR_SCALE_CAP + '+' : maxVal;

  const title = document.getElementById('legend-title');
  if (title) title.textContent = t(awards ? 'legend.awards' : 'legend.articles');

  const grad = document.getElementById('legend-gradient');
  const high = RAMP_HIGH[awards ? 'awards' : 'articles'][isDark() ? 'dark' : 'light'];
  grad.style.background = `linear-gradient(to right, var(--map-no-data), ${high})`;
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
  rebuildScales();

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

  // Draw clickable dots for micro-states (invisible/absent at this resolution)
  drawDots();

  // Hide loading spinner
  const loader = document.getElementById('map-loading');
  loader.classList.add('hidden');
  setTimeout(() => loader.remove(), 500);

  updateLegend();

  // Zoom & pan behaviour
  _zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      const k = event.transform.k;
      g.attr('transform', event.transform);
      borders.attr('transform', event.transform);
      _svg.select('#map-dots').attr('transform', event.transform);
      // Scale stroke width / dot radius inversely so they stay constant on screen
      g.selectAll('.country-path').attr('stroke-width', 0.4 / k);
      _svg.select('#map-dots').selectAll('circle.micro-dot')
        .attr('r', DOT_RADIUS / k).attr('stroke-width', 0.8 / k);
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
  rebuildScales();
  updateLegend();

  _svg?.select('#map-countries').selectAll('path.country-path')
    .transition().duration(350)
    .attr('fill', d => colorForFeature(d));

  _svg?.select('#map-dots').selectAll('circle.micro-dot')
    .transition().duration(350)
    .attr('fill', d => colorForKey(d.key));
}

// ── Micro-state dots ──────────────────────────────────────────────────────────

const DOT_RADIUS = 2.6;

function drawDots() {
  const dotData = Object.entries(MICROSTATE_COORDS)
    .filter(([key]) => _rawDataMap.has(key))
    .map(([key, lonlat]) => ({ key, pos: _projection(lonlat) }))
    .filter(d => d.pos);

  _svg.select('#map-dots').selectAll('circle.micro-dot')
    .data(dotData, d => d.key)
    .join('circle')
    .attr('class', 'micro-dot')
    .attr('cx', d => d.pos[0])
    .attr('cy', d => d.pos[1])
    .attr('r', DOT_RADIUS)
    .attr('fill', d => colorForKey(d.key))
    .on('mousemove', (event, d) => showTooltip(event, d.key))
    .on('mouseleave', hideTooltip)
    .on('click', (event, d) => {
      event.stopPropagation();
      onCountryClick(d.key);
    });
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
  _svg?.select('#map-dots').selectAll('circle.micro-dot')
    .classed('selected', d => d.key === iso3)
    .classed('dimmed', d => d.key !== iso3 && !relatedKeys.has(d.key));
}

export function deselectAll() {
  _svg?.selectAll('path.country-path, circle.micro-dot')
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
  _svg?.select('#map-dots').selectAll('circle.micro-dot')
    .classed('selected', false)
    .classed('dimmed', d => !keys.has(d.key));
}

/**
 * Recolour the map + legend for the current theme or language (light/dark ramps
 * differ; the legend title is translated). Cheap: attribute-only, no layout.
 */
export function applyTheme() {
  rebuildScales();
  updateLegend();
  _svg?.select('#map-countries').selectAll('path.country-path')
    .attr('fill', d => colorForFeature(d));
  _svg?.select('#map-dots').selectAll('circle.micro-dot')
    .attr('fill', d => colorForKey(d.key));
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
