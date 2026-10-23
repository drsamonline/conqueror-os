'use strict';
/**
 * Conqueror OS — headless DOM smoke suite.
 * Drives the real application and asserts routes, persistence and interactions.
 *   node tests/smoke.test.js [path-to-html]     (defaults to src/index.html)
 */
const fs = require('fs');
const path = require('path');
const { Window } = require('happy-dom');

const file = process.argv[2] || path.join(__dirname, '..', 'src', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const appjs = html.match(/<script>([\s\S]*?)<\/script>/g).map(x=>x.replace(/^<script>/,'').replace(/<\/script>$/,'')).reduce((a,b)=>a.length>=b.length?a:b);
const errors = [];

const window = new Window({ url: 'https://local.test/#/dashboard' });
window.print = () => {};
window.confirm = () => true;
window.addEventListener('error', e => errors.push('error: ' + (e.error && e.error.stack || e.message)));

const { document } = window;
// Inject markup without <script> tags so the DOM engine does not auto-execute
// them (behaviour varies between happy-dom versions), then evaluate the app once.
const htmlNoScripts = html.replace(/<script>[\s\S]*?<\/script>/g, '');
document.write(htmlNoScripts);
window.eval(appjs);

const $ = sel => document.querySelector(sel);
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const ok = (name, cond, extra='') => results.push({ name, pass: !!cond, extra });
const readState = () => { window.dispatchEvent(new window.Event('beforeunload')); return JSON.parse(window.localStorage.getItem('conquerorOS.v1')); };
const route = h => { window.location.hash = h; window.dispatchEvent(new window.Event('hashchange')); };

(async () => {
  await sleep(40);

  ok('boot: nav rendered', document.querySelectorAll('#primary-nav a').length >= 6,
     'links=' + document.querySelectorAll('#primary-nav a').length);
  ok('boot: dashboard rendered', $('#main').innerHTML.includes('Today'));
  ok('boot: streak ribbon present', !!$('.ribbon-track'));

  const routes = ['#/dashboard','#/library','#/reader/ch-stress-response','#/journal','#/trackers',
                  '#/challenges','#/graph','#/insights','#/settings','#/worksheets','#/worksheets/ws-daily-check'];
  for (const r of routes) {
    const before = errors.length;
    route(r); await sleep(15);
    ok('route ' + r + ' renders', $('#main').innerHTML.trim().length > 50 && errors.length === before,
       errors.slice(before).join(' | '));
  }

  // timezone check
  route('#/journal'); await sleep(15);
  const d = new Date();
  const localToday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  ok('timezone: journal date default is LOCAL today', $('#j-date').value === localToday,
     `got ${$('#j-date').value} want ${localToday}`);

  // journal save
  $('#j-text').value = 'A test reflection with **bold**';
  click($('#j-save')); await sleep(25);
  let st = readState();
  ok('journal: entry persisted', st.journal.length === 1);

  // journal filter keeps draft
  $('#j-text').value = 'draft kept?';
  click(document.querySelector('#journal-filter-tabs button[data-f="guided"]')); await sleep(15);
  ok('journal: filter switch keeps draft', $('#j-text').value === 'draft kept?', 'value=' + $('#j-text').value);
  ok('journal: count span updated', !!$('#journal-count'));

  // worksheet
  route('#/worksheets/ws-daily-check'); await sleep(15);
  click(document.querySelector('#field-mood button[data-val="4"]'));
  $('#field-win').value = 'shipped it';
  click($('#ws-save')); await sleep(25);
  st = readState();
  ok('worksheet: entry persisted', (st.worksheetEntries['ws-daily-check']||[]).length === 1);
  const b4 = errors.length;
  $('#worksheet-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(15);
  ok('worksheet: submit event does not throw', errors.length === b4);

  // tracker
  route('#/trackers'); await sleep(15);
  click(document.querySelector('#t-scale button[data-val="5"]'));
  click($('#t-save')); await sleep(25);
  st = readState();
  ok('tracker: entry persisted', st.trackers.length === 1 && st.trackers[0].value === 5);

  // challenge
  route('#/challenges'); await sleep(15);
  click($('[data-start="ch7-reset"]')); await sleep(15);
  click($('[data-checkin="ch7-reset"]')); await sleep(25);
  st = readState();
  ok('challenge: started + checked in',
     st.challenges['ch7-reset'] && Object.values(st.challenges['ch7-reset'].checkins).includes(true));

  // reader
  route('#/reader/ch-story-you-tell'); await sleep(15);
  click($('#btn-bookmark')); await sleep(30);
  if($('.x-overlay')){ const inp=$('.x-overlay input'); if(inp) inp.value='My mark'; const yes=$('.x-overlay [data-yes]'); if(yes) click(yes); }
  await sleep(20); st = readState();
  ok('reader: bookmark persisted', st.bookmarks.length === 1);
  click($('#btn-mark-complete')); await sleep(25);
  st = readState();
  ok('reader: chapter complete persisted',
     st.progress['ch-story-you-tell'] && st.progress['ch-story-you-tell'].status === 'complete');

  window.getSelection = () => ({ toString: () => 'selected phrase' });
  click($('#btn-hl-amber')); await sleep(25);
  st = readState();
  ok('reader: highlight stored', (st.highlights['ch-story-you-tell']||[]).length === 1);
  ok('reader: highlight visible in aside', $('#reader-aside').innerHTML.includes('selected phrase'));

  const b5 = errors.length;
  for (let i=0;i<25;i++){ route('#/reader/ch-story-you-tell'); await sleep(1); route('#/dashboard'); await sleep(1); }
  ok('reader: 25x navigation no errors', errors.length === b5, errors.slice(b5).join(' | '));

  // search
  click($('#search-box')); await sleep(15);
  $('#search-input').value = 'recovery';
  $('#search-input').dispatchEvent(new window.Event('input', { bubbles: true })); await sleep(15);
  ok('search: grouped results', document.querySelectorAll('#search-results .search-result').length > 0);

  // settings + report
  route('#/settings'); await sleep(15);
  ok('settings: export/csv/restore present', !!$('#ex-json') && !!$('#ex-csv') && !!$('#restore-file'));
  route('#/insights'); await sleep(15);
  click(document.querySelector('#insights-tabs button[data-tab="reports"]')); await sleep(15);
  ok('insights: report panel renders', !!$('#report-doc') && $('#report-doc').innerHTML.includes('Report'));

  // ---- review scheduling options (roadmap: configurable intervals + daily cap) ----
  route('#/settings'); await sleep(15);
  ok('settings: review scheduling controls present',
     !!$('#review-cap') && !!$('#review-first') && !!$('#review-second'));
  const setNum = (sel, val) => { const el = $(sel); el.value = String(val); el.dispatchEvent(new window.Event('change', { bubbles: true })); };
  setNum('#review-cap', 2);
  setNum('#review-first', 3);
  await sleep(15);
  st = readState();
  ok('settings: review cap + first interval persisted',
     st.settings.reviewDailyCap === 2 && st.settings.reviewFirstInterval === 3,
     JSON.stringify({ cap: st.settings.reviewDailyCap, first: st.settings.reviewFirstInterval }));

  route('#/review'); await sleep(15);
  const dueNow = Number(($('#main .stat-pill .n') || {}).textContent);
  ok('review: daily cap limits the due queue', dueNow === 2, 'due=' + dueNow);

  click($('#rev-show')); await sleep(15);
  click(document.querySelector('#rev-grade [data-q="4"]')); await sleep(25);
  st = readState();
  const revKeys = Object.keys(st.review);
  const d3 = new Date(); d3.setDate(d3.getDate() + 3);
  const want3 = d3.getFullYear() + '-' + String(d3.getMonth() + 1).padStart(2, '0') + '-' + String(d3.getDate()).padStart(2, '0');
  ok('review: first interval is configurable (3 days)',
     revKeys.length === 1 && st.review[revKeys[0]].due === want3,
     'due=' + ((st.review[revKeys[0]] || {}).due) + ' want=' + want3);

  const failed = results.filter(r => !r.pass);
  console.log('\n==== RESULTS ====');
  results.forEach(r => console.log(`${r.pass?'PASS':'FAIL'}  ${r.name}${r.extra?'  ['+r.extra+']':''}`));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (errors.length) { console.log('\nCaptured errors:'); errors.slice(0,20).forEach(e=>console.log(' - '+e)); }
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('TEST HARNESS CRASH', e); process.exit(2); });
