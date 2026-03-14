"use client";

import Link from "next/link";
import { FocusEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarDays, ChevronDown, ChevronUp, Eye, FilePenLine, FileText, Plus, Send, Trash2 } from "lucide-react";
import { BusinessSettingsData, ClientSummary, InvoiceSummary, LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { getInvoiceSenderName } from "@/lib/business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceSenderName, setInvoiceSenderName] = useState("User_name");
  const [businessCurrency, setBusinessCurrency] = useState<"CHF" | "EUR">("CHF");
  const [lineItems, setLineItems] = useState<LineItemData[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState(requestedClientId);
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState(buildInvoiceNotesTemplate("client_first_name", "User_name"));
  const [notesManuallyEdited, setNotesManuallyEdited] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSendingId, setIsSendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createInvoiceRef = useRef<HTMLDivElement | null>(null);
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
    return statusFilter;
  }, [statusFilter]);

  const filteredInvoices = useMemo(() => {
    const statusMatches = (status: string) => {
      if (!statusFilter) return true;
      if (statusFilter === "paid") return status === "paid";
      if (statusFilter === "overdue") return status === "overdue";
      if (statusFilter === "draft") return status === "draft";
      if (statusFilter === "sent") return status === "sent";
      if (statusFilter === "open") return status === "draft" || status === "sent";
      if (statusFilter === "unpaid") return status !== "paid";
      return true;
    };

    const baseInvoices = invoices.filter((invoice) => statusMatches(invoice.status));
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

  async function fetchInvoices() {
    const res = await authenticatedFetch("/api/invoices");
    const data = (await res.json()) as InvoiceRow[];
    setInvoices(Array.isArray(data) ? data : []);
  }

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
      alert("Please complete all required fields.");
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
          subject,
          status: "draft",
          notes,
          lineItems: normalizedLineItems,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.error ?? "Invoice creation failed");
        return;
      }

      setLineItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);
      setIssueDate("");
      setDueDate("");
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

                <div className="flex justify-end">
                  <Button onClick={handleCreateInvoice} disabled={isCreating} className="min-w-[10rem]">
                    {isCreating ? "Creating..." : "Create Invoice"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <Card className="border-slate-200 bg-slate-50/80 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">Quick Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Client</span>
                      </div>
                      {selectedClient ? (
                        <div className="space-y-1 text-slate-700">
                          <p className="font-medium text-slate-900">
                            {selectedClient.companyName || selectedClient.contactName || selectedClient.email}
                          </p>
                          {selectedClient.contactName && selectedClient.companyName ? (
                            <p>{selectedClient.contactName}</p>
                          ) : null}
                          <p>{selectedClient.email}</p>
                          {selectedClient.phone ? <p>{selectedClient.phone}</p> : null}
                          <p>{selectedClient.country}</p>
                        </div>
                      ) : (
                        <p className="text-slate-500">Select a client to see billing details.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarDays className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Schedule</span>
                      </div>
                      <div className="space-y-1 text-slate-700">
                        <p>Issue date: {issueDate || "-"}</p>
                        <p>Due date: {dueDate || "-"}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Totals</span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between text-slate-600">
                          <span>Subtotal</span>
                          <span>{businessCurrency} {totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="mb-2 flex items-center justify-between text-slate-600">
                          <span>Tax</span>
                          <span>{businessCurrency} {totals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                          <span>Total</span>
                          <span>{businessCurrency} {totals.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
            <Button asChild size="sm" variant={statusFilter === "unpaid" ? "default" : "outline"}>
              <Link href="/invoices?status=unpaid">Unpaid</Link>
            </Button>
            <Button asChild size="sm" variant={statusFilter === "overdue" ? "default" : "outline"}>
              <Link href="/invoices?status=overdue">Overdue</Link>
            </Button>
            <Button asChild size="sm" variant={statusFilter === "paid" ? "default" : "outline"}>
              <Link href="/invoices?status=paid">Paid</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getInvoiceClientName(invoice)}</TableCell>
                    <TableCell>
                      {invoice.currency} {invoice.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/invoices/${invoice.id}/preview`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/invoices/${invoice.id}?mode=edit`}>
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

export default function InvoicePage() {
  return (
    <Suspense fallback={<div>Loading invoices...</div>}>
      <InvoicePageContent />
    </Suspense>
  );
}
