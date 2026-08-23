/* My Tutoring Hub — minimal PWA service worker
 * Navigations are always network-first and never written to Cache Storage.
 * Only offline fallback + icons are precached. Bump CACHE on each integrity fix.
 */
const CACHE = "mth-shell-v3";
const SHELL = ["/offline.html", "/manifest.webmanifest", "/logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API or auth-sensitive app routes
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/messages") ||
    url.pathname.startsWith("/settings") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/assistant")
  ) {
    return;
  }

  // HTML documents / navigations: network only (no Cache Storage write)
  const isDocument =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith(".rsc");

  if (isDocument) {
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match("/offline.html")),
    );
    return;
  }

  // Hashed Next static assets: cache-first is safe (content-addressed filenames)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Other static icons/images: network-first, then cache
  if (url.pathname.match(/\.(png|svg|jpg|jpeg|webp|ico|webmanifest)$/)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
  }
});
