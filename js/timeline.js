// timeline.js — Chart.js cumulative timelines (CW awards + articles created)
import { t } from './i18n.js?v=18';
import { isDark, PROJECT_START } from './utils.js?v=18';

// ── Theme helpers ─────────────────────────────────────────────────────────────

function colors(accent) {
  const dark = isDark();
  return {
    line: dark ? accent.dark  : accent.light,
    fill: dark ? accent.darkFill : accent.lightFill,
    grid: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    tick: dark ? '#8899aa' : '#556677',
  };
}

const ACCENT_CW = {
  light: '#1a6bbf', lightFill: 'rgba(26,107,191,0.10)',
  dark:  '#4ea8ff', darkFill:  'rgba(78,168,255,0.15)',
};
const ACCENT_CREATED = {
  light: '#1a8f4b', lightFill: 'rgba(26,143,75,0.10)',
  dark:  '#3fcf7f', darkFill:  'rgba(63,207,127,0.15)',
};

const DEFAULT_FROM = PROJECT_START;  // charts default to the project kick-off

// ── Generic chart instance factory ───────────────────────────────────────────

function makeChartInstance({ canvasId, fromId, toId, resetId, labelKey, yAxisKey, tooltipKey, accent }) {
  let chart = null;
  let rawTimeline = [];

  function getColors() { return colors(accent); }

  function getFilteredByInputs() {
    const fromVal = document.getElementById(fromId)?.value;
    const toVal   = document.getElementById(toId)?.value;
    let filtered = rawTimeline;
    if (fromVal) filtered = filtered.filter(p => p.date >= fromVal);
    if (toVal)   filtered = filtered.filter(p => p.date <= toVal);
    return filtered.length > 0 ? filtered : rawTimeline;
  }

  function buildChart(timeline) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (chart) { chart.destroy(); chart = null; }

    const c = getColors();
    chart = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [{
          label: t(labelKey),
          data: timeline.map(p => ({ x: p.date, y: p.cumulative })),
          borderColor: c.line,
          backgroundColor: c.fill,
          fill: true,
          tension: 0.3,
          pointRadius: timeline.length < 60 ? 3 : 0,
          pointHoverRadius: 5,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'month', tooltipFormat: 'yyyy-MM-dd' },
            grid: { color: c.grid },
            ticks: { color: c.tick, maxTicksLimit: 12 },
          },
          y: {
            title: { display: true, text: t(yAxisKey), color: c.tick },
            grid: { color: c.grid },
            ticks: { color: c.tick, precision: 0 },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => items[0]?.label ?? '',
              label: item => `${t(tooltipKey)}: ${item.parsed.y}`,
            },
          },
        },
      },
    });
  }

  function updateChartData(timeline) {
    if (!chart) return;
    chart.data.datasets[0].data = timeline.map(p => ({ x: p.date, y: p.cumulative }));
    chart.data.datasets[0].pointRadius = timeline.length < 60 ? 3 : 0;
    chart.update();
  }

  function applyRange() { updateChartData(getFilteredByInputs()); }

  function resetRange() {
    const fromInput = document.getElementById(fromId);
    const toInput   = document.getElementById(toId);
    const lastDate  = rawTimeline.length ? rawTimeline[rawTimeline.length - 1].date : '';
    if (fromInput) fromInput.value = DEFAULT_FROM >= rawTimeline[0]?.date ? DEFAULT_FROM : rawTimeline[0]?.date;
    if (toInput)   toInput.value   = lastDate;
    updateChartData(getFilteredByInputs());
  }

  function wireControls() {
    if (!rawTimeline.length) return;
    const fromInput = document.getElementById(fromId);
    const toInput   = document.getElementById(toId);
    if (!fromInput || !toInput) return;

    const firstDate = rawTimeline[0].date;
    const lastDate  = rawTimeline[rawTimeline.length - 1].date;
    fromInput.min = firstDate;  fromInput.max = lastDate;
    toInput.min   = firstDate;  toInput.max   = lastDate;

    fromInput.value = DEFAULT_FROM >= firstDate ? DEFAULT_FROM : firstDate;
    toInput.value   = lastDate;

    fromInput.addEventListener('change', applyRange);
    toInput.addEventListener('change',   applyRange);
    document.getElementById(resetId)?.addEventListener('click', resetRange);
  }

  return {
    init(data) {
      rawTimeline = data || [];
      wireControls();
      buildChart(getFilteredByInputs());
    },
    applyTheme() { buildChart(getFilteredByInputs()); },
    updateLabels() {
      if (!chart) return;
      chart.data.datasets[0].label = t(labelKey);
      chart.options.scales.y.title.text = t(yAxisKey);
      const resetBtn = document.getElementById(resetId);
      if (resetBtn) resetBtn.textContent = t('timeline.reset');
      chart.update('none');
    },
  };
}

// ── Chart instances ───────────────────────────────────────────────────────────

const cwChart = makeChartInstance({
  canvasId: 'timeline-chart',
  fromId:   'timeline-from',
  toId:     'timeline-to',
  resetId:  'timeline-reset',
  labelKey:   'timeline.dataset',
  yAxisKey:   'timeline.yAxis',
  tooltipKey: 'timeline.tooltip',
  accent: ACCENT_CW,
});

const createdChart = makeChartInstance({
  canvasId: 'created-chart',
  fromId:   'created-from',
  toId:     'created-to',
  resetId:  'created-reset',
  labelKey:   'created.dataset',
  yAxisKey:   'created.yAxis',
  tooltipKey: 'created.tooltip',
  accent: ACCENT_CREATED,
});

// ── Public API ────────────────────────────────────────────────────────────────

export function init(cwTimeline, createdTimeline) {
  cwChart.init(cwTimeline);
  createdChart.init(createdTimeline);
}

export function update(_filteredData) {
  // Timelines are not filter-sensitive by design.
}

export function applyTheme() {
  cwChart.applyTheme();
  createdChart.applyTheme();
}

export function updateLabels() {
  cwChart.updateLabels();
  createdChart.updateLabels();
}
