import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth-helpers";
import { handle, HttpError } from "@/lib/http";
import { findAccessibleOrderId } from "@/lib/orders/access";
import { loadReceipt } from "@/lib/receipt";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await apiUser();
  const orderId = await findAccessibleOrderId((await ctx.params).id, user);
  const receipt = await loadReceipt(orderId);
  if (!receipt) throw new HttpError(404, "Order not found.");
  return NextResponse.json(receipt);
});
