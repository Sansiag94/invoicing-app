import React from "react";
import { pdf } from "@react-pdf/renderer";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import InvoiceDocument from "@/lib/InvoiceDocument";
import { normalizeInvoiceSenderType } from "@/lib/business";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";

type SampleInvoice = Prisma.InvoiceGetPayload<{
  include: {
    client: true;
    lineItems: true;
    business: true;
  };
}>;

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return apiError("This endpoint is only available in development", 403);
  }

  try {
    const user = await getAuthenticatedUser(request);
    const url = new URL(request.url);
    const rows = Math.min(18, Math.max(2, Number(url.searchParams.get("rows") || "8")));

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const client = await prisma.client.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
    });

    const fallbackClient = client ?? {
      id: "sample-client",
      businessId: business.id,
      companyName: "Sample Client AG",
      contactName: "Michaela Example",
      email: "client@example.com",
      phone: null,
      address: "Bahnhofstrasse 10\n8001 Zurich",
      street: "Bahnhofstrasse 10",
      postalCode: "8001",
      city: "Zurich",
      country: "Switzerland",
      language: "en",
      vatNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let senderPreferences: { ownerName: string | null; invoiceSenderType: "company" | "owner" } = {
      ownerName: business.ownerName ?? null,
      invoiceSenderType: normalizeInvoiceSenderType(business.invoiceSenderType),
    };

    try {
      const rows = await prisma.$queryRaw<Array<{ ownerName: string | null; invoiceSenderType: string | null }>>`
        SELECT "ownerName", "invoiceSenderType"
        FROM "Business"
        WHERE "uuid" = ${business.id}
        LIMIT 1
      `;
      senderPreferences = {
        ownerName: rows[0]?.ownerName ?? business.ownerName ?? null,
        invoiceSenderType: normalizeInvoiceSenderType(rows[0]?.invoiceSenderType ?? business.invoiceSenderType),
      };
    } catch (error) {
      console.warn("Unable to load sender preferences for sample PDF:", error);
    }

    const sampleInvoice: SampleInvoice = {
      id: "sample-invoice",
      businessId: business.id,
      clientId: fallbackClient.id,
      invoiceNumber: "SAMPLE-001",
      subject: "Layout Regression Sample",
      reference: "RF18539007547034",
      status: "draft",
      issueDate: new Date("2026-03-13T00:00:00.000Z"),
      dueDate: new Date("2026-03-27T00:00:00.000Z"),
      currency: business.currency || "CHF",
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      notes: "Thank you for your business.",
      publicToken: null,
      stripeCheckoutSessionId: null,
      stripeCheckoutSessionExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      business,
      client: fallbackClient,
      lineItems: Array.from({ length: rows }, (_, index) => ({
        id: `sample-line-${index + 1}`,
        invoiceId: "sample-invoice",
        description: `Consulting block ${index + 1}`,
        quantity: 1 + (index % 3) * 0.5,
        unitPrice: 120 + index * 5,
        taxRate: 0,
        total: (1 + (index % 3) * 0.5) * (120 + index * 5),
        createdAt: new Date(),
      })),
    };

    const doc = <InvoiceDocument invoice={sampleInvoice} senderPreferences={senderPreferences} />;
    const pdfBuffer = (await pdf(doc).toBuffer()) as unknown as BodyInit;
    const filename = buildInvoicePdfFilename(sampleInvoice.invoiceNumber);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error generating sample invoice PDF:", error);
    return apiError("Server error", 500);
  }
}
