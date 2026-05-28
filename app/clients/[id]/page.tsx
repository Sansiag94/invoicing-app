"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { buildAddressString } from "@/lib/address";
import { parsePostalAddress } from "@/lib/invoice";
import { isSupportedCountry } from "@/lib/countries";
import { DEFAULT_INVOICE_LANGUAGE, INVOICE_LANGUAGE_OPTIONS, getInvoiceLanguageLabel } from "@/lib/invoiceLanguage";
import { ClientDetails, PortfolioItemRecord, UnbilledWorkItemRecord } from "@/lib/types";
import { isValidEmail } from "@/lib/validation";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { ArrowLeft, Building2, FilePlus2, PencilLine, Plus, Trash2 } from "lucide-react";
import ServiceDescriptionInput from "@/components/invoices/ServiceDescriptionInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

function getTodayDateInputValue(baseDate = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWorkItemStatus(status: string): string {
  if (status === "added_to_draft") return "Added to draft";
  if (status === "invoiced") return "Invoiced";
  return "Unbilled";
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "work" | "invoices">("profile");
  const [workItems, setWorkItems] = useState<UnbilledWorkItemRecord[]>([]);
  const [selectedWorkItemIds, setSelectedWorkItemIds] = useState<string[]>([]);
  const [isSavingWorkItem, setIsSavingWorkItem] = useState(false);
  const [isSavingCatalogItem, setIsSavingCatalogItem] = useState(false);
  const [isCreatingInvoiceFromWork, setIsCreatingInvoiceFromWork] = useState(false);
  const [editingWorkItemId, setEditingWorkItemId] = useState<string | null>(null);
  const [workServiceDate, setWorkServiceDate] = useState(getTodayDateInputValue());
  const [workDescription, setWorkDescription] = useState("");
  const [workQuantity, setWorkQuantity] = useState("1");
  const [workUnitPrice, setWorkUnitPrice] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemRecord[]>([]);
  const [hasLoadedPortfolioItems, setHasLoadedPortfolioItems] = useState(false);
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState(DEFAULT_INVOICE_LANGUAGE);
  const [vatNumber, setVatNumber] = useState("");

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await authenticatedFetch(`/api/clients/${id}`);
        const clientData = (await response.json()) as ClientDetails | { error?: string };

        if (!response.ok || ("error" in clientData && clientData.error)) {
          throw new Error(("error" in clientData ? clientData.error : null) ?? "Failed to load client");
        }

        if (mounted) {
          const safeClient = (clientData as ClientDetails)?.id ? (clientData as ClientDetails) : null;
          setClient(safeClient);
          setWorkItems(safeClient?.unbilledWorkItems ?? []);
          setSelectedWorkItemIds([]);

          if (safeClient) {
            const parsedAddress = parsePostalAddress(safeClient.address ?? "", safeClient.country ?? "");
            setCompanyName(safeClient.companyName ?? "");
            setContactName(safeClient.contactName ?? "");
            setEmail(safeClient.email ?? "");
            setPhone(safeClient.phone ?? "");
            setStreet(safeClient.street ?? parsedAddress.street ?? "");
            setPostalCode(safeClient.postalCode ?? parsedAddress.postalCode ?? "");
            setCity(safeClient.city ?? parsedAddress.city ?? "");
            setCountry(safeClient.country ?? "");
            setLanguage(safeClient.language ?? DEFAULT_INVOICE_LANGUAGE);
            setVatNumber(safeClient.vatNumber ?? "");
          }
        }
      } catch (error) {
        console.error("Error fetching client:", error);
        if (mounted) {
          setClient(null);
          setLoadError("Unable to load this client.");
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
  }, [id]);

  useEffect(() => {
    if (activeTab !== "work" || hasLoadedPortfolioItems) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const response = await authenticatedFetch("/api/portfolio-items");
        const data = (await response.json()) as PortfolioItemRecord[] | { error?: string };

        if (!response.ok || !Array.isArray(data)) {
          throw new Error(("error" in data ? data.error : null) ?? "Unable to load saved services");
        }

        if (mounted) {
          setPortfolioItems(data);
          setHasLoadedPortfolioItems(true);
        }
      } catch (error) {
        console.error("Error loading saved services:", error);
        if (mounted) {
          setPortfolioItems([]);
          setHasLoadedPortfolioItems(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeTab, hasLoadedPortfolioItems]);

  async function handleUpdateClient(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id) {
      return;
    }

    if (!companyName.trim() && !contactName.trim()) {
      toast({
        title: "Missing client name",
        description: "Add either a company name or a contact name before saving.",
        variant: "error",
      });
      return;
    }

    if (!isValidEmail(email.trim())) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address for the client.",
        variant: "error",
      });
      return;
    }

    if (!isSupportedCountry(country)) {
      toast({
        title: "Invalid country",
        description: "Please select a valid country from the list.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          address: buildAddressString({ street, postalCode, city }),
          street,
          postalCode,
          city,
          country,
          language,
          vatNumber,
        }),
      });

      const result = (await response.json()) as ClientDetails & { error?: string };

      if (!response.ok) {
        toast({
          title: "Failed to update client",
          description: result?.error ?? "Failed to update client",
          variant: "error",
        });
        return;
      }

      setClient(result);
      setIsEditing(false);
      setSuccessMessage("Client updated successfully.");
    } catch (error) {
      console.error("Error updating client:", error);
      toast({
        title: "Failed to update client",
        description: "Failed to update client",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function resetEditValues() {
    if (!client) {
      return;
    }

    setCompanyName(client.companyName ?? "");
    setContactName(client.contactName ?? "");
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    const parsedAddress = parsePostalAddress(client.address ?? "", client.country ?? "");
    setStreet(client.street ?? parsedAddress.street ?? "");
    setPostalCode(client.postalCode ?? parsedAddress.postalCode ?? "");
    setCity(client.city ?? parsedAddress.city ?? "");
    setCountry(client.country ?? "");
    setLanguage(client.language ?? DEFAULT_INVOICE_LANGUAGE);
    setVatNumber(client.vatNumber ?? "");
  }

  async function handleDeleteClient() {
    if (!id || !client || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast({
          title: "Failed to delete client",
          description: result?.error ?? "Failed to delete client",
          variant: "error",
        });
        return;
      }

      setShowDeleteDialog(false);
      router.push("/clients");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Failed to delete client",
        description: "Failed to delete client",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function fetchWorkItems() {
    if (!id) return;

    const response = await authenticatedFetch(`/api/clients/${id}/work-items`);
    const data = (await response.json()) as UnbilledWorkItemRecord[] | { error?: string };

    if (!response.ok || !Array.isArray(data)) {
      throw new Error(("error" in data ? data.error : null) ?? "Unable to load unbilled work");
    }

    setWorkItems(data);
    setSelectedWorkItemIds((current) =>
      current.filter((selectedId) => data.some((item) => item.id === selectedId && item.status === "unbilled"))
    );
  }

  function resetWorkItemForm() {
    setEditingWorkItemId(null);
    setWorkServiceDate(getTodayDateInputValue());
    setWorkDescription("");
    setWorkQuantity("1");
    setWorkUnitPrice("");
    setWorkNotes("");
  }

  function editWorkItem(item: UnbilledWorkItemRecord) {
    setEditingWorkItemId(item.id);
    setWorkServiceDate(toDateInputValue(item.serviceDate));
    setWorkDescription(item.description);
    setWorkQuantity(String(item.quantity));
    setWorkUnitPrice(String(item.unitPrice));
    setWorkNotes(item.notes ?? "");
  }

  function applyPortfolioItemToWorkForm(item: PortfolioItemRecord) {
    setWorkDescription(item.description);
    setWorkQuantity("1");
    setWorkUnitPrice(String(item.unitPrice));
  }

  async function saveWorkServiceToCatalog() {
    const description = workDescription.trim();
    const unitPrice = parseNumber(workUnitPrice);

    if (!description) {
      toast({
        title: "Missing service",
        description: "Write a service or product before saving it to the catalog.",
        variant: "error",
      });
      return;
    }

    if (unitPrice < 0 || !Number.isFinite(unitPrice)) {
      toast({
        title: "Invalid unit price",
        description: "Add a valid unit price before saving this catalog item.",
        variant: "error",
      });
      return;
    }

    const alreadySaved = portfolioItems.some(
      (item) => item.description.trim().toLowerCase() === description.toLowerCase()
    );

    if (alreadySaved) {
      toast({
        title: "Already in catalog",
        description: "This service or product is already saved.",
        variant: "info",
      });
      return;
    }

    setIsSavingCatalogItem(true);

    try {
      const response = await authenticatedFetch("/api/portfolio-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: description,
          description,
          unitPrice,
          defaultQuantity: 1,
          taxRate: 0,
          active: true,
        }),
      });
      const result = (await response.json()) as PortfolioItemRecord | { error?: string };

      if (!response.ok || !("id" in result)) {
        throw new Error("error" in result ? result.error : "Unable to save catalog item");
      }

      setPortfolioItems((current) =>
        [result, ...current].sort(
          (left, right) => Number(right.active) - Number(left.active) || left.description.localeCompare(right.description)
        )
      );
      setHasLoadedPortfolioItems(true);
      toast({
        title: "Saved to catalog",
        description: "You can select it faster next time.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error saving catalog item:", error);
      toast({
        title: "Unable to add to catalog",
        description: error instanceof Error ? error.message : "The catalog item could not be saved.",
        variant: "error",
      });
    } finally {
      setIsSavingCatalogItem(false);
    }
  }

  async function saveWorkItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id || isSavingWorkItem) return;

    if (!workDescription.trim()) {
      toast({
        title: "Missing service",
        description: "Add the service or product before saving.",
        variant: "error",
      });
      return;
    }

    const quantity = parseNumber(workQuantity);
    const unitPrice = parseNumber(workUnitPrice);
    if (quantity <= 0 || unitPrice < 0) {
      toast({
        title: "Invalid amount",
        description: "Quantity must be above zero and unit price cannot be negative.",
        variant: "error",
      });
      return;
    }

    setIsSavingWorkItem(true);

    try {
      const response = await authenticatedFetch(
        editingWorkItemId
          ? `/api/clients/${id}/work-items/${editingWorkItemId}`
          : `/api/clients/${id}/work-items`,
        {
          method: editingWorkItemId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceDate: workServiceDate,
            description: workDescription,
            quantity,
            unitPrice,
            taxRate: 0,
            notes: workNotes,
          }),
        }
      );
      const result = (await response.json()) as UnbilledWorkItemRecord & { error?: string };

      if (!response.ok) {
        toast({
          title: "Unable to save work",
          description: result.error ?? "The work item could not be saved.",
          variant: "error",
        });
        return;
      }

      await fetchWorkItems();
      resetWorkItemForm();
      setSuccessMessage(editingWorkItemId ? "Work item updated." : "Work item saved.");
    } catch (error) {
      console.error("Error saving work item:", error);
      toast({
        title: "Unable to save work",
        description: "The work item could not be saved.",
        variant: "error",
      });
    } finally {
      setIsSavingWorkItem(false);
    }
  }

  async function deleteWorkItem(item: UnbilledWorkItemRecord) {
    if (!id || item.status !== "unbilled") return;

    try {
      const response = await authenticatedFetch(`/api/clients/${id}/work-items/${item.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast({
          title: "Unable to delete work",
          description: result.error ?? "The work item could not be deleted.",
          variant: "error",
        });
        return;
      }

      await fetchWorkItems();
      setSuccessMessage("Work item deleted.");
    } catch (error) {
      console.error("Error deleting work item:", error);
      toast({
        title: "Unable to delete work",
        description: "The work item could not be deleted.",
        variant: "error",
      });
    }
  }

  async function createInvoiceFromWorkItems() {
    if (!id || selectedWorkItemIds.length === 0 || isCreatingInvoiceFromWork) return;

    setIsCreatingInvoiceFromWork(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${id}/work-items/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedWorkItemIds }),
      });
      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !result.id) {
        toast({
          title: "Unable to create invoice",
          description: result.error ?? "The draft invoice could not be created.",
          variant: "error",
        });
        return;
      }

      router.push(`/invoices/${result.id}`);
    } catch (error) {
      console.error("Error creating invoice from work items:", error);
      toast({
        title: "Unable to create invoice",
        description: "The draft invoice could not be created.",
        variant: "error",
      });
    } finally {
      setIsCreatingInvoiceFromWork(false);
    }
  }

  function toggleSelectedWorkItem(itemId: string) {
    setSelectedWorkItemIds((current) =>
      current.includes(itemId)
        ? current.filter((selectedId) => selectedId !== itemId)
        : [...current, itemId]
    );
  }

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-600">Loading client details...</CardContent>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card className={loadError ? "border-red-200 bg-red-50/80 dark:border-red-900/70 dark:bg-red-950/35" : undefined}>
        <CardContent className={`pt-6 ${loadError ? "text-red-800 dark:text-red-100" : "text-slate-600"}`}>
          {loadError ?? "Client not found."}
        </CardContent>
      </Card>
    );
  }

  const displayName = client.companyName || client.contactName || client.email;
  const openInvoices = client.invoices.filter((invoice) => invoice.status !== "paid");
  const outstandingTotal = openInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const outstandingCurrency = openInvoices[0]?.currency ?? client.invoices[0]?.currency ?? "CHF";
  const unbilledItems = workItems.filter((item) => item.status === "unbilled");
  const selectedWorkItems = unbilledItems.filter((item) => selectedWorkItemIds.includes(item.id));
  const selectedWorkTotal = selectedWorkItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const unbilledTotal = unbilledItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const allUnbilledSelected =
    unbilledItems.length > 0 && unbilledItems.every((item) => selectedWorkItemIds.includes(item.id));

  function toggleAllUnbilledWorkItems() {
    setSelectedWorkItemIds(allUnbilledSelected ? [] : unbilledItems.map((item) => item.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
              Back to clients
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <p className="text-sm text-slate-500">Client profile and related invoices</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <Button
              onClick={() => {
                setActiveTab("profile");
                setIsEditing(true);
              }}
            >
              <PencilLine className="h-4 w-4" />
              Edit Client
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                resetEditValues();
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              Cancel Edit
            </Button>
          )}
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
            <Trash2 className="h-4 w-4" />
            Delete Client
          </Button>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {[
          { id: "profile", label: "Profile" },
          { id: "work", label: "Unbilled Work" },
          { id: "invoices", label: "Invoices" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-slate-950 text-slate-950"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Company Name</p>
              <p className="font-medium text-slate-900">{client.companyName || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Contact Name</p>
              <p className="font-medium text-slate-900">{client.contactName || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{client.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">{client.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Country</p>
              <p className="font-medium text-slate-900">{client.country}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Invoice Language</p>
              <p className="font-medium text-slate-900">{getInvoiceLanguageLabel(client.language)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Address</p>
              <p className="font-medium text-slate-900">
                {client.street || parsePostalAddress(client.address, client.country).street}
                <br />
                {(client.postalCode || parsePostalAddress(client.address, client.country).postalCode) +
                  " " +
                  (client.city || parsePostalAddress(client.address, client.country).city)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">VAT Number</p>
              <p className="font-medium text-slate-900">{client.vatNumber || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Invoices</p>
              <p className="text-2xl font-semibold text-slate-900">{client.invoices.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Open Invoices</p>
              <p className="text-2xl font-semibold text-slate-900">{openInvoices.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding</p>
              <p className="text-2xl font-semibold text-slate-900">
                {outstandingCurrency} {outstandingTotal.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
          </div>

          {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateClient} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  type="text"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <CountryCombobox
                  id="country"
                  value={country}
                  onChange={setCountry}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Invoice Language</Label>
                <Select id="language" value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
                  {INVOICE_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input id="street" type="text" value={street} onChange={(event) => setStreet(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" type="text" value={city} onChange={(event) => setCity(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  type="text"
                  value={vatNumber}
                  onChange={(event) => setVatNumber(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Client"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
          ) : null}
        </>
      ) : null}

      {activeTab === "work" ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Unbilled Work</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Save services as you complete them, then create one draft invoice when you are ready.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/catalog">Service Catalog</Link>
              </Button>
              <Button
                type="button"
                onClick={() => void createInvoiceFromWorkItems()}
                disabled={selectedWorkItemIds.length === 0 || isCreatingInvoiceFromWork}
                className="w-full sm:w-auto"
              >
                <FilePlus2 className="h-4 w-4" />
                {isCreatingInvoiceFromWork ? "Creating..." : "Create Draft Invoice"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[10rem_minmax(14rem,1fr)_7rem_8rem]">
              <form onSubmit={saveWorkItem} className="contents">
                <div className="space-y-2">
                  <Label htmlFor="workServiceDate">Date</Label>
                  <Input
                    id="workServiceDate"
                    type="date"
                    value={workServiceDate}
                    onChange={(event) => setWorkServiceDate(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor="workDescription">Service / product</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void saveWorkServiceToCatalog()}
                      disabled={isSavingCatalogItem || !workDescription.trim()}
                    >
                      <Plus className="h-4 w-4" />
                      {isSavingCatalogItem ? "Saving..." : "Save to catalog"}
                    </Button>
                  </div>
                  <ServiceDescriptionInput
                    id="workDescription"
                    value={workDescription}
                    portfolioItems={portfolioItems}
                    currency={outstandingCurrency}
                    onChange={setWorkDescription}
                    onSelect={applyPortfolioItemToWorkForm}
                    placeholder="Write service/product here"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workQuantity">Qty</Label>
                  <Input
                    id="workQuantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={workQuantity}
                    onChange={(event) => setWorkQuantity(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workUnitPrice">Unit price</Label>
                  <Input
                    id="workUnitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={workUnitPrice}
                    onChange={(event) => setWorkUnitPrice(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="workNotes">Note</Label>
                  <Input
                    id="workNotes"
                    value={workNotes}
                    onChange={(event) => setWorkNotes(event.target.value)}
                    placeholder="Optional internal note"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" disabled={isSavingWorkItem} className="w-full">
                    <Plus className="h-4 w-4" />
                    {isSavingWorkItem ? "Saving..." : editingWorkItemId ? "Save" : "Add"}
                  </Button>
                  {editingWorkItemId ? (
                    <Button type="button" variant="outline" onClick={resetWorkItemForm}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllUnbilledWorkItems}
                  disabled={unbilledItems.length === 0}
                >
                  {allUnbilledSelected ? "Clear selection" : "Select all"}
                </Button>
                <span>
                  {unbilledItems.length} unbilled item{unbilledItems.length === 1 ? "" : "s"} - CHF {unbilledTotal.toFixed(2)}
                </span>
              </div>
              <div className="font-medium text-slate-900">
                Selected: CHF {selectedWorkTotal.toFixed(2)}
              </div>
            </div>

            {workItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                <p className="text-base font-medium text-slate-900">No unbilled work saved yet</p>
                <p className="mt-1 text-sm text-slate-500">Add a service above when you finish work for this client.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          {unbilledItems.length > 0 ? (
                            <input
                              type="checkbox"
                              checked={allUnbilledSelected}
                              onChange={toggleAllUnbilledWorkItems}
                              aria-label={allUnbilledSelected ? "Clear unbilled work selection" : "Select all unbilled work"}
                            />
                          ) : null}
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.status === "unbilled" ? (
                              <input
                                type="checkbox"
                                checked={selectedWorkItemIds.includes(item.id)}
                                onChange={() => toggleSelectedWorkItem(item.id)}
                                aria-label={`Select ${item.description}`}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>{formatDate(item.serviceDate)}</TableCell>
                          <TableCell>
                            <p className="font-medium text-slate-900">{item.description}</p>
                            {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
                            {item.invoice ? (
                              <Link href={`/invoices/${item.invoice.id}`} className="text-xs font-medium text-slate-700 underline">
                                {item.invoice.invoiceNumber}
                              </Link>
                            ) : null}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>CHF {item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>CHF {(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === "unbilled" ? "warning" : "default"}>
                              {formatWorkItemStatus(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.status === "unbilled" ? (
                              <div className="flex gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => editWorkItem(item)}>
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                  onClick={() => void deleteWorkItem(item)}
                                >
                                  Delete
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {workItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">{formatDate(item.serviceDate)}</p>
                          <p className="font-semibold text-slate-900">{item.description}</p>
                        </div>
                        <Badge variant={item.status === "unbilled" ? "warning" : "default"}>
                          {formatWorkItemStatus(item.status)}
                        </Badge>
                      </div>
                      {item.notes ? <p className="mt-2 text-sm text-slate-500">{item.notes}</p> : null}
                      <p className="mt-3 text-sm text-slate-700">
                        {item.quantity} x CHF {item.unitPrice.toFixed(2)}
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        CHF {(item.quantity * item.unitPrice).toFixed(2)}
                      </p>
                      {item.invoice ? (
                        <Link href={`/invoices/${item.invoice.id}`} className="mt-2 inline-block text-sm font-medium text-slate-700 underline">
                          {item.invoice.invoiceNumber}
                        </Link>
                      ) : null}
                      {item.status === "unbilled" ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={selectedWorkItemIds.includes(item.id) ? "default" : "outline"}
                            onClick={() => toggleSelectedWorkItem(item.id)}
                          >
                            {selectedWorkItemIds.includes(item.id) ? "Selected" : "Select"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => editWorkItem(item)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={() => void deleteWorkItem(item)}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "invoices" ? (
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link href={`/invoices?clientId=${client.id}`}>Create Invoice</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {client.invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <Building2 className="h-6 w-6 text-slate-400" />
              <p className="text-base font-medium text-slate-900">No invoices for this client yet</p>
              <p className="text-sm text-slate-600">Create one directly with this client preselected.</p>
              <Button asChild size="sm">
                <Link href={`/invoices?clientId=${client.id}`}>Create Invoice</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-slate-50"
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(`/invoices/${invoice.id}`);
                          }
                        }}
                      >
                        <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.currency} {invoice.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {client.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                    </div>
                    <p className="mt-3 text-base font-semibold text-slate-900">
                      {invoice.currency} {invoice.totalAmount.toFixed(2)}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      ) : null}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Delete <strong>{displayName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
