import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizePortfolioItemInput, toPortfolioItemRecord } from "@/lib/portfolio";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const { id } = await params;
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

    const existing = await prisma.portfolioItem.findFirst({
      where: { id, businessId: business.id },
      select: { id: true },
    });

    if (!existing) {
      return apiError("Portfolio item not found", 404);
    }

    const item = await prisma.portfolioItem.update({
      where: { id: existing.id },
      data: input,
    });

    return NextResponse.json(toPortfolioItemRecord(item));
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating portfolio item:", error);
    return apiError("Server error", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const { id } = await params;
    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const existing = await prisma.portfolioItem.findFirst({
      where: { id, businessId: business.id },
      select: { id: true },
    });

    if (!existing) {
      return apiError("Portfolio item not found", 404);
    }

    await prisma.portfolioItem.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error deleting portfolio item:", error);
    return apiError("Server error", 500);
  }
}
