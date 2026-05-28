"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PortfolioItemRecord } from "@/lib/types";

type ServiceDescriptionInputProps = {
  id?: string;
  value: string;
  portfolioItems: PortfolioItemRecord[];
  currency?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (item: PortfolioItemRecord) => void;
};

function formatServiceMeta(item: PortfolioItemRecord, currency: string): string {
  return `${currency} ${item.unitPrice.toFixed(2)}`;
}

export default function ServiceDescriptionInput({
  id,
  value,
  portfolioItems,
  currency = "CHF",
  placeholder = "Description",
  onChange,
  onSelect,
}: ServiceDescriptionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const activeItems = useMemo(
    () => portfolioItems.filter((item) => item.active),
    [portfolioItems]
  );
  const normalizedQuery = value.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return activeItems;
    }

    return activeItems.filter((item) =>
      `${item.description} ${item.name}`.toLowerCase().includes(normalizedQuery)
    );
  }, [activeItems, normalizedQuery]);
  const visibleItems = filteredItems.slice(0, 8);
  const shouldShowMenu = isOpen && activeItems.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updateMenuRect = () => {
      const rect = inputWrapRef.current?.getBoundingClientRect();
      if (!rect) {
        setMenuRect(null);
        return;
      }

      setMenuRect({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };

    updateMenuRect();
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);

    return () => {
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [isOpen, value]);

  const menu =
    shouldShowMenu && menuRect
      ? createPortal(
          <div
            className="z-[80] max-h-64 overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950"
            style={{
              position: "absolute",
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
            }}
          >
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none",
                    "dark:hover:bg-slate-900 dark:focus:bg-slate-900"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">{item.description}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatServiceMeta(item, currency)}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                No saved service matches this description.
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={inputWrapRef}>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={shouldShowMenu}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
      />
      {menu}
    </div>
  );
}
