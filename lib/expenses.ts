import { ExpenseCategory, InvoiceCurrency } from "@/lib/types";

export const expenseCategoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "software", label: "Software" },
  { value: "office", label: "Office" },
  { value: "travel", label: "Travel" },
  { value: "equipment", label: "Equipment" },
  { value: "tax", label: "Tax" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "marketing", label: "Marketing" },
  { value: "meals", label: "Meals" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

const expenseCategorySet = new Set(expenseCategoryOptions.map((option) => option.value));

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && expenseCategorySet.has(value as ExpenseCategory);
}

export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  return expenseCategoryOptions.find((option) => option.value === category)?.label ?? "Other";
}

export function normalizeExpenseCurrency(value: string | null | undefined, fallback: InvoiceCurrency): InvoiceCurrency {
  return value === "EUR" ? "EUR" : fallback;
}
