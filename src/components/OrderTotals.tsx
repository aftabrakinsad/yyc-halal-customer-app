import { formatMoney, formatRate } from "@/lib/money";

export function OrderTotals({
  subtotalCents,
  taxCents,
  taxLabel,
  taxRateBps,
  totalCents,
  refundedCents = 0,
  totalLabel = "Order Total",
}: {
  subtotalCents: number;
  taxCents: number;
  taxLabel: string;
  taxRateBps: number;
  totalCents: number;
  refundedCents?: number;
  totalLabel?: string;
}) {
  return (
    <dl className="space-y-2 text-base">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd className="font-semibold">{formatMoney(subtotalCents)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">
          Tax ({taxLabel} {formatRate(taxRateBps)})
        </dt>
        <dd className="font-semibold">{formatMoney(taxCents)}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-2 text-xl font-extrabold">
        <dt>{refundedCents > 0 ? "Original Total" : totalLabel}</dt>
        <dd>{formatMoney(totalCents)}</dd>
      </div>
      {refundedCents > 0 && (
        <>
          <div className="flex justify-between font-semibold text-accent-500">
            <dt>Refund</dt>
            <dd>-{formatMoney(refundedCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-xl font-extrabold">
            <dt>Updated Total</dt>
            <dd>{formatMoney(totalCents - refundedCents)}</dd>
          </div>
        </>
      )}
    </dl>
  );
}
