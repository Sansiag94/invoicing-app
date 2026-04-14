import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";
import {
  buildStoredReceiptPath,
  resolveReceiptStorageLocation,
} from "@/lib/receiptStorage";

export const runtime = "nodejs";

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const DEFAULT_BUCKET = "expense-receipts";

type StorageUploadError = {
  message?: string;
  statusCode?: string;
};

function getBucketName(): string {
  return (
    process.env.SUPABASE_EXPENSES_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_EXPENSES_BUCKET?.trim() ||
    DEFAULT_BUCKET
  );
}

function isBucketNotFoundError(error: StorageUploadError | null): boolean {
  if (!error) return false;

  const message = (error.message ?? "").toLowerCase();
  const statusCode = (error.statusCode ?? "").toLowerCase();
  return (
    statusCode === "404" ||
    message.includes("bucket not found") ||
    message.includes("not found")
  );
}

function getFileExtension(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : null;
  if (fromName && /^[a-z0-9]+$/.test(fromName)) {
    return fromName;
  }

  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  return "bin";
}

async function uploadReceiptWithAutoBucketCreate(bucket: string, path: string, file: File) {
  const supabaseAdmin = getSupabaseAdminClient();

  const updateBucketResult = await supabaseAdmin.storage.updateBucket(bucket, {
    public: false,
    fileSizeLimit: `${MAX_RECEIPT_BYTES}`,
  });

  if (updateBucketResult.error && isBucketNotFoundError(updateBucketResult.error)) {
    const createBucketResult = await supabaseAdmin.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: `${MAX_RECEIPT_BYTES}`,
    });

    if (createBucketResult.error) {
      return {
        data: null,
        error: createBucketResult.error,
      };
    }
  }

  return supabaseAdmin.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const { id } = await params;

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const expense = await prisma.expense.findFirst({
      where: { id, businessId: business.id },
      select: { id: true, receiptUrl: true },
    });

    if (!expense) {
      return apiError("Expense not found", 404);
    }

    const location = resolveReceiptStorageLocation(expense.receiptUrl, getBucketName());
    if (!location) {
      return apiError("Receipt not found", 404);
    }

    const signedUrlResult = await getSupabaseAdminClient()
      .storage
      .from(location.bucket)
      .createSignedUrl(location.path, 60);

    if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
      return apiError("Could not create receipt access link", 502);
    }

    return NextResponse.json({ url: signedUrlResult.data.signedUrl });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Receipt access configuration error:", error);
      return apiError(
        "Receipt access is not configured. Set SUPABASE_SERVICE_ROLE_KEY in server env.",
        500
      );
    }

    console.error("Error creating receipt access link:", error);
    return apiError("Server error", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    const { id } = await params;
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return apiError("Missing receipt file", 400);
    }

    if (
      !fileEntry.type.startsWith("image/") &&
      fileEntry.type !== "application/pdf"
    ) {
      return apiError("Receipt must be an image or PDF", 400);
    }

    if (fileEntry.size > MAX_RECEIPT_BYTES) {
      return apiError("Receipt file is too large. Max size is 8MB.", 400);
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    const expense = await prisma.expense.findFirst({
      where: { id, businessId: business.id },
      select: { id: true },
    });

    if (!expense) {
      return apiError("Expense not found", 404);
    }

    const bucket = getBucketName();
    const extension = getFileExtension(fileEntry);
    const receiptPath = buildStoredReceiptPath(
      business.id,
      expense.id,
      `${crypto.randomUUID()}.${extension}`
    );

    const uploadResult = await uploadReceiptWithAutoBucketCreate(bucket, receiptPath, fileEntry);

    if (uploadResult.error) {
      console.error("Error uploading receipt:", uploadResult.error);
      return apiError(
        `Failed to upload receipt to bucket "${bucket}": ${uploadResult.error.message ?? "unknown error"}`,
        502
      );
    }

    await prisma.expense.update({
      where: { id: expense.id },
      data: { receiptUrl: receiptPath },
    });

    return NextResponse.json({
      success: true,
      receiptUrl: receiptPath,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Receipt upload configuration error:", error);
      return apiError(
        "Receipt uploads are not configured. Set SUPABASE_SERVICE_ROLE_KEY in server env.",
        500
      );
    }

    console.error("Error handling receipt upload:", error);
    return apiError("Server error", 500);
  }
}
