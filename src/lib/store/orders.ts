import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { db } from "../db";

export type OrderSearch = { q?: string | null; status?: string | null; payment?: string | null; limit?: number };

/** Confirmed (paid) orders only — failed/abandoned checkouts never show up in the store app. */
export async function searchOrders({ q, status, payment, limit = 100 }: OrderSearch) {
  const text = q?.trim();
  const statuses = (status ?? "").split(",").filter((s): s is OrderStatus => s in OrderStatus);
  const payments = (payment ?? "").split(",").filter((s): s is PaymentStatus => s in PaymentStatus);
  const where: Prisma.OrderWhereInput = {
    orderNumber: { not: null },
    ...(statuses.length ? { status: { in: statuses } } : {}),
    ...(payments.length ? { paymentStatus: { in: payments } } : {}),
    ...(text
      ? {
          OR: [
            { orderNumber: { contains: text, mode: "insensitive" } },
            { customerName: { contains: text, mode: "insensitive" } },
            { customerEmail: { contains: text, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orders = await db.order.findMany({
    where,
    orderBy: { paidAt: "desc" },
    take: Math.min(limit, 500),
    include: { items: true },
  });
  // An exact order-number match always comes first.
  if (text) {
    const exact = text.toUpperCase().replace(/^#/, "");
    orders.sort((a, b) => Number(b.orderNumber === exact) - Number(a.orderNumber === exact));
  }
  return orders;
}

export type StoreOrderCard = {
  id: string;
  orderNumber: string;
  paidAt: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  refundedCents: number;
  items: { id: string; name: string; quantity: number; unitLabel: string; unitPriceCents: number; lineSubtotalCents: number; refundedQuantity: number }[];
};

export function toCard(o: Awaited<ReturnType<typeof searchOrders>>[number]): StoreOrderCard {
  return {
    id: o.id,
    orderNumber: o.orderNumber!,
    paidAt: (o.paidAt ?? o.createdAt).toISOString(),
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    status: o.status,
    paymentStatus: o.paymentStatus,
    subtotalCents: o.subtotalCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    refundedCents: o.refundedCents,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.productName,
      quantity: Number(i.quantity),
      unitLabel: i.unitLabel,
      unitPriceCents: i.unitPriceCents,
      lineSubtotalCents: i.lineSubtotalCents,
      refundedQuantity: Number(i.refundedQuantity),
    })),
  };
}
