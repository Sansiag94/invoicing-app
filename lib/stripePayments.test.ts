import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, logInvoiceEventMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
  logInvoiceEventMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/invoiceActivity", () => ({
  logInvoiceEvent: logInvoiceEventMock,
}));

import { recordStripePaymentFromSession } from "@/lib/stripePayments";

type TransactionMock = {
  invoice: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  payment: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function createSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    payment_status: "paid",
    payment_intent: "pi_test_123",
    amount_total: 12500,
    currency: "chf",
    metadata: {
      invoiceId: "invoice-123",
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

function createTransactionMock(): TransactionMock {
  return {
    invoice: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe("recordStripePaymentFromSession", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    logInvoiceEventMock.mockReset();
  });

  it("returns early for unpaid sessions", async () => {
    const result = await recordStripePaymentFromSession(
      createSession({ payment_status: "unpaid", payment_intent: null })
    );

    expect(result).toEqual({
      invoiceId: "invoice-123",
      markedPaid: false,
      paymentRecorded: false,
      requiresReview: false,
      reviewReason: null,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(logInvoiceEventMock).not.toHaveBeenCalled();
  });

  it("records the first successful stripe payment", async () => {
    const tx = createTransactionMock();
    tx.invoice.findUnique.mockResolvedValue({ status: "sent" });
    tx.payment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    tx.invoice.update.mockResolvedValue({});
    tx.payment.create.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (callback: (mock: TransactionMock) => unknown) =>
      callback(tx)
    );

    const result = await recordStripePaymentFromSession(createSession());

    expect(result).toEqual({
      invoiceId: "invoice-123",
      markedPaid: true,
      paymentRecorded: true,
      requiresReview: false,
      reviewReason: null,
    });
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-123" },
      data: {
        status: "paid",
        stripeCheckoutSessionId: null,
        stripeCheckoutSessionExpiresAt: null,
      },
    });
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
    expect(logInvoiceEventMock).toHaveBeenCalledWith({
      invoiceId: "invoice-123",
      type: "paid",
      actor: "Stripe",
      details: "Stripe payment confirmed (CHF)",
    });
  });

  it("does not duplicate an already-recorded stripe payment", async () => {
    const tx = createTransactionMock();
    tx.invoice.findUnique.mockResolvedValue({ status: "paid" });
    tx.payment.findFirst.mockResolvedValueOnce({ id: "payment-1" });
    tx.invoice.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (callback: (mock: TransactionMock) => unknown) =>
      callback(tx)
    );

    const result = await recordStripePaymentFromSession(createSession());

    expect(result).toEqual({
      invoiceId: "invoice-123",
      markedPaid: false,
      paymentRecorded: false,
      requiresReview: false,
      reviewReason: null,
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(logInvoiceEventMock).not.toHaveBeenCalled();
  });

  it("flags an additional stripe payment for manual review", async () => {
    const tx = createTransactionMock();
    tx.invoice.findUnique.mockResolvedValue({ status: "paid" });
    tx.payment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "payment-1", reference: "pi_original" });
    tx.invoice.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (callback: (mock: TransactionMock) => unknown) =>
      callback(tx)
    );

    const result = await recordStripePaymentFromSession(createSession({ payment_intent: "pi_new" }));

    expect(result).toEqual({
      invoiceId: "invoice-123",
      markedPaid: false,
      paymentRecorded: false,
      requiresReview: true,
      reviewReason: "additional_payment",
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(logInvoiceEventMock).toHaveBeenCalledWith({
      invoiceId: "invoice-123",
      type: "payment_review",
      actor: "Stripe",
      details: "Additional Stripe payment detected (CHF). Review and refund if needed.",
    });
  });

  it("flags a payment received for a cancelled invoice for manual review", async () => {
    const tx = createTransactionMock();
    tx.invoice.findUnique.mockResolvedValue({ status: "cancelled" });
    tx.invoice.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (callback: (mock: TransactionMock) => unknown) =>
      callback(tx)
    );

    const result = await recordStripePaymentFromSession(createSession());

    expect(result).toEqual({
      invoiceId: "invoice-123",
      markedPaid: false,
      paymentRecorded: false,
      requiresReview: true,
      reviewReason: "cancelled_invoice",
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(logInvoiceEventMock).toHaveBeenCalledWith({
      invoiceId: "invoice-123",
      type: "payment_review",
      actor: "Stripe",
      details: "Stripe payment received for a cancelled invoice (CHF). Review and refund if needed.",
    });
  });
});
