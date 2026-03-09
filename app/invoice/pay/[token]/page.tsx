"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { InvoiceDetails } from "@/lib/types";

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);

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
      <h2>Business: {invoice.business.name}</h2>
      <p>Client Name: {invoice.client.companyName || invoice.client.contactName}</p>
      <p>Invoice Number: {invoice.invoiceNumber}</p>
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

      <button onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}>
        Download PDF
      </button>
    </div>
  );
}
