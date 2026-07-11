> **Implementation status (this branch).** The recommended pre-talk scope has been
> built and browser-tested (projector resolutions, both themes, EN/PL, and a
> fully offline network). Shipped: **#1** vendored CDN deps (app now runs with zero
> internet), **#2** live landing-page stats, **#3** bilingual landing page, **#4**
> `?lang`/`?theme` URL overrides, **#5** replay-the-year animation, **#6** presentation
> mode (`P` / `?present`), **#7** first-woman stat + filter, **#11** micro-state dots +
> country-name search, **#13** dark-mode choropleth fix, **#14** legend labels, **#15**
> header subtitle, **#17** unified cache-bust version + a latent language-switch crash
> fixed. Still open (heavier / needs assets or decisions): **#8** deep-link hash state,
> **#9** OpenGraph preview image (meta tags added; image still needed), **#10** SVG
> flags for Windows, **#16** French locale, PL plural rules, and regenerating the data
> file right before the conference. See the table at the end for the full list.

# Wikimania 2026 presentation-readiness proposal

Changes to make this app the best possible live demo for the Wikimania 2026 session
**"365 days, 365 women: one biography from every country in the world"** (Paris, July 2026),
and a good landing experience for Wikimedians who scan the link during/after the talk.

Findings come from a code review plus a browser test run at projector resolutions
(1920×1080 and 1280×720), in both themes, English and Polish, including a simulated
"no CDN access" network — the exact failure mode of conference Wi-Fi.

Priorities: **P0 = do before the talk**, **P1 = high impact for the talk itself**,
**P2 = for the audience following along on their phones**, **P3 = polish**.

---

## P0 — Demo reliability

### 1. Vendor all CDN dependencies locally (critical)
`app.html` loads D3, topojson-client, Chart.js and the date adapter from
`cdn.jsdelivr.net`, and `js/map.js` fetches the world geometry
(`world-atlas@2/countries-110m.json`) from the same CDN at runtime.

**Verified:** with that single host unreachable, the app is an infinite spinner —
no map, no charts, console shows `ReferenceError: d3 is not defined`. Conference
Wi-Fi failing or throttling exactly this kind of third-party host is the classic
live-demo killer, and there is no fallback.

Fix: commit the five files into `vendor/` (≈ 1 MB total) and point `app.html` and
`map.js` at local paths:

| CDN file | Local path |
|---|---|
| `d3@7/dist/d3.min.js` | `vendor/d3.min.js` |
| `topojson-client@3/dist/topojson-client.min.js` | `vendor/topojson-client.min.js` |
| `chart.js@4/dist/chart.umd.min.js` | `vendor/chart.umd.min.js` |
| `chartjs-adapter-date-fns@3/…bundle.min.js` | `vendor/chartjs-adapter-date-fns.bundle.min.js` |
| `world-atlas@2/countries-110m.json` | `data/countries-110m.json` |

Since `data/wikiwomen.json` is already local, this makes the whole app fully
offline-capable: clone the repo on the presentation laptop, run any static server,
and the demo works with zero internet. Effort: ~30 min, no design changes.

### 2. Fix (or automate) the stale landing-page numbers
`index.html` hardcodes **415 articles / 231 wyróżnień**, while `data/wikiwomen.json`
currently contains **455 unique articles / 234 Did You Know / 2 Good Articles**, and the
app header displays those live numbers. A room full of Wikimedians *will* notice the
mismatch between the landing page and the app one click later — awkward for a talk whose
"Fiabilité" angle is sourcing rigor.

Fix: fetch `data/wikiwomen.json` from `index.html` and fill the stats + award chips
dynamically (a 15-line inline script), so they can never go stale again. The
"Dane aktualne" badge should show the real `meta.generatedAt` date.

### 3. Make the landing page bilingual (or default English)
`index.html` is Polish-only, but the session audience is international and the
invitation explicitly targets editors from other wikis. Reuse the app's i18n pattern
(or simply mirror the page with an EN/PL toggle in the nav). The app itself already
defaults to English — only the front door doesn't.

