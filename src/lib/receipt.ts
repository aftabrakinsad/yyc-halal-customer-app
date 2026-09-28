import "server-only";
import type { OrderStatus, PaymentStatus, RefundType } from "@/generated/prisma/enums";
import { db } from "./db";
import { getSettings } from "./settings";
import { paymentMethodLabel } from "./labels";

export type ReceiptData = {
  orderId: string;
  orderNumber: string;
  userId: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerEmail: string;
  items: {
    id: string;
    name: string;
    imageUrl: string | null;
    quantity: number;
    unitLabel: string;
    unitPriceCents: number;
    lineSubtotalCents: number;
    refundedQuantity: number;
    refundedCents: number;
  }[];
  subtotalCents: number;
  taxCents: number;
  taxLabel: string;
  taxRateBps: number;
  totalCents: number;
  refundedCents: number;
  netPaidCents: number;
  currency: string;
  payment: { method: string; transactionId: string; paidAt: string | null } | null;
  refunds: {
    id: string;
    type: RefundType;
    amountCents: number;
    reason: string | null;
    transactionId: string | null;
    date: string;
    items: { productName: string; quantity: number; amountCents: number }[];
  }[];
  timeline: { paidAt: string | null; readyAt: string | null; completedAt: string | null; cancelledAt: string | null };
  store: { name: string; address: string; phone: string; email: string; footer: string; pickupInstructions: string };
};

/** Everything needed to render a receipt (in-app, email, or POS printer). Only confirmed orders qualify. */
export async function loadReceipt(orderId: string): Promise<ReceiptData | null> {
  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      include: {
        items: { orderBy: { productName: "asc" } },
        payments: { where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } }, orderBy: { createdAt: "desc" }, take: 1 },
        refunds: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "asc" } },
      },
    }),
    getSettings(),
  ]);
  if (!order || !order.orderNumber) return null;
  const payment = order.payments[0] ?? null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    placedAt: (order.paidAt ?? order.createdAt).toISOString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.productName,
      imageUrl: i.imageUrl,
      quantity: Number(i.quantity),
      unitLabel: i.unitLabel,
      unitPriceCents: i.unitPriceCents,
      lineSubtotalCents: i.lineSubtotalCents,
      refundedQuantity: Number(i.refundedQuantity),
      refundedCents: i.refundedCents,
    })),
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    taxLabel: order.taxLabel,
    taxRateBps: order.taxRateBps,
    totalCents: order.totalCents,
    refundedCents: order.refundedCents,
    netPaidCents: order.totalCents - order.refundedCents,
    currency: order.currency,
    payment: payment
      ? { method: paymentMethodLabel(payment), transactionId: payment.providerPaymentId, paidAt: payment.paidAt?.toISOString() ?? null }
      : null,
    refunds: order.refunds.map((r) => ({
      id: r.id,
      type: r.type,
      amountCents: r.amountCents,
      reason: r.reason,
      transactionId: r.providerRefundId,
      date: (r.succeededAt ?? r.createdAt).toISOString(),
      items: Array.isArray(r.items) ? (r.items as { productName: string; quantity: number; amountCents: number }[]) : [],
    })),
    timeline: {
      paidAt: order.paidAt?.toISOString() ?? null,
      readyAt: order.readyAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      cancelledAt: order.cancelledAt?.toISOString() ?? null,
    },
    store: {
      name: settings.storeName,
      address: settings.addressLine,
      phone: settings.phone,
      email: settings.email,
      footer: settings.receiptFooter,
      pickupInstructions: settings.pickupInstructions,
    },
  };
}
