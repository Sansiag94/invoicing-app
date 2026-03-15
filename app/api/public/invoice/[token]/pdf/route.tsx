import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import InvoiceDocument from "@/lib/InvoiceDocument";
import { normalizeInvoiceSenderType } from "@/lib/business";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token?.trim()) {
      return apiError("Token is required", 400);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { publicToken: token },
      include: {
        client: true,
        lineItems: true,
        business: true,
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    let senderPreferences: {
      ownerName: string | null;
      invoiceSenderType: "company" | "owner";
      bic: string | null;
    } = {
      ownerName: null,
      invoiceSenderType: "company",
      bic: null,
    };

    try {
      const rows = await prisma.$queryRaw<
        Array<{ ownerName: string | null; invoiceSenderType: string | null; bic: string | null }>
      >`
        SELECT "ownerName", "invoiceSenderType", "bic"
        FROM "Business"
        WHERE "uuid" = ${invoice.businessId}
        LIMIT 1
      `;

      const row = rows[0];
      senderPreferences = {
        ownerName: row?.ownerName ?? null,
        invoiceSenderType: normalizeInvoiceSenderType(row?.invoiceSenderType ?? null),
        bic: row?.bic ?? null,
      };
    } catch (error) {
      console.warn("Unable to load sender preferences for PDF (columns may not exist yet):", error);
    }

    const doc = (
      <InvoiceDocument
        invoice={{
          ...invoice,
          business: {
            ...invoice.business,
            bic: senderPreferences.bic ?? (invoice.business as { bic?: string | null }).bic ?? null,
          },
        }}
        senderPreferences={senderPreferences}
      />
    );
    const asPdf = pdf(doc);
    const pdfBuffer = (await asPdf.toBuffer()) as unknown as BodyInit;
    const filename = buildInvoicePdfFilename(invoice.invoiceNumber);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    console.error("Error generating public invoice PDF:", error);
    return apiError("Server error", 500);
  }
}
