"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import type { InvoiceCurrency, PortfolioItemRecord } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type StatusFilter = "active" | "all" | "archived";

type PortfolioFormState = {
  description: string;
  unitPrice: string;
  active: boolean;
};

const emptyForm: PortfolioFormState = {
  description: "",
  unitPrice: "",
  active: true,
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function formatCurrency(amount: number, currency: InvoiceCurrency): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function getPortfolioPayload(form: PortfolioFormState) {
  const description = form.description.trim();
  const unitPrice = Number(form.unitPrice);

  if (!description || !Number.isFinite(unitPrice) || unitPrice < 0) {
    return null;
  }

  return {
    name: description,
    description,
    unitPrice,
    defaultQuantity: 1,
    taxRate: 0,
    active: form.active,
  };
}

export default function CatalogPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<PortfolioItemRecord[]>([]);
  const [currency, setCurrency] = useState<InvoiceCurrency>("CHF");
  const [form, setForm] = useState<PortfolioFormState>(emptyForm);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeItems = useMemo(() => items.filter((item) => item.active), [items]);
  const archivedItems = useMemo(() => items.filter((item) => !item.active), [items]);
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "active" && !item.active) return false;
      if (statusFilter === "archived" && item.active) return false;

      if (!normalizedSearchQuery) return true;

      return `${item.description} ${item.name}`.toLowerCase().includes(normalizedSearchQuery);
    });
  }, [items, normalizedSearchQuery, statusFilter]);

  async function loadCatalog() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [portfolioResponse, businessResponse] = await Promise.all([
        authenticatedFetch("/api/portfolio-items"),
        authenticatedFetch("/api/business"),
      ]);

      if (!portfolioResponse.ok) {
        throw new Error("Unable to load saved services.");
      }

      const portfolioPayload = (await portfolioResponse.json()) as PortfolioItemRecord[] | { error?: string };
      const businessPayload = businessResponse.ok
        ? ((await businessResponse.json()) as { currency?: InvoiceCurrency })
        : null;

      setItems(Array.isArray(portfolioPayload) ? portfolioPayload : []);
      setCurrency(businessPayload?.currency === "EUR" ? "EUR" : "CHF");
    } catch (error) {
      console.error("Unable to load catalog:", error);
      setLoadError("Unable to load the catalog right now.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingItemId(null);
  }

  function startEditing(item: PortfolioItemRecord) {
    setEditingItemId(item.id);
    setForm({
      description: item.description,
      unitPrice: String(item.unitPrice),
      active: item.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = getPortfolioPayload(form);
    if (!payload) {
      toast({
        title: "Check the service details",
        description: "Add a service or product description and a valid unit price.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = editingItemId ? `/api/portfolio-items/${editingItemId}` : "/api/portfolio-items";
      const response = await authenticatedFetch(endpoint, {
        method: editingItemId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as PortfolioItemRecord | { error?: string };

      if (!response.ok || !("id" in result)) {
        throw new Error("error" in result ? result.error : "Unable to save service.");
      }

      setItems((current) => {
        if (editingItemId) {
          return current.map((item) => (item.id === result.id ? result : item));
        }

        return [result, ...current].sort((a, b) => Number(b.active) - Number(a.active) || a.description.localeCompare(b.description));
      });
      resetForm();
      toast({
        title: editingItemId ? "Catalog item updated" : "Catalog item added",
        description: "It is ready to use in invoices and unbilled work.",
        variant: "success",
      });
    } catch (error) {
      console.error("Unable to save catalog item:", error);
      toast({
        title: "Unable to save catalog item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function updateItemActiveState(item: PortfolioItemRecord, active: boolean) {
    setMutatingItemId(item.id);

    try {
      const response = await authenticatedFetch(`/api/portfolio-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.description,
          description: item.description,
          unitPrice: item.unitPrice,
          defaultQuantity: 1,
          taxRate: 0,
          active,
        }),
      });
      const result = (await response.json()) as PortfolioItemRecord | { error?: string };

      if (!response.ok || !("id" in result)) {
        throw new Error("error" in result ? result.error : "Unable to update item.");
      }

      setItems((current) => current.map((currentItem) => (currentItem.id === result.id ? result : currentItem)));
      toast({
        title: active ? "Catalog item activated" : "Catalog item archived",
        description: active ? "It will appear in service suggestions again." : "It stays saved, but hidden from suggestions.",
        variant: "success",
      });
    } catch (error) {
      console.error("Unable to update catalog item:", error);
      toast({
        title: "Unable to update catalog item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setMutatingItemId(null);
    }
  }

  async function deleteItem(item: PortfolioItemRecord) {
    const confirmed = window.confirm(`Delete "${item.description}" from the catalog?`);
    if (!confirmed) {
      return;
    }

    setMutatingItemId(item.id);

    try {
      const response = await authenticatedFetch(`/api/portfolio-items/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Unable to delete item.");
      }

      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      if (editingItemId === item.id) {
        resetForm();
      }
      toast({
        title: "Catalog item deleted",
        description: "The item was removed from saved services and products.",
        variant: "success",
      });
    } catch (error) {
      console.error("Unable to delete catalog item:", error);
      toast({
        title: "Unable to delete catalog item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setMutatingItemId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Services
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Service Catalog</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Save reusable services and products once, then pick them quickly in invoices and unbilled work.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">All</p>
            <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{items.length}</p>
          </div>
          <div className="border-x border-slate-200 px-3 py-2 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Active</p>
            <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{activeItems.length}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Archived</p>
            <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{archivedItems.length}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingItemId ? "Edit catalog item" : "Add service or product"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveItem} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_auto_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="catalog-description">Invoice description</Label>
              <Input
                id="catalog-description"
                value={form.description}
                placeholder="Write service/product here"
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-unit-price">Unit price</Label>
              <Input
                id="catalog-unit-price"
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                placeholder="0.00"
                onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))}
              />
            </div>
            <label className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Active
            </label>
            <div className="flex flex-wrap gap-2">
              {editingItemId ? (
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={isSaving}>
                <Plus className="h-4 w-4" />
                {isSaving ? "Saving..." : editingItemId ? "Save item" : "Add item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Saved services and products</CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Active items appear in the description picker across the app.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                placeholder="Search service catalog"
                className="w-full pl-9 sm:w-64"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {(["active", "all", "archived"] as StatusFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                    statusFilter === filter
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Loading catalog...
            </div>
          ) : loadError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {loadError}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {items.length === 0 ? "No services or products saved yet." : "No services or products match this view."}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 bg-white px-4 py-4 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {item.description}
                      </p>
                      <Badge variant={item.active ? "success" : "default"}>
                        {item.active ? "Active" : "Archived"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Suggested as a line item description
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(item.unitPrice, currency)}
                  </p>
                  <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(item)}
                      disabled={mutatingItemId === item.id}
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemActiveState(item, !item.active)}
                      disabled={mutatingItemId === item.id}
                    >
                      {item.active ? <Archive className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      {item.active ? "Archive" : "Activate"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/30"
                      onClick={() => deleteItem(item)}
                      disabled={mutatingItemId === item.id}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
