import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser } from "@/lib/auth-helpers";
import { handle, parseBody } from "@/lib/http";
import { verifyOrderStock } from "@/lib/orders/service";

// Called immediately before the card is charged: re-checks stock and prices one last time.
export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const { orderId } = await parseBody(req, z.object({ orderId: z.string().min(1) }));
  return NextResponse.json(await verifyOrderStock(orderId, user.id));
});
