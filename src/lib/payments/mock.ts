import "server-only";
import { db } from "../db";
import type { PaymentProvider } from "./types";

// Development-only stand-in for a card processor. The "card" is confirmed from the
// checkout page through /api/dev/mock-payment. It is refused in production builds.

export const mockProvider: PaymentProvider = {
  name: "mock",

  async createPayment({ orderId }) {
    return { providerPaymentId: `mock_pi_${orderId}`, clientSecret: null };
  },

  async resumePayment() {
    return { clientSecret: null };
  },

  async getPayment(id) {
    const payment = await db.payment.findUniqueOrThrow({ where: { providerPaymentId: id } });
    const outcome =
      payment.status === "PAID" || payment.status === "PARTIALLY_REFUNDED" || payment.status === "REFUNDED"
        ? "succeeded"
        : payment.status === "FAILED"
          ? "failed"
          : payment.status === "CANCELLED"
            ? "canceled"
            : "pending";
    return {
      providerPaymentId: id,
      outcome,
      amountCents: payment.amountCents,
      methodType: payment.methodType,
      cardBrand: payment.cardBrand,
      last4: payment.last4,
      failureMessage: payment.failureMessage,
    };
  },

  async cancelPayment() {},

  async refund({ idempotencyKey }) {
    return { providerRefundId: `mock_re_${idempotencyKey}`, outcome: "succeeded" };
  },
};
