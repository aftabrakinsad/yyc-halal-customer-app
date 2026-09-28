"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { useCart } from "./CartProvider";
import { useQuote } from "./useQuote";
import { ProductImage } from "../ProductImage";
import { QuantityStepper } from "../QuantityStepper";
import { OrderTotals } from "../OrderTotals";
import { AlertIcon, CartIcon, TrashIcon } from "../icons";

export function CartView() {
  const cart = useCart();
  const { quote, error, loading } = useQuote(cart.lines);

  if (!cart.lines.length) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <span className="rounded-full bg-brand-50 p-5 text-brand-600">
          <CartIcon width={40} height={40} />
        </span>
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="text-muted">Browse our fresh halal meat and add what you need.</p>
        <Link href="/order" className="btn-primary btn-lg">
          Start shopping
        </Link>
      </div>
    );
  }

  const problems = new Map(quote?.problems.map((p) => [p.productId, p]) ?? []);
  const quoted = new Map(quote?.lines.map((l) => [l.productId, l]) ?? []);
  const blocked = loading || !!error || !quote || quote.problems.length > 0 || !quote.acceptingOrders;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <section aria-label="Items in your cart" className="space-y-3">
        <ul className="space-y-3">
          {cart.lines.map((line) => {
            const q = quoted.get(line.productId);
            const problem = problems.get(line.productId);
            const unitPrice = q?.unitPriceCents ?? line.priceCents;
            return (
              <li key={line.productId} className={`card p-4 ${problem ? "border-2 border-accent-500" : ""}`}>
                <div className="flex gap-4">
                  <ProductImage src={line.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-24" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg leading-snug font-bold">{line.name}</h3>
                      <button
                        type="button"
                        onClick={() => cart.remove(line.productId)}
                        className="-mt-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-accent-50 hover:text-accent-500"
                        aria-label={`Remove ${line.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    <p className="text-muted">
                      {formatMoney(unitPrice)} / {line.unit.label}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="w-full sm:w-56">
                    <QuantityStepper
                      value={line.quantity}
                      unit={line.unit}
                      onChange={(n) => cart.setQuantity(line.productId, n)}
                      label={`Quantity of ${line.name}`}
                    />
                  </div>
                  <p className="ml-auto text-lg font-extrabold">
                    <span className="sr-only">Item subtotal: </span>
                    {q ? formatMoney(q.lineSubtotalCents) : "…"}
                  </p>
                </div>
                {problem && (
                  <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-accent-50 p-3 font-semibold text-accent-500">
                    <AlertIcon className="shrink-0" /> {problem.message}
                    {problem.availableQuantity ? (
                      <button
                        type="button"
                        className="ml-auto underline"
                        onClick={() => cart.setQuantity(line.productId, problem.availableQuantity!)}
                      >
                        Use {problem.availableQuantity}
                      </button>
                    ) : null}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn-ghost text-accent-500"
          onClick={() => {
            if (confirm("Remove everything from your cart?")) cart.clear();
          }}
        >
          <TrashIcon /> Clear cart
        </button>
      </section>

      <aside className="card space-y-4 p-5 lg:sticky lg:top-24" aria-label="Order summary" aria-busy={loading}>
        <h2 className="text-xl font-bold">Order summary</h2>
        {quote ? (
          <div className={loading ? "opacity-60" : ""}>
            <OrderTotals
              subtotalCents={quote.subtotalCents}
              taxCents={quote.taxCents}
              taxLabel={quote.taxLabel}
              taxRateBps={quote.taxRateBps}
              totalCents={quote.totalCents}
            />
          </div>
        ) : (
          <p className="text-muted">{error ? "" : "Calculating…"}</p>
        )}
        {error && (
          <p role="alert" className="font-semibold text-accent-500">
            {error}
          </p>
        )}
        {quote && !quote.acceptingOrders && (
          <p role="alert" className="rounded-lg bg-accent-50 p-3 font-semibold text-accent-500">
            The store isn&apos;t accepting online orders right now. Please try again later.
          </p>
        )}
        {blocked ? (
          <button type="button" disabled className="btn-primary btn-lg w-full">
            Proceed to Checkout
          </button>
        ) : (
          <Link href="/checkout" className="btn-primary btn-lg w-full">
            Proceed to Checkout
          </Link>
        )}
        <p className="text-center text-sm text-muted">Prices and tax are confirmed by the store at checkout.</p>
      </aside>
    </div>
  );
}
