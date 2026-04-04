import type { MetadataRoute } from "next";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicInvoiceBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/help", "/imprint", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/analytics",
        "/clients",
        "/dashboard",
        "/dev/",
        "/expenses",
        "/i/",
        "/invoice/pay/",
        "/invoices",
        "/settings",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
