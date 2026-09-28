import type { Metadata } from "next";
import Link from "next/link";
import { receiptForPage } from "@/lib/orders/page-access";
import { formatDateTime, formatMoney, formatQuantity, formatRate } from "@/lib/money";
import { PAYMENT_STATUS_LABEL, REFUND_TYPE_LABEL } from "@/lib/labels";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { ChevronLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: PageProps<"/orders/[id]/receipt">) {
  const r = await receiptForPage((await params).id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/orders/${r.orderId}`} className="btn-ghost -ml-3">
          <ChevronLeftIcon /> Back to order
        </Link>
        <PrintButton />
      </div>

      <article className="card print-plain p-6 sm:p-10" aria-label={`Receipt for order ${r.orderNumber}`}>
        <header className="flex items-center gap-4 border-b border-line pb-5">
          <Logo size={72} />
          <div>
            <h1 className="text-2xl font-extrabold">{r.store.name}</h1>
            <p className="text-sm text-muted">{r.store.address}</p>
            {r.store.phone && <p className="text-sm text-muted">{r.store.phone}</p>}
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 py-5 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Order number</dt>
          <dd className="text-right text-base font-extrabold sm:text-left">{r.orderNumber}</dd>
          <dt className="text-muted">Date &amp; time</dt>
          <dd className="text-right sm:text-left">{formatDateTime(r.placedAt)}</dd>
          <dt className="text-muted">Customer</dt>
          <dd className="text-right sm:text-left">{r.customerName}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="text-right break-all sm:text-left">{r.customerEmail}</dd>
          <dt className="text-muted">Payment method</dt>
          <dd className="text-right sm:text-left">{r.payment?.method ?? "—"}</dd>
          <dt className="text-muted">Payment status</dt>
          <dd className="text-right font-semibold sm:text-left">{PAYMENT_STATUS_LABEL[r.paymentStatus]}</dd>
          {r.payment && (
            <>
              <dt className="text-muted">Transaction ID</dt>
              <dd className="text-right text-xs break-all sm:text-left">{r.payment.transactionId}</dd>
            </>
          )}
        </dl>

        <table className="w-full border-t border-line text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Unit price</th>
              <th className="py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-y border-line">
            {r.items.map((i) => (
              <tr key={i.id}>
                <td className="py-2 pr-2 font-semibold">
                  {i.name}
                  {i.refundedQuantity > 0 && (
                    <span className="block text-xs font-normal text-accent-500">
                      Refunded {formatQuantity(i.refundedQuantity, i.unitLabel)}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right whitespace-nowrap">{formatQuantity(i.quantity, i.unitLabel)}</td>
                <td className="py-2 text-right whitespace-nowrap">
                  {formatMoney(i.unitPriceCents)}/{i.unitLabel}
                </td>
                <td className="py-2 text-right font-semibold">{formatMoney(i.lineSubtotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(r.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>
              {r.taxLabel} ({formatRate(r.taxRateBps)})
            </dt>
            <dd>{formatMoney(r.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 text-base font-extrabold">
            <dt>Total paid</dt>
            <dd>{formatMoney(r.totalCents)}</dd>
          </div>
          {r.refunds.map((f) => (
            <div key={f.id} className="flex justify-between text-accent-500">
              <dt>
                {REFUND_TYPE_LABEL[f.type]} <span className="text-xs text-muted">({formatDateTime(f.date)})</span>
              </dt>
              <dd>-{formatMoney(f.amountCents)}</dd>
            </div>
          ))}
          {r.refundedCents > 0 && (
            <div className="flex justify-between border-t border-line pt-1.5 text-base font-extrabold">
              <dt>Updated total</dt>
              <dd>{formatMoney(r.netPaidCents)}</dd>
            </div>
          )}
        </dl>

        {r.refunds.some((f) => f.transactionId) && (
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
            {r.refunds.map((f) => f.transactionId && <p key={f.id}>Refund ID: {f.transactionId}</p>)}
          </div>
        )}

        <footer className="mt-8 border-t border-line pt-4 text-center text-sm text-muted">{r.store.footer}</footer>
      </article>
    </div>
  );
}
