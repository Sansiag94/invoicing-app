"use client";

const PWA_CACHE_PREFIX = "sierra-invoices-";

export function isPwaCacheKey(cacheKey: string): boolean {
  return cacheKey.startsWith(PWA_CACHE_PREFIX);
}

export async function clearPwaAppCache(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: "RESET_APP_CACHE" });
    } catch (error) {
      console.error("Unable to reach service worker for cache reset:", error);
    }
  }

  if (!("caches" in window)) {
    return;
  }

  try {
    const cacheKeys = await window.caches.keys();
    await Promise.all(
      cacheKeys.filter(isPwaCacheKey).map((cacheKey) => window.caches.delete(cacheKey))
    );
  } catch (error) {
    console.error("Unable to clear PWA caches:", error);
  }
}
