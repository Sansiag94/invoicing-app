import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import InvoiceDocument from "@/lib/InvoiceDocument";
import { getBusinessSenderPreferences } from "@/lib/business";
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
    console.error("Error generating public invoice PDF:", error);
    return apiError("Server error", 500);
  }
}
