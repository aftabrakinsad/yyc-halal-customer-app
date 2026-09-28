"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../cart/CartProvider";
import { resetCheckoutKey } from "./checkout-key";
import { AlertIcon, CheckIcon, ReceiptIcon } from "../icons";

type Status = {
  status: string;
  paymentStatus: string;
  orderNumber: string | null;
  failureMessage: string | null;
};

/** Waits for the payment to be verified server-side (webhook or direct check), then shows the order number. */
export function CheckoutComplete({ orderId }: { orderId: string }) {
  const cart = useCart();
  const [state, setState] = useState<Status | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let stop = false;
    const started = Date.now();
    const poll = async () => {
      if (stop) return;
      const res = await fetch(`/api/orders/${orderId}/payment-status`, { cache: "no-store" }).catch(() => null);
      const data: Status | null = res?.ok ? await res.json() : null;
      if (stop) return;
      if (data) setState(data);
      const settled = data && (data.orderNumber || data.paymentStatus === "FAILED" || data.status === "CANCELLED");
      if (!settled) {
        if (Date.now() - started > 90_000) setTimedOut(true);
        else setTimeout(poll, 1500);
      }
    };
    poll();
    return () => {
      stop = true;
    };
  }, [orderId]);

  const paid = !!state?.orderNumber && state.status !== "CANCELLED";
  const { clear } = cart;
  useEffect(() => {
    if (paid) {
      clear();
      resetCheckoutKey();
    }
  }, [paid, clear]);

  if (paid) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white">
          <CheckIcon width={44} height={44} />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold">Thank you!</h1>
        <p className="mt-2 text-lg text-muted">Your payment was successful and your order is in progress.</p>
        <div className="mt-6 rounded-2xl bg-brand-50 p-5">
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Order number</p>
          <p className="mt-1 text-3xl font-extrabold tracking-wide text-brand-800">{state!.orderNumber}</p>
        </div>
        <p className="mt-4 text-muted">A receipt has been emailed to you. We&apos;ll notify you when your order is ready for pickup.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={`/orders/${orderId}`} className="btn-primary btn-lg">
            Track my order
          </Link>
          <Link href={`/orders/${orderId}/receipt`} className="btn-secondary btn-lg">
            <ReceiptIcon /> View receipt
          </Link>
        </div>
      </div>
    );
  }

  if (state?.status === "CANCELLED" || state?.paymentStatus === "FAILED") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-50 text-accent-500">
          <AlertIcon width={40} height={40} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Payment didn&apos;t go through</h1>
        <p className="mt-2 text-lg text-muted">{state.failureMessage ?? "Your card was not charged. Please try again or use another card."}</p>
        <Link href="/checkout" className="btn-primary btn-lg mt-6 w-full">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-xl p-8 text-center" aria-live="polite">
      <span className="mx-auto block h-14 w-14 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" aria-hidden />
      <h1 className="mt-5 text-2xl font-extrabold">Confirming your payment…</h1>
      <p className="mt-2 text-muted">
        {timedOut
          ? "This is taking longer than usual. Your order will appear in My Orders once the payment is confirmed."
          : "Please don't close this page."}
      </p>
      {timedOut && (
        <Link href="/orders" className="btn-secondary mt-6">
          Go to My Orders
        </Link>
      )}
    </div>
  );
}
