import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth-helpers";
import { formatDateTime, formatMoney, formatQuantity, formatRate } from "@/lib/money";
import { PAYMENT_STATUS_LABEL, REFUND_TYPE_LABEL } from "@/lib/labels";
import { loadReceipt } from "@/lib/receipt";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";
import { ChevronLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Receipt" };

/** 80 mm receipt layout for printing from any computer (the POS agent prints the text version). Card numbers are never shown. */
export default async function StoreReceipt({ params }: PageProps<"/store/orders/[id]/receipt">) {
  await requireStaff("printReceipt");
  const r = await loadReceipt((await params).id);
  if (!r) notFound();

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href={`/store/orders/${r.orderId}`} className="btn-ghost -ml-3">
          <ChevronLeftIcon /> Back to order
        </Link>
        <PrintButton label="Print receipt" />
      </div>
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } header, nav { display: none !important; } main { padding: 0 !important; } }`}</style>
      <article className="print-plain mx-auto w-[80mm] max-w-full bg-white p-4 font-mono text-[12px] leading-snug text-black shadow">
        <div className="text-center">
          <Logo size={64} className="mx-auto" />
          <p className="mt-1 text-sm font-bold">{r.store.name}</p>
          <p>{r.store.address}</p>
          {r.store.phone && <p>{r.store.phone}</p>}
        </div>
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center text-base font-bold">ORDER #{r.orderNumber}</p>
        <p className="text-center">{formatDateTime(r.placedAt)}</p>
        <hr className="my-2 border-dashed border-black" />
        <p>Customer: {r.customerName}</p>
        <p className="break-all">{r.customerEmail}</p>
        <hr className="my-2 border-dashed border-black" />
        {r.items.map((i) => (
          <div key={i.id} className="mb-1">
            <p className="font-bold">{i.name}</p>
            <p className="flex justify-between">
              <span>
                {formatQuantity(i.quantity, i.unitLabel)} @ {formatMoney(i.unitPriceCents)}/{i.unitLabel}
              </span>
              <span>{formatMoney(i.lineSubtotalCents)}</span>
            </p>
            {i.refundedQuantity > 0 && <p>  Refunded {formatQuantity(i.refundedQuantity, i.unitLabel)}</p>}
          </div>
        ))}
        <hr className="my-2 border-dashed border-black" />
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(r.subtotalCents)}</span>
        </p>
        <p className="flex justify-between">
          <span>
            {r.taxLabel} {formatRate(r.taxRateBps)}
          </span>
          <span>{formatMoney(r.taxCents)}</span>
        </p>
        <p className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatMoney(r.totalCents)}</span>
        </p>
        {r.refunds.map((f) => (
          <p key={f.id} className="flex justify-between">
            <span>{REFUND_TYPE_LABEL[f.type]}</span>
            <span>-{formatMoney(f.amountCents)}</span>
          </p>
        ))}
        {r.refundedCents > 0 && (
          <p className="flex justify-between font-bold">
            <span>UPDATED TOTAL</span>
            <span>{formatMoney(r.netPaidCents)}</span>
          </p>
        )}
        <hr className="my-2 border-dashed border-black" />
        <p>Payment: {r.payment?.method ?? "—"}</p>
        <p>Status: {PAYMENT_STATUS_LABEL[r.paymentStatus]}</p>
        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">{r.store.footer}</p>
      </article>
    </div>
  );
}
