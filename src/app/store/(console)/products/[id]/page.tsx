import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/money";
import { productFormData } from "@/lib/store/catalog-admin";
import { ProductForm } from "@/components/store/ProductForm";
import { ChevronLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/store/products/[id]">) {
  const user = await requireStaff("manageProducts");
  const { id } = await params;
  const [p, { units, categories }] = await Promise.all([db.product.findUnique({ where: { id }, include: { inventory: true } }), productFormData()]);
  if (!p) notFound();
  return (
    <div className="space-y-4">
      <Link href="/store/products" className="btn-ghost -ml-3">
        <ChevronLeftIcon /> Products
      </Link>
      <div>
        <h1 className="text-2xl font-black">{p.name}</h1>
        <p className="text-sm text-muted">
          Product ID {p.id} · created {formatDateTime(p.createdAt)} · modified {formatDateTime(p.updatedAt)}
        </p>
      </div>
      <ProductForm
        units={units}
        categories={categories}
        canEditInventory={can(user.role, "manageInventory")}
        initial={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          imageUrl: p.imageUrl,
          priceCents: p.priceCents,
          unitCode: p.unitCode,
          categoryId: p.categoryId,
          taxable: p.taxable,
          active: p.active,
          inventory: {
            quantityOnHand: Number(p.inventory?.quantityOnHand ?? 0),
            trackQuantity: p.inventory?.trackQuantity ?? true,
            markedOutOfStock: p.inventory?.markedOutOfStock ?? false,
          },
        }}
      />
    </div>
  );
}
