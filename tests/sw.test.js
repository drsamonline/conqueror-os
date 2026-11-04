'use strict';
/**
 * Conqueror OS — service worker suite.
 * Drives the real docs/play/sw.js against a stub Cache API and a stub fetch:
 * install, activate and fetch are executed and their effects observed, rather
 * than asserting that the file exists.   node tests/sw.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const results = [];
const ok = (n, c, x) => results.push({ n, c: !!c, x });

function env(o) {
  o = o || {};
  const L = {}, calls = [], names = new Set(o.caches || []), entries = o.entries || {}, fetched = [];
  let claimed = 0, skipped = 0;
  const cacheFor = n => {
    names.add(n);
    entries[n] = entries[n] || {};
    return {
      addAll: u => { calls.push(['addAll', n, u.slice()]); u.forEach(k => { entries[n][k] = { ok: true, cached: k }; }); return Promise.resolve(); },
      match: (r, opt) => { const k = typeof r === 'string' ? r : r.url; const hit = entries[n][k] || (opt && opt.ignoreSearch ? entries[n][k.split('?')[0]] : undefined); return Promise.resolve(hit); },
      put: (r, res) => { entries[n][r.url || r] = res; calls.push(['put', n]); return Promise.resolve(); }
    };
  };
  const caches = {
    open: n => { calls.push(['open', n]); return Promise.resolve(cacheFor(n)); },
    keys: () => Promise.resolve([...names]),
    delete: n => { names.delete(n); calls.push(['delete', n]); return Promise.resolve(true); }
  };
  const fetchStub = r => { fetched.push(r.url); return o.fetchFails ? Promise.reject(new Error('offline')) : Promise.resolve({ ok: true, url: r.url, clone() { return this; } }); };
  const self = { location: { origin: 'https://drsamonline.github.io' }, addEventListener: (t, f) => { L[t] = f; }, skipWaiting: () => { skipped++; return Promise.resolve(); }, clients: { claim: () => { claimed++; return Promise.resolve(); } } };
  const box = { self, caches, fetch: fetchStub, URL, Promise, console };
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'docs', 'play', 'sw.js'), 'utf8'), box, { filename: 'sw.js' });
  return {
    L, calls, fetched, claimed: () => claimed, skipped: () => skipped,
    async fire(type, extra) {
      let waited = null;
      const ev = Object.assign({ waitUntil(p) { waited = p; }, respondWith(p) { this.responded = p; waited = p; } }, extra || {});
      if (L[type]) L[type](ev);
      if (waited) { try { await waited; } catch (e) { ev.rejection = e; } }
      return ev;
    }
  };
}
const get = (url, extra) => Object.assign({ method: 'GET', url, mode: 'no-cors' }, extra || {});

(async () => {
  let e = env();
  ok('worker: registers install / activate / fetch', ['install', 'activate', 'fetch'].every(t => typeof e.L[t] === 'function'));
  await e.fire('install');
  ok('install: cache is named for the release', (e.calls.find(c => c[0] === 'open') || [])[1] === 'conqueror-os-3.2.0');
  const add = e.calls.find(c => c[0] === 'addAll');
  ok('install: precaches the shell', !!add && add[2].includes('./index.html') && add[2].includes('./'));
  ok('install: takes over immediately', e.skipped() === 1);

  e = env({ caches: ['conqueror-os-3.1.1', 'conqueror-os-3.2.0'] });
  await e.fire('activate');
  ok('activate: drops the previous release cache', e.calls.some(c => c[0] === 'delete' && c[1] === 'conqueror-os-3.1.1'));
  ok('activate: keeps its own cache', !e.calls.some(c => c[0] === 'delete' && c[1] === 'conqueror-os-3.2.0'));
  ok('activate: claims the clients', e.claimed() === 1);

  e = env();
  ok('fetch: a same-origin GET is answered', !!(await e.fire('fetch', { request: get('https://drsamonline.github.io/conqueror-os/') })).responded);

  e = env({ entries: { 'conqueror-os-3.2.0': { 'https://drsamonline.github.io/conqueror-os/': { ok: true, cached: true } } } });
  const hit = await (await e.fire('fetch', { request: get('https://drsamonline.github.io/conqueror-os/') })).responded;
  ok('fetch: a cached shell is served from the cache', hit && hit.cached === true);
  ok('fetch: a cache hit makes no network request', e.fetched.length === 0);

  e = env();
  const miss = await (await e.fire('fetch', { request: get('https://drsamonline.github.io/conqueror-os/#/journal') })).responded;
  ok('fetch: a cache miss goes to the network', e.fetched.length === 1);
  ok('fetch: a cache miss returns the network response', miss && miss.ok === true);
  ok('fetch: a fetched response is cached', e.calls.some(c => c[0] === 'put'));

  e = env({ fetchFails: true, entries: { 'conqueror-os-3.2.0': { './index.html': { ok: true, shell: true } } } });
  const off = await (await e.fire('fetch', { request: get('https://drsamonline.github.io/conqueror-os/deep/link', { mode: 'navigate' }) })).responded;
  ok('fetch: offline, a navigation still opens the shell', off && off.shell === true);

  e = env({ fetchFails: true });
  ok('fetch: offline, a non-navigation fails as it would without a worker', !!(await e.fire('fetch', { request: get('https://drsamonline.github.io/conqueror-os/a.png') })).rejection);

  e = env();
  ok('fetch: a POST is not intercepted', !(await e.fire('fetch', { request: get('https://drsamonline.github.io/conqueror-os/', { method: 'POST' }) })).responded);
  e = env();
  ok('fetch: a cross-origin request is not intercepted', !(await e.fire('fetch', { request: get('https://example.com/t.js') })).responded && e.fetched.length === 0);

  const page = fs.readFileSync(path.join(ROOT, 'src', 'index.html'), 'utf8');
  const csp = (page.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  ok('page: the CSP admits the worker', /worker-src 'self'/.test(csp), csp);
  ok('page: the CSP still forbids the network', /connect-src 'none'/.test(csp) && /default-src 'none'/.test(csp));
  ok('page: registration is guarded on serviceWorker and protocol', /'serviceWorker' in navigator/.test(page) && /protocol !== 'https:'/.test(page) && /protocol !== 'http:'/.test(page));
  ok('page: a failed registration is not fatal', /register\(\'sw\.js\'\)\.catch\(function\(\)\{\}\)/.test(page));

  let bad = 0;
  for (const r of results) { if (!r.c) bad++; console.log(`${r.c ? 'PASS' : 'FAIL'}  ${r.n}${r.c ? '' : '  [' + (r.x || '') + ']'}`); }
  console.log(`\n${results.length - bad}/${results.length} passed`);
  process.exit(bad ? 1 : 0);
})();
