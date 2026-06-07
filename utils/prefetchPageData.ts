import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { getPrivatePageCacheAgeMs, writePrivatePageCache } from "@/utils/privatePageCache";

const DATA_PREFETCH_MAX_AGE_MS = 60_000;
const pendingPrefetches = new Map<string, Promise<void>>();
const pendingJsonRequests = new Map<string, Promise<unknown>>();

function shouldRefreshCache(key: string) {
  const ageMs = getPrivatePageCacheAgeMs(key);
  return ageMs === null || ageMs > DATA_PREFETCH_MAX_AGE_MS;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const requestKey = `${init?.method ?? "GET"} ${url}`;
  const pending = pendingJsonRequests.get(requestKey);
  if (pending) {
    return pending as Promise<T>;
  }

  const nextRequest = (async () => {
    const response = await authenticatedFetch(url, init);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : `Failed to prefetch ${url}`);
    }

    return data as T;
  })();

  pendingJsonRequests.set(requestKey, nextRequest);

  try {
    return await nextRequest;
  } finally {
    pendingJsonRequests.delete(requestKey);
  }
}

function runPrefetch(name: string, callback: () => Promise<void>) {
  const pending = pendingPrefetches.get(name);
  if (pending) {
    return pending;
  }

  const nextPrefetch = callback()
    .catch((error) => {
      console.debug(`[prefetch] ${name} failed`, error);
    })
    .finally(() => {
      pendingPrefetches.delete(name);
    });

  pendingPrefetches.set(name, nextPrefetch);
  return nextPrefetch;
}

function getDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultAnalyticsDateRange() {
  const now = new Date();
  return {
    startDate: getDateInputValue(new Date(now.getFullYear(), 0, 1)),
    endDate: getDateInputValue(new Date(now.getFullYear(), 11, 31)),
  };
}

export function prefetchPrivatePageData() {
  const tasks: Array<Promise<void>> = [];

  if (shouldRefreshCache("dashboard-overview")) {
    tasks.push(
      runPrefetch("dashboard-overview", async () => {
        const dashboard = await requestJson("/api/dashboard", { cache: "no-store" });
        writePrivatePageCache("dashboard-overview", dashboard);
      })
    );
  }

  if (shouldRefreshCache("clients-list")) {
    tasks.push(
      runPrefetch("clients-list", async () => {
        const clients = await requestJson("/api/clients");
        writePrivatePageCache("clients-list", Array.isArray(clients) ? clients : []);
      })
    );
  }

  if (shouldRefreshCache("expenses-page-data")) {
    tasks.push(
      runPrefetch("expenses-page-data", async () => {
        const expenses = await requestJson("/api/expenses");
        writePrivatePageCache("expenses-page-data", expenses);
      })
    );
  }

  if (shouldRefreshCache("settings-page-bootstrap")) {
    tasks.push(
      runPrefetch("settings-page-bootstrap", async () => {
        const [business, billing] = await Promise.all([
          requestJson("/api/business"),
          requestJson("/api/billing/status"),
        ]);
        writePrivatePageCache("settings-page-bootstrap", { business, billing });
      })
    );
  }

  if (shouldRefreshCache("invoices-page-bootstrap")) {
    tasks.push(
      runPrefetch("invoices-page-bootstrap", async () => {
        const [clients, invoices, business, billing, portfolioItems] = await Promise.all([
          requestJson("/api/clients"),
          requestJson("/api/invoices"),
          requestJson("/api/business"),
          requestJson("/api/billing/status"),
          requestJson("/api/portfolio-items"),
        ]);

        writePrivatePageCache("invoices-page-bootstrap", {
          clients: Array.isArray(clients) ? clients : [],
          invoices: Array.isArray(invoices) ? invoices : [],
          business,
          billing,
          portfolioItems: Array.isArray(portfolioItems) ? portfolioItems : [],
        });
      })
    );
  }

  if (shouldRefreshCache("analytics-overview")) {
    tasks.push(
      runPrefetch("analytics-overview", async () => {
        const { startDate, endDate } = getDefaultAnalyticsDateRange();
        const analytics = await requestJson(
          `/api/analytics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
          { cache: "no-store" }
        );
        writePrivatePageCache("analytics-overview", analytics);
      })
    );
  }

  return Promise.allSettled(tasks);
}
