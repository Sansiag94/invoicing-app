"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Eye, Trash2, UserPlus } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function getClientDisplayName(client: ClientSummary): string {
  return client.companyName || client.contactName || client.email;
}

function ClientsPageContent() {
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientSummary | null>(null);
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

  async function handleDeleteClient() {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        alert(result?.error ?? "Failed to delete client");
        return;
      }

      setDeleteTarget(null);
      await fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client");
    } finally {
      setIsDeleting(false);
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
                  <TableRow key={client.id}>
                    <TableCell>{getClientDisplayName(client) || "-"}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.country}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/clients/${client.id}`}>
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.companyName || deleteTarget?.contactName || deleteTarget?.email}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
