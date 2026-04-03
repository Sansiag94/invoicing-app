import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser, isAuthenticationError } from "@/lib/auth";
import { markOverdueInvoicesForBusiness } from "@/lib/invoiceStatus";
import { WorkspaceNotification } from "@/lib/types";

const NOTIFICATION_LOOKAHEAD_DAYS = 7;
const RECENT_EVENT_DAYS = 30;
const WELCOME_WINDOW_DAYS = 14;
const MAX_NOTIFICATION_CANDIDATES = 24;
const MAX_NOTIFICATIONS = 8;

type NotificationCandidate = WorkspaceNotification & {
  sortValue: number;
};

function formatShortDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat("en-CH", {
    month: "long",
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

function pushUniqueNotification(
  list: NotificationCandidate[],
  notification: NotificationCandidate
) {
  if (list.some((item) => item.id === notification.id)) {
    return;
  }

  list.push(notification);
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

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dueSoon = new Date(today.getTime() + NOTIFICATION_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
    const recentEventCutoff = new Date(today.getTime() - RECENT_EVENT_DAYS * 24 * 60 * 60 * 1000);
    const welcomeCutoff = new Date(today.getTime() - WELCOME_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [
      appUser,
      clientCount,
      invoiceCount,
      urgentInvoices,
      viewedEvents,
      paidEvents,
      reminderEvents,
      lastMonthInvoiceCount,
      lastMonthExpenseCount,
    ] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { createdAt: true },
      }),
      prisma.client.count({
        where: { businessId: business.id },
      }),
      prisma.invoice.count({
        where: { businessId: business.id },
      }),
      prisma.invoice.findMany({
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
      }),
      prisma.invoiceEvent.findMany({
        where: {
          type: "viewed",
          createdAt: { gte: recentEventCutoff },
          invoice: {
            businessId: business.id,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          createdAt: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              client: {
                select: {
                  companyName: true,
                  contactName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.invoiceEvent.findMany({
        where: {
          type: "paid",
          createdAt: { gte: recentEventCutoff },
          invoice: {
            businessId: business.id,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          createdAt: true,
          details: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              client: {
                select: {
                  companyName: true,
                  contactName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.invoiceEvent.findMany({
        where: {
          type: "reminder_sent",
          createdAt: { gte: recentEventCutoff },
          invoice: {
            businessId: business.id,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          createdAt: true,
          details: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              client: {
                select: {
                  companyName: true,
                  contactName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.invoice.count({
        where: {
          businessId: business.id,
          issuedAt: {
            gte: previousMonthStart,
            lt: currentMonthStart,
          },
          status: {
            not: "cancelled",
          },
        },
      }),
      prisma.expense.count({
        where: {
          businessId: business.id,
          expenseDate: {
            gte: previousMonthStart,
            lt: currentMonthStart,
          },
        },
      }),
    ]);

    const notifications: NotificationCandidate[] = [];

    if (
      appUser?.createdAt &&
      appUser.createdAt >= welcomeCutoff &&
      clientCount === 0 &&
      invoiceCount === 0
    ) {
      pushUniqueNotification(notifications, {
        id: "welcome",
        title: "Welcome to Sierra Invoices",
        subtitle: "Finish the first setup steps and send your first invoice from the workspace.",
        href: "/help?from=app#onboarding",
        priority: 1,
        sortValue: -appUser.createdAt.getTime(),
      });
    }

    if (lastMonthInvoiceCount > 0 || lastMonthExpenseCount > 0) {
      pushUniqueNotification(notifications, {
        id: `monthly-report-${previousMonthStart.toISOString().slice(0, 7)}`,
        title: `${formatMonthLabel(previousMonthStart)} report is ready`,
        subtitle: "Open analytics to review the closed month and the new month so far.",
        href: "/analytics#monthly-report",
        priority: 1,
        sortValue: -previousMonthStart.getTime(),
      });
    }

    for (const event of viewedEvents) {
      const clientName = getClientDisplayName(event.invoice.client);
      pushUniqueNotification(notifications, {
        id: `${event.id}-viewed`,
        title: `${event.invoice.invoiceNumber} opened online`,
        subtitle: `${clientName} viewed it on ${formatShortDate(event.createdAt)}`,
        href: `/invoices/${event.invoice.id}`,
        priority: 1,
        sortValue: -event.createdAt.getTime(),
      });
    }

    for (const event of paidEvents) {
      const clientName = getClientDisplayName(event.invoice.client);
      pushUniqueNotification(notifications, {
        id: `${event.id}-paid`,
        title: `${event.invoice.invoiceNumber} was paid`,
        subtitle: event.details?.trim() || `${clientName} payment confirmed on ${formatShortDate(event.createdAt)}`,
        href: `/invoices/${event.invoice.id}`,
        priority: 1,
        sortValue: -event.createdAt.getTime(),
      });
    }

    for (const event of reminderEvents) {
      const clientName = getClientDisplayName(event.invoice.client);
      pushUniqueNotification(notifications, {
        id: `${event.id}-reminder`,
        title: `Reminder sent for ${event.invoice.invoiceNumber}`,
        subtitle: event.details?.trim() || `Reminder sent to ${clientName}`,
        href: `/invoices/${event.invoice.id}`,
        priority: 1,
        sortValue: -event.createdAt.getTime(),
      });
    }

    for (const invoice of urgentInvoices) {
      const clientName = getClientDisplayName(invoice.client);
      const href = `/invoices/${invoice.id}`;

      if (invoice.status === "overdue" || invoice.dueDate.getTime() < today.getTime()) {
        pushUniqueNotification(notifications, {
          id: `${invoice.id}-overdue`,
          title: `${invoice.invoiceNumber} is overdue`,
          subtitle: `${clientName} - due ${formatShortDate(invoice.dueDate)}`,
          href,
          priority: 0,
          sortValue: invoice.dueDate.getTime(),
        });
        continue;
      }

      if (invoice.status === "sent") {
        pushUniqueNotification(notifications, {
          id: `${invoice.id}-due-soon`,
          title: `${invoice.invoiceNumber} is due soon`,
          subtitle: `${clientName} - due ${formatShortDate(invoice.dueDate)}`,
          href,
          priority: 1,
          sortValue: invoice.dueDate.getTime(),
        });
        continue;
      }

      if (invoice.status === "draft") {
        pushUniqueNotification(notifications, {
          id: `${invoice.id}-draft`,
          title: `Draft invoice ${invoice.invoiceNumber}`,
          subtitle: `${clientName} - send before ${formatShortDate(invoice.dueDate)}`,
          href,
          priority: 2,
          sortValue: invoice.dueDate.getTime(),
        });
      }
    }

    const orderedNotifications = notifications
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }

        if (left.sortValue !== right.sortValue) {
          return left.sortValue - right.sortValue;
        }

        return left.title.localeCompare(right.title);
      })
      .slice(0, MAX_NOTIFICATIONS)
      .map((notification) => ({
        id: notification.id,
        title: notification.title,
        subtitle: notification.subtitle,
        href: notification.href,
        priority: notification.priority,
      }));

    return NextResponse.json(orderedNotifications);
  } catch (error) {
    if (isAuthenticationError(error)) {
      return apiError(error.message, 401);
    }

    console.error("Error loading notifications:", error);
    return apiError("Server error", 500);
  }
}
