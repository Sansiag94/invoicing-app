"use client";

import { useEffect, useState } from "react";
import { ClientSummary, InvoiceSummary, LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export default function InvoicePage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState("");

  async function fetchInvoices() {
    const res = await authenticatedFetch("/api/invoices");
    const data = (await res.json()) as InvoiceSummary[];
    setInvoices(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [clientsResponse, invoicesResponse] = await Promise.all([
        authenticatedFetch("/api/clients"),
        authenticatedFetch("/api/invoices"),
      ]);

      const loadedClients = (await clientsResponse.json()) as ClientSummary[];
      const loadedInvoices = (await invoicesResponse.json()) as InvoiceSummary[];

      if (mounted) {
        setClients(Array.isArray(loadedClients) ? loadedClients : []);
        setInvoices(Array.isArray(loadedInvoices) ? loadedInvoices : []);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!clientId || !issueDate || !dueDate || lineItems.length === 0) {
      alert("Please complete all required fields.");
      return;
    }

    const response = await authenticatedFetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        issueDate,
        dueDate,
        status: "draft",
        currency: "CHF",
        notes: "",
        lineItems,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result?.error ?? "Invoice creation failed");
      return;
    }

    setLineItems([]);
    setIssueDate("");
    setDueDate("");
    setClientId("");
    await fetchInvoices();
  };

  const addLineItem = () => {
    setLineItems((current) => [
      ...current,
      { description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((current) => current.filter((_, i) => i !== index));
  };

  const updateLineItem = (
    index: number,
    key: keyof LineItemData,
    value: string | number
  ) => {
    setLineItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return { ...item, [key]: value };
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = lineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
      0
    );
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();
  const isCreateButtonDisabled = lineItems.length === 0;

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Invoice</h1>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
        <option value="">Select Client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.companyName || client.contactName || client.email}
          </option>
        ))}
      </select>
      <br />
      <br />

      <input
        type="date"
        value={issueDate}
        onChange={(e) => setIssueDate(e.target.value)}
        placeholder="Issue Date"
        required
      />
      <br />
      <br />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        placeholder="Due Date"
        required
      />
      <br />
      <br />

      <h3>Line Items</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>VAT %</th>
            <th>Total</th>
            <th>Remove</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={item.description}
                  placeholder="Description"
                  onChange={(e) => updateLineItem(index, "description", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.quantity}
                  min={1}
                  onChange={(e) => updateLineItem(index, "quantity", Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.unitPrice}
                  min={0}
                  step="0.01"
                  onChange={(e) => updateLineItem(index, "unitPrice", Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.taxRate}
                  min={0}
                  step="0.1"
                  onChange={(e) => updateLineItem(index, "taxRate", Number(e.target.value))}
                />
              </td>
              <td>{(item.quantity * item.unitPrice).toFixed(2)}</td>
              <td>
                <button onClick={() => removeLineItem(index)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addLineItem}>+ Add Line Item</button>

      <h3 style={{ textAlign: "right" }}>Totals</h3>
      <p style={{ textAlign: "right" }}>Subtotal: CHF {subtotal.toFixed(2)}</p>
      <p style={{ textAlign: "right" }}>VAT: CHF {taxAmount.toFixed(2)}</p>
      <p style={{ textAlign: "right" }}>Total: CHF {totalAmount.toFixed(2)}</p>

      <button disabled={isCreateButtonDisabled} onClick={handleSubmit}>
        Create Invoice
      </button>

      <h3>Invoice List</h3>
      {invoices.length === 0 && <p>No invoices yet</p>}
      {invoices.map((invoice) => (
        <div key={invoice.id} style={{ marginBottom: 10 }}>
          <a href={`/invoices/${invoice.id}`}>
            {invoice.invoiceNumber} - {invoice.totalAmount.toFixed(2)} {invoice.currency} [{invoice.status}]
          </a>
        </div>
      ))}
    </div>
  );
}
