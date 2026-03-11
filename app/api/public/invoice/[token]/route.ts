import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token?.trim()) {
      return apiError("Token is required", 400);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { publicToken: token },
      include: {
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
            address: true,
            country: true,
            vatNumber: true,
          },
        },
        lineItems: true,
        business: {
          select: {
            name: true,
            logoUrl: true,
            address: true,
            country: true,
            vatNumber: true,
            currency: true,
            iban: true,
          },
        },
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error loading public invoice:", error);
    return apiError("Server error", 500);
  }
}
