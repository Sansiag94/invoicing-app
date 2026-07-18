export const SETTLED_PAYMENT_STATUSES = ["manual_paid", "paid", "succeeded"] as const;

export type PaymentLike = {
  amount: number;
  status: string;
};

export function isSettledPaymentStatus(status: string): boolean {
  return SETTLED_PAYMENT_STATUSES.includes(status as (typeof SETTLED_PAYMENT_STATUSES)[number]);
}

export function getSettledPaymentAmount(payments: PaymentLike[]): number {
  return payments
    .filter((payment) => isSettledPaymentStatus(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function getOutstandingInvoiceAmount(invoice: {
  status?: string;
  totalAmount: number;
  payments: PaymentLike[];
}): number {
  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return 0;
  }

  return Math.max(0, invoice.totalAmount - getSettledPaymentAmount(invoice.payments));
}

export function isInvoiceFullySettled(invoice: {
  totalAmount: number;
  payments: PaymentLike[];
}): boolean {
  return getSettledPaymentAmount(invoice.payments) >= invoice.totalAmount - 0.005;
}
