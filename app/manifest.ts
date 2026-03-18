import type { MetadataRoute } from "next";
import { APP_BRAND_ICON_VERSION } from "@/lib/appBrand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sierra Invoices",
    short_name: "Sierra",
    description: "Professional invoicing for Swiss businesses and freelancers.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    lang: "en",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: `/brand-icon?size=192&v=${APP_BRAND_ICON_VERSION}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/brand-icon?size=512&v=${APP_BRAND_ICON_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/brand-icon?size=512&v=${APP_BRAND_ICON_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
      },
      {
        name: "Create invoice",
        short_name: "Invoice",
        url: "/invoices",
      },
      {
        name: "Clients",
        short_name: "Clients",
        url: "/clients",
      },
    ],
  };
}
