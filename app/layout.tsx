import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import React from "react";

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
      <body style={{ margin: 0, padding: 0, background: "#fafbfc" }}>
        <div
          style={{
            display: "flex",
            backgroundColor: "#f5f5f5",
            color: "#111",
            minHeight: "100vh",
          }}
        >
          <Sidebar />
          <div style={{ flex: 1 }}>
            <Navbar />
            <main style={{ padding: 40 }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}