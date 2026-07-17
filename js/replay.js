// replay.js — "Replay the year" animation.
// Sweeps the existing as-of-date filter one calendar day at a time, so the
// audience watches the world map fill in day by day, with a live
// day/article/country counter and a draggable scrubber. Reuses
// applyFilters()'s asOfDate machinery — no new filtering logic.
import { state, onReplayFrame, onFilterChange } from './app.js?v=18';
import { t, tPlural } from './i18n.js?v=18';
import { PROJECT_START, setText } from './utils.js?v=18';

const DAY_MS       = 86_400_000;
const TARGET_MS    = 20_000;    // ~20s for the whole year at 1× speed
const MIN_FRAME_MS = 16;        // cap frame rate at ~60fps
const HOLD_MS      = 1800;      // keep the overlay up briefly after finishing

let _data       = null;
let _frameDates = [];   // one entry per calendar day, 'YYYY-MM-DD'
let _minDate    = null;
let _frameMs    = 40;   // base wall-clock per day, derived from TARGET_MS / #days
let _timer      = null;
let _endTimer   = null; // pending end-of-animation cleanup (cancelled on restart)
let _idx        = 0;
let _playing    = false;
let _speed      = 1;    // playback multiplier: 0.5 = 2× slower, 2 = 2× faster

// Drag scrubbing: rAF-throttled so fast mouse/touch movement doesn't queue up
// more map redraws than a frame can show.
let _seekRaf    = null;
let _pendingIdx = null;

export function init(data) {
  _data = data;
  const created = allCreatedDates(data);
  if (created.length < 2) return;
  const last = created[created.length - 1];
  // Start at the project kick-off; any earlier articles count as baseline at day 1.
  _minDate = created[0] < PROJECT_START ? PROJECT_START : created[0];
  if (_minDate >= last) _minDate = created[0];   // safety fallback
  _frameDates = buildDailyFrames(_minDate, last);
  // Pace the whole year to ~TARGET_MS, but never faster than MIN_FRAME_MS/day.
  _frameMs = Math.max(MIN_FRAME_MS, Math.round(TARGET_MS / _frameDates.length));

  document.getElementById('btn-replay')?.addEventListener('click', toggle);
  document.getElementById('replay-close')?.addEventListener('click', close);
  document.querySelectorAll('#replay-speed .speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setSpeed(parseFloat(btn.dataset.speed)));
  });

  const slider = document.getElementById('replay-slider');
  if (slider) {
    slider.min = 0;
    slider.max = _frameDates.length - 1;
    slider.value = 0;
    // Grabbing the thumb pauses auto-advance immediately, before any drag
    // delta, so playback and the drag never fight over the current day.
    slider.addEventListener('pointerdown', () => { if (_playing) pause(); });
    slider.addEventListener('input', onSliderInput);
    slider.addEventListener('change', onSliderChange);
  }
  setText('replay-scrub-start', _minDate);
  setText('replay-scrub-end', last);
}

