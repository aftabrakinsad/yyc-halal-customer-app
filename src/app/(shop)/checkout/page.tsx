import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="page-title">Review your order</h1>
      <CheckoutFlow customerName={user.name} customerEmail={user.email} />
    </div>
  );
}
