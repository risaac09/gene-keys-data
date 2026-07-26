// Cache-first service worker. Bumping VERSION is the whole release mechanism:
// change it with any shipped change; clients pick up the new shell on their
// second load after the deploy. All paths are relative so the app works under
// the GitHub Pages project prefix.

const VERSION = "gk-app-v2";

const PRECACHE = [
  "./",
  "./index.html",
  "./selftest.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./js/app.js",
  "./js/dom.js",
  "./js/store.js",
  "./js/tz.js",
  "./js/cities.js",
  "./js/fmt.js",
  "./js/ics.js",
  "./js/gcal.js",
  "./js/export.js",
  "./js/selftest.js",
  "./js/ui-birth.js",
  "./js/ui-rhythm.js",
  "./js/ui-seasons.js",
  "./js/ui-explore.js",
  "./js/ui-now.js",
  "./js/engine/astro.js",
  "./js/engine/wheel.js",
  "./js/engine/chart.js",
  "./js/engine/windows.js",
  "./js/engine/seasons.js",
  "./vendor/astronomy-engine/astronomy.browser.min.js",
  "./vendor/cities/cities.json",
  "../data/gate-wheel.json",
  "../data/hexagrams.json",
  "../data/sequences/activation.json",
  "../data/sequences/venus.json",
  "../data/sequences/pearl.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(
      (hit) => hit ||
        fetch(event.request).then((response) => {
          // Cache-first means anything stored here is served forever, so a
          // transient 404 or 500 must not become the permanent answer.
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }),
    ),
  );
});
