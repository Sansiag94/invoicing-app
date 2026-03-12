import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { calculateInvoiceTotals, normalizeInvoiceCurrency } from "@/lib/invoice";
import { generateSwissQRCodeRects, generateSwissQRPayload, getSwissQRBillMetadata } from "@/lib/qrbill";
import { getInvoiceSenderName } from "@/lib/business";
import { isSwissCountry } from "@/lib/countries";

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
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            address: true,
            street: true,
            postalCode: true,
            city: true,
            country: true,
            vatNumber: true,
          },
        },
        lineItems: true,
        business: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            address: true,
            street: true,
            postalCode: true,
            city: true,
            phone: true,
            email: true,
            website: true,
            bankName: true,
            country: true,
            vatNumber: true,
            currency: true,
            iban: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    const computedTotals = calculateInvoiceTotals(invoice.lineItems);

    let senderPreferences: { ownerName: string | null; invoiceSenderType: "company" | "owner" } = {
      ownerName: null,
      invoiceSenderType: "company",
    };

    try {
      const rows = await prisma.$queryRaw<Array<{ ownerName: string | null; invoiceSenderType: string | null }>>`
        SELECT "ownerName", "invoiceSenderType"
        FROM "Business"
        WHERE "uuid" = ${invoice.business.id}
        LIMIT 1
      `;

      const row = rows[0];
      senderPreferences = {
        ownerName: row?.ownerName ?? null,
        invoiceSenderType: row?.invoiceSenderType?.toLowerCase() === "owner" ? "owner" : "company",
      };
    } catch (error) {
      console.warn("Unable to load sender preferences (columns may not exist yet):", error);
    }

    const { user: businessUser, ...businessCore } = invoice.business;
    const businessWithSender = {
      ...businessCore,
      email: businessCore.email ?? businessUser?.email ?? null,
      ...senderPreferences,
    };

    const senderName = getInvoiceSenderName(businessWithSender);
    const invoiceForQR = {
      ...invoice,
      totalAmount: computedTotals.totalAmount,
    };
    const businessForQR = {
      ...businessWithSender,
      name: senderName,
    };

    let qrBill: {
      payload: string;
      account: string;
      referenceType: "NON" | "QRR" | "SCOR";
      reference: string | null;
      additionalInformation: string;
      qrRects: Array<{ x: number; y: number; width: number; height: number; fill: string }>;
    } | null = null;

    if (invoice.business.iban?.trim() && isSwissCountry(invoice.client.country)) {
      try {
        const metadata = getSwissQRBillMetadata(invoiceForQR, businessForQR);
        qrBill = {
          payload: generateSwissQRPayload(invoiceForQR, businessForQR, invoice.client),
          account: metadata.account,
          referenceType: metadata.referenceType,
          reference: metadata.reference,
          additionalInformation: metadata.additionalInformation,
          qrRects: generateSwissQRCodeRects(invoiceForQR, businessForQR, invoice.client),
        };
      } catch (error) {
        console.error("Error generating Swiss QR-bill payload:", error);
      }
    }

    return NextResponse.json({
      ...invoice,
      business: businessWithSender,
      subtotal: computedTotals.subtotal,
      taxAmount: computedTotals.taxAmount,
      totalAmount: computedTotals.totalAmount,
      currency: normalizeInvoiceCurrency(invoice.currency, "CHF"),
      qrBill,
    });
  } catch (error) {
    console.error("Error loading public invoice:", error);
    return apiError("Server error", 500);
  }
}
