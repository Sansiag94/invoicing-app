"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

export default function Clients() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  async function loadUser() {
    console.log("Loading user...");

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Auth error:", error);
      return;
    }

    const id = data.user?.id ?? null;
    console.log("User ID:", id);

    setUserId(id);

    if (id) {
      loadClients(id);
    }
  }

  async function loadClients(uid: string) {
    console.log("Loading clients for:", uid);

    const res = await fetch(`/api/clients?userId=${uid}`);
    const data = await res.json();

    console.log("Clients returned:", data);

    setClients(data);
  }

  async function createClient() {
    if (!userId) return;

    await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        name,
        email,
      }),
    });

    setName("");
    setEmail("");

    loadClients(userId);
  }

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Clients</h1>

      <h3>Create Client</h3>

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

      <hr style={{ margin: "40px 0" }} />

      <h3>Client List</h3>

      {clients.map((client) => (
        <div key={client.id}>
          {client.name} — {client.email}
        </div>
      ))}
    </div>
  );
}