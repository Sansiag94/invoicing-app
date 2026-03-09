"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PublicInvoicePage() {
  const router = useRouter();
  const { token } = router.query; // Reading token from URL parameters
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetch(`/api/public/invoice/${token}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            console.error(data.error);
            // Handle the error case here, e.g., show a message or redirect
          } else {
            setInvoice(data);
          }
        })
        .catch((error) => console.error("Error fetching invoice:", error));
    }
  }, [token]);

  if (!invoice) return <div>Loading...</div>;

  const subtotal = invoice.lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = invoice.lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
  const totalAmount = subtotal + taxAmount;

  return (
    <div>
      <h1>Invoice Details</h1>
      <h2>Business: {invoice.business.name}</h2>
      <p>Client Name: {invoice.client.name}</p>
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
          {invoice.lineItems.map((item: any, index: number) => (
            <tr key={index}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>{item.unitPrice}</td>
              <td>{item.taxRate}</td>
              <td>{(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Totals</h3>
      <p>Subtotal: {subtotal.toFixed(2)}</p>
      <p>Tax: {taxAmount.toFixed(2)}</p>
      <p>Total Amount: {totalAmount.toFixed(2)}</p>

      {/* Download PDF Button */}
      <button onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`)}>Download PDF</button>
    </div>
  );
}