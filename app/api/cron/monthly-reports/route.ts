import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import {
  buildAnalyticsOverview,
  buildMonthlyReportDateRange,
  buildMonthlyReportMetrics,
  getPreviousMonthReportRange,
} from "@/lib/analytics";
import {
  assertAuthorizedCronRequest,
  isCronAuthorizationError,
} from "@/lib/cronAuth";
import {
  isEmailConfigurationError,
  isEmailDeliveryError,
  sendMonthlyReportEmail,
} from "@/lib/email";
import { getPublicInvoiceBaseUrl } from "@/lib/publicInvoiceLink";

export const runtime = "nodejs";

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CH", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

export async function POST(request: Request) {
  try {
    assertAuthorizedCronRequest(request);

    const now = new Date();
    const { month, startDate, endDateExclusive } = getPreviousMonthReportRange(now);
    const range = buildMonthlyReportDateRange(startDate, endDateExclusive);
    const businesses = await prisma.business.findMany({
      where: { closedAt: null },
      select: {
        id: true,
        name: true,
        currency: true,
        email: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const results: Array<{ businessId: string; month: string; status: string }> = [];

    for (const business of businesses) {
      const overview = await buildAnalyticsOverview(prisma, business.id, business.currency, range);
      const metrics = buildMonthlyReportMetrics(overview);
      const report = await prisma.monthlyReport.upsert({
        where: {
          businessId_month: {
            businessId: business.id,
            month,
          },
        },
        create: {
          businessId: business.id,
          month,
          currency: overview.currency,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          emailStatus: "pending",
        },
        update: {
          currency: overview.currency,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          generatedAt: new Date(),
          emailStatus: "pending",
        },
      });

      const to = business.user.email || business.email;
      if (!to) {
        await prisma.monthlyReport.update({
          where: { id: report.id },
          data: { emailStatus: "skipped_no_email" },
        });
        results.push({ businessId: business.id, month, status: "skipped_no_email" });
        continue;
      }

      try {
        await sendMonthlyReportEmail({
          to,
          businessName: business.name,
          monthLabel: formatMonthLabel(month),
          currency: overview.currency,
          metrics,
          analyticsLink: `${getPublicInvoiceBaseUrl()}/analytics#monthly-report`,
        });

        await prisma.monthlyReport.update({
          where: { id: report.id },
          data: {
            emailStatus: "sent",
            emailSentAt: new Date(),
          },
        });
        results.push({ businessId: business.id, month, status: "sent" });
      } catch (error) {
        if (isEmailConfigurationError(error) || isEmailDeliveryError(error)) {
          await prisma.monthlyReport.update({
            where: { id: report.id },
            data: { emailStatus: "email_failed" },
          });
          results.push({ businessId: business.id, month, status: "email_failed" });
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json({
      month,
      generated: results.length,
      results,
    });
  } catch (error) {
    if (isCronAuthorizationError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error generating monthly reports:", error);
    return apiError("Server error", 500);
  }
}
