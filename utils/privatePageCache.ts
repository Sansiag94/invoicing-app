type CacheEntry = {
  value: unknown;
  updatedAt: number;
};

const privatePageCache = new Map<string, CacheEntry>();

export function readPrivatePageCache<T>(key: string): T | null {
  const entry = privatePageCache.get(key);
  if (!entry) {
    return null;
  }

  return entry.value as T;
}

export function writePrivatePageCache<T>(key: string, value: T): T {
  privatePageCache.set(key, {
    value,
    updatedAt: Date.now(),
  });

  return value;
}

export function clearPrivatePageCache(key?: string) {
  if (typeof key === "string") {
    privatePageCache.delete(key);
    return;
  }

  privatePageCache.clear();
}

export function getPrivatePageCacheAgeMs(key: string): number | null {
  const entry = privatePageCache.get(key);
  if (!entry) {
    return null;
  }

  return Date.now() - entry.updatedAt;
}
