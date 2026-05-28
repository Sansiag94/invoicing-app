import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeUnbilledWorkInput, toUnbilledWorkItemRecord } from "@/lib/unbilledWork";

async function getOwnedBusinessAndClient(request: Request, clientId: string) {
  const user = await getAuthenticatedUser(request);

  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true, vatRegistered: true },
  });

  if (!business) {
    return null;
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: business.id },
    select: { id: true },
  });

  if (!client) {
    return null;
  }

  return { business, client };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const owned = await getOwnedBusinessAndClient(request, id);

    if (!owned) {
      return apiError("Client not found", 404);
    }

    const items = await prisma.unbilledWorkItem.findMany({
      where: {
        businessId: owned.business.id,
        clientId: owned.client.id,
      },
      orderBy: [{ status: "asc" }, { serviceDate: "desc" }, { createdAt: "desc" }],
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

    return NextResponse.json(items.map(toUnbilledWorkItemRecord));
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading unbilled work items:", error);
    return apiError("Server error", 500);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const owned = await getOwnedBusinessAndClient(request, id);

    if (!owned) {
      return apiError("Client not found", 404);
    }

    const input = normalizeUnbilledWorkInput(await request.json());
    if (!input) {
      return apiError("Missing or invalid work item fields", 400);
    }

    const item = await prisma.unbilledWorkItem.create({
      data: {
        businessId: owned.business.id,
        clientId: owned.client.id,
        serviceDate: input.serviceDate,
        description: input.description,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        taxRate: owned.business.vatRegistered ? input.taxRate : 0,
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

    return NextResponse.json(toUnbilledWorkItemRecord(item), { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating unbilled work item:", error);
    return apiError("Server error", 500);
  }
}
