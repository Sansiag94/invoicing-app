"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { supabase } from "@/utils/supabase";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
];

type NavbarProps = {
  onOpenMenu?: () => void;
};

type ClientSearchResult = {
  id: string;
  companyName: string | null;
  contactName: string | null;
  email: string;
  country: string;
};

type InvoiceSearchResult = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  client?: {
    companyName: string | null;
    contactName: string | null;
    email: string;
  };
};

type NotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  priority: number;
  dueDateTs: number;
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function getClientDisplayName(client: {
  companyName: string | null;
  contactName: string | null;
  email: string;
}): string {
  return client.companyName || client.contactName || client.email;
}

function getTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown date";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Navbar({ onOpenMenu }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<{
    clients: ClientSearchResult[];
    invoices: InvoiceSearchResult[];
  } | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/clients") || pathname.startsWith("/invoices")) {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get("q") ?? "");
    }
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }

      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }

      if (accountRef.current && !accountRef.current.contains(target)) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function loadSearchData() {
    setIsSearchLoading(true);
    setSearchError(null);

    try {
      const [clientsResponse, invoicesResponse] = await Promise.all([
        authenticatedFetch("/api/clients"),
        authenticatedFetch("/api/invoices"),
      ]);

      if (!clientsResponse.ok || !invoicesResponse.ok) {
        throw new Error("Search data request failed");
      }

      const [clientsData, invoicesData] = await Promise.all([
        clientsResponse.json(),
        invoicesResponse.json(),
      ]);

      setSearchData({
        clients: Array.isArray(clientsData) ? (clientsData as ClientSearchResult[]) : [],
        invoices: Array.isArray(invoicesData) ? (invoicesData as InvoiceSearchResult[]) : [],
      });
    } catch (error) {
      console.error("Unable to load search data:", error);
      setSearchError("Unable to load search right now.");
      setSearchData({ clients: [], invoices: [] });
    } finally {
      setIsSearchLoading(false);
    }
  }

  async function loadNotifications() {
    setIsNotificationsLoading(true);
    setNotificationsError(null);

    try {
      let invoices = searchData?.invoices ?? null;

      if (!invoices) {
        const response = await authenticatedFetch("/api/invoices");

        if (!response.ok) {
          throw new Error("Notifications request failed");
        }

        const payload = (await response.json()) as InvoiceSearchResult[];
        invoices = Array.isArray(payload) ? payload : [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = today.getTime();
      const dueSoonTs = todayTs + 7 * 24 * 60 * 60 * 1000;

      const nextNotifications = invoices
        .flatMap((invoice) => {
          if (invoice.status === "paid") return [];

          const dueDateTs = getTimestamp(invoice.dueDate);
          const clientName = invoice.client ? getClientDisplayName(invoice.client) : "Client";
          const href = `/invoices/${invoice.id}`;

          if (invoice.status === "overdue" || dueDateTs < todayTs) {
            return [
              {
                id: `${invoice.id}-overdue`,
                title: `${invoice.invoiceNumber} is overdue`,
                subtitle: `${clientName} - due ${formatShortDate(invoice.dueDate)}`,
                href,
                priority: 0,
                dueDateTs,
              },
            ];
          }

          if (dueDateTs <= dueSoonTs) {
            return [
              {
                id: `${invoice.id}-due-soon`,
                title: `${invoice.invoiceNumber} is due soon`,
                subtitle: `${clientName} - due ${formatShortDate(invoice.dueDate)}`,
                href,
                priority: 1,
                dueDateTs,
              },
            ];
          }

          if (invoice.status === "draft") {
            return [
              {
                id: `${invoice.id}-draft`,
                title: `Draft invoice ${invoice.invoiceNumber}`,
                subtitle: `${clientName} - send before ${formatShortDate(invoice.dueDate)}`,
                href,
                priority: 2,
                dueDateTs,
              },
            ];
          }

          return [];
        })
        .sort((left, right) => {
          if (left.priority !== right.priority) {
            return left.priority - right.priority;
          }

          if (left.dueDateTs !== right.dueDateTs) {
            return left.dueDateTs - right.dueDateTs;
          }

          return left.title.localeCompare(right.title);
        })
        .slice(0, 8);

      setNotifications(nextNotifications);
    } catch (error) {
      console.error("Unable to load notifications:", error);
      setNotificationsError("Unable to load notifications.");
      setNotifications([]);
    } finally {
      setIsNotificationsLoading(false);
    }
  }

  const normalizedSearchQuery = normalizeSearchValue(searchQuery);

  const filteredClients = useMemo(() => {
    if (!searchData || normalizedSearchQuery.length < 2) return [];

    return searchData.clients
      .filter((client) => {
        const searchable = [
          client.companyName ?? "",
          client.contactName ?? "",
          client.email,
          client.country,
        ].join(" ");

        return searchable.toLowerCase().includes(normalizedSearchQuery);
      })
      .sort((left, right) =>
        getClientDisplayName(left).localeCompare(getClientDisplayName(right), undefined, {
          sensitivity: "base",
        })
      )
      .slice(0, 5);
  }, [searchData, normalizedSearchQuery]);

  const filteredInvoices = useMemo(() => {
    if (!searchData || normalizedSearchQuery.length < 2) return [];

    return searchData.invoices
      .filter((invoice) => {
        const searchable = [
          invoice.invoiceNumber,
          invoice.status,
          invoice.client?.companyName ?? "",
          invoice.client?.contactName ?? "",
          invoice.client?.email ?? "",
        ].join(" ");

        return searchable.toLowerCase().includes(normalizedSearchQuery);
      })
      .sort((left, right) => getTimestamp(left.dueDate) - getTimestamp(right.dueDate))
      .slice(0, 5);
  }, [searchData, normalizedSearchQuery]);

  const actionableNotificationCount = notifications.filter((item) => item.priority < 2).length;

  function handleNavigate(href: string) {
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
    setIsAccountOpen(false);
    router.push(href);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = searchQuery.trim();
    if (!value) {
      if (pathname.startsWith("/clients")) {
        router.push("/clients");
      } else if (pathname.startsWith("/invoices")) {
        router.push("/invoices");
      }
      setIsSearchOpen(false);
      return;
    }

    const targetPath = pathname.startsWith("/clients") ? "/clients" : "/invoices";
    handleNavigate(`${targetPath}?q=${encodeURIComponent(value)}`);
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert(error.message);
        return;
      }

      setUserEmail(null);
      handleNavigate("/login");
    } finally {
      setIsSigningOut(false);
      setIsAccountOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base"
          >
            Sierra Invoice
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div ref={searchContainerRef} className="relative hidden w-full max-w-sm lg:block">
          <form onSubmit={handleSearchSubmit}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              placeholder="Search clients or invoices..."
              className="pl-9"
              onFocus={() => {
                setIsSearchOpen(true);
                if (!searchData && !isSearchLoading) {
                  void loadSearchData();
                }
              }}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setIsSearchOpen(true);
                if (!searchData && !isSearchLoading) {
                  void loadSearchData();
                }
              }}
            />
          </form>

          {isSearchOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-full rounded-md border border-slate-200 bg-white p-2 shadow-lg">
              {normalizedSearchQuery.length < 2 ? (
                <p className="px-2 py-1.5 text-xs text-slate-500">Type at least 2 characters to search.</p>
              ) : isSearchLoading ? (
                <p className="px-2 py-1.5 text-xs text-slate-500">Searching...</p>
              ) : searchError ? (
                <p className="px-2 py-1.5 text-xs text-red-600">{searchError}</p>
              ) : filteredClients.length === 0 && filteredInvoices.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-slate-500">No matches found.</p>
              ) : (
                <div className="space-y-2">
                  {filteredClients.length > 0 ? (
                    <div className="space-y-1">
                      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Clients
                      </p>
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleNavigate(`/clients/${client.id}`)}
                          className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <p className="font-medium text-slate-900">{getClientDisplayName(client)}</p>
                          <p className="text-xs text-slate-500">{client.email}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {filteredInvoices.length > 0 ? (
                    <div className="space-y-1">
                      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Invoices
                      </p>
                      {filteredInvoices.map((invoice) => (
                        <button
                          key={invoice.id}
                          type="button"
                          onClick={() => handleNavigate(`/invoices/${invoice.id}`)}
                          className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-slate-500">
                            {(invoice.client && getClientDisplayName(invoice.client)) || "Client"} - due{" "}
                            {formatShortDate(invoice.dueDate)}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm text-slate-600 lg:ml-0">
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Open notifications"
              onClick={() => {
                setIsNotificationsOpen((current) => {
                  const nextValue = !current;
                  if (nextValue) {
                    void loadNotifications();
                  }
                  return nextValue;
                });
              }}
            >
              <Bell className="h-4 w-4" />
              {actionableNotificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">
                  {Math.min(actionableNotificationCount, 99)}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-80 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notifications
                </p>

                {isNotificationsLoading ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500">Loading notifications...</p>
                ) : notificationsError ? (
                  <p className="px-2 py-1.5 text-xs text-red-600">{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500">No new notifications.</p>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNavigate(notification.href)}
                        className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-100"
                      >
                        <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                        <p className="text-xs text-slate-500">{notification.subtitle}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div ref={accountRef} className="relative">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Open account menu"
              onClick={() => setIsAccountOpen((current) => !current)}
            >
              <Settings className="h-4 w-4" />
            </button>

            {isAccountOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-xs uppercase tracking-wide text-slate-500">Account</p>
                <p className="truncate px-2 py-1 text-sm font-medium text-slate-900">{userEmail || "Unknown user"}</p>
                <button
                  type="button"
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => handleNavigate("/settings")}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  type="button"
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
