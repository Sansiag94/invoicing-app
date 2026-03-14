"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Copy, Download, PencilLine, RotateCcw, Send, Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { InvoiceDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const activePdfUrlRef = useRef<string | null>(null);

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

  const handleSendInvoice = async () => {
    if (!id) {
      return;
    }

    try {
      setIsSending(true);
      const response = await authenticatedFetch(`/api/invoices/${id}/send`, {
        method: "POST",
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to send invoice");
        return;
      }

      setInvoice((current) => (current ? { ...current, status: "sent" } : current));
      router.push("/invoices");
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

  const handleManualStatusChange = async (nextStatus: "paid" | "unpaid") => {
    if (!id || isUpdatingStatus) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const response = await authenticatedFetch(`/api/invoices/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json()) as (InvoiceDetails & { error?: string });

      if (!response.ok) {
        alert(result?.error ?? "Failed to update invoice status");
        return;
      }

      setInvoice(result);
      setSuccessMessage(nextStatus === "paid" ? "Invoice marked as paid." : "Invoice reopened as unpaid.");
    } catch (error) {
      console.error("Error updating invoice status:", error);
      alert("Failed to update invoice status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDuplicateInvoice = async () => {
    if (!id || isDuplicating) {
      return;
    }

    try {
      setIsDuplicating(true);
      const response = await authenticatedFetch(`/api/invoices/${id}/duplicate`, {
        method: "POST",
      });
      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !result?.id) {
        alert(result?.error ?? "Failed to duplicate invoice");
        return;
      }

      router.push(`/invoices/${result.id}/preview`);
    } catch (error) {
      console.error("Error duplicating invoice:", error);
      alert("Failed to duplicate invoice");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!id || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await authenticatedFetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        alert(result?.error ?? "Failed to delete invoice");
        return;
      }

      setShowDeleteDialog(false);
      router.push("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!id) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-slate-600">Invoice preview unavailable.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" />
              Back to invoices
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice Preview</h1>
            <p className="text-sm text-slate-500">Rendered from the actual invoice PDF.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-sm">
          <Button variant="default" onClick={handleSendInvoice} disabled={isSending || isLoading || isDuplicating} className="min-w-[7.5rem]">
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={!pdfUrl || isLoading}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          {invoice?.status === "paid" ? (
            <Button
              variant="outline"
              onClick={() => void handleManualStatusChange("unpaid")}
              disabled={isUpdatingStatus || isLoading || isSending || isDuplicating || isDeleting}
            >
              <RotateCcw className="h-4 w-4" />
              {isUpdatingStatus ? "Updating..." : "Mark Unpaid"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void handleManualStatusChange("paid")}
              disabled={isUpdatingStatus || isLoading || isSending || isDuplicating || isDeleting}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isUpdatingStatus ? "Updating..." : "Mark Paid"}
            </Button>
          )}
          <Button variant="outline" onClick={handleDuplicateInvoice} disabled={isDuplicating || isLoading || isDeleting}>
            <Copy className="h-4 w-4" />
            {isDuplicating ? "Duplicating..." : "Duplicate"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/invoices/${id}?mode=edit`}>
              <PencilLine className="h-4 w-4" />
              Edit Invoice
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting || isLoading || isDuplicating}
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loadError ? (
            <div className="px-6 py-8 text-sm text-red-700">{loadError}</div>
          ) : isLoading || !pdfUrl ? (
            <div className="px-6 py-8 text-sm text-slate-600">Loading invoice preview...</div>
          ) : (
            <iframe
              title="Invoice PDF preview"
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="h-[calc(100vh-12rem)] min-h-[720px] w-full bg-slate-100"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvoice} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
