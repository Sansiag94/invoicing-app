"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function parseLineItems(raw: string | null): LineItemData[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => item as Partial<LineItemData>)
      .filter(
        (item): item is LineItemData =>
          typeof item.description === "string" &&
          typeof item.quantity === "number" &&
          typeof item.unitPrice === "number" &&
          typeof item.taxRate === "number"
      );
  } catch {
    return [];
  }
}

function InvoicePreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const issueDate = searchParams.get("issueDate");
  const dueDate = searchParams.get("dueDate");
  const currency = searchParams.get("currency") || "CHF";
  const lineItems = useMemo(
    () => parseLineItems(searchParams.get("lineItems")),
    [searchParams]
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
    0
  );
  const totalAmount = subtotal + taxAmount;

  const canCreate = Boolean(clientId && issueDate && dueDate && currency && lineItems.length > 0);

  const handleCreateInvoice = async () => {
    if (!canCreate) {
      alert("Missing required preview data. Please return to invoice creation.");
      return;
    }

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
        currency,
        lineItems,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      alert(result?.error ?? "Invoice creation failed");
      return;
    }

    alert("Invoice created successfully!");
    router.push("/invoices");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoice Preview</h1>
        <p className="text-sm text-slate-500">Review before final creation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Client ID</p>
            <p className="font-medium text-slate-900">{clientId || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Currency</p>
            <p className="font-medium text-slate-900">{currency}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Issue Date</p>
            <p className="font-medium text-slate-900">{issueDate || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
            <p className="font-medium text-slate-900">{dueDate || "-"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No line items found in preview data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>VAT %</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={`${item.id ?? item.description}-${index}`}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {currency} {item.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>{item.taxRate.toFixed(2)}</TableCell>
                    <TableCell>
                      {currency} {(item.quantity * item.unitPrice).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-700">
          <p>
            Subtotal: {currency} {subtotal.toFixed(2)}
          </p>
          <p>
            VAT: {currency} {taxAmount.toFixed(2)}
          </p>
          <p className="text-base font-semibold text-slate-900">
            Total: {currency} {totalAmount.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCreateInvoice} disabled={!canCreate}>
          Create Invoice
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}

export default function InvoicePreviewPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="pt-6 text-sm text-slate-600">Loading preview...</CardContent>
        </Card>
      }
    >
      <InvoicePreviewContent />
    </Suspense>
  );
}
