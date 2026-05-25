import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { sendSupportEscalationEmail } from "@/lib/email";
import { ensureBusiness } from "@/lib/ensureBusiness";
import { getLegalProfile } from "@/lib/legal";
import { formatSupportTranscript, normalizeSupportMessages } from "@/lib/supportAssistant";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

export const runtime = "nodejs";

type SupportEscalationBody = {
  messages?: unknown;
  pagePath?: unknown;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);

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
