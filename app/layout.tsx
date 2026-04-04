import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { getGoogleSiteVerification, validateRequiredEnv } from "@/lib/env";
import AppFrame from "@/components/AppFrame";
import AuthBootstrap from "@/components/AuthBootstrap";
import PwaProvider from "@/components/PwaProvider";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ui/theme";
import { APP_BRAND_ICON_VERSION, APP_MANIFEST_VERSION, APP_NAME } from "@/lib/appBrand";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

validateRequiredEnv();

const baseUrl = getPublicInvoiceBaseUrl();
const googleSiteVerification = getGoogleSiteVerification();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Swiss-ready invoicing for freelancers and small businesses, with QR-bill support, payment links, reminders, expenses, and a free plan to get started.",
  applicationName: APP_NAME,
  alternates: {
    canonical: "/",
  },
  manifest: `/manifest.webmanifest?v=${APP_MANIFEST_VERSION}`,
  openGraph: {
    type: "website",
    url: baseUrl,
    siteName: APP_NAME,
    title: `${APP_NAME} | Swiss-ready invoicing for freelancers and small businesses`,
    description:
      "Create Swiss-ready invoices with QR-bill support, payment links, reminders, and a simple free-to-Pro path.",
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} | Swiss-ready invoicing for freelancers and small businesses`,
    description:
      "Create Swiss-ready invoices with QR-bill support, payment links, reminders, and a simple free-to-Pro path.",
  },
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
  icons: {
    icon: [
      { url: `/brand-icon?size=32&v=${APP_BRAND_ICON_VERSION}`, sizes: "32x32", type: "image/png" },
      { url: `/brand-icon?size=192&v=${APP_BRAND_ICON_VERSION}`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `/brand-icon?size=192&v=${APP_BRAND_ICON_VERSION}`,
    apple: { url: `/brand-icon?size=180&v=${APP_BRAND_ICON_VERSION}`, sizes: "180x180", type: "image/png" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem("sierra-invoices-theme");
                  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var nextTheme = theme === "dark" || theme === "light" ? theme : (prefersDark ? "dark" : "light");
                  document.documentElement.classList.toggle("dark", nextTheme === "dark");
                  document.documentElement.dataset.theme = nextTheme;
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <PwaProvider>
            <AuthBootstrap />
            <ToastProvider>
              <AppFrame>{children}</AppFrame>
            </ToastProvider>
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
