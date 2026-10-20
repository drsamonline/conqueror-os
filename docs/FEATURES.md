# Features

A complete reference to what Conqueror OS does. Everything works offline with no server.

## Today (dashboard)

- Current streak ribbon (last 14 days) and a "continue reading" action.
- **Resume where you left off** banner for a partially-read chapter.
- Widgets: today's mission, reading progress, review queue, and every active challenge.
- The rotating **daily prompt**, an **"on this day"** resurfacing of past journal entries, and favourite quotes.

## Library

- **Multiple books**, each grouped into **parts** and chapters, with progress pips and per-book completion.
- Worksheets and the knowledge graph are reachable from here.

## Reader

- Chapter body, reflection, exercise and pull-quote, with estimated reading time.
- **Inline highlights** in amber / blue / green. Select text and use the **quick-action popover** to highlight, copy, or send the selection to a new journal entry. Click any highlight to add a **note**, change its colour, or delete it.
- **Per-chapter notes** with Markdown and **`[[wiki links]]`** to other chapters.
- **Bookmarks with labels**; **favourite quotes**.
- Toolbar: bookmark, favourite, highlight, **read aloud**, print, contents, **focus mode** (with optional paragraph dimming), line spacing, reading width.
- **Daily practice** checklist (read / reflect / exercise / journal) and "mark complete".
- Sidebar: breadcrumb, related chapters, **"used by"** (worksheets and challenges that reference this chapter), bookmarks in this book, and this chapter's highlights.
- **Dwell-time tracking** — minutes spent per chapter and per day.

## Journal

- Six entry types (daily, guided, free, reflection, book, exercise) with prompts where relevant.
- **Tags**, and filters by **type, tag, date range and free text**.
- **Edit** entries, **draft autosave**, **voice dictation**, and **image attachments** (stored in IndexedDB).
- Mood (1–5) per entry; optional **journaling streak**.

## Trackers

- Built-ins: mood, sleep, exercise, meditation, habit follow-through — plus **custom trackers**.
- Input **bounds validation**; **edit** and backfill past entries.
- **Bar chart**, **trend line with a 7-day moving average**, and a **calendar heatmap**.
- **Correlation** (Pearson r) between any two trackers over the last 14 days.

## Challenges

- Built-in 7 / 21 / 30 / 45 / 90-day programs, plus **custom challenges**.
- Daily check-in, consistency %, current streak and milestone pills.
- **Pause / resume**, **abandon (with undo)**, restart, and a **shareable progress card** (PNG).

## Review

- **Spaced repetition** (SM-2 lite) over each chapter's key idea and reflection.
- Due count surfaced on Today; grade each card Again / Hard / Good / Easy.

## Worksheets

- Reusable fillable sheets with saved history: Daily Resilience Check, Weekly Review, Setback Ledger.
- Each save appends a new dated entry; entries are printable and deletable (with undo).

## Diagrams and icons

- **Inline SVG diagrams** — every chapter carries a hand-built, theme-aware
  diagram placed beneath its text: the stress-response curve (regulated vs.
  unregulated), the two-stories branch after a setback, capacity with and
  without scheduled recovery, the willpower drain across a day, isolated
  setbacks converging into one pattern, consistency against intensity, the
  90-second wave, the two-sentence script, and the five-minute close.
- **A single SVG icon sprite** (~50 symbols) powers the entire interface:
  navigation, header, reader toolbar, buttons, controls and empty states. Icons
  inherit the theme colour, scale cleanly, and require no external files or fonts.

## Knowledge graph & glossary

- **Graph** of chapters, worksheets and challenges connected by shared concepts; hover/focus to highlight connections.
- **Glossary** auto-built from chapter tags, linking terms back into the book.

## Insights & reports

- Reading minutes (all time and per day), chapters complete, journal count, streak, average mood, review due, tracker adherence.
- Time spent reading across all chapters.
- Printable / exportable reports for today, the week, or the month.

## Settings

- **Appearance:** theme (light, dark, sepia, high-contrast, OLED, auto), reading font (serif / sans / dyslexia-friendly), font weight and size, line spacing, reading width.
- **Practice:** count journaling toward the streak; daily reminder and time.
- **Security:** PIN app lock.
- **Data & backup:** storage usage meter; export as JSON / encrypted / Markdown / Word / CSV; import (merge or replace) with validation; print to PDF.
- **Reset:** erase everything, with an export offered first and an undo toast.

## Data, safety & privacy

- **Undo** for every destructive action.
- **Schema migration** for older saves.
- **Encrypted backups** (AES-GCM, passphrase-derived key).
- **No network requests** — enforced by Content-Security-Policy.

## Global UX

- **Command palette** (`Ctrl/⌘ K`) for navigation and actions.
- **Keyboard shortcuts** overlay (`?`) and reader shortcuts (`b`, `f`, `h`, `r`, arrows).
- **Search** across chapters, quotes, exercises, reflections, notes, highlights, journal, worksheets and glossary.
- **First-run onboarding**.
- Custom modals instead of native `confirm()` / `prompt()`.
- **Accessibility:** focus-trapped dialogs with focus return, ARIA live announcements, radiogroup semantics, labelled inputs, high-contrast theme, reduced-motion support.
