"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export default function InvoicePreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get query parameters
  const clientId = searchParams.get("clientId");
  const issueDate = searchParams.get("issueDate");
  const dueDate = searchParams.get("dueDate");
  const currency = searchParams.get("currency");
  const subtotal = parseFloat(searchParams.get("subtotal") || "0");
  const taxAmount = parseFloat(searchParams.get("taxAmount") || "0");
  const totalAmount = parseFloat(searchParams.get("totalAmount") || "0");
  const [lineItems, setLineItems] = useState<any[]>([]); // consider fetching lineItems if relevant

  const handleCreateInvoice = async () => {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;

    await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        clientId,
        issueDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        status: "draft", // Default status
        currency,
        lineItems, // Pass lineItems
      }),
    });

    alert("Invoice created successfully!");
    router.push("/invoices"); // Redirect to invoice list after successful creation
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Invoice Preview</h1>
      <h2>Client: {clientId}</h2>
      <p>Issue Date: {issueDate}</p>
      <p>Due Date: {dueDate}</p>

      <h3>Line Items</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>VAT %</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {/* Map through lineItems here if they're fetched or passed */}
        </tbody>
      </table>

      <h3>Totals</h3>
      <p>Subtotal: CHF {subtotal.toFixed(2)}</p>
      <p>VAT: CHF {taxAmount.toFixed(2)}</p>
      <p>Total: CHF {totalAmount.toFixed(2)}</p>

      <button onClick={handleCreateInvoice}>Create Invoice</button>
      <button onClick={() => router.back()}>Cancel</button>
    </div>
  );
}