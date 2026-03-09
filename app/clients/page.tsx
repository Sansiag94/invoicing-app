"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";
import { ClientSummary } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  async function fetchClients() {
    const userId = await getUserId();
    if (!userId) return;

    const response = await fetch(`/api/clients?userId=${encodeURIComponent(userId)}`);
    const dataClients = (await response.json()) as ClientSummary[];
    setClients(Array.isArray(dataClients) ? dataClients : []);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userId = await getUserId();
    if (!userId) return;

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        companyName,
        contactName,
        email,
        address,
        country,
        vatNumber,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result?.error ?? "Client creation failed");
      return;
    }

    setCompanyName("");
    setContactName("");
    setEmail("");
    setAddress("");
    setCountry("");
    setVatNumber("");
    await fetchClients();
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = await getUserId();
      if (!userId) return;
      const response = await fetch(`/api/clients?userId=${encodeURIComponent(userId)}`);
      const dataClients = (await response.json()) as ClientSummary[];
      if (mounted) {
        setClients(Array.isArray(dataClients) ? dataClients : []);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Clients</h1>
      <form onSubmit={handleSubmit}>
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
        <button type="submit">Add Client</button>
      </form>
      <hr style={{ margin: "40px 0" }} />
      <h3>Client List</h3>
      {clients.map((client) => (
        <div key={client.id}>
          <Link href={`/clients/${client.id}`}>
            {client.companyName || client.contactName || client.email}
          </Link>
        </div>
      ))}
    </div>
  );
}
