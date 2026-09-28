import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatDate, formatDateTime, formatMoney, formatQuantity, formatRate, TIME_ZONE } from "@/lib/money";
import { REFUND_TYPE_LABEL } from "@/lib/labels";
import { loadReceipt } from "@/lib/receipt";
import { orderHistory } from "@/lib/store/history";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { StatusButtons } from "@/components/store/StatusButtons";
import { PrintReceiptButton } from "@/components/store/PrintReceiptButton";
import { ChevronLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Order details" };

const timeOnly = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, timeStyle: "short" }).format(new Date(iso));

export default async function StoreOrderDetail({ params }: PageProps<"/store/orders/[id]">) {
  const user = await requireStaff("viewOrders");
  const { id } = await params;
  const r = await loadReceipt(id);
  if (!r) notFound();
  const [people, refunds, history] = await Promise.all([
    db.order.findUnique({
      where: { id },
      select: { readyBy: { select: { name: true } }, completedBy: { select: { name: true } }, cancelledBy: { select: { name: true } } },
    }),
    db.refund.findMany({ where: { orderId: id }, orderBy: { createdAt: "asc" }, include: { createdBy: { select: { name: true, id: true } } } }),
    orderHistory(id),
  ]);
  const canRefund = can(user.role, "refund") && (r.paymentStatus === "PAID" || r.paymentStatus === "PARTIALLY_REFUNDED");

  return (
    <div className="space-y-5">
      <Link href="/store/orders" className="btn-ghost -ml-3">
        <ChevronLeftIcon /> Orders
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-wide text-muted uppercase">Order</p>
          <h1 className="text-3xl font-black tracking-wide">{r.orderNumber}</h1>
          <p className="text-muted">
            {formatDate(r.placedAt)} at {timeOnly(r.placedAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <OrderStatusBadge status={r.status} />
            <PaymentStatusBadge status={r.paymentStatus} />
          </div>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <StatusButtons orderId={r.orderId} orderNumber={r.orderNumber} status={r.status} compact />
          <PrintReceiptButton orderId={r.orderId} orderNumber={r.orderNumber} />
          {canRefund && (
            <Link href={`/store/refunds?order=${r.orderId}`} className="btn-danger w-full">
              Refund or cancel…
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="space-y-5">
          <section className="card p-5" aria-labelledby="customer-h">
            <h2 id="customer-h" className="text-lg font-bold">
              Customer
            </h2>
            <p className="mt-1 text-lg font-semibold">{r.customerName}</p>
            <p className="text-muted">{r.customerEmail}</p>
          </section>

          <section className="card overflow-x-auto p-5" aria-labelledby="products-h">
            <h2 id="products-h" className="text-lg font-bold">
              Products
            </h2>
            <table className="mt-2 w-full min-w-[520px] text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 text-right font-semibold">Quantity</th>
                  <th className="py-2 text-right font-semibold">Price</th>
                  <th className="py-2 text-right font-semibold">Item total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {r.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 font-semibold">
                      {i.name}
                      {i.refundedQuantity > 0 && (
                        <span className="block text-sm font-normal text-accent-500">
                          Refunded {formatQuantity(i.refundedQuantity, i.unitLabel)} (-{formatMoney(i.refundedCents)} before tax)
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">{formatQuantity(i.quantity, i.unitLabel)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {formatMoney(i.unitPriceCents)}/{i.unitLabel}
                    </td>
                    <td className="py-2 text-right font-semibold">{formatMoney(i.lineSubtotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card p-5" aria-labelledby="refunds-h">
            <h2 id="refunds-h" className="text-lg font-bold">
              Refunds
            </h2>
            {refunds.length === 0 ? (
              <p className="mt-1 text-muted">No refunds.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {refunds.map((f) => {
                  const items = Array.isArray(f.items) ? (f.items as { productName: string; quantity: number; unitLabel?: string; amountCents: number }[]) : [];
                  return (
                    <li key={f.id} className="py-3">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-bold">
                          {REFUND_TYPE_LABEL[f.type]}{" "}
                          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${f.status === "SUCCEEDED" ? "bg-brand-50 text-brand-700" : f.status === "FAILED" ? "bg-accent-50 text-accent-500" : "bg-line"}`}>
                            {f.status.toLowerCase()}
                          </span>
                        </span>
                        <span className="font-extrabold text-accent-500">-{formatMoney(f.amountCents)}</span>
                      </div>
                      {items.map((it, i) => (
                        <p key={i} className="text-sm">
                          {it.productName} × {it.quantity}
                          {it.unitLabel ? ` ${it.unitLabel}` : ""} ({formatMoney(it.amountCents)} incl. tax)
                        </p>
                      ))}
                      <p className="text-sm text-muted">
                        {formatDateTime(f.succeededAt ?? f.createdAt)} · by {f.createdBy?.name ?? "payment provider"}
                        {f.createdBy && <span className="text-xs"> (ID {f.createdBy.id})</span>}
                      </p>
                      {(f.reasonCategory || f.reason) && (
                        <p className="text-sm">Reason: {[f.reasonCategory, f.reason].filter(Boolean).join(" — ")}</p>
                      )}
                      {f.providerRefundId && <p className="text-xs break-all text-muted">Refund transaction ID: {f.providerRefundId}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card space-y-2 p-5" aria-labelledby="payment-h">
            <h2 id="payment-h" className="text-lg font-bold">
              Payment
            </h2>
            <dl className="space-y-1.5">
              <Row label="Subtotal" value={formatMoney(r.subtotalCents)} />
              <Row label={`Tax (${r.taxLabel} ${formatRate(r.taxRateBps)})`} value={formatMoney(r.taxCents)} />
              <Row label="Total" value={formatMoney(r.totalCents)} bold />
              {r.refundedCents > 0 && (
                <>
                  <Row label="Refunded" value={`-${formatMoney(r.refundedCents)}`} accent />
                  <Row label="Remaining" value={formatMoney(r.netPaidCents)} bold />
                </>
              )}
              <Row label="Payment method" value={r.payment?.method ?? "—"} />
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Payment status</dt>
                <dd>
                  <PaymentStatusBadge status={r.paymentStatus} />
                </dd>
              </div>
              {r.payment && (
                <div>
                  <dt className="text-muted">Transaction ID</dt>
                  <dd className="text-sm break-all">{r.payment.transactionId}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="card p-5" aria-labelledby="history-h">
            <h2 id="history-h" className="text-lg font-bold">
              Order history
            </h2>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border-2 border-white bg-brand-600" aria-hidden />
                  <p className="font-semibold">{h.text}</p>
                  <p className="text-sm text-muted">
                    {formatDateTime(h.at)} · {h.who}
                  </p>
                </li>
              ))}
            </ol>
            {(people?.completedBy || people?.cancelledBy) && (
              <p className="mt-4 rounded-xl bg-cream p-3 text-sm">
                {people.completedBy && r.timeline.completedAt && (
                  <>
                    Completed by <strong>{people.completedBy.name}</strong> on {formatDateTime(r.timeline.completedAt)}
                  </>
                )}
                {people.cancelledBy && r.timeline.cancelledAt && (
                  <>
                    Cancelled by <strong>{people.cancelledBy.name}</strong> on {formatDateTime(r.timeline.cancelledAt)}
                  </>
                )}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "text-lg font-extrabold" : ""} ${accent ? "font-semibold text-accent-500" : ""}`}>
      <dt className={bold || accent ? "" : "text-muted"}>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
