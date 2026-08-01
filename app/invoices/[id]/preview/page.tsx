"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileCheck2, PencilLine } from "lucide-react";
import UpgradeDialog from "@/components/billing/UpgradeDialog";
import { getBillingLimitDetails } from "@/lib/billingClient";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { BillingLimitDetails, InvoiceDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

function extractPdfFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).replace(/^["']|["']$/g, "");
  }

  const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return basicMatch?.[1] ?? null;
}

export default function InvoicePreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [isMobile, setIsMobile] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [billingLimitDetails, setBillingLimitDetails] = useState<BillingLimitDetails | null>(null);
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);
  const [showIssueConfirmDialog, setShowIssueConfirmDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const activePdfUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  const billingReturnPath = id ? `/invoices/${id}/preview` : "/invoices";

  function handleBillingLimitResponse(payload: { code?: string; details?: unknown }): boolean {
    const details = getBillingLimitDetails(payload);
    if (!details) {
      return false;
    }

    setBillingLimitDetails(details);
    return true;
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
          returnPath: billingReturnPath,
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
          returnPath: billingReturnPath,
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    let isActive = true;
    let objectUrl: string | null = null;

    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const [invoiceResponse, pdfResponse] = await Promise.all([
          authenticatedFetch(`/api/invoices/${id}`),
          authenticatedFetch(`/api/invoices/${id}/pdf`),
        ]);

        if (!invoiceResponse.ok) {
          const result = (await invoiceResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(result?.error ?? "Failed to load invoice");
        }

        if (!pdfResponse.ok) {
          const result = (await pdfResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(result?.error ?? "Failed to load invoice preview");
        }

        const [invoiceData, blob] = await Promise.all([
          invoiceResponse.json() as Promise<InvoiceDetails>,
          pdfResponse.blob(),
        ]);
        const filename = extractPdfFilename(pdfResponse.headers.get("Content-Disposition"));
        const namedBlob = filename ? new File([blob], filename, { type: "application/pdf" }) : blob;
        objectUrl = URL.createObjectURL(namedBlob);

        if (!isActive) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        if (activePdfUrlRef.current) {
          URL.revokeObjectURL(activePdfUrlRef.current);
        }
        activePdfUrlRef.current = objectUrl;
        setInvoice(invoiceData);
        setPdfUrl(objectUrl);
        setPdfFilename(filename);
      } catch (error) {
        console.error("Error loading invoice preview:", error);
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : "Failed to load invoice preview");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id]);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    return () => {
      if (activePdfUrlRef.current) {
        URL.revokeObjectURL(activePdfUrlRef.current);
        activePdfUrlRef.current = null;
      }
    };
  }, []);

  const handleDownloadPdf = () => {
    if (!pdfUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = pdfFilename ?? "invoice.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpenPdfPreview = () => {
    if (!pdfUrl) {
      return;
    }

    window.location.assign(pdfUrl);
  };

  const issueInvoiceNow = async () => {
    if (!id) {
      return;
    }

    try {
      setIsIssuing(true);
      const response = await authenticatedFetch(`/api/invoices/${id}/issue`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        message?: string;
        status?: InvoiceDetails["status"];
        invoiceNumber?: string;
        error?: string;
        code?: string;
        details?: unknown;
      };

      if (!response.ok) {
        if (handleBillingLimitResponse(result)) {
          return;
        }

        toast({
          title: "Failed to issue invoice",
          description: result?.error ?? "Failed to issue invoice",
          variant: "error",
        });
        return;
      }

      setSuccessMessage(result?.message ?? "Final invoice created. Return to the invoice page to send, schedule, or add payment details.");
      window.location.reload();
    } catch (error) {
      console.error("Error issuing invoice:", error);
      toast({
        title: "Failed to issue invoice",
        description: "Failed to issue invoice",
        variant: "error",
      });
    } finally {
      setIsIssuing(false);
    }
  };

  const handleIssueInvoice = () => {
    if (invoice?.status !== "draft") {
      return;
    }

    setShowIssueConfirmDialog(true);
  };

  if (!id) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-600">Invoice preview unavailable.</CardContent>
      </Card>
    );
  }

  const isDraft = invoice?.status === "draft";
  const previewTitle = invoice ? (isDraft ? "Draft Preview" : "Invoice Preview") : "Invoice Preview";
  const previewDescription = invoice
    ? isDraft
      ? "Review the draft PDF before creating the final invoice."
      : "Review the final invoice PDF."
    : "Loading invoice preview...";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/invoices/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to invoice
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{previewTitle}</h1>
              {isDraft ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200">
                  Draft
                </span>
              ) : null}
            </div>
            <p className="text-sm text-slate-500">{previewDescription}</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:w-auto sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
          {isDraft ? (
            <Button
              variant="default"
              onClick={handleIssueInvoice}
              disabled={isIssuing || isLoading}
              className="col-span-2 w-full sm:col-span-1 sm:w-auto"
            >
              <FileCheck2 className="h-4 w-4" />
              {isIssuing ? "Creating..." : "Create Final Invoice"}
            </Button>
          ) : null}
          <Button variant="outline" onClick={handleDownloadPdf} disabled={!pdfUrl || isLoading || isIssuing} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            {isDraft ? "Download Draft PDF" : "Download PDF"}
          </Button>
          {isDraft ? (
            <Button
              variant="outline"
              onClick={() => router.push(`/invoices/${id}?mode=edit`)}
              className="w-full sm:w-auto"
            >
              <PencilLine className="h-4 w-4" />
              Edit Draft
            </Button>
          ) : null}
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loadError ? (
            <div className="px-6 py-8 text-sm text-red-800 dark:text-red-100">{loadError}</div>
          ) : isLoading || !pdfUrl ? (
            <div className="px-6 py-8 text-sm text-slate-600">Loading invoice preview...</div>
          ) : isMobile ? (
            <div className="space-y-4 px-6 py-8">
              <p className="text-sm text-slate-600">
                Open the PDF to inspect the document. Return to the invoice page for sending, scheduling, attachments, and payments.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={handleOpenPdfPreview}>
                  Open PDF Preview
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf} disabled={isIssuing}>
                  <Download className="h-4 w-4" />
                  {invoice?.status === "draft" ? "Download Draft PDF" : "Download PDF"}
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              title="Invoice PDF preview"
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="h-[calc(100vh-12rem)] min-h-[720px] w-full bg-white"
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showIssueConfirmDialog}
        onOpenChange={setShowIssueConfirmDialog}
        title="Create Final Invoice"
        description={
          <>
            Create the final invoice from draft <strong>{invoice?.invoiceNumber}</strong>?
            This assigns the official invoice number and reloads the preview with the final PDF.
          </>
        }
        confirmLabel="Create Final Invoice"
        isConfirming={isIssuing}
        onConfirm={() => {
          setShowIssueConfirmDialog(false);
          void issueInvoiceNow();
        }}
      />

      <UpgradeDialog
        open={Boolean(billingLimitDetails)}
        onOpenChange={(open) => {
          if (!open) {
            setBillingLimitDetails(null);
          }
        }}
        details={billingLimitDetails}
        onUpgrade={() => void openBillingCheckout()}
        onManageBilling={billingLimitDetails?.portalAvailable ? () => void openBillingPortal() : undefined}
        isSubmitting={isOpeningBilling}
      />
    </div>
  );
}
