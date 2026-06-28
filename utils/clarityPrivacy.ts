const CLARITY_MARKETING_PATHS = new Set([
  "/invoice-software-switzerland",
  "/rechnung-software-schweiz",
]);

type ClarityFunction = (...args: unknown[]) => void;

type ClarityWindow = Window & {
  clarity?: ClarityFunction;
};

export function isClarityMarketingPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && CLARITY_MARKETING_PATHS.has(pathname));
}

export function disableClarityTracking() {
  if (typeof window === "undefined") {
    return;
  }

  const clarity = (window as ClarityWindow).clarity;
  if (typeof clarity === "function") {
    clarity("consent", false);
  }
}
