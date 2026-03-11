"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FilePenLine, Plus, Send, Trash2 } from "lucide-react";
import { ClientSummary, InvoiceSummary, LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type InvoiceRow = InvoiceSummary & {
  client?: {
    companyName: string | null;
    contactName: string | null;
    email: string;
  };
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

export default function InvoicePage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 },
  ]);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSendingId, setIsSendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createInvoiceRef = useRef<HTMLDivElement | null>(null);

  async function fetchInvoices() {
    const res = await authenticatedFetch("/api/invoices");
    const data = (await res.json()) as InvoiceRow[];
    setInvoices(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [clientsResponse, invoicesResponse] = await Promise.all([
          authenticatedFetch("/api/clients"),
          authenticatedFetch("/api/invoices"),
        ]);

        const loadedClients = (await clientsResponse.json()) as ClientSummary[];
        const loadedInvoices = (await invoicesResponse.json()) as InvoiceRow[];

        if (mounted) {
          setClients(Array.isArray(loadedClients) ? loadedClients : []);
          setInvoices(Array.isArray(loadedInvoices) ? loadedInvoices : []);
        }
      } catch (error) {
        console.error("Error loading invoice page data:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
      0
    );

    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
  }, [lineItems]);

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
      { description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((current) => current.filter((_, i) => i !== index));
  };

  const handleCreateInvoice = async () => {
    if (!clientId || !issueDate || !dueDate || lineItems.length === 0) {
      alert("Please complete all required fields.");
      return;
    }

    const hasInvalidLineItems = lineItems.some(
      (item) =>
        !item.description.trim() ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.taxRate < 0
    );

    if (hasInvalidLineItems) {
      alert("Please complete valid line item values.");
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
          status: "draft",
          notes: "",
          lineItems,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.error ?? "Invoice creation failed");
        return;
      }

      setLineItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 }]);
      setIssueDate("");
      setDueDate("");
      setClientId("");
      setSuccessMessage("Invoice created successfully.");
      await fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Invoice creation failed");
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
        alert(result.error ?? "Failed to delete invoice");
        return;
      }

      setDeleteTarget(null);
      await fetchInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setIsSendingId(invoiceId);

    try {
      const response = await authenticatedFetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        alert(result.error ?? "Failed to send invoice");
        return;
      }

      setSuccessMessage("Invoice sent successfully.");
      await fetchInvoices();
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice");
    } finally {
      setIsSendingId(null);
    }
  };

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-sm text-slate-500">Create invoices and manage their lifecycle.</p>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <Card ref={createInvoiceRef}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create Invoice</CardTitle>
          <Button variant="secondary" onClick={addLineItem}>
            <Plus className="h-4 w-4" />
            Add Line Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
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
                onChange={(event) => setIssueDate(event.target.value)}
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
                      min={1}
                      value={item.quantity}
                      onChange={(event) =>
                        updateLineItem(index, "quantity", Math.max(1, Math.trunc(parseNumber(event.target.value))))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
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
            </TableBody>
          </Table>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              <p>Subtotal: CHF {totals.subtotal.toFixed(2)}</p>
              <p>Tax: CHF {totals.taxAmount.toFixed(2)}</p>
              <p className="font-semibold text-slate-900">Total: CHF {totals.totalAmount.toFixed(2)}</p>
            </div>
            <Button onClick={handleCreateInvoice} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Table</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">No invoices yet</p>
              <p className="text-sm text-slate-600">Create your first invoice to start billing clients.</p>
              <Button
                onClick={() => createInvoiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                Create Invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      {invoice.client?.companyName ||
                        invoice.client?.contactName ||
                        invoice.client?.email ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      {invoice.currency} {invoice.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/invoices/${invoice.id}`}>
                            <FilePenLine className="h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(invoice)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={invoice.status === "paid" || isSendingId === invoice.id}
                          onClick={() => handleSendInvoice(invoice.id)}
                        >
                          <Send className="h-4 w-4" />
                          {isSendingId === invoice.id ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
}
