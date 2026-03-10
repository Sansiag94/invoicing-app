import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";

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
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: business.id },
      include: {
        client: true,
        lineItems: true,
        business: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error("Error loading invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
