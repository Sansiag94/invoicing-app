function buildContentSecurityPolicy(frameAncestors: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    frameAncestors,
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.clarity.ms https://scripts.clarity.ms",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://js.stripe.com https://q.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net https://stats.g.doubleclick.net https://www.clarity.ms https://*.clarity.ms",
    "frame-src 'self' blob: https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "form-action 'self' https://checkout.stripe.com",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy("frame-ancestors 'none'");

const PUBLIC_INVOICE_CONTENT_SECURITY_POLICY = buildContentSecurityPolicy(
  [
    "frame-ancestors 'self'",
    "https://mail.google.com",
    "https://outlook.live.com",
    "https://outlook.office.com",
    "https://outlook.office365.com",
    "https://resend.com",
    "https://*.resend.com",
  ].join(" ")
);

export const SECURITY_HEADERS = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
} as const;

const PUBLIC_INVOICE_SECURITY_HEADERS: Record<string, string> = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy": PUBLIC_INVOICE_CONTENT_SECURITY_POLICY,
  "Cross-Origin-Resource-Policy": "cross-origin",
};

delete PUBLIC_INVOICE_SECURITY_HEADERS["X-Frame-Options"];

function isPublicInvoicePath(pathname: string): boolean {
  return (
    pathname.startsWith("/invoice/pay/") ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/api/public/invoice/")
  );
}

export function getSecurityHeaders(pathname: string): Record<string, string> {
  return isPublicInvoicePath(pathname) ? PUBLIC_INVOICE_SECURITY_HEADERS : SECURITY_HEADERS;
}
