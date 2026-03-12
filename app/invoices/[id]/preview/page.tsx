"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, PencilLine } from "lucide-react";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoicePreviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
        objectUrl = URL.createObjectURL(blob);

        if (!isActive) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        if (activePdfUrlRef.current) {
          URL.revokeObjectURL(activePdfUrlRef.current);
        }
        activePdfUrlRef.current = objectUrl;
        setPdfUrl(objectUrl);
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
    return () => {
      if (activePdfUrlRef.current) {
        URL.revokeObjectURL(activePdfUrlRef.current);
        activePdfUrlRef.current = null;
      }
    };
  }, []);

  const handleOpenPdf = () => {
    if (!pdfUrl) {
      return;
    }

    window.open(pdfUrl, "_blank", "noopener,noreferrer");
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

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/invoices/${id}?mode=edit`}>
              <PencilLine className="h-4 w-4" />
              Edit Invoice
            </Link>
          </Button>
          <Button variant="outline" onClick={handleOpenPdf} disabled={!pdfUrl || isLoading}>
            <Download className="h-4 w-4" />
            Open PDF
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loadError ? (
            <div className="px-6 py-8 text-sm text-red-700">{loadError}</div>
          ) : isLoading || !pdfUrl ? (
            <div className="px-6 py-8 text-sm text-slate-600">Loading invoice preview...</div>
          ) : (
            <iframe
              title="Invoice PDF preview"
              src={pdfUrl}
              className="h-[calc(100vh-12rem)] min-h-[720px] w-full bg-slate-100"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
