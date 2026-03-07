"use client";

import { useState } from "react";

export default function Clients() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const createClient = async () => {
    await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessId: "db8eeaf3-eb58-4c38-9fd7-6ccf54d43e97",
        name,
        email,
      }),
    });

    alert("Client created");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Client</h1>

      <input
        placeholder="Client name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Client email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br /><br />

      <button onClick={createClient}>
        Create Client
      </button>
    </div>
  );
}