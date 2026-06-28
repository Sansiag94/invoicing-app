"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "sierra-invoices-theme";
const LIGHT_ONLY_PATHS = new Set([
  "/invoice-software-switzerland",
  "/rechnung-software-schweiz",
]);

function isLightOnlyPath(pathname: string | null): boolean {
  return Boolean(pathname && LIGHT_ONLY_PATHS.has(pathname));
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const forceLightTheme = isLightOnlyPath(pathname);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    applyTheme(forceLightTheme ? "light" : theme);
  }, [forceLightTheme, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: forceLightTheme ? "light" : theme,
      setTheme: (nextTheme) => {
        setThemeState(nextTheme);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }
        applyTheme(forceLightTheme ? "light" : nextTheme);
      },
    }),
    [forceLightTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
