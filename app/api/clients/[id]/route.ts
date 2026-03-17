import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { withStructuredAddress } from "@/lib/address";
import { isSupportedCountry } from "@/lib/countries";
import { isValidEmail } from "@/lib/validation";

type UpdateClientBody = {
  companyName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  street?: unknown;
  postalCode?: unknown;
  city?: unknown;
  country?: unknown;
  vatNumber?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function getOwnedClientId(request: Request, id: string): Promise<string | null> {
  const user = await getAuthenticatedUser(request);

  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!business) {
    return null;
  }

  const client = await prisma.client.findFirst({
    where: { id, businessId: business.id },
    select: { id: true },
  });

  return client?.id ?? null;
}

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
      return apiError("Client not found", 404);
    }

    const client = await prisma.client.findFirst({
      where: { id, businessId: business.id },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return apiError("Client not found", 404);
    }

    return NextResponse.json(client);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading client:", error);
    return apiError("Server error", 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const clientId = await getOwnedClientId(request, id);

    if (!clientId) {
      return apiError("Client not found", 404);
    }

    const body = (await request.json()) as UpdateClientBody;
    const companyName = asString(body.companyName);
    const contactName = asString(body.contactName);
    const email = asString(body.email);
    const phone = asString(body.phone);
    const country = asString(body.country);
    const vatNumber = asString(body.vatNumber);
    const structuredAddress = withStructuredAddress({
      address: asString(body.address),
      street: asString(body.street),
      postalCode: asString(body.postalCode),
      city: asString(body.city),
    });

    if (!email || !structuredAddress.address || !structuredAddress.street || !structuredAddress.postalCode || !structuredAddress.city || !country) {
      return apiError("Missing required fields", 400);
    }

    if (!isSupportedCountry(country)) {
      return apiError("Invalid country", 400);
    }

    if (!isValidEmail(email)) {
      return apiError("Invalid email address", 400);
    }

    if (!companyName && !contactName) {
      return apiError("Client must have a company name or contact name", 400);
    }

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        companyName,
        contactName,
        email,
        phone,
        address: structuredAddress.address,
        street: structuredAddress.street,
        postalCode: structuredAddress.postalCode,
        city: structuredAddress.city,
        country,
        vatNumber,
      },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating client:", error);
    return apiError("Server error", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const clientId = await getOwnedClientId(request, id);

    if (!clientId) {
      return apiError("Client not found", 404);
    }

    await prisma.client.delete({ where: { id: clientId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error deleting client:", error);
    return apiError("Server error", 500);
  }
}
