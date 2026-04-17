// filters.js — editorial-action filter buttons + clear all
import { state, onFilterChange } from './app.js?v=11';
import { t } from './i18n.js?v=11';

// ── State ─────────────────────────────────────────────────────────────────────
let _rawData = null;

// ── Init ──────────────────────────────────────────────────────────────────────

export function init(rawData, filteredData) {
  _rawData = rawData;
  renderActionButtons(rawData);
  wireAwardButtons();
  wireNoAwardsButton();
  wireDateInput(rawData);
  wireClearButton();
  updateCounts(filteredData);
}

// ── Render action buttons dynamically ────────────────────────────────────────

function renderActionButtons(rawData) {
  const actionSet = new Set();
  const allArticles = [
    ...rawData.countries.flatMap(c => c.articles),
    ...rawData.unrecognized.flatMap(c => c.articles),
  ];
  for (const a of allArticles) {
    for (const action of a.editorialActions) actionSet.add(action);
  }

  const container = document.getElementById('filter-actions-buttons');
  container.innerHTML = '';

  const sortedActions = [...actionSet].sort((a, b) => {
    const aIsCee     = a.startsWith('cee');
    const bIsCee     = b.startsWith('cee');
    const aIsUnknown = a.startsWith('nieznanekobiety');
    const bIsUnknown = b.startsWith('nieznanekobiety');

    if (aIsCee !== bIsCee)         return aIsCee ? -1 : 1;
    if (aIsCee && bIsCee)          return a.localeCompare(b);
    if (aIsUnknown !== bIsUnknown) return aIsUnknown ? -1 : 1;
    if (aIsUnknown && bIsUnknown)  return a.localeCompare(b);

    return t(`actions.${a}`).localeCompare(t(`actions.${b}`));
  });

  for (const action of sortedActions) {
    const btn = document.createElement('button');
    btn.className = 'filter-btn action-btn';
    btn.dataset.action = action;

    const tag = document.createElement('span');
    tag.className = 'action-tag';
    tag.textContent = t(`actions.${action}`);
    btn.appendChild(tag);

    const countBadge = document.createElement('span');
    countBadge.className = 'filter-count';
    countBadge.dataset.actionCount = action;
    btn.appendChild(countBadge);

    btn.addEventListener('click', () => toggleAction(action));
    container.appendChild(btn);
  }
}

// ── Wire award filter buttons (static HTML) ───────────────────────────────────

function wireAwardButtons() {
  document.querySelectorAll('.award-btn[data-award]').forEach(btn => {
    btn.addEventListener('click', () => toggleAward(btn.dataset.award));
  });
}

function wireNoAwardsButton() {
  document.getElementById('btn-no-awards')?.addEventListener('click', toggleNoAwards);
}

// ── Wire date input ───────────────────────────────────────────────────────────

function wireDateInput(rawData) {
  const input = document.getElementById('filter-date-input');
  const clearBtn = document.getElementById('btn-clear-date');
  if (!input) return;

  // Set bounds from data
  const allDates = [
    ...rawData.countries.flatMap(c => c.articles),
    ...rawData.unrecognized.flatMap(c => c.articles),
  ].flatMap(a => [a.created, ...a.awards.map(aw => aw.date)]).filter(Boolean);
  if (allDates.length) {
    const sorted = allDates.slice().sort();
    input.min = sorted[0];
    input.max = sorted[sorted.length - 1];
  }

  function syncDateActive() {
    const active = !!input.value;
    clearBtn.style.display = active ? '' : 'none';
    input.classList.toggle('active', active);
    document.getElementById('filter-group-date')?.classList.toggle('active', active);
  }

  input.addEventListener('change', () => {
    state.activeFilters.asOfDate = input.value || null;
    syncDateActive();
    onFilterChange();
  });

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    state.activeFilters.asOfDate = null;
    syncDateActive();
    onFilterChange();
  });

  syncDateActive();
}

// ── Wire clear-all button ─────────────────────────────────────────────────────

function wireClearButton() {
  document.getElementById('btn-clear-filters')?.addEventListener('click', clearAll);
}

// ── Toggle handlers ───────────────────────────────────────────────────────────

