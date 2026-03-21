import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { closeWorkspace, isWorkspaceClosedError } from "@/lib/workspaceClosure";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);

    if (business.closedAt) {
      return apiError(
        "This workspace has already been closed. Required records may still be retained for legal reasons.",
        409
      );
    }

    await closeWorkspace(business.id);

    return NextResponse.json({
      ok: true,
      message:
        "Workspace closed. Access has been removed, and required records may still be retained for legal reasons.",
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error closing workspace:", error);
    return apiError("Could not close workspace", 500);
  }
}
