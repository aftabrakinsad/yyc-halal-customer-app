// Sample catalog for development / first run. Safe to re-run (upserts).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  await db.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, addressLine: "Calgary, Alberta", phone: "(403) 555-0123", email: "orders@yychalal.ca" },
  });

  const units = [
    { code: "LB", label: "lb", description: "per pound", allowsDecimal: true, step: 0.5, minQuantity: 0.5, maxQuantity: 50 },
    { code: "ITEM", label: "item", description: "per item", allowsDecimal: false, step: 1, minQuantity: 1, maxQuantity: 50 },
    { code: "KG", label: "kg", description: "per kilogram", allowsDecimal: true, step: 0.25, minQuantity: 0.25, maxQuantity: 25 },
  ];
  for (const u of units) await db.unit.upsert({ where: { code: u.code }, update: u, create: u });

  const categories = [
    { slug: "chicken", name: "Chicken", sortOrder: 1 },
    { slug: "beef", name: "Beef", sortOrder: 2 },
    { slug: "lamb-goat", name: "Lamb & Goat", sortOrder: 3 },
    { slug: "ground-prepared", name: "Ground & Prepared", sortOrder: 4 },
    { slug: "grocery", name: "Grocery", sortOrder: 5 },
  ];
  const cat: Record<string, string> = {};
  for (const c of categories) cat[c.slug] = (await db.category.upsert({ where: { slug: c.slug }, update: c, create: c })).id;

  const products = [
    ["chicken-breast", "Chicken Breast", "Boneless, skinless, hand-trimmed.", 799, "LB", "chicken", 80],
    ["whole-chicken", "Whole Chicken", "Fresh whole chicken, about 3–4 lb.", 1599, "ITEM", "chicken", 25],
    ["chicken-thighs", "Chicken Thighs", "Bone-in, skin-on thighs.", 549, "LB", "chicken", 60],
    ["chicken-wings", "Chicken Wings", "Split wings, great for the grill.", 649, "LB", "chicken", 0],
    ["beef-stew", "Beef Stew Cubes", "Tender chuck, cut for curries and stews.", 1099, "LB", "beef", 40],
    ["ribeye-steak", "Ribeye Steak", "Well-marbled AAA ribeye.", 2499, "LB", "beef", 15],
    ["lamb-chops", "Lamb Chops", "Frenched rack chops.", 1899, "LB", "lamb-goat", 20],
    ["goat-curry-cut", "Goat Curry Cut", "Bone-in goat, cut for curry.", 1299, "LB", "lamb-goat", 30],
    ["ground-beef", "Lean Ground Beef", "85% lean, ground fresh daily.", 799, "LB", "ground-prepared", 100],
    ["beef-kofta", "Beef Kofta Kebabs", "Seasoned kebabs, pack of 6.", 1299, "ITEM", "ground-prepared", 30],
    ["basmati-rice", "Basmati Rice (10 lb bag)", "Extra-long grain basmati.", 2199, "ITEM", "grocery", 20],
    ["ghee", "Pure Ghee (800 g)", "Clarified butter.", 1499, "ITEM", "grocery", 3],
  ] as const;

  for (const [slug, name, description, priceCents, unitCode, category, qty] of products) {
    const data = { name, description, priceCents, unitCode, categoryId: cat[category], taxable: true };
    const p = await db.product.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    await db.inventory.upsert({ where: { productId: p.id }, update: {}, create: { productId: p.id, quantityOnHand: qty } });
  }

  if ((await db.flyer.count()) === 0) {
    await db.flyer.createMany({
      data: [
        {
          kind: "FLYER",
          title: "Weekend BBQ Specials",
          subtitle: "Fresh cuts for the grill — this weekend only",
          body: "Chicken wings, lamb chops and kofta kebabs at special prices while supplies last.",
          linkUrl: "/order",
          sortOrder: 1,
        },
        { kind: "SALE", title: "Chicken Breast $7.99/lb", subtitle: "Save $2/lb", body: "Boneless, skinless and hand-trimmed.", linkUrl: "/order", sortOrder: 2 },
        { kind: "PROMOTION", title: "Family Pack Savings", subtitle: "Buy 10 lb ground beef, get 1 lb free", sortOrder: 3 },
        {
          kind: "ANNOUNCEMENT",
          title: "Holiday hours",
          body: "Open 9 am – 9 pm every day. Online orders are usually ready within 1 hour.",
          sortOrder: 4,
        },
      ],
    });
  }
  console.log("Seed complete.");
}

main().finally(() => db.$disconnect());
