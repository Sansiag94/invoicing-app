import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";
import {
  buildAnalyticsOverview,
  resolveAnalyticsDateRange,
  toMonthlyReportRecord,
} from "@/lib/analytics";
import { AnalyticsOverview } from "@/lib/types";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true, currency: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    await markOverdueInvoicesForBusiness(business.id);

    const range = resolveAnalyticsDateRange(new URL(request.url));
    const [overview, reports] = await Promise.all([
      buildAnalyticsOverview(prisma, business.id, business.currency, range),
      prisma.monthlyReport.findMany({
        where: { businessId: business.id },
        orderBy: { month: "desc" },
        take: 18,
      }),
    ]);

    const payload: AnalyticsOverview = {
      ...overview,
      monthlyReports: reports.map(toMonthlyReportRecord),
    };

    return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading analytics:", error);
    return apiError("Server error", 500);
  }
}
