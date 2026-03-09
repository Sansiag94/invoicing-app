"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export default function InvoicePage() {
  const [clients, setClients] = useState([]); // State for clients
  const [invoices, setInvoices] = useState<any[]>([]); // Restored state for invoices
  const [lineItems, setLineItems] = useState([]);
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState(""); // State for selected client ID

  // Function to get user ID
  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  };

  // Fetch clients for the dropdown
  async function fetchClients() {
    const userId = await getUserId();
    if (userId) {
      const response = await fetch(`/api/clients?userId=${userId}`);
      const dataClients = await response.json();
      setClients(dataClients);
    }
  }

  // Fetch invoices
  async function fetchInvoices() {
    const userId = await getUserId(); 
    if (userId) {
      const res = await fetch(`/api/invoices?userId=${userId}`);
      const data = await res.json();
      setInvoices(data);
    }
  }

  useEffect(() => {
    fetchClients(); // Fetch clients when the component mounts
    fetchInvoices(); // Fetch invoices
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const userId = await getUserId();
    if (!userId || !clientId) return; // Ensure client is selected

    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        clientId,
        issueDate,
        dueDate,
        currency: "CHF", // Assuming a default currency
        notes: "", // Assuming there might be an optional notes field
        subtotal: 0, // Placeholder value; should be calculated based on lineItems
        taxAmount: 0, // Placeholder value; should be calculated based on lineItems
        totalAmount: 0, // Placeholder value; should be calculated based on lineItems
        lineItems,
      }),
    });

    const result = await response.json();
    console.log("INVOICE CREATE RESPONSE:", result); // Log the response

    if (!response.ok) {
      alert("Invoice creation failed");
      console.error(result); // Log the error data
      return;
    }

    // Clear fields or redirect as needed
    setLineItems([]); // Reset line items
    setIssueDate(""); // Reset issue date
    setDueDate(""); // Reset due date
    setClientId(""); // Reset selected client
    fetchInvoices(); // Refresh invoice list after creation
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, taxRate: 7.7 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  const isCreateButtonDisabled = lineItems.length === 0;

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Invoice</h1>
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        required
      >
        <option value="">Select Client</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.companyName || client.contactName}
          </option>
        ))}
      </select>
      <br /><br />

      <input
        type="date"
        value={issueDate}
        onChange={(e) => setIssueDate(e.target.value)}
        placeholder="Issue Date"
        required
      />
      <br /><br />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        placeholder="Due Date"
        required
      />
      <br /><br />

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
                  onChange={(e) => {
                    const updatedLineItems = [...lineItems];
                    updatedLineItems[index].description = e.target.value;
                    setLineItems(updatedLineItems);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const updatedLineItems = [...lineItems];
                    updatedLineItems[index].quantity = Number(e.target.value);
                    setLineItems(updatedLineItems);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const updatedLineItems = [...lineItems];
                    updatedLineItems[index].unitPrice = Number(e.target.value);
                    setLineItems(updatedLineItems);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.taxRate}
                  onChange={(e) => {
                    const updatedLineItems = [...lineItems];
                    updatedLineItems[index].taxRate = Number(e.target.value);
                    setLineItems(updatedLineItems);
                  }}
                />
              </td>
              <td>
                {(item.quantity * item.unitPrice).toFixed(2)}
              </td>
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

      <button disabled={isCreateButtonDisabled} onClick={handleSubmit}>Create Invoice</button>

      <h3>Invoice List</h3>
      {invoices.length === 0 && (
        <p>No invoices yet</p>
      )}
      {invoices.map((invoice) => (
        <div key={invoice.id} style={{ marginBottom: 10 }}>
          <a href={`/invoices/${invoice.id}`}>
            {invoice.invoiceNumber} — {invoice.totalAmount} {invoice.currency} [{invoice.status}]
          </a>
        </div>
      ))}
    </div>
  );
}