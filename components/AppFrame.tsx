"use client";

import { type ReactNode, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

type AppFrameProps = {
  children: ReactNode;
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
  const mobileSidebarOpen =
    mobileSidebarState.open && mobileSidebarState.pathname === pathname;

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
        <Sidebar onNavigate={closeMobileSidebar} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onOpenMenu={openMobileSidebar} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
