"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { buildAddressString } from "@/lib/address";
import { isSupportedCountry } from "@/lib/countries";
import { ClientSummary } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function getClientDisplayName(client: ClientSummary): string {
  return client.companyName || client.contactName || client.email;
}

function ClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createClientRef = useRef<HTMLDivElement | null>(null);
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;

    return clients
      .filter((client) => {
        const searchable = [
          client.companyName ?? "",
          client.contactName ?? "",
          client.email,
          client.phone ?? "",
          client.country,
          client.vatNumber ?? "",
        ].join(" ");

        return searchable.toLowerCase().includes(searchQuery);
      })
      .sort((left, right) =>
        getClientDisplayName(left).localeCompare(getClientDisplayName(right), undefined, {
          sensitivity: "base",
        })
      );
  }, [clients, searchQuery]);

  async function fetchClients() {
    const response = await authenticatedFetch("/api/clients");

    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      throw new Error(result.error ?? "Failed to load clients");
    }

    const dataClients = (await response.json()) as ClientSummary[];
    setClients(Array.isArray(dataClients) ? dataClients : []);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isSupportedCountry(country)) {
      alert("Please select a valid country from the list.");
      return;
    }

    setIsCreating(true);

    try {
      const response = await authenticatedFetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          address: buildAddressString({ street, postalCode, city }),
          street,
          postalCode,
          city,
          country,
          vatNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.error ?? "Client creation failed");
        return;
      }

      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setStreet("");
      setPostalCode("");
      setCity("");
      setCountry("");
      setVatNumber("");
      setIsCreateFormOpen(false);
      setSuccessMessage("Client created successfully.");
      await fetchClients();
    } catch (error) {
      console.error("Client creation failed:", error);
      alert("Client creation failed");
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await authenticatedFetch("/api/clients");
        const dataClients = (await response.json()) as ClientSummary[];
        if (mounted) {
          setClients(Array.isArray(dataClients) ? dataClients : []);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        if (mounted) {
          setClients([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const handleOpenClient = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="text-sm text-slate-500">Manage your customers and billing contacts.</p>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <Card ref={createClientRef}>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Add Client</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateFormOpen((current) => !current)}>
            {isCreateFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isCreateFormOpen ? "Close" : "Add New"}
          </Button>
        </CardHeader>
        {isCreateFormOpen ? (
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input id="street" value={street} onChange={(event) => setStreet(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <CountryCombobox
                  id="country"
                  value={country}
                  onChange={setCountry}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  value={vatNumber}
                  onChange={(event) => setVatNumber(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={isCreating}>
                  <UserPlus className="h-4 w-4" />
                  {isCreating ? "Saving..." : "Add Client"}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Table</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">No clients yet</p>
              <p className="text-sm text-slate-600">Create your first client to start invoicing.</p>
              <Button
                onClick={() => {
                  setIsCreateFormOpen(true);
                  createClientRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Create Client
              </Button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-900">No clients match your search</p>
              <p className="text-sm text-slate-600">
                Try a different search term for name, email, phone, country, or VAT number.
              </p>
            </div>
          ) : (
            <>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => handleOpenClient(client.id)}
                  >
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-slate-900 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {getClientDisplayName(client) || "-"}
                      </Link>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.country}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/invoices?clientId=${client.id}`} onClick={(event) => event.stopPropagation()}>
                          Create Invoice
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50"
                  onClick={() => handleOpenClient(client.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{getClientDisplayName(client) || "-"}</p>
                      <p className="text-sm text-slate-600">{client.email}</p>
                      <p className="text-sm text-slate-600">{client.phone || "-"}</p>
                      <p className="text-sm text-slate-600">{client.country}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/invoices?clientId=${client.id}`} onClick={(event) => event.stopPropagation()}>
                        Create Invoice
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div>Loading clients...</div>}>
      <ClientsPageContent />
    </Suspense>
  );
}
