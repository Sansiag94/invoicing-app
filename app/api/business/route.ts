import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { withStructuredAddress } from "@/lib/address";
import { isSupportedInvoiceCurrency, normalizeInvoiceCurrency } from "@/lib/invoice";
import { normalizeInvoiceSenderType } from "@/lib/business";

type UpdateBusinessBody = {
  name: unknown;
  ownerName?: unknown;
  invoiceSenderType?: unknown;
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
  vatNumber?: unknown;
  iban?: unknown;
  logoUrl?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

type SenderPreferencesRow = {
  ownerName: string | null;
  invoiceSenderType: string | null;
  bic: string | null;
};

async function loadSenderPreferences(businessId: string) {
  try {
    const rows = await prisma.$queryRaw<SenderPreferencesRow[]>`
      SELECT "ownerName", "invoiceSenderType", "bic"
      FROM "Business"
      WHERE "uuid" = ${businessId}
      LIMIT 1
    `;

    const row = rows[0];
    return {
      ownerName: row?.ownerName ?? null,
      invoiceSenderType: normalizeInvoiceSenderType(row?.invoiceSenderType ?? null),
      bic: row?.bic ?? null,
    };
  } catch (error) {
    console.warn("Unable to load sender preferences (columns may not exist yet):", error);
    return {
      ownerName: null,
      invoiceSenderType: "company" as const,
      bic: null,
    };
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    const senderPreferences = await loadSenderPreferences(business.id);

    return NextResponse.json({
      ...business,
      ...senderPreferences,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
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

    const business = await ensureBusiness(user.id);

    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        name,
        address: structuredAddress.address,
        street: structuredAddress.street,
        postalCode: structuredAddress.postalCode,
        city: structuredAddress.city,
        phone: asString(body.phone),
        email: asString(body.email),
        website: asString(body.website),
        bankName: asString(body.bankName),
        country,
        currency: normalizedCurrency,
        vatNumber: asString(body.vatNumber),
        iban: asString(body.iban),
        logoUrl: body.logoUrl === undefined ? business.logoUrl : asString(body.logoUrl),
      },
    });

    try {
      await prisma.$executeRaw`
        UPDATE "Business"
        SET
          "ownerName" = ${ownerName},
          "invoiceSenderType" = ${invoiceSenderType},
          "bic" = ${asString(body.bic)}
        WHERE "uuid" = ${business.id}
      `;
    } catch (error) {
      console.warn("Unable to save sender preferences (columns may not exist yet):", error);
    }

    const senderPreferences = await loadSenderPreferences(business.id);

    return NextResponse.json({
      ...updatedBusiness,
      ...senderPreferences,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating business:", error);
    return apiError("Server error", 500);
  }
}
