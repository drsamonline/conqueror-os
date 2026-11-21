# Roadmap

The project's constraints shape the roadmap: **no backend, no accounts, no runtime dependencies, offline-first.** Everything below respects those constraints, or is explicitly noted where a browser limitation applies.

## Shipped in 3.0

- Multi-book library with parts; inline highlights with notes; spaced-repetition review; glossary; wiki links; reverse relations.
- Journal editing, tags, filters, dictation, attachments; custom trackers, correlations, heatmap, trend lines; custom challenges, pause/resume, reminders, share cards.
- Undo on every delete; encrypted backups; JSON/Markdown/Word/CSV export; import merge/replace; PIN lock; CSP; command palette; onboarding; accessibility pass.

## Shipped since 3.0

- **Review scheduling options** — a configurable daily review cap and first/second review intervals (Settings → Review).
- **Localisation, step 1 (3.4.0)** — the shell, the navigation, the search box and every
  ARIA label in English, Hindi and Gujarati. The English stays in the markup and
  `tools/extract-strings.py` generates the catalogues from it, so the two cannot drift;
  `--check` is a CI step. 23 keys, 44 runtime assertions in `tests/i18n.test.js`.
- **Localisation, step 2 (3.5.0)** — the Today screen: title, lede, streak, widgets,
  section titles, empty states, the reading-goal bar and the resume banner, in English,
  Hindi and Gujarati. 47 keys (70 in total); `tests/i18n.test.js` grew from 44 to 63
  assertions, including that switching language re-renders the view in place.
- **Optional service worker (3.2.0)** — served over http(s) the app registers `sw.js`: cache-first for same-origin GETs, a cache named for the release so a new version cannot serve the old shell, nothing else intercepted. Opened from disk it is unchanged. *Still true:* installability is the browser's call and Chrome also wants a manifest, which this app does not ship.

## Next

- **Localisation, continued** — the shell (3.4.0) and the Today screen (3.5.0) ship in
  Hindi and Gujarati (see [`I18N.md`](I18N.md)). What is left is the other seven views —
  Library, Reader, Journal, Trackers, Challenges, Insights, Settings — plus modals and
  toasts. The pattern is settled and costs three steps per view: wrap the English in
  `t("key","English")`, run `extract-strings.py --write`, translate the new keys.
  Right-to-left support is unbuilt and has nothing to mirror yet — Hindi and Gujarati
  are both LTR.
- **Print/exports** — richer "print chapter as worksheet" and "print journal range" layouts.

## Later / under consideration

- **Optional encrypted sync via file** — export on one device, merge on another, still with no server.
- **Custom themes** — user-defined accent and background colours.
- **Data-health dashboard** — counts, storage used, last backup time.
- **Additional books** — the content layer is data-driven and already supports multiple books.
- **Full IndexedDB storage backend** — would remove the `localStorage` size ceiling; a substantial, higher-risk refactor of the synchronous state model.

## Explicitly out of scope

- Any server, backend, account system or cloud sync service.
- Analytics, telemetry or tracking of any kind.
- Third-party runtime dependencies (frameworks, CDNs, external fonts).
- Anything that requires network access to function.

## Known browser limitations

- **Reminders** only fire while the tab is open (no server/service worker to schedule them otherwise).
- **Storage** is bounded by the browser's `localStorage` quota (roughly 5 MB); the app shows a usage meter and warns as it fills. Attachments use IndexedDB to stay clear of this limit.
