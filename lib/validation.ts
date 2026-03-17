function normalizeValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeIban(value: string | null | undefined): string | null {
  const normalized = normalizeValue(value);
  return normalized ? normalized.replace(/\s+/g, "").toUpperCase() : null;
}

export function isValidIban(value: string): boolean {
  const normalized = normalizeIban(value);

  if (!normalized) {
    return false;
  }

  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalized);
}

export function normalizeBic(value: string | null | undefined): string | null {
  const normalized = normalizeValue(value);
  return normalized ? normalized.replace(/\s+/g, "").toUpperCase() : null;
}

export function isValidBic(value: string): boolean {
  const normalized = normalizeBic(value);

  if (!normalized) {
    return false;
  }

  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized);
}
