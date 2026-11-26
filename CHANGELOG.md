# Changelog

## 3.7.0 — 2026-11-26

### Added — the Reader speaks Hindi and Gujarati, and its dwell clock stops when you leave

- **The Reader view is localised** (51 new keys; the catalogue is now **135 keys × 3
  languages**): the whole toolbar — bookmark/favourite, highlight, read aloud, print,
  contents, focus, dim, spacing, width — with its `aria-label`s and titles; the
  Reflection, Exercise, Your notes and Daily practice headings; the note placeholder and
  its Markdown hint; the four daily-practice labels; "Mark chapter complete"; previous
  and next; the contents panel and its close button; and the five aside headings with
  their empty states.
- **The visible label and the `aria-label` are the same string**, so a screen reader is
  told what the button says rather than what it said in English. The suite asserts they
  agree for every toolbar control, in both languages.
- **The three cycling controls carry one key per state** — "Dim: on"/"Dim: off", three
  spacings, three widths — rather than a stem with the state word glued on: a translator
  handed "Spacing: " alone cannot know whether an adjective, a noun or a case-marked word
  follows, and the state word is the part that carries the meaning.
- **The favourite toggle no longer hard-codes its own label** when it re-labels itself
  after a click, and its live-region announcement is translated too.
- **Deleted the dead `function renderReader`** that `renderReader = function` overwrote on
  the very first render: 207 shadowed lines still holding a full set of hard-coded English
  labels — the copy a search-and-translate pass would have found first. The same defect
  the Library had in 3.6.0, one view along. The suite asserts one implementation and no
  shadowing function.
- **The dwell clock stops when you leave the Reader.** `renderReader` set a 20 s interval
  that was only ever replaced, never cleared, so it kept counting time against a chapter
  that was no longer on screen for the rest of the session — and kept a headless window's
  event loop alive after the suite had finished. The suite now exits explicitly, as
  `smoke.test.js` always has.
- `tests/i18n.test.js` **96 → 125 assertions**; **8 mutations, all 8 red**.

## 3.6.0 — 2026-11-24

### Added — the Library speaks Hindi and Gujarati, and says progress in words

- **The Library view is localised.** The heading, the lede, the two section titles,
  the worksheets and knowledge-graph lines and their calls to action, the per-book
  counts and the chapter time cell all come from the catalogue through
  `t("key","English")`. 14 new keys; the catalogue is now **84 keys × 3 languages**.
- **The chapter count has a singular.** A book with one chapter says "1 chapter", not
  "1 chapters", in every language — the branch is exercised by a fixture that gives the
  source a one-chapter book, not left to be noticed in production.
- **Chapter progress is a word, not only a colour.** Every chapter row now carries a
  visually-hidden status word — Complete / In progress / Not started — beside a pip that
  is `aria-hidden`. Before this, a screen reader heard the chapter title and nothing
  about progress, and a colour-blind reader had the same gap.
- **An empty chapter list says so.** A book whose chapters are missing rendered an empty
  `<ul>` and a card linking to `#/reader/`, which the router resolves to another book's
  first chapter. It now renders a translated empty state, and the card's link is built
  from a guarded first chapter.

### Fixed

- **A dead `renderLibrary` was deleted.** The file held a `function renderLibrary(){…}`
  at line 1848 that a later `renderLibrary = function(){…}` overwrote. The dead copy was
  the one that hard-coded "Part I — Foundations" and its own English strings, so a
  search-and-translate pass would have localised a function nothing calls. The suite now
  asserts there is exactly one implementation and no shadowing `function`.

### Not claimed

- Authored content — book titles, descriptions, chapter titles and part headings — is
  still the book's own language. Translating it is an authoring job, not a catalogue one.
- Six views remain English: Reader, Journal, Trackers, Challenges, Insights, Settings,
  plus modals, toasts and the export/preview surfaces.

## 3.5.0 — 2026-11-21

### Added — the Today screen speaks Hindi and Gujarati

- **The landing screen is localised end to end.** Every string the Today view builds
  now comes from the catalogue through `t("key","English")`: the page title and lede,
  the streak ribbon and its day counter, the Review and Continue-reading buttons, the
  mission / reading-progress / review-queue widgets, the active-challenge card and its
  empty state, the reading-goal bar and its three messages, the resume banner, the four
  section titles, both empty states, and the shortcut line. 47 new keys; the catalogue
  is now **70 keys × 3 languages**.
- **`t()` is now a declaring site in practice, not only in the tool.** The extraction
  pass already read call sites; nothing used it beyond the sidebar's empty state. The
  views can be localised without a new tool, which is what `docs/I18N.md` had said was
  missing — it was the *use* that was missing.
