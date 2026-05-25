import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { withStructuredAddress } from "@/lib/address";
import { isSupportedInvoiceCurrency, normalizeInvoiceCurrency } from "@/lib/invoice";
import { normalizeInvoiceSenderType } from "@/lib/business";
import { loadResolvedBusinessStripeStatus } from "@/lib/stripeConnect";
import { isValidBic, isValidEmail, isValidIban, normalizeBic, normalizeIban } from "@/lib/validation";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";
import { normalizeSwissVatNumber } from "@/lib/vat";

type UpdateBusinessBody = {
  name: unknown;
  ownerName?: unknown;
  invoiceSenderType?: unknown;
  nextOfficialInvoiceSequence?: unknown;
  address: unknown;
  street?: unknown;
  postalCode?: unknown;
  city?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  bankName?: unknown;
  bic?: unknown;
  country: unknown;
  currency: unknown;
  vatRegistered?: unknown;
  vatNumber?: unknown;
  iban?: unknown;
  logoUrl?: unknown;
  acceptsTwintPayments?: unknown;
  twintPhoneNumber?: unknown;
  supportAssistantEnabled?: unknown;
  replyToEmail?: unknown;
  defaultPaymentTermDays?: unknown;
  defaultInvoiceMessage?: unknown;
  defaultInvoiceAttachmentUrl?: unknown;
  defaultInvoiceAttachmentName?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function asPositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function asPaymentTermDays(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 365) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 365) {
      return parsed;
    }
  }

  return null;
}

type SenderPreferencesRow = {
  ownerName: string | null;
  invoiceSenderType: string | null;
  bic: string | null;
  acceptsTwintPayments: boolean | null;
  twintPhoneNumber: string | null;
  supportAssistantEnabled: boolean | null;
  replyToEmail: string | null;
  defaultPaymentTermDays: number | null;
  defaultInvoiceMessage: string | null;
  defaultInvoiceAttachmentUrl: string | null;
  defaultInvoiceAttachmentName: string | null;
};

