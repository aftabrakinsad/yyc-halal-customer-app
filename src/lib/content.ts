import "server-only";
import { db } from "./db";
import { toProductDTO } from "./catalog";

/** Flyers/promotions the store currently has switched on (managed from the Store app). */
export async function activeFlyers() {
  const now = new Date();
  return db.flyer.findMany({
    where: {
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function catalog() {
  const [categories, products] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.product.findMany({
      where: { active: true },
      include: { unit: true, inventory: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    products: products.map(toProductDTO),
  };
}
