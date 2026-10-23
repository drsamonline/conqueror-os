# Changelog

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
  **not** covered by the MIT software licence.
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
