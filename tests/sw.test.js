'use strict';
/**
 * Conqueror OS — service-worker suite.
 *
 * Proves the optional worker actually behaves, rather than that the file exists:
 * the worker source is executed in a sandbox with a stub Cache API and stub
 * fetch, and its install / activate / fetch handlers are driven the way a
 * browser would drive them.
 *
 *   node tests/sw.test.js
 *
 * What it asserts
 *   install   precaches the shell, and skipWaiting is called
 *   activate  deletes every cache that is not the current one, then claims clients
 *   fetch     same-origin GET  -> served from cache when present, never hitting the network
 *             cache miss       -> fetched, and the response is put in the cache
 *             cross-origin GET -> left alone (no respondWith)
 *             POST             -> left alone (no respondWith)
 *   page      registers only over http(s) with a serviceWorker, is not fatal on failure,
 *             and the CSP admits the worker while staying closed everywhere else
 *   version   the cache name tracks package.json, so a release cannot ship a stale cache
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SW = path.join(ROOT, 'docs', 'play', 'sw.js');
const SRC = path.join(ROOT, 'src', 'index.html');
const PKG = path.join(ROOT, 'package.json');

const results = [];
const ok = (name, cond, extra = '') => results.push({ name, pass: !!cond, extra });

/* ---------- a stub Cache API + fetch, enough to drive the worker ---------- */
function makeSandbox() {
  const handlers = {};
  const log = { fetched: [], put: [], addAll: [], deleted: [], claimed: 0, skipWaiting: 0 };
  const store = new Map(); // cacheName -> Map(url -> response)

  const abs = (u) => { try { return new URL(u, 'https://example.test/play/').href; } catch (e) { return u; } };
  const key = (req) => abs(typeof req === 'string' ? req : req.url);

  function cacheFor(name) {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      addAll: (list) => { log.addAll.push(list.slice()); list.forEach((u) => m.set(key(u), { url: key(u), ok: true, type: 'basic' })); return Promise.resolve(); },
      match: (req) => Promise.resolve(m.get(key(req))),
      put: (req, res) => { log.put.push(key(req)); m.set(key(req), res); return Promise.resolve(); }
    };
  }

  const sandbox = {
    self: {
      addEventListener: (type, fn) => { handlers[type] = fn; },
      location: { origin: 'https://example.test' },
      skipWaiting: () => { log.skipWaiting++; return Promise.resolve(); },
      clients: { claim: () => { log.claimed++; return Promise.resolve(); } }
    },
    caches: {
      open: (name) => Promise.resolve(cacheFor(name)),
      keys: () => Promise.resolve([...store.keys()]),
      delete: (name) => { log.deleted.push(name); store.delete(name); return Promise.resolve(true); }
    },
    fetch: (req) => { log.fetched.push(key(req)); return Promise.resolve({ url: key(req), ok: true, type: 'basic', clone() { return this; } }); },
    URL,
    Promise,
    console
  };
  sandbox.self.self = sandbox.self;
  return { sandbox, handlers, log, store };
}

function fire(sandbox, handlers, type, event) {
  return new Promise((resolve) => {
    let waited;
    let responded;
    const e = Object.assign({
      waitUntil: (p) => { waited = p; },
      respondWith: (p) => { responded = p; }
    }, event || {});
    handlers[type](e);
    // the handler may only schedule work; wait for whatever it scheduled
    Promise.resolve(waited).then(() => {
      if (responded) return Promise.resolve(responded).then((r) => resolve({ response: r }));
      resolve({});
    }, () => resolve({}));
  });
}

