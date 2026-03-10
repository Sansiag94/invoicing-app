"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InvoiceDetails, LineItemData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseNumberInput(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateTotals(lineItems: LineItemData[]) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
    0
  );

  return {
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount,
  };
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemData[]>([]);

  const editedTotals = useMemo(() => calculateTotals(lineItems), [lineItems]);

  function loadInvoiceIntoForm(dataInvoice: InvoiceDetails) {
    setIssueDate(toDateInputValue(dataInvoice.issueDate));
    setDueDate(toDateInputValue(dataInvoice.dueDate));
    setNotes(dataInvoice.notes ?? "");
    setLineItems(
      dataInvoice.lineItems.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      }))
    );
  }

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
        loadInvoiceIntoForm(dataInvoice);
      }
    })().catch((error) => {
      console.error("Error fetching invoice:", error);
      if (mounted) setInvoice(null);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!invoice) {
      return;
    }

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
    if (!invoice) {
      return;
    }

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

  const handleAddLineItem = () => {
    setLineItems((current) => [
      ...current,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 7.7,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleLineItemChange = (
    index: number,
    key: keyof LineItemData,
    value: string | number
  ) => {
    setLineItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  };

  const handleCancelEdit = () => {
    if (!invoice) {
      return;
    }

    loadInvoiceIntoForm(invoice);
    setIsEditing(false);
  };

  const handleSaveInvoice = async () => {
    if (!invoice || !id || isSaving) {
      return;
    }

    const hasInvalidLineItems = lineItems.some(
      (item) =>
        !item.description.trim() ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.unitPrice < 0 ||
        item.taxRate < 0
    );

    if (!issueDate || !dueDate) {
      alert("Issue date and due date are required.");
      return;
    }

    if (lineItems.length === 0) {
      alert("Invoice must contain at least one line item.");
      return;
    }

    if (hasInvalidLineItems) {
      alert("Please fix invalid line items before saving.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await authenticatedFetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueDate,
          dueDate,
          notes,
          lineItems: lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })),
        }),
      });

      const result = (await response.json()) as InvoiceDetails & { error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to update invoice");
        return;
      }

      setInvoice(result);
      loadInvoiceIntoForm(result);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("Failed to update invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice || !id || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to delete invoice");
        return;
      }

      router.push("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!invoice) return <div>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <h1>Invoice Details</h1>
      <p>
        <strong>{invoice.invoiceNumber}</strong> | Status: <strong>{invoice.status}</strong>
      </p>
      <p>Client: {invoice.client.companyName || invoice.client.contactName || invoice.client.email}</p>

      {!isEditing ? (
        <>
          <p>Issue Date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
          <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p>Notes: {invoice.notes || "-"}</p>
        </>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <label>
            Issue Date
            <br />
            <input
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
            />
          </label>
          <br />
          <br />
          <label>
            Due Date
            <br />
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <br />
          <br />
          <label>
            Notes
            <br />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              style={{ width: "100%", maxWidth: 700 }}
            />
          </label>
        </div>
      )}

      <h3>Line Items</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Tax Rate</th>
            <th>Line Total</th>
            {isEditing ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {isEditing
            ? lineItems.map((item, index) => (
                <tr key={item.id ?? `editable-${index}`}>
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(event) =>
                        handleLineItemChange(index, "description", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) =>
                        handleLineItemChange(
                          index,
                          "quantity",
                          Math.max(1, Math.trunc(parseNumberInput(event.target.value)))
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        handleLineItemChange(
                          index,
                          "unitPrice",
                          Math.max(0, parseNumberInput(event.target.value))
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={item.taxRate}
                      onChange={(event) =>
                        handleLineItemChange(
                          index,
                          "taxRate",
                          Math.max(0, parseNumberInput(event.target.value))
                        )
                      }
                    />
                  </td>
                  <td>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                  <td>
                    <button type="button" onClick={() => handleRemoveLineItem(index)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            : invoice.lineItems.map((item, index) => (
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

      {isEditing ? (
        <button type="button" onClick={handleAddLineItem}>
          Add Line Item
        </button>
      ) : null}

      <h3>Totals</h3>
      {!isEditing ? (
        <>
          <p>
            Subtotal: {invoice.currency} {invoice.subtotal.toFixed(2)}
          </p>
          <p>
            Tax: {invoice.currency} {invoice.taxAmount.toFixed(2)}
          </p>
          <p>
            Total: {invoice.currency} {invoice.totalAmount.toFixed(2)}
          </p>
        </>
      ) : (
        <>
          <p>
            Subtotal: {invoice.currency} {editedTotals.subtotal.toFixed(2)}
          </p>
          <p>
            Tax: {invoice.currency} {editedTotals.taxAmount.toFixed(2)}
          </p>
          <p>
            Total: {invoice.currency} {editedTotals.totalAmount.toFixed(2)}
          </p>
        </>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)}>Edit Invoice</button>
        ) : (
          <>
            <button onClick={handleSaveInvoice} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Invoice"}
            </button>
            <button onClick={handleCancelEdit} disabled={isSaving}>
              Cancel
            </button>
          </>
        )}

        <button onClick={handleDownloadPdf}>Download PDF</button>
        <button
          onClick={handleSendInvoice}
          disabled={isSending || invoice.status === "paid"}
          title={invoice.status === "paid" ? "Paid invoices cannot be sent" : undefined}
        >
          {isSending ? "Sending..." : "Send Invoice"}
        </button>
        <button onClick={handleDeleteInvoice} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete Invoice"}
        </button>
      </div>
    </div>
  );
}
