"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Download, Upload, UserPlus } from "lucide-react";
import { buildAddressString } from "@/lib/address";
import { isSupportedCountry } from "@/lib/countries";
import { DEFAULT_INVOICE_LANGUAGE, INVOICE_LANGUAGE_OPTIONS, getInvoiceLanguageLabel } from "@/lib/invoiceLanguage";
import { ClientImportResult, ClientSummary } from "@/lib/types";
import { isValidEmail } from "@/lib/validation";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

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
  const [language, setLanguage] = useState(DEFAULT_INVOICE_LANGUAGE);
  const [vatNumber, setVatNumber] = useState("");
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ClientImportResult | null>(null);
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createClientRef = useRef<HTMLDivElement | null>(null);
  const searchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();
  const { toast } = useToast();

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
          getInvoiceLanguageLabel(client.language),
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

    if (!companyName.trim() && !contactName.trim()) {
      toast({
        title: "Missing client name",
        description: "Add either a company name or a contact name before saving.",
        variant: "error",
      });
      return;
    }

    if (!isValidEmail(email.trim())) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address for the client.",
        variant: "error",
      });
      return;
    }

    if (!isSupportedCountry(country)) {
      toast({
        title: "Invalid country",
        description: "Please select a valid country from the list.",
        variant: "error",
      });
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
          language,
          vatNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "Client creation failed",
          description: result?.error ?? "Client creation failed",
          variant: "error",
        });
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
      setLanguage(DEFAULT_INVOICE_LANGUAGE);
      setVatNumber("");
      setIsCreateFormOpen(false);
      setSuccessMessage("Client created successfully.");
      await fetchClients();
    } catch (error) {
      console.error("Client creation failed:", error);
      toast({
        title: "Client creation failed",
        description: "Client creation failed",
        variant: "error",
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function handleImportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!importFile) {
      toast({
        title: "Choose a CSV file",
        description: "Select the client import template or your completed CSV before importing.",
        variant: "error",
      });
      return;
    }

    setIsImporting(true);

    try {
      const body = new FormData();
      body.append("file", importFile);

      const response = await authenticatedFetch("/api/clients/import", {
        method: "POST",
        body,
      });
      const result = (await response.json()) as ClientImportResult & { error?: string };

      if (!response.ok) {
        toast({
          title: "Client import failed",
          description: result.error ?? "Client import failed",
          variant: "error",
        });
        return;
      }

      setImportResult(result);
      setImportFile(null);
      setSuccessMessage(
        result.createdCount > 0
          ? `Imported ${result.createdCount} client${result.createdCount === 1 ? "" : "s"}.`
          : "Import completed with no new clients added."
      );
      await fetchClients();
    } catch (error) {
      console.error("Client import failed:", error);
      toast({
        title: "Client import failed",
        description: "Client import failed",
        variant: "error",
      });
    } finally {
      setIsImporting(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-sm text-slate-500">Manage your customers and billing contacts.</p>
        </div>
        <Button
          type="button"
          variant={isImportPanelOpen ? "secondary" : "outline"}
          onClick={() => setIsImportPanelOpen((current) => !current)}
          className="w-full sm:w-auto"
        >
          {isImportPanelOpen ? <ChevronUp className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {isImportPanelOpen ? "Hide import" : "Import clients"}
        </Button>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100">
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
                  placeholder="Optional if company name is set"
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
                <p className="text-xs text-slate-500">Choose a country from the list so invoices and payment details stay consistent.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Invoice Language</Label>
                <Select id="language" value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
                  {INVOICE_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-slate-500">This controls the language used on invoice PDFs and client-facing invoice pages.</p>
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
                <Button type="submit" disabled={isCreating} className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4" />
                  {isCreating ? "Saving..." : "Add Client"}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      {isImportPanelOpen ? (
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Import Clients</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Useful when you are moving from a spreadsheet or another invoicing tool. Most
              businesses can ignore this and add clients manually one by one.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Strict CSV template</p>
              <p className="mt-2 text-sm text-slate-600">
                Download the template first, then paste your client list into the exact columns.
                Existing emails are skipped automatically so duplicates stay safe to review later.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="/templates/client-import-template.csv" download>
                    <Download className="h-4 w-4" />
                    Download Template
                  </a>
                </Button>
              </div>
            </div>

            <form
              onSubmit={handleImportSubmit}
              className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
            >
              <div className="space-y-2">
                <Label htmlFor="clientImportFile">Client CSV</Label>
                <Input
                  id="clientImportFile"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setImportResult(null);
                    setImportFile(event.target.files?.[0] ?? null);
                  }}
                />
                <p className="text-xs text-slate-500">
                  Expected headers: `companyName,contactName,email,phone,street,postalCode,city,country,language,vatNumber`
                </p>
              </div>
              <Button type="submit" disabled={isImporting} className="w-full md:w-auto">
                <Upload className="h-4 w-4" />
                {isImporting ? "Importing..." : "Import Clients"}
              </Button>
            </form>

            {importResult ? (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{importResult.createdCount}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duplicates skipped</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{importResult.skippedDuplicateCount}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invalid rows</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{importResult.invalidRowCount}</p>
                  </div>
                </div>

                {importResult.errors.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">Rows to review</p>
                    <div className="space-y-2">
                      {importResult.errors.map((error) => (
                        <div
                          key={`${error.rowNumber}-${error.type}-${error.message}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        >
                          <p className="font-medium text-slate-900">
                            Row {error.rowNumber} - {error.type === "duplicate" ? "Duplicate" : "Invalid"}
                          </p>
                          <p className="mt-1">{error.message}</p>
                          {error.email ? <p className="mt-1 text-xs text-slate-500">{error.email}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
                  <TableHead>Invoice Language</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    role="link"
                    tabIndex={0}
                    onClick={() => handleOpenClient(client.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleOpenClient(client.id);
                      }
                    }}
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
                    <TableCell>{getInvoiceLanguageLabel(client.language)}</TableCell>
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
                  role="link"
                  tabIndex={0}
                  onClick={() => handleOpenClient(client.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenClient(client.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{getClientDisplayName(client) || "-"}</p>
                      <p className="text-sm text-slate-600">{client.email}</p>
                      <p className="text-sm text-slate-600">{client.phone || "-"}</p>
                      <p className="text-sm text-slate-600">{client.country}</p>
                      <p className="text-sm text-slate-600">{getInvoiceLanguageLabel(client.language)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
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
