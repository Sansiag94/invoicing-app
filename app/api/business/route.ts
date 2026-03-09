import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const business = await prisma.business.findFirst({
    where: { userId }
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json(business);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { userId, name, address, country, currency, vatNumber, iban, invoicePrefix, logoUrl } = body;

  // Validate required fields
  if (!userId || !name || !address || !country || !currency) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Find the existing business
  const business = await prisma.business.findFirst({
    where: { userId }
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Update the business with the new data
  const updatedBusiness = await prisma.business.update({
    where: { id: business.id },
    data: {
      name,
      address,
      country,
      currency,
      vatNumber,
      iban,
      invoicePrefix,
      logoUrl
    }
  });

  return NextResponse.json(updatedBusiness);
}