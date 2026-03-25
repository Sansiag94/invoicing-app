"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

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
  const { toast } = useToast();
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

  const formatMoney = (value: number) => `${currency} ${value.toFixed(2)}`;

  const handleCreateInvoice = async () => {
    if (!canCreate) {
      toast({
        title: "Missing preview data",
        description: "Please return to invoice creation and complete the required fields.",
        variant: "error",
      });
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
      toast({
        title: "Invoice creation failed",
        description: result?.error ?? "Invoice creation failed",
        variant: "error",
      });
      return;
    }

    toast({
      title: "Invoice created successfully",
      variant: "success",
    });
    router.push("/invoices");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-1 sm:space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Invoice Preview</h1>
        <p className="text-sm leading-6 text-slate-500">Review the invoice before final creation.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Client ID</p>
            <p className="mt-1 break-all font-medium text-slate-900">{clientId || "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Currency</p>
            <p className="mt-1 font-medium text-slate-900">{currency}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Issue Date</p>
            <p className="mt-1 font-medium text-slate-900">{issueDate || "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
            <p className="mt-1 font-medium text-slate-900">{dueDate || "-"}</p>
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
            <>
              <div className="space-y-3 md:hidden">
                {lineItems.map((item, index) => (
                  <div
                    key={`${item.id ?? item.description}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Item {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-900">{item.description}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-white bg-white px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Quantity</p>
                        <p className="mt-1 font-medium text-slate-900">{item.quantity}</p>
                      </div>
                      <div className="rounded-lg border border-white bg-white px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Unit Price</p>
                        <p className="mt-1 font-medium text-slate-900">{formatMoney(item.unitPrice)}</p>
                      </div>
                      <div className="rounded-lg border border-white bg-white px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500">VAT %</p>
                        <p className="mt-1 font-medium text-slate-900">{item.taxRate.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg border border-white bg-white px-3 py-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                        <p className="mt-1 font-medium text-slate-900">
                          {formatMoney(item.quantity * item.unitPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
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
                        <TableCell className="max-w-[26rem] leading-6">{item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell>{item.taxRate.toFixed(2)}</TableCell>
                        <TableCell>{formatMoney(item.quantity * item.unitPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span>Subtotal</span>
            <span className="font-medium text-slate-900">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span>VAT</span>
            <span className="font-medium text-slate-900">{formatMoney(taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-300 bg-slate-100 px-4 py-4 text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatMoney(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleCreateInvoice} disabled={!canCreate} className="w-full sm:w-auto">
          Create Invoice
        </Button>
        <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
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
