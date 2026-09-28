import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth-helpers";
import { clientIp, handle, parseBody } from "@/lib/http";
import { cartItemsSchema } from "@/lib/pricing";
import { startCheckout } from "@/lib/orders/service";

const schema = z.object({
  items: cartItemsSchema,
  checkoutKey: z.string().uuid(),
  confirmed: z.literal(true), // the customer ticked "I confirm this order" on the review screen
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const { items, checkoutKey } = await parseBody(req, schema);
  const result = await startCheckout(user, items, checkoutKey, clientIp(req));
  return NextResponse.json({
    ...result,
    publishableKey: result.kind === "payment" && result.provider === "stripe" ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined,
  });
});
