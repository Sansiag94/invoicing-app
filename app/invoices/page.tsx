"use client";

import Link from "next/link";
import { FocusEvent, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BellRing, CheckCircle2, ChevronDown, ChevronUp, Copy, FilePenLine, MoreHorizontal, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { BusinessSettingsData, ClientSummary, InvoiceSummary, LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { getInvoiceSenderName } from "@/lib/business";
import { getDefaultDueDate, getTodayDateInputValue } from "@/lib/invoiceDates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import InvoiceCreateSidebar from "@/components/invoices/InvoiceCreateSidebar";
import { useToast } from "@/components/ui/toast";

type InvoiceRow = InvoiceSummary & {
  client?: {
    companyName: string | null;
    contactName: string | null;
    email: string;
  };
};

type ConfirmDialogState = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmVariant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  onConfirm: () => void;
};

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const MIN_QUANTITY = 0.01;

function handleNumberInputFocus(event: FocusEvent<HTMLInputElement>) {
  event.target.select();
}

function getInvoiceClientName(invoice: InvoiceRow): string {
  return invoice.client?.companyName || invoice.client?.contactName || invoice.client?.email || "-";
}

function getClientFirstName(client: ClientSummary | null): string {
  if (!client) return "client_first_name";

  const fallbackFromEmail = client.email.split("@")[0]?.trim();
  const rawName = (client.contactName || client.companyName || fallbackFromEmail || "").trim();
  if (!rawName) return "client_first_name";

  return rawName.split(/\s+/)[0] || "client_first_name";
}

function buildInvoiceNotesTemplate(clientFirstName: string, senderName: string): string {
  return `Dear ${clientFirstName},

Please find here the details of your invoice.

Kind regards,
${senderName}`;
}

function InvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedClientId = (searchParams.get("clientId") ?? "").trim();
  const defaultIssueDate = getTodayDateInputValue();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceSenderName, setInvoiceSenderName] = useState("User_name");
  const [businessCurrency, setBusinessCurrency] = useState<"CHF" | "EUR">("CHF");
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);
  const [issueDate, setIssueDate] = useState(defaultIssueDate);
  const [dueDate, setDueDate] = useState(getDefaultDueDate(defaultIssueDate));
  const [clientId, setClientId] = useState(requestedClientId);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState(buildInvoiceNotesTemplate("client_first_name", "User_name"));
  const [notesManuallyEdited, setNotesManuallyEdited] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSendingId, setIsSendingId] = useState<string | null>(null);
  const [isSendingReminderId, setIsSendingReminderId] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [bulkActionLabel, setBulkActionLabel] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [openActionsInvoiceId, setOpenActionsInvoiceId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const createInvoiceRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();
  const statusFilter = (searchParams.get("status") ?? "").trim().toLowerCase();

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients]
  );
  const activeFilterLabel = useMemo(() => {
    if (!statusFilter) return null;
    if (statusFilter === "paid") return "Paid";
    if (statusFilter === "overdue") return "Overdue";
    if (statusFilter === "draft") return "Draft";
    if (statusFilter === "sent") return "Sent";
    if (statusFilter === "open") return "Open";
    if (statusFilter === "unpaid") return "Unpaid";
    if (statusFilter === "needs-action") return "Needs Action";
    if (statusFilter === "awaiting-payment") return "Awaiting Payment";
    if (statusFilter === "paid-recently") return "Paid Recently";
    return statusFilter;
  }, [statusFilter]);

  const filteredInvoices = useMemo(() => {
    const paidRecentlyCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const statusMatches = (status: string) => {
      if (!statusFilter) return true;
      if (statusFilter === "paid") return status === "paid";
      if (statusFilter === "overdue") return status === "overdue";
      if (statusFilter === "draft") return status === "draft";
      if (statusFilter === "sent") return status === "sent";
      if (statusFilter === "open") return status === "draft" || status === "sent";
      if (statusFilter === "unpaid") return status !== "paid";
      if (statusFilter === "needs-action") return status === "draft" || status === "overdue";
      if (statusFilter === "awaiting-payment") return status === "sent" || status === "overdue";
      return true;
    };

    const baseInvoices = invoices.filter((invoice) => {
      if (statusFilter === "paid-recently") {
        return invoice.status === "paid" && new Date(invoice.updatedAt).getTime() >= paidRecentlyCutoff;
      }

      return statusMatches(invoice.status);
    });
    if (!searchQuery) return baseInvoices;

    return baseInvoices
      .filter((invoice) => {
        const searchable = [
          invoice.invoiceNumber,
          invoice.subject ?? "",
          invoice.status,
          getInvoiceClientName(invoice),
          invoice.currency,
        ].join(" ");

        return searchable.toLowerCase().includes(searchQuery);
      })
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
  }, [invoices, searchQuery, statusFilter]);
  const selectedInvoices = useMemo(
    () => filteredInvoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id)),
    [filteredInvoices, selectedInvoiceIds]
  );
  const allVisibleSelected =
    filteredInvoices.length > 0 && filteredInvoices.every((invoice) => selectedInvoiceIds.includes(invoice.id));

  async function fetchInvoices() {
    const res = await authenticatedFetch("/api/invoices");
    const data = (await res.json()) as InvoiceRow[];
    setInvoices(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    setSelectedInvoiceIds((current) => current.filter((id) => invoices.some((invoice) => invoice.id === id)));
  }, [invoices]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [clientsResponse, invoicesResponse, businessResponse] = await Promise.all([
          authenticatedFetch("/api/clients"),
          authenticatedFetch("/api/invoices"),
          authenticatedFetch("/api/business"),
        ]);

        const loadedClients = (await clientsResponse.json()) as ClientSummary[];
        const loadedInvoices = (await invoicesResponse.json()) as InvoiceRow[];
        const loadedBusiness = (await businessResponse.json()) as BusinessSettingsData;

        if (mounted) {
          setClients(Array.isArray(loadedClients) ? loadedClients : []);
          setInvoices(Array.isArray(loadedInvoices) ? loadedInvoices : []);
          setInvoiceSenderName(getInvoiceSenderName(loadedBusiness || { name: "User_name" }));
          setBusinessCurrency(loadedBusiness?.currency === "EUR" ? "EUR" : "CHF");
        }
      } catch (error) {
        console.error("Error loading invoice page data:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!requestedClientId) {
      return;
    }

    setClientId(requestedClientId);
    setIsCreateFormOpen(true);
  }, [requestedClientId]);

  useEffect(() => {
    if (notesManuallyEdited && notes.trim().length > 0) return;

    const selectedClient = clients.find((client) => client.id === clientId) ?? null;
    const nextTemplate = buildInvoiceNotesTemplate(
      getClientFirstName(selectedClient),
      invoiceSenderName || "User_name"
    );
    setNotes(nextTemplate);
  }, [invoiceSenderName, clientId, clients, notes, notesManuallyEdited]);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
      0
    );

    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
  }, [lineItems]);

  const handleIssueDateChange = (nextIssueDate: string) => {
    setIssueDate(nextIssueDate);
    setDueDate(getDefaultDueDate(nextIssueDate));
  };

  const updateLineItem = (index: number, key: keyof LineItemData, value: string | number) => {
    setLineItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return { ...item, [key]: value };
      })
    );
  };

  const addLineItem = () => {
    setLineItems((current) => [
      ...current,
      { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((current) => current.filter((_, i) => i !== index));
  };

  const handleCreateInvoice = async () => {
    if (!clientId || !issueDate || !dueDate || lineItems.length === 0) {
      toast({
        title: "Missing required fields",
        description: "Please complete all required fields.",
        variant: "error",
      });
      return;
    }

    const normalizedLineItems = lineItems.map((item) => ({
      ...item,
      quantity: item.quantity > 0 ? item.quantity : MIN_QUANTITY,
    }));

    const hasAdjustedQuantities = normalizedLineItems.some(
      (item, index) => item.quantity !== lineItems[index]?.quantity
    );

    if (hasAdjustedQuantities) {
      setLineItems(normalizedLineItems);
    }

    const hasInvalidLineItems = normalizedLineItems.some(
      (item) =>
        !item.description.trim() ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.taxRate < 0
    );

    if (hasInvalidLineItems) {
      toast({
        title: "Invalid line items",
        description: "Please complete valid line item values.",
        variant: "error",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await authenticatedFetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          issueDate,
          dueDate,
          subject,
          status: "draft",
          notes,
          lineItems: normalizedLineItems,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Invoice creation failed",
          description: result?.error ?? "Invoice creation failed",
          variant: "error",
        });
        return;
      }

      setLineItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);
      const nextIssueDate = getTodayDateInputValue();
      setIssueDate(nextIssueDate);
      setDueDate(getDefaultDueDate(nextIssueDate));
      setClientId("");
      setSubject("");
      setNotesManuallyEdited(false);
      setNotes(buildInvoiceNotesTemplate("client_first_name", invoiceSenderName || "User_name"));
      setIsCreateFormOpen(false);
      setSuccessMessage("Invoice created successfully.");

      if (result?.id) {
        router.push(`/invoices/${result.id}/preview`);
        return;
      }

      await fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Invoice creation failed",
        description: "Invoice creation failed",
        variant: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await authenticatedFetch(`/api/invoices/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({
          title: "Failed to delete invoice",
          description: result.error ?? "Failed to delete invoice",
          variant: "error",
        });
        return;
      }

      setDeleteTarget(null);
      await fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Failed to delete invoice",
        description: "Failed to delete invoice",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const sendInvoiceNow = async (invoiceId: string) => {
    setIsSendingId(invoiceId);

    try {
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        toast({
          title: "Failed to send invoice",
          description: result.error ?? "Failed to send invoice",
          variant: "error",
        });
        return;
      }

      setSuccessMessage("Invoice sent successfully.");
      await fetchInvoices();
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Failed to send invoice",
        description: "Failed to send invoice",
        variant: "error",
      });
    } finally {
      setIsSendingId(null);
    }
  };

  const handleSendInvoice = (invoiceId: string) => {
    const invoice = invoices.find((entry) => entry.id === invoiceId);

    if (invoice?.status === "draft") {
      setConfirmDialog({
        title: "Send Invoice",
        description: (
          <>
            Send invoice <strong>{invoice.invoiceNumber}</strong> now?
          </>
        ),
        confirmLabel: "Send Invoice",
        onConfirm: () => {
          setConfirmDialog(null);
          void sendInvoiceNow(invoiceId);
        },
      });
      return;
    }

    void sendInvoiceNow(invoiceId);
  };

  const handleOpenEdit = (invoice: InvoiceRow) => {
    if (invoice.status === "draft") {
      router.push(`/invoices/${invoice.id}?mode=edit`);
      return;
    }

    setConfirmDialog({
      title: "Reopen Invoice",
      description: (
        <>
          Reopen invoice <strong>{invoice.invoiceNumber}</strong> for editing? Use this only if you
          need to change billed details.
        </>
      ),
      confirmLabel: "Reopen & Edit",
      onConfirm: () => {
        setConfirmDialog(null);
        router.push(`/invoices/${invoice.id}?mode=edit`);
      },
    });
  };

  const handleOpenInvoice = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  };

  const sendReminderNow = async (invoiceId: string) => {
    setIsSendingReminderId(invoiceId);

    try {
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/reminder`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        toast({
          title: "Failed to send reminder",
          description: result.error ?? "Failed to send reminder",
          variant: "error",
        });
        return;
      }

      setSuccessMessage(result.message ?? "Reminder sent.");
      await fetchInvoices();
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Failed to send reminder",
        description: "Failed to send reminder",
        variant: "error",
      });
    } finally {
      setIsSendingReminderId(null);
    }
  };

  const handleSendReminder = (invoiceId: string) => {
    const invoice = invoices.find((entry) => entry.id === invoiceId);

    setConfirmDialog({
      title: "Send Reminder",
      description: (
        <>
          Send a reminder for invoice <strong>{invoice?.invoiceNumber ?? "this invoice"}</strong> now?
        </>
      ),
      confirmLabel: "Send Reminder",
      onConfirm: () => {
        setConfirmDialog(null);
        void sendReminderNow(invoiceId);
      },
    });
  };

  const handleManualStatusChange = async (
    invoiceId: string,
    nextStatus: "paid" | "unpaid"
  ) => {
    setIsUpdatingStatusId(invoiceId);

    try {
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast({
          title: "Failed to update invoice status",
          description: result.error ?? "Failed to update invoice status",
          variant: "error",
        });
        return;
      }

      setSuccessMessage(
        nextStatus === "paid" ? "Invoice marked as paid." : "Invoice reopened as unpaid."
      );
      await fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Failed to update invoice status",
        description: "Failed to update invoice status",
        variant: "error",
      });
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const handleDuplicateInvoice = async (invoiceId: string) => {
    try {
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/duplicate`, {
        method: "POST",
      });
      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !result.id) {
        toast({
          title: "Failed to duplicate invoice",
          description: result.error ?? "Failed to duplicate invoice",
          variant: "error",
        });
        return;
      }

      router.push(`/invoices/${result.id}/preview`);
    } catch (error) {
      console.error("Error duplicating invoice:", error);
      toast({
        title: "Failed to duplicate invoice",
        description: "Failed to duplicate invoice",
        variant: "error",
      });
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds((current) =>
      current.includes(invoiceId)
        ? current.filter((id) => id !== invoiceId)
        : [...current, invoiceId]
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedInvoiceIds((current) =>
        current.filter((id) => !filteredInvoices.some((invoice) => invoice.id === id))
      );
      return;
    }

    setSelectedInvoiceIds((current) => {
      const visibleIds = filteredInvoices.map((invoice) => invoice.id);
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const handleExportSelected = () => {
    const exportInvoices = selectedInvoices.length > 0 ? selectedInvoices : filteredInvoices;
    if (exportInvoices.length === 0) {
      return;
    }

    const header = ["Invoice Number", "Client", "Status", "Issue Date", "Due Date", "Currency", "Total"];
    const rows = exportInvoices.map((invoice) => [
      invoice.invoiceNumber,
      getInvoiceClientName(invoice),
      invoice.status,
      invoice.issueDate,
      invoice.dueDate,
      invoice.currency,
      invoice.totalAmount.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "invoices-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleBulkAction = async (action: "send" | "paid" | "delete", skipConfirmation = false) => {
    if (selectedInvoices.length === 0) {
      return;
    }

    if (action === "delete" && !skipConfirmation) {
      setConfirmDialog({
        title: "Delete Invoices",
        description: `Delete ${selectedInvoices.length} selected invoices? This action cannot be undone.`,
        confirmLabel: "Delete Invoices",
        confirmVariant: "destructive",
        onConfirm: () => {
          setConfirmDialog(null);
          void handleBulkAction("delete", true);
        },
      });
      return;
    }

    setBulkActionLabel(action);

    try {
      for (const invoice of selectedInvoices) {
        if (action === "send" && invoice.status !== "paid") {
          await authenticatedFetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
        }

        if (action === "paid") {
          await authenticatedFetch(`/api/invoices/${invoice.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "paid" }),
          });
        }

        if (action === "delete") {
          await authenticatedFetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
        }
      }

      setSuccessMessage(
        action === "send"
          ? "Selected invoices sent."
          : action === "paid"
            ? "Selected invoices marked as paid."
            : "Selected invoices deleted."
      );
      setSelectedInvoiceIds([]);
      await fetchInvoices();
    } catch (error) {
      console.error(`Error running bulk ${action}:`, error);
      toast({
        title: `Failed to complete bulk ${action}`,
        description: `Failed to complete bulk ${action}`,
        variant: "error",
      });
    } finally {
      setBulkActionLabel(null);
    }
  };

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-invoice-actions]")) {
        setOpenActionsInvoiceId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const renderActionMenu = (invoice: InvoiceRow, className?: string) => (
    <div
      className={cn("relative", className)}
      data-invoice-actions
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-[7rem] justify-center"
        onClick={() =>
          setOpenActionsInvoiceId((current) => (current === invoice.id ? null : invoice.id))
        }
      >
        <MoreHorizontal className="h-4 w-4" />
        More
      </Button>
      {openActionsInvoiceId === invoice.id ? (
        <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {invoice.status === "paid" ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-start")}
              disabled={isUpdatingStatusId === invoice.id}
              onClick={() => {
                setOpenActionsInvoiceId(null);
                void handleManualStatusChange(invoice.id, "unpaid");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {isUpdatingStatusId === invoice.id ? "Updating..." : "Mark Unpaid"}
            </button>
          ) : (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-start text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800")}
              disabled={isUpdatingStatusId === invoice.id}
              onClick={() => {
                setOpenActionsInvoiceId(null);
                void handleManualStatusChange(invoice.id, "paid");
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isUpdatingStatusId === invoice.id ? "Updating..." : "Mark Paid"}
            </button>
          )}
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-start")}
            onClick={() => {
              setOpenActionsInvoiceId(null);
              handleOpenEdit(invoice);
            }}
          >
            <FilePenLine className="h-4 w-4" />
            {invoice.status === "draft" ? "Edit" : "Reopen"}
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-start")}
            onClick={() => {
              setOpenActionsInvoiceId(null);
              void handleDuplicateInvoice(invoice.id);
            }}
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-start text-red-700 hover:bg-red-50 hover:text-red-800")}
            onClick={() => {
              setOpenActionsInvoiceId(null);
              setDeleteTarget(invoice);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-sm text-slate-500">Create invoices and manage their lifecycle.</p>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <Card ref={createInvoiceRef}>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Create Invoice</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateFormOpen((current) => !current)}>
            {isCreateFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isCreateFormOpen ? "Close" : "Add New"}
          </Button>
        </CardHeader>
        {isCreateFormOpen ? (
          <CardContent>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Select id="client" value={clientId} onChange={(event) => setClientId(event.target.value)}>
                      <option value="">Select Client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.companyName || client.contactName || client.email}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={(event) => handleIssueDateChange(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Optional project or invoice subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Message</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => {
                      setNotes(event.target.value);
                      setNotesManuallyEdited(true);
                    }}
                    placeholder="Add the greeting or message shown on the invoice"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Line Items</Label>

                  <div className="space-y-3 md:hidden">
                    {lineItems.map((item, index) => (
                      <div
                        key={`${item.id ?? "new"}-${index}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`description-${index}`}>Description</Label>
                            <Input
                              id={`description-${index}`}
                              value={item.description}
                              placeholder="Description"
                              onChange={(event) => updateLineItem(index, "description", event.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`quantity-${index}`}>Qty</Label>
                              <Input
                                id={`quantity-${index}`}
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={item.quantity}
                                onFocus={handleNumberInputFocus}
                                onBlur={(event) => {
                                  if (parseNumber(event.target.value) <= 0) {
                                    updateLineItem(index, "quantity", MIN_QUANTITY);
                                  }
                                }}
                                onChange={(event) =>
                                  updateLineItem(index, "quantity", Math.max(0, parseNumber(event.target.value)))
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`unit-price-${index}`}>Unit Price</Label>
                              <Input
                                id={`unit-price-${index}`}
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.unitPrice}
                                onFocus={handleNumberInputFocus}
                                onChange={(event) =>
                                  updateLineItem(index, "unitPrice", Math.max(0, parseNumber(event.target.value)))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`tax-rate-${index}`}>Tax %</Label>
                              <Input
                                id={`tax-rate-${index}`}
                                type="number"
                                min={0}
                                step="0.1"
                                value={item.taxRate}
                                onFocus={handleNumberInputFocus}
                                onChange={(event) =>
                                  updateLineItem(index, "taxRate", Math.max(0, parseNumber(event.target.value)))
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Line Total</Label>
                              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium">
                                {(item.quantity * item.unitPrice).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeLineItem(index)}
                            className="w-full"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Line Item
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="secondary" onClick={addLineItem} className="w-full justify-center">
                      <Plus className="h-4 w-4" />
                      Add Line Item
                    </Button>
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Tax %</TableHead>
                          <TableHead>Line Total</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item, index) => (
                          <TableRow key={`${item.id ?? "new"}-${index}`}>
                            <TableCell>
                              <Input
                                value={item.description}
                                placeholder="Description"
                                onChange={(event) => updateLineItem(index, "description", event.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={item.quantity}
                                onFocus={handleNumberInputFocus}
                                onBlur={(event) => {
                                  if (parseNumber(event.target.value) <= 0) {
                                    updateLineItem(index, "quantity", MIN_QUANTITY);
                                  }
                                }}
                                onChange={(event) =>
                                  updateLineItem(index, "quantity", Math.max(0, parseNumber(event.target.value)))
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.unitPrice}
                                onFocus={handleNumberInputFocus}
                                onChange={(event) =>
                                  updateLineItem(index, "unitPrice", Math.max(0, parseNumber(event.target.value)))
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                value={item.taxRate}
                                onFocus={handleNumberInputFocus}
                                onChange={(event) =>
                                  updateLineItem(index, "taxRate", Math.max(0, parseNumber(event.target.value)))
                                }
                              />
                            </TableCell>
                            <TableCell>{(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell>
                            <Button type="button" variant="secondary" onClick={addLineItem} className="justify-start">
                              <Plus className="h-4 w-4" />
                              Add Line Item
                            </Button>
                          </TableCell>
                          <TableCell colSpan={5} />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleCreateInvoice} disabled={isCreating} className="min-w-[10rem] max-md:w-full">
                    {isCreating ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              </div>

              <InvoiceCreateSidebar
                client={selectedClient}
                issueDate={issueDate}
                dueDate={dueDate}
                currency={businessCurrency}
                subtotal={totals.subtotal}
                taxAmount={totals.taxAmount}
                totalAmount={totals.totalAmount}
              />
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-2">
            <CardTitle>Invoice Table</CardTitle>
            {activeFilterLabel ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  Filter: {activeFilterLabel}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(searchQuery ? `/invoices?q=${encodeURIComponent(searchQuery)}` : "/invoices")}
                >
                  Clear filter
                </Button>
              </div>
            ) : null}
          </div>
          <div className="hidden md:flex flex-wrap gap-2">
            <Button asChild size="sm" variant={statusFilter === "needs-action" ? "default" : "outline"}>
              <Link href="/invoices?status=needs-action">Needs Action</Link>
            </Button>
            <Button asChild size="sm" variant={statusFilter === "awaiting-payment" ? "default" : "outline"}>
              <Link href="/invoices?status=awaiting-payment">Awaiting Payment</Link>
            </Button>
            <Button asChild size="sm" variant={statusFilter === "paid-recently" ? "default" : "outline"}>
              <Link href="/invoices?status=paid-recently">Paid Recently</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedInvoiceIds.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700">{selectedInvoiceIds.length} selected</p>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("send")} disabled={bulkActionLabel !== null}>
                {bulkActionLabel === "send" ? "Sending..." : "Send"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("paid")} disabled={bulkActionLabel !== null}>
                {bulkActionLabel === "paid" ? "Updating..." : "Mark Paid"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportSelected} disabled={bulkActionLabel !== null}>
                Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("delete")} disabled={bulkActionLabel !== null} className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                {bulkActionLabel === "delete" ? "Deleting..." : "Delete"}
              </Button>
            </div>
          ) : null}
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">No invoices yet</p>
              <p className="text-sm text-slate-600">Create your first invoice to start billing clients.</p>
              <Button
                onClick={() => {
                  setIsCreateFormOpen(true);
                  createInvoiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Create Invoice
              </Button>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">No invoices match your search</p>
              <p className="text-sm text-slate-600">
                Try a different term for invoice number, client, status, or currency.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {activeFilterLabel ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(searchQuery ? `/invoices?q=${encodeURIComponent(searchQuery)}` : "/invoices")}
                  >
                    Clear Filter
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => {
                    setIsCreateFormOpen(true);
                    createInvoiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Create Invoice
                </Button>
              </div>
            </div>
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible invoices"
                    />
                  </TableHead>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                    role="link"
                    tabIndex={0}
                    onClick={() => handleOpenInvoice(invoice.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenInvoice(invoice.id);
                      }
                    }}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.includes(invoice.id)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleInvoiceSelection(invoice.id)}
                        aria-label={`Select ${invoice.invoiceNumber}`}
                      />
                    </TableCell>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getInvoiceClientName(invoice)}</TableCell>
                    <TableCell>
                      {invoice.currency} {invoice.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="grid grid-cols-[8.5rem_7rem] gap-2">
                        {invoice.status === "draft" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-[8.5rem] justify-start"
                            disabled={isSendingId === invoice.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleSendInvoice(invoice.id);
                            }}
                          >
                            <Send className="h-4 w-4" />
                            {isSendingId === invoice.id ? "Sending..." : "Send"}
                          </Button>
                        ) : invoice.status === "sent" || invoice.status === "overdue" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-[8.5rem] justify-start"
                            disabled={isSendingReminderId === invoice.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleSendReminder(invoice.id);
                            }}
                          >
                            <BellRing className="h-4 w-4" />
                            {isSendingReminderId === invoice.id ? "Sending..." : "Reminder"}
                          </Button>
                        ) : (
                          <div className="h-9 w-[8.5rem]" />
                        )}
                        {renderActionMenu(invoice)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
                  role="link"
                  tabIndex={0}
                  onClick={() => handleOpenInvoice(invoice.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenInvoice(invoice.id);
                    }
                  }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedInvoiceIds.includes(invoice.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleInvoiceSelection(invoice.id)}
                          aria-label={`Select ${invoice.invoiceNumber}`}
                        />
                        <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                      </div>
                      <p className="text-sm text-slate-600">{getInvoiceClientName(invoice)}</p>
                      <p className="text-sm text-slate-600">
                        {invoice.currency} {invoice.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {invoice.status === "draft" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isSendingId === invoice.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSendInvoice(invoice.id);
                        }}
                        className="col-span-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSendingId === invoice.id ? "Sending..." : "Send"}
                      </Button>
                    ) : invoice.status === "sent" || invoice.status === "overdue" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isSendingReminderId === invoice.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSendReminder(invoice.id);
                        }}
                        className="col-span-2"
                      >
                        <BellRing className="h-4 w-4" />
                        {isSendingReminderId === invoice.id ? "Sending..." : "Reminder"}
                      </Button>
                    ) : (
                      <div className="col-span-2">{renderActionMenu(invoice)}</div>
                    )}
                    {invoice.status !== "paid" ? <div className="col-span-2">{renderActionMenu(invoice)}</div> : null}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Delete invoice <strong>{deleteTarget?.invoiceNumber}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvoice} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog(null);
          }
        }}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        confirmVariant={confirmDialog?.confirmVariant}
        onConfirm={() => confirmDialog?.onConfirm()}
      />
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div>Loading invoices...</div>}>
      <InvoicePageContent />
    </Suspense>
  );
}
