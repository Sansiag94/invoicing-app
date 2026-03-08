"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

// The only valid statuses: "draft", "sent", "paid", "overdue"
const DEFAULT_STATUS = "draft";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState("");

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  }

  async function fetchClients() {
    const userId = await getUserId();
    if (!userId) return;

    const response = await fetch(`/api/clients?userId=${userId}`);
    const dataClients = await response.json();

    setClients(dataClients);
  }

  async function fetchInvoices() {
    const userId = await getUserId();
    if (!userId) return;

    const response = await fetch(`/api/invoices?userId=${userId}`);
    const dataInvoices = await response.json();

    setInvoices(dataInvoices);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();

    const userId = await getUserId();
    if (!userId) return;

    if (!clientId || !issueDate || !dueDate || !subtotal) {
      alert("Please fill all fields.");
      return;
    }

    const subtotalValue = Number(subtotal);
    const taxAmount = Number((subtotalValue * 0.1).toFixed(2)); // 10% tax
    const totalAmount = Number((subtotalValue + taxAmount).toFixed(2));

    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        clientId,
        issueDate,
        dueDate,
        subtotal: subtotalValue,
        taxAmount,
        totalAmount,
        status: DEFAULT_STATUS,
        currency: "CHF",
      }),
    });

    setClientId("");
    setIssueDate("");
    setDueDate("");
    setSubtotal("");

    fetchInvoices();
  }

  useEffect(() => {
    fetchClients();
    fetchInvoices();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Invoices</h1>

      <form onSubmit={handleSubmit}>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
        >
          <option value="">Select Client</option>

          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <br />
        <br />

        <input
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
          required
        />

        <br />
        <br />

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />

        <br />
        <br />

        <input
          type="number"
          value={subtotal}
          onChange={(e) => setSubtotal(e.target.value)}
          placeholder="Subtotal"
          required
        />

        <br />
        <br />

        <button type="submit">
          Create Invoice
        </button>
      </form>

      <hr style={{ margin: "40px 0" }} />

      <h3>Invoice List</h3>

      {invoices.map((invoice) => (
        <div key={invoice.id}>
          {invoice.invoiceNumber} — {invoice.totalAmount} {invoice.currency} [{invoice.status}]
        </div>
      ))}
    </div>
  );
}