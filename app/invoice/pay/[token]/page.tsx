"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { InvoiceDetails } from "@/lib/types";

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

  if (!invoice) return <div>Loading...</div>;

  const subtotal = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = invoice.lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
    0
  );
  const totalAmount = subtotal + taxAmount;

  return (
    <div>
      <h1>Invoice Details</h1>
      {paymentSuccess ? <p>Payment initiated successfully. You can refresh shortly for status.</p> : null}
      {paymentCancelled ? <p>Payment was cancelled.</p> : null}
      {checkoutError ? <p>{checkoutError}</p> : null}
      <h2>Business: {invoice.business.name}</h2>
      <p>Client Name: {invoice.client.companyName || invoice.client.contactName}</p>
      <p>Invoice Number: {invoice.invoiceNumber}</p>
      <p>Status: {invoice.status}</p>
      <p>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
      <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>

      <h3>Line Items</h3>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Tax Rate</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, index) => (
            <tr key={item.id ?? `${item.description}-${index}`}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{item.unitPrice.toFixed(2)}</td>
              <td>{item.taxRate.toFixed(2)}</td>
              <td>{(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Totals</h3>
      <p>Subtotal: {subtotal.toFixed(2)}</p>
      <p>Tax: {taxAmount.toFixed(2)}</p>
      <p>Total Amount: {totalAmount.toFixed(2)}</p>

      <button
        onClick={handleCheckout}
        disabled={isCheckoutLoading || invoice.status === "paid"}
      >
        {isCheckoutLoading
          ? "Redirecting to Stripe..."
          : invoice.status === "paid"
            ? "Invoice already paid"
            : "Pay with card"}
      </button>

      <button onClick={() => window.open(`/api/public/invoice/${token}/pdf`, "_blank")}>
        Download PDF
      </button>
    </div>
  );
}
