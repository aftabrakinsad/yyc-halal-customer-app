import "server-only";
import Stripe from "stripe";
import type { PaymentProvider, PaymentSnapshot } from "./types";

let client: Stripe | null = null;
export function stripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

function snapshot(intent: Stripe.PaymentIntent): PaymentSnapshot {
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const details = charge?.payment_method_details;
  const card = details?.card;
  const outcome =
    intent.status === "succeeded"
      ? "succeeded"
      : intent.status === "canceled"
        ? "canceled"
        : intent.status === "requires_payment_method" && intent.last_payment_error
          ? "failed"
          : "pending";
  return {
    providerPaymentId: intent.id,
    outcome,
    amountCents: intent.amount_received || intent.amount,
    methodType: card?.wallet?.type ?? details?.type ?? null, // "apple_pay", "google_pay", "card", "interac_present"…
    cardBrand: card?.brand ?? null,
    last4: card?.last4 ?? null,
    failureMessage: intent.last_payment_error?.message ?? null,
  };
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createPayment({ orderId, userId, amountCents, currency, description }) {
    const intent = await stripe().paymentIntents.create(
      {
        amount: amountCents,
        currency,
        description,
        // Cards, Apple Pay and Google Pay are offered by Stripe's Payment Element based on the device.
        automatic_payment_methods: { enabled: true },
        metadata: { orderId, userId },
      },
      { idempotencyKey: `order-${orderId}` },
    );
    return { providerPaymentId: intent.id, clientSecret: intent.client_secret };
  },

  async resumePayment(id) {
    const intent = await stripe().paymentIntents.retrieve(id);
    return { clientSecret: intent.client_secret };
  },

  async getPayment(id) {
    const intent = await stripe().paymentIntents.retrieve(id, { expand: ["latest_charge"] });
    return snapshot(intent);
  },

  async cancelPayment(id) {
    await stripe().paymentIntents.cancel(id);
  },

  async refund({ refundId, providerPaymentId, amountCents, idempotencyKey, reason }) {
    const refund = await stripe().refunds.create(
      {
        payment_intent: providerPaymentId,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: { refundId, note: reason?.slice(0, 450) ?? "" },
      },
      { idempotencyKey },
    );
    const outcome = refund.status === "succeeded" ? "succeeded" : refund.status === "failed" || refund.status === "canceled" ? "failed" : "pending";
    return { providerRefundId: refund.id, outcome };
  },
};
