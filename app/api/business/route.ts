import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";

type UpdateBusinessBody = {
  name: unknown;
  address: unknown;
  country: unknown;
  currency: unknown;
  vatNumber?: unknown;
  iban?: unknown;
  invoicePrefix?: unknown;
  logoUrl?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);

    return NextResponse.json(business);
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
    const address = asString(body.address);
    const country = asString(body.country);
    const currency = asString(body.currency);

    if (!name || !address || !country || !currency) {
      return apiError("Missing required fields", 400);
    }

    const business = await ensureBusiness(user.id);

    const updatedBusiness = await prisma.business.update({
      where: { id: business.id },
      data: {
        name,
        address,
        country,
        currency,
        vatNumber: asString(body.vatNumber),
        iban: asString(body.iban),
        invoicePrefix: asString(body.invoicePrefix) ?? business.invoicePrefix,
        logoUrl: body.logoUrl === undefined ? business.logoUrl : asString(body.logoUrl),
      },
    });

    return NextResponse.json(updatedBusiness);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating business:", error);
    return apiError("Server error", 500);
  }
}
