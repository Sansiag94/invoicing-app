"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { APP_LANGUAGE_OPTIONS, DEFAULT_APP_LANGUAGE, normalizeAppLanguage } from "@/lib/appLanguage";
import type { AppLanguage } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

const DICTIONARY = {
  en: {
    dashboard: "Dashboard",
    clients: "Clients",
    invoices: "Invoices",
    expenses: "Expenses",
    analytics: "Analytics",
    settings: "Settings",
    help: "Help & onboarding",
    signOut: "Sign out",
    installApp: "Install App",
    search: "Search or jump to...",
    quickActions: "Quick Actions",
    createInvoice: "Create invoice",
    addClient: "Add client",
    addExpense: "Add expense",
    reviewOverdue: "Review overdue invoices",
    openAnalytics: "Open analytics",
    notifications: "Notifications",
    noNotifications: "No new notifications.",
    appLanguage: "App language",
    appLanguageHelp: "Choose the language used across the workspace.",
  },
  de: {
    dashboard: "Uebersicht",
    clients: "Kunden",
    invoices: "Rechnungen",
    expenses: "Ausgaben",
    analytics: "Analysen",
    settings: "Einstellungen",
    help: "Hilfe & Einfuehrung",
    signOut: "Abmelden",
    installApp: "App installieren",
    search: "Suchen oder springen...",
    quickActions: "Schnellaktionen",
    createInvoice: "Rechnung erstellen",
    addClient: "Kunde hinzufuegen",
    addExpense: "Ausgabe erfassen",
    reviewOverdue: "Ueberfaellige Rechnungen pruefen",
    openAnalytics: "Analysen oeffnen",
    notifications: "Benachrichtigungen",
    noNotifications: "Keine neuen Benachrichtigungen.",
    appLanguage: "App-Sprache",
    appLanguageHelp: "Waehle die Sprache fuer den Arbeitsbereich.",
  },
  es: {
    dashboard: "Inicio",
    clients: "Clientes",
    invoices: "Facturas",
    expenses: "Gastos",
    analytics: "Analiticas",
    settings: "Ajustes",
    help: "Ayuda e inicio",
    signOut: "Cerrar sesion",
    installApp: "Instalar app",
    search: "Buscar o ir a...",
    quickActions: "Acciones rapidas",
    createInvoice: "Crear factura",
    addClient: "Agregar cliente",
    addExpense: "Registrar gasto",
    reviewOverdue: "Revisar facturas vencidas",
    openAnalytics: "Abrir analiticas",
    notifications: "Notificaciones",
    noNotifications: "Sin notificaciones nuevas.",
    appLanguage: "Idioma de la app",
    appLanguageHelp: "Elige el idioma del espacio de trabajo.",
  },
  fr: {
    dashboard: "Tableau de bord",
    clients: "Clients",
    invoices: "Factures",
    expenses: "Depenses",
    analytics: "Analyses",
    settings: "Parametres",
    help: "Aide et demarrage",
    signOut: "Se deconnecter",
    installApp: "Installer l'app",
    search: "Rechercher ou ouvrir...",
    quickActions: "Actions rapides",
    createInvoice: "Creer une facture",
    addClient: "Ajouter un client",
    addExpense: "Ajouter une depense",
    reviewOverdue: "Voir les factures en retard",
    openAnalytics: "Ouvrir les analyses",
    notifications: "Notifications",
    noNotifications: "Aucune nouvelle notification.",
    appLanguage: "Langue de l'app",
    appLanguageHelp: "Choisissez la langue de l'espace de travail.",
  },
  it: {
    dashboard: "Dashboard",
    clients: "Clienti",
    invoices: "Fatture",
    expenses: "Spese",
    analytics: "Analisi",
    settings: "Impostazioni",
    help: "Aiuto e guida",
    signOut: "Esci",
    installApp: "Installa app",
    search: "Cerca o vai a...",
    quickActions: "Azioni rapide",
    createInvoice: "Crea fattura",
    addClient: "Aggiungi cliente",
    addExpense: "Registra spesa",
    reviewOverdue: "Rivedi fatture scadute",
    openAnalytics: "Apri analisi",
    notifications: "Notifiche",
    noNotifications: "Nessuna nuova notifica.",
    appLanguage: "Lingua app",
    appLanguageHelp: "Scegli la lingua dello spazio di lavoro.",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

type AppLanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: keyof typeof DICTIONARY.en) => string;
  options: typeof APP_LANGUAGE_OPTIONS;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/account", { cache: "no-store" });
        if (!response.ok) return;
        const account = (await response.json()) as { appLanguage?: string };
        if (mounted) {
          setLanguageState(normalizeAppLanguage(account.appLanguage));
        }
      } catch (error) {
        console.error("Unable to load app language:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AppLanguageContextValue>(() => ({
    language,
    options: APP_LANGUAGE_OPTIONS,
    t: (key) => DICTIONARY[language][key] ?? DICTIONARY.en[key],
    setLanguage: async (nextLanguage) => {
      const normalized = normalizeAppLanguage(nextLanguage);
      setLanguageState(normalized);
      const response = await authenticatedFetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appLanguage: normalized }),
      });

      if (!response.ok) {
        throw new Error("Unable to update app language");
      }
    },
  }), [language]);

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function StaticAppLanguageProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AppLanguageContextValue>(() => ({
    language: DEFAULT_APP_LANGUAGE,
    options: APP_LANGUAGE_OPTIONS,
    t: (key) => DICTIONARY.en[key],
    setLanguage: async () => {},
  }), []);

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage() {
  const context = useContext(AppLanguageContext);
  if (!context) {
    throw new Error("useAppLanguage must be used within AppLanguageProvider");
  }

  return context;
}
