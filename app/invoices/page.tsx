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
  // Subtotal is now calculated automatically from lineItems
  // const [subtotal, setSubtotal] = useState("");
  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 },
  ]);

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

  // Line items helpers
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 },
    ]);
  };

  const removeLineItem = (index: number) => {
    const updatedLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(updatedLineItems);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updatedLineItems = lineItems.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setLineItems(updatedLineItems);
  };

  // Calculate totals before sending the POST request
  const calculateTotals = () => {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = lineItems.reduce(
      (sum, item) =>
        sum + item.quantity * item.unitPrice * (item.taxRate / 100),
      0
    );
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  };

  async function handleSubmit(e: any) {
    e.preventDefault();

    const userId = await getUserId();
    if (!userId) return;

    if (!clientId || !issueDate || !dueDate) {
      alert("Please fill all fields.");
      return;
    }

    if (
      lineItems.length === 0 ||
      lineItems.some(
        (item) =>
          !item.description ||
          item.quantity <= 0 ||
          item.unitPrice < 0 ||
          item.taxRate < 0
      )
    ) {
      alert(
        "Please ensure all line items have a description, positive quantity, and non-negative prices/tax."
      );
      return;
    }

    const { subtotal, taxAmount, totalAmount } = calculateTotals();

    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        clientId,
        issueDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        lineItems,
        status: DEFAULT_STATUS,
        currency: "CHF",
      }),
    });

    setClientId("");
    setIssueDate("");
    setDueDate("");
    setLineItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 }]);

    fetchInvoices();
  }

  useEffect(() => {
    fetchClients();
    fetchInvoices();
    // eslint-disable-next-line
  }, []);

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

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

        {/* Render a table of line items */}
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Tax %</th>
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
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(index, "quantity", Number(e.target.value))
                    }
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateLineItem(index, "unitPrice", Number(e.target.value))
                    }
                    step="0.01"
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={item.taxRate}
                    onChange={(e) =>
                      updateLineItem(index, "taxRate", Number(e.target.value))
                    }
                    step="0.01"
                    required
                  />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={addLineItem}>
          + Add Line Item
        </button>

        <br />
        <br />

        {/* Display calculated totals */}
        <div>
          <strong>Subtotal:</strong> {subtotal.toFixed(2)} CHF <br />
          <strong>Tax:</strong> {taxAmount.toFixed(2)} CHF <br />
          <strong>Total:</strong> {totalAmount.toFixed(2)} CHF
        </div>

        <br />

        <button type="submit">Create Invoice</button>
      </form>

      <hr style={{ margin: "40px 0" }} />

      <h3>Invoice List</h3>

      {invoices.map((invoice) => (
        <div key={invoice.id}>
          {invoice.invoiceNumber} — {invoice.totalAmount} {invoice.currency} [
          {invoice.status}]
        </div>
      ))}
    </div>
  );
}