- **The Today view re-renders when the language changes.** `setLang()` already called
  `render()`; the suite now proves the view changes in place, with the hash unchanged,
  so a reader does not have to navigate away and back.
- **The orphan check reads the source instead of a hand-list.** `tests/i18n.test.js`
  used to whitelist two call-site keys by name; it now scans `t("key","English")` out of
  the same script the app runs, so a key cannot become "orphaned" merely because a view
  was localised. 63 assertions (was 44).

### Fixed

- A stale-node bug in the new test itself, caught on its first run: `render()` replaces
  `#main`'s children, so a captured element goes dead the moment the language changes.
  The assertions re-query instead.

### Not claimed

- Seven views are still English — Library, Reader, Journal, Trackers, Challenges,
  Insights, Settings — plus modals, toasts and the export/preview surfaces. The pattern
  is proven; the remaining work is the same three steps per view.

## 3.4.0 — 2026-11-19

### Added — the interface speaks Hindi and Gujarati

- **The shell is localised**: the sidebar brand subtitle, the "Recent" heading and its
  empty state, the search hint and placeholder, the skip link, and every ARIA label
  (primary navigation, breadcrumb, menu, theme, search, language). A language selector
  sits under the sidebar; the choice persists with the rest of the settings and
  `<html lang>` follows it.
- **`tools/extract-strings.py`** — the extraction step the roadmap named. The English is
  read **out of the source** (`data-i18n`, `data-i18n-attr`, the nav table, and
  `t("key","English")` call sites) and the catalogues are generated from it, so a
  string cannot be translated in one place and stale in another. `--check` fails on a
  declared key with no entry, an entry nothing declares, a language missing a key, a
  value identical to the English (the failure mode where a language ships and changes
  nothing), an empty value, and an inline block that is stale or hand-edited.
- **`src/locales/{en,hi,gu}.json`** and the `<script id="i18n-data">` runtime catalogue
  that the single file actually carries.
- **`tests/i18n.test.js`** — 44 assertions driving the real app: the catalogue is
  complete in both directions, switching language changes the navigation, sidebar,
  search hint, placeholder, breadcrumb and ARIA labels, `<html lang>` follows, the
  choice survives a reload, an unknown language is refused without losing the current
  one, and a key missing from Hindi falls back to English and then to the caller's own
  literal rather than to a raw key. Mutation-checked four ways (drop the literal
  fallback; stop re-applying on switch; stop translating attributes; accept any
  language) — each turns the suite red.

### Fixed

- The language selector did not follow a programmatic change of language: `setLang()`
  updated the app and the storage but left the `<select>` showing the previous value.
  Found by the new suite, not by reading the code.

### Changed

- `npm test` now runs the i18n suite too, and CI runs
  `python3 tools/extract-strings.py --check` before it.
- The README's testing note said the smoke suite had "30 checks"; it has 44.

## 0.0.1 — 2026-11-16

- # Reading goals **Behaviour change:** Today's Reading Progress widget gains an optional weekly target, and Settings gains the control for it. - `state.settings.readingGoal` — minutes per week, `0` = off (the default, so no existing save changes appearance until the owner sets one). - `currentWeekKeys()` / `weeklyReadingMinutes()` / `readingGoalMinutes()` / `readingGoalView()` in `src/index.html`. Monday-start week, from `state.readingLog`. - `tests/smoke.test.js` — 7 assertions: off by default, control present, target persists, week total (not today's), out-of-week minutes excluded, met goal is not an error state, `0` turns it off again. Mutation-checked: summing the whole log instead of the week turns 2 of them red (`65` becomes `1064`).

## 3.3.0 — 2026-11-16

### Added — a weekly reading goal, shown gently on Today

- **Settings → Reading** takes a weekly target in minutes (`0` = off, the default). It
  persists with the rest of the settings, so it survives a reload and a restore.
