import prisma from "@/lib/prisma";
import {
  clearBusinessStripeConnectStatus,
  loadBusinessStripeConnectStatus,
} from "@/lib/stripeConnect";

export class WorkspaceClosedError extends Error {
  readonly status: number;

  constructor(
    message = "This workspace has been closed. Required records may still be retained for legal reasons.",
    status = 423
  ) {
    super(message);
    this.name = "WorkspaceClosedError";
    this.status = status;
  }
}

export function isWorkspaceClosedError(error: unknown): error is WorkspaceClosedError {
  return error instanceof WorkspaceClosedError;
}

export async function assertWorkspaceOpen(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      closedAt: true,
    },
  });

  if (!business) {
    return null;
  }

  if (business.closedAt) {
    throw new WorkspaceClosedError();
  }

  return business;
}

export async function closeWorkspace(businessId: string) {
  const stripeStatus = await loadBusinessStripeConnectStatus(businessId);

  if (!stripeStatus.usesPlatformStripe && stripeStatus.stripeAccountId) {
    await clearBusinessStripeConnectStatus(businessId);
  }

  return prisma.business.update({
    where: { id: businessId },
    data: {
      closedAt: new Date(),
    },
  });
}
