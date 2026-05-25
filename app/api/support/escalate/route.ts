import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { sendSupportEscalationEmail } from "@/lib/email";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getLegalProfile } from "@/lib/legal";
import prisma from "@/lib/prisma";
import { formatSupportTranscript, normalizeSupportMessages } from "@/lib/supportAssistant";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

export const runtime = "nodejs";

type SupportEscalationBody = {
  messages?: unknown;
  pagePath?: unknown;
};

async function isSupportAssistantEnabled(businessId: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ supportAssistantEnabled: boolean | null }>>`
      SELECT "supportAssistantEnabled"
      FROM "Business"
      WHERE "uuid" = ${businessId}
      LIMIT 1
    `;
    return Boolean(rows[0]?.supportAssistantEnabled);
  } catch (error) {
    console.warn("Unable to read support assistant setting:", error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);

    if (!(await isSupportAssistantEnabled(business.id))) {
      return apiError("Sierra Assistant is disabled for this workspace.", 403);
    }

    const body = (await request.json()) as SupportEscalationBody;
    const messages = normalizeSupportMessages(body.messages);
    const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;

    if (!latestQuestion) {
      return apiError("Add a question before contacting support", 400);
    }

    const legalProfile = getLegalProfile();
    await sendSupportEscalationEmail({
      to: legalProfile.supportEmail,
      userEmail: user.email ?? "unknown user",
      businessName: business.name,
      question: latestQuestion,
      transcript: formatSupportTranscript(messages),
      pagePath: typeof body.pagePath === "string" ? body.pagePath : null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    console.error("Error escalating support chat:", error);
    return apiError("Server error", 500);
  }
}
