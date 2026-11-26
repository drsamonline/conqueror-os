'use strict';
/**
 * Conqueror OS — localisation suite.
 *
 * The app's interface strings live in the markup and the nav table; the runtime
 * catalogue is generated from them by tools/extract-strings.py. This suite drives
 * the REAL app in a headless DOM and asserts that the catalogue is complete in
 * both directions, that switching language actually changes what is rendered and
 * what assistive technology announces, that the choice survives a reload, and
 * that a missing translation degrades to English rather than to a raw key.
 *
 *   node tests/i18n.test.js [path-to-html]     (defaults to src/index.html)
 *
 * The structural half (catalogue == markup, no orphan keys, no English copied into
 * a translation, inline block not stale) is tools/extract-strings.py --check, run
 * as its own CI step: a Python tool reading the same source is a second opinion,
 * not a duplicate assertion.
 */
const fs = require('fs');
const path = require('path');
const { Window } = require('happy-dom');

const file = process.argv[2] || path.join(__dirname, '..', 'src', 'index.html');
const html = fs.readFileSync(file, 'utf8');

const results = [];
function ok(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : (detail || '') });
}
function eq(name, actual, expected) {
  ok(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/* The JSON catalogue block is a <script>, so the usual "strip every <script>" trick
   would delete the very thing under test. Strip only the executable ones. */
const htmlNoScripts = html.replace(/<script(?![^>]*type="application\/json")[\s\S]*?<\/script>/g, '');
const appjs = html
  .match(/<script>[\s\S]*?<\/script>/g)
  .map(x => x.replace(/^<script>/, '').replace(/<\/script>$/, ''))
  .reduce((a, b) => (a.length >= b.length ? a : b));

function boot(storageSeed) {
  return bootAt('#/dashboard', storageSeed);
}

/* A boot that opens on another route, and optionally on a VARIANT of the source.
   The variant is how a content-dependent branch gets exercised: CONTENT is a `const`
   in the app's own script, so a test cannot reach in and empty it — but it can hand
   the app a source in which the chapter list is already empty. */
function bootAt(hash, storageSeed, source) {
  const window = new Window({ url: 'https://local.test/' + hash });
  window.print = () => {};
  window.confirm = () => true;
  if (storageSeed) window.localStorage.setItem('conquerorOS.v1', storageSeed);
  const { document } = window;
  document.write(htmlNoScripts);
  window.eval(source || appjs);
  return window;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* ---------------------------------------------------------------- catalogue */
  const w = boot();
  const I18n = w.I18n;
  ok('runtime: window.I18n is exposed', !!I18n);
  ok('runtime: the inline catalogue block is read', !!I18n && Object.keys(I18n.data).length >= 3,
    I18n ? Object.keys(I18n.data).join(',') : 'no I18n');

  const en = I18n.data.en || {};
  const langs = I18n.langs;
  eq('catalogue: English is one of the languages', langs.indexOf('en') >= 0, true);
  eq('catalogue: Hindi and Gujarati ship', langs.indexOf('hi') >= 0 && langs.indexOf('gu') >= 0, true);
  ok('catalogue: it is not empty', Object.keys(en).length >= 20, Object.keys(en).length + ' keys');

  const enKeys = Object.keys(en).sort();
  for (const lang of langs) {
    if (lang === 'en') continue;
    const table = I18n.data[lang];
    eq(`catalogue: ${lang} has exactly the English key set`, Object.keys(table).sort().join('|'), enKeys.join('|'));
    const empty = Object.keys(table).filter(k => !String(table[k]).trim());
    ok(`catalogue: ${lang} has no empty translation`, empty.length === 0, empty.join(','));
    const copied = Object.keys(table).filter(k => table[k] === en[k]);
    ok(`catalogue: ${lang} is actually translated (no English copied in)`, copied.length === 0, copied.join(','));
  }

  /* -------------------------------------------- markup ↔ catalogue, both ways */
  const { document } = w;
  const declared = [];
  document.querySelectorAll('[data-i18n]').forEach(el => declared.push(el.getAttribute('data-i18n')));
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
      const key = pair.split(':')[1];
      if (key && key.trim()) declared.push(key.trim());
    });
  });
  ok('markup: the shell declares translatable strings', declared.length >= 10, declared.length + ' declared');
  const missing = declared.filter(k => !(k in en));
  ok('markup: every declared key has an English string', missing.length === 0, missing.join(','));
  const used = new Set(declared);
  document.querySelectorAll('#primary-nav a').forEach(a => {
    // nav labels are rendered from the nav table, whose keys are nav.<id>
    const href = a.getAttribute('href') || '';
    const id = href.replace('#/', '');
    if (id) used.add('nav.' + id);
  });
  /* Keys rendered from a t("key","English") call site are declared in the source,
     not in the markup — so they are read off the very source the app runs, not
     kept in a hand-list that rots the moment a view is localised. */
  const callSites = [...appjs.matchAll(/\bt\("([a-z0-9][a-z0-9.\-]*)"\s*,\s*"/g)].map(m => m[1]);
  ok('catalogue: the source declares call-site strings', callSites.length >= 1, callSites.length + ' call sites');
  callSites.forEach(k => used.add(k));
  const orphans = enKeys.filter(k => !used.has(k));
  ok('catalogue: no orphaned key that nothing renders', orphans.length === 0, orphans.join(','));

  /* ----------------------------------------------------------- default state */
  eq('default: the app opens in English', I18n.current(), 'en');
  const nav = () => [...document.querySelectorAll('#primary-nav .nav-text, #primary-nav a')]
    .map(a => (a.querySelector('.nav-text') || a).textContent.trim());
  ok('default: the navigation is English', nav().indexOf('Library') >= 0, nav().join('|'));
  eq('default: <html lang> is en', document.documentElement.lang, 'en');
  const brand = document.querySelector('.brand small').textContent.trim();
  eq('default: the brand subtitle is English', brand, 'Resilience Operating System');
  eq('default: the search hint is English',
    document.getElementById('search-box-label').textContent.trim(), 'Search everything…');
  eq('default: the search placeholder is English',
    document.getElementById('search-input').getAttribute('placeholder'),
    'Search titles, chapters, quotes, exercises, journal…');

  /* --------------------------------------------------------- switch to Hindi */
  eq('switch: set("hi") reports success', I18n.set('hi'), true);
  eq('switch: the language is Hindi', I18n.current(), 'hi');
  eq('switch: <html lang> follows the interface', document.documentElement.lang, 'hi');
  const hiNav = nav();
  ok('switch: the navigation is Hindi', hiNav.indexOf('पुस्तकालय') >= 0, hiNav.join('|'));
  eq('switch: the brand subtitle is Hindi',
    document.querySelector('.brand small').textContent.trim(), I18n.data.hi['shell.brand.sub']);
  eq('switch: the sidebar heading is Hindi',
    document.querySelector('.recent-box h3').textContent.trim(), I18n.data.hi['shell.recent']);
  eq('switch: the search hint is Hindi',
    document.getElementById('search-box-label').textContent.trim(), I18n.data.hi['shell.search.hint']);
  eq('switch: the search placeholder is Hindi',
    document.getElementById('search-input').getAttribute('placeholder'), I18n.data.hi['shell.search.placeholder']);
  eq('switch: a translated ARIA label reaches assistive technology',
    document.getElementById('menu-toggle').getAttribute('aria-label'), I18n.data.hi['aria.toggle-nav']);
  eq('switch: the breadcrumb trail is Hindi',
    document.querySelector('#breadcrumb span:last-child').textContent.trim(), I18n.data.hi['nav.dashboard']);
  ok('switch: the language selector reflects the choice',
    document.getElementById('lang-select').value === 'hi',
    document.getElementById('lang-select').value);

  /* ------------------------------------------------------- switch to Gujarati */
  eq('switch: set("gu") reports success', I18n.set('gu'), true);
  eq('switch: the language is Gujarati', I18n.current(), 'gu');
  ok('switch: the navigation is Gujarati', nav().indexOf('પુસ્તકાલય') >= 0, nav().join('|'));

  /* --------------------------------------------------------------- refusals */
  eq('refuse: an unknown language is rejected', I18n.set('fr'), false);
  eq('refuse: the previous language survives the refusal', I18n.current(), 'gu');

  /* ------------------------------------------------------------- persistence */
  await sleep(350);                       // persist() debounces for 250 ms
  const saved = JSON.parse(w.localStorage.getItem('conquerorOS.v1') || '{}');
  eq('persistence: the choice is written to storage', saved.settings && saved.settings.lang, 'gu');

  const w2 = boot(w.localStorage.getItem('conquerorOS.v1'));
  eq('persistence: a reload opens in Gujarati', w2.I18n.current(), 'gu');
  eq('persistence: a reload renders the Gujarati navigation',
    [...w2.document.querySelectorAll('#primary-nav .nav-text')].map(x => x.textContent.trim()).indexOf('પુસ્તકાલય') >= 0, true);
  eq('persistence: a reload keeps <html lang> in step', w2.document.documentElement.lang, 'gu');

  /* ------------------------------------------- the Today view speaks too (v3.5) */
  const w4 = boot();
  const d4 = w4.document;
  const H = () => d4.querySelector('#main h1').textContent.trim();
  const sections = () => [...d4.querySelectorAll('#main .section-title')].map(e => e.textContent.trim());
  const widgetHeads = () => [...d4.querySelectorAll('#main .widget h3')].map(e => e.textContent.trim());
  /* A reference, not a node: render() replaces #main's children, so a captured
     element goes stale the moment the language changes — which is exactly the
     failure this test caught on its first run. */
  const lede = () => d4.querySelector('#main .lede');

  eq('view: the Today view opens in English', H(), 'Today');
  eq('view: its lede is English', lede().textContent.trim(),
    'Where you are, and the next meaningful action to take.');
  ok('view: the mission widget is English', widgetHeads().indexOf("Today's Mission") >= 0, widgetHeads().join('|'));
  eq('view: the section titles are English', sections().join('|'),
    "Today's prompt|On this day|Favorite quotes|Shortcuts");
  eq('view: the streak counts in English', d4.querySelector('#main .streak-num').textContent.trim(), '0 days');

  const hashBefore = d4.location.hash;
  eq('view: switching to Hindi succeeds', w4.I18n.set('hi'), true);
  eq('view: switching re-renders the view in place, without a navigation', d4.location.hash, hashBefore);
  eq('view: the Today heading is Hindi', H(), w4.I18n.data.hi['view.today.title']);
  eq('view: the lede is Hindi', lede().textContent.trim(), w4.I18n.data.hi['view.today.lede']);
  ok('view: the mission widget is Hindi',
    widgetHeads().indexOf(w4.I18n.data.hi['view.today.mission.title']) >= 0, widgetHeads().join('|'));
  eq('view: the section titles are Hindi', sections().join('|'),
    ['view.today.prompt.title', 'view.today.onthisday', 'view.today.quotes', 'view.today.shortcuts']
      .map(k => w4.I18n.data.hi[k]).join('|'));
  ok('view: the streak counts in Hindi',
    d4.querySelector('#main .streak-num').textContent.trim().endsWith(w4.I18n.data.hi['view.today.day.other']),
    d4.querySelector('#main .streak-num').textContent);
  ok('view: a translated line keeps its markup instead of escaping it',
    d4.querySelector('#main p.muted kbd') !== null, 'no <kbd> survived translation');
  ok('view: no English leaks into the Hindi Today view',
    !/Today|Reading Progress|Review Queue|On this day|Favorite quotes|Shortcuts|Continue reading/.test(d4.querySelector('#main').textContent),
    d4.querySelector('#main').textContent.slice(0, 160));

  eq('view: switching to Gujarati succeeds', w4.I18n.set('gu'), true);
  eq('view: the Today heading is Gujarati', H(), w4.I18n.data.gu['view.today.title']);
  eq('view: switching back to English succeeds', w4.I18n.set('en'), true);
  eq('view: switching back restores the English view', H(), 'Today');

  /* ------------------------------------------- the Library view speaks too (v3.6) */
  /* One implementation, not two. Until v3.6 this file held a `function renderLibrary`
     that a later `renderLibrary = function` overwrote: the first was dead, and the
     strings it held were the ones a search-and-translate pass would have found. */
  eq('library: the source declares exactly one renderLibrary',
    (appjs.match(/renderLibrary\s*=\s*function/g) || []).length, 1);
  eq('library: no dead renderLibrary function shadows it',
    (appjs.match(/function\s+renderLibrary\s*\(/g) || []).length, 0);

  const w5 = bootAt('#/library');
  const d5 = w5.document;
  const LH = () => d5.querySelector('#main h1').textContent.trim();
  const LLede = () => d5.querySelector('#main .lede').textContent.trim();
  const LTitles = () => [...d5.querySelectorAll('#main .section-title')].map(e => e.textContent.trim());
  const LStatus = () => [...d5.querySelectorAll('#main .chapter-list .sr-only')].map(e => e.textContent.trim());
  /* Two books ship: the six-chapter Protocol and the three-chapter Field Manual
     (added at runtime), so nine status words, and the counts are read per book. */
  const LMeta = () => d5.querySelector('#main .book-block .book-meta p:last-child').textContent.trim();

  eq('library: it opens in English', LH(), 'Library');
  eq('library: its lede is English', LLede(),
    'Your books, structured as parts and chapters — not a pile of pages.');
  eq('library: the section titles are English', LTitles().join('|'), 'Worksheets|Knowledge graph');
  eq('library: the book card counts in English', LMeta(), '6 chapters · 0 complete · 52 min');
  eq('library: the part heading is the one the book data holds',
    d5.querySelector('#main .part-title').textContent.trim(), 'Part I — Foundations');
  eq('library: every chapter carries a status word, not only a pip', LStatus().length, 9);
  eq('library: the chapter time cell is English',
    d5.querySelector('#main .chapter-list .ch-time').textContent.trim(), '9 min');
  ok('library: a fresh chapter says "Not started" in words',
    LStatus().every(s => s === 'Not started'), LStatus().join('|'));
  ok('library: the pip is decorative, so it is not announced twice',
    [...d5.querySelectorAll('#main .chapter-list .progress-pip')].every(p => p.getAttribute('aria-hidden') === 'true'),
    'a pip is exposed to assistive technology');

  eq('library: switching to Hindi succeeds', w5.I18n.set('hi'), true);
  eq('library: the heading is Hindi', LH(), w5.I18n.data.hi['nav.library']);
  eq('library: the lede is Hindi', LLede(), w5.I18n.data.hi['view.library.lede']);
  eq('library: the section titles are Hindi', LTitles().join('|'),
    ['view.library.worksheets.title', 'view.library.graph.title'].map(k => w5.I18n.data.hi[k]).join('|'));
  eq('library: the status words are Hindi',
    LStatus().every(s => s === w5.I18n.data.hi['view.library.status.none']), true);
  eq('library: the chapter time cell is Hindi',
    d5.querySelector('#main .chapter-list .ch-time').textContent.trim(),
    '9 ' + w5.I18n.data.hi['view.library.min']);
  ok('library: the counts use the Hindi units',
    LMeta().indexOf(w5.I18n.data.hi['view.library.chapters.other']) >= 0 &&
    LMeta().indexOf(w5.I18n.data.hi['view.library.min']) >= 0, LMeta());
  ok('library: no English chrome leaks into the Hindi view',
    !/\b(Library|Worksheets|Knowledge graph|Not started|chapters|complete|min)\b/
      .test([LLede(), ...LTitles(), ...LStatus(), LMeta()].join(' ')),
    [LLede(), ...LTitles(), ...LStatus(), LMeta()].join(' '));
  eq('library: switching to Gujarati succeeds', w5.I18n.set('gu'), true);
  eq('library: the heading is Gujarati', LH(), w5.I18n.data.gu['nav.library']);
  eq('library: switching back to English succeeds', w5.I18n.set('en'), true);
  eq('library: switching back restores the English heading', LH(), 'Library');

  /* The branch the row asked for: a book whose chapter list is empty. It cannot be
     reached by editing CONTENT at runtime, so the app is handed a source in which
     the chapters are already gone — and it must say so instead of rendering an empty
     list and a book card that links to "#/reader/". */
  const noChapters = appjs.replace('chapters: [', 'chapters: [], _chapters_unused: [');
  ok('library: the empty-book fixture really removes the chapters',
    noChapters !== appjs && noChapters.indexOf('_chapters_unused') >= 0, 'the fixture did not change the source');
  const w6 = bootAt('#/library', null, noChapters);
  const d6 = w6.document;
  eq('library: an empty book still renders the view', d6.querySelector('#main h1').textContent.trim(), 'Library');
  const firstBlock = () => d6.querySelector('#main .book-block');
  ok('library: an empty book says so instead of showing an empty list',
    firstBlock().querySelector('.chapter-list') === null &&
    firstBlock().querySelector('.empty-state') !== null,
    'no empty state in the first book block');
  eq('library: the empty state is the translated sentence',
    firstBlock().querySelector('.empty-state').textContent.trim(),
    w6.I18n.data.en['view.library.empty']);
  eq('library: the book card links nowhere rather than to another book\'s chapter',
    firstBlock().querySelector('.book-card').getAttribute('href'), '#/reader/');
  eq('library: the empty book counts zero chapters, not a phantom six',
    firstBlock().querySelector('.book-meta p:last-child').textContent.trim(),
    '0 chapters · 0 complete · 52 min');
  eq('library: the empty state speaks Hindi too', (w6.I18n.set('hi'),
    firstBlock().querySelector('.empty-state').textContent.trim()), w6.I18n.data.hi['view.library.empty']);

  /* The singular branch. No book ships with one chapter, so the source is given one
     and the plural rule is read off it rather than assumed. */
  const oneChapter = appjs.replace(/  chapters: \[[\s\S]*?\n  \],\n  worksheets: \[/,
    '  chapters: [{id:"ch-only", type:"chapter", bookId:"book-resilience", partId:"part-foundations", order:1, title:"Only Chapter", subtitle:"", tags:[], difficulty:"intro", estimatedReadingMinutes:5, body:["x"], reflection:"r", exercise:"e", quote:"q"}],\n  worksheets: [');
  ok('library: the one-chapter fixture really leaves one chapter',
    oneChapter !== appjs && (oneChapter.match(/id:"ch-stress-response"/) || []).length === 0,
    'the fixture did not replace the chapter list');
  const w7 = bootAt('#/library', null, oneChapter);
  const oneMeta = () => w7.document.querySelector('#main .book-block .book-meta p:last-child').textContent.trim();
  eq('library: a one-chapter book says "1 chapter", not "1 chapters"', oneMeta(),
    '1 chapter · 0 complete · 52 min');
  eq('library: the singular is Hindi too', (w7.I18n.set('hi'), oneMeta()),
    '1 ' + w7.I18n.data.hi['view.library.chapters.one'] + ' · 0 ' +
    w7.I18n.data.hi['view.library.complete'] + ' · 52 ' + w7.I18n.data.hi['view.library.min']);

  /* -------------------------------------------- the Reader view speaks too (v3.7) */
  /* One implementation, not two. Until v3.7 the source held a `function renderReader`
     that `renderReader = function` overwrote on the first render: dead code that still
     carried a full set of hard-coded English labels — the copy a search-and-translate
     pass would have found first. Same defect as the Library's, one view along. */
  eq('reader: the source declares exactly one renderReader',
    (appjs.match(/renderReader\s*=\s*function/g) || []).length, 1);
  eq('reader: no dead renderReader function shadows it',
    (appjs.match(/function\s+renderReader\s*\(/g) || []).length, 0);

  const w8 = bootAt('#/reader/ch-story-you-tell');
  const d8 = w8.document;
  const BTN = id => d8.getElementById(id);
  const tbText = id => BTN(id).textContent.trim();
  const tbLabel = id => BTN(id).getAttribute('aria-label');
  const TOOLBAR = ['btn-bookmark', 'btn-fav', 'btn-hl-amber', 'btn-tts', 'btn-print',
    'btn-toc', 'btn-focus', 'btn-dim', 'btn-spacing', 'btn-width'];
  const toolbarText = () => TOOLBAR.map(tbText).join('|');
  const blockHeads = () => [...d8.querySelectorAll('#main .block h4')].map(e => e.textContent.trim());
  const asideHeads = () => [...d8.querySelectorAll('#reader-aside .aside-block h4')].map(e => e.textContent.trim());
  const dpRows = () => [...d8.querySelectorAll('#main .dp-row')].map(l => l.textContent.trim());
  const notePlaceholder = () => d8.getElementById('chapter-note').getAttribute('placeholder');
  const noteHint = () => d8.querySelector('#main .hint').textContent.trim();
  const navDirs = () => [...d8.querySelectorAll('#main .reader-nav .dir')].map(e => e.textContent.trim());

  ok('reader: the reading time is English',
    d8.querySelector('#reader-meta span').textContent.trim().endsWith(' min read'),
    d8.querySelector('#reader-meta span').textContent);
  eq('reader: the toolbar is English', toolbarText(),
    ['Bookmark', 'Favourite', 'Highlight', 'Read aloud', 'Print', 'Contents', 'Focus',
      'Dim: off', 'Spacing: comfortable', 'Width: medium'].join('|'));
  /* The visible label and the aria-label are built from the same translated string, so
     a screen reader is told what the button says rather than what it said in English. */
  ok('reader: every toolbar control announces the same words it shows',
    TOOLBAR.every(id => tbLabel(id) === tbText(id)),
    TOOLBAR.filter(id => tbLabel(id) !== tbText(id)).join(','));
  ok('reader: the toolbar controls carry a translated title where one exists',
    BTN('btn-hl-amber').getAttribute('title') === 'Highlight the selected text',
    BTN('btn-hl-amber').getAttribute('title'));
  eq('reader: the block headings are English', blockHeads().join('|'),
    'Reflection|Exercise|Your notes|Daily practice');
  eq('reader: the note placeholder is English', notePlaceholder(),
    'Write a note tied to this chapter… **bold**, *italic*, # headings, - lists, > quotes, and [[Chapter Title]] links');
  eq('reader: the note hint is English', noteHint(),
    'Markdown supported, including [[wiki links]] to other chapters.');
  eq('reader: the four daily-practice labels are English', dpRows().join('|'),
    'Read the chapter|Answer the reflection|Do the exercise|Log it in your journal');
  /* Chapter 2 of 6, so BOTH directions are on screen: the first chapter would show
     only "Next" and the last only "Previous", and a one-sided fixture would let a
     hard-coded label survive on the other side. */
  eq('reader: the previous/next labels are English', navDirs().join('|'), '← Previous|Next →');
  ok('reader: the aside headings are English',
    asideHeads().indexOf('Related chapters') >= 0 && asideHeads().indexOf('Bookmarks in this book') >= 0,
    asideHeads().join('|'));

  const rHash = d8.location.hash;
  eq('reader: switching to Hindi succeeds', w8.I18n.set('hi'), true);
  eq('reader: switching re-renders the reader in place', d8.location.hash, rHash);
  const hi8 = w8.I18n.data.hi;
  eq('reader: the toolbar is Hindi', toolbarText(),
    ['view.reader.bookmark', 'view.reader.fav', 'view.reader.highlight', 'view.reader.tts',
      'view.reader.print', 'view.reader.contents', 'view.reader.focus', 'view.reader.dim.off',
      'view.reader.spacing.comfortable', 'view.reader.width.medium'].map(k => hi8[k]).join('|'));
  eq('reader: the block headings are Hindi', blockHeads().join('|'),
    ['view.reader.reflection', 'view.reader.exercise', 'view.reader.notes', 'view.reader.practice']
      .map(k => hi8[k]).join('|'));
  eq('reader: the note placeholder is Hindi', notePlaceholder(), hi8['view.reader.note.placeholder']);
  eq('reader: the daily-practice labels are Hindi', dpRows().join('|'),
    ['view.reader.practice.read', 'view.reader.practice.reflect', 'view.reader.practice.exercise',
      'view.reader.practice.journal'].map(k => hi8[k]).join('|'));
  eq('reader: the previous/next labels are Hindi', navDirs().join('|'),
    [hi8['view.reader.prev'], hi8['view.reader.next']].join('|'));
  ok('reader: the mark-complete button is Hindi',
    d8.getElementById('btn-mark-complete').textContent.trim() === hi8['view.reader.complete'],
    d8.getElementById('btn-mark-complete').textContent);
  /* The state-cycling buttons: one key PER STATE, so the label after a click is the
     next state's translation and not an English word glued to a Hindi stem. */
  BTN('btn-spacing').click();
  eq('reader: cycling spacing reads the next state out of the catalogue',
    tbText('btn-spacing'), hi8['view.reader.spacing.spacious']);
  BTN('btn-width').click();
  eq('reader: cycling width reads the next state out of the catalogue',
    tbText('btn-width'), hi8['view.reader.width.wide']);
  BTN('btn-dim').click();
  eq('reader: the dim toggle reads its ON state out of the catalogue',
    tbText('btn-dim'), hi8['view.reader.dim.on']);
  /* The aria-label is read off the same catalogue value as the visible text, so a
     control that says "प्रिंट" cannot still be announced as "Print". */
  ok('reader: the aria-labels follow the language switch too',
    TOOLBAR.every(id => tbLabel(id) === tbText(id)),
    TOOLBAR.filter(id => tbLabel(id) !== tbText(id)).map(id => id + '=' + tbLabel(id)).join(','));
  ok('reader: no English chrome leaks into the Hindi reader',
    !/\b(Bookmark|Bookmarked|Favourite|Favourited|Highlight|Read aloud|Print|Contents|Focus|Dim:|Spacing:|Width:|Reflection|Exercise|Your notes|Daily practice|Mark chapter complete|Previous|Next|min read)\b/
      .test([toolbarText(), blockHeads().join(' '), notePlaceholder(), dpRows().join(' '),
        navDirs().join(' '), d8.getElementById('btn-mark-complete').textContent].join(' ')),
    toolbarText());
  eq('reader: switching to Gujarati succeeds', w8.I18n.set('gu'), true);
  eq('reader: the toolbar is Gujarati', tbText('btn-print'), w8.I18n.data.gu['view.reader.print']);
  eq('reader: switching back to English succeeds', w8.I18n.set('en'), true);
  eq('reader: switching back restores the English toolbar', tbText('btn-print'), 'Print');

  /* ------------------------------------------------------------ fallback path */
  const w3 = boot();
  const fallback = w3.I18n.t('nav.library', 'Library');
  eq('fallback: a known key resolves', fallback, 'Library');
  w3.I18n.data.hi['test.only-in-english'] = undefined;   // never shipped, but proves the order
  delete w3.I18n.data.hi['test.only-in-english'];
  const enOnly = Object.assign({}, w3.I18n.data.en, { 'test.english-only': 'English only' });
  const hiSparse = Object.assign({}, w3.I18n.data.hi);
  delete hiSparse['test.english-only'];
  w3.I18n.data.en = enOnly;
  w3.I18n.data.hi = hiSparse;
  w3.I18n.set('hi');
  eq('fallback: a key missing from Hindi falls back to English', w3.I18n.t('test.english-only', 'x'), 'English only');
  eq('fallback: a key in no catalogue falls back to the caller literal', w3.I18n.t('no.such.key', 'literal'), 'literal');
  eq('fallback: a key in no catalogue and no literal falls back to the key', w3.I18n.t('no.such.key'), 'no.such.key');

  /* ---------------------------------------------------------------- report */
  const passed = results.filter(r => r.pass).length;
  results.forEach(r => {
    if (!r.pass) console.log('FAIL  ' + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
    else console.log('PASS  ' + r.name);
  });
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exitCode = 1;
  /* Exit explicitly. The Reader's dwell clock is a real 20 s interval, and a window
     left in the Reader keeps this process alive after the last assertion — the suite
     then reads as a CI timeout instead of the result it had already computed. (The app
     now stops that clock when you leave the Reader; this is the belt to that braces,
     and it is what smoke.test.js has always done.) */
  process.exit(process.exitCode || 0);
})().catch(err => {
  console.error('i18n suite crashed:', err);
  process.exitCode = 1;
});
