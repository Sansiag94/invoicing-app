"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { InvoiceDetails } from "@/lib/types";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const currentUserId = data.user?.id ?? null;
      if (!mounted) return;
      setUserId(currentUserId);

      const query = currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : "";
      const response = await fetch(`/api/invoices/${id}${query}`);
      const dataInvoice = (await response.json()) as InvoiceDetails;

      if (mounted && !dataInvoice?.id) {
        setInvoice(null);
        return;
      }

      if (mounted) {
        setInvoice(dataInvoice);
      }
    })().catch((error) => {
      console.error("Error fetching invoice:", error);
      if (mounted) setInvoice(null);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (!invoice) return <div>Loading...</div>;

  const totalRevenue = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const pdfUrl = userId
    ? `/api/invoices/${invoice.id}/pdf?userId=${encodeURIComponent(userId)}`
    : `/api/invoices/${invoice.id}/pdf`;

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
          {invoice.lineItems.map((item, index) => (
            <tr key={item.id ?? `${item.description}-${index}`}>
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

      <Link href={pdfUrl}>
        <button>Download PDF</button>
      </Link>
    </div>
  );
}