async function loadSenderPreferences(businessId: string) {
  try {
    const rows = await prisma.$queryRaw<SenderPreferencesRow[]>`
      SELECT "ownerName", "invoiceSenderType", "bic"
      ,"acceptsTwintPayments", "twintPhoneNumber", "supportAssistantEnabled",
      "replyToEmail", "defaultPaymentTermDays", "defaultInvoiceMessage",
      "defaultInvoiceAttachmentUrl", "defaultInvoiceAttachmentName"
      FROM "Business"
      WHERE "uuid" = ${businessId}
      LIMIT 1
    `;

    const row = rows[0];
    return {
      ownerName: row?.ownerName ?? null,
      invoiceSenderType: normalizeInvoiceSenderType(row?.invoiceSenderType ?? null),
      bic: row?.bic ?? null,
      acceptsTwintPayments: Boolean(row?.acceptsTwintPayments),
      twintPhoneNumber: row?.twintPhoneNumber ?? null,
      supportAssistantEnabled: Boolean(row?.supportAssistantEnabled),
      replyToEmail: row?.replyToEmail ?? null,
      defaultPaymentTermDays: row?.defaultPaymentTermDays ?? 30,
      defaultInvoiceMessage: row?.defaultInvoiceMessage ?? null,
      defaultInvoiceAttachmentUrl: row?.defaultInvoiceAttachmentUrl ?? null,
      defaultInvoiceAttachmentName: row?.defaultInvoiceAttachmentName ?? null,
    };
  } catch (error) {
    console.warn("Unable to load sender preferences (columns may not exist yet):", error);
    return {
      ownerName: null,
      invoiceSenderType: "company" as const,
      bic: null,
      acceptsTwintPayments: false,
      twintPhoneNumber: null,
      supportAssistantEnabled: false,
      replyToEmail: null,
      defaultPaymentTermDays: 30,
      defaultInvoiceMessage: null,
      defaultInvoiceAttachmentUrl: null,
      defaultInvoiceAttachmentName: null,
    };
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);
    const senderPreferences = await loadSenderPreferences(business.id);
    const stripeConnectStatus = await loadResolvedBusinessStripeStatus(business.id);

    return NextResponse.json({
      ...business,
      ...senderPreferences,
      ...stripeConnectStatus,
      nextOfficialInvoiceSequence: business.invoiceCounter + 1,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error loading business:", error);
    return apiError("Server error", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = (await request.json()) as UpdateBusinessBody;
    const name = asString(body.name);
    const country = asString(body.country);
    const currency = asString(body.currency);
    const ownerName = asString(body.ownerName);
    const invoiceSenderType = normalizeInvoiceSenderType(
      typeof body.invoiceSenderType === "string" ? body.invoiceSenderType : null
    );
    const normalizedEmail = asString(body.email);
    const normalizedIban = normalizeIban(asString(body.iban));
    const normalizedBic = normalizeBic(asString(body.bic));
    const twintPhoneNumber = asString(body.twintPhoneNumber);
    const acceptsTwintPayments = Boolean(body.acceptsTwintPayments);
    const requestedNextOfficialInvoiceSequence =
      body.nextOfficialInvoiceSequence === undefined
        ? null
        : asPositiveInteger(body.nextOfficialInvoiceSequence);

    const structuredAddress = withStructuredAddress({
      address: asString(body.address),
      street: asString(body.street),
      postalCode: asString(body.postalCode),
      city: asString(body.city),
    });

    if (!name || !structuredAddress.address || !structuredAddress.street || !structuredAddress.postalCode || !structuredAddress.city || !country || !currency) {
      return apiError("Missing required fields", 400);
    }

    const normalizedCurrencyCandidate = currency.toUpperCase();
    if (!isSupportedInvoiceCurrency(normalizedCurrencyCandidate)) {
      return apiError("currency must be CHF or EUR", 400);
    }
    const normalizedCurrency = normalizeInvoiceCurrency(normalizedCurrencyCandidate);

    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return apiError("Invalid business email address", 400);
    }

    if (normalizedIban && !isValidIban(normalizedIban)) {
      return apiError("Invalid IBAN", 400);
    }

    if (normalizedBic && !isValidBic(normalizedBic)) {
      return apiError("Invalid BIC / SWIFT code", 400);
    }

    if (acceptsTwintPayments && !twintPhoneNumber) {
      return apiError("Add a TWINT phone number or disable TWINT payments", 400);
    }

    if (body.nextOfficialInvoiceSequence !== undefined && !requestedNextOfficialInvoiceSequence) {
      return apiError("Next official invoice number must be a whole number greater than 0", 400);
    }

    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);
    const existingSenderPreferences = await loadSenderPreferences(business.id);
    const replyToEmail = asString(body.replyToEmail);
    const defaultPaymentTermDays =
      body.defaultPaymentTermDays === undefined
        ? existingSenderPreferences.defaultPaymentTermDays
        : asPaymentTermDays(body.defaultPaymentTermDays);
    const defaultInvoiceMessage =
      body.defaultInvoiceMessage === undefined ? existingSenderPreferences.defaultInvoiceMessage : asString(body.defaultInvoiceMessage);
    const defaultInvoiceAttachmentUrl =
      body.defaultInvoiceAttachmentUrl === undefined
        ? existingSenderPreferences.defaultInvoiceAttachmentUrl
        : asString(body.defaultInvoiceAttachmentUrl);
    const defaultInvoiceAttachmentName =
      body.defaultInvoiceAttachmentName === undefined
        ? existingSenderPreferences.defaultInvoiceAttachmentName
        : asString(body.defaultInvoiceAttachmentName);
    const supportAssistantEnabled =
      body.supportAssistantEnabled === undefined
        ? existingSenderPreferences.supportAssistantEnabled
        : asBoolean(body.supportAssistantEnabled);
    const vatRegistered =
      body.vatRegistered === undefined ? Boolean(business.vatRegistered) : asBoolean(body.vatRegistered);
    const normalizedVatNumber = vatRegistered
      ? normalizeSwissVatNumber(asString(body.vatNumber) ?? business.vatNumber)
      : null;

    if (vatRegistered && !normalizedVatNumber) {
      return apiError("Enter a Swiss VAT number in the format CHE-123.456.789 MWST, TVA, or IVA", 400);
    }

    if (replyToEmail && !isValidEmail(replyToEmail)) {
      return apiError("Invalid reply-to email address", 400);
    }

    if (defaultPaymentTermDays === null) {
      return apiError("Default payment term must be a whole number between 0 and 365 days", 400);
    }

    if (
      requestedNextOfficialInvoiceSequence !== null &&
      requestedNextOfficialInvoiceSequence < business.invoiceCounter + 1
    ) {
      return apiError(
        `Next official invoice number cannot be lower than ${business.invoiceCounter + 1}`,
        400
      );
    }

    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        name,
        address: structuredAddress.address,
        street: structuredAddress.street,
        postalCode: structuredAddress.postalCode,
        city: structuredAddress.city,
        phone: asString(body.phone),
        email: normalizedEmail,
        website: asString(body.website),
        bankName: asString(body.bankName),
        country,
        currency: normalizedCurrency,
        vatRegistered,
        vatNumber: normalizedVatNumber,
        iban: normalizedIban,
        logoUrl: body.logoUrl === undefined ? business.logoUrl : asString(body.logoUrl),
        invoiceCounter:
          requestedNextOfficialInvoiceSequence === null
            ? business.invoiceCounter
            : requestedNextOfficialInvoiceSequence - 1,
      },
    });

    try {
      await prisma.$executeRaw`
        UPDATE "Business"
        SET
          "ownerName" = ${ownerName},
          "invoiceSenderType" = ${invoiceSenderType},
          "bic" = ${normalizedBic},
          "acceptsTwintPayments" = ${acceptsTwintPayments},
          "twintPhoneNumber" = ${acceptsTwintPayments ? twintPhoneNumber : null},
          "supportAssistantEnabled" = ${supportAssistantEnabled},
          "replyToEmail" = ${replyToEmail},
          "defaultPaymentTermDays" = ${defaultPaymentTermDays},
          "defaultInvoiceMessage" = ${defaultInvoiceMessage},
          "defaultInvoiceAttachmentUrl" = ${defaultInvoiceAttachmentUrl},
          "defaultInvoiceAttachmentName" = ${defaultInvoiceAttachmentName}
        WHERE "uuid" = ${business.id}
      `;
    } catch (error) {
      console.warn("Unable to save sender preferences (columns may not exist yet):", error);
    }

    const senderPreferences = await loadSenderPreferences(business.id);
    const stripeConnectStatus = await loadResolvedBusinessStripeStatus(business.id);

    return NextResponse.json({
      ...updatedBusiness,
      ...senderPreferences,
      ...stripeConnectStatus,
      nextOfficialInvoiceSequence: updatedBusiness.invoiceCounter + 1,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error updating business:", error);
    return apiError("Server error", 500);
  }
}
