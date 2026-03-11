import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import React from "react";
import { validateRequiredEnv } from "@/lib/env";

validateRequiredEnv();

export const metadata: Metadata = {
  title: "Invoice SaaS",
  description: "A SaaS dashboard for invoicing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <div className="flex">
            <Sidebar />
            <div className="flex min-h-screen flex-1 flex-col">
              <Navbar />
              <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto w-full max-w-7xl">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
