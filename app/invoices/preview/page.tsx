"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export default function InvoicePreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const issueDate = searchParams.get("issueDate");
  const dueDate = searchParams.get("dueDate");
  const currency = searchParams.get("currency");
  const subtotal = parseFloat(searchParams.get("subtotal") || "0");
  const taxAmount = parseFloat(searchParams.get("taxAmount") || "0");
  const totalAmount = parseFloat(searchParams.get("totalAmount") || "0");
  const [lineItems] = useState<LineItemData[]>([]);

  const handleCreateInvoice = async () => {
    if (!clientId || !issueDate || !dueDate || !currency) {
      alert("Missing required invoice data");
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
        <tbody />
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
