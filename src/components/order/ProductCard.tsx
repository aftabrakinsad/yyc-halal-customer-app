"use client";

import { useState } from "react";
import type { ProductDTO } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useCart } from "../cart/CartProvider";
import { useToast } from "../shell/Toaster";
import { ProductImage } from "../ProductImage";
import { QuantityStepper } from "../QuantityStepper";
import { CartIcon, CheckIcon } from "../icons";

const STOCK = {
  IN_STOCK: { label: "In Stock", cls: "bg-brand-100 text-brand-800" },
  LOW_STOCK: { label: "Low Stock", cls: "bg-gold-400/30 text-ink" },
  OUT_OF_STOCK: { label: "Out of Stock", cls: "bg-accent-50 text-accent-500" },
} as const;

export function ProductCard({ product }: { product: ProductDTO }) {
  const cart = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(product.unit.allowsDecimal ? Math.max(product.unit.min, 1) : product.unit.min);
  const outOfStock = product.stock === "OUT_OF_STOCK";
  const inCart = cart.lines.find((l) => l.productId === product.id);
  const stock = STOCK[product.stock];

  const add = () => {
    cart.add({
      productId: product.id,
      quantity,
      name: product.name,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      unit: product.unit,
    });
    toast({ title: `Added ${quantity} ${product.unit.label} of ${product.name}` });
  };

  return (
    <article className={`card flex h-full flex-col overflow-hidden ${outOfStock ? "opacity-75" : ""}`}>
      <div className="relative">
        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[2/1] w-full sm:aspect-[4/3]" />
        <span className={`absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-bold ${stock.cls}`}>{stock.label}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <h3 className="text-lg leading-snug font-bold">{product.name}</h3>
          {product.description && <p className="mt-1 text-[15px] text-muted">{product.description}</p>}
        </div>
        <p className="text-2xl font-extrabold text-brand-700">
          {formatMoney(product.priceCents)}
          <span className="text-base font-semibold text-muted"> / {product.unit.label}</span>
        </p>
        {outOfStock ? (
          <button type="button" disabled className="btn w-full bg-line text-muted">
            Out of Stock
          </button>
        ) : (
          <>
            <QuantityStepper value={quantity} unit={product.unit} onChange={setQuantity} label={`Quantity of ${product.name}`} />
            <button type="button" onClick={add} className="btn-primary w-full">
              <CartIcon /> Add to Cart
            </button>
            {inCart && (
              <p className="flex items-center gap-1 text-sm font-semibold text-brand-700" aria-live="polite">
                <CheckIcon width={16} height={16} /> {inCart.quantity} {product.unit.label} in your cart
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
