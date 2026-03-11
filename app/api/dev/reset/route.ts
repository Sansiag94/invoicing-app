import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return apiError("This endpoint is only available in development", 403);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lineItem.deleteMany();
      await tx.payment.deleteMany();
      await tx.invoice.deleteMany();
      await tx.client.deleteMany();
      await tx.business.updateMany({
        data: {
          invoiceCounter: 0,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting development data:", error);
    return apiError("Server error", 500);
  }
}
