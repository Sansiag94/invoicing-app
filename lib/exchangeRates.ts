type ExchangeRateResponse = {
  rates?: Record<string, number>;
};

const SUPPORTED_CONVERSION_TARGETS = ["EUR", "USD"] as const;

export type ApproximateCurrencyConversion = {
  currency: (typeof SUPPORTED_CONVERSION_TARGETS)[number];
  amount: number;
  rate: number;
};

export async function getApproximateCurrencyConversions(
  amount: number,
  baseCurrency: string
): Promise<ApproximateCurrencyConversion[]> {
  const normalizedBase = baseCurrency.trim().toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0 || normalizedBase !== "CHF") {
    return [];
  }

  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=CHF&to=EUR,USD",
      { next: { revalidate: 60 * 60 * 6 } }
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as ExchangeRateResponse;
    return SUPPORTED_CONVERSION_TARGETS.flatMap((currency) => {
      const rate = data.rates?.[currency];
      if (!rate || !Number.isFinite(rate)) {
        return [];
      }

      return [{ currency, rate, amount: amount * rate }];
    });
  } catch (error) {
    console.warn("[exchange-rates] Unable to load CHF conversion helper", error);
    return [];
  }
}
