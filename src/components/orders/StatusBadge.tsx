import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";

const ORDER_CLS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-line text-ink",
  IN_PROGRESS: "bg-brand-100 text-brand-800",
  READY_FOR_PICKUP: "bg-gold-400 text-ink",
  COMPLETED: "bg-ink text-white",
  CANCELLED: "bg-accent-50 text-accent-500",
};

const PAYMENT_CLS: Record<PaymentStatus, string> = {
  PENDING: "bg-line text-ink",
  PAID: "bg-brand-50 text-brand-700",
  FAILED: "bg-accent-50 text-accent-500",
  PARTIALLY_REFUNDED: "bg-gold-400/30 text-ink",
  REFUNDED: "bg-accent-50 text-accent-500",
  CANCELLED: "bg-accent-50 text-accent-500",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${ORDER_CLS[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${PAYMENT_CLS[status]}`}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
