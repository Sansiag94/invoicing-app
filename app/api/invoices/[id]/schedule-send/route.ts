import { NextResponse } from "next/server";
import { InvoiceStatus } from "@prisma/client";
import { apiError } from "@/lib/api-response";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logInvoiceEvent } from "@/lib/invoiceActivity";

type ScheduleSendBody = {
  scheduledSendDate?: unknown;
};

function parseScheduleDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatScheduleDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function GET() {
  return apiError("Method not allowed", 405);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);
    const body = (await request.json()) as ScheduleSendBody;
    const scheduledSendAt = parseScheduleDate(body.scheduledSendDate);

    if (!scheduledSendAt) {
      return apiError("Choose a valid scheduled send date.", 400);
    }

    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (scheduledSendAt < todayStart) {
      return apiError("Scheduled send date cannot be in the past.", 400);
    }

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Invoice not found", 404);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: business.id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        client: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    if (invoice.status !== InvoiceStatus.draft && invoice.status !== InvoiceStatus.issued) {
      return apiError("Only draft or created invoices can be scheduled for sending.", 400);
    }

    if (!invoice.client.email?.trim()) {
      return apiError(
        "This client has no email address. Add an email before scheduling invoice sending.",
        400
      );
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        scheduledSendAt,
        scheduledSendFailure: null,
      },
      select: {
        scheduledSendAt: true,
        scheduledSendFailure: true,
      },
    });

    await logInvoiceEvent({
      invoiceId: invoice.id,
      type: "scheduled_send",
      actor: user.email ?? "User",
      details: `Invoice scheduled to send on ${formatScheduleDate(scheduledSendAt)}`,
    });

    return NextResponse.json({
      message: `Invoice scheduled to send on ${formatScheduleDate(scheduledSendAt)}.`,
      scheduledSendAt: updatedInvoice.scheduledSendAt,
      scheduledSendFailure: updatedInvoice.scheduledSendFailure,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error scheduling invoice send:", error);
    return apiError("Server error", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Invoice not found", 404);
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, businessId: business.id },
      select: {
        id: true,
        scheduledSendAt: true,
      },
    });

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        scheduledSendAt: null,
        scheduledSendFailure: null,
      },
    });

    await logInvoiceEvent({
      invoiceId: invoice.id,
      type: "scheduled_send_cancelled",
      actor: user.email ?? "User",
      details: "Scheduled invoice send cancelled",
    });

    return NextResponse.json({ message: "Scheduled send cancelled." });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error clearing scheduled invoice send:", error);
    return apiError("Server error", 500);
  }
}
