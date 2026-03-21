import type { MetadataRoute } from "next";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicInvoiceBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/imprint", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/analytics",
        "/clients",
        "/dashboard",
        "/dev/",
        "/expenses",
        "/forgot-password",
        "/i/",
        "/invoice/pay/",
        "/invoices",
        "/login",
        "/reset-password",
        "/settings",
        "/signup",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
