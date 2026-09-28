"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney, formatQuantity } from "@/lib/money";
import type { CartProblem } from "@/lib/pricing";
import { useCart } from "../cart/CartProvider";
import { postJson, useQuote } from "../cart/useQuote";
import { OrderTotals } from "../OrderTotals";
import { AlertIcon, ChevronLeftIcon } from "../icons";
import { getCheckoutKey, resetCheckoutKey } from "./checkout-key";
import { StripePayment } from "./StripePayment";
import { MockPayment } from "./MockPayment";

type PaymentSession = {
  orderId: string;
  provider: "stripe" | "mock";
  clientSecret: string | null;
  publishableKey?: string;
  totalCents: number;
};

export function CheckoutFlow({ customerName, customerEmail }: { customerName: string; customerEmail: string }) {
  const router = useRouter();
  const cart = useCart();
  const [refreshToken, setRefreshToken] = useState(0);
  const { quote, error: quoteError, loading } = useQuote(cart.lines, refreshToken);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentSession | null>(null);

  if (!cart.lines.length && !session) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-semibold">Your cart is empty.</p>
        <Link href="/order" className="btn-primary mt-4">
          Start shopping
        </Link>
      </div>
    );
  }

  const backToReview = (message: string) => {
    setSession(null);
    setConfirmed(false);
    setNotice(message);
    resetCheckoutKey();
    setRefreshToken((t) => t + 1);
  };

  const confirmOrder = async () => {
    setSubmitting(true);
    setNotice(null);
    try {
      const { ok, data } = await postJson<{
        kind: "payment" | "already_paid";
        orderId: string;
        provider: "stripe" | "mock";
        clientSecret: string | null;
        publishableKey?: string;
        quote: { totalCents: number };
        details?: { code?: string; problems?: CartProblem[] };
      }>("/api/checkout", {
        items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        checkoutKey: getCheckoutKey(),
        confirmed: true,
      });
      if (!ok) {
        const code = data.details?.code;
        if (code === "CART_CHANGED" || code === "CHECKOUT_KEY_CONFLICT") backToReview(data.error ?? "Please review your order again.");
        else setNotice(data.error ?? "Something went wrong. Please try again.");
        if (code === "CART_PROBLEMS") setRefreshToken((t) => t + 1);
        return;
      }
      if (data.kind === "already_paid") {
        router.replace(`/checkout/complete?order=${data.orderId}`);
        return;
      }
      setSession({
        orderId: data.orderId,
        provider: data.provider,
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        totalCents: data.quote.totalCents,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const onPaid = () => router.replace(`/checkout/complete?order=${session!.orderId}`);

  if (session) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <button type="button" onClick={() => setSession(null)} className="btn-ghost -ml-3">
          <ChevronLeftIcon /> Back to order review
        </button>
        <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="pay-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="pay-heading" className="text-xl font-bold">
              Payment
            </h2>
            <p className="text-2xl font-extrabold">{formatMoney(session.totalCents)}</p>
          </div>
          {session.provider === "stripe" && session.clientSecret && session.publishableKey ? (
            <StripePayment
              orderId={session.orderId}
              clientSecret={session.clientSecret}
              publishableKey={session.publishableKey}
              totalCents={session.totalCents}
              onPaid={onPaid}
              onStale={backToReview}
            />
          ) : session.provider === "mock" ? (
            <MockPayment orderId={session.orderId} totalCents={session.totalCents} onPaid={onPaid} onStale={backToReview} />
          ) : (
            <p role="alert" className="font-semibold text-accent-500">
              Online payment isn&apos;t available right now. Please contact the store.
            </p>
          )}
        </section>
        <p className="text-center text-sm text-muted">Payments are processed securely. YYC Halal never stores your card number or CVV.</p>
      </div>
    );
  }

  const canConfirm = !!quote && !loading && !quoteError && quote.problems.length === 0 && quote.acceptingOrders && confirmed;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="space-y-4">
        {notice && (
          <p role="alert" className="flex items-center gap-2 rounded-xl bg-gold-400/25 p-4 font-semibold">
            <AlertIcon className="shrink-0" /> {notice}
          </p>
        )}
        <section className="card p-5" aria-labelledby="customer-heading">
          <h2 id="customer-heading" className="text-lg font-bold">
            Customer
          </h2>
          <p className="mt-1 text-lg">{customerName}</p>
          <p className="text-muted">{customerEmail}</p>
          <p className="mt-2 text-sm text-muted">Your receipt will be emailed to this address.</p>
        </section>

        <section className="card p-5" aria-labelledby="items-heading">
          <div className="flex items-center justify-between">
            <h2 id="items-heading" className="text-lg font-bold">
              Items
            </h2>
            <Link href="/cart" className="font-semibold text-brand-700 underline">
              Edit cart
            </Link>
          </div>
          {quote ? (
            <table className={`mt-3 w-full text-left ${loading ? "opacity-60" : ""}`}>
              <thead className="sr-only">
                <tr>
                  <th>Product</th>
                  <th>Quantity and price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quote.lines.map((l) => (
                  <tr key={l.productId}>
                    <td className="py-3 pr-2 align-top font-semibold">{l.name}</td>
                    <td className="py-3 pr-2 align-top text-muted">
                      {formatQuantity(l.quantity, l.unit.label)} × {formatMoney(l.unitPriceCents)}/{l.unit.label}
                    </td>
                    <td className="py-3 text-right align-top font-bold">{formatMoney(l.lineSubtotalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-muted">Loading your order…</p>
          )}
          {quote?.problems.map((p) => (
            <p key={p.productId} role="alert" className="mt-3 rounded-lg bg-accent-50 p-3 font-semibold text-accent-500">
              {p.name ?? "An item"}: {p.message}{" "}
              <Link href="/cart" className="underline">
                Fix in cart
              </Link>
            </p>
          ))}
        </section>
      </div>

      <aside className="card space-y-4 p-5 lg:sticky lg:top-24" aria-label="Order total">
        {quote && (
          <OrderTotals
            subtotalCents={quote.subtotalCents}
            taxCents={quote.taxCents}
            taxLabel={quote.taxLabel}
            taxRateBps={quote.taxRateBps}
            totalCents={quote.totalCents}
            totalLabel="Final Total"
          />
        )}
        {quoteError && <p className="font-semibold text-accent-500">{quoteError}</p>}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-cream p-3">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-6 w-6 shrink-0 accent-brand-600"
          />
          <span className="font-semibold">I&apos;ve checked my order and it&apos;s correct.</span>
        </label>
        <button type="button" onClick={confirmOrder} disabled={!canConfirm || submitting} className="btn-primary btn-lg w-full">
          {submitting ? "Please wait…" : "Confirm order & pay"}
        </button>
        <p className="text-center text-sm text-muted">Pay by credit card, debit card or Apple Pay. Pickup in store.</p>
      </aside>
    </div>
  );
}
