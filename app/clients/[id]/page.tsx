"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { buildAddressString } from "@/lib/address";
import { parsePostalAddress } from "@/lib/invoice";
import { isSupportedCountry } from "@/lib/countries";
import { ClientDetails } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { ArrowLeft, Building2, PencilLine, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function statusVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "sent") return "warning";
  return "default";
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await authenticatedFetch(`/api/clients/${id}`);
        const clientData = (await response.json()) as ClientDetails | { error?: string };

        if (!response.ok || ("error" in clientData && clientData.error)) {
          throw new Error(("error" in clientData ? clientData.error : null) ?? "Failed to load client");
        }

        if (mounted) {
          const safeClient = (clientData as ClientDetails)?.id ? (clientData as ClientDetails) : null;
          setClient(safeClient);

          if (safeClient) {
            const parsedAddress = parsePostalAddress(safeClient.address ?? "", safeClient.country ?? "");
            setCompanyName(safeClient.companyName ?? "");
            setContactName(safeClient.contactName ?? "");
            setEmail(safeClient.email ?? "");
            setPhone(safeClient.phone ?? "");
            setStreet(safeClient.street ?? parsedAddress.street ?? "");
            setPostalCode(safeClient.postalCode ?? parsedAddress.postalCode ?? "");
            setCity(safeClient.city ?? parsedAddress.city ?? "");
            setCountry(safeClient.country ?? "");
            setVatNumber(safeClient.vatNumber ?? "");
          }
        }
      } catch (error) {
        console.error("Error fetching client:", error);
        if (mounted) {
          setClient(null);
          setLoadError("Unable to load this client.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleUpdateClient(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id) {
      return;
    }

    if (!isSupportedCountry(country)) {
      alert("Please select a valid country from the list.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${id}`, {
        method: "PATCH",
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

      const result = (await response.json()) as ClientDetails & { error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to update client");
        return;
      }

      setClient(result);
      setIsEditing(false);
      setSuccessMessage("Client updated successfully.");
    } catch (error) {
      console.error("Error updating client:", error);
      alert("Failed to update client");
    } finally {
      setIsSaving(false);
    }
  }

  function resetEditValues() {
    if (!client) {
      return;
    }

    setCompanyName(client.companyName ?? "");
    setContactName(client.contactName ?? "");
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    const parsedAddress = parsePostalAddress(client.address ?? "", client.country ?? "");
    setStreet(client.street ?? parsedAddress.street ?? "");
    setPostalCode(client.postalCode ?? parsedAddress.postalCode ?? "");
    setCity(client.city ?? parsedAddress.city ?? "");
    setCountry(client.country ?? "");
    setVatNumber(client.vatNumber ?? "");
  }

  async function handleDeleteClient() {
    if (!id || !client || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await authenticatedFetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to delete client");
        return;
      }

      setShowDeleteDialog(false);
      router.push("/clients");
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client");
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-600">Loading client details...</CardContent>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card className={loadError ? "border-red-200 bg-red-50" : undefined}>
        <CardContent className={`pt-6 ${loadError ? "text-red-700" : "text-slate-600"}`}>
          {loadError ?? "Client not found."}
        </CardContent>
      </Card>
    );
  }

  const displayName = client.companyName || client.contactName || client.email;
  const openInvoices = client.invoices.filter((invoice) => invoice.status !== "paid");
  const outstandingTotal = openInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const outstandingCurrency = openInvoices[0]?.currency ?? client.invoices[0]?.currency ?? "CHF";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
              Back to clients
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <p className="text-sm text-slate-500">Client profile and related invoices</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <PencilLine className="h-4 w-4" />
              Edit Client
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                resetEditValues();
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              Cancel Edit
            </Button>
          )}
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
            <Trash2 className="h-4 w-4" />
            Delete Client
          </Button>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Company Name</p>
              <p className="font-medium text-slate-900">{client.companyName || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Contact Name</p>
              <p className="font-medium text-slate-900">{client.contactName || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{client.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
              <p className="font-medium text-slate-900">{client.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Country</p>
              <p className="font-medium text-slate-900">{client.country}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Address</p>
              <p className="font-medium text-slate-900">
                {client.street || parsePostalAddress(client.address, client.country).street}
                <br />
                {(client.postalCode || parsePostalAddress(client.address, client.country).postalCode) +
                  " " +
                  (client.city || parsePostalAddress(client.address, client.country).city)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">VAT Number</p>
              <p className="font-medium text-slate-900">{client.vatNumber || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Invoices</p>
              <p className="text-2xl font-semibold text-slate-900">{client.invoices.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Open Invoices</p>
              <p className="text-2xl font-semibold text-slate-900">{openInvoices.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding</p>
              <p className="text-2xl font-semibold text-slate-900">
                {outstandingCurrency} {outstandingTotal.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateClient} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  type="text"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="Optional"
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
                <Label htmlFor="country">Country</Label>
                <CountryCombobox
                  id="country"
                  value={country}
                  onChange={setCountry}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input id="street" type="text" value={street} onChange={(event) => setStreet(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" type="text" value={city} onChange={(event) => setCity(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  type="text"
                  value={vatNumber}
                  onChange={(event) => setVatNumber(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Client"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link href="/invoices">Create Invoice</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {client.invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <Building2 className="h-6 w-6 text-slate-400" />
              <p className="text-base font-medium text-slate-900">No invoices for this client yet</p>
              <p className="text-sm text-slate-600">Create one directly with this client preselected.</p>
              <Button asChild size="sm">
                <Link href={`/invoices?clientId=${client.id}`}>Create Invoice</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.currency} {invoice.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/invoices/${invoice.id}`}>View Invoice</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Delete <strong>{displayName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
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
