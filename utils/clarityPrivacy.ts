const CLARITY_MARKETING_PATHS = new Set([
  "/invoice-software-switzerland",
  "/rechnung-software-schweiz",
]);

const ANALYTICS_CONSENT_STORAGE_KEY = "sierra-invoices-analytics-consent";

export type AnalyticsConsent = "accepted" | "rejected";

type ClarityFunction = (...args: unknown[]) => void;
type GtagFunction = (...args: unknown[]) => void;

type ClarityWindow = Window & {
  clarity?: ClarityFunction;
  gtag?: GtagFunction;
};

export function isClarityMarketingPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && CLARITY_MARKETING_PATHS.has(pathname));
}

function getAnalyticsConsentStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredAnalyticsConsent(): AnalyticsConsent | null {
  const storage = getAnalyticsConsentStorage();
  const value = storage?.getItem(ANALYTICS_CONSENT_STORAGE_KEY);

  return value === "accepted" || value === "rejected" ? value : null;
}

export function storeAnalyticsConsent(consent: AnalyticsConsent) {
  getAnalyticsConsentStorage()?.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
}

export function applyAnalyticsConsent(consent: AnalyticsConsent | null) {
  if (typeof window === "undefined") {
    return;
  }

  const accepted = consent === "accepted";
  const win = window as ClarityWindow;

  if (typeof win.clarity === "function") {
    win.clarity("consent", accepted);
  }

  if (typeof win.gtag === "function") {
    win.gtag("consent", "update", {
      ad_storage: accepted ? "granted" : "denied",
      ad_user_data: accepted ? "granted" : "denied",
      ad_personalization: accepted ? "granted" : "denied",
      analytics_storage: accepted ? "granted" : "denied",
    });
  }
}

export function applyStoredAnalyticsConsent() {
  applyAnalyticsConsent(getStoredAnalyticsConsent());
}

export function disableClarityTracking() {
  applyAnalyticsConsent(null);
}
