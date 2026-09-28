import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/money";
import { loadReceipt } from "@/lib/receipt";
import { searchOrders } from "@/lib/store/orders";
import { REFUND_TYPE_LABEL } from "@/lib/labels";
import { RefundTool } from "@/components/store/RefundTool";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/StatusBadge";
import { SearchIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Refunds" };

export default async function RefundsPage({ searchParams }: PageProps<"/store/refunds">) {
  await requireStaff("refund");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  let orderId = typeof sp.order === "string" ? sp.order : null;
  let matches: Awaited<ReturnType<typeof searchOrders>> = [];
  if (!orderId && q) {
    matches = await searchOrders({ q, limit: 20 });
    if (matches.length === 1 || matches[0]?.orderNumber === q.toUpperCase()) orderId = matches[0].id;
  }
  const receipt = orderId ? await loadReceipt(orderId) : null;
  const units = receipt ? await db.orderItem.findMany({ where: { orderId: receipt.orderId }, select: { id: true, unitCode: true } }) : [];
  const unitRules = await db.unit.findMany({ select: { code: true, allowsDecimal: true } });
  const recent = await db.refund.findMany({
    where: { status: "SUCCEEDED" },
    orderBy: { succeededAt: "desc" },
    take: 10,
    include: { order: { select: { orderNumber: true, id: true } }, createdBy: { select: { name: true } } },
  });

  const refundable = receipt && (receipt.paymentStatus === "PAID" || receipt.paymentStatus === "PARTIALLY_REFUNDED");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-black">Refunds</h1>
      <form action="/store/refunds" role="search" className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Order number</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Order number, e.g. YYC-2026-001245" className="input min-h-14 pl-12 text-lg" autoFocus={!receipt} autoComplete="off" />
        </label>
        <button className="btn-primary min-h-14 px-6">Find order</button>
      </form>

      {q && !receipt && (
        <div className="card p-5">
          {matches.length === 0 ? (
            <p className="text-muted">No order found for “{q}”.</p>
          ) : (
            <>
              <p className="mb-2 font-semibold">Choose the order:</p>
              <ul className="divide-y divide-line">
                {matches.map((m) => (
                  <li key={m.id}>
                    <Link href={`/store/refunds?order=${m.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:underline">
                      <span className="font-extrabold">{m.orderNumber}</span>
                      <span>{m.customerName}</span>
                      <span>{formatMoney(m.totalCents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {receipt && (
        <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="order-h">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="order-h" className="text-2xl font-black">
                <Link href={`/store/orders/${receipt.orderId}`} className="hover:underline">
                  {receipt.orderNumber}
                </Link>
              </h2>
              <p className="text-muted">
                {receipt.customerName} · {receipt.customerEmail} · {formatDateTime(receipt.placedAt)}
              </p>
              <div className="mt-2 flex gap-2">
                <OrderStatusBadge status={receipt.status} />
                <PaymentStatusBadge status={receipt.paymentStatus} />
              </div>
            </div>
            <dl className="rounded-2xl bg-cream p-4 text-right">
              <dt className="text-sm text-muted">Original payment</dt>
              <dd className="text-2xl font-black">{formatMoney(receipt.totalCents)}</dd>
              <dd className="text-sm">{receipt.payment?.method}</dd>
              {receipt.refundedCents > 0 && (
                <>
                  <dd className="text-sm font-semibold text-accent-500">Refunded -{formatMoney(receipt.refundedCents)}</dd>
                  <dd className="text-sm font-bold">Remaining {formatMoney(receipt.netPaidCents)}</dd>
                </>
              )}
            </dl>
          </div>
          {refundable ? (
            <RefundTool
              key={`${receipt.orderId}:${receipt.refundedCents}`}
              order={{
                id: receipt.orderId,
                orderNumber: receipt.orderNumber,
                customerName: receipt.customerName,
                status: receipt.status,
                totalCents: receipt.totalCents,
                refundedCents: receipt.refundedCents,
                paymentMethod: receipt.payment?.method ?? "original payment method",
                items: receipt.items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  quantity: i.quantity,
                  refundedQuantity: i.refundedQuantity,
                  unitLabel: i.unitLabel,
                  unitPriceCents: i.unitPriceCents,
                  allowsDecimal: unitRules.find((u) => u.code === units.find((x) => x.id === i.id)?.unitCode)?.allowsDecimal ?? false,
                })),
              }}
            />
          ) : (
            <p className="rounded-xl bg-cream p-4 font-semibold">This order has nothing left to refund.</p>
          )}
        </section>
      )}

      <section className="card p-5" aria-labelledby="recent-h">
        <h2 id="recent-h" className="text-lg font-bold">
          Recent refunds
        </h2>
        {recent.length === 0 ? (
          <p className="text-muted">No refunds yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/store/orders/${r.order.id}`} className="font-bold text-brand-700 underline">
                  {r.order.orderNumber}
                </Link>
                <span className="text-sm">{REFUND_TYPE_LABEL[r.type]}</span>
                <span className="text-sm text-muted">
                  {formatDateTime(r.succeededAt ?? r.createdAt)} · {r.createdBy?.name ?? "payment provider"}
                </span>
                <span className="font-bold text-accent-500">-{formatMoney(r.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
