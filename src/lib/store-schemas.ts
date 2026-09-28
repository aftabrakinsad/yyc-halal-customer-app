import { z } from "zod";
import { FlyerKind } from "@/generated/prisma/enums";

// Request bodies accepted by the Store app APIs.

export const flyerSchema = z.object({
  kind: z.enum(FlyerKind).default("FLYER"),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).nullish(),
  body: z.string().max(1000).nullish(),
  imageUrl: z.string().url().max(1000).nullish(),
  linkUrl: z.string().max(1000).nullish(),
  active: z.boolean().default(true),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  sortOrder: z.number().int().default(0),
});

export const productSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(120),
  description: z.string().max(500).default(""),
  imageUrl: z.string().max(1000).nullish(),
  priceCents: z.number().int().min(0),
  unitCode: z.string().min(1),
  categoryId: z.string().nullish(),
  taxable: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const inventorySchema = z
  .object({
    quantityOnHand: z.number().min(0),
    trackQuantity: z.boolean(),
    markedOutOfStock: z.boolean(),
  })
  .partial();
