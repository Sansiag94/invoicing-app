import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { validateRequiredEnv } from "@/lib/env";
import AppFrame from "@/components/AppFrame";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ui/theme";
import PwaRegistration from "@/components/PwaRegistration";

validateRequiredEnv();

export const metadata: Metadata = {
  title: "Sierra Invoices",
  description: "Invoicing solutions for freelancers",
  applicationName: "Sierra Invoices",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.svg",
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
    <html lang="en">
      <body className="antialiased">
        <ThemeProvider>
          <PwaRegistration />
          <ToastProvider>
            <AppFrame>{children}</AppFrame>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
