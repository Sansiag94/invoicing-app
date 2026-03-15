const DEFAULT_PUBLIC_APP_URL = "https://invoices.sierraservices.ch";

export function getPublicInvoiceBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_PUBLIC_APP_URL;
}

export function buildPublicInvoiceLinkFromToken(publicToken: string, baseUrl?: string): string {
  const normalizedToken = publicToken.trim();
  if (!normalizedToken) {
    throw new Error("Missing public invoice token");
  }

  return new URL(
    `/invoice/pay/${encodeURIComponent(normalizedToken)}`,
    baseUrl?.trim() || getPublicInvoiceBaseUrl()
  ).toString();
}

export function buildPublicInvoiceLink(publicToken: string, requestUrl?: string): string {
  const normalizedToken = publicToken.trim();
  if (!normalizedToken) {
    throw new Error("Missing public invoice token");
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) {
    return buildPublicInvoiceLinkFromToken(normalizedToken, configuredBaseUrl);
  }

  if (requestUrl) {
    return buildPublicInvoiceLinkFromToken(normalizedToken, new URL(requestUrl).origin);
  }

  return buildPublicInvoiceLinkFromToken(normalizedToken);
}
