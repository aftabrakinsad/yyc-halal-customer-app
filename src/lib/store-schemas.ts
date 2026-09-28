import { z } from "zod";
import { FlyerKind } from "@/generated/prisma/enums";
import { REFUND_REASONS } from "./permissions";

// Request bodies accepted by the Store app APIs.

/** Site-relative paths or http(s) URLs only — never javascript:/data: links. */
const safeUrl = z
  .string()
  .max(1000)
  .refine((u) => /^\/(?!\/)/.test(u) || /^https?:\/\//i.test(u), "Use a link starting with / or https://");

// Fields without defaults: `.partial()` of a schema with `.default()`s would fill those defaults in
// on every PATCH and silently overwrite stored values, so updates use the default-free shapes.
const flyerFields = z.object({
  kind: z.enum(FlyerKind),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).nullish(),
  body: z.string().max(1000).nullish(),
  imageUrl: safeUrl.nullish(),
  linkUrl: safeUrl.nullish(),
  active: z.boolean(),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  sortOrder: z.number().int(),
});

export const flyerSchema = flyerFields.extend({
  kind: flyerFields.shape.kind.default("FLYER"),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export const flyerUpdateSchema = flyerFields.partial();

const productFields = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(120),
  description: z.string().max(500),
  imageUrl: safeUrl.nullish(),
  priceCents: z.number().int().min(0),
  unitCode: z.string().min(1),
  categoryId: z.string().nullish(),
  taxable: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});

export const productSchema = productFields.extend({
  description: z.string().max(500).default(""),
  taxable: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export const productUpdateSchema = productFields.partial();

export const inventorySchema = z
  .object({
    quantityOnHand: z.number().min(0),
    trackQuantity: z.boolean(),
    markedOutOfStock: z.boolean(),
  })
  .partial();

const reasonFields = {
  reasonCategory: z.enum(REFUND_REASONS),
  reason: z.string().max(300).optional(),
};

/** Every money-moving request must echo back what the employee confirmed on screen. */
const confirmation = {
  confirmOrderNumber: z.string().min(1).max(40),
  expectedAmountCents: z.number().int().positive(),
};

export const refundItemsSchema = z.array(z.object({ orderItemId: z.string(), quantity: z.number().min(0) })).min(1);

export const refundPreviewSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("FULL") }),
  z.object({ type: z.literal("CANCELLATION") }),
  z.object({ type: z.literal("PARTIAL"), amountCents: z.number().int().positive() }),
  z.object({ type: z.literal("ITEM"), items: refundItemsSchema }),
]);

export const refundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("FULL"), ...reasonFields, ...confirmation }),
  z.object({ type: z.literal("PARTIAL"), amountCents: z.number().int().positive(), ...reasonFields, ...confirmation }),
  z.object({ type: z.literal("ITEM"), items: refundItemsSchema, ...reasonFields, ...confirmation }),
]);

export const cancelSchema = z.object({ ...reasonFields, ...confirmation });

export const employeeSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(100),
  role: z.enum(["STORE_EMPLOYEE", "STORE_MANAGER", "ADMIN"]),
});
