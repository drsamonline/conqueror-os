'use strict';
/**
 * Conqueror OS — optional service worker.
 *
 * Served over http(s) the app becomes installable and keeps working with the
 * network off. Opened from disk this file is never registered: a worker needs an
 * origin, and the single file is already offline by construction.
 *
 * Policy, deliberately narrow:
 *   - cache-first for same-origin GETs, so a reload with no network still boots;
 *   - every other request (cross-origin, non-GET) is left to the browser exactly
 *     as it would be without a worker — this file intercepts nothing it cannot
 *     serve;
 *   - the cache is named for the app version, so a release can never serve a
 *     stale shell: a new worker gets a new cache and the old ones are dropped on
 *     activate;
 *   - no sync, no push, no beacon, no analytics, no server. Nothing leaves the
 *     device.
 */

var VERSION = '3.2.0';
var CACHE = 'conqueror-os-' + VERSION;
var SHELL = ['./', './index.html'];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE ? null : caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (!request || request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(request, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return fetch(request).then(function (response) {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        }).catch(function (err) {
          // Offline and never cached: a navigation still gets the shell, so the
          // app opens instead of the browser's error page. Anything else fails
          // the way it would have failed without this worker.
          if (request.mode === 'navigate') {
            return cache.match('./index.html', { ignoreSearch: true });
          }
          throw err;
        });
      });
    })
  );
});
