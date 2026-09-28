"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatMoney, formatQuantity } from "@/lib/money";
import { REFUND_REASONS } from "@/lib/permissions";
import { useToast } from "../shell/Toaster";
import { AlertIcon } from "../icons";
import { storePost } from "./api";

export type RefundableOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalCents: number;
  refundedCents: number;
  paymentMethod: string;
  items: { id: string; name: string; quantity: number; refundedQuantity: number; unitLabel: string; unitPriceCents: number; allowsDecimal: boolean }[];
};

type Preview = {
  amountCents: number;
  remainingBeforeCents: number;
  remainingAfterCents: number;
  items: { productName: string; quantity: number; unitLabel?: string; amountCents: number }[];
  orderNumber: string;
  originalTotalCents: number;
  alreadyRefundedCents: number;
  payment: { method: string; transactionId: string };
};

type Mode = "full" | "items";

/**
 * Refunds move real money, so: the server calculates the amount, the employee sees the order
 * number, original payment and refund amount, ticks a confirmation, and the server re-checks
 * that the order number and amount match what was confirmed before calling the processor.
 */
export function RefundTool({ order }: { order: RefundableOrder }) {
  const router = useRouter();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("full");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [reasonCategory, setReasonCategory] = useState<string>("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const cancelling = mode === "full" && (order.status === "IN_PROGRESS" || order.status === "READY_FOR_PICKUP");
  const itemRequest = () =>
    order.items
      .map((i) => ({ orderItemId: i.id, quantity: Number(qty[i.id] || 0) }))
      .filter((i) => i.quantity > 0);

  const requestBody = () => (mode === "full" ? { type: cancelling ? "CANCELLATION" : "FULL" } : { type: "ITEM", items: itemRequest() });

  const review = async () => {
    setError(null);
    if (!reasonCategory) return setError("Choose a refund reason.");
    if (mode === "items" && !itemRequest().length) return setError("Enter a quantity for at least one item.");
    setBusy(true);
    try {
      const p = await storePost<Preview>(`/api/store/orders/${order.id}/refunds/preview`, requestBody());
      setPreview(p);
      setConfirmed(false);
      dialog.current?.showModal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const guard = { confirmOrderNumber: preview.orderNumber, expectedAmountCents: preview.amountCents, reasonCategory, reason: reason || undefined };
    try {
      if (cancelling) await storePost(`/api/store/orders/${order.id}/cancel`, guard);
      else if (mode === "full") await storePost(`/api/store/orders/${order.id}/refunds`, { type: "FULL", ...guard });
      else await storePost(`/api/store/orders/${order.id}/refunds`, { type: "ITEM", items: itemRequest(), ...guard });
      dialog.current?.close();
      const msg = `${formatMoney(preview.amountCents)} refunded to ${preview.payment.method}${cancelling ? " and the order was cancelled" : ""}.`;
      setDone(msg);
      toast({ title: `Refund complete — #${order.orderNumber}`, body: msg });
      setQty({});
      router.refresh();
    } catch (e) {
      const err = e as Error & { details?: { code?: string } };
      if (err.details?.code === "AMOUNT_CHANGED") {
        dialog.current?.close();
        setError(`${err.message}`);
      } else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {done && (
        <p role="status" className="rounded-xl bg-brand-50 p-4 font-bold text-brand-800">
          ✓ {done} The customer has been emailed and their app is updated.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Refund method">
        {(
          [
            ["full", order.status === "COMPLETED" ? "Refund Entire Order" : "Cancel & Refund Entire Order", "Everything left on the order goes back to the customer's card."],
            ["items", "Refund Individual Items", "Pick products and the quantity to refund. Tax is adjusted automatically."],
          ] as const
        ).map(([value, title, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-2xl border-2 p-4 text-left ${mode === value ? "border-accent-500 bg-accent-50" : "border-line bg-white hover:border-accent-500/50"}`}
          >
            <span className="block text-lg font-extrabold">{title}</span>
            <span className="block text-sm text-muted">{text}</span>
          </button>
        ))}
      </div>

      {mode === "items" && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[560px] text-left">
            <thead className="bg-cream text-sm text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Product</th>
                <th className="px-4 py-2 font-semibold">Ordered</th>
                <th className="px-4 py-2 font-semibold">Can refund</th>
                <th className="px-4 py-2 font-semibold">Refund quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((i) => {
                const left = Number((i.quantity - i.refundedQuantity).toFixed(3));
                return (
                  <tr key={i.id}>
                    <td className="px-4 py-3 font-semibold">
                      {i.name}
                      <span className="block text-sm font-normal text-muted">
                        {formatMoney(i.unitPriceCents)} / {i.unitLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatQuantity(i.quantity, i.unitLabel)}</td>
                    <td className="px-4 py-3">{left > 0 ? formatQuantity(left, i.unitLabel) : <span className="text-muted">Fully refunded</span>}</td>
                    <td className="px-4 py-3">
                      {left > 0 && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={left}
                            step={i.allowsDecimal ? 0.01 : 1}
                            value={qty[i.id] ?? ""}
                            onChange={(e) => setQty((q) => ({ ...q, [i.id]: e.target.value }))}
                            placeholder="0"
                            aria-label={`Quantity of ${i.name} to refund (${i.unitLabel})`}
                            className="input w-28"
                          />
                          <span className="text-muted">{i.unitLabel}</span>
                          <button type="button" className="btn-ghost min-h-10 px-3 text-sm" onClick={() => setQty((q) => ({ ...q, [i.id]: String(left) }))}>
                            All
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[260px_1fr]">
        <label className="block font-semibold">
          Reason <span className="text-accent-500">*</span>
          <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)} className="input mt-1" required>
            <option value="">Choose a reason…</option>
            {REFUND_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block font-semibold">
          Note (optional, shown to the customer)
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="input mt-1" placeholder="e.g. Sorry, the lamb chops sold out." />
        </label>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
          <AlertIcon className="shrink-0" /> {error}
        </p>
      )}

      <button type="button" onClick={review} disabled={busy} className="btn-danger btn-lg w-full sm:w-auto">
        {busy ? "Calculating…" : "Review refund…"}
      </button>

      <dialog
        ref={dialog}
        className="m-auto w-[min(560px,calc(100%-2rem))] rounded-3xl p-0 shadow-2xl backdrop:bg-black/50"
        aria-labelledby="confirm-h"
        onClose={() => setConfirmed(false)}
      >
        {preview && (
          <div className="space-y-4 p-6">
            <h2 id="confirm-h" className="text-2xl font-black">
              {cancelling ? "Cancel and refund the entire order?" : mode === "full" ? `Refund the entire ${formatMoney(preview.amountCents)} order?` : "Confirm item refund"}
            </h2>
            <dl className="space-y-1.5 rounded-2xl bg-cream p-4">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Order number</dt>
                <dd className="text-lg font-black">{preview.orderNumber}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Customer</dt>
                <dd className="font-semibold">{order.customerName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Original payment</dt>
                <dd className="text-right font-semibold">
                  {formatMoney(preview.originalTotalCents)} · {preview.payment.method}
                </dd>
              </div>
              {preview.alreadyRefundedCents > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Already refunded</dt>
                  <dd>-{formatMoney(preview.alreadyRefundedCents)}</dd>
                </div>
              )}
              {preview.items.map((i, idx) => (
                <div key={idx} className="flex justify-between gap-2 text-sm">
                  <dt>
                    {i.productName} × {i.quantity} {i.unitLabel}
                  </dt>
                  <dd>{formatMoney(i.amountCents)} incl. tax</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-line pt-2 text-xl font-black text-accent-500">
                <dt>Refund amount</dt>
                <dd>{formatMoney(preview.amountCents)}</dd>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <dt className="text-muted">Remaining on order after refund</dt>
                <dd>{formatMoney(preview.remainingAfterCents)}</dd>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <dt className="text-muted">Reason</dt>
                <dd>{[reasonCategory, reason].filter(Boolean).join(" — ")}</dd>
              </div>
            </dl>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-accent-500/40 p-3">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-accent-500" />
              <span className="font-semibold">
                I confirm refunding <strong>{formatMoney(preview.amountCents)}</strong> to {preview.payment.method} for order <strong>{preview.orderNumber}</strong>.
                {cancelling && " The order will be cancelled."}
              </span>
            </label>
            {error && (
              <p role="alert" className="font-semibold text-accent-500">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => dialog.current?.close()} disabled={busy}>
                Go back
              </button>
              <button type="button" className="btn bg-accent-500 text-white hover:bg-[#a50d26]" onClick={submit} disabled={!confirmed || busy}>
                {busy ? "Processing refund…" : `Refund ${formatMoney(preview.amountCents)}`}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
