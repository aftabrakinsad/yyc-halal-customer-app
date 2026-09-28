// Human-readable labels shared by server and client code.
import type { OrderStatus, PaymentStatus, RefundType } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  IN_PROGRESS: "In Progress",
  READY_FOR_PICKUP: "Ready for Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  PARTIALLY_REFUNDED: "Partially Refunded",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export const REFUND_TYPE_LABEL: Record<RefundType, string> = {
  FULL: "Full refund",
  PARTIAL: "Partial refund",
  ITEM: "Item refund",
  CANCELLATION: "Order cancelled — refund",
};

const BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  interac: "Interac",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export function paymentMethodLabel(p: { methodType: string | null; cardBrand: string | null; last4: string | null } | null) {
  if (!p) return "—";
  const card = [p.cardBrand ? (BRANDS[p.cardBrand] ?? p.cardBrand) : "Card", p.last4 ? `•••• ${p.last4}` : null]
    .filter(Boolean)
    .join(" ");
  if (p.methodType === "apple_pay") return `Apple Pay (${card})`;
  if (p.methodType === "google_pay") return `Google Pay (${card})`;
  if (p.methodType === "mock") return `Test card ${p.last4 ? `•••• ${p.last4}` : ""}`.trim();
  return card;
}