- **Today** shows the week's progress under the Reading Progress widget: `This week:
  65 / 120 min`, a thin progress bar, and one sentence. The sentence is chosen to be
  kind rather than scolding — *"Goal reached — anything more this week is a bonus."*,
  *"55 min to go this week. Short sessions count the same as long ones."*, or, on a
  quiet week, *"Nothing logged yet this week. A few minutes with one chapter counts."*
  There is no streak pressure and nothing is lost by missing it.
- The total is the **week's**, Monday to Sunday, from the reading log the dwell tracker
  already writes — not today's minutes, which is what the widget showed before. Minutes
  from outside the current week are excluded, which is the one thing `tests/smoke.test.js`
  now proves directly: it seeds 40 min today, 25 min on another day of this week and
  999 min 45 days ago, and requires `65`, not `1064`.

### Changed — the goal is a target, not a debt

- Deliberately **no** failure state, no badge, no "missed goal" count. This is a
  resilience app; a reading target that punishes a hard week works against the thing the
  app is for.

## 3.2.0 — 2026-11-13

### Added — optional service worker: offline over HTTP, unchanged from disk

- `src/index.html` now registers `sw.js` when the app is **served** over http(s) and does
  nothing when it is opened from disk — a worker needs an origin, and the single file is
  already offline there. The registration is guarded on both `serviceWorker` support and
  the protocol, and a failed registration is caught: nothing in the app depends on it.
- The CSP gains `worker-src 'self'` and nothing else. `default-src 'none'` and
  `connect-src 'none'` still hold, so the page still cannot reach the network.

### Fixed — the suite that proves it was red on `main` and nothing ran it

- `tests/sw.test.js` already existed and already drove the real `docs/play/sw.js` against a
  stub Cache API — but three of its 21 assertions read `src/index.html` and were failing,
  because the worker landed and the page half of the change did not. The page half was left
  to a one-shot workflow (`.github/workflows/sw-3.2.0.yml`) that was never dispatched.
  It is applied here, and that workflow is deleted in the same commit.
- `npm test` ran only the smoke suite, which is why CI stayed green over a red one. It now
  runs `smoke` **and** `sw`; `npm run test:sw` runs the worker suite alone.
- `package-lock.json` still said `3.1.0` while `package.json` said `3.1.1`, and it also
  still carried the pre-PolyForm `"license": "MIT"`. Both now agree with the release.

### Changed — the public demo is now provably the app

- `scripts/build.js` writes `docs/play/index.html` instead of a root `index.html`, and CI
  fails when the committed demo differs from a fresh build. The previous gate checked
  `dist/conqueror-os.html` and `index.html`, neither of which is committed, so it passed
  vacuously — and `docs/play/index.html` had drifted 1,345 bytes behind `src/index.html`,
  which is exactly the "demo running older code" the 3.1.1 entry claims a build prevents.

## 3.1.1 — 2026-10-25

- **Licence: PolyForm Noncommercial 1.0.0.** Every repository now carries the canonical text
  from polyformproject.org with the Required Notice line, and the four places a repo states
  its licence agree: LICENSE, the SPDX headers, the README and package.json.
- **The public demo is the app.** A build now fails if `docs/play/index.html` is not the app,
  because a demo running older code is two code paths for one program.


All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Review scheduling options** — the spaced-repetition review queue is now
  configurable. **Settings → Review** gains a **daily review cap** (0 = no cap)
  and the **first** and **second** review intervals in days (previously
  hard-coded to 1 and 6). The queue honours the cap, and grading schedules the
  next review from your intervals. Covered by the headless smoke suite.

## [3.0.1] — 2026-10-20

### Added

- **Content licence and copyright notice** — [`CONTENT-LICENSE.md`](CONTENT-LICENSE.md).
  The written content (the books, chapter text, reflections, exercises, prompts
  and interface copy) is now explicitly identified as an original work of
  authorship, **Copyright © 2026 Dr Sohil Momin, all rights reserved**, and is
  **not** covered by the PolyForm Noncommercial software licence.
- Copyright notices inside the application itself: a document header comment,
  `author` and `copyright` meta tags, a persistent line in the sidebar, and a
  statement in **Settings → About**.

### Changed

- README now separates **code (MIT)** from **content (© all rights reserved)**
  and documents the distinction.

## [3.1.0] — 2026-10-20

### Added

- **Inline SVG diagrams** — nine hand-built, theme-aware diagrams, one per
  chapter, rendered in the reader beneath the text: the stress-response curve,
  the two-stories branch, recovery vs. no recovery, the willpower drain, the
  setback-ledger pattern, consistency vs. intensity, the 90-second wave, the
  two-sentence script, and the five-minute close. They adapt to every theme
  (including high-contrast and OLED) and print correctly.
- **A full SVG icon system** — one inline sprite of ~50 symbols replaces every
  text and Unicode glyph across navigation, the header, the reader toolbar,
  buttons, empty states and controls. Icons inherit the theme colour and stay
  crisp at any zoom level.

### Changed

- Visual polish: rounded navigation items with an accent active state, softer
  cards, icon-led empty states, a tidier reader toolbar, and a refined
  blockquote and figure treatment.

### Fixed

- Unicode glyphs (◆ ▤ ✎ ▲ ◉ ◐ ⚙ ⟳ ★ and the empty-state marks ✎ ❝ ▦ ◷ ✓) rendered
  inconsistently across platforms and fonts. They are now vector icons.

## [Unreleased]

- Planned: optional service worker for installable/offline use when served over HTTP.
- Planned: Hindi and Gujarati localisation of the UI.
- Planned: optional end-to-end sync via an export file.

## [3.0.0] — 2026-10-20

A large feature release: the app was audited, fixed, compressed and then substantially expanded with an offline-only enhancement layer.

### Added

- **Multi-book library** with parts and chapter grouping (second book included as placeholder content).
- **Inline highlights** in three colours with per-highlight notes, click-to-edit and delete.
- **Selection quick-actions popover** (highlight / copy / send-to-journal).
- **Spaced-repetition review queue** (SM-2 lite) and a Review view.
- **Glossary** auto-built from chapter tags, plus **`[[wiki links]]`** in notes.
- **Reverse relations** on chapters ("Used by" worksheets and challenges).
- **Read-aloud** (Web Speech API) and **focus-mode dimming**.
- **Resume-where-you-left-off** banner and **dwell-time tracking**.
- **Labelled bookmarks**, a **Bookmarks** page and a **Favourite quotes** page.
- **Themes:** sepia, high-contrast, OLED black and **Auto (system)**; reading font and weight controls.
- **Journal:** edit entries, tags, filters (type/tag/date/text), rotating prompt, "on this day", draft autosave, voice dictation, attachments (IndexedDB).
- **Trackers:** custom trackers, bounds validation, edit/backfill, trend line + 7-day moving average, calendar heatmap, correlation (Pearson r).
- **Challenges:** custom challenges, pause/resume, reminders, shareable progress card.
- **Data:** schema migration (v1→v2), **undo on every delete**, import with **merge or replace** + validation, **encrypted backups** (AES-GCM/WebCrypto), **Markdown**, **Word (.doc)** and full **CSV** export, storage usage meter, **PIN app lock**.
- **UX:** command palette (`Ctrl/⌘ K`), keyboard shortcuts overlay (`?`), first-run onboarding, **Today** home, custom modals replacing native `confirm()`/`prompt()`.
- **Accessibility:** focus trap + focus return, ARIA live regions, radiogroup semantics, label associations, high-contrast theme.
- **Security:** Content-Security-Policy meta tag (no outbound connections), export-first guard on erase.
- Extras: favicon, meta tags, mobile `100dvh`, improved print styles, version stamp in the footer.

### Fixed

- **Timezone bug** — the date helper used UTC (`toISOString`), so the app considered it "yesterday" for early-morning users in positive-UTC timezones, corrupting streaks, daily-practice logging and default dates. Now uses the local calendar date.
- **Event-listener leak** — the reader attached two `scroll` listeners to the persistent main element on every render and never removed them. Now wired once.
- **Worksheet form reload** — pressing Enter submitted the form and reloaded the page; now prevented.
- **Write-only highlights** — highlights were saved but never displayed and could not be viewed or deleted.
- **Journal filter wiped the draft** — switching filter tabs destroyed unsaved input.
- **Unreadable dark-mode printing** — dim text stayed light on white; theme variables are now overridden for print.
- **Theme toggle desync** — the header toggle did not refresh the Settings page.
- **Search index rebuilt on every keystroke** — now cached.
- **`hashchange` listener bound to the old render function** — reassigned renderers were bypassed on navigation; the listener now late-binds.

### Changed

- Dashboard is now a merged **Today** view.
- Dead code removed (`ROUTES`, unused helper, unused CSS classes and design tokens).
- Minified build reduced by ~17% in the initial compression pass.

## [2.0.0] — 2026-10-19

### Added

- `<noscript>` fallback explaining that the app requires JavaScript and must be opened in a browser tab.
- Start-up error panel (visible diagnostic instead of a blank screen).
- Storage-unavailable warning when `localStorage` is blocked.

### Fixed

- Blank-screen diagnosis and guidance for preview-pane/JS-disabled environments.

## [1.0.0] — 2026-10-19

### Added

- Initial single-file application: library/reader, journal, trackers, worksheets, challenges, knowledge graph, insights, settings, backup/restore, light/dark theming, print styles.

[Unreleased]: https://github.com/drsamonline/conqueror-os/compare/v3.1.0...HEAD
[3.1.0]: https://github.com/drsamonline/conqueror-os/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/drsamonline/conqueror-os/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/drsamonline/conqueror-os/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/drsamonline/conqueror-os/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/drsamonline/conqueror-os/releases/tag/v1.0.0
