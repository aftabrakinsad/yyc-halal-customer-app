export type PaymentOutcome = "succeeded" | "failed" | "pending" | "canceled";

/** Non-sensitive payment facts reported by the processor. Card numbers/CVV never reach our servers. */
export type PaymentSnapshot = {
  providerPaymentId: string;
  outcome: PaymentOutcome;
  amountCents: number;
  methodType: string | null;
  cardBrand: string | null;
  last4: string | null;
  failureMessage: string | null;
};

export type RefundResult = {
  providerRefundId: string;
  outcome: "succeeded" | "pending" | "failed";
};

export interface PaymentProvider {
  name: "stripe" | "mock";
  /** Idempotent per order: calling twice for the same order returns the same payment. */
  createPayment(input: {
    orderId: string;
    userId: string;
    amountCents: number;
    currency: string;
    description: string;
  }): Promise<{ providerPaymentId: string; clientSecret: string | null }>;
  resumePayment(providerPaymentId: string): Promise<{ clientSecret: string | null }>;
  getPayment(providerPaymentId: string): Promise<PaymentSnapshot>;
  cancelPayment(providerPaymentId: string): Promise<void>;
  refund(input: {
    refundId: string;
    providerPaymentId: string;
    amountCents: number;
    idempotencyKey: string;
    reason?: string | null;
  }): Promise<RefundResult>;
}
