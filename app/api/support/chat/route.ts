import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import prisma from "@/lib/prisma";
import {
  buildSensitiveDataRefusal,
  buildSupportFallbackAnswer,
  extractOpenAiResponseText,
  getOpenAiApiKey,
  getSupportAiModel,
  isSensitiveSupportQuestion,
  normalizeSupportMessages,
} from "@/lib/supportAssistant";
import { assertRateLimit, isRateLimitError } from "@/lib/rateLimit";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

export const runtime = "nodejs";
const SUPPORT_CHAT_DAILY_LIMIT = 12;
const SUPPORT_CHAT_DAY_MS = 24 * 60 * 60 * 1000;

type SupportChatBody = {
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

async function buildWorkspaceContext(businessId: string) {
  const [invoiceStatusCounts, overdueInvoiceCount, recentExpenseCount] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { _all: true },
    }),
    prisma.invoice.count({
      where: {
        businessId,
        status: "overdue",
      },
    }),
    prisma.expense.count({
      where: { businessId },
    }),
  ]);

  const statusSummary = invoiceStatusCounts
    .map((entry) => `${entry.status}: ${entry._count._all}`)
    .join(", ");

  return `Invoice status counts: ${statusSummary || "none"}.
Overdue invoice count: ${overdueInvoiceCount}.
Expense record count: ${recentExpenseCount}.
Sensitive records such as client names, emails, addresses, bank details, card details, invoice tokens, and exact payment records are intentionally not included.`;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);

    if (!(await isSupportAssistantEnabled(business.id))) {
      return apiError("Sierra Assistant is disabled for this workspace.", 403);
    }

    await assertRateLimit({
      request,
      route: "support-chat-daily",
      identifier: `${business.id}:${user.id}`,
      limit: SUPPORT_CHAT_DAILY_LIMIT,
      windowMs: SUPPORT_CHAT_DAY_MS,
    });

    const body = (await request.json()) as SupportChatBody;
    const messages = normalizeSupportMessages(body.messages);
    const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;

    if (!latestQuestion) {
      return apiError("Add a question for support", 400);
    }

    if (isSensitiveSupportQuestion(latestQuestion)) {
      return NextResponse.json({
        answer: buildSensitiveDataRefusal(),
        canEscalate: true,
        source: "privacy_guard",
      });
    }

    const workspaceContext = await buildWorkspaceContext(business.id);
    const apiKey = getOpenAiApiKey();

    if (!apiKey) {
      return NextResponse.json({
        answer: buildSupportFallbackAnswer(latestQuestion),
        canEscalate: true,
        source: "fallback",
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getSupportAiModel(),
        instructions: `You are Sierra Assistant, the support assistant for Sierra Invoices.
Answer in concise, practical English.
Help users with invoices, clients, saved services, expenses, payments, reminders, analytics, settings, and app navigation.
Use the workspace context only when it is relevant. Do not invent invoice, client, payment, or expense data.
Do not reveal or request secrets, API keys, passwords, invoice tokens, bank details, card details, client contact details, personal addresses, or hidden records in chat.
Do not provide legal, tax, or accounting advice. For those topics, give general app guidance and recommend confirming with an accountant.
If the request needs human support, say that the user can send the conversation to support from this chat.`,
        input: [
          {
            role: "user",
            content: `Business: ${business.name}
Current page: ${typeof body.pagePath === "string" ? body.pagePath : "unknown"}

Workspace context:
${workspaceContext}

Conversation:
${messages.map((message) => `${message.role}: ${message.content}`).join("\n")}`,
          },
        ],
        max_output_tokens: 650,
        text: { verbosity: "low" },
      }),
    });

    const data = (await response.json()) as unknown;

    if (!response.ok) {
      console.error("[support] OpenAI response failed", data);
      return NextResponse.json({
        answer: buildSupportFallbackAnswer(latestQuestion),
        canEscalate: true,
        source: "fallback",
      });
    }

    const answer = extractOpenAiResponseText(data);

    return NextResponse.json({
      answer: answer || buildSupportFallbackAnswer(latestQuestion),
      canEscalate: true,
      source: answer ? "ai" : "fallback",
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    if (isWorkspaceClosedError(error)) {
      return apiError(error.message, error.status);
    }

    if (isRateLimitError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The daily Sierra Assistant limit has been reached. Please contact support by email for further assistance. The chat will be available again tomorrow.",
          code: "too_many_requests",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
            "X-RateLimit-Limit": String(error.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(error.resetAt.getTime() / 1000)),
          },
        }
      );
    }

    console.error("Error answering support chat:", error);
    return apiError("Server error", 500);
  }
}
