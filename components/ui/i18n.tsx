"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { APP_LANGUAGE_OPTIONS, DEFAULT_APP_LANGUAGE } from "@/lib/appLanguage";
import type { AppLanguage } from "@/lib/types";

const ENGLISH_COPY = {
  dashboard: "Dashboard",
  clients: "Clients",
  catalog: "Catalog",
  invoices: "Invoices",
  expenses: "Expenses",
  analytics: "Analytics",
  settings: "Settings",
  help: "Help",
  signOut: "Sign out",
  installApp: "Install app",
  search: "Search",
  quickActions: "Quick actions",
  createInvoice: "Create invoice",
  addClient: "Add client",
  addExpense: "Add expense",
  reviewOverdue: "Review overdue",
  openAnalytics: "Open analytics",
  notifications: "Notifications",
  noNotifications: "No new notifications.",
} as const;

type AppLanguageKey = keyof typeof ENGLISH_COPY;

type AppLanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: AppLanguageKey) => string;
  options: typeof APP_LANGUAGE_OPTIONS;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

function EnglishOnlyLanguageProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AppLanguageContextValue>(
    () => ({
      language: DEFAULT_APP_LANGUAGE,
      options: APP_LANGUAGE_OPTIONS,
      setLanguage: async () => {},
      t: (key) => ENGLISH_COPY[key],
    }),
    []
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  return <EnglishOnlyLanguageProvider>{children}</EnglishOnlyLanguageProvider>;
}

export function StaticAppLanguageProvider({ children }: { children: ReactNode }) {
  return <EnglishOnlyLanguageProvider>{children}</EnglishOnlyLanguageProvider>;
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error("useAppLanguage must be used within AppLanguageProvider");
  }

  return context;
}
