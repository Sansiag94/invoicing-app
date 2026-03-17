"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaContextValue = {
  isInstalled: boolean;
  canInstall: boolean;
  showInstallInstructions: boolean;
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

const PwaContext = createContext<PwaContextValue | null>(null);

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosInstallHintTarget(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneDisplayMode());

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("Unable to register service worker:", error);
      }
    };

    void registerServiceWorker();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const handleDisplayModeChange = () => {
      const standalone = isStandaloneDisplayMode();
      setIsInstalled(standalone);
      if (standalone) {
        setDeferredPrompt(null);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      isInstalled,
      canInstall: !isInstalled && deferredPrompt !== null,
      showInstallInstructions: !isInstalled && isIosInstallHintTarget(),
      install: async () => {
        if (!deferredPrompt) {
          return "unavailable";
        }

        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }

        return choice.outcome;
      },
    }),
    [deferredPrompt, isInstalled]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    throw new Error("usePwa must be used inside PwaProvider");
  }

  return context;
}
