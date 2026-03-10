"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClientDetails } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      const response = await authenticatedFetch(`/api/clients/${id}`);
      const clientData = (await response.json()) as ClientDetails;

      if (mounted) {
        const safeClient = clientData?.id ? clientData : null;
        setClient(safeClient);

        if (safeClient) {
          setCompanyName(safeClient.companyName ?? "");
          setContactName(safeClient.contactName ?? "");
          setEmail(safeClient.email ?? "");
          setAddress(safeClient.address ?? "");
          setCountry(safeClient.country ?? "");
          setVatNumber(safeClient.vatNumber ?? "");
        }
      }
    })().catch((error) => {
      console.error("Error fetching client:", error);
      if (mounted) setClient(null);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleUpdateClient(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          address,
          country,
          vatNumber,
        }),
      });

      const result = (await response.json()) as ClientDetails & { error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to update client");
        return;
      }

      setClient(result);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating client:", error);
      alert("Failed to update client");
    } finally {
      setIsSaving(false);
    }
  }

  function resetEditValues() {
    if (!client) {
      return;
    }

    setCompanyName(client.companyName ?? "");
    setContactName(client.contactName ?? "");
    setEmail(client.email ?? "");
    setAddress(client.address ?? "");
    setCountry(client.country ?? "");
    setVatNumber(client.vatNumber ?? "");
  }

  async function handleDeleteClient() {
    if (!id || !client || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete client ${client.companyName || client.contactName || client.email}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to delete client");
        return;
      }

      router.push("/clients");
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!client) return <div>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Client Details</h1>

      {!isEditing ? (
        <>
          <h2>Company Name: {client.companyName || "-"}</h2>
          <p>Contact Name: {client.contactName || "-"}</p>
          <p>Email: {client.email}</p>
          <p>Address: {client.address}</p>
          <p>Country: {client.country}</p>
          <p>VAT Number: {client.vatNumber || "-"}</p>

          <button onClick={() => setIsEditing(true)}>Edit Client</button>
          <span style={{ display: "inline-block", width: 12 }} />
          <button onClick={handleDeleteClient} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Client"}
          </button>
        </>
      ) : (
        <form onSubmit={handleUpdateClient}>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company Name (optional)"
          />
          <br />
          <br />
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Contact Name"
          />
          <br />
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <br />
          <br />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            required
          />
          <br />
          <br />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            required
          />
          <br />
          <br />
          <input
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="VAT Number (optional)"
          />
          <br />
          <br />
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Client"}
          </button>
          <span style={{ display: "inline-block", width: 12 }} />
          <button
            type="button"
            onClick={() => {
              resetEditValues();
              setIsEditing(false);
            }}
            disabled={isSaving}
          >
            Cancel
          </button>
        </form>
      )}

      <hr style={{ margin: "40px 0" }} />
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
