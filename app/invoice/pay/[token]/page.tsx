"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CreditCard, Download, Building2 } from "lucide-react";
import { InvoiceDetails } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params?.token;
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let mounted = true;

    (async () => {
      const response = await fetch(`/api/public/invoice/${token}`);
      const data = (await response.json()) as InvoiceDetails | { error?: string };

      if (mounted && "error" in data) {
        console.error(data.error);
        setInvoice(null);
        return;
      }

      if (mounted) {
        setInvoice(data as InvoiceDetails);
      }
    })().catch((error) => {
      console.error("Error fetching invoice:", error);
      if (mounted) setInvoice(null);
    });

    return () => {
      mounted = false;
    };
  }, [token]);

  const paymentSuccess = searchParams.get("success") === "true";
  const paymentCancelled = searchParams.get("cancel") === "true";

  const totals = useMemo(() => {
    if (!invoice) return { subtotal: 0, taxAmount: 0, totalAmount: 0 };
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = invoice.lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
      0
    );
    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
  }, [invoice]);

  const handleCheckout = async () => {
    if (!invoice || !token) return;

    try {
      setIsCheckoutLoading(true);
      setCheckoutError(null);

      const response = await fetch(`/api/invoices/${invoice.id}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }

      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not start checkout");
      setIsCheckoutLoading(false);
    }
  };

  if (!invoice) return <div className="mx-auto max-w-5xl p-8 text-slate-600">Loading invoice...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Invoice {invoice.invoiceNumber}</CardTitle>
            <p className="text-sm text-slate-500">
              Status: <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
            </p>
            <p className="text-sm text-slate-500">
              Issue Date: {new Date(invoice.issueDate).toLocaleDateString()} | Due Date:{" "}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>
          {invoice.business.logoUrl ? (
            <img
              src={invoice.business.logoUrl}
              alt={`${invoice.business.name} logo`}
              className="h-20 w-20 rounded-md border border-slate-200 object-contain"
            />
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">From</h3>
            <p className="font-medium">{invoice.business.name}</p>
            <p className="text-sm text-slate-600">{invoice.business.address || "-"}</p>
            <p className="text-sm text-slate-600">VAT: {invoice.business.vatNumber || "-"}</p>
            <p className="text-sm text-slate-600">IBAN: {invoice.business.iban || "-"}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Bill To</h3>
            <p className="font-medium">
              {invoice.client.companyName || invoice.client.contactName || invoice.client.email}
            </p>
            <p className="text-sm text-slate-600">{invoice.client.address || "-"}</p>
            <p className="text-sm text-slate-600">{invoice.client.country || "-"}</p>
          </div>
        </CardContent>
      </Card>

      {paymentSuccess ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6 text-emerald-700">
            Payment completed. Thank you.
          </CardContent>
        </Card>
      ) : null}
      {paymentCancelled ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-amber-700">
            Payment was cancelled.
          </CardContent>
        </Card>
      ) : null}
      {checkoutError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-red-700">{checkoutError}</CardContent>
        </Card>
      ) : null}

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
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item, index) => (
                <TableRow key={item.id ?? `${item.description}-${index}`}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {invoice.currency} {item.unitPrice.toFixed(2)}
                  </TableCell>
                  <TableCell>{item.taxRate.toFixed(2)}</TableCell>
                  <TableCell>
                    {invoice.currency} {(item.quantity * item.unitPrice).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 space-y-1 text-right text-sm text-slate-700">
            <p>
              Subtotal: {invoice.currency} {totals.subtotal.toFixed(2)}
            </p>
            <p>
              Tax: {invoice.currency} {totals.taxAmount.toFixed(2)}
            </p>
            <p className="text-base font-semibold text-slate-900">
              Total: {invoice.currency} {totals.totalAmount.toFixed(2)}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => window.open(`/api/public/invoice/${token}/pdf`, "_blank")} variant="outline">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={handleCheckout} disabled={isCheckoutLoading || invoice.status === "paid"}>
              <CreditCard className="h-4 w-4" />
              {isCheckoutLoading
                ? "Redirecting to Stripe..."
                : invoice.status === "paid"
                  ? "Invoice already paid"
                  : "Pay with Card"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
