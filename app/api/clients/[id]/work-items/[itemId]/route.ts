import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeUnbilledWorkInput, toUnbilledWorkItemRecord } from "@/lib/unbilledWork";

async function getOwnedBusinessId(request: Request): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true, vatRegistered: true },
  });

  return business?.id ?? null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await context.params;
    const businessId = await getOwnedBusinessId(request);

    if (!businessId) {
      return apiError("Work item not found", 404);
    }

    const existing = await prisma.unbilledWorkItem.findFirst({
      where: {
        id: itemId,
        clientId: id,
        businessId,
      },
      include: {
        business: {
          select: { vatRegistered: true },
        },
      },
    });

    if (!existing) {
      return apiError("Work item not found", 404);
    }

    if (existing.status !== "unbilled") {
      return apiError("Only unbilled work items can be edited", 409);
    }

    const input = normalizeUnbilledWorkInput(await request.json());
    if (!input) {
      return apiError("Missing or invalid work item fields", 400);
    }

    const item = await prisma.unbilledWorkItem.update({
      where: { id: existing.id },
      data: {
        serviceDate: input.serviceDate,
        description: input.description,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        taxRate: existing.business.vatRegistered ? input.taxRate : 0,
        notes: input.notes,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(toUnbilledWorkItemRecord(item));
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating unbilled work item:", error);
    return apiError("Server error", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await context.params;
    const businessId = await getOwnedBusinessId(request);

    if (!businessId) {
      return apiError("Work item not found", 404);
    }

    const existing = await prisma.unbilledWorkItem.findFirst({
      where: {
        id: itemId,
        clientId: id,
        businessId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return apiError("Work item not found", 404);
    }

    if (existing.status !== "unbilled") {
      return apiError("Only unbilled work items can be deleted", 409);
    }

    await prisma.unbilledWorkItem.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error deleting unbilled work item:", error);
    return apiError("Server error", 500);
  }
}
