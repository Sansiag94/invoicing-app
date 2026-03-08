"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [clientId, setClientId] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [total, setTotal] = useState("");

    async function fetchInvoices() {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return;

        const response = await fetch(`/api/invoices?userId=${userId}`);
        const dataInvoices = await response.json();
        setInvoices(dataInvoices);
    }

    async function handleSubmit(e: any) {
        e.preventDefault();
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return;

        await fetch("/api/invoices", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId,
                clientId,
                invoiceNumber,
                issueDate,
                dueDate,
                total: Number(total),
                status: "Pending", // Add status
                currency: "CHF", // Updated currency to CHF
            }),
        });

        // Clear form fields
        setClientId("");
        setInvoiceNumber("");
        setIssueDate("");
        setDueDate("");
        setTotal("");

        // Refresh the invoices list
        fetchInvoices();
    }

    useEffect(() => {
        fetchInvoices();
    }, []);

    return (
        <div style={{ padding: 40 }}>
            <h1>Invoices</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Client ID"
                    required
                />
                <br /><br />
                <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Invoice Number"
                    required
                />
                <br /><br />
                <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                />
                <br /><br />
                <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                />
                <br /><br />
                <input
                    type="number"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    placeholder="Total"
                    required
                />
                <br /><br />
                <button type="submit">Create Invoice</button>
            </form>
            <hr style={{ margin: "40px 0" }} />
            <h3>Invoice List</h3>
            {invoices.map((invoice) => (
                <div key={invoice.id}>
                    {invoice.invoiceNumber} — {invoice.total} {invoice.currency}
                </div>
            ))}
        </div>
    );
}