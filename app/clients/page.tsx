"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; // Import Link from next/link
import { supabase } from "../../utils/supabase";

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [companyName, setCompanyName] = useState("");
    const [contactName, setContactName] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [country, setCountry] = useState("");
    const [vatNumber, setVatNumber] = useState("");

    async function fetchClients() {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return;

        const response = await fetch(`/api/clients?userId=${userId}`);
        const dataClients = await response.json();
        setClients(dataClients);
    }

    async function handleSubmit(e: any) {
        e.preventDefault();
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return;

        console.log("Creating client with:", { userId, companyName, contactName, email, address, country, vatNumber });

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
        console.log("CLIENT CREATE RESPONSE:", result);

        if (!response.ok) {
            alert("Client creation failed");
            console.error(result);
            return;
        }

        // Clear form fields and refresh the client list on success
        setCompanyName("");
        setContactName("");
        setEmail("");
        setAddress("");
        setCountry("");
        setVatNumber("");
        fetchClients();
    }

    useEffect(() => {
        fetchClients();
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
                <br /><br />
                <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Contact Name"
                    required
                />
                <br /><br />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                />
                <br /><br />
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address"
                    required
                />
                <br /><br />
                <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    required
                />
                <br /><br />
                <input
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="VAT Number (optional)"
                />
                <br /><br />
                <button type="submit">Add Client</button>
            </form>
            <hr style={{ margin: "40px 0" }} />
            <h3>Client List</h3>
            {clients.map((client) => (
                <div key={client.id}>
                    <Link href={`/clients/${client.id}`}>
                        {client.companyName || client.contactName}
                    </Link>
                </div>
            ))}
        </div>
    );
}