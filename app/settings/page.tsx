"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink, Moon, RefreshCw, Save, Sun, Trash2, Upload } from "lucide-react";
import BillingStatusCard from "@/components/billing/BillingStatusCard";
import { usePwa } from "@/components/PwaProvider";
import { buildAddressString } from "@/lib/address";
import { formatSequentialInvoiceNumber, parsePostalAddress } from "@/lib/invoice";
import { getInvoiceSenderName } from "@/lib/business";
import { BillingStatus, BusinessSettingsData, InvoiceSenderType } from "@/lib/types";
import { clearPwaAppCache } from "@/lib/pwaCache";
import { isValidBic, isValidEmail, isValidIban } from "@/lib/validation";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { startClientLogout } from "@/utils/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/ui/theme";
import { APP_NAME } from "@/lib/appBrand";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { canInstall, install, installHelpText, isInstalled, showInstallInstructions } = usePwa();
  const [businessId, setBusinessId] = useState("");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [invoiceSenderType, setInvoiceSenderType] = useState<InvoiceSenderType>("company");
  const [nextOfficialInvoiceSequence, setNextOfficialInvoiceSequence] = useState("1");
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
  const [usesPlatformStripe, setUsesPlatformStripe] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeChargesEnabled, setStripeChargesEnabled] = useState(false);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState(false);
  const [stripeDetailsSubmitted, setStripeDetailsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isRefreshingStripe, setIsRefreshingStripe] = useState(false);
  const [isDisconnectingStripe, setIsDisconnectingStripe] = useState(false);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const [isClosingWorkspace, setIsClosingWorkspace] = useState(false);
  const [showDisconnectStripeDialog, setShowDisconnectStripeDialog] = useState(false);
  const [showCloseWorkspaceDialog, setShowCloseWorkspaceDialog] = useState(false);
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
  const normalizedNextOfficialInvoiceSequence = (() => {
    const parsed = Number(nextOfficialInvoiceSequence);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  })();
  const nextOfficialInvoicePreview = formatSequentialInvoiceNumber(
    "CL",
    new Date(),
    normalizedNextOfficialInvoiceSequence
  );
  const isStripeFullyEnabled =
    stripeChargesEnabled && stripePayoutsEnabled && stripeDetailsSubmitted;
  const stripeStatusTone = !usesPlatformStripe && !stripeAccountId
    ? "border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    : isStripeFullyEnabled
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200"
      : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200";
  const stripeStatusLabel = usesPlatformStripe
    ? isStripeFullyEnabled
      ? "Platform Stripe account active"
      : "Platform Stripe account needs attention"
    : !stripeAccountId
      ? "Stripe not connected"
      : isStripeFullyEnabled
        ? "Stripe ready to accept payments"
        : "Stripe connected, onboarding incomplete";
  const stripeStatusDescription = usesPlatformStripe
    ? "This business charges directly on your platform Stripe account. Stripe Connect onboarding is skipped for it."
    : !stripeAccountId
      ? "Connect Stripe only if you want this business to accept card payments online."
      : isStripeFullyEnabled
        ? "Card payments are enabled for this business."
        : "Stripe still needs some onboarding or verification before card payments can be accepted.";
  const stripePendingSteps = [
    !stripeDetailsSubmitted ? "finish Stripe account details" : null,
    !stripeChargesEnabled ? "enable charges" : null,
    !stripePayoutsEnabled ? "enable payouts" : null,
  ].filter(Boolean) as string[];
  const handleConnectStripeEvent = useEffectEvent(() => {
    void handleConnectStripe();
  });
  const refreshStripeStatusEvent = useEffectEvent(() => {
    void refreshStripeStatus({ showSuccessToast: true });
  });

  async function fetchBillingStatus() {
    const response = await authenticatedFetch("/api/billing/status");
    const result = (await response.json()) as BillingStatus & { error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "Could not load billing status");
    }

    setBillingStatus(result);
  }

  async function openBillingCheckout() {
    setIsOpeningBilling(true);

    try {
      const response = await authenticatedFetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnPath: "/settings",
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not open billing checkout");
      }

      window.location.assign(result.url);
    } catch (error) {
      toast({
        title: "Unable to open checkout",
        description: error instanceof Error ? error.message : "Could not open billing checkout",
        variant: "error",
      });
      setIsOpeningBilling(false);
    }
  }

  async function openBillingPortal() {
    setIsOpeningBilling(true);

    try {
      const response = await authenticatedFetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnPath: "/settings",
        }),
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not open billing portal");
      }

      window.location.assign(result.url);
    } catch (error) {
      toast({
        title: "Unable to open billing portal",
        description: error instanceof Error ? error.message : "Could not open billing portal",
        variant: "error",
      });
      setIsOpeningBilling(false);
    }
  }

  async function saveBusinessSettings(
    options?: {
      logoUrlOverride?: string | null;
      successMessage?: string;
    }
  ) {
    if (!name.trim() || !street.trim() || !postalCode.trim() || !city.trim() || !country.trim()) {
      toast({
        title: "Missing required fields",
        description: "Business name, street, postal code, city, and country are required.",
        variant: "error",
      });
      return null;
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      toast({
        title: "Invalid business email",
        description: "Enter a valid business email address or leave it blank.",
        variant: "error",
      });
      return null;
    }

    if (iban.trim() && !isValidIban(iban.trim())) {
      toast({
        title: "Invalid IBAN",
        description: "Enter a valid IBAN or leave the field blank.",
        variant: "error",
      });
      return null;
    }

    if (bic.trim() && !isValidBic(bic.trim())) {
      toast({
        title: "Invalid BIC / SWIFT",
        description: "Enter a valid BIC / SWIFT code or leave the field blank.",
        variant: "error",
      });
      return null;
    }

    if (!Number.isInteger(Number(nextOfficialInvoiceSequence)) || Number(nextOfficialInvoiceSequence) <= 0) {
      toast({
        title: "Invalid next invoice number",
        description: "Enter a whole number greater than 0 for the next official invoice number.",
        variant: "error",
      });
      return null;
    }

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
        nextOfficialInvoiceSequence: Number(nextOfficialInvoiceSequence),
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
    setNextOfficialInvoiceSequence(String(updatedBusiness.nextOfficialInvoiceSequence || 1));
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
    setUsesPlatformStripe(Boolean(updatedBusiness.usesPlatformStripe));
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

  async function handleInstallApp() {
    const outcome = await install();

    if (outcome === "accepted") {
      toast({
        title: "App installed",
        description: `${APP_NAME} is now available from your device home screen.`,
        variant: "success",
      });
      return;
    }

    if (outcome === "dismissed") {
      toast({
        title: "Install dismissed",
        description: "You can install the app later from the browser menu or prompt.",
        variant: "info",
      });
      return;
    }

    toast({
      title: "Install instructions",
      description: installHelpText,
      variant: "info",
    });
  }

  async function refreshStripeStatus(options?: { showSuccessToast?: boolean }) {
    setIsRefreshingStripe(true);

    try {
      const response = await authenticatedFetch("/api/business/stripe/status");
      const result = (await response.json()) as {
        usesPlatformStripe?: boolean;
        stripeAccountId?: string | null;
        stripeChargesEnabled?: boolean;
        stripePayoutsEnabled?: boolean;
        stripeDetailsSubmitted?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not refresh Stripe status");
      }

      setUsesPlatformStripe(Boolean(result.usesPlatformStripe));
      setStripeAccountId(result.stripeAccountId || null);
      setStripeChargesEnabled(Boolean(result.stripeChargesEnabled));
      setStripePayoutsEnabled(Boolean(result.stripePayoutsEnabled));
      setStripeDetailsSubmitted(Boolean(result.stripeDetailsSubmitted));

      if (options?.showSuccessToast) {
        const isPlatform = Boolean(result.usesPlatformStripe);
        const isReady =
          Boolean(result.stripeChargesEnabled) &&
          Boolean(result.stripePayoutsEnabled) &&
          Boolean(result.stripeDetailsSubmitted);

        toast({
          title: isPlatform
            ? isReady
              ? "Platform Stripe account active"
              : "Platform Stripe account needs attention"
            : result.stripeAccountId
              ? isReady
                ? "Stripe account connected"
                : "Stripe setup still incomplete"
              : "Stripe not connected",
          description: isPlatform
            ? "This business uses your app-wide Stripe account for card payments."
            : result.stripeAccountId
              ? isReady
                ? "Card payments are ready for this business."
                : "Finish the remaining Stripe onboarding steps to accept card payments."
              : "This business can still use bank transfer and QR-bill payments.",
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

  async function disconnectStripeNow() {
    if (!stripeAccountId || usesPlatformStripe) {
      return;
    }

    setIsDisconnectingStripe(true);

    try {
      const response = await authenticatedFetch("/api/business/stripe/disconnect", {
        method: "POST",
      });
      const result = (await response.json()) as {
        usesPlatformStripe?: boolean;
        stripeAccountId?: string | null;
        stripeChargesEnabled?: boolean;
        stripePayoutsEnabled?: boolean;
        stripeDetailsSubmitted?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not disconnect Stripe");
      }

      setUsesPlatformStripe(Boolean(result.usesPlatformStripe));
      setStripeAccountId(result.stripeAccountId || null);
      setStripeChargesEnabled(Boolean(result.stripeChargesEnabled));
      setStripePayoutsEnabled(Boolean(result.stripePayoutsEnabled));
      setStripeDetailsSubmitted(Boolean(result.stripeDetailsSubmitted));
      setShowDisconnectStripeDialog(false);

      toast({
        title: "Stripe disconnected",
        description: "This business can now connect a different Stripe account.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Unable to disconnect Stripe",
        description: error instanceof Error ? error.message : "Could not disconnect Stripe",
        variant: "error",
      });
    } finally {
      setIsDisconnectingStripe(false);
    }
  }

  async function closeWorkspaceNow() {
    setIsClosingWorkspace(true);

    try {
      const response = await authenticatedFetch("/api/account/close", {
        method: "POST",
      });
      const result = (await response.json()) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not close workspace");
      }

      startClientLogout();
      void clearPwaAppCache();
      router.replace("/login?workspace=closed");
    } catch (error) {
      toast({
        title: "Unable to close workspace",
        description: error instanceof Error ? error.message : "Could not close workspace",
        variant: "error",
      });
    } finally {
      setShowCloseWorkspaceDialog(false);
      setIsClosingWorkspace(false);
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
      try {
        const [businessResponse, billingResponse] = await Promise.all([
          authenticatedFetch("/api/business"),
          authenticatedFetch("/api/billing/status"),
        ]);
        const data = (await businessResponse.json()) as BusinessSettingsData;
        const billingData = (await billingResponse.json()) as BillingStatus;
        const parsedAddress = parsePostalAddress(data?.address, data?.country);

        if (mounted) {
          setBusinessId(data?.id || "");
          setName(data?.name || "");
          setOwnerName(data?.ownerName || "");
          setInvoiceSenderType(data?.invoiceSenderType || "company");
          setNextOfficialInvoiceSequence(String(data?.nextOfficialInvoiceSequence || 1));
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
          setUsesPlatformStripe(Boolean(data?.usesPlatformStripe));
          setStripeAccountId(data?.stripeAccountId || null);
          setStripeChargesEnabled(Boolean(data?.stripeChargesEnabled));
          setStripePayoutsEnabled(Boolean(data?.stripePayoutsEnabled));
          setStripeDetailsSubmitted(Boolean(data?.stripeDetailsSubmitted));
          setBillingStatus(billingData);
        }
      } catch (error) {
        console.error("Error loading settings page data:", error);
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
      handleConnectStripeEvent();
      window.history.replaceState({}, "", "/settings");
      return;
    }

    if (stripeQueryStatus !== "connected") {
      return;
    }

    refreshStripeStatusEvent();
    window.history.replaceState({}, "", "/settings");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const billingQueryStatus = new URLSearchParams(window.location.search).get("billing");
    if (!billingQueryStatus) {
      return;
    }

    void fetchBillingStatus().catch((error) => {
      console.error("Unable to refresh billing status:", error);
    });

    toast({
      title: billingQueryStatus === "success" ? "Subscription updated" : "Checkout cancelled",
      description:
        billingQueryStatus === "success"
          ? "Your workspace billing status has been refreshed."
          : "No changes were made to your subscription.",
      variant: billingQueryStatus === "success" ? "success" : "info",
    });
    window.history.replaceState({}, "", "/settings");
  }, [toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">Workspace details, payments, appearance, and account controls</p>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace profile</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Business identity</h2>
          <p className="mt-1 text-sm text-slate-500">
            This information appears on invoices, public invoice pages, and payment instructions.
          </p>
        </div>
        <Card>
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Logo</p>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Business logo"
                    className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
                    No logo
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild variant="secondary" disabled={isUploadingLogo}>
                  <label>
                    <Upload className="h-4 w-4" />
                    {isUploadingLogo ? "Uploading..." : "Upload logo"}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRemoveLogo}
                  disabled={isSaving || isUploadingLogo || !logoUrl}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove logo
                </Button>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Stored in <strong>{logosBucket}</strong>. Keep the bucket public so invoices can render the logo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <p className="text-xs text-slate-500">Use the 8 or 11 character bank code, for example `RAIFCH22XXX`.</p>
              </div>
              <div className="md:col-span-2">
                <Button onClick={handleSave} disabled={isSaving || isUploadingLogo} className="w-full sm:w-auto">
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save workspace profile"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Invoice setup</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Numbering and sender preview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Check this section before you send the first official invoice from the workspace.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Numbering</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nextOfficialInvoiceSequence">Next Official Invoice Number</Label>
                <Input
                  id="nextOfficialInvoiceSequence"
                  type="number"
                  min="1"
                  step="1"
                  value={nextOfficialInvoiceSequence}
                  onChange={(event) => setNextOfficialInvoiceSequence(event.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Continue from your existing numbering if you already invoiced elsewhere. To continue
                  from invoice 29, enter 29 here before sending the first official invoice.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Preview with today&apos;s date
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{nextOfficialInvoicePreview}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Official invoice numbers use the first 2 letters of the client company or first name.
                  Draft invoices keep a temporary draft number until they become official.
                </p>
              </div>
              <div className="md:col-span-2">
                <Button onClick={handleSave} disabled={isSaving || isUploadingLogo} className="w-full sm:w-auto">
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save invoice setup"}
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
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payments & billing</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Card payments and billing</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use Stripe for card payments and manage the workspace plan here.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Payments</CardTitle>
              <p className="text-sm text-slate-500">Card payments are optional. Bank transfer and Swiss QR bills work without Stripe.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-600" />
                      <p className="font-semibold text-slate-900">
                        {usesPlatformStripe
                          ? "Platform Stripe account"
                          : stripeAccountId
                            ? "Stripe account connected"
                            : "Optional card payments"}
                      </p>
                    </div>
                    <p className="max-w-2xl text-sm text-slate-600">
                      Connect Stripe only if this business wants to accept card payments online.
                      Bank transfers and Swiss QR bills work without it.
                    </p>
                    <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stripeStatusTone}`}>
                      {stripeStatusLabel}
                    </div>
                    <p className="max-w-2xl text-sm text-slate-600">{stripeStatusDescription}</p>
                    {stripePendingSteps.length > 0 ? (
                      <p className="text-xs text-slate-500">
                        Still pending in Stripe: {stripePendingSteps.join(", ")}.
                      </p>
                    ) : null}
                    {!usesPlatformStripe && !stripeAccountId ? (
                      <p className="text-xs text-slate-500">
                        You can skip this for now and keep using invoices with bank transfer details or Swiss QR bills.
                      </p>
                    ) : null}
                    {usesPlatformStripe ? (
                      <p className="text-xs text-slate-500">
                        This workspace uses the app-wide platform Stripe account, so disconnecting is not available here.
                      </p>
                    ) : null}
                    {stripeAccountId ? (
                      <p className="text-xs text-slate-500">
                        {usesPlatformStripe ? "Platform" : "Connected"} account ID:{" "}
                        <span className="font-mono">{stripeAccountId}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    {!usesPlatformStripe && !isStripeFullyEnabled ? (
                      <Button
                        onClick={() => void handleConnectStripe()}
                        disabled={isConnectingStripe}
                        className="w-full sm:w-auto"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {isConnectingStripe
                          ? "Opening Stripe..."
                          : stripeAccountId
                            ? "Continue Stripe setup"
                            : "Connect Stripe"}
                      </Button>
                    ) : null}
                    {(usesPlatformStripe || stripeAccountId) ? (
                      <Button
                        variant="secondary"
                        onClick={() => void refreshStripeStatus({ showSuccessToast: true })}
                        disabled={isRefreshingStripe || isDisconnectingStripe}
                        className="w-full sm:w-auto"
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

          <BillingStatusCard
            title="Plan & Billing"
            description="Free includes 3 issued invoices per calendar month. Upgrade to Pro for CHF 19/month to issue unlimited invoices."
            billingStatus={billingStatus}
            onUpgrade={() => void openBillingCheckout()}
            onManageBilling={() => void openBillingPortal()}
            isSubmitting={isOpeningBilling}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Help</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Open the guide when you need it</h2>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Step-by-step help guide</p>
              <p className="text-sm text-slate-500">
                Use the guide for setup steps, invoice numbering, Stripe, expenses, and client import questions.
              </p>
              {billingStatus?.supportEmail ? (
                <p className="text-sm text-slate-500">
                  Support:{" "}
                  <a
                    href={`mailto:${billingStatus.supportEmail}`}
                    className="font-medium text-slate-700 underline underline-offset-4"
                  >
                    {billingStatus.supportEmail}
                  </a>
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/help?from=settings">Open help guide</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">App preferences</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Device and appearance</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>App Install</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">
                    {isInstalled
                      ? "Installed on this device"
                      : canInstall
                        ? "Ready to install"
                        : showInstallInstructions
                          ? "Install from your browser menu"
                          : "Open in a supported browser to install"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Installing gives {APP_NAME} its own home-screen icon and a cleaner app-like window.
                    Core pages and the offline screen are cached for weak connections.
                  </p>
                  {!isInstalled ? <p className="text-xs text-slate-500">{installHelpText}</p> : null}
                </div>
                {!isInstalled ? (
                  <Button onClick={() => void handleInstallApp()} className="w-full sm:w-auto">
                    {canInstall ? "Install App" : "Show Install Steps"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label htmlFor="themeToggle">Dark mode</Label>
                  <p className="text-sm text-slate-500">
                    Switch the workspace between light and dark.
                  </p>
                </div>
                <button
                  id="themeToggle"
                  type="button"
                  aria-pressed={theme === "dark"}
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex w-full items-center justify-between rounded-full border px-3 py-2 text-sm font-medium transition-colors sm:min-w-44 sm:w-auto"
                  style={{
                    borderColor: theme === "dark" ? "#475569" : "#cbd5e1",
                    backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
                    color: theme === "dark" ? "#f8fafc" : "#0f172a",
                  }}
                >
                  <span className="flex items-center gap-2">
                    {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {theme === "dark" ? "Dark mode" : "Light mode"}
                  </span>
                  <span
                    className="relative h-6 w-11 overflow-hidden rounded-full transition-colors"
                    style={{
                      backgroundColor: theme === "dark" ? "#334155" : "#cbd5e1",
                    }}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-all ${
                        theme === "dark" ? "left-0.5" : "left-[22px]"
                      }`}
                      style={{ backgroundColor: "#ffffff" }}
                    />
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Danger Zone</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Access and workspace controls</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use these actions when you need to change account access, connected payments, or workspace status.
          </p>
        </div>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-900">Change password</p>
                <p className="mt-2 text-sm text-slate-600">
                  Open the password reset flow for this account if you want to replace your current login password.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => router.push("/settings/password")}
                  className="mt-4 w-full sm:w-auto"
                >
                  Change password
                </Button>
              </div>

              <div className="rounded-xl border border-red-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-900">Disconnect Stripe account</p>
                <p className="mt-2 text-sm text-slate-600">
                  Remove the connected Stripe account from this workspace. Card payments will stop until
                  you connect a new account.
                </p>
                {!usesPlatformStripe && stripeAccountId ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisconnectStripeDialog(true)}
                    disabled={isDisconnectingStripe || isConnectingStripe || isRefreshingStripe}
                    className="mt-4 w-full sm:w-auto"
                  >
                    {isDisconnectingStripe ? "Disconnecting..." : "Disconnect Stripe"}
                  </Button>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">
                    {usesPlatformStripe
                      ? "This workspace uses the platform Stripe account and cannot disconnect it here."
                      : "No Stripe account is currently connected to this workspace."}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-red-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-900">Close workspace</p>
                <p className="mt-2 text-sm text-slate-600">
                  Self-serve hard deletion is disabled because invoice, payment, expense, and accounting
                  records may need to be retained for bookkeeping, tax, and audit reasons.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowCloseWorkspaceDialog(true)}
                  disabled={isClosingWorkspace || isDisconnectingStripe}
                  className="mt-4 w-full sm:w-auto"
                >
                  {isClosingWorkspace ? "Closing workspace..." : "Close workspace now"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">Before you close the workspace</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Export or archive the invoices, expenses, and payment records your business still needs.</li>
                <li>Disconnect Stripe first if you no longer want this workspace tied to a payment account.</li>
                <li>Use closure only when you are ready to remove access while retained records remain protected.</li>
                <li>Keep legal retention duties in mind before asking for any personal-data deletion.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="/imprint">View imprint</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/privacy">Review privacy policy</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <ConfirmDialog
        open={showDisconnectStripeDialog}
        onOpenChange={setShowDisconnectStripeDialog}
        title="Disconnect Stripe"
        description="Disconnect this Stripe account from the business? Card payments will stop until a new Stripe account is connected."
        confirmLabel="Disconnect Stripe"
        confirmVariant="destructive"
        isConfirming={isDisconnectingStripe}
        onConfirm={() => {
          void disconnectStripeNow();
        }}
      />
      <ConfirmDialog
        open={showCloseWorkspaceDialog}
        onOpenChange={setShowCloseWorkspaceDialog}
        title="Close workspace"
        description="Close this workspace now? Access will be removed, Stripe will be disconnected where applicable, and legally required records may still be retained."
        confirmLabel="Close workspace"
        confirmVariant="destructive"
        isConfirming={isClosingWorkspace}
        onConfirm={() => {
          void closeWorkspaceNow();
        }}
      />
    </div>
  );
}
