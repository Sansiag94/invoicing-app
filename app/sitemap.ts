import type { MetadataRoute } from "next";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicInvoiceBaseUrl();
  const lastModified = new Date("2026-04-04T00:00:00.000Z");

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/help`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/imprint`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
