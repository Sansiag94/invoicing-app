"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Upload, Trash2, Save } from "lucide-react";
import { BusinessSettingsData } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function SettingsPage() {
  const [businessId, setBusinessId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [vatNumber, setVatNumber] = useState("");
  const [iban, setIban] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const logosBucket = process.env.NEXT_PUBLIC_SUPABASE_LOGOS_BUCKET?.trim() || "business-logos";

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
        address,
        country,
        currency,
        vatNumber,
        iban,
        invoicePrefix,
        logoUrl: options?.logoUrlOverride ?? logoUrl,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      setIsSaving(false);
      alert(result?.error ?? "Failed to update business settings");
      return null;
    }

    const updatedBusiness = (await response.json()) as BusinessSettingsData;
    setBusinessId(updatedBusiness.id);
    setName(updatedBusiness.name || "");
    setAddress(updatedBusiness.address || "");
    setCountry(updatedBusiness.country || "");
    setCurrency(updatedBusiness.currency || "CHF");
    setVatNumber(updatedBusiness.vatNumber || "");
    setIban(updatedBusiness.iban || "");
    setInvoicePrefix(updatedBusiness.invoicePrefix || "INV");
    setLogoUrl(updatedBusiness.logoUrl || "");
    setIsSaving(false);

    if (options?.successMessage) {
      alert(options.successMessage);
    }

    return updatedBusiness;
  }

  async function handleSave() {
    await saveBusinessSettings({ successMessage: "Business settings updated" });
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!businessId) {
      alert("Load business settings first.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
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
        alert(uploadResult.error ?? `Failed to upload logo to bucket "${logosBucket}".`);
        return;
      }

      setLogoUrl(uploadResult.logoUrl);
      alert("Logo uploaded and saved.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    const updatedBusiness = await saveBusinessSettings({
      logoUrlOverride: null,
    });

    if (updatedBusiness) {
      alert("Logo removed.");
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await authenticatedFetch("/api/business");
      const data = (await res.json()) as BusinessSettingsData;

      if (mounted) {
        setBusinessId(data?.id || "");
        setName(data?.name || "");
        setAddress(data?.address || "");
        setCountry(data?.country || "");
        setCurrency(data?.currency || "CHF");
        setVatNumber(data?.vatNumber || "");
        setIban(data?.iban || "");
        setInvoicePrefix(data?.invoicePrefix || "INV");
        setLogoUrl(data?.logoUrl || "");
      }
    })();

    return () => {
      mounted = false;
    };
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
          <CardTitle>Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} />
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
            <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
            <Input
              id="invoicePrefix"
              value={invoicePrefix}
              onChange={(event) => setInvoicePrefix(event.target.value)}
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
    </div>
  );
}
