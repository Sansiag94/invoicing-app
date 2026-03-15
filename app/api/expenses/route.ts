import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { isExpenseCategory, normalizeExpenseCurrency } from "@/lib/expenses";
import { ExpenseCategory, ExpenseRecord, ExpensesPageData, InvoiceCurrency } from "@/lib/types";

type CreateExpenseBody = {
  vendor?: unknown;
  description: unknown;
  category: unknown;
  amount: unknown;
  currency?: unknown;
  expenseDate: unknown;
  notes?: unknown;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toExpenseRecord(expense: {
  id: string;
  vendor: string | null;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ExpenseRecord {
  return {
    ...expense,
    currency: normalizeExpenseCurrency(expense.currency, "CHF"),
    expenseDate: expense.expenseDate.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

function getDateRanges(now: Date) {
  return {
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    thirtyDaysAgo: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    startOfYear: new Date(now.getFullYear(), 0, 1),
  };
}

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

    const now = new Date();
    const { startOfMonth, thirtyDaysAgo, startOfYear } = getDateRanges(now);

    const [expensesRaw, thisMonthAggregate, last30DaysAggregate, yearToDateAggregate, totalAggregate] =
      await prisma.$transaction([
        prisma.expense.findMany({
          where: { businessId: business.id },
          orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
        }),
        prisma.expense.aggregate({
          where: {
            businessId: business.id,
            expenseDate: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            businessId: business.id,
            expenseDate: { gte: thirtyDaysAgo },
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            businessId: business.id,
            expenseDate: { gte: startOfYear },
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { businessId: business.id },
          _sum: { amount: true },
        }),
      ]);

    const expenses = expensesRaw.map(toExpenseRecord);
    const currency = normalizeExpenseCurrency(business.currency, "CHF");
    const payload: ExpensesPageData = {
      overview: {
        currency,
        thisMonthTotal: thisMonthAggregate._sum.amount ?? 0,
        last30DaysTotal: last30DaysAggregate._sum.amount ?? 0,
        yearToDateTotal: yearToDateAggregate._sum.amount ?? 0,
        totalExpenses: totalAggregate._sum.amount ?? 0,
        recentExpenses: expenses.slice(0, 5),
      },
      expenses,
    };

    return NextResponse.json(payload);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading expenses:", error);
    return apiError("Server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const body = (await request.json()) as CreateExpenseBody;
    const description = asString(body.description);
    const vendor = asString(body.vendor);
    const notes = asString(body.notes);
    const amount = asNumber(body.amount);
    const expenseDate = asDate(body.expenseDate);
    const rawCurrency = asString(body.currency);

    if (!description || amount === null || amount <= 0 || !expenseDate || !isExpenseCategory(body.category)) {
      return apiError("Missing or invalid expense fields", 400);
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true, currency: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const currency: InvoiceCurrency = normalizeExpenseCurrency(rawCurrency, normalizeExpenseCurrency(business.currency, "CHF"));

    const expense = await prisma.expense.create({
      data: {
        businessId: business.id,
        vendor,
        description,
        category: body.category,
        amount,
        currency,
        expenseDate,
        notes,
      },
    });

    return NextResponse.json(toExpenseRecord(expense), { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error creating expense:", error);
    return apiError("Server error", 500);
  }
}
