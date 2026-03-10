"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { InvoiceDetails } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      const response = await authenticatedFetch(`/api/invoices/${id}`);
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

  const handleDownloadPdf = async () => {
    try {
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/pdf`);
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        alert(result?.error ?? "Failed to download PDF");
        return;
      }

      const pdfBlob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `invoice_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF");
    }
  };

  const handleSendInvoice = async () => {
    try {
      setIsSending(true);
      const response = await authenticatedFetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to send invoice");
        return;
      }

      setInvoice((current) => (current ? { ...current, status: "sent" } : current));
      alert(result?.message ?? "Invoice sent");
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

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

      <button onClick={handleDownloadPdf}>Download PDF</button>
      <button onClick={handleSendInvoice} disabled={isSending}>
        {isSending ? "Sending..." : "Send Invoice"}
      </button>
    </div>
  );
}
