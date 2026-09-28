import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="space-y-4">
      <h1 className="page-title">Your Cart</h1>
      <CartView />
    </div>
  );
}
