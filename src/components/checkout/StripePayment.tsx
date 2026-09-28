"use client";

import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, ExpressCheckoutElement, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { formatMoney } from "@/lib/money";
import { postJson } from "../cart/useQuote";
import { LockIcon } from "../icons";

type Props = {
  orderId: string;
  clientSecret: string;
  publishableKey: string;
  totalCents: number;
  onPaid: () => void;
  onStale: (message: string) => void;
};

// Card details are entered into Stripe's secure fields and go straight to Stripe (PCI-compliant).
// They never touch YYC Halal's servers or database.
export function StripePayment({ publishableKey, clientSecret, ...rest }: Props) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: { colorPrimary: "#0b6b3a", borderRadius: "12px", fontSizeBase: "17px", spacingUnit: "5px" },
        },
      }}
    >
      <StripeForm clientSecret={clientSecret} {...rest} />
    </Elements>
  );
}

function StripeForm({ orderId, clientSecret, totalCents, onPaid, onStale }: Omit<Props, "publishableKey">) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Last stock/price check, immediately before charging. */
  const verify = async () => {
    const { ok, data } = await postJson<{ ok: boolean; priceChanged?: boolean }>("/api/checkout/verify", { orderId });
    if (!ok || !data.ok) {
      onStale(
        data.priceChanged
          ? "A price changed since you reviewed your order. Please review it again."
          : "An item in your order just went out of stock. Please review your order.",
      );
      return false;
    }
    return true;
  };

  const confirm = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await verify())) return;
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: `${window.location.origin}/checkout/complete?order=${orderId}` },
        redirect: "if_required",
      });
      if (error) setError(error.message ?? "Your payment didn't go through. Please try again or use another card.");
      else onPaid();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ExpressCheckoutElement
        options={{ buttonHeight: 55, buttonType: { applePay: "buy", googlePay: "buy" } }}
        onConfirm={async () => {
          if (!(await verify())) return;
          await confirm();
        }}
      />
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
          {error}
        </p>
      )}
      <button type="button" onClick={confirm} disabled={!stripe || busy} className="btn-primary btn-lg w-full">
        <LockIcon /> {busy ? "Processing…" : `Pay ${formatMoney(totalCents)}`}
      </button>
    </div>
  );
}
