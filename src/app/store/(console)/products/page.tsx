import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/money";
import { stockState } from "@/lib/catalog";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { ProductImage } from "@/components/ProductImage";

export const metadata: Metadata = { title: "Products" };

const STOCK = { IN_STOCK: ["In Stock", "bg-brand-50 text-brand-700"], LOW_STOCK: ["Low Stock", "bg-gold-400/30"], OUT_OF_STOCK: ["Out of Stock", "bg-accent-50 text-accent-500"] } as const;

export default async function ProductsPage({ searchParams }: PageProps<"/store/products">) {
  await requireStaff("manageProducts");
  const { q } = await searchParams;
  const text = typeof q === "string" ? q.trim() : "";
  const products = await db.product.findMany({
    where: text ? { OR: [{ name: { contains: text, mode: "insensitive" } }, { id: text }] } : {},
    include: { unit: true, inventory: true, category: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">Products</h1>
        <Link href="/store/products/new" className="btn-primary">
          <PlusIcon /> Add product
        </Link>
      </div>
      <form className="relative max-w-lg" role="search">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={text} placeholder="Search by name or product ID" className="input pl-12" />
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-cream text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 text-right font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created / modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const [label, cls] = STOCK[stockState(p.inventory, p.unit)];
              return (
                <tr key={p.id} className={p.active ? "" : "bg-cream/60 text-muted"}>
                  <td className="px-4 py-3">
                    <Link href={`/store/products/${p.id}`} className="flex items-center gap-3">
                      <ProductImage src={p.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg" />
                      <span>
                        <span className="block font-bold text-brand-700 underline">{p.name}</span>
                        <span className="block text-xs text-muted">ID {p.id}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                    {formatMoney(p.priceCents)} / {p.unit.label}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${cls}`}>{label}</span>
                    {p.inventory?.trackQuantity && (
                      <span className="block pt-1 text-sm text-muted">
                        {Number(p.inventory.quantityOnHand)} {p.unit.label} available
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.active ? <span className="font-semibold text-brand-700">Active</span> : "Disabled"}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDate(p.createdAt)}
                    <span className="block text-muted">{formatDate(p.updatedAt)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
