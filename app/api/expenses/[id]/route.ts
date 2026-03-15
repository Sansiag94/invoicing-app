import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { isExpenseCategory, normalizeExpenseCurrency } from "@/lib/expenses";
import { ExpenseCategory, ExpenseRecord, InvoiceCurrency } from "@/lib/types";

type UpdateExpenseBody = {
  vendor?: unknown;
  description?: unknown;
  category?: unknown;
  amount?: unknown;
  currency?: unknown;
  expenseDate?: unknown;
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const { id } = await params;
    const body = (await request.json()) as UpdateExpenseBody;

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true, currency: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const existingExpense = await prisma.expense.findFirst({
      where: { id, businessId: business.id },
    });

    if (!existingExpense) {
      return apiError("Expense not found", 404);
    }

    const description = body.description === undefined ? existingExpense.description : asString(body.description);
    const vendor = body.vendor === undefined ? existingExpense.vendor : asString(body.vendor);
    const notes = body.notes === undefined ? existingExpense.notes : asString(body.notes);
    const amount = body.amount === undefined ? existingExpense.amount : asNumber(body.amount);
    const expenseDate = body.expenseDate === undefined ? existingExpense.expenseDate : asDate(body.expenseDate);
    const category = body.category === undefined ? existingExpense.category : body.category;
    const rawCurrency = body.currency === undefined ? existingExpense.currency : asString(body.currency);

    if (!description || amount === null || amount <= 0 || !expenseDate || !isExpenseCategory(category)) {
      return apiError("Missing or invalid expense fields", 400);
    }

    const currency: InvoiceCurrency = normalizeExpenseCurrency(rawCurrency, normalizeExpenseCurrency(business.currency, "CHF"));

    const expense = await prisma.expense.update({
      where: { id: existingExpense.id },
      data: {
        vendor,
        description,
        category,
        amount,
        currency,
        expenseDate,
        notes,
      },
    });

    return NextResponse.json(toExpenseRecord(expense));
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error updating expense:", error);
    return apiError("Server error", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const { id } = await params;

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const existingExpense = await prisma.expense.findFirst({
      where: { id, businessId: business.id },
      select: { id: true },
    });

    if (!existingExpense) {
      return apiError("Expense not found", 404);
    }

    await prisma.expense.delete({
      where: { id: existingExpense.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error deleting expense:", error);
    return apiError("Server error", 500);
  }
}
