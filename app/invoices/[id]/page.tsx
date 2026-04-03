"use client";

import Link from "next/link";
import { FocusEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BellRing, CheckCircle2, CircleOff, Copy, Download, Eye, GripVertical, PencilLine, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import UpgradeDialog from "@/components/billing/UpgradeDialog";
import { arrayMove } from "@/lib/arrayMove";
import { getBillingLimitDetails } from "@/lib/billingClient";
import { getInvoiceVatLabel } from "@/lib/invoice";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";
import { BillingLimitDetails, InvoiceDetails, LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { getDefaultDueDate, toDateInputValue } from "@/lib/invoiceDates";
import { getInvoiceAmountDue } from "@/lib/invoiceStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function parseNumberInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const MIN_QUANTITY = 0.01;

function handleNumberInputFocus(event: FocusEvent<HTMLInputElement>) {
  event.target.select();
}

function calculateTotals(lineItems: LineItemData[]) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
    0
  );

  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
  };
}

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function formatEventLabel(type: string): string {
  switch (type) {
    case "created":
      return "Created";
    case "edited":
      return "Edited";
    case "sent":
      return "Sent";
    case "reminder_sent":
      return "Reminder sent";
    case "viewed":
      return "Viewed online";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
    case "payment_review":
      return "Payment review";
    case "reopened":
      return "Reopened";
    case "duplicated":
      return "Duplicated";
    default:
      return type;
  }
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id;
  const shouldStartEditing = searchParams.get("mode") === "edit";
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReopenEditDialog, setShowReopenEditDialog] = useState(false);
  const [showSendConfirmDialog, setShowSendConfirmDialog] = useState(false);
  const [showReminderConfirmDialog, setShowReminderConfirmDialog] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [billingLimitDetails, setBillingLimitDetails] = useState<BillingLimitDetails | null>(null);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);
  const [draggedLineItemIndex, setDraggedLineItemIndex] = useState<number | null>(null);
  const [dragOverLineItemIndex, setDragOverLineItemIndex] = useState<number | null>(null);

  const editedTotals = useMemo(() => calculateTotals(lineItems), [lineItems]);
  const vatLabel = useMemo(
    () => getInvoiceVatLabel(isEditing ? lineItems : invoice?.lineItems ?? []),
    [invoice?.lineItems, isEditing, lineItems]
  );
  const billingReturnPath = id ? `/invoices/${id}` : "/invoices";

  function handleBillingLimitResponse(payload: { code?: string; details?: unknown }): boolean {
    const details = getBillingLimitDetails(payload);
    if (!details) {
      return false;
    }

    setBillingLimitDetails(details);
    return true;
  }

  async function openBillingCheckout() {
    setIsOpeningBilling(true);

    try {
      const response = await authenticatedFetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnPath: billingReturnPath,
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not open billing checkout");
      }

      window.location.assign(result.url);
    } catch (error) {
      toast({
        title: "Unable to open checkout",
        description: error instanceof Error ? error.message : "Could not open billing checkout",
        variant: "error",
      });
      setIsOpeningBilling(false);
    }
  }

  async function openBillingPortal() {
    setIsOpeningBilling(true);

    try {
      const response = await authenticatedFetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnPath: billingReturnPath,
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not open billing portal");
      }

      window.location.assign(result.url);
    } catch (error) {
      toast({
        title: "Unable to open billing portal",
        description: error instanceof Error ? error.message : "Could not open billing portal",
        variant: "error",
      });
      setIsOpeningBilling(false);
    }
  }

  const handleIssueDateChange = (nextIssueDate: string) => {
    setIssueDate(nextIssueDate);
    setDueDate(getDefaultDueDate(nextIssueDate));
  };

  function loadInvoiceIntoForm(dataInvoice: InvoiceDetails) {
    setIssueDate(toDateInputValue(dataInvoice.issueDate));
    setDueDate(toDateInputValue(dataInvoice.dueDate));
    setSubject(dataInvoice.subject ?? "");
    setNotes(dataInvoice.notes ?? "");
    setPaymentNote(dataInvoice.paymentNote ?? "");
    setLineItems(
      dataInvoice.lineItems.map((item) => ({
        id: item.id,
        position: item.position,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      }))
    );
  }

  const fetchInvoice = useCallback(async (invoiceId: string) => {
    const response = await authenticatedFetch(`/api/invoices/${invoiceId}`);
    const dataInvoice = (await response.json()) as InvoiceDetails | { error?: string };

    if (!response.ok || ("error" in dataInvoice && dataInvoice.error)) {
      throw new Error(("error" in dataInvoice ? dataInvoice.error : null) ?? "Failed to load invoice");
    }

    const safeInvoice = dataInvoice as InvoiceDetails;
    setInvoice(safeInvoice);
    loadInvoiceIntoForm(safeInvoice);
  }, []);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        await fetchInvoice(id);
      } catch (error) {
        console.error("Error fetching invoice:", error);
        if (mounted) {
          setInvoice(null);
          setLoadError("Unable to load this invoice.");
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
  }, [fetchInvoice, id]);

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    setIsEditing(shouldStartEditing);
  }, [shouldStartEditing]);

  const handleDownloadPdf = async () => {
    if (!invoice) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/pdf`);
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        toast({
          title: "Failed to download PDF",
          description: result?.error ?? "Failed to download PDF",
          variant: "error",
        });
        return;
      }

      const pdfBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = buildInvoicePdfFilename(invoice.invoiceNumber);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Failed to download PDF",
        description: "Failed to download PDF",
        variant: "error",
      });
    }
  };

  const sendInvoiceNow = async () => {
    if (!invoice) {
      return;
    }

    try {
      setIsSending(true);
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      const result = (await response.json()) as { message?: string; error?: string; code?: string; details?: unknown };

      if (!response.ok) {
        if (handleBillingLimitResponse(result)) {
          return;
        }

        toast({
          title: "Failed to send invoice",
          description: result?.error ?? "Failed to send invoice",
          variant: "error",
        });
        return;
      }

      setInvoice((current) => (current ? { ...current, status: "sent" } : current));
      setSuccessMessage(result?.message ?? "Invoice sent");
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Failed to send invoice",
        description: "Failed to send invoice",
        variant: "error",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendInvoice = () => {
    if (!invoice) {
      return;
    }

    if (invoice.status === "draft") {
      setShowSendConfirmDialog(true);
      return;
    }

    void sendInvoiceNow();
  };

  const handleDuplicateInvoice = async () => {
    if (!invoice || isDuplicating) {
      return;
    }

    try {
      setIsDuplicating(true);
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/duplicate`, {
        method: "POST",
      });
      const result = (await response.json()) as InvoiceDetails & { error?: string };

      if (!response.ok || !result?.id) {
        toast({
          title: "Failed to duplicate invoice",
          description: result?.error ?? "Failed to duplicate invoice",
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
    } finally {
      setIsDuplicating(false);
    }
  };

  const sendReminderNow = async () => {
    if (!invoice || isSendingReminder) {
      return;
    }

    try {
      setIsSendingReminder(true);
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/reminder`, {
        method: "POST",
      });
      const result = (await response.json()) as InvoiceDetails & { error?: string; message?: string };

      if (!response.ok) {
        toast({
          title: "Failed to send reminder",
          description: result?.error ?? "Failed to send reminder",
          variant: "error",
        });
        return;
      }

      await fetchInvoice(invoice.id);
      setSuccessMessage(result?.message ?? "Reminder sent.");
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Failed to send reminder",
        description: "Failed to send reminder",
        variant: "error",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSendReminder = () => {
    if (!invoice || isSendingReminder) {
      return;
    }

    setShowReminderConfirmDialog(true);
  };

  const handleManualStatusChange = async (nextStatus: "paid" | "unpaid" | "cancelled") => {
    if (!invoice || isUpdatingStatus || isEditing) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = (await response.json()) as (InvoiceDetails & {
        error?: string;
        code?: string;
        details?: unknown;
      });

      if (!response.ok) {
        if (handleBillingLimitResponse(result)) {
          return;
        }

        toast({
          title: "Failed to update invoice status",
          description: result?.error ?? "Failed to update invoice status",
          variant: "error",
        });
        return;
      }

      setInvoice(result);
      loadInvoiceIntoForm(result);
      setSuccessMessage(
        nextStatus === "paid"
          ? "Invoice marked as paid."
          : nextStatus === "cancelled"
            ? "Invoice cancelled. No payment is due."
            : "Invoice reopened as unpaid."
      );
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Failed to update invoice status",
        description: "Failed to update invoice status",
        variant: "error",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddLineItem = () => {
    setLineItems((current) => [
      ...current,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleLineItemChange = (
    index: number,
    key: keyof LineItemData,
    value: string | number
  ) => {
    setLineItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  };

  const moveLineItem = (fromIndex: number, toIndex: number) => {
    setLineItems((current) => arrayMove(current, fromIndex, toIndex));
  };

  const handleLineItemDragStart = (index: number) => {
    setDraggedLineItemIndex(index);
    setDragOverLineItemIndex(index);
  };

  const handleLineItemDrop = (index: number) => {
    if (draggedLineItemIndex === null) {
      return;
    }

    moveLineItem(draggedLineItemIndex, index);
    setDraggedLineItemIndex(null);
    setDragOverLineItemIndex(null);
  };

  const handleLineItemDragEnd = () => {
    setDraggedLineItemIndex(null);
    setDragOverLineItemIndex(null);
  };

  const handleCancelEdit = () => {
    if (!invoice) {
      return;
    }

    loadInvoiceIntoForm(invoice);
    router.replace(`/invoices/${invoice.id}`);
  };

  const handleOpenEdit = () => {
    if (!invoice) {
      return;
    }

    if (invoice.status === "draft") {
      router.push(`/invoices/${invoice.id}?mode=edit`);
      return;
    }

    setShowReopenEditDialog(true);
  };

  const handleSaveInvoice = async () => {
    if (!invoice || !id || isSaving) {
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

    if (!issueDate || !dueDate) {
      toast({
        title: "Missing dates",
        description: "Issue date and due date are required.",
        variant: "error",
      });
      return;
    }

    if (new Date(dueDate) < new Date(issueDate)) {
      toast({
        title: "Invalid due date",
        description: "Due date must be on or after issue date.",
        variant: "error",
      });
      return;
    }

    if (lineItems.length === 0) {
      toast({
        title: "Missing line items",
        description: "Invoice must contain at least one line item.",
        variant: "error",
      });
      return;
    }

    if (hasInvalidLineItems) {
      toast({
        title: "Invalid line items",
        description: "Please fix invalid line items before saving.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await authenticatedFetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueDate,
          dueDate,
          subject,
          notes,
          paymentNote,
          lineItems: normalizedLineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })),
        }),
      });

      const result = (await response.json()) as InvoiceDetails & { error?: string };

      if (!response.ok) {
        toast({
          title: "Failed to update invoice",
          description: result?.error ?? "Failed to update invoice",
          variant: "error",
        });
        return;
      }

      setInvoice(result);
      loadInvoiceIntoForm(result);
      setIsEditing(false);
      router.replace(`/invoices/${id}/preview`);
      setSuccessMessage("Invoice updated successfully.");
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Failed to update invoice",
        description: "Failed to update invoice",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice || !id || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast({
          title: "Failed to delete invoice",
          description: result?.error ?? "Failed to delete invoice",
          variant: "error",
        });
        return;
      }

      setShowDeleteDialog(false);
      router.push("/invoices");
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-600">Loading invoice details...</CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card className={loadError ? "border-red-200 bg-red-50/80 dark:border-red-900/70 dark:bg-red-950/35" : undefined}>
        <CardContent className={`pt-6 ${loadError ? "text-red-800 dark:text-red-100" : "text-slate-600"}`}>
          {loadError ?? "Invoice not found."}
        </CardContent>
      </Card>
    );
  }

  const timelineSteps = [
    {
      label: "Created",
      description: `Created ${new Date(invoice.createdAt).toLocaleDateString()}`,
      active: true,
    },
    {
      label: "Sent",
      description: invoice.status === "draft" ? "Not sent yet" : "Client-facing invoice",
      active: invoice.status !== "draft",
    },
    {
      label: "Due",
      description: `Due ${new Date(invoice.dueDate).toLocaleDateString()}`,
      active: invoice.status === "overdue" || invoice.status === "paid",
    },
    {
      label: invoice.status === "cancelled" ? "Cancelled" : "Paid",
      description:
        invoice.status === "cancelled"
          ? "No payment due"
          : invoice.status === "paid"
          ? "Payment completed"
          : invoice.status === "overdue"
            ? "Still awaiting payment"
            : "Awaiting payment",
      active: invoice.status === "paid" || invoice.status === "cancelled",
      danger: invoice.status === "overdue",
    },
  ];
  const latestViewedEvent = invoice.events.find((event) => event.type === "viewed") ?? null;
  const invoiceAmountDue = getInvoiceAmountDue(
    invoice.status,
    isEditing ? editedTotals.totalAmount : invoice.totalAmount
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
              Back to invoices
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-sm text-slate-500">
              Client: {invoice.client.companyName || invoice.client.contactName || invoice.client.email}
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-2 xl:flex xl:flex-wrap">
          {!isEditing && invoice.status !== "paid" && invoice.status !== "cancelled" ? (
            invoice.status === "draft" ? (
              <Button
                variant="default"
                onClick={handleSendInvoice}
                disabled={isSending || isDuplicating}
                className="col-span-2 w-full sm:col-span-1 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                {isSending ? "Sending..." : "Send"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleSendReminder}
                disabled={isSendingReminder || isDuplicating}
                className="col-span-2 w-full sm:col-span-1 sm:w-auto"
              >
                <BellRing className="h-4 w-4" />
                {isSendingReminder ? "Sending..." : "Send Reminder"}
              </Button>
            )
          ) : null}
          {!isEditing ? (
            invoice.status === "paid" ? (
              <Button
                variant="outline"
                onClick={() => void handleManualStatusChange("unpaid")}
                disabled={isUpdatingStatus || isSending || isDuplicating || isDeleting}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                {isUpdatingStatus ? "Updating..." : "Mark Unpaid"}
              </Button>
            ) : invoice.status === "cancelled" ? (
              <Button
                variant="outline"
                onClick={() => void handleManualStatusChange("unpaid")}
                disabled={isUpdatingStatus || isSending || isDuplicating || isDeleting}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                {isUpdatingStatus ? "Updating..." : "Reopen Invoice"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => void handleManualStatusChange("paid")}
                disabled={isUpdatingStatus || isSending || isDuplicating || isDeleting}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isUpdatingStatus ? "Updating..." : "Mark Paid"}
              </Button>
            )
          ) : null}
          {!isEditing && (invoice.status === "sent" || invoice.status === "overdue") ? (
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirmDialog(true)}
              disabled={isUpdatingStatus || isSending || isDuplicating || isDeleting}
              className="w-full sm:w-auto"
            >
              <CircleOff className="h-4 w-4" />
              Cancel Invoice
            </Button>
          ) : null}
          {!isEditing ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/invoices/${invoice.id}/preview`}>
                <Eye className="h-4 w-4" />
                Preview Invoice
              </Link>
            </Button>
          ) : null}
          {!isEditing ? (
            <Button variant="outline" onClick={handleOpenEdit} className="w-full sm:w-auto">
              <PencilLine className="h-4 w-4" />
              {invoice.status === "draft" ? "Edit Invoice" : "Reopen & Edit"}
            </Button>
          ) : (
            <>
              <Button onClick={handleSaveInvoice} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? "Saving..." : "Save Invoice"}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving} className="w-full sm:w-auto">
                Cancel
              </Button>
            </>
          )}

          <Button variant="outline" onClick={handleDownloadPdf} disabled={isSaving || isDeleting} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleDuplicateInvoice}
                disabled={isDuplicating || isDeleting}
                className="w-full sm:min-w-[10rem] sm:w-auto"
              >
                <Copy className="h-4 w-4" />
                {isDuplicating ? "Duplicating..." : "Duplicate"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting || isDuplicating}
                className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950/40 dark:hover:text-red-100 sm:min-w-[10rem] sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100">
          {successMessage}
        </div>
      ) : null}
      {invoice.status === "cancelled" ? (
        <div className="rounded-md border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
          This invoice is cancelled. It stays on record, but reminders, card checkout, and
          amount due are now treated as {invoice.currency} 0.00 until you reopen it.
        </div>
      ) : null}

      {!isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Progress</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {timelineSteps.map((step) => (
              <div
                key={step.label}
                className={`rounded-lg border px-4 py-3 ${
                  step.danger
                    ? "border-red-200 bg-red-50/70 dark:border-red-900/70 dark:bg-red-950/35"
                    : step.active
                      ? "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                      : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    step.danger ? "text-red-700 dark:text-red-200" : step.active ? "text-slate-500 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className={`mt-1 font-medium ${step.active && !step.danger ? "text-slate-900 dark:text-slate-50" : "text-slate-900 dark:text-slate-100"}`}>
                  {step.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!isEditing ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {invoice.payments.length === 0 ? (
                <p className="text-slate-500">No payments recorded yet.</p>
              ) : (
                invoice.payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {payment.provider === "stripe"
                            ? "Paid via Stripe"
                            : payment.reference === "manual-status"
                              ? "Marked paid manually"
                              : "Bank transfer payment"}
                        </p>
                        <p className="text-slate-600">{formatDateTime(payment.createdAt)}</p>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {payment.currency} {formatMoney(payment.amount)}
                      </p>
                    </div>
                    {payment.reference ? (
                      <p className="mt-2 text-xs text-slate-500">Reference: {payment.reference}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {invoice.events.length === 0 ? (
                <p className="text-slate-500">No activity recorded yet.</p>
              ) : (
                invoice.events.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{formatEventLabel(event.type)}</p>
                        {event.details ? <p className="text-slate-600">{event.details}</p> : null}
                        {event.actor ? <p className="text-xs text-slate-500">By {event.actor}</p> : null}
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoice Summary</CardTitle>
          <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Issue Date</p>
            <p className="font-medium text-slate-900">
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
            <p className="font-medium text-slate-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Currency</p>
            <p className="font-medium text-slate-900">{invoice.currency}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Amount Due</p>
            <p className="font-medium text-slate-900">
              {invoice.currency} {formatMoney(invoiceAmountDue)}
            </p>
          </div>
          <div className="md:col-span-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-slate-200 p-2 text-slate-700">
                  <Eye className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Online view</p>
                  <p className="font-medium text-slate-900">
                    {latestViewedEvent
                      ? `Viewed online on ${formatDateTime(latestViewedEvent.createdAt)}`
                      : invoice.status === "draft"
                        ? "No online view yet. This starts tracking after the invoice is shared."
                        : "No online view recorded yet."}
                  </p>
                  <p className="text-xs text-slate-500">
                    Recorded when the client opens the online invoice page. Email opens and PDF opens are not tracked.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Subject</p>
            <p className="font-medium text-slate-900">{invoice.subject || "-"}</p>
          </div>
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="issueDate">Edit Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(event) => handleIssueDateChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Edit Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="notes">Message</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add the greeting or message shown on the invoice"
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="paymentNote">Payment Note</Label>
                <Input
                  id="paymentNote"
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  placeholder="Optional short payment note, e.g. payment via TWINT possible at +41..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Message</p>
                <p className="font-medium whitespace-pre-line text-slate-900">{invoice.notes || "-"}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Payment Note</p>
                <p className="font-medium whitespace-pre-line text-slate-900">{invoice.paymentNote || "-"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3 lg:hidden">
              {lineItems.map((item, index) => (
                <div
                  key={item.id ?? `editable-card-${index}`}
                  className={cn(
                    "rounded-xl border bg-slate-50 p-4",
                    dragOverLineItemIndex === index ? "border-slate-400" : "border-slate-200"
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedLineItemIndex !== null) {
                      setDragOverLineItemIndex(index);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleLineItemDrop(index);
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Line Item {index + 1}
                      </p>
                      <button
                        type="button"
                        draggable
                        className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-white"
                        aria-label={`Drag line item ${index + 1}`}
                        onDragStart={() => handleLineItemDragStart(index)}
                        onDragEnd={handleLineItemDragEnd}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`edit-description-${index}`}>Description</Label>
                      <Input
                        id={`edit-description-${index}`}
                        value={item.description}
                        placeholder="Description"
                        onChange={(event) =>
                          handleLineItemChange(index, "description", event.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-quantity-${index}`}>Quantity</Label>
                        <Input
                          id={`edit-quantity-${index}`}
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={item.quantity}
                          onFocus={handleNumberInputFocus}
                          onBlur={(event) => {
                            if (parseNumberInput(event.target.value) <= 0) {
                              handleLineItemChange(index, "quantity", MIN_QUANTITY);
                            }
                          }}
                          onChange={(event) =>
                            handleLineItemChange(
                              index,
                              "quantity",
                              Math.max(0, parseNumberInput(event.target.value))
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`edit-unit-price-${index}`}>Unit Price</Label>
                        <Input
                          id={`edit-unit-price-${index}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onFocus={handleNumberInputFocus}
                          onChange={(event) =>
                            handleLineItemChange(
                              index,
                              "unitPrice",
                              Math.max(0, parseNumberInput(event.target.value))
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-tax-rate-${index}`}>Tax %</Label>
                        <Input
                          id={`edit-tax-rate-${index}`}
                          type="number"
                          min={0}
                          step="0.1"
                          value={item.taxRate}
                          onFocus={handleNumberInputFocus}
                          onChange={(event) =>
                            handleLineItemChange(
                              index,
                              "taxRate",
                              Math.max(0, parseNumberInput(event.target.value))
                            )
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
                      onClick={() => handleRemoveLineItem(index)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Line Item
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddLineItem}
                className="w-full justify-center"
              >
                <Plus className="h-4 w-4" />
                Add Line Item
              </Button>
            </div>
          ) : null}

          <div className={cn("overflow-x-auto", isEditing ? "hidden lg:block" : "block")}>
          <Table className={isEditing ? "table-fixed" : undefined}>
            <TableHeader>
              <TableRow>
                {isEditing ? (
                  <TableHead className="w-10 px-1">
                    <span className="sr-only">Reorder</span>
                  </TableHead>
                ) : null}
                <TableHead className={isEditing ? "pl-1" : undefined}>Description</TableHead>
                <TableHead className={isEditing ? "w-20 px-2" : undefined}>Quantity</TableHead>
                <TableHead className={isEditing ? "w-28 px-2" : undefined}>Unit Price</TableHead>
                <TableHead className={isEditing ? "w-24 px-2" : undefined}>Tax %</TableHead>
                <TableHead className={isEditing ? "w-24 px-2" : undefined}>Line Total</TableHead>
                {isEditing ? (
                  <TableHead className="w-12 px-1 text-center">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEditing ? (
                <>
                  {lineItems.map((item, index) => (
                    <TableRow
                      key={item.id ?? `editable-${index}`}
                      className={dragOverLineItemIndex === index ? "bg-slate-50" : undefined}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (draggedLineItemIndex !== null) {
                          setDragOverLineItemIndex(index);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleLineItemDrop(index);
                      }}
                    >
                      <TableCell className="w-10 px-1">
                        <button
                          type="button"
                          draggable
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          aria-label={`Drag line item ${index + 1}`}
                          onDragStart={() => handleLineItemDragStart(index)}
                          onDragEnd={handleLineItemDragEnd}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </TableCell>
                      <TableCell className="min-w-[14rem] pl-1 pr-2">
                        <Input
                          value={item.description}
                          placeholder="Description"
                          onChange={(event) =>
                            handleLineItemChange(index, "description", event.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="px-2">
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={item.quantity}
                          onFocus={handleNumberInputFocus}
                          onBlur={(event) => {
                            if (parseNumberInput(event.target.value) <= 0) {
                              handleLineItemChange(index, "quantity", MIN_QUANTITY);
                            }
                          }}
                          onChange={(event) =>
                            handleLineItemChange(
                              index,
                              "quantity",
                              Math.max(0, parseNumberInput(event.target.value))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="px-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onFocus={handleNumberInputFocus}
                          onChange={(event) =>
                            handleLineItemChange(
                              index,
                              "unitPrice",
                              Math.max(0, parseNumberInput(event.target.value))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="px-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={item.taxRate}
                          onFocus={handleNumberInputFocus}
                          onChange={(event) =>
                            handleLineItemChange(
                              index,
                              "taxRate",
                              Math.max(0, parseNumberInput(event.target.value))
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="px-2">{(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell className="w-12 px-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove line item ${index + 1}`}
                          onClick={() => handleRemoveLineItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="px-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddLineItem}
                        className="justify-start"
                      >
                        <Plus className="h-4 w-4" />
                        Add Line Item
                      </Button>
                    </TableCell>
                    <TableCell colSpan={6} />
                  </TableRow>
                </>
              ) : (
                invoice.lineItems.map((item, index) => (
                  <TableRow key={item.id ?? `${item.description}-${index}`}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>{item.taxRate}</TableCell>
                    <TableCell>{(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <div className="mt-6 space-y-1 text-right text-sm text-slate-700">
            <p>
              Subtotal: {invoice.currency}{" "}
              {isEditing ? editedTotals.subtotal.toFixed(2) : invoice.subtotal.toFixed(2)}
            </p>
            <p>
              {vatLabel}: {invoice.currency}{" "}
              {isEditing ? editedTotals.taxAmount.toFixed(2) : invoice.taxAmount.toFixed(2)}
            </p>
            <p className="text-base font-semibold text-slate-900">
              Total: {invoice.currency}{" "}
              {isEditing ? editedTotals.totalAmount.toFixed(2) : invoice.totalAmount.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Delete invoice <strong>{invoice.invoiceNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvoice} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showSendConfirmDialog}
        onOpenChange={setShowSendConfirmDialog}
        title="Send Invoice"
        description={
          <>
            Send this draft invoice now? An official invoice number will be assigned when it is sent.
          </>
        }
        confirmLabel="Send Invoice"
        isConfirming={isSending}
        onConfirm={() => {
          setShowSendConfirmDialog(false);
          void sendInvoiceNow();
        }}
      />

      <ConfirmDialog
        open={showReminderConfirmDialog}
        onOpenChange={setShowReminderConfirmDialog}
        title="Send Reminder"
        description={
          <>
            Send a reminder for invoice <strong>{invoice.invoiceNumber}</strong> now?
          </>
        }
        confirmLabel="Send Reminder"
        isConfirming={isSendingReminder}
        onConfirm={() => {
          setShowReminderConfirmDialog(false);
          void sendReminderNow();
        }}
      />

      <ConfirmDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
        title="Cancel Invoice"
        description={
          <>
            Cancel invoice <strong>{invoice.invoiceNumber}</strong>? It will stay on record,
            reminders and payment collection will stop, and the amount due will be treated as{" "}
            <strong>
              {invoice.currency} 0.00
            </strong>
            .
          </>
        }
        confirmLabel="Cancel Invoice"
        confirmVariant="destructive"
        isConfirming={isUpdatingStatus}
        onConfirm={() => {
          setShowCancelConfirmDialog(false);
          void handleManualStatusChange("cancelled");
        }}
      />

      <Dialog open={showReopenEditDialog} onOpenChange={setShowReopenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Invoice for Editing</DialogTitle>
            <DialogDescription>
              This invoice has already moved beyond draft. Reopen it only if you need to change financial details before sending or sharing an updated version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowReopenEditDialog(false);
                router.push(`/invoices/${invoice.id}?mode=edit`);
              }}
            >
              Reopen & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={Boolean(billingLimitDetails)}
        onOpenChange={(open) => {
          if (!open) {
            setBillingLimitDetails(null);
          }
        }}
        details={billingLimitDetails}
        onUpgrade={() => void openBillingCheckout()}
        onManageBilling={billingLimitDetails?.portalAvailable ? () => void openBillingPortal() : undefined}
        isSubmitting={isOpeningBilling}
      />
    </div>
  );
}
