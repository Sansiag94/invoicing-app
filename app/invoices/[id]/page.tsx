"use client";

import Link from "next/link";
import { FocusEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Eye, PencilLine, Plus, Send, Trash2 } from "lucide-react";
import { buildInvoicePdfFilename } from "@/lib/pdfFilename";
import { InvoiceDetails, LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);

  const editedTotals = useMemo(() => calculateTotals(lineItems), [lineItems]);

  function loadInvoiceIntoForm(dataInvoice: InvoiceDetails) {
    setIssueDate(toDateInputValue(dataInvoice.issueDate));
    setDueDate(toDateInputValue(dataInvoice.dueDate));
    setSubject(dataInvoice.subject ?? "");
    setNotes(dataInvoice.notes ?? "");
    setLineItems(
      dataInvoice.lineItems.map((item) => ({
        id: item.id,
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
        alert(result?.error ?? "Failed to download PDF");
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
      alert("Failed to download PDF");
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) {
      return;
    }

    try {
      setIsSending(true);
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to send invoice");
        return;
      }

      setInvoice((current) => (current ? { ...current, status: "sent" } : current));
      setSuccessMessage(result?.message ?? "Invoice sent");
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice");
    } finally {
      setIsSending(false);
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

  const handleCancelEdit = () => {
    if (!invoice) {
      return;
    }

    loadInvoiceIntoForm(invoice);
    router.replace(`/invoices/${invoice.id}`);
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
      alert("Issue date and due date are required.");
      return;
    }

    if (new Date(dueDate) < new Date(issueDate)) {
      alert("Due date must be on or after issue date.");
      return;
    }

    if (lineItems.length === 0) {
      alert("Invoice must contain at least one line item.");
      return;
    }

    if (hasInvalidLineItems) {
      alert("Please fix invalid line items before saving.");
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
        alert(result?.error ?? "Failed to update invoice");
        return;
      }

      setInvoice(result);
      loadInvoiceIntoForm(result);
      setIsEditing(false);
      router.replace(`/invoices/${id}/preview`);
      setSuccessMessage("Invoice updated successfully.");
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("Failed to update invoice");
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
        alert(result?.error ?? "Failed to delete invoice");
        return;
      }

      setShowDeleteDialog(false);
      router.push("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
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
      <Card className={loadError ? "border-red-200 bg-red-50" : undefined}>
        <CardContent className={`pt-6 ${loadError ? "text-red-700" : "text-slate-600"}`}>
          {loadError ?? "Invoice not found."}
        </CardContent>
      </Card>
    );
  }

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
        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <Button asChild variant="outline">
              <Link href={`/invoices/${invoice.id}/preview`}>
                <Eye className="h-4 w-4" />
                Preview Invoice
              </Link>
            </Button>
          ) : null}
          {!isEditing ? (
            <Button onClick={() => router.push(`/invoices/${invoice.id}?mode=edit`)}>
              <PencilLine className="h-4 w-4" />
              Edit Invoice
            </Button>
          ) : (
            <>
              <Button onClick={handleSaveInvoice} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Invoice"}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                Cancel
              </Button>
            </>
          )}

          <Button variant="outline" onClick={handleDownloadPdf} disabled={isSaving || isDeleting}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="secondary"
            onClick={handleSendInvoice}
            disabled={isSending || invoice.status === "paid" || isEditing}
            title={invoice.status === "paid" ? "Paid invoices cannot be sent" : undefined}
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
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
                  onChange={(event) => setIssueDate(event.target.value)}
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
            </>
          ) : (
            <div className="md:col-span-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Message</p>
              <p className="font-medium text-slate-900">{invoice.notes || "-"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Tax %</TableHead>
                <TableHead>Line Total</TableHead>
                {isEditing ? <TableHead>Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEditing ? (
                <>
                  {lineItems.map((item, index) => (
                    <TableRow key={item.id ?? `editable-${index}`}>
                      <TableCell>
                        <Input
                          value={item.description}
                          placeholder="Description"
                          onChange={(event) =>
                            handleLineItemChange(index, "description", event.target.value)
                          }
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
                      <TableCell>
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
                      <TableCell>
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
                      <TableCell>{(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLineItem(index)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
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
                    <TableCell colSpan={5} />
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

          <div className="mt-6 space-y-1 text-right text-sm text-slate-700">
            <p>
              Subtotal: {invoice.currency}{" "}
              {isEditing ? editedTotals.subtotal.toFixed(2) : invoice.subtotal.toFixed(2)}
            </p>
            <p>
              Tax: {invoice.currency}{" "}
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
    </div>
  );
}
