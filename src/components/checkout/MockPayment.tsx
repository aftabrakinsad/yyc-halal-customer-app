"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { postJson } from "../cart/useQuote";
import { LockIcon } from "../icons";

/** Development-only stand-in for Stripe (PAYMENT_PROVIDER=mock). No real card is involved. */
export function MockPayment({
  orderId,
  totalCents,
  onPaid,
  onStale,
}: {
  orderId: string;
  totalCents: number;
  onPaid: () => void;
  onStale: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async (outcome: "succeed" | "fail") => {
    setBusy(true);
    setError(null);
    try {
      const check = await postJson<{ ok: boolean }>("/api/checkout/verify", { orderId });
      if (!check.ok || !check.data.ok) return onStale("An item in your order changed. Please review your order again.");
      const res = await postJson("/api/dev/mock-payment", { orderId, outcome });
      if (!res.ok) return setError(res.data.error ?? "Payment failed.");
      if (outcome === "fail") setError("Your card was declined. Please try again or use another card.");
      else onPaid();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-dashed border-gold-400 bg-gold-400/10 p-4">
        <p className="font-bold">Test payment mode</p>
        <p className="text-sm text-muted">
          Stripe isn&apos;t configured, so payments are simulated. No card is charged. Set <code>PAYMENT_PROVIDER=stripe</code> for real
          card and Apple Pay payments.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
          {error}
        </p>
      )}
      <button type="button" onClick={() => pay("succeed")} disabled={busy} className="btn-primary btn-lg w-full">
        <LockIcon /> {busy ? "Processing…" : `Pay ${formatMoney(totalCents)} (test card)`}
      </button>
      <button type="button" onClick={() => pay("fail")} disabled={busy} className="btn-secondary w-full">
        Simulate a declined card
      </button>
    </div>
  );
}
