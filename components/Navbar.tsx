"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { supabase } from "@/utils/supabase";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/expenses", label: "Expenses" },
  { href: "/analytics", label: "Analytics" },
];

type NavbarProps = {
  onOpenMenu?: () => void;
  businessBrand?: {
    name: string;
    logoUrl: string | null;
  } | null;
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

type QuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
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

function getBrandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "S") + (words[1]?.[0] ?? "I")).toUpperCase();
}

export default function Navbar({ onOpenMenu, businessBrand }: NavbarProps) {
  const seenNotificationsStorageKey = "sierra-invoices-seen-notifications";
  const pathname = usePathname();
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

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
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const brandName = businessBrand?.name || "Sierra Invoices";
  const brandInitials = getBrandInitials(brandName);
  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: "create-invoice",
        label: "Create invoice",
        description: "Open the invoice builder",
        href: "/invoices",
      },
      {
        id: "add-client",
        label: "Add client",
        description: "Create a new client profile",
        href: "/clients",
      },
      {
        id: "add-expense",
        label: "Add expense",
        description: "Track a new business cost",
        href: "/expenses",
      },
      {
        id: "overdue",
        label: "Review overdue invoices",
        description: "Jump straight to collections work",
        href: "/invoices?status=overdue",
      },
      {
        id: "analytics",
        label: "Open analytics",
        description: "Review performance and profitability",
        href: "/analytics",
      },
    ],
    []
  );

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
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(seenNotificationsStorageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        setSeenNotificationIds(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch (error) {
      console.error("Unable to restore seen notifications:", error);
    }
  }, [seenNotificationsStorageKey]);

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

  function markNotificationsSeen(items: NotificationItem[]) {
    if (items.length === 0 || typeof window === "undefined") {
      return;
    }

    setSeenNotificationIds((current) => {
      const next = Array.from(new Set([...current, ...items.map((item) => item.id)]));
      window.localStorage.setItem(seenNotificationsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  async function loadNotifications() {
    setIsNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const response = await authenticatedFetch("/api/invoices");
      if (!response.ok) {
        throw new Error("Notifications request failed");
      }
      const payload = (await response.json()) as InvoiceSearchResult[];
      const invoices = Array.isArray(payload) ? payload : [];

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
      return nextNotifications;
    } catch (error) {
      console.error("Unable to load notifications:", error);
      setNotificationsError("Unable to load notifications.");
      setNotifications([]);
      return [];
    } finally {
      setIsNotificationsLoading(false);
    }
  }

  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const filteredClients = searchData?.clients ?? [];
  const filteredInvoices = searchData?.invoices ?? [];

  const actionableNotificationCount = notifications.filter(
    (item) => item.priority < 2 && !seenNotificationIds.includes(item.id)
  ).length;

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
        toast({
          title: "Unable to sign out",
          description: error.message,
          variant: "error",
        });
        return;
      }

      setUserEmail(null);
      handleNavigate("/login");
    } finally {
      setIsSigningOut(false);
      setIsAccountOpen(false);
    }
  }

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    if (normalizedSearchQuery.length < 2) {
      setSearchData({ clients: [], invoices: [] });
      setSearchError(null);
      setIsSearchLoading(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearchLoading(true);
        setSearchError(null);
        const response = await authenticatedFetch(`/api/search?q=${encodeURIComponent(normalizedSearchQuery)}`);
        const result = (await response.json()) as
          | { clients?: ClientSearchResult[]; invoices?: InvoiceSearchResult[]; error?: string }
          | undefined;

        if (!response.ok) {
          throw new Error(result?.error ?? "Search failed");
        }

        if (!active) {
          return;
        }

        setSearchData({
          clients: Array.isArray(result?.clients) ? result.clients : [],
          invoices: Array.isArray(result?.invoices) ? result.invoices : [],
        });
      } catch (error) {
        console.error("Unable to load search data:", error);
        if (!active) {
          return;
        }
        setSearchError("Unable to load search right now.");
        setSearchData({ clients: [], invoices: [] });
      } finally {
        if (active) {
          setIsSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [isSearchOpen, normalizedSearchQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base"
          >
            {businessBrand?.logoUrl ? (
              <img
                src={businessBrand.logoUrl}
                alt={`${brandName} logo`}
                className="h-9 w-9 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                {brandInitials}
              </span>
            )}
            <span>{brandName}</span>
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
                    ? "border border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-100 dark:text-slate-950"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <div ref={searchContainerRef} className="relative hidden w-full max-w-sm lg:block">
            <form onSubmit={handleSearchSubmit}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                placeholder="Search or jump to..."
                className="pl-9"
                onFocus={() => {
                  setIsSearchOpen(true);
                }}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setIsSearchOpen(true);
                }}
              />
            </form>

            {isSearchOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-full rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {normalizedSearchQuery.length < 2 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick Actions</p>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">Ctrl/Cmd + K</span>
                    </div>
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleNavigate(action.href)}
                        className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{action.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                      </button>
                    ))}
                  </div>
                ) : isSearchLoading ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">Searching...</p>
                ) : searchError ? (
                  <p className="px-2 py-1.5 text-xs text-red-600">{searchError}</p>
                ) : filteredClients.length === 0 && filteredInvoices.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">No matches found.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.length > 0 ? (
                      <div className="space-y-1">
                        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Clients
                        </p>
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleNavigate(`/clients/${client.id}`)}
                            className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <p className="font-medium text-slate-900 dark:text-slate-100">{getClientDisplayName(client)}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{client.email}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {filteredInvoices.length > 0 ? (
                      <div className="space-y-1">
                        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Invoices
                        </p>
                        {filteredInvoices.map((invoice) => (
                          <button
                            key={invoice.id}
                            type="button"
                            onClick={() => handleNavigate(`/invoices/${invoice.id}`)}
                            className="w-full rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <p className="font-medium text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
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

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Open notifications"
              onClick={async () => {
                setIsNotificationsOpen((current) => {
                  const nextValue = !current;
                  return nextValue;
                });

                if (!isNotificationsOpen) {
                  markNotificationsSeen(notifications);
                  const loadedNotifications = await loadNotifications();
                  markNotificationsSeen(loadedNotifications);
                }
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
              <div className="absolute right-0 z-30 mt-2 w-80 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Notifications
                </p>

                {isNotificationsLoading ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">Loading notifications...</p>
                ) : notificationsError ? (
                  <p className="px-2 py-1.5 text-xs text-red-600">{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">No new notifications.</p>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNavigate(notification.href)}
                        className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{notification.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{notification.subtitle}</p>
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
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Open account menu"
              onClick={() => setIsAccountOpen((current) => !current)}
            >
              {businessBrand?.logoUrl ? (
                <img
                  src={businessBrand.logoUrl}
                  alt={`${brandName} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{brandInitials}</span>
              )}
            </button>

            {isAccountOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <p className="px-2 py-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Account</p>
                <p className="truncate px-2 py-1 text-sm font-medium text-slate-900 dark:text-slate-100">{userEmail || "Unknown user"}</p>
                <button
                  type="button"
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  onClick={() => handleNavigate("/settings")}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  type="button"
                  className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
