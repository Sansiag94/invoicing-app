import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigurationError,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function getBusinessId(request: Request): Promise<string | null> {
  const user = await getAuthenticatedUser(request);
  const business = await prisma.business.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  return business?.id ?? null;
}

async function findAttachment(invoiceId: string, attachmentId: string, businessId: string) {
  return prisma.invoiceAttachment.findFirst({
    where: {
      id: attachmentId,
      invoiceId,
      businessId,
      invoice: {
        businessId,
      },
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await context.params;
    const businessId = await getBusinessId(request);

    if (!businessId) {
      return apiError("Attachment not found", 404);
    }

    const attachment = await findAttachment(id, attachmentId, businessId);

    if (!attachment) {
      return apiError("Attachment not found", 404);
    }

    const signedUrlResult = await getSupabaseAdminClient()
      .storage
      .from(attachment.storageBucket)
      .createSignedUrl(attachment.storagePath, 60);

    if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
      return apiError("Could not create attachment access link", 502);
    }

    return NextResponse.json({ url: signedUrlResult.data.signedUrl });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Invoice attachment access configuration error:", error);
      return apiError(
        "Attachment access is not configured. Set SUPABASE_SERVICE_ROLE_KEY in server env.",
        500
      );
    }

    console.error("Error creating invoice attachment access link:", error);
    return apiError("Server error", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await context.params;
    const businessId = await getBusinessId(request);

    if (!businessId) {
      return apiError("Attachment not found", 404);
    }

    const attachment = await findAttachment(id, attachmentId, businessId);

    if (!attachment) {
      return apiError("Attachment not found", 404);
    }

    await prisma.invoiceAttachment.delete({
      where: { id: attachment.id },
    });

    const removeResult = await getSupabaseAdminClient()
      .storage
      .from(attachment.storageBucket)
      .remove([attachment.storagePath]);

    if (removeResult.error) {
      console.warn("Unable to remove invoice attachment object:", removeResult.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isSupabaseAdminConfigurationError(error)) {
      console.error("Invoice attachment delete configuration error:", error);
      return apiError(
        "Attachment deletion is not configured. Set SUPABASE_SERVICE_ROLE_KEY in server env.",
        500
      );
    }

    console.error("Error deleting invoice attachment:", error);
    return apiError("Server error", 500);
  }
}
