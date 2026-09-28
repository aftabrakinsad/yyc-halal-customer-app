"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "../shell/Toaster";
import { ImageUpload } from "./ImageUpload";
import { storePost } from "./api";

export type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  priceCents: number;
  unitCode: string;
  categoryId: string | null;
  taxable: boolean;
  active: boolean;
  inventory: { quantityOnHand: number; trackQuantity: boolean; markedOutOfStock: boolean };
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ProductForm({
  initial,
  units,
  categories: initialCategories,
  canEditInventory,
}: {
  initial: ProductFormValue;
  units: { code: string; label: string; description: string }[];
  categories: { id: string; name: string }[];
  canEditInventory: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [price, setPrice] = useState(initial.id ? (initial.priceCents / 100).toFixed(2) : "");
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ProductFormValue>(k: K, val: ProductFormValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const setInv = <K extends keyof ProductFormValue["inventory"]>(k: K, val: ProductFormValue["inventory"][K]) =>
    setV((x) => ({ ...x, inventory: { ...x.inventory, [k]: val } }));

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const { category } = await storePost<{ category: { id: string; name: string } }>("/api/store/categories", { name: newCategory });
      setCategories((c) => (c.some((x) => x.id === category.id) ? c : [...c, category]));
      set("categoryId", category.id);
      setNewCategory("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const priceCents = Math.round(Number(price) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0 || price.trim() === "") return setError("Enter a valid price.");
    setBusy(true);
    try {
      const body = {
        name: v.name.trim(),
        slug: v.slug || slugify(v.name),
        description: v.description,
        imageUrl: v.imageUrl,
        priceCents,
        unitCode: v.unitCode,
        categoryId: v.categoryId,
        taxable: v.taxable,
        active: v.active,
        ...(canEditInventory ? { inventory: v.inventory } : {}),
      };
      if (v.id) await storePost(`/api/store/products/${v.id}`, body, "PATCH");
      else await storePost("/api/store/products", body);
      toast({ title: v.id ? "Product saved" : "Product added" });
      router.push("/store/products");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card space-y-4 p-5">
        <label className="block font-semibold">
          Product name
          <input
            required
            value={v.name}
            onChange={(e) => setV((x) => ({ ...x, name: e.target.value, slug: x.id ? x.slug : slugify(e.target.value) }))}
            className="input mt-1"
            maxLength={120}
          />
        </label>
        <label className="block font-semibold">
          Short description
          <textarea value={v.description} onChange={(e) => set("description", e.target.value)} className="input mt-1 min-h-24 py-3" maxLength={500} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block font-semibold">
            Price ($)
            <input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="input mt-1" placeholder="7.99" />
          </label>
          <label className="block font-semibold">
            Unit of measurement
            <select value={v.unitCode} onChange={(e) => set("unitCode", e.target.value)} className="input mt-1">
              {units.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label} ({u.description})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block font-semibold">
            Category
            <select value={v.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)} className="input mt-1">
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="font-semibold">
            <label htmlFor="new-cat">New category</label>
            <div className="mt-1 flex gap-2">
              <input id="new-cat" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input" placeholder="e.g. Seafood" />
              <button type="button" className="btn-secondary" onClick={addCategory}>
                Add
              </button>
            </div>
          </div>
        </div>
        <label className="block font-semibold">
          URL name
          <input value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} className="input mt-1 text-muted" />
        </label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="h-6 w-6 accent-brand-600" />
            Active (shown to customers)
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={v.taxable} onChange={(e) => set("taxable", e.target.checked)} className="h-6 w-6 accent-brand-600" />
            Charge tax
          </label>
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-5">
          <ImageUpload label="Product image" value={v.imageUrl} onChange={(url) => set("imageUrl", url)} />
        </div>
        {canEditInventory && (
          <fieldset className="card space-y-3 p-5">
            <legend className="sr-only">Stock</legend>
            <p className="font-bold">Stock</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Stock status">
              {[
                [false, "In Stock"],
                [true, "Out of Stock"],
              ].map(([out, label]) => (
                <button
                  key={String(out)}
                  type="button"
                  role="radio"
                  aria-checked={v.inventory.markedOutOfStock === out}
                  onClick={() => setInv("markedOutOfStock", out as boolean)}
                  className={`btn border-2 ${v.inventory.markedOutOfStock === out ? (out ? "border-accent-500 bg-accent-50 text-accent-500" : "border-brand-600 bg-brand-50 text-brand-700") : "border-line bg-white"}`}
                >
                  {label as string}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={v.inventory.trackQuantity} onChange={(e) => setInv("trackQuantity", e.target.checked)} className="h-6 w-6 accent-brand-600" />
              Track available quantity
            </label>
            {v.inventory.trackQuantity && (
              <label className="block font-semibold">
                Available ({units.find((u) => u.code === v.unitCode)?.label})
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={v.inventory.quantityOnHand}
                  onChange={(e) => setInv("quantityOnHand", Math.max(0, Number(e.target.value)))}
                  className="input mt-1"
                />
              </label>
            )}
          </fieldset>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
            {error}
          </p>
        )}
        <button className="btn-primary btn-lg w-full" disabled={busy}>
          {busy ? "Saving…" : v.id ? "Save changes" : "Add product"}
        </button>
      </div>
    </form>
  );
}
