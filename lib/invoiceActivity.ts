import crypto from "crypto";
import prisma from "@/lib/prisma";

export type InvoiceEventType =
  | "created"
  | "edited"
  | "sent"
  | "reminder_sent"
  | "viewed"
  | "paid"
  | "reopened"
  | "duplicated";

export type InvoiceEventEntry = {
  id: string;
  invoiceId: string;
  type: InvoiceEventType | string;
  actor: string | null;
  details: string | null;
  createdAt: Date;
};

export async function logInvoiceEvent(input: {
  invoiceId: string;
  type: InvoiceEventType | string;
  actor?: string | null;
  details?: string | null;
}) {
  await prisma.$executeRaw`
    INSERT INTO "InvoiceEvent" ("uuid", "invoiceId", "type", "actor", "details", "createdAt")
    VALUES (${crypto.randomUUID()}, ${input.invoiceId}, ${input.type}, ${input.actor ?? null}, ${input.details ?? null}, CURRENT_TIMESTAMP)
  `;
}

export async function listInvoiceEvents(invoiceId: string): Promise<InvoiceEventEntry[]> {
  return prisma.$queryRaw<InvoiceEventEntry[]>`
    SELECT
      "uuid" AS "id",
      "invoiceId",
      "type",
      "actor",
      "details",
      "createdAt"
    FROM "InvoiceEvent"
    WHERE "invoiceId" = ${invoiceId}
    ORDER BY "createdAt" DESC
  `;
}

export async function hasRecentInvoiceEvent(input: {
  invoiceId: string;
  type: InvoiceEventType | string;
  sinceMinutes: number;
}) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "uuid" AS "id"
    FROM "InvoiceEvent"
    WHERE "invoiceId" = ${input.invoiceId}
      AND "type" = ${input.type}
      AND "createdAt" >= CURRENT_TIMESTAMP - (${input.sinceMinutes} * INTERVAL '1 minute')
    LIMIT 1
  `;

  return rows.length > 0;
}
