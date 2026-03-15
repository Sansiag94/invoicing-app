import { describe, expect, it } from "vitest";
import { getExpenseCategoryLabel, normalizeExpenseCurrency, toExpenseRecord } from "@/lib/expenses";

describe("expense helpers", () => {
  it("normalizes expense currency with CHF fallback", () => {
    expect(normalizeExpenseCurrency("EUR", "CHF")).toBe("EUR");
    expect(normalizeExpenseCurrency("USD", "CHF")).toBe("CHF");
  });

  it("maps categories to user-facing labels", () => {
    expect(getExpenseCategoryLabel("software")).toBe("Software");
    expect(getExpenseCategoryLabel("subcontractor")).toBe("Subcontractor");
  });

  it("serializes expense records for the client", () => {
    expect(
      toExpenseRecord({
        id: "expense-1",
        vendor: "Swisscom",
        description: "Phone",
        category: "software",
        amount: 99,
        currency: "CHF",
        expenseDate: new Date("2026-03-15T00:00:00Z"),
        notes: null,
        receiptUrl: "https://example.com/receipt.pdf",
        isRecurring: true,
        taxDeductible: true,
        vatReclaimable: false,
        vatAmount: null,
        createdAt: new Date("2026-03-15T00:00:00Z"),
        updatedAt: new Date("2026-03-15T00:00:00Z"),
      })
    ).toMatchObject({
      currency: "CHF",
      receiptUrl: "https://example.com/receipt.pdf",
      isRecurring: true,
    });
  });
});
