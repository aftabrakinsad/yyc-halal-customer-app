import type { Metadata } from "next";
import { catalog } from "@/lib/content";
import { Catalog } from "@/components/order/Catalog";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage() {
  const { categories, products } = await catalog();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Order</h1>
        <p className="text-muted">Choose your items and quantities, then add them to your cart.</p>
      </div>
      <Catalog categories={categories} products={products} />
    </div>
  );
}
