"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, PencilLine, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { ExpenseRecord, ExpensesPageData, InvoiceCurrency } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { expenseCategoryOptions, getExpenseCategoryLabel } from "@/lib/expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type ExpenseFormState = {
  vendor: string;
  description: string;
  category: string;
  amount: string;
  currency: InvoiceCurrency;
  expenseDate: string;
  notes: string;
};

function buildEmptyExpenseForm(currency: InvoiceCurrency): ExpenseFormState {
  return {
    vendor: "",
    description: "",
    category: "software",
    amount: "",
    currency,
    expenseDate: getTodayDateInputValue(),
    notes: "",
  };
}

function ExpenseStatCard(props: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{props.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900">{props.value}</p>
        <p className="mt-2 text-sm text-slate-600">{props.helper}</p>
      </CardContent>
    </Card>
  );
}

export default function ExpensesPage() {
  const [pageData, setPageData] = useState<ExpensesPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const createExpenseRef = useRef<HTMLDivElement | null>(null);

  const currency = pageData?.overview.currency ?? "CHF";
  const [formState, setFormState] = useState<ExpenseFormState>(buildEmptyExpenseForm("CHF"));

  async function fetchExpenses() {
    const response = await authenticatedFetch("/api/expenses");
    const data = (await response.json()) as ExpensesPageData | { error?: string };

    if (!response.ok || ("error" in data && data.error)) {
      throw new Error(("error" in data ? data.error : null) ?? "Failed to load expenses");
    }

    setPageData(data as ExpensesPageData);
    setFormState((current) => ({
      ...current,
      currency: (data as ExpensesPageData).overview.currency,
    }));
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await fetchExpenses();
      } catch (error) {
        console.error("Error loading expenses:", error);
        if (mounted) {
          setPageData(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const filteredExpenses = useMemo(() => {
    const expenses = pageData?.expenses ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return expenses.filter((expense) => {
      const categoryMatches = categoryFilter === "all" || expense.category === categoryFilter;
      if (!categoryMatches) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        expense.vendor ?? "",
        expense.description,
        expense.notes ?? "",
        getExpenseCategoryLabel(expense.category),
      ].join(" ");

      return searchable.toLowerCase().includes(normalizedQuery);
    });
  }, [categoryFilter, pageData?.expenses, searchQuery]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );

  const resetCreateForm = (nextCurrency: InvoiceCurrency) => {
    setFormState(buildEmptyExpenseForm(nextCurrency));
  };

  const openEditExpense = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setFormState({
      vendor: expense.vendor ?? "",
      description: expense.description,
      category: expense.category,
      amount: String(expense.amount),
      currency: expense.currency,
      expenseDate: expense.expenseDate.slice(0, 10),
      notes: expense.notes ?? "",
    });
  };

  const handleCreateExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);

    try {
      const response = await authenticatedFetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: formState.vendor,
          description: formState.description,
          category: formState.category,
          amount: Number(formState.amount),
          currency: formState.currency,
          expenseDate: formState.expenseDate,
          notes: formState.notes,
        }),
      });

      const result = (await response.json()) as ExpenseRecord & { error?: string };
      if (!response.ok) {
        alert(result.error ?? "Failed to create expense");
        return;
      }

      await fetchExpenses();
      resetCreateForm(currency);
      setIsCreateFormOpen(false);
      setSuccessMessage("Expense added successfully.");
    } catch (error) {
      console.error("Error creating expense:", error);
      alert("Failed to create expense");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveExpenseEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingExpense) return;

    setIsSavingEdit(true);

    try {
      const response = await authenticatedFetch(`/api/expenses/${editingExpense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: formState.vendor,
          description: formState.description,
          category: formState.category,
          amount: Number(formState.amount),
          currency: formState.currency,
          expenseDate: formState.expenseDate,
          notes: formState.notes,
        }),
      });

      const result = (await response.json()) as ExpenseRecord & { error?: string };
      if (!response.ok) {
        alert(result.error ?? "Failed to update expense");
        return;
      }

      await fetchExpenses();
      setEditingExpense(null);
      resetCreateForm(currency);
      setSuccessMessage("Expense updated successfully.");
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("Failed to update expense");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        alert(result.error ?? "Failed to delete expense");
        return;
      }

      await fetchExpenses();
      setDeleteTarget(null);
      setSuccessMessage("Expense deleted.");
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div>Loading expenses...</div>;
  }

  if (!pageData) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4">Unable to load expenses.</div>;
  }

  const overview = pageData.overview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expenses</h1>
        <p className="text-sm text-slate-500">Track business costs and understand net profitability.</p>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExpenseStatCard
          label="This month"
          value={`${currency} ${formatMoney(overview?.thisMonthTotal ?? 0)}`}
          helper="Costs booked in the current month"
        />
        <ExpenseStatCard
          label="Last 30 days"
          value={`${currency} ${formatMoney(overview?.last30DaysTotal ?? 0)}`}
          helper="Useful for recent spend velocity"
        />
        <ExpenseStatCard
          label="Year to date"
          value={`${currency} ${formatMoney(overview?.yearToDateTotal ?? 0)}`}
          helper="Business spend since January 1"
        />
        <ExpenseStatCard
          label="Filtered total"
          value={`${currency} ${formatMoney(filteredTotal)}`}
          helper={categoryFilter === "all" ? "Current filtered list" : `Filtered by ${categoryFilter}`}
        />
      </div>

      <Card ref={createExpenseRef}>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Add Expense</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateFormOpen((current) => !current)}>
            {isCreateFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isCreateFormOpen ? "Close" : "Add New"}
          </Button>
        </CardHeader>
        {isCreateFormOpen ? (
          <CardContent>
            <form onSubmit={handleCreateExpense} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input id="vendor" value={formState.vendor} onChange={(event) => setFormState((current) => ({ ...current, vendor: event.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={formState.description} onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select id="category" value={formState.category} onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}>
                  {expenseCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" min="0.01" step="0.01" value={formState.amount} onChange={(event) => setFormState((current) => ({ ...current, amount: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select id="currency" value={formState.currency} onChange={(event) => setFormState((current) => ({ ...current, currency: event.target.value as InvoiceCurrency }))}>
                  <option value="CHF">CHF</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Expense Date</Label>
                <Input id="expenseDate" type="date" value={formState.expenseDate} onChange={(event) => setFormState((current) => ({ ...current, expenseDate: event.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={3} value={formState.notes} onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional details for bookkeeping" />
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <Button type="submit" disabled={isCreating}>
                  <Plus className="h-4 w-4" />
                  {isCreating ? "Saving..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Expense Table</CardTitle>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search vendor or description"
                className="pl-9 md:w-64"
              />
            </div>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {expenseCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <ReceiptText className="h-6 w-6 text-slate-400" />
              <p className="text-base font-medium text-slate-900">
                {pageData.expenses.length ? "No expenses match your filters" : "No expenses yet"}
              </p>
              <p className="text-sm text-slate-600">
                {pageData.expenses.length
                  ? "Try a different search term or category."
                  : "Add your first recurring software bill, travel cost, or other business expense."}
              </p>
              {!pageData.expenses.length ? (
                <Button
                  onClick={() => {
                    setIsCreateFormOpen(true);
                    createExpenseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Add Expense
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-slate-900">{expense.description}</TableCell>
                        <TableCell>{getExpenseCategoryLabel(expense.category)}</TableCell>
                        <TableCell>{expense.vendor || "-"}</TableCell>
                        <TableCell>
                          {expense.currency} {formatMoney(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditExpense(expense)}>
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                              onClick={() => setDeleteTarget(expense)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{expense.description}</p>
                        <p className="text-sm text-slate-600">{new Date(expense.expenseDate).toLocaleDateString()}</p>
                        <p className="text-sm text-slate-600">{getExpenseCategoryLabel(expense.category)}</p>
                        {expense.vendor ? <p className="text-sm text-slate-600">{expense.vendor}</p> : null}
                      </div>
                      <p className="font-semibold text-slate-900">
                        {expense.currency} {formatMoney(expense.amount)}
                      </p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditExpense(expense)}>
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => setDeleteTarget(expense)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingExpense)} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details so your reporting stays accurate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveExpenseEdit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editVendor">Vendor</Label>
              <Input id="editVendor" value={formState.vendor} onChange={(event) => setFormState((current) => ({ ...current, vendor: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Input id="editDescription" value={formState.description} onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCategory">Category</Label>
              <Select id="editCategory" value={formState.category} onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}>
                {expenseCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAmount">Amount</Label>
              <Input id="editAmount" type="number" min="0.01" step="0.01" value={formState.amount} onChange={(event) => setFormState((current) => ({ ...current, amount: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCurrency">Currency</Label>
              <Select id="editCurrency" value={formState.currency} onChange={(event) => setFormState((current) => ({ ...current, currency: event.target.value as InvoiceCurrency }))}>
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editExpenseDate">Expense Date</Label>
              <Input id="editExpenseDate" type="date" value={formState.expenseDate} onChange={(event) => setFormState((current) => ({ ...current, expenseDate: event.target.value }))} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea id="editNotes" rows={4} value={formState.notes} onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditingExpense(null)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingEdit}>
                {isSavingEdit ? "Saving..." : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.description}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
