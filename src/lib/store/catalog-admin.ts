import "server-only";
import { db } from "../db";

export async function productFormData() {
  const [units, categories] = await Promise.all([
    db.unit.findMany({ orderBy: { code: "desc" } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    units: units.map((u) => ({ code: u.code, label: u.label, description: u.description })),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
  };
}