function toggleAction(action) {
  const idx = state.activeFilters.editorialActions.indexOf(action);
  if (idx === -1) {
    state.activeFilters.editorialActions.push(action);
  } else {
    state.activeFilters.editorialActions.splice(idx, 1);
  }
  syncActiveStates();
  onFilterChange();
}

function toggleAward(award) {
  // Turning on a specific award clears "no awards"
  state.activeFilters.noAwards = false;
  const idx = state.activeFilters.awardTypes.indexOf(award);
  if (idx === -1) {
    state.activeFilters.awardTypes.push(award);
  } else {
    state.activeFilters.awardTypes.splice(idx, 1);
  }
  syncActiveStates();
  onFilterChange();
}

function toggleNoAwards() {
  state.activeFilters.noAwards = !state.activeFilters.noAwards;
  // Mutually exclusive: clear specific award type filters
  if (state.activeFilters.noAwards) {
    state.activeFilters.awardTypes = [];
  }
  syncActiveStates();
  onFilterChange();
}

function clearAll() {
  state.activeFilters.editorialActions = [];
  state.activeFilters.awardTypes = [];
  state.activeFilters.noAwards = false;
  state.activeFilters.search = '';
  state.activeFilters.continent = null;
  state.activeFilters.asOfDate = null;
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  const dateInput = document.getElementById('filter-date-input');
  if (dateInput) dateInput.value = '';
  const clearDateBtn = document.getElementById('btn-clear-date');
  if (clearDateBtn) clearDateBtn.style.display = 'none';
  syncActiveStates();
  onFilterChange();
}

// ── Sync active CSS classes ───────────────────────────────────────────────────

function syncActiveStates() {
  document.querySelectorAll('.action-btn[data-action]').forEach(btn => {
    btn.classList.toggle('active', state.activeFilters.editorialActions.includes(btn.dataset.action));
  });
  document.querySelectorAll('.award-btn[data-award]').forEach(btn => {
    btn.classList.toggle('active', state.activeFilters.awardTypes.includes(btn.dataset.award));
  });
  const noAwardsBtn = document.getElementById('btn-no-awards');
  if (noAwardsBtn) noAwardsBtn.classList.toggle('active', state.activeFilters.noAwards);
}

// ── Update article counts shown on each filter button ────────────────────────

export function updateCounts(filteredData) {
  if (!_rawData) return;

  const allRaw = [
    ..._rawData.countries.flatMap(c => c.articles),
    ..._rawData.unrecognized.flatMap(c => c.articles),
  ];
  const allFiltered = [
    ...filteredData.countries.flatMap(c => c.articles),
    ...filteredData.unrecognized.flatMap(c => c.articles),
  ];

  // Deduplicate by title — same article may appear in multiple countries
  const seenTitles = new Set();
  const uniqueFiltered = allFiltered.filter(a => {
    if (seenTitles.has(a.title)) return false;
    seenTitles.add(a.title);
    return true;
  });

  // Per-action counts: unique filtered articles with this action
  document.querySelectorAll('[data-action-count]').forEach(el => {
    const action = el.dataset.actionCount;
    const count = uniqueFiltered.filter(a => a.editorialActions.includes(action)).length;
    el.textContent = count > 0 ? `(${count})` : '';
  });

  // Award counts on award buttons — unique articles with this award type
  document.querySelectorAll('.award-btn[data-award]').forEach(btn => {
    const award = btn.dataset.award;
    const count = uniqueFiltered.filter(a => a.awards.some(w => w.type === award)).length;
    let countEl = btn.querySelector('.filter-count');
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.className = 'filter-count';
      btn.appendChild(countEl);
    }
    countEl.textContent = count > 0 ? `(${count})` : '';
  });

  // No-awards count: articles with zero awards in raw data (not filter-dependent)
  const noAwardsCount = allRaw.filter(a => a.awards.length === 0).length;
  const noAwardsCountEl = document.getElementById('btn-no-awards')?.querySelector('.filter-count');
  if (noAwardsCountEl) noAwardsCountEl.textContent = noAwardsCount > 0 ? `(${noAwardsCount})` : '';
}
