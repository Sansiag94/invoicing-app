"use client";

import { ChangeEvent, useRef, useState } from "react";
import { ExternalLink, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { InvoiceAttachmentRecord } from "@/lib/types";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import { cn } from "@/lib/utils";

type InvoiceAttachmentsPanelProps = {
  invoiceId: string;
  attachments: InvoiceAttachmentRecord[];
  onAttachmentsChange: (attachments: InvoiceAttachmentRecord[]) => void;
  disabled?: boolean;
  className?: string;
};

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InvoiceAttachmentsPanel({
  invoiceId,
  attachments,
  onAttachmentsChange,
  disabled = false,
  className,
}: InvoiceAttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { toast } = useToast();

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await authenticatedFetch(`/api/invoices/${invoiceId}/attachments`, {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as InvoiceAttachmentRecord & { error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? `Could not upload ${file.name}`);
    }

    return result;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);

    try {
      const uploaded: InvoiceAttachmentRecord[] = [];

      for (const file of files) {
        uploaded.push(await uploadFile(file));
      }

      onAttachmentsChange([...attachments, ...uploaded]);
      toast({
        title: uploaded.length === 1 ? "Attachment added" : "Attachments added",
        description:
          uploaded.length === 1
            ? `${uploaded[0].filename} will be sent with this invoice email.`
            : `${uploaded.length} files will be sent with this invoice email.`,
      });
    } catch (error) {
      toast({
        title: "Unable to add attachment",
        description: error instanceof Error ? error.message : "The attachment could not be uploaded.",
        variant: "error",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleOpenAttachment(attachment: InvoiceAttachmentRecord) {
    if (openingId) {
      return;
    }

    setOpeningId(attachment.id);

    try {
      const response = await authenticatedFetch(
        `/api/invoices/${invoiceId}/attachments/${attachment.id}`
      );
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not open attachment.");
      }

      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open attachment",
        description: error instanceof Error ? error.message : "The attachment could not be opened.",
        variant: "error",
      });
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDeleteAttachment(attachment: InvoiceAttachmentRecord) {
    if (deletingId) {
      return;
    }

    setDeletingId(attachment.id);

    try {
      const response = await authenticatedFetch(
        `/api/invoices/${invoiceId}/attachments/${attachment.id}`,
        { method: "DELETE" }
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not remove attachment.");
      }

      onAttachmentsChange(attachments.filter((item) => item.id !== attachment.id));
      toast({
        title: "Attachment removed",
        description: `${attachment.filename} will not be sent with this invoice.`,
      });
    } catch (error) {
      toast({
        title: "Unable to remove attachment",
        description: error instanceof Error ? error.message : "The attachment could not be removed.",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
            <Paperclip className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Email attachments</p>
            <p className="text-sm text-slate-500">
              Optional files sent with this invoice email only. They do not affect totals.
            </p>
          </div>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/plain,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Add file"}
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No extra files attached.
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{attachment.filename}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(attachment.sizeBytes)}
                    {attachment.contentType ? ` · ${attachment.contentType}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleOpenAttachment(attachment)}
                  disabled={disabled || openingId === attachment.id}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDeleteAttachment(attachment)}
                  disabled={disabled || deletingId === attachment.id}
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
