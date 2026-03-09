"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; 
import Link from "next/link";

export default function InvoiceDetailPage() {
  const params = useParams(); // Use useParams to get params
  const { id } = params; // Get invoice ID from params
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/invoices/${id}`)
        .then((response) => response.json())
        .then((data) => setInvoice(data))
        .catch((error) => console.error("Error fetching invoice:", error));
    }
  }, [id]);

  if (!invoice) return <div>Loading...</div>;

  const totalRevenue = invoice.lineItems.reduce((sum: number, item: any) => sum + item.total, 0); // Adjust for total calculation

  return (
    <div>
      <h1>Invoice Details</h1>
      <h2>Invoice Number: {invoice.invoiceNumber}</h2>
      <h3>Client: {invoice.client.companyName || invoice.client.contactName}</h3>
      <p>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
      <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
      <p>Status: {invoice.status}</p>

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
          {invoice.lineItems.map((item: any, index: number) => (
            <tr key={index}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{item.unitPrice.toFixed(2)}</td>
              <td>{item.taxRate}</td>
              <td>{(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Total Revenue: CHF {totalRevenue.toFixed(2)}</h3>

      {/* Optionally add a button to download the invoice PDF */}
      <Link href={`/api/invoices/${invoice.id}/pdf`}>
        <button>Download PDF</button>
      </Link>
    </div>
  );
}