import { describe, expect, it } from "vitest";
import {
  buildMonthlyReportDateRange,
  buildMonthlyReportMetrics,
  getPreviousMonthReportRange,
  resolveAnalyticsDateRange,
} from "@/lib/analytics";

describe("analytics helpers", () => {
  it("parses custom date ranges and supports a single day", () => {
    const url = new URL("https://example.com/api/analytics?startDate=2026-04-15&endDate=2026-04-15");
    const range = resolveAnalyticsDateRange(url, new Date("2026-05-07T12:00:00.000Z"));

    expect(range.startDateInput).toBe("2026-04-15");
    expect(range.endDateInput).toBe("2026-04-15");
    expect(range.endDateExclusive.getDate()).toBe(16);
  });

  it("builds previous month report ranges", () => {
    const range = getPreviousMonthReportRange(new Date("2026-05-07T12:00:00.000Z"));
    expect(range.month).toBe("2026-04");
    expect(buildMonthlyReportDateRange(range.startDate, range.endDateExclusive).endDateInput).toBe("2026-04-30");
  });

  it("builds monthly report metrics from analytics overview", () => {
    const metrics = buildMonthlyReportMetrics({
      currency: "CHF",
      dateRange: { startDate: "2026-04-01", endDate: "2026-04-30" },
      revenueThisMonth: 1000,
      expensesThisMonth: 300,
      netProfitThisMonth: 700,
      totalRevenue: 1000,
      totalExpenses: 300,
      totalProfit: 700,
      prospectRevenue: 250,
      overdueAmount: 100,
      paidInvoices: 2,
      unpaidInvoices: 1,
      averageDaysToPay: 5,
      averagePaidInvoiceValue: 500,
      monthProgress: {
        issuedAmount: 1200,
        issuedCount: 3,
        collectedAmount: 1000,
        openAmount: 250,
        overdueAmount: 100,
      },
      monthlySeries: [],
      topClients: [],
      expenseBreakdown: [],
      largestInvoice: null,
    });

    expect(metrics).toMatchObject({
      revenue: 1000,
      expenses: 300,
      profit: 700,
      issuedCount: 3,
    });
  });
});
