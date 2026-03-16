"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { buildAddressString } from "@/lib/address";
import { parsePostalAddress } from "@/lib/invoice";
import { getInvoiceSenderName } from "@/lib/business";
import { BusinessSettingsData, InvoiceSenderType } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export default function SettingsPage() {
  const [businessId, setBusinessId] = useState("");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [invoiceSenderType, setInvoiceSenderType] = useState<InvoiceSenderType>("company");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [bankName, setBankName] = useState("");
  const [bic, setBic] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [vatNumber, setVatNumber] = useState("");
  const [iban, setIban] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeChargesEnabled, setStripeChargesEnabled] = useState(false);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState(false);
  const [stripeDetailsSubmitted, setStripeDetailsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isRefreshingStripe, setIsRefreshingStripe] = useState(false);
  const { toast } = useToast();

  const logosBucket = process.env.NEXT_PUBLIC_SUPABASE_LOGOS_BUCKET?.trim() || "business-logos";
  const previewAddressLines = [
    street.trim(),
    [postalCode.trim(), city.trim()].filter(Boolean).join(" "),
    country.trim(),
  ].filter(Boolean);
  const previewDisplayName = getInvoiceSenderName({
    name,
    ownerName,
    invoiceSenderType,
  });
  const isStripeFullyEnabled =
    stripeChargesEnabled && stripePayoutsEnabled && stripeDetailsSubmitted;

  async function saveBusinessSettings(
    options?: {
      logoUrlOverride?: string | null;
      successMessage?: string;
    }
  ) {
    setIsSaving(true);

    const response = await authenticatedFetch("/api/business", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        ownerName,
        invoiceSenderType,
        address: buildAddressString({ street, postalCode, city }),
        street,
        postalCode,
        city,
        phone,
        email,
        website,
        bankName,
        bic,
        country,
        currency,
        vatNumber,
        iban,
        logoUrl: options?.logoUrlOverride ?? logoUrl,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      setIsSaving(false);
      toast({
        title: "Unable to save settings",
        description: result?.error ?? "Failed to update business settings",
        variant: "error",
      });
      return null;
    }

    const updatedBusiness = (await response.json()) as BusinessSettingsData;
    setBusinessId(updatedBusiness.id);
    setName(updatedBusiness.name || "");
    setOwnerName(updatedBusiness.ownerName || "");
    setInvoiceSenderType(updatedBusiness.invoiceSenderType || "company");
    setStreet(updatedBusiness.street || "");
    setPostalCode(updatedBusiness.postalCode || "");
    setCity(updatedBusiness.city || "");
    setPhone(updatedBusiness.phone || "");
    setEmail(updatedBusiness.email || "");
    setWebsite(updatedBusiness.website || "");
    setBankName(updatedBusiness.bankName || "");
    setBic(updatedBusiness.bic || "");
    setCountry(updatedBusiness.country || "");
    setCurrency(updatedBusiness.currency || "CHF");
    setVatNumber(updatedBusiness.vatNumber || "");
    setIban(updatedBusiness.iban || "");
    setLogoUrl(updatedBusiness.logoUrl || "");
    setStripeAccountId(updatedBusiness.stripeAccountId || null);
    setStripeChargesEnabled(Boolean(updatedBusiness.stripeChargesEnabled));
    setStripePayoutsEnabled(Boolean(updatedBusiness.stripePayoutsEnabled));
    setStripeDetailsSubmitted(Boolean(updatedBusiness.stripeDetailsSubmitted));
    setIsSaving(false);

    if (options?.successMessage) {
      toast({
        title: options.successMessage,
        variant: "success",
      });
    }

    return updatedBusiness;
  }

  async function handleSave() {
    await saveBusinessSettings({ successMessage: "Business settings updated" });
  }

  async function refreshStripeStatus(options?: { showSuccessToast?: boolean }) {
    setIsRefreshingStripe(true);

    try {
      const response = await authenticatedFetch("/api/business/stripe/status");
      const result = (await response.json()) as {
        stripeAccountId?: string | null;
        stripeChargesEnabled?: boolean;
        stripePayoutsEnabled?: boolean;
        stripeDetailsSubmitted?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not refresh Stripe status");
      }

      setStripeAccountId(result.stripeAccountId || null);
      setStripeChargesEnabled(Boolean(result.stripeChargesEnabled));
      setStripePayoutsEnabled(Boolean(result.stripePayoutsEnabled));
      setStripeDetailsSubmitted(Boolean(result.stripeDetailsSubmitted));

      if (options?.showSuccessToast) {
        toast({
          title: result.stripeChargesEnabled
            ? "Stripe account connected"
            : "Stripe status refreshed",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Unable to refresh Stripe status",
        description: error instanceof Error ? error.message : "Could not refresh Stripe status",
        variant: "error",
      });
    } finally {
      setIsRefreshingStripe(false);
    }
  }

  async function handleConnectStripe() {
    setIsConnectingStripe(true);

    try {
      const response = await authenticatedFetch("/api/business/stripe/connect", {
        method: "POST",
      });
      const result = (await response.json()) as {
        redirectUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.redirectUrl) {
        throw new Error(result.error ?? "Could not connect Stripe");
      }

      window.location.assign(result.redirectUrl);
    } catch (error) {
      toast({
        title: "Unable to start Stripe onboarding",
        description: error instanceof Error ? error.message : "Could not connect Stripe",
        variant: "error",
      });
      setIsConnectingStripe(false);
    }
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!businessId) {
      toast({
        title: "Load business settings first",
        variant: "error",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file.",
        variant: "error",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      const uploadBody = new FormData();
      uploadBody.append("file", file);

      const uploadResponse = await authenticatedFetch("/api/business/logo", {
        method: "POST",
        body: uploadBody,
      });

      const uploadResult = (await uploadResponse.json()) as {
        success?: boolean;
        logoUrl?: string;
        error?: string;
      };

      if (!uploadResponse.ok || !uploadResult.logoUrl) {
        toast({
          title: "Logo upload failed",
          description:
            uploadResult.error ?? `Failed to upload logo to bucket "${logosBucket}".`,
          variant: "error",
        });
        return;
      }

      setLogoUrl(uploadResult.logoUrl);
      toast({
        title: "Logo uploaded",
        description: "The business logo was uploaded successfully.",
        variant: "success",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    const updatedBusiness = await saveBusinessSettings({
      logoUrlOverride: null,
    });

    if (updatedBusiness) {
      toast({
        title: "Logo removed",
        variant: "success",
      });
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await authenticatedFetch("/api/business");
      const data = (await res.json()) as BusinessSettingsData;
      const parsedAddress = parsePostalAddress(data?.address, data?.country);

      if (mounted) {
        setBusinessId(data?.id || "");
        setName(data?.name || "");
        setOwnerName(data?.ownerName || "");
        setInvoiceSenderType(data?.invoiceSenderType || "company");
        setStreet(data?.street || parsedAddress.street || "");
        setPostalCode(data?.postalCode || parsedAddress.postalCode || "");
        setCity(data?.city || parsedAddress.city || "");
        setPhone(data?.phone || "");
        setEmail(data?.email || "");
        setWebsite(data?.website || "");
        setBankName(data?.bankName || "");
        setBic(data?.bic || "");
        setCountry(data?.country || "");
        setCurrency(data?.currency || "CHF");
        setVatNumber(data?.vatNumber || "");
        setIban(data?.iban || "");
        setLogoUrl(data?.logoUrl || "");
        setStripeAccountId(data?.stripeAccountId || null);
        setStripeChargesEnabled(Boolean(data?.stripeChargesEnabled));
        setStripePayoutsEnabled(Boolean(data?.stripePayoutsEnabled));
        setStripeDetailsSubmitted(Boolean(data?.stripeDetailsSubmitted));
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stripeQueryStatus = new URLSearchParams(window.location.search).get("stripe");
    if (stripeQueryStatus === "refresh") {
      void handleConnectStripe();
      window.history.replaceState({}, "", "/settings");
      return;
    }

    if (stripeQueryStatus !== "connected") {
      return;
    }

    void refreshStripeStatus({ showSuccessToast: true });
    window.history.replaceState({}, "", "/settings");
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Business Settings</h1>
        <p className="text-sm text-slate-500">Branding and invoice defaults</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Business logo"
              className="h-40 w-40 rounded-md border border-slate-200 object-contain"
            />
          ) : (
            <p className="text-sm text-slate-500">No logo uploaded.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" disabled={isUploadingLogo}>
              <label>
                <Upload className="h-4 w-4" />
                {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </Button>

            <Button
              variant="destructive"
              onClick={handleRemoveLogo}
              disabled={isSaving || isUploadingLogo || !logoUrl}
            >
              <Trash2 className="h-4 w-4" />
              Remove Logo
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            Bucket: <strong>{logosBucket}</strong>. Configure it as public for invoice rendering.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                  <p className="font-semibold text-slate-900">
                    {stripeAccountId ? "Stripe account connected" : "Connect Stripe to accept card payments"}
                  </p>
                </div>
                <p className="max-w-2xl text-sm text-slate-600">
                  Each business can connect its own Stripe account. Card payments for invoices will only be available after Stripe onboarding is completed.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 ${stripeAccountId ? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-500"}`}>
                    Account {stripeAccountId ? "created" : "not connected"}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${stripeDetailsSubmitted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    Details {stripeDetailsSubmitted ? "submitted" : "pending"}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${stripeChargesEnabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    Charges {stripeChargesEnabled ? "enabled" : "pending"}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${stripePayoutsEnabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    Payouts {stripePayoutsEnabled ? "enabled" : "pending"}
                  </span>
                </div>
                {stripeAccountId ? (
                  <p className="text-xs text-slate-500">
                    Connected account ID: <span className="font-mono">{stripeAccountId}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {!isStripeFullyEnabled ? (
                  <Button onClick={() => void handleConnectStripe()} disabled={isConnectingStripe}>
                    <ExternalLink className="h-4 w-4" />
                    {isConnectingStripe
                      ? "Opening Stripe..."
                      : stripeAccountId
                        ? "Continue Stripe setup"
                        : "Connect Stripe"}
                  </Button>
                ) : null}
                {stripeAccountId ? (
                  <Button
                    variant="secondary"
                    onClick={() => void refreshStripeStatus({ showSuccessToast: true })}
                    disabled={isRefreshingStripe}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshingStripe ? "animate-spin" : ""}`} />
                    {isRefreshingStripe ? "Refreshing..." : "Refresh status"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerName">Person Name</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceSenderType">Invoice Sender</Label>
            <Select
              id="invoiceSenderType"
              value={invoiceSenderType}
              onChange={(event) => setInvoiceSenderType(event.target.value as InvoiceSenderType)}
            >
              <option value="company">Company name</option>
              <option value="owner">Owner name</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="street">Street</Label>
            <Input id="street" value={street} onChange={(event) => setStreet(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} />
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
            <Label htmlFor="email">Business Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={country} onChange={(event) => setCountry(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="CHF">CHF</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatNumber">VAT Number</Label>
            <Input id="vatNumber" value={vatNumber} onChange={(event) => setVatNumber(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" value={iban} onChange={(event) => setIban(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bic">BIC / SWIFT</Label>
            <Input
              id="bic"
              value={bic}
              onChange={(event) => setBic(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleSave} disabled={isSaving || isUploadingLogo}>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Sender Preview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Header sender</p>
            <p className="font-semibold text-slate-900">{name || "Business name"}</p>
            {ownerName && ownerName !== name ? <p className="text-sm text-slate-600">{ownerName}</p> : null}
            {previewAddressLines.map((line) => (
              <p key={`header-${line}`} className="text-sm text-slate-700">
                {line}
              </p>
            ))}
            {email ? <p className="mt-2 text-sm text-slate-700">{email}</p> : null}
            {phone ? <p className="text-sm text-slate-700">{phone}</p> : null}
            {website ? <p className="text-sm text-slate-700">{website}</p> : null}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment recipient</p>
            <p className="font-semibold text-slate-900">{previewDisplayName || "Recipient name"}</p>
            {previewAddressLines.map((line) => (
              <p key={`recipient-${line}`} className="text-sm text-slate-700">
                {line}
              </p>
            ))}
            {iban ? <p className="mt-2 text-sm text-slate-700">{iban}</p> : null}
            {bankName ? <p className="text-sm text-slate-700">{bankName}</p> : null}
            {bic ? <p className="text-sm text-slate-700">BIC / SWIFT: {bic}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
