"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { cn } from "@/lib/utils";

type CountryComboboxProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export function CountryCombobox({
  id,
  value,
  onChange,
  placeholder = "Select country",
  required = false,
}: CountryComboboxProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return COUNTRY_OPTIONS.slice(0, 12);
    }

    const startsWith = COUNTRY_OPTIONS.filter((country) =>
      country.toLowerCase().startsWith(normalizedQuery)
    );
    const includes = COUNTRY_OPTIONS.filter(
      (country) =>
        !country.toLowerCase().startsWith(normalizedQuery) &&
        country.toLowerCase().includes(normalizedQuery)
    );

    return [...startsWith, ...includes].slice(0, 12);
  }, [query]);

  const hasExactMatch = COUNTRY_OPTIONS.some(
    (country) => country.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          )}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onBlur={() => {
            const exactMatch = COUNTRY_OPTIONS.find(
              (country) => country.toLowerCase() === query.trim().toLowerCase()
            );
            if (exactMatch) {
              onChange(exactMatch);
              setQuery(exactMatch);
            } else if (!query.trim()) {
              onChange("");
            }
          }}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      <input type="hidden" value={value} required={required} readOnly />

      {isOpen ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => {
              const isSelected = value.toLowerCase() === country.toLowerCase();
              return (
                <button
                  key={country}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(country);
                    setQuery(country);
                    setIsOpen(false);
                  }}
                >
                  <span>{country}</span>
                  {isSelected ? <Check className="h-4 w-4 text-slate-900" /> : null}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">
              No country found
            </div>
          )}
          {!hasExactMatch && query.trim() ? (
            <div className="border-t border-slate-100 px-3 py-2 text-xs text-amber-600">
              Select a country from the list.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
