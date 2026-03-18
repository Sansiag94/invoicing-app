import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { validateRequiredEnv } from "@/lib/env";
import AppFrame from "@/components/AppFrame";
import PwaProvider from "@/components/PwaProvider";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ui/theme";

validateRequiredEnv();

export const metadata: Metadata = {
  title: "Sierra Invoices",
  description: "Invoicing solutions for freelancers",
  applicationName: "Sierra Invoices",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand-icon?size=32", sizes: "32x32", type: "image/png" },
      { url: "/brand-icon?size=192", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/brand-icon?size=192",
    apple: { url: "/brand-icon?size=180", sizes: "180x180", type: "image/png" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sierra Invoices",
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
                  var nextTheme = theme === "dark" ? "dark" : "light";
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
          <ToastProvider>
            <AppFrame>{children}</AppFrame>
          </ToastProvider>
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