### 4. URL overrides for language and theme
`app.js` reads `ww-lang` / `ww-dark` from `localStorage`, so the app opens in whatever
state it was last used in — on stage that could be Polish dark mode from your own testing.
Support query params that win over localStorage, e.g.:

```
app.html?lang=en&theme=light
```

Then the link on your slide / QR code deterministically opens English + light for
every attendee, regardless of their previous visits. ~10 lines in `boot()`.

---

## P1 — Storytelling features for the talk itself

### 5. "Replay the year" animation (the wow moment)
The single most impactful addition. The as-of-date filter (`asOfDate` in
`applyFilters()`) already reconstructs the map at any historical date — all that is
missing is a ▶ button that sweeps the date from March 2025 to the end and animates
the world filling in, day by day, with a live counter overlay:

> **Day 214 · 233 articles · 121 countries**

This *is* the talk — "365 days, one biography from every country" told visually in
20 seconds. Implementation: a `setInterval` advancing `state.activeFilters.asOfDate`
+ the existing `onFilterChange()`, throttled to ~25 ms/day, plus a big overlay div.
The map already transitions fills over 350 ms, so it will look smooth for free.
Effort: half a day including polish (pause/scrub, speed control optional).

### 6. Presentation mode (back-of-room legibility)
At 1080p the stat-bar labels, filter chips, legend and panel text are 11–13 px —
unreadable past the third row. Add `?present` (or a keyboard toggle, e.g. `P`) that:

- scales the header stats to roughly double size,
- enlarges map tooltips and the legend,
- hides the filter/search section until needed (it can stay one keypress away),
- bumps the side-panel font size.

