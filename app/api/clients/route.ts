import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";

type CreateClientBody = {
  email: unknown;
  address: unknown;
  country: unknown;
  companyName?: unknown;
  contactName?: unknown;
  vatNumber?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json([]);
    }

    const clients = await prisma.client.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading clients:", error);
    return apiError("Server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = (await request.json()) as CreateClientBody;
    const email = asString(body.email);
    const address = asString(body.address);
    const country = asString(body.country);
    const companyName = asString(body.companyName);
    const contactName = asString(body.contactName);
    const vatNumber = asString(body.vatNumber);

    if (!email || !address || !country) {
      return apiError("Missing required fields", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return apiError("Invalid email address", 400);
    }

    if (!companyName && !contactName) {
      return apiError("Client must have a company name or contact name", 400);
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const client = await prisma.client.create({
      data: {
        businessId: business.id,
        companyName,
        contactName,
        email,
        address,
        country,
        vatNumber,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating client:", error);
    return apiError("Server error", 500);
  }
}
