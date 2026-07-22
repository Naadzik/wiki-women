// search.js — debounced search input
import { state, onFilterChange } from './app.js?v=19';

const DEBOUNCE_MS = 220;
let _timer = null;

export function init() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      state.activeFilters.search = input.value;
      onFilterChange();
    }, DEBOUNCE_MS);
  });
}
