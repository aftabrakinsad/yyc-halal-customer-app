import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth-helpers";
import { handle, parseBody } from "@/lib/http";
import { cartItemsSchema, quoteCart } from "@/lib/pricing";

// Server-side prices, tax and totals for the cart. The browser's numbers are display-only.
export const POST = handle(async (req: Request) => {
  await apiUser();
  const { items } = await parseBody(req, z.object({ items: cartItemsSchema }));
  return NextResponse.json(await quoteCart(items));
});
