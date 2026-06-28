"use client";

import { useEffect, useState } from "react";
import {
  applyAnalyticsConsent,
  getStoredAnalyticsConsent,
  storeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/utils/clarityPrivacy";

export default function CookieConsentBanner() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(() =>
    getStoredAnalyticsConsent()
  );

  useEffect(() => {
    applyAnalyticsConsent(consent);
  }, [consent]);

  function choose(nextConsent: AnalyticsConsent) {
    storeAnalyticsConsent(nextConsent);
    setConsent(nextConsent);
  }

  if (consent !== null) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          We use cookies to understand how this website is used and improve the experience.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
            onClick={() => choose("rejected")}
          >
            Reject
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            onClick={() => choose("accepted")}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
