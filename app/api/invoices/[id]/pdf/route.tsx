import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import InvoiceDocument from "@/lib/InvoiceDocument";
import { normalizeInvoiceSenderType } from "@/lib/business";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Invoice not found", 404);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: business.id },
      include: {
        client: true,
        lineItems: true,
        business: true,
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    let senderPreferences: { ownerName: string | null; invoiceSenderType: "company" | "owner" } = {
      ownerName: null,
      invoiceSenderType: "company",
    };

    try {
      const rows = await prisma.$queryRaw<Array<{ ownerName: string | null; invoiceSenderType: string | null }>>`
        SELECT "ownerName", "invoiceSenderType"
        FROM "Business"
        WHERE "uuid" = ${invoice.businessId}
        LIMIT 1
      `;

      const row = rows[0];
      senderPreferences = {
        ownerName: row?.ownerName ?? null,
        invoiceSenderType: normalizeInvoiceSenderType(row?.invoiceSenderType ?? null),
      };
    } catch (error) {
      console.warn("Unable to load sender preferences for PDF (columns may not exist yet):", error);
    }

    const doc = <InvoiceDocument invoice={invoice} senderPreferences={senderPreferences} />;
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
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error generating invoice PDF:", error);
    return apiError("Server error", 500);
  }
}
