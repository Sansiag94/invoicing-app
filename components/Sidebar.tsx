import Link from "next/link";
import React from "react";

const sidebarLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 240,
        height: "100vh",
        background: "#1f1f1f", // Updated to a slightly lighter dark background
        color: "white",
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <nav>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sidebarLinks.map((link) => (
            <li key={link.href} style={{ marginBottom: 24 }}>
              <Link
                href={link.href}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 18,
                  fontWeight: 500,
                  display: "block",
                }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}