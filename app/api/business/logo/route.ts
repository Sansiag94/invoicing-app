import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const DEFAULT_BUCKET = "business-logos";

type StorageUploadError = {
  message?: string;
  statusCode?: string;
};

function getBucketName(): string {
  return (
    process.env.SUPABASE_LOGOS_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_LOGOS_BUCKET?.trim() ||
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

  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/svg+xml") return "svg";
  return "png";
}

async function uploadLogoWithAutoBucketCreate(bucket: string, path: string, file: File) {
  const supabaseAdmin = getSupabaseAdminClient();

  let uploadResult = await supabaseAdmin.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  });

  if (!uploadResult.error || !isBucketNotFoundError(uploadResult.error)) {
    return uploadResult;
  }

  const createBucketResult = await supabaseAdmin.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: `${MAX_LOGO_BYTES}`,
  });

  if (createBucketResult.error) {
    return uploadResult;
  }

  uploadResult = await supabaseAdmin.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  });

  return uploadResult;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return apiError("Missing logo file", 400);
    }

    if (!fileEntry.type.startsWith("image/")) {
      return apiError("Logo must be an image", 400);
    }

    if (fileEntry.size > MAX_LOGO_BYTES) {
      return apiError("Logo file is too large. Max size is 5MB.", 400);
    }

    const business = await ensureBusiness(user.id);
    const bucket = getBucketName();
    const extension = getFileExtension(fileEntry);
    const logoPath = `${business.id}/${crypto.randomUUID()}.${extension}`;

    const uploadResult = await uploadLogoWithAutoBucketCreate(bucket, logoPath, fileEntry);

    if (uploadResult.error) {
      console.error("Error uploading logo:", uploadResult.error);
      return apiError(
        `Failed to upload logo to bucket "${bucket}": ${uploadResult.error.message ?? "unknown error"}`,
        502
      );
    }

    const publicUrlResult = getSupabaseAdminClient().storage.from(bucket).getPublicUrl(logoPath);
    const logoUrl = publicUrlResult.data.publicUrl;

    if (!logoUrl) {
      return apiError("Logo uploaded but no public URL was returned", 500);
    }

    await prisma.business.update({
      where: { id: business.id },
      data: { logoUrl },
    });

    return NextResponse.json({ success: true, logoUrl });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Logo upload configuration error:", error);
      return apiError(
        "Logo uploads are not configured. Set SUPABASE_SERVICE_ROLE_KEY in server env.",
        500
      );
    }

    console.error("Error handling logo upload:", error);
    return apiError("Server error", 500);
  }
}