/** Change playback speed; takes effect immediately, even mid-animation. */
function setSpeed(s) {
  _speed = s;
  document.querySelectorAll('#replay-speed .speed-btn').forEach(b => {
    b.classList.toggle('active', parseFloat(b.dataset.speed) === s);
  });
  if (_playing) {
    clearInterval(_timer);
    _timer = setInterval(step, _frameMs / _speed);
  }
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

function buildDailyFrames(min, max) {
  const d0 = Date.parse(min), d1 = Date.parse(max);
  const frames = [];
  for (let t = d0; t <= d1; t += DAY_MS) frames.push(isoDate(t));
  if (frames[frames.length - 1] !== max) frames.push(max);   // land exactly on the last date
  return frames;
}

function clampIdx(i) {
  return Math.min(Math.max(i, 0), _frameDates.length - 1);
}

function syncSlider(idx) {
  const slider = document.getElementById('replay-slider');
  if (slider) slider.value = idx;   // programmatic — does not fire input/change
}

// ── Playback ──────────────────────────────────────────────────────────────────

export function toggle() {
  _playing ? pause() : play();
}

function play() {
  if (!_frameDates.length) return;
  // Restarting within the end-hold must cancel the pending cleanup, or it
  // would fire mid-play and yank the banner/layout out from under us.
  clearTimeout(_endTimer);
  _endTimer = null;
  _playing = true;
  setButton(true);
  // Hide the continent bar while active so the countdown banner takes its
  // slot instead of adding height and pushing the map off-screen.
  document.body.classList.add('replaying');
  if (_idx >= _frameDates.length) _idx = 0;   // restart when finished
  document.getElementById('replay-overlay')?.removeAttribute('hidden');
  syncSlider(_idx);
  step();                                      // render the first frame immediately
  _timer = setInterval(step, _frameMs / _speed);
}

/** Stop auto-advance but keep the overlay + scrubber visible at the current day. */
function pause() {
  clearInterval(_timer);
  _timer = null;
  _playing = false;
  setButton(false);
  // Settle the full UI (panel list, filter counts, date input) to the paused
  // day, since per-frame updates only touched the map + stats for smoothness.
  syncDateInput(state.activeFilters.asOfDate);
  onFilterChange();
}

/** Fully exit replay mode: stop, show the complete dataset, restore the layout. */
function close() {
  clearInterval(_timer);
  _timer = null;
  clearTimeout(_endTimer);
  _endTimer = null;
  _playing = false;
  _idx = 0;   // next "play" starts fresh from day 1
  setButton(false);
  state.activeFilters.asOfDate = null;
  syncDateInput(null);
  onFilterChange();
  document.getElementById('replay-overlay')?.setAttribute('hidden', '');
  document.body.classList.remove('replaying');
}

function step() {
  if (_idx >= _frameDates.length) { finish(); return; }
  const date = _frameDates[_idx];
  state.activeFilters.asOfDate = date;
  onReplayFrame();          // lightweight: map + stats only, so day-by-day stays smooth
  updateOverlay(date);
  syncSlider(_idx);
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
  // Keep the continent bar hidden until the banner fades, so the two swap
  // together and the map never gets pushed during the final hold. The
  // scrubber (still at its max position) stays draggable during the hold.
  _endTimer = setTimeout(() => {
    document.getElementById('replay-overlay')?.setAttribute('hidden', '');
    document.body.classList.remove('replaying');
    _endTimer = null;
  }, HOLD_MS);
}

// ── Scrubber drag handling ──────────────────────────────────────────────────────

/** Jump directly to a day. `settle=false` is a cheap live-preview during drag. */
function seekTo(idx, settle) {
  _idx = clampIdx(idx);
  const date = _frameDates[_idx];
  state.activeFilters.asOfDate = date;
  updateOverlay(date);
  if (settle) {
    syncDateInput(date);
    onFilterChange();
  } else {
    onReplayFrame();
  }
}

function onSliderInput(e) {
  if (_playing) pause();   // covers keyboard (arrow/Home/End) interaction too
  _pendingIdx = parseInt(e.target.value, 10);
  if (_seekRaf) return;
  _seekRaf = requestAnimationFrame(() => {
    _seekRaf = null;
    if (_pendingIdx !== null) { seekTo(_pendingIdx, false); _pendingIdx = null; }
  });
}

function onSliderChange(e) {
  if (_seekRaf) { cancelAnimationFrame(_seekRaf); _seekRaf = null; }
  seekTo(parseInt(e.target.value, 10), true);
  _pendingIdx = null;
}

// ── Overlay + counters ────────────────────────────────────────────────────────

function updateOverlay(date) {
  const dayNum = Math.round((Date.parse(date) - Date.parse(_minDate)) / DAY_MS) + 1;

  // Match the map's asOfDate rule exactly so the counter never disagrees with
  // what's on screen. In "By awards" colour mode the map only colours awarded
  // countries, so count only articles that are awarded by this date; otherwise
  // count every article that exists by this date (null created = always present).
  const awardsMode = state.colorMode === 'awards';
  const createdBy = (a) => !a.created || a.created <= date;
  const present = awardsMode
    ? (a) => createdBy(a) && a.awards.some(aw => !aw.date || aw.date <= date)
    : createdBy;

  // When a continent is selected, the map is scoped to it — scope the counters
  // to match (same rule applyFilters uses: keep only countries in the iso3 set).
  const cont = state.activeFilters.continent;   // null | Set<iso3>
  const inScope = (c) => !cont || (c.iso3 && cont.has(c.iso3));

  const titles = new Set();
  let countries = 0;
  // Countries = UN members with ≥1 article by this date (the headline claim)
  for (const c of _data.countries) {
    if (!inScope(c)) continue;
    let has = false;
    for (const a of c.articles) {
      if (present(a)) { titles.add(a.title); has = true; }
    }
    if (has) countries++;
  }
  // Include disputed territories' articles in the unique-article tally
  for (const c of _data.unrecognized) {
    if (!inScope(c)) continue;
    for (const a of c.articles) {
      if (present(a)) titles.add(a.title);
    }
  }

  setText('replay-date', date);
  setText('replay-day', dayNum);
  setText('replay-articles', titles.size);
  setText('replay-countries', countries);
  setText('replay-count-label', tPlural(awardsMode ? 'count.awarded' : 'count.article', titles.size));
  setText('replay-countries-label', tPlural('count.country', countries));
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
