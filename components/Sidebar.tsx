"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/invoices", label: "Invoices", icon: FileText },
];

type SidebarProps = {
  onNavigate?: () => void;
  businessBrand?: {
    name: string;
    logoUrl: string | null;
  } | null;
};

function getBrandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "S") + (words[1]?.[0] ?? "I");
}

export default function Sidebar({ onNavigate, businessBrand }: SidebarProps) {
  const pathname = usePathname();
  const brandName = businessBrand?.name || "Sierra Invoices";

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="border-b border-slate-200 px-5 py-6">
        <div className="mb-3">
          {businessBrand?.logoUrl ? (
            <img
              src={businessBrand.logoUrl}
              alt={`${brandName} logo`}
              className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
              {getBrandInitials(brandName).toUpperCase()}
            </div>
          )}
        </div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{brandName}</h1>
        <p className="mt-1 text-xs text-slate-500">Invoicing solutions for freelancers</p>
      </div>

      <nav className="px-3">
        <ul className="space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
