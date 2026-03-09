import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureBusiness } from "@/lib/ensureBusiness";

type UpdateBusinessBody = {
  userId: unknown;
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
    const { searchParams } = new URL(request.url);
    const userId = asString(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const business = await ensureBusiness(userId);

    return NextResponse.json(business);
  } catch (error) {
    console.error("Error loading business:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateBusinessBody;
    const userId = asString(body.userId);
    const name = asString(body.name);
    const address = asString(body.address);
    const country = asString(body.country);
    const currency = asString(body.currency);

    if (!userId || !name || !address || !country || !currency) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const business = await ensureBusiness(userId);

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
        logoUrl: asString(body.logoUrl),
      },
    });

    return NextResponse.json(updatedBusiness);
  } catch (error) {
    console.error("Error updating business:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
