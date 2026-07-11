// i18n.js — EN/PL translations + t() helper

const TRANSLATIONS = {
  en: {
    'header.title':        'Women in Politics — Wikipedia',
    'header.titleHtml':    'Women in politics on Polish Wikipedia by <a href="https://meta.wikimedia.org/wiki/User:Nadzik" target="_blank" rel="noopener">User:Nadzik</a>',
    'header.subtitle':     '365 days · one biography from every country in the world',

    'stats.articles':      'Articles',
    'stats.countries':     'Countries',
    'stats.coverage':      'UN coverage',
    'stats.cw':            'Did You Know',
    'stats.da':            'Good Article',
    'stats.anm':           'Featured',
    'stats.firstWomen':    'First women',
    'stats.firstWomenTitle': 'Women who were the first in their country to hold their role — click to filter',

    'map.colorByArticles': 'By articles',
    'map.colorByAwards':   'By awards',
    'map.additionalNote':  'Some disputed territories are listed separately.',
    'map.showAll':         'Show all →',
    'legend.none':         '0',
    'legend.articles':     'articles / country',
    'legend.awards':       'awards / country',

    'replay.label':        'Replay the year',
    'replay.play':         'Replay the year',
    'replay.pause':        'Pause',
    'replay.speed':        'Animation speed',
    'replay.day':          'day',
    'replay.articles':     'articles',
    'replay.countries':    'countries',

    'filters.firstWomen':  'First woman in role',

    'panel.noCountry':         'Click a country to see articles',
    'panel.countriesTitle':    'Countries by articles',
    'panel.sortByArticles':    'By articles',
    'panel.sortByCw':          'By Did You Know',
    'panel.draft':             'draft',
    'panel.firstWoman':        'First woman in this role in her country',
    'panel.unrecognizedTitle': 'Disputed territories',
    'panel.article':           'article',
    'panel.articles':          'articles',

    'search.placeholder':  'Search articles…',

    'filters.editorialActions': 'Editorial actions',
    'filters.awardTypes':       'Awards',
    'filters.noAwards':         'No awards',
    'filters.search':           'Search',
    'filters.asOfDate':         'As of date',
    'filters.clearAll':         'Clear all',

    'awards.cw':  'Did You Know',
    'awards.da':  'Good Article',
    'awards.anm': 'Featured Article',

    'actions.tygodnietematyczne':   'Thematic Weeks',
    'actions.cee2020':              'CEE Spring 2020',
    'actions.cee2024':              'CEE Spring 2024',
    'actions.cee2025':              'CEE Spring 2025',
    'actions.cee2026':              'CEE Spring 2026',
    'actions.noblistki':            'Nobel Laureates',
    'actions.nieznanekobiety2025':  '(Un)known Women 2025',
    'actions.nieznanekobiety2026':  '(Un)known Women 2026',
    'actions.wikilovespride2025':   'Wiki Loves Pride 2025',

    'timeline.title':   'Awards over time — cumulative "Did You Know"',
    'timeline.dataset': 'Did You Know articles',
    'timeline.yAxis':   'Articles',
    'timeline.tooltip': 'Total',
    'timeline.reset':   'Reset',

    'created.title':   'Articles created over time',
    'created.dataset': 'Articles created',
    'created.yAxis':   'Articles',
    'created.tooltip': 'Total',
    'created.reset':   'Reset',

    'continents.europe':        'Europe',
    'continents.africa':        'Africa',
    'continents.north_america': 'North America',
    'continents.south_america': 'South America',
    'continents.asia':          'Asia',
    'continents.oceania':       'Oceania',
    'continents.antarctica':    'Antarctica',

    'footer.project': '"Around the World" project',
    'footer.cw':      'Did You Know — Wikipedia',
  },
  pl: {
    'header.title':        'Kobiety w polityce — Wikipedia',
    'header.titleHtml':    'Kobiety w polityce na polskojęzycznej Wikipedii by <a href="https://pl.wikipedia.org/wiki/Wikipedysta:Nadzik" target="_blank" rel="noopener">Wikipedysta:Nadzik</a>',
    'header.subtitle':     '365 dni · jeden biogram z każdego kraju świata',

    'stats.articles':      'Artykuły',
    'stats.countries':     'Państwa',
    'stats.coverage':      'Pokrycie ONZ',
    'stats.cw':            'Czy wiesz',
    'stats.da':            'Dobry artykuł',
    'stats.anm':           'Artykuł na medal',
    'stats.firstWomen':    'Pierwsze kobiety',
    'stats.firstWomenTitle': 'Kobiety, które jako pierwsze w swoim kraju pełniły daną funkcję — kliknij, by filtrować',

    'map.colorByArticles': 'Wg artykułów',
    'map.colorByAwards':   'Wg wyróżnień',
    'map.additionalNote':  'Niektóre sporne terytoria są wylistowane oddzielnie.',
    'map.showAll':         'Pokaż wszystkie →',
    'legend.none':         '0',
    'legend.articles':     'artykuły / kraj',
    'legend.awards':       'wyróżnienia / kraj',

    'replay.label':        'Odtwórz rok',
    'replay.play':         'Odtwórz rok',
    'replay.pause':        'Pauza',
    'replay.speed':        'Prędkość animacji',
    'replay.day':          'dzień',
    'replay.articles':     'artykułów',
    'replay.countries':    'państw',

    'filters.firstWomen':  'Pierwsza kobieta na stanowisku',

    'panel.noCountry':         'Kliknij kraj, by zobaczyć artykuły',
    'panel.countriesTitle':    'Państwa wg artykułów',
    'panel.sortByArticles':    'Wg artykułów',
    'panel.sortByCw':          'Wg Czy wiesz',
    'panel.draft':             'szkic',
    'panel.firstWoman':        'Pierwsza kobieta na tym stanowisku w swoim kraju',
    'panel.unrecognizedTitle': 'Sporne terytoria',
    'panel.article':           'artykuł',
    'panel.articles':          'artykuły/artykułów',

    'search.placeholder':  'Szukaj artykułów…',

    'filters.editorialActions': 'Akcje edycyjne',
    'filters.awardTypes':       'Wyróżnienia',
    'filters.noAwards':         'Bez wyróżnień',
    'filters.search':           'Szukaj',
    'filters.asOfDate':         'Stan na dzień',
    'filters.clearAll':         'Wyczyść',

    'awards.cw':  'Czy wiesz',
    'awards.da':  'Dobry artykuł',
    'awards.anm': 'Artykuł na medal',

    'actions.tygodnietematyczne':   'Tygodnie tematyczne',
    'actions.cee2020':              'CEE Spring 2020',
    'actions.cee2024':              'CEE Spring 2024',
    'actions.cee2025':              'CEE Spring 2025',
    'actions.cee2026':              'CEE Spring 2026',
    'actions.noblistki':            'Noblistki',
    'actions.nieznanekobiety2025':  '(Nie)znane Kobiety 2025',
    'actions.nieznanekobiety2026':  '(Nie)znane Kobiety 2026',
    'actions.wikilovespride2025':   'Wiki Loves Pride 2025',

    'timeline.title':   'Wyróżnienia w czasie — kumulatywne „Czy wiesz"',
    'timeline.dataset': 'Artykuły „Czy wiesz"',
    'timeline.yAxis':   'Artykuły',
    'timeline.tooltip': 'Suma',
    'timeline.reset':   'Resetuj',

    'created.title':   'Artykuły tworzone w czasie',
    'created.dataset': 'Utworzone artykuły',
    'created.yAxis':   'Artykuły',
    'created.tooltip': 'Suma',
    'created.reset':   'Resetuj',

    'continents.europe':        'Europa',
    'continents.africa':        'Afryka',
    'continents.north_america': 'Ameryka Północna',
    'continents.south_america': 'Ameryka Południowa',
    'continents.asia':          'Azja',
    'continents.oceania':       'Australia i Oceania',
    'continents.antarctica':    'Antarktyda',

    'footer.project': 'Projekt „Dookoła świata"',
    'footer.cw':      'Czy wiesz — Wikipedia',
  },
};

let _lang = 'en';

export function init(lang) {
  _lang = lang in TRANSLATIONS ? lang : 'en';
}

export function getLang() {
  return _lang;
}

/** Translate a key, falling back to English, then to the key itself. */
export function t(key) {
  return TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

/** Re-render all static [data-i18n] elements in the document. */
export function applyToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.title = t('header.title');
}
