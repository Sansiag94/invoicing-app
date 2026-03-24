import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { calculateInvoiceTotals, normalizeInvoiceCurrency } from "@/lib/invoice";
import { generateSwissQRCodeRects, generateSwissQRPayload, getSwissQRBillMetadata } from "@/lib/qrbill";
import { getBusinessSenderPreferences, getInvoiceSenderName } from "@/lib/business";
import { isSwissCountry } from "@/lib/countries";
import { hasRecentInvoiceEvent, logInvoiceEvent } from "@/lib/invoiceActivity";
import {
  isStripeCardPaymentAvailable,
  loadResolvedBusinessStripeStatus,
} from "@/lib/stripeConnect";
import {
  assertRateLimit,
  buildRateLimitIdentifier,
  createRateLimitErrorResponse,
  isRateLimitError,
} from "@/lib/rateLimit";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token?.trim()) {
      return apiError("Token is required", 400);
    }

    await assertRateLimit({
      request,
      route: "public-invoice-view",
      limit: 120,
      windowMs: 10 * 60 * 1000,
      identifier: buildRateLimitIdentifier(request, token, "view"),
    });

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
            language: true,
            vatNumber: true,
          },
        },
        lineItems: {
          orderBy: { position: "asc" },
        },
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
            bic: true,
            country: true,
            vatNumber: true,
            currency: true,
            iban: true,
            ownerName: true,
            invoiceSenderType: true,
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

    const alreadyLoggedRecently = await hasRecentInvoiceEvent({
      invoiceId: invoice.id,
      type: "viewed",
      sinceMinutes: 60,
    });
    if (!alreadyLoggedRecently) {
      await logInvoiceEvent({
        invoiceId: invoice.id,
        type: "viewed",
        actor: "Public link",
        details: "Invoice viewed online",
      });
    }

    const computedTotals = calculateInvoiceTotals(invoice.lineItems);

    const senderPreferences = getBusinessSenderPreferences(invoice.business);

    const { user: businessUser, ...businessCore } = invoice.business;
    const businessWithSender = {
      ...businessCore,
      email: businessCore.email ?? businessUser?.email ?? null,
      ...senderPreferences,
    };

    const senderName = getInvoiceSenderName(businessWithSender);
    const stripeStatus = await loadResolvedBusinessStripeStatus(invoice.business.id);
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
      cardPaymentAvailable: isStripeCardPaymentAvailable(stripeStatus),
      qrBill,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return createRateLimitErrorResponse(error);
    }

    console.error("Error loading public invoice:", error);
    return apiError("Server error", 500);
  }
}
