/* Conqueror OS — optional service worker.
 *
 * What it is for: when the app is served over HTTP(S) (GitHub Pages, or any
 * static host), this makes it installable and keeps it working with the network
 * off. It is deliberately OPTIONAL — the app is already a single file that needs
 * no network, and the registration in the page is skipped on file:// because a
 * worker needs an origin.
 *
 * What it never does: talk to a server. There is no sync, no analytics, no
 * push, no background fetch. It stores the app shell and nothing else.
 *
 * The cache name carries the app version, so a new version is a new cache and
 * the old one is deleted on activate. Bump it with package.json.
 */
"use strict";

const VERSION = "3.2.0";
const CACHE = "conqueror-os-v" + VERSION;

/* The shell: the app itself and the kit it inlines. Paths are relative to this
 * worker's scope, which is the directory it is served from (/play/). */
const SHELL = ["./", "./index.html", "./export-kit.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first, and only for same-origin GETs. Anything else — a cross-origin
 * request, a POST — is left to the browser exactly as it would be without a
 * worker. Nothing is ever cached that the app did not ship. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        });
      })
    )
  );
});
