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
  const window = new Window({ url: 'https://local.test/#/dashboard' });
  window.print = () => {};
  window.confirm = () => true;
  if (storageSeed) window.localStorage.setItem('conquerorOS.v1', storageSeed);
  const { document } = window;
  document.write(htmlNoScripts);
  window.eval(appjs);
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
  ['shell.recent.empty', 'shell.skip'].forEach(k => used.add(k));
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
})().catch(err => {
  console.error('i18n suite crashed:', err);
  process.exitCode = 1;
});
