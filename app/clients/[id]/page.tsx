"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { ClientDetails } from "@/lib/types";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [client, setClient] = useState<ClientDetails | null>(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";

      const response = await fetch(`/api/clients/${id}${query}`);
      const clientData = (await response.json()) as ClientDetails;

      if (mounted) {
        setClient(clientData?.id ? clientData : null);
      }
    })().catch((error) => {
      console.error("Error fetching client:", error);
      if (mounted) setClient(null);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (!client) return <div>Loading...</div>;

  return (
    <div>
      <h1>Client Details</h1>
      <h2>Company Name: {client.companyName || "-"}</h2>
      <p>Contact Name: {client.contactName || "-"}</p>
      <p>Email: {client.email}</p>
      <p>Address: {client.address}</p>
      <p>Country: {client.country}</p>
      <p>VAT Number: {client.vatNumber || "-"}</p>

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
          {client.invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <Link href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
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
