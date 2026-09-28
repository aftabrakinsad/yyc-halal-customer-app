"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductDTO } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { useCart } from "../cart/CartProvider";
import { ProductCard } from "./ProductCard";
import { CartIcon, SearchIcon } from "../icons";

export function Catalog({ categories, products }: { categories: { id: string; name: string }[]; products: ProductDTO[] }) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const cart = useCart();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === "all" || p.categoryId === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
  }, [products, category, query]);

  const chip = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setCategory(id)}
      aria-pressed={category === id}
      className={`min-h-11 shrink-0 rounded-full border-2 px-4 font-semibold whitespace-nowrap ${
        category === id ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink hover:border-brand-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Search products</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chicken, beef, lamb…"
          className="input pl-12"
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="toolbar" aria-label="Categories">
        {chip("all", "All")}
        {categories.map((c) => chip(c.id, c.name))}
      </div>

      {visible.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-8 text-center text-muted">No products match your search.</p>
      )}

      {cart.count > 0 && (
        <div className="no-print sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 md:bottom-4">
          <Link href="/cart" className="btn-primary btn-lg w-full shadow-lg">
            <CartIcon /> View cart ({cart.count}) · about {formatMoney(cart.estimatedSubtotalCents)}
          </Link>
        </div>
      )}
    </div>
  );
}
