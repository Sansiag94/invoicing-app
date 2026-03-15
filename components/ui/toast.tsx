"use client";

import {
  createContext,
  type ReactNode,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function getToastStyles(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return {
        wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
        icon: "text-emerald-600",
      };
    case "error":
      return {
        wrapper: "border-red-200 bg-red-50 text-red-900",
        icon: "text-red-600",
      };
    default:
      return {
        wrapper: "border-slate-200 bg-white text-slate-900",
        icon: "text-slate-600",
      };
  }
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (variant === "error") {
    return <AlertCircle className="h-4 w-4" />;
  }

  return <Info className="h-4 w-4" />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      const nextToast: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "info",
      };

      setToasts((current) => [...current, nextToast]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message?: unknown) => {
      toast({
        title: "Notice",
        description: String(message ?? ""),
        variant: "info",
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((item) => {
          const styles = getToastStyles(item.variant);
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur",
                styles.wrapper
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5", styles.icon)}>
                  <ToastIcon variant={item.variant} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(item.id)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
