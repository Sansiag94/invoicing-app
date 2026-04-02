import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";
import { WorkspaceNotification } from "@/lib/types";

const NOTIFICATION_LOOKAHEAD_DAYS = 7;
const MAX_NOTIFICATION_CANDIDATES = 24;
const MAX_NOTIFICATIONS = 8;

function getTimestamp(value: Date): number {
  const timestamp = value.getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function formatShortDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function getClientDisplayName(client: {
  companyName: string | null;
  contactName: string | null;
  email: string;
}) {
  return client.companyName || client.contactName || client.email;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    const business = await prisma.business.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!business) {
      return apiError("Business not found", 404);
    }

    await markOverdueInvoicesForBusiness(business.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoon = new Date(today.getTime() + NOTIFICATION_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

    const invoices = await prisma.invoice.findMany({
      where: {
        businessId: business.id,
        OR: [
          { status: "overdue" },
          { status: "draft" },
          {
            status: "sent",
            dueDate: {
              lte: dueSoon,
            },
          },
        ],
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: MAX_NOTIFICATION_CANDIDATES,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        dueDate: true,
        client: {
          select: {
            companyName: true,
            contactName: true,
            email: true,
          },
        },
      },
    });

    const todayTs = getTimestamp(today);

    const notifications = invoices
      .flatMap<WorkspaceNotification>((invoice) => {
        const dueDateTs = getTimestamp(invoice.dueDate);
        const clientName = getClientDisplayName(invoice.client);
        const href = `/invoices/${invoice.id}`;

        if (invoice.status === "overdue" || dueDateTs < todayTs) {
          return [
            {
              id: `${invoice.id}-overdue`,
              title: `${invoice.invoiceNumber} is overdue`,
              subtitle: `${clientName} - due ${formatShortDate(invoice.dueDate)}`,
              href,
              priority: 0,
            },
          ];
        }

        if (invoice.status === "sent") {
          return [
            {
              id: `${invoice.id}-due-soon`,
              title: `${invoice.invoiceNumber} is due soon`,
              subtitle: `${clientName} - due ${formatShortDate(invoice.dueDate)}`,
              href,
              priority: 1,
            },
          ];
        }

        if (invoice.status === "draft") {
          return [
            {
              id: `${invoice.id}-draft`,
              title: `Draft invoice ${invoice.invoiceNumber}`,
              subtitle: `${clientName} - send before ${formatShortDate(invoice.dueDate)}`,
              href,
              priority: 2,
            },
          ];
        }

        return [];
      })
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }

        return left.title.localeCompare(right.title);
      })
      .slice(0, MAX_NOTIFICATIONS);

    return NextResponse.json(notifications);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading notifications:", error);
    return apiError("Server error", 500);
  }
}