Mostly a `body.present` class + one CSS block. Keep light theme for projectors —
washed-out projectors handle dark UIs badly (see also #13).

### 7. Surface the "first woman in role" stories
`isFirstWoman` exists per article and renders a small marker in the panel, but there is
no global stat or filter for it. For this audience (systemic bias, Équité) it's a
headline number, not a footnote:

- add a stat chip: **"N first women in their country's history"**,
- add a filter button next to the award filters,
- optionally a map highlight mode.

The data is already there; this is filter + stats plumbing (~2–3 h).

### 8. Shareable/pre-stageable URL state (deep links)
Encode active filters, selected country and continent zoom into the URL hash
(`#country=TUV`, `#action=cee2025`, `#date=2025-12-31`). Two wins:

- **for the talk:** prepare exact map states as browser tabs — "slides" you can jump
  between instantly instead of live-clicking under time pressure;
- **for the audience:** attendees can share a filtered view of their own country.

Effort: ~half a day (serialize on `onFilterChange`, parse in `boot()`).

---

## P2 — The QR moment (audience on their phones)

### 9. Link unfurls + QR
Add OpenGraph/Twitter meta tags with a static map screenshot to `index.html` and
`app.html`, so the link posted in Telegram/Slack/Mastodon during the talk unfurls with
the map image instead of bare text. Commit the screenshot to the repo. Put a QR code
on your closing slide pointing at `app.html?lang=en`.

### 10. Flag emoji fallback on Windows (real risk)
`panel.js` builds country flags from regional-indicator emoji. **Windows renders no flag
emoji at all** — Chrome/Edge on Windows shows letter pairs like `GB` `FR` instead. Many
attendees, and possibly the venue PC, run Windows. Replace emoji with SVG flags (e.g. a
local copy of [flag-icons](https://github.com/lipis/flag-icons), used offline per #1) or
render via Twemoji. The `ISO3_TO_ISO2` table already provides the codes needed.

### 11. Make microstates and island nations findable (this is your headline!)
The talk's core claim is *every* country — but at 110 m map resolution the countries
that make the claim impressive (Vatican, Monaco, San Marino, Tuvalu, Nauru, the
Caribbean islands…) are near-invisible, hover-only and essentially unclickable,
especially on phones. Two complementary fixes:

- **dot markers**: render a small clickable circle for any country whose projected
  area falls below a pixel threshold (D3 `path.area()` makes this easy);
- **country search**: the search box currently matches article titles only
  (`applyFilters()` in `app.js`); extend it to also match `namePolish`/`nameEnglish`
  so typing "Tuvalu" finds the country.

Then "let me show you Tuvalu" works live, on stage, first try.

### 12. Quick mobile QA pass
Media queries exist (`style.css` 700/480 px) and the layout stacks, but before the talk
verify on a real phone: tap targets on the map, the panel scroll behavior, and the date
inputs. Tooltips are hover-only — fine, since tap already opens the panel.

---

## P3 — Polish

### 13. Dark-mode choropleth inverts perception
In dark mode the highest-value countries (UK, Italy, France) render nearly **black on a
black background** — the best countries look like holes in the map (verified in
screenshots). `articlesColor()` uses `interpolateBlues` regardless of theme. In dark
mode either reverse the ramp (low = dark, high = bright) or switch to a brighter
interpolator. If you present in light mode this doesn't block the talk, but attendees
who open the app on their phones at night will see it.

### 14. Label the legend
The legend is an unlabeled `0 ▓▓▓ 21` gradient. Add "articles per country" /
"awards per country" (i18n keys already switch with mode) and enlarge it in
presentation mode.

### 15. Put the talk's framing in the app header
The header reads "Women in politics on Polish Wikipedia by User:Nadzik". Add the
one-line hook as a subtitle (the `header.subtitle` i18n key already exists but is
unused in the layout):

> *365 days · 365+ biographies · every country in the world*

Also consider annotating the "Articles created over time" chart — it is a strikingly
straight "one per day" line; a dashed 1/day reference line plus start/end date
annotations turns it into self-explanatory evidence of the cadence.

### 16. Add French
Wikimania is in Paris and the theme is *Liberté, Équité, Fiabilité* — a FR locale is a
charming, cheap gesture. `i18n.js` is a flat key map; adding `fr` is translation work
only (~80 strings), no code changes.

### 17. Small nits
- `js/*.js` import each other with `?v=11` while `app.html` loads `app.js?v=13` — the
  same modules can be fetched twice under two URLs; unify the cache-busting version.
- PL plural in the panel shows both forms: `"artykuły/artykułów"` — use proper plural
  rules (`1 artykuł / 2–4 artykuły / 5+ artykułów`).
- Regenerate `data/wikiwomen.json` right before the conference (`meta.generatedAt` is
  currently 2026-05-27) so late Did You Know awards are included.

---

## Suggested order of work

| # | Item | Effort | Payoff |
|---|------|--------|--------|
| 1 | Vendor CDN deps (offline-proof demo) | 30 min | Insurance against the #1 live-demo failure |
| 2 | Landing page stats from data JSON | 1 h | Credibility |
| 4 | `?lang`/`?theme` URL overrides | 30 min | Deterministic demo start |
| 5 | Replay-the-year animation | ½–1 day | The wow moment of the talk |
| 6 | Presentation mode (big fonts) | 2–3 h | Back-of-room legibility |
| 11 | Microstate dots + country search | ½ day | Makes the "every country" claim demoable |
| 7 | "First woman" stat + filter | 2–3 h | Strong Équité talking point |
| 3 | EN landing page | 2 h | International front door |
| 10 | SVG flags | 2 h | Windows attendees |
| 8 | Deep-linkable state | ½ day | Prepared "slides", shareable views |
| 9, 12–17 | Unfurls, QA, polish | as time allows | |

A realistic pre-talk cut: **items 1, 2, 4, 5, 6, 11** — one focused day of work, and the
demo is both failure-proof and built around the story you're telling.

## Presentation checklist (not app changes)

- Clone the repo to the presentation laptop and test fully offline (after #1).
- Record a 30-second screen capture of the replay animation as a fallback video.
- Open prepared tabs: world view → replay → Tuvalu/Vatican → a country panel with
  Did You Know badges → the created-over-time chart.
- Test the venue projector against light mode; keep browser zoom (Ctrl/Cmd +) as a
  manual fallback if presentation mode isn't ready.
