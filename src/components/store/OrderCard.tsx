"use client";

import Link from "next/link";
import type { StoreOrderCard } from "@/lib/store/orders";
import { formatMoney, formatQuantity, TIME_ZONE } from "@/lib/money";
import { OrderStatusBadge, PaymentStatusBadge } from "../orders/StatusBadge";
import { StatusButtons } from "./StatusButtons";
import { PrintReceiptButton } from "./PrintReceiptButton";
import { useStoreRealtime } from "./StoreRealtime";

const time = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

function minutesAgo(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
}

/** One order, readable at arm's length: number, items and status first; big action button at the bottom. */
export function OrderCard({ order }: { order: StoreOrderCard }) {
  const { newIds, acknowledge } = useStoreRealtime();
  const isNew = newIds.has(order.id);
  const ready = order.status === "READY_FOR_PICKUP";
  const productCount = order.items.length;

  return (
    <article
      onPointerDown={() => acknowledge(order.id)}
      onFocus={() => acknowledge(order.id)}
      className={`flex h-full flex-col rounded-2xl border-2 bg-white shadow-sm ${
        isNew ? "border-accent-500 ring-4 ring-accent-500/20" : ready ? "border-gold-400" : "border-line"
      }`}
      aria-label={`Order ${order.orderNumber}`}
    >
      <header className={`rounded-t-[14px] px-4 pt-3 pb-3 ${ready ? "bg-gold-400/25" : "bg-brand-50"}`}>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/store/orders/${order.id}`} className="text-2xl font-black tracking-wide hover:underline">
            #{order.orderNumber.replace(/^YYC-\d{4}-/, "")}
            <span className="block text-xs font-semibold tracking-normal text-muted">{order.orderNumber}</span>
          </Link>
          <div className="flex flex-col items-end gap-1">
            {isNew && <span className="rounded-full bg-accent-500 px-3 py-0.5 text-sm font-black text-white">NEW</span>}
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
        <p className="mt-1 text-lg font-bold">{order.customerName}</p>
        <p className="truncate text-sm text-muted">{order.customerEmail}</p>
        <p className="mt-1 text-sm font-semibold">
          {time(order.paidAt)} <span className="font-normal text-muted" suppressHydrationWarning>· {minutesAgo(order.paidAt)}</span>
        </p>
      </header>

      <div className="flex-1 px-4 py-3">
        <p className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">
          {productCount} product{productCount === 1 ? "" : "s"}
        </p>
        <ul className="divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.id} className="py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg leading-snug">
                  <span className="font-black">{formatQuantity(i.quantity, i.unitLabel)}</span> {i.name}
                </span>
                <span className="font-semibold whitespace-nowrap">{formatMoney(i.lineSubtotalCents)}</span>
              </div>
              <p className="text-sm text-muted">
                {formatMoney(i.unitPriceCents)} / {i.unitLabel}
                {i.refundedQuantity > 0 && <span className="font-semibold text-accent-500"> · refunded {formatQuantity(i.refundedQuantity, i.unitLabel)}</span>}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-0.5 border-t border-line pt-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatMoney(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Tax</dt>
            <dd>{formatMoney(order.taxCents)}</dd>
          </div>
          <div className="flex justify-between text-base font-extrabold">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalCents)}</dd>
          </div>
          {order.refundedCents > 0 && (
            <div className="flex justify-between font-semibold text-accent-500">
              <dt>Refunded</dt>
              <dd>-{formatMoney(order.refundedCents)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-2">
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <footer className="space-y-3 border-t border-line p-4">
        <StatusButtons orderId={order.id} orderNumber={order.orderNumber} status={order.status} />
        <PrintReceiptButton orderId={order.id} orderNumber={order.orderNumber} />
      </footer>
    </article>
  );
}
