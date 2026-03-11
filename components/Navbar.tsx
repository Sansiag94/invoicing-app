"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function Navbar() {
  const pathname = usePathname();
  const hideNavbar =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/invoice/pay/");

  if (hideNavbar) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="relative hidden w-full max-w-sm md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search clients or invoices..." className="pl-9" />
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
          <Bell className="h-4 w-4" />
          <span>Logged in</span>
        </div>
      </div>
    </header>
  );
}
