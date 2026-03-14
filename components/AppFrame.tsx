"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

type AppFrameProps = {
  children: ReactNode;
};

type ShellBusinessBrand = {
  name: string;
  logoUrl: string | null;
};

function shouldHideShell(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/invoice/pay/")
  );
}

export default function AppFrame({ children }: AppFrameProps) {
  const pathname = usePathname();
  const hideShell = useMemo(() => shouldHideShell(pathname), [pathname]);
  const [mobileSidebarState, setMobileSidebarState] = useState({
    open: false,
    pathname: "",
  });
  const [businessBrand, setBusinessBrand] = useState<ShellBusinessBrand | null>(null);
  const mobileSidebarOpen =
    mobileSidebarState.open && mobileSidebarState.pathname === pathname;

  useEffect(() => {
    if (hideShell) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/business");
        if (!response.ok) {
          return;
        }

        const business = (await response.json()) as { name?: string; logoUrl?: string | null };
        if (!mounted) {
          return;
        }

        setBusinessBrand({
          name: business.name?.trim() || "Sierra Invoices",
          logoUrl: business.logoUrl ?? null,
        });
      } catch (error) {
        console.error("Unable to load shell branding:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hideShell]);

  const openMobileSidebar = () =>
    setMobileSidebarState({
      open: true,
      pathname,
    });

  const closeMobileSidebar = () =>
    setMobileSidebarState({
      open: false,
      pathname,
    });

  if (hideShell) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <button
        type="button"
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden",
          mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeMobileSidebar}
        aria-label="Close navigation"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-lg transition-transform md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onNavigate={closeMobileSidebar} businessBrand={businessBrand} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onOpenMenu={openMobileSidebar} businessBrand={businessBrand} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
