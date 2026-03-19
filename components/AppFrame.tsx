"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import LegalFooter from "@/components/LegalFooter";
import { clearPwaAppCache } from "@/lib/pwaCache";
import { APP_NAME } from "@/lib/appBrand";
import { authenticatedFetch, AUTH_REQUIRED_EVENT } from "@/utils/authenticatedFetch";
import { supabase } from "@/utils/supabase";

type AppFrameProps = {
  children: ReactNode;
};

type ShellBusinessBrand = {
  name: string;
  logoUrl: string | null;
};

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

function shouldHideShell(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/settings/password" ||
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
  const [authStatus, setAuthStatus] = useState<AuthStatus>(hideShell ? "authenticated" : "checking");
  const mobileSidebarOpen =
    mobileSidebarState.open && mobileSidebarState.pathname === pathname;

  useEffect(() => {
    if (hideShell) {
      return;
    }

    let mounted = true;

    async function redirectToLogin() {
      setBusinessBrand(null);
      await supabase.auth.signOut({ scope: "local" });
      await clearPwaAppCache();

      if (mounted) {
        setAuthStatus("unauthenticated");
        window.location.replace("/login");
      }
    }

    async function verifySession() {
      setAuthStatus("checking");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (sessionError || !session?.access_token) {
        await redirectToLogin();
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (error || !data.user) {
        await redirectToLogin();
        return;
      }

      setAuthStatus("authenticated");
    }

    function handleAuthenticationRequired() {
      void redirectToLogin();
    }

    void verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return;
      }

      if (!session?.access_token) {
        setBusinessBrand(null);
        setAuthStatus("unauthenticated");
        return;
      }

      setAuthStatus("authenticated");
    });

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthenticationRequired);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthenticationRequired);
    };
  }, [hideShell]);

  useEffect(() => {
    if (hideShell || authStatus !== "authenticated") {
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
          name: business.name?.trim() || APP_NAME,
          logoUrl: business.logoUrl ?? null,
        });
      } catch (error) {
        console.error("Unable to load shell branding:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [authStatus, hideShell]);

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
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <LegalFooter />
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <main className="flex min-h-screen items-center justify-center px-4 py-6 md:px-8 md:py-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <p className="text-sm text-slate-500 dark:text-slate-400">Checking your session...</p>
          </div>
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
        <LegalFooter />
      </div>
    </div>
  );
}
