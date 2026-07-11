// replay.js — "Replay the year" animation.
// Sweeps the existing as-of-date filter from the first article to the last,
// so the audience watches the world map fill in, with a live day/article/country
// counter. Reuses applyFilters()'s asOfDate machinery — no new filtering logic.
import { state, onFilterChange } from './app.js?v=14';
import { t } from './i18n.js?v=14';

const DAY_MS        = 86_400_000;
const FRAME_COUNT   = 80;          // animation steps between start and last date
const FRAME_MS      = 130;         // wall-clock per step (~10s total)
const HOLD_MS       = 1800;        // keep the final overlay up briefly before hiding
const PROJECT_START = '2025-03-21';// "365 in 365 days" began here; skip sparse pre-history

let _data       = null;
let _frameDates = [];   // evenly spaced date checkpoints, 'YYYY-MM-DD'
let _minDate    = null;
let _timer      = null;
let _idx        = 0;
let _playing    = false;

export function init(data) {
  _data = data;
  const created = allCreatedDates(data);
  if (created.length < 2) return;
  const last = created[created.length - 1];
  // Start at the project kick-off; any earlier articles count as baseline at day 1.
  _minDate = created[0] < PROJECT_START ? PROJECT_START : created[0];
  if (_minDate >= last) _minDate = created[0];   // safety fallback
  _frameDates = buildFrames(_minDate, last, FRAME_COUNT);
  document.getElementById('btn-replay')?.addEventListener('click', toggle);
}

// ── Frame setup ───────────────────────────────────────────────────────────────

function allCreatedDates(data) {
  const ds = [...data.countries, ...data.unrecognized]
    .flatMap(c => c.articles)
    .map(a => a.created)
    .filter(Boolean);
  return [...new Set(ds)].sort();
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function buildFrames(min, max, n) {
  const d0 = Date.parse(min), d1 = Date.parse(max);
  const frames = [];
  for (let i = 0; i <= n; i++) frames.push(isoDate(d0 + (d1 - d0) * (i / n)));
  frames[frames.length - 1] = max;   // land exactly on the last date
  return frames;
}

// ── Playback ──────────────────────────────────────────────────────────────────

export function toggle() {
  _playing ? pause() : play();
}

function play() {
  if (!_frameDates.length) return;
  _playing = true;
  setButton(true);
  if (_idx >= _frameDates.length) _idx = 0;   // restart when finished
  document.getElementById('replay-overlay')?.removeAttribute('hidden');
  step();                                      // render the first frame immediately
  _timer = setInterval(step, FRAME_MS);
}

function pause() {
  clearInterval(_timer);
  _timer = null;
  _playing = false;
  setButton(false);
}

function step() {
  if (_idx >= _frameDates.length) { finish(); return; }
  const date = _frameDates[_idx];
  state.activeFilters.asOfDate = date;
  syncDateInput(date);
  onFilterChange();
  updateOverlay(date);
  _idx++;
}

function finish() {
  clearInterval(_timer);
  _timer = null;
  _playing = false;
  setButton(false);
  // Land on the full, unfiltered dataset.
  state.activeFilters.asOfDate = null;
  syncDateInput(null);
  onFilterChange();
  setTimeout(() => document.getElementById('replay-overlay')?.setAttribute('hidden', ''), HOLD_MS);
}

// ── Overlay + counters ────────────────────────────────────────────────────────

function updateOverlay(date) {
  const dayNum = Math.round((Date.parse(date) - Date.parse(_minDate)) / DAY_MS) + 1;

  // Match the map's asOfDate rule exactly (applyFilters keeps articles with no
  // created date always), so the counter never disagrees with what's on screen.
  const present = (a) => !a.created || a.created <= date;

  const titles = new Set();
  let countries = 0;
  // Countries = UN members with ≥1 article by this date (the headline claim)
  for (const c of _data.countries) {
    let has = false;
    for (const a of c.articles) {
      if (present(a)) { titles.add(a.title); has = true; }
    }
    if (has) countries++;
  }
  // Include disputed territories' articles in the unique-article tally
  for (const c of _data.unrecognized) {
    for (const a of c.articles) {
      if (present(a)) titles.add(a.title);
    }
  }

  setText('replay-date', date);
  setText('replay-day', dayNum);
  setText('replay-articles', titles.size);
  setText('replay-countries', countries);
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function setButton(playing) {
  const btn = document.getElementById('btn-replay');
  if (!btn) return;
  btn.classList.toggle('playing', playing);
  btn.title = t(playing ? 'replay.pause' : 'replay.play');
  const play  = btn.querySelector('.replay-icon-play');
  const pauseI = btn.querySelector('.replay-icon-pause');
  if (play)   play.style.display   = playing ? 'none' : '';
  if (pauseI) pauseI.style.display = playing ? '' : 'none';
  const label = btn.querySelector('span');
  if (label) label.textContent = t(playing ? 'replay.pause' : 'replay.label');
}

function syncDateInput(date) {
  const input = document.getElementById('filter-date-input');
  if (input) {
    input.value = date || '';
    input.classList.toggle('active', !!date);
  }
  const clearBtn = document.getElementById('btn-clear-date');
  if (clearBtn) clearBtn.style.display = date ? '' : 'none';
  document.getElementById('filter-group-date')?.classList.toggle('active', !!date);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
