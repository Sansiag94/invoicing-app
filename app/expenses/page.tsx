"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LinkIcon,
  PencilLine,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { ExpenseRecord, ExpensesPageData, InvoiceCurrency } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { expenseCategoryOptions, getExpenseCategoryLabel } from "@/lib/expenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import ExpenseFormFields, { ExpenseFormState } from "@/components/expenses/ExpenseFormFields";

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

function buildEmptyExpenseForm(currency: InvoiceCurrency): ExpenseFormState {
  return {
    vendor: "",
    description: "",
    category: "software",
    amount: "",
    currency,
    expenseDate: getTodayDateInputValue(),
    notes: "",
    isRecurring: false,
    taxDeductible: true,
    vatReclaimable: false,
    vatAmount: "",
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
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [createReceiptFile, setCreateReceiptFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const createExpenseRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

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
    setCreateReceiptFile(null);
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
      isRecurring: expense.isRecurring,
      taxDeductible: expense.taxDeductible,
      vatReclaimable: expense.vatReclaimable,
      vatAmount: expense.vatAmount === null ? "" : String(expense.vatAmount),
    });
  };

  const uploadReceiptFile = async (
    expenseId: string,
    file: File | null,
    options?: { showSuccessToast?: boolean }
  ) => {
    if (!file) return false;

    setUploadingReceiptId(expenseId);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await authenticatedFetch(`/api/expenses/${expenseId}/receipt`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { receiptUrl?: string; error?: string };

      if (!response.ok || !result.receiptUrl) {
        toast({
          title: "Receipt upload failed",
          description: result.error ?? "Unable to upload receipt",
          variant: "error",
        });
        return false;
      }

      setEditingExpense((current) =>
        current && current.id === expenseId
          ? { ...current, receiptUrl: result.receiptUrl ?? current.receiptUrl }
          : current
      );

      if (options?.showSuccessToast ?? true) {
        toast({
          title: "Receipt uploaded",
          description: "The receipt is now attached to this expense.",
          variant: "success",
        });
      }

      return true;
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast({
        title: "Receipt upload failed",
        description: "Unable to upload receipt",
        variant: "error",
      });
      return false;
    } finally {
      setUploadingReceiptId(null);
    }
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
          isRecurring: formState.isRecurring,
          taxDeductible: formState.taxDeductible,
          vatReclaimable: formState.vatReclaimable,
          vatAmount: formState.vatAmount ? Number(formState.vatAmount) : null,
        }),
      });

      const result = (await response.json()) as ExpenseRecord & { error?: string };
      if (!response.ok) {
        toast({
          title: "Unable to add expense",
          description: result.error ?? "Failed to create expense",
          variant: "error",
        });
        return;
      }

      let receiptUploaded = false;
      if (createReceiptFile) {
        receiptUploaded = await uploadReceiptFile(result.id, createReceiptFile, {
          showSuccessToast: false,
        });
      }

      await fetchExpenses();
      resetCreateForm(currency);
      setIsCreateFormOpen(false);
      setSuccessMessage(receiptUploaded ? "Expense added with receipt attached." : "Expense added successfully.");
    } catch (error) {
      console.error("Error creating expense:", error);
      toast({
        title: "Unable to add expense",
        description: "Failed to create expense",
        variant: "error",
      });
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
          isRecurring: formState.isRecurring,
          taxDeductible: formState.taxDeductible,
          vatReclaimable: formState.vatReclaimable,
          vatAmount: formState.vatAmount ? Number(formState.vatAmount) : null,
        }),
      });

      const result = (await response.json()) as ExpenseRecord & { error?: string };
      if (!response.ok) {
        toast({
          title: "Unable to save expense",
          description: result.error ?? "Failed to update expense",
          variant: "error",
        });
        return;
      }

      await fetchExpenses();
      setEditingExpense(null);
      resetCreateForm(currency);
      setSuccessMessage("Expense updated successfully.");
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "Unable to save expense",
        description: "Failed to update expense",
        variant: "error",
      });
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
        toast({
          title: "Unable to delete expense",
          description: result.error ?? "Failed to delete expense",
          variant: "error",
        });
        return;
      }

      await fetchExpenses();
      setDeleteTarget(null);
      setSuccessMessage("Expense deleted.");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Unable to delete expense",
        description: "Failed to delete expense",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadReceipt = async (expenseId: string, file: File | null) => {
    const didUpload = await uploadReceiptFile(expenseId, file);
    if (didUpload) {
      await fetchExpenses();
    }
  };

  if (isLoading) {
    return <div>Loading expenses...</div>;
  }

  if (!pageData) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-100">
        Unable to load expenses.
      </div>
    );
  }

  const overview = pageData.overview;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expenses</h1>
        <p className="text-sm text-slate-500">Track business costs, keep receipts, and understand net profitability.</p>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExpenseStatCard
          label="This month"
          value={`${currency} ${formatMoney(overview.thisMonthTotal)}`}
          helper="Costs booked in the current month"
        />
        <ExpenseStatCard
          label="Recurring monthly"
          value={`${currency} ${formatMoney(overview.recurringMonthlyTotal)}`}
          helper="Recurring spend currently on the books"
        />
        <ExpenseStatCard
          label="Tax deductible"
          value={`${currency} ${formatMoney(overview.deductibleTotal)}`}
          helper="Booked costs marked as deductible"
        />
        <ExpenseStatCard
          label="Reclaimable VAT"
          value={`${currency} ${formatMoney(overview.reclaimableVatTotal)}`}
          helper="VAT currently reclaimable from booked expenses"
        />
      </div>

      <Card ref={createExpenseRef}>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Add Expense</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateFormOpen((current) => !current)}
          >
            {isCreateFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isCreateFormOpen ? "Close" : "Add New"}
          </Button>
        </CardHeader>
        {isCreateFormOpen ? (
          <CardContent>
            <form onSubmit={handleCreateExpense} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ExpenseFormFields idPrefix="create" formState={formState} onChange={setFormState} />
              <div className="md:col-span-2 xl:col-span-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Receipt photo or file</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Optional. On mobile devices you can take a photo directly, or upload an image/PDF later.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="createExpenseReceipt">Receipt file</Label>
                      <Input
                        id="createExpenseReceipt"
                        type="file"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={(event) => setCreateReceiptFile(event.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-slate-500">
                        Accepted formats: photo or PDF receipt.
                      </p>
                    </div>
                    {createReceiptFile ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        {createReceiptFile.name}
                      </div>
                    ) : null}
                  </div>
                </div>
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
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Showing {filteredExpenses.length} expense{filteredExpenses.length === 1 ? "" : "s"} totaling{" "}
                <span className="font-semibold text-slate-900">
                  {currency} {formatMoney(filteredTotal)}
                </span>
                .
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Flags</TableHead>
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
                        <TableCell className="text-xs text-slate-600">
                          <div className="flex flex-wrap gap-2">
                            {expense.isRecurring ? <span className="rounded-full bg-slate-100 px-2 py-1">Recurring</span> : null}
                            {expense.taxDeductible ? <span className="rounded-full bg-slate-100 px-2 py-1">Deductible</span> : null}
                            {expense.vatReclaimable ? (
                              <span className="rounded-full bg-slate-100 px-2 py-1">
                                VAT {expense.currency} {formatMoney(expense.vatAmount ?? 0)}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {expense.receiptUrl ? (
                              <Button asChild size="sm" variant="outline">
                                <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                                  <LinkIcon className="h-4 w-4" />
                                  Receipt
                                </a>
                              </Button>
                            ) : null}
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
                        {expense.receiptUrl ? (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm text-slate-700 underline-offset-2 hover:underline"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            Receipt
                          </a>
                        ) : null}
                      </div>
                      <p className="font-semibold text-slate-900">
                        {expense.currency} {formatMoney(expense.amount)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      {expense.isRecurring ? <span className="rounded-full bg-slate-100 px-2 py-1">Recurring</span> : null}
                      {expense.taxDeductible ? <span className="rounded-full bg-slate-100 px-2 py-1">Deductible</span> : null}
                      {expense.vatReclaimable ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          VAT {expense.currency} {formatMoney(expense.vatAmount ?? 0)}
                        </span>
                      ) : null}
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details so your reporting stays accurate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveExpenseEdit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ExpenseFormFields idPrefix="edit" formState={formState} onChange={setFormState} />
            <div className="md:col-span-2 xl:col-span-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">Receipt</p>
                <p className="mt-1 text-sm text-slate-500">
                  Attach an image or PDF so the expense has audit support.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    asChild
                    variant="outline"
                    disabled={uploadingReceiptId === editingExpense?.id}
                  >
                    <label>
                      <Upload className="h-4 w-4" />
                      {uploadingReceiptId === editingExpense?.id ? "Uploading..." : "Upload Receipt"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          event.target.value = "";
                          if (editingExpense) {
                            void handleUploadReceipt(editingExpense.id, file);
                          }
                        }}
                      />
                    </label>
                  </Button>
                  {editingExpense?.receiptUrl ? (
                    <Button asChild variant="outline">
                      <a href={editingExpense.receiptUrl} target="_blank" rel="noreferrer">
                        <LinkIcon className="h-4 w-4" />
                        View Receipt
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <DialogFooter className="md:col-span-2 xl:col-span-3">
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
