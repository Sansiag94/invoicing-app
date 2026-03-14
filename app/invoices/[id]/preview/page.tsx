"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, PencilLine, Send, Trash2 } from "lucide-react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

        const response = await authenticatedFetch(`/api/invoices/${id}/pdf`);
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(result?.error ?? "Failed to load invoice preview");
        }

        const blob = await response.blob();
        const filename = extractPdfFilename(response.headers.get("Content-Disposition"));
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

      setSuccessMessage(result?.message ?? "Invoice sent");
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice");
    } finally {
      setIsSending(false);
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
          <Button variant="secondary" onClick={handleSendInvoice} disabled={isSending || isLoading} className="min-w-[7.5rem]">
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={!pdfUrl || isLoading}>
            <Download className="h-4 w-4" />
            Download PDF
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
            disabled={isDeleting || isLoading}
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
