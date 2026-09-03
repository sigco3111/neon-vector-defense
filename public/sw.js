// Service worker for Lantern 7 — base-aware (GH Pages subpath /neon-vector-defense/).
// install: precache the shell at THIS origin's path so cache lookups by URL hit
// the right entries even when scope != '/' (the SW scope is the script's directory,
// not the site root in subpath deploys). The helper reads the script's own URL
// and falls back to './' for non-subpath origins (root /).
const SCRIPT_URL = new URL(self.location.href);
const ORIGIN_PATH = SCRIPT_URL.pathname.replace(/sw\.js$/, '');
// APP_SHELL entries are emitted verbatim from the running scope — every URL the
// player might hit on first paint (root, the SPA entry, manifest, icons).
const APP_SHELL = [
  './',
  './index.html',
  './site.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
].map((p) => new URL(p, SCRIPT_URL).pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('nvd-shell-v5')
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== 'nvd-shell-v5').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigations (?run=<id> replay deep links, /privacy, /admin, /): network-first,
  // fall back to the cached shell. ignoreSearch so a "/?run=..." URL still matches "/".
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(ORIGIN_PATH + 'index.html', { ignoreSearch: true })
          .then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // Hashed build assets + shell: cache-first, then network (and cache the result).
  // A failed network fetch must fall back to cache rather than reject uncaught.
  const inShell = APP_SHELL.some((p) => url.pathname === p);
  const isAsset = url.pathname.startsWith(ORIGIN_PATH + 'assets/');
  if (inShell || isAsset) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open('nvd-shell-v5').then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => caches.match(request, { ignoreSearch: true }).then((c) => c || Response.error())),
      ),
    );
  }
});
