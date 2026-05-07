import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { toMonthlyReportRecord } from "@/lib/analytics";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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

    const reports = await prisma.monthlyReport.findMany({
      where: { businessId: business.id },
      orderBy: { month: "desc" },
    });

    return NextResponse.json(reports.map(toMonthlyReportRecord), { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading monthly reports:", error);
    return apiError("Server error", 500);
  }
}
