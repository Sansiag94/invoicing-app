"use client";

import { useEffect, useState } from "react";
import { BusinessSettingsData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [vatNumber, setVatNumber] = useState("");
  const [iban, setIban] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("");

  async function handleSave() {
    const response = await authenticatedFetch("/api/business", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        address,
        country,
        currency,
        vatNumber,
        iban,
        invoicePrefix,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      alert(result?.error ?? "Failed to update business settings");
      return;
    }

    alert("Business settings updated");
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await authenticatedFetch("/api/business");
      const data = (await res.json()) as BusinessSettingsData;

      if (mounted) {
        setName(data?.name || "");
        setAddress(data?.address || "");
        setCountry(data?.country || "");
        setCurrency(data?.currency || "CHF");
        setVatNumber(data?.vatNumber || "");
        setIban(data?.iban || "");
        setInvoicePrefix(data?.invoicePrefix || "INV");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Business Settings</h1>
      <div>
        <input
          placeholder="Business Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br />
        <br />
        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <br />
        <br />
        <input
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <br />
        <br />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="CHF">CHF</option>
          <option value="EUR">EUR</option>
        </select>
        <br />
        <br />
        <input
          placeholder="VAT Number"
          value={vatNumber}
          onChange={(e) => setVatNumber(e.target.value)}
        />
        <br />
        <br />
        <input
          placeholder="IBAN"
          value={iban}
          onChange={(e) => setIban(e.target.value)}
        />
        <br />
        <br />
        <input
          placeholder="Invoice Prefix"
          value={invoicePrefix}
          onChange={(e) => setInvoicePrefix(e.target.value)}
        />
        <br />
        <br />
        <button onClick={handleSave}>Save Settings</button>
      </div>
    </div>
  );
}