(async () => {
  const source = fs.readFileSync(SW, 'utf8');
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  const page = fs.readFileSync(SRC, 'utf8');

  /* ---------------------------- the worker itself ---------------------------- */
  const { sandbox, handlers, log, store } = makeSandbox();
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sw.js' });

  ok('sw: registers install, activate and fetch handlers',
     !!(handlers.install && handlers.activate && handlers.fetch));

  await fire(sandbox, handlers, 'install');
  ok('install: precaches the shell', log.addAll.length === 1 && log.addAll[0].includes('./index.html'),
     JSON.stringify(log.addAll));
  ok('install: skipWaiting called', log.skipWaiting === 1);

  // a cache from a previous version must go
  store.set('conqueror-os-v0.0.1', new Map());
  await fire(sandbox, handlers, 'activate');
  ok('activate: deletes the stale cache', log.deleted.includes('conqueror-os-v0.0.1'), JSON.stringify(log.deleted));
  ok('activate: claims the clients', log.claimed === 1);

  // fetch, cache-first, same origin
  const reqUrl = 'https://example.test/play/index.html';
  const current = [...store.keys()].find((k) => k === 'conqueror-os-v' + JSON.parse(JSON.stringify(pkg.version)));
  ok('cache: the current cache is named for package.json', !!current, String(current));

  const hit = await fire(sandbox, handlers, 'fetch', { request: { method: 'GET', url: reqUrl } });
  ok('fetch: same-origin GET is served from cache', !!hit.response && hit.response.url === reqUrl,
     JSON.stringify(hit.response && hit.response.url));
  ok('fetch: a cache hit does not touch the network', log.fetched.length === 0, JSON.stringify(log.fetched));

  // cache miss -> network, and the response is kept
  const missUrl = 'https://example.test/play/manifest.webmanifest'; // not in the precached shell
  const miss = await fire(sandbox, handlers, 'fetch', { request: { method: 'GET', url: missUrl } });
  ok('fetch: a miss goes to the network', log.fetched.includes(missUrl), JSON.stringify(log.fetched));
  ok('fetch: the fetched response is cached', log.put.includes(missUrl), JSON.stringify(log.put));
  ok('fetch: the miss still answers', !!miss.response && miss.response.url === missUrl);

  // things it must not touch
  const cross = await fire(sandbox, handlers, 'fetch', { request: { method: 'GET', url: 'https://cdn.example.org/lib.js' } });
  ok('fetch: a cross-origin request is left to the browser', cross.response === undefined);
  const post = await fire(sandbox, handlers, 'fetch', { request: { method: 'POST', url: 'https://example.test/play/index.html' } });
  ok('fetch: a POST is left to the browser', post.response === undefined);

  ok('sw: it registers no push, no background sync, no beacon and no XHR',
     !/addEventListener\(\s*['"](push|sync|periodicsync)['"]/.test(source) &&
     !/XMLHttpRequest|sendBeacon|importScripts/.test(source));

  /* ------------------------------ the page side ------------------------------ */
  ok('page: registers sw.js', /navigator\.serviceWorker\.register\(\s*['"]sw\.js['"]\s*\)/.test(page));
  ok('page: only over http(s)', /location\.protocol\s*!==\s*['"]http:['"]\s*&&\s*location\.protocol\s*!==\s*['"]https:['"]/.test(page));
  ok('page: a failed registration is not fatal', /\.catch\(/.test(page.slice(page.indexOf('serviceWorker'))));
  ok('page: still no network of its own (connect-src stays closed)', /connect-src 'none'/.test(page));
  ok('page: the CSP admits the worker', /worker-src 'self'/.test(page));
  ok('page: the CSP is otherwise unchanged',
     /default-src 'none'/.test(page) && /object-src 'none'/.test(page) && /base-uri 'none'/.test(page));

  /* -------------------------------- versions -------------------------------- */
  const declared = (source.match(/const VERSION = "([^"]+)"/) || [])[1];
  ok('version: sw.js declares the package version', declared === pkg.version, declared + ' vs ' + pkg.version);
  ok('version: the cache name is built from it, not hard-coded twice',
     /const CACHE = "conqueror-os-v" \+ VERSION/.test(source));

  /* --------------------------------- report --------------------------------- */
  let failed = 0;
  for (const r of results) {
    if (!r.pass) failed++;
    console.log((r.pass ? 'PASS  ' : 'FAIL  ') + r.name + (r.extra && !r.pass ? '  [' + r.extra + ']' : ''));
  }
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  process.exit(failed ? 1 : 0);
})();
