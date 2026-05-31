import crypto from "crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  buildStoredInvoiceAttachmentPath,
  getInvoiceAttachmentsBucketName,
  isAllowedInvoiceAttachmentType,
  MAX_INVOICE_ATTACHMENT_BYTES,
  sanitizeInvoiceAttachmentFilename,
} from "@/lib/invoiceAttachmentStorage";
import prisma from "@/lib/prisma";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

type StorageUploadError = {
  message?: string;
  statusCode?: string;
};

function isBucketNotFoundError(error: StorageUploadError | null): boolean {
  if (!error) return false;

  const message = (error.message ?? "").toLowerCase();
  const statusCode = (error.statusCode ?? "").toLowerCase();
  return statusCode === "404" || message.includes("bucket not found") || message.includes("not found");
}

async function uploadInvoiceAttachment(bucket: string, path: string, file: File) {
  const supabaseAdmin = getSupabaseAdminClient();

  const updateBucketResult = await supabaseAdmin.storage.updateBucket(bucket, {
    public: false,
    fileSizeLimit: `${MAX_INVOICE_ATTACHMENT_BYTES}`,
  });

  if (updateBucketResult.error && isBucketNotFoundError(updateBucketResult.error)) {
    const createBucketResult = await supabaseAdmin.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: `${MAX_INVOICE_ATTACHMENT_BYTES}`,
    });

    if (createBucketResult.error) {
      return {
        data: null,
        error: createBucketResult.error,
      };
    }
  }

  return supabaseAdmin.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
  });
}

async function getBusinessId(request: Request): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  return business?.id ?? null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const businessId = await getBusinessId(request);

    if (!businessId) {
      return apiError("Invoice not found", 404);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId },
      select: { id: true, businessId: true },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return apiError("Missing attachment file", 400);
    }

    if (!isAllowedInvoiceAttachmentType(fileEntry)) {
      return apiError("Attachment must be an image, PDF, text file, or Word document.", 400);
    }

    if (fileEntry.size <= 0) {
      return apiError("Attachment file is empty.", 400);
    }

    if (fileEntry.size > MAX_INVOICE_ATTACHMENT_BYTES) {
      return apiError("Attachment file is too large. Max size is 10MB.", 400);
    }

    const attachmentId = crypto.randomUUID();
    const filename = sanitizeInvoiceAttachmentFilename(fileEntry.name);
    const bucket = getInvoiceAttachmentsBucketName();
    const storagePath = buildStoredInvoiceAttachmentPath(
      businessId,
      invoice.id,
      attachmentId,
      filename
    );

    const uploadResult = await uploadInvoiceAttachment(bucket, storagePath, fileEntry);

    if (uploadResult.error) {
      console.error("Error uploading invoice attachment:", uploadResult.error);
      return apiError(
        `Failed to upload attachment to bucket "${bucket}": ${uploadResult.error.message ?? "unknown error"}`,
        502
      );
    }

    const attachment = await prisma.invoiceAttachment.create({
      data: {
        id: attachmentId,
        invoiceId: invoice.id,
        businessId,
        filename,
        contentType: fileEntry.type || "application/octet-stream",
        sizeBytes: fileEntry.size,
        storageBucket: bucket,
        storagePath,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Invoice attachment upload configuration error:", error);
      return apiError(
        "Attachment uploads are not configured. Set SUPABASE_SERVICE_ROLE_KEY in server env.",
        500
      );
    }

    console.error("Error handling invoice attachment upload:", error);
    return apiError("Server error", 500);
  }
}
