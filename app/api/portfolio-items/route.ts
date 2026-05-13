import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizePortfolioItemInput, toPortfolioItemRecord } from "@/lib/portfolio";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const items = await prisma.portfolioItem.findMany({
      where: { businessId: business.id },
      orderBy: [{ active: "desc" }, { description: "asc" }],
    });

    return NextResponse.json(items.map(toPortfolioItemRecord));
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading portfolio items:", error);
    return apiError("Server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = await request.json();
    const input = normalizePortfolioItemInput(body);

    if (!input) {
      return apiError("Missing or invalid portfolio item fields", 400);
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const item = await prisma.portfolioItem.create({
      data: {
        businessId: business.id,
        ...input,
      },
    });

    return NextResponse.json(toPortfolioItemRecord(item), { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating portfolio item:", error);
    return apiError("Server error", 500);
  }
}
