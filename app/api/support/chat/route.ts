import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { ensureBusiness } from "@/lib/ensureBusiness";
import prisma from "@/lib/prisma";
import {
  buildSupportFallbackAnswer,
  extractOpenAiResponseText,
  getOpenAiApiKey,
  getSupportAiModel,
  normalizeSupportMessages,
} from "@/lib/supportAssistant";
import { assertWorkspaceOpen, isWorkspaceClosedError } from "@/lib/workspaceClosure";

export const runtime = "nodejs";

type SupportChatBody = {
  messages?: unknown;
  pagePath?: unknown;
};

function getClientName(client: {
  companyName: string | null;
  contactName: string | null;
  email: string;
}) {
  return client.companyName || client.contactName || client.email;
}

async function buildWorkspaceContext(businessId: string) {
  const [invoiceStatusCounts, overdueInvoices, recentExpenses] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      where: { businessId },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        status: "overdue",
      },
      select: {
        invoiceNumber: true,
        dueDate: true,
        totalAmount: true,
        currency: true,
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.expense.findMany({
      where: { businessId },
      select: {
        description: true,
        amount: true,
        currency: true,
        expenseDate: true,
      },
      orderBy: { expenseDate: "desc" },
      take: 5,
    }),
  ]);

  const statusSummary = invoiceStatusCounts
    .map((entry) => `${entry.status}: ${entry._count._all}`)
    .join(", ");
  const overdueSummary = overdueInvoices.length
    ? overdueInvoices
        .map(
          (invoice) =>
            `${invoice.invoiceNumber} for ${getClientName(invoice.client)}, due ${invoice.dueDate.toISOString().slice(0, 10)}, ${invoice.currency} ${invoice.totalAmount.toFixed(2)}`
        )
        .join("; ")
    : "No overdue invoices.";
  const expenseSummary = recentExpenses.length
    ? recentExpenses
        .map(
          (expense) =>
            `${expense.expenseDate.toISOString().slice(0, 10)}: ${expense.description}, ${expense.currency} ${expense.amount.toFixed(2)}`
        )
        .join("; ")
    : "No recent expenses.";

  return `Invoice status counts: ${statusSummary || "none"}.
Overdue invoices: ${overdueSummary}
Recent expenses: ${expenseSummary}`;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const business = await ensureBusiness(user.id);
    await assertWorkspaceOpen(business.id);

    const body = (await request.json()) as SupportChatBody;
    const messages = normalizeSupportMessages(body.messages);
    const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;

    if (!latestQuestion) {
      return apiError("Add a question for support", 400);
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
        instructions: `You are Heidi, the support assistant for Sierra Invoices.
Answer in concise, practical English.
Help users with invoices, clients, saved services, expenses, payments, reminders, analytics, settings, and app navigation.
Use the workspace context only when it is relevant. Do not invent invoice, client, payment, or expense data.
Do not provide legal, tax, or accounting advice. For those topics, give general app guidance and recommend confirming with an accountant.
If the request needs human support, say that the user can send the conversation to support from this chat.`,
        input: [
          {
            role: "user",
            content: `Business: ${business.name}
User email: ${user.email ?? "unknown"}
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

    console.error("Error answering support chat:", error);
    return apiError("Server error", 500);
  }
}
