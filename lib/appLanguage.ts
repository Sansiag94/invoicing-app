import type { AppLanguage } from "@/lib/types";

export const DEFAULT_APP_LANGUAGE: AppLanguage = "en";
export const SUPPORTED_APP_LANGUAGES: readonly AppLanguage[] = ["en", "de", "es", "fr", "it"] as const;

export const APP_LANGUAGE_OPTIONS: ReadonlyArray<{ value: AppLanguage; label: string }> = [
  { value: "en", label: "English" },
  { value: "es", label: "Espanol" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Francais" },
  { value: "it", label: "Italiano" },
];

export function isSupportedAppLanguage(value: string | null | undefined): value is AppLanguage {
  return SUPPORTED_APP_LANGUAGES.includes((value || "").toLowerCase() as AppLanguage);
}

export function normalizeAppLanguage(
  value: string | null | undefined,
  fallback: AppLanguage = DEFAULT_APP_LANGUAGE
): AppLanguage {
  const normalized = value?.trim().toLowerCase();
  return isSupportedAppLanguage(normalized) ? normalized : fallback;
}

export function getAppLanguageLabel(language: AppLanguage): string {
  return APP_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? APP_LANGUAGE_OPTIONS[0].label;
}
