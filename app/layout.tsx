import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import { validateRequiredEnv } from "@/lib/env";
import AppFrame from "@/components/AppFrame";

validateRequiredEnv();

export const metadata: Metadata = {
  title: "Sierra Invoices",
  description: "Invoicing solutions for freelancers",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
