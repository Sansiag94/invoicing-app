"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; 
import Link from "next/link";

export default function ClientDetailPage() {
  const params = useParams(); // Use useParams to get params
  const { id } = params; // Get client ID from params
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetch(`/api/clients/${id}`)
        .then((response) => response.json())
        .then((data) => setClient(data))
        .catch((error) => console.error("Error fetching client:", error));
    }
  }, [id]);

  if (!client) return <div>Loading...</div>;

  return (
    <div>
      <h1>Client Details</h1>
      <h2>Company Name: {client.companyName}</h2>
      <p>Contact Name: {client.contactName}</p>
      <p>Email: {client.email}</p>
      <p>Address: {client.address}</p>
      <p>Country: {client.country}</p>
      <p>VAT Number: {client.vatNumber}</p>

      <h3>Invoices</h3>
      <table>
        <thead>
          <tr>
            <th>Invoice Number</th>
            <th>Status</th>
            <th>Total Amount</th>
            <th>Currency</th>
          </tr>
        </thead>
        <tbody>
          {client.invoices.map((invoice: any, index: number) => (
            <tr key={index}>
              <td>
                <Link href={`/invoices/${invoice.id}`}>
                  {invoice.invoiceNumber}
                </Link>
              </td>
              <td>{invoice.status}</td>
              <td>{invoice.totalAmount.toFixed(2)}</td>
              <td>{invoice.currency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}