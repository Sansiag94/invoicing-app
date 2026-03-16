"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BellRing, CheckCircle2, Copy, Download, PencilLine, RotateCcw, Send, Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { InvoiceDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
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
  const [isMobile, setIsMobile] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReopenEditDialog, setShowReopenEditDialog] = useState(false);
  const [showSendConfirmDialog, setShowSendConfirmDialog] = useState(false);
  const [showReminderConfirmDialog, setShowReminderConfirmDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const activePdfUrlRef = useRef<string | null>(null);
  const hasOpenedMobilePreviewRef = useRef(false);
  const { toast } = useToast();

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

  useEffect(() => {
    if (!isMobile || !pdfUrl || hasOpenedMobilePreviewRef.current) {
      return;
    }

    hasOpenedMobilePreviewRef.current = true;
    window.location.assign(pdfUrl);
  }, [isMobile, pdfUrl]);

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

  const sendInvoiceNow = async () => {
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
        toast({
          title: "Failed to send invoice",
          description: result?.error ?? "Failed to send invoice",
          variant: "error",
        });
        return;
      }

      setInvoice((current) => (current ? { ...current, status: "sent" } : current));
      router.push("/invoices");
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast({
        title: "Failed to send invoice",
        description: "Failed to send invoice",
        variant: "error",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendInvoice = () => {
    if (invoice?.status === "draft") {
      setShowSendConfirmDialog(true);
      return;
    }

    void sendInvoiceNow();
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
        toast({
          title: "Failed to update invoice status",
          description: result?.error ?? "Failed to update invoice status",
          variant: "error",
        });
        return;
      }

      setInvoice(result);
      setSuccessMessage(nextStatus === "paid" ? "Invoice marked as paid." : "Invoice reopened as unpaid.");
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Failed to update invoice status",
        description: "Failed to update invoice status",
        variant: "error",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const sendReminderNow = async () => {
    if (!id || isSendingReminder) {
      return;
    }

    try {
      setIsSendingReminder(true);
      const response = await authenticatedFetch(`/api/invoices/${id}/reminder`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        toast({
          title: "Failed to send reminder",
          description: result?.error ?? "Failed to send reminder",
          variant: "error",
        });
        return;
      }

      setSuccessMessage(result?.message ?? "Reminder sent.");
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast({
        title: "Failed to send reminder",
        description: "Failed to send reminder",
        variant: "error",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSendReminder = () => {
    if (!id || isSendingReminder) {
      return;
    }

    setShowReminderConfirmDialog(true);
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
        toast({
          title: "Failed to duplicate invoice",
          description: result?.error ?? "Failed to duplicate invoice",
          variant: "error",
        });
        return;
      }

      router.push(`/invoices/${result.id}/preview`);
    } catch (error) {
      console.error("Error duplicating invoice:", error);
      toast({
        title: "Failed to duplicate invoice",
        description: "Failed to duplicate invoice",
        variant: "error",
      });
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
        toast({
          title: "Failed to delete invoice",
          description: result?.error ?? "Failed to delete invoice",
          variant: "error",
        });
        return;
      }

      setShowDeleteDialog(false);
      router.push("/invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "Failed to delete invoice",
        description: "Failed to delete invoice",
        variant: "error",
      });
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

        <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm sm:w-auto sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
          {invoice?.status !== "paid" ? (
            invoice?.status === "draft" ? (
              <Button
                variant="default"
                onClick={handleSendInvoice}
                disabled={isSending || isLoading || isDuplicating}
                className="col-span-2 w-full sm:col-span-1 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                {isSending ? "Sending..." : "Send"}
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={handleSendReminder}
                disabled={isSendingReminder || isLoading || isDuplicating}
                className="col-span-2 w-full sm:col-span-1 sm:w-auto"
              >
                <BellRing className="h-4 w-4" />
                {isSendingReminder ? "Sending..." : "Send Reminder"}
              </Button>
            )
          ) : null}
          {invoice?.status === "paid" ? (
            <Button
              variant="outline"
              onClick={() => void handleManualStatusChange("unpaid")}
              disabled={isUpdatingStatus || isLoading || isSending || isDuplicating || isDeleting}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              {isUpdatingStatus ? "Updating..." : "Mark Unpaid"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => void handleManualStatusChange("paid")}
              disabled={isUpdatingStatus || isLoading || isSending || isDuplicating || isDeleting}
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isUpdatingStatus ? "Updating..." : "Mark Paid"}
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPdf} disabled={!pdfUrl || isLoading} className="w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleDuplicateInvoice} disabled={isDuplicating || isLoading || isDeleting} className="w-full sm:w-auto">
            <Copy className="h-4 w-4" />
            {isDuplicating ? "Duplicating..." : "Duplicate"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (invoice?.status && invoice.status !== "draft") {
                setShowReopenEditDialog(true);
                return;
              }
              router.push(`/invoices/${id}?mode=edit`);
            }}
            className="w-full sm:w-auto"
          >
            <PencilLine className="h-4 w-4" />
            {invoice?.status === "draft" ? "Edit Invoice" : "Reopen & Edit"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting || isLoading || isDuplicating}
            className="col-span-2 w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:col-span-1 sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
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
                Mobile browsers open invoices more reliably in the native PDF viewer.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={handleOpenPdfPreview}>
                  Open PDF Preview
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
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

      <ConfirmDialog
        open={showSendConfirmDialog}
        onOpenChange={setShowSendConfirmDialog}
        title="Send Invoice"
        description={
          <>
            Send invoice <strong>{invoice?.invoiceNumber}</strong> now?
          </>
        }
        confirmLabel="Send Invoice"
        isConfirming={isSending}
        onConfirm={() => {
          setShowSendConfirmDialog(false);
          void sendInvoiceNow();
        }}
      />

      <ConfirmDialog
        open={showReminderConfirmDialog}
        onOpenChange={setShowReminderConfirmDialog}
        title="Send Reminder"
        description={
          <>
            Send a reminder for invoice <strong>{invoice?.invoiceNumber}</strong> now?
          </>
        }
        confirmLabel="Send Reminder"
        isConfirming={isSendingReminder}
        onConfirm={() => {
          setShowReminderConfirmDialog(false);
          void sendReminderNow();
        }}
      />

      <Dialog open={showReopenEditDialog} onOpenChange={setShowReopenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Invoice for Editing</DialogTitle>
            <DialogDescription>
              This invoice is no longer a draft. Reopen it only if you need to update the billed details before sharing a new version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowReopenEditDialog(false);
                router.push(`/invoices/${id}?mode=edit`);
              }}
            >
              Reopen & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
