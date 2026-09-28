import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { productFormData } from "@/lib/store/catalog-admin";
import { ProductForm } from "@/components/store/ProductForm";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const user = await requireStaff("manageProducts");
  const { units, categories } = await productFormData();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Add product</h1>
      <ProductForm
        units={units}
        categories={categories}
        canEditInventory={can(user.role, "manageInventory")}
        initial={{
          name: "",
          slug: "",
          description: "",
          imageUrl: null,
          priceCents: 0,
          unitCode: units.find((u) => u.code === "LB")?.code ?? units[0]?.code ?? "ITEM",
          categoryId: categories[0]?.id ?? null,
          taxable: true,
          active: true,
          inventory: { quantityOnHand: 0, trackQuantity: true, markedOutOfStock: false },
        }}
      />
    </div>
  );
}
