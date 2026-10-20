# Roadmap

The project's constraints shape the roadmap: **no backend, no accounts, no runtime dependencies, offline-first.** Everything below respects those constraints, or is explicitly noted where a browser limitation applies.

## Shipped in 3.0

- Multi-book library with parts; inline highlights with notes; spaced-repetition review; glossary; wiki links; reverse relations.
- Journal editing, tags, filters, dictation, attachments; custom trackers, correlations, heatmap, trend lines; custom challenges, pause/resume, reminders, share cards.
- Undo on every delete; encrypted backups; JSON/Markdown/Word/CSV export; import merge/replace; PIN lock; CSP; command palette; onboarding; accessibility pass.

## Next

- **Optional service worker** — installable/offline caching when the app is served over HTTP. *Limitation:* a service worker requires an origin, so it cannot be offered when the file is opened from disk; the app already works offline in that case.
- **Localisation** — Hindi and Gujarati UI, plus right-to-left support where needed. Strings are currently inline; extraction is the first step.
- **Review scheduling options** — configurable SRS intervals and a daily review cap.
- **Reading goals** — a target number of minutes or chapters per week with gentle progress feedback.
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
