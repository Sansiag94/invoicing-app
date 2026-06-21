export const GOOGLE_ADS_ID = "AW-18188019032";

type GoogleAdsConversionOptions = {
  sendTo?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackGoogleAdsConversion(options: GoogleAdsConversionOptions = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "conversion", {
    send_to: options.sendTo ?? GOOGLE_ADS_ID,
  });
}
