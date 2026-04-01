import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import {
  isClientImportFileError,
  prepareClientImportRows,
} from "@/lib/clientImport";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

const MAX_CLIENT_IMPORT_FILE_BYTES = 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("CSV file is required.", 400);
    }

    if (file.size === 0) {
      return apiError("CSV file is empty.", 400);
    }

    if (file.size > MAX_CLIENT_IMPORT_FILE_BYTES) {
      return apiError("CSV file is too large. Keep it under 1 MB.", 400);
    }

    const csvText = await file.text();
    const existingClients = await prisma.client.findMany({
      where: { businessId: business.id },
      select: { email: true },
    });
    const { rowsToCreate, result } = prepareClientImportRows({
      csvText,
      existingEmails: existingClients.map((client) => client.email),
    });

    if (rowsToCreate.length > 0) {
      await prisma.client.createMany({
        data: rowsToCreate.map((row) => ({
          businessId: business.id,
          ...row,
        })),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    if (isClientImportFileError(error)) {
      return apiError(error.message, 400);
    }

    console.error("Error importing clients:", error);
    return apiError("Server error", 500);
  }
}
