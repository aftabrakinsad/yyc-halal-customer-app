import type { Metadata } from "next";
import Link from "next/link";
import { receiptForPage } from "@/lib/orders/page-access";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/money";
import { REFUND_TYPE_LABEL } from "@/lib/labels";
import { StatusTracker } from "@/components/orders/StatusTracker";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { OrderTotals } from "@/components/OrderTotals";
import { ProductImage } from "@/components/ProductImage";
import { ChevronLeftIcon, ReceiptIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const r = await receiptForPage((await params).id);
  const ready = r.status === "READY_FOR_PICKUP";

  return (
    <div className="space-y-5">
      <Link href="/orders" className="btn-ghost -ml-3">
        <ChevronLeftIcon /> My Orders
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-muted uppercase">Order number</p>
          <h1 className="text-3xl font-extrabold tracking-wide">#{r.orderNumber}</h1>
          <p className="text-muted">Placed {formatDateTime(r.placedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={r.status} />
          <PaymentStatusBadge status={r.paymentStatus} />
        </div>
      </header>

      {ready && (
        <div role="status" className="rounded-2xl bg-gold-400 p-5 text-ink">
          <p className="text-xl font-extrabold">Your order is ready for pickup!</p>
          <p className="mt-1">{r.store.pickupInstructions}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-5">
          <section className="card p-5" aria-labelledby="progress-heading">
            <h2 id="progress-heading" className="mb-4 text-lg font-bold">
              Order status
            </h2>
            {r.status === "CANCELLED" ? (
              <p className="rounded-xl bg-accent-50 p-4 font-semibold text-accent-500">
                This order was cancelled{r.timeline.cancelledAt ? ` on ${formatDateTime(r.timeline.cancelledAt)}` : ""}.
                {r.refundedCents > 0 && ` ${formatMoney(r.refundedCents)} was refunded to your original payment method.`}
              </p>
            ) : (
              <StatusTracker status={r.status} timeline={r.timeline} />
            )}
          </section>

          <section className="card p-5" aria-labelledby="items-heading">
            <h2 id="items-heading" className="text-lg font-bold">
              Items
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {r.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-3">
                  <ProductImage src={i.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{i.name}</p>
                    <p className="text-muted">
                      {formatQuantity(i.quantity, i.unitLabel)} × {formatMoney(i.unitPriceCents)}/{i.unitLabel}
                    </p>
                    {i.refundedQuantity > 0 && (
                      <p className="text-sm font-semibold text-accent-500">
                        Refunded {formatQuantity(i.refundedQuantity, i.unitLabel)} (-{formatMoney(i.refundedCents)})
                      </p>
                    )}
                  </div>
                  <p className="font-bold">{formatMoney(i.lineSubtotalCents)}</p>
                </li>
              ))}
            </ul>
          </section>

          {r.refunds.length > 0 && (
            <section className="card p-5" aria-labelledby="refunds-heading">
              <h2 id="refunds-heading" className="text-lg font-bold">
                Refunds
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {r.refunds.map((f) => (
                  <li key={f.id} className="py-3">
                    <div className="flex justify-between gap-2 font-semibold">
                      <span>{REFUND_TYPE_LABEL[f.type]}</span>
                      <span className="text-accent-500">-{formatMoney(f.amountCents)}</span>
                    </div>
                    <p className="text-sm text-muted">{formatDateTime(f.date)}</p>
                    {f.items.map((it, idx) => (
                      <p key={idx} className="text-sm">
                        {it.productName} × {it.quantity}
                      </p>
                    ))}
                    {f.reason && <p className="text-sm">Reason: {f.reason}</p>}
                    {f.transactionId && <p className="text-xs break-all text-muted">Refund ID: {f.transactionId}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="card space-y-4 p-5" aria-labelledby="total-heading">
            <h2 id="total-heading" className="text-lg font-bold">
              Total
            </h2>
            <OrderTotals
              subtotalCents={r.subtotalCents}
              taxCents={r.taxCents}
              taxLabel={r.taxLabel}
              taxRateBps={r.taxRateBps}
              totalCents={r.totalCents}
              refundedCents={r.refundedCents}
              totalLabel="Total Paid"
            />
            <dl className="space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Payment</dt>
                <dd className="text-right font-semibold">{r.payment?.method ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Status</dt>
                <dd>
                  <PaymentStatusBadge status={r.paymentStatus} />
                </dd>
              </div>
            </dl>
            <Link href={`/orders/${r.orderId}/receipt`} className="btn-secondary w-full">
              <ReceiptIcon /> View / print receipt
            </Link>
          </section>
          <section className="card p-5 text-sm text-muted">
            <p className="font-bold text-ink">{r.store.name}</p>
            <p>{r.store.address}</p>
            {r.store.phone && (
              <p>
                <a href={`tel:${r.store.phone}`} className="font-semibold text-brand-700 underline">
                  {r.store.phone}
                </a>
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
