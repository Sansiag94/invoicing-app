const CACHE_NAME = "sierra-invoices-v2";
const OFFLINE_URL = "/offline.html";
const APP_SHELL = [
  OFFLINE_URL,
  "/",
  "/manifest.webmanifest",
  "/pwa-192.svg",
  "/pwa-512.svg",
  "/apple-touch-icon.svg",
];
const PUBLIC_NAVIGATION_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  OFFLINE_URL,
]);
const PUBLIC_NAVIGATION_PREFIXES = ["/invoice/pay/", "/i/"];

function isCacheableResponse(response) {
  return Boolean(response && (response.ok || response.type === "opaque"));
}

function isPublicNavigation(pathname) {
  return (
    PUBLIC_NAVIGATION_ROUTES.has(pathname) ||
    PUBLIC_NAVIGATION_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

async function warmAppShellCache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkFetch = fetch(request)
    .then(async (response) => {
      if (isCacheableResponse(response)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    warmAppShellCache().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "RESET_APP_CACHE") {
    return;
  }

  event.waitUntil(
    caches
      .delete(CACHE_NAME)
      .then(() => warmAppShellCache())
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    if (isPublicNavigation(url.pathname)) {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image"
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});
