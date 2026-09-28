import "server-only";
import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export function paymentProvider(name = process.env.PAYMENT_PROVIDER ?? "stripe"): PaymentProvider {
  if (name === "mock") {
    if (process.env.NODE_ENV === "production") throw new Error("The mock payment provider cannot be used in production");
    return mockProvider;
  }
  return stripeProvider;
}

/** The provider that handled a specific stored payment. */
export function providerFor(payment: { provider: string }): PaymentProvider {
  return paymentProvider(payment.provider);
}

export type { PaymentProvider, PaymentSnapshot } from "./types";
