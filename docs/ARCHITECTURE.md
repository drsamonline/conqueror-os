# Architecture

Conqueror OS is a **single self-contained HTML document**. There is no framework, no bundler at runtime, and no network activity. This document explains how the file is organised so you can work on it confidently.

## The single file

`src/index.html` contains, in order:

1. `<head>` — meta tags, a **Content-Security-Policy**, an inline favicon, and the early error handler.
2. `<style>` — all CSS, organised as design tokens (`:root` custom properties), the app shell, view styles, and the enhancement styles (themes, modals, highlights, charts).
3. `<body>` — a static skeleton (`#app` grid with sidebar / header / main / footer, the search overlay, and a toast region) plus a `<noscript>` fallback. Nearly all visible content is built at runtime.
4. `<script>` — one IIFE containing the entire application.

Everything is inlined deliberately: the app is portable as a single artifact and has zero supply-chain surface at runtime.

## The application IIFE

The script is one immediately-invoked function with numbered sections:

| Section | Responsibility |
|---|---|
| **1. Storage engine** | `localStorage` wrapper with try/catch, export/restore, and an availability flag. |
| **2. Content** | The canonical `CONTENT` object: `books`, `parts`, `chapters`, `worksheets`, `challenges`. This is data, not markup. |
| **3. Application state** | `DEFAULT_STATE`, `loadState()`, and a debounced `persist()`. |
| **4. Utilities** | Dates, `uid()`, HTML escaping, a small Markdown renderer, toasts, streak maths. |
| **5. Router** | Hash-based (`#/view/param`); `parseHash()` + a `hashchange` listener. |
| **6. Nav / sidebar / header** | `renderNav`, `renderBreadcrumb`, `renderFooter`. |
| **7. Search engine** | A cached index over all content and user data. |
| **8. View renderers** | One function per route: dashboard, library, reader, journal, trackers, challenges, graph, insights, settings, worksheets. |
| **9. Theme** | `applyTheme()` sets `data-theme` / `data-font` on `<html>`. |
| **10. Boot** | `applyTheme()`, `initSearch()`, `initScrollTracking()`, `render()`. |
| **11. Enhancement layer** | Infrastructure and view overrides (see below). |

### The enhancement layer

Rather than rewriting the original file, the enhanced behaviour is layered on top inside the same scope. The layer:

- extends `DEFAULT_STATE` and migrates older saves;
- **reassigns** existing renderers (`render`, `renderNav`, `renderDashboard`, `renderReader`, `renderJournal`, `renderTrackers`, `renderChallenges`, `renderInsights`, `renderSettings`, `renderMarkdown`, `buildSearchIndex`, `initSearch`, `applyTheme`, `loadState`) with enhanced versions;
- registers extra routes via an `EXTRA_VIEWS` registry the dispatcher checks first;
- adds new subsystems: modals, undo, exports/encryption, command palette, spaced repetition, glossary, multi-book support.

> **Note on function reassignment.** Because renderers are reassigned after the initial definitions, any listener that captures a function *by value* would keep the old version. The `hashchange` listener is therefore written as `function(){ render(); }` so it late-binds. Keep this in mind when adding listeners to reassigned functions.

## Data model

State is a single object persisted under the `conquerorOS.v1` key (the key is kept for backward compatibility; the schema is versioned internally):

```
settings        theme, font, sizes, reminders, lock, onboarding flag
progress        chapterId -> { status, percent, seconds, lastVisited }
bookmarks       [{ id, chapterId, label, createdAt }]
highlights      chapterId -> [{ id, color, text, note, createdAt }]
notes           chapterId -> markdown string
journal         [{ id, date, text, mood, type, tags, chapterId, attachments }]
trackers        [{ id, trackerType, date, value, notes }]
trackerDefs     custom tracker definitions
dailyPractice   "YYYY-MM-DD" -> { read, reflect, exercise, journal }
worksheetEntries worksheetId -> [{ id, date, values }]
challenges      challengeId -> { startedAt, checkins, paused, pausedDays }
challengeDefs   custom challenge definitions
review          SRS card state per chapter item
drafts          unsaved journal draft
readingLog      "YYYY-MM-DD" -> minutes read
```

Attachments (images) are stored in **IndexedDB** (`conquerorOS.files`) to keep large binaries out of `localStorage`.

### Dates

All day keys are `YYYY-MM-DD` computed from the **local** calendar date. Using UTC here was a bug (early-morning users in positive-UTC offsets saw the wrong day); do not reintroduce `toISOString()` for day keys.

## Rendering model

Views are plain string templates assigned to `#main.innerHTML`. Event handling uses **delegation** on stable containers wherever possible, so re-rendering does not leak listeners. The one long-lived scroll listener is attached once in `initScrollTracking()`.

## Security model

- A `Content-Security-Policy` meta tag sets `default-src 'none'` and `connect-src 'none'`; only inline styles and scripts are permitted. The page cannot make network requests.
- All dynamic strings pass through `escapeHtml()` before insertion; the Markdown renderer escapes first, then formats.
- The optional PIN lock derives a key with PBKDF2 (SHA-256, 150k iterations) and stores only a salted hash.

## Build

`npm run build` minifies `src/index.html` → `dist/conqueror-os.html` with `html-minifier-terser`. CI fails if `dist/` is out of date relative to `src/`.

## Testing

`tests/smoke.test.js` loads the HTML into a headless DOM (`happy-dom`), strips and then explicitly evaluates the application script (for version-proof behaviour), and asserts routes, persistence and interactions. It includes regression checks for the bugs fixed during the audit.
