import type { PortfolioItemRecord } from "@/lib/types";

export type PortfolioItemInput = {
  name?: unknown;
  description: unknown;
  unitPrice: unknown;
  defaultQuantity?: unknown;
  taxRate?: unknown;
  active?: unknown;
};

export type NormalizedPortfolioItemInput = {
  name: string;
  description: string;
  unitPrice: number;
  defaultQuantity: number;
  taxRate: number;
  active: boolean;
};

type PortfolioItemDbRecord = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  unitPrice: number;
  defaultQuantity: number;
  taxRate: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function normalizePortfolioItemInput(input: PortfolioItemInput): NormalizedPortfolioItemInput | null {
  const description = asTrimmedString(input.description);
  const name = asTrimmedString(input.name) ?? description;
  const unitPrice = asNumber(input.unitPrice);
  const defaultQuantity = input.defaultQuantity === undefined ? 1 : asNumber(input.defaultQuantity);
  const taxRate = input.taxRate === undefined ? 0 : asNumber(input.taxRate);

  if (!description || !name || unitPrice === null || defaultQuantity === null || taxRate === null) {
    return null;
  }

  if (unitPrice < 0 || defaultQuantity <= 0 || taxRate < 0) {
    return null;
  }

  return {
    name,
    description,
    unitPrice,
    defaultQuantity,
    taxRate,
    active: asBoolean(input.active, true),
  };
}

export function toPortfolioItemRecord(item: PortfolioItemDbRecord): PortfolioItemRecord {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
