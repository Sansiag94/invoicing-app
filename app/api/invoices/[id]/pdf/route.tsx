import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import InvoiceDocument from "@/lib/InvoiceDocument";
import { getBusinessSenderPreferences } from "@/lib/business";
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

    const senderPreferences = getBusinessSenderPreferences(invoice.business);

    const doc = (
      <InvoiceDocument
        invoice={{
          ...invoice,
          business: {
            ...invoice.business,
            bic: senderPreferences.bic,
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
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error generating invoice PDF:", error);
    return apiError("Server error", 500);
  }
}
