import crypto from "crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import prisma from "@/lib/prisma";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const DEFAULT_BUCKET = "invoice-attachments";

type StorageUploadError = {
  message?: string;
  statusCode?: string;
};

function getBucketName(): string {
  return process.env.SUPABASE_INVOICE_ATTACHMENTS_BUCKET?.trim() || DEFAULT_BUCKET;
}

function isBucketNotFoundError(error: StorageUploadError | null): boolean {
  if (!error) return false;

  const message = (error.message ?? "").toLowerCase();
  const statusCode = (error.statusCode ?? "").toLowerCase();
  return statusCode === "404" || message.includes("bucket not found") || message.includes("not found");
}

function getSafePdfFilename(file: File): string {
  const fallback = "invoice-attachment.pdf";
  const normalized = file.name.trim().replace(/[^\w.\- ]+/g, "").slice(0, 120);
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : fallback;
}

async function uploadAttachmentWithAutoBucketCreate(bucket: string, path: string, file: File) {
  const supabaseAdmin = getSupabaseAdminClient();

  let uploadResult = await supabaseAdmin.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: "application/pdf",
  });

  if (!uploadResult.error || !isBucketNotFoundError(uploadResult.error)) {
    return uploadResult;
  }

  const createBucketResult = await supabaseAdmin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: `${MAX_ATTACHMENT_BYTES}`,
    allowedMimeTypes: ["application/pdf"],
  });

  if (createBucketResult.error) {
    return uploadResult;
  }

  uploadResult = await supabaseAdmin.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: "application/pdf",
  });

  return uploadResult;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return apiError("Missing attachment file", 400);
    }

    if (fileEntry.type !== "application/pdf" && !fileEntry.name.toLowerCase().endsWith(".pdf")) {
      return apiError("Default invoice attachment must be a PDF", 400);
    }

    if (fileEntry.size > MAX_ATTACHMENT_BYTES) {
      return apiError("Attachment file is too large. Max size is 10MB.", 400);
    }

    const business = await ensureBusiness(user.id);
    const bucket = getBucketName();
    const filename = getSafePdfFilename(fileEntry);
    const path = `${business.id}/${crypto.randomUUID()}-${filename}`;
    const uploadResult = await uploadAttachmentWithAutoBucketCreate(bucket, path, fileEntry);

    if (uploadResult.error) {
      console.error("Error uploading default invoice attachment:", uploadResult.error);
      return apiError(
        `Failed to upload attachment to bucket "${bucket}": ${uploadResult.error.message ?? "unknown error"}`,
        502
      );
    }

    const publicUrlResult = getSupabaseAdminClient().storage.from(bucket).getPublicUrl(path);
    const attachmentUrl = publicUrlResult.data.publicUrl;

    if (!attachmentUrl) {
      return apiError("Attachment uploaded but no public URL was returned", 500);
    }

    await prisma.$executeRaw`
      UPDATE "Business"
      SET
        "defaultInvoiceAttachmentUrl" = ${attachmentUrl},
        "defaultInvoiceAttachmentName" = ${filename}
      WHERE "uuid" = ${business.id}
    `;

    return NextResponse.json({
      success: true,
      defaultInvoiceAttachmentUrl: attachmentUrl,
      defaultInvoiceAttachmentName: filename,
    });
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

    console.error("Error handling default invoice attachment upload:", error);
    return apiError("Server error", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);

    await prisma.$executeRaw`
      UPDATE "Business"
      SET
        "defaultInvoiceAttachmentUrl" = NULL,
        "defaultInvoiceAttachmentName" = NULL
      WHERE "uuid" = ${business.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error removing default invoice attachment:", error);
    return apiError("Server error", 500);
  }
}
