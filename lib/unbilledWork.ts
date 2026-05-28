import type { InvoiceStatus, UnbilledWorkItemRecord } from "@/lib/types";

export type UnbilledWorkInput = {
  serviceDate?: unknown;
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  taxRate?: unknown;
  notes?: unknown;
};

export type NormalizedUnbilledWorkInput = {
  serviceDate: Date;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  notes: string | null;
};

type UnbilledWorkDbRecord = {
  id: string;
  businessId: string;
  clientId: string;
  invoiceId: string | null;
  serviceDate: Date;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeUnbilledWorkInput(input: UnbilledWorkInput): NormalizedUnbilledWorkInput | null {
  const serviceDate = asDate(input.serviceDate);
  const description = asString(input.description);
  const quantity = input.quantity === undefined ? 1 : asNumber(input.quantity);
  const unitPrice = asNumber(input.unitPrice);
  const taxRate = input.taxRate === undefined ? 0 : asNumber(input.taxRate);
  const notes = asString(input.notes);

  if (!serviceDate || !description || quantity === null || unitPrice === null || taxRate === null) {
    return null;
  }

  if (quantity <= 0 || unitPrice < 0 || taxRate < 0) {
    return null;
  }

  return {
    serviceDate,
    description,
    quantity,
    unitPrice,
    taxRate,
    notes,
  };
}

export function toUnbilledWorkItemRecord(item: UnbilledWorkDbRecord): UnbilledWorkItemRecord {
  return {
    id: item.id,
    businessId: item.businessId,
    clientId: item.clientId,
    invoiceId: item.invoiceId,
    serviceDate: item.serviceDate.toISOString(),
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate,
    notes: item.notes,
    status: item.status as UnbilledWorkItemRecord["status"],
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    invoice: item.invoice
      ? {
          id: item.invoice.id,
          invoiceNumber: item.invoice.invoiceNumber,
          status: item.invoice.status as InvoiceStatus,
        }
      : null,
  };
}
