import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/auth-helpers";
import { handle } from "@/lib/http";
import { searchOrders } from "@/lib/store/orders";

// Search confirmed orders: ?q=YYC-2026-001245 | name | email, &status=IN_PROGRESS,READY_FOR_PICKUP, &payment=REFUNDED
export const GET = handle(async (req: Request) => {
  await apiStaff("viewOrders");
  const url = new URL(req.url);
  const orders = await searchOrders({
    q: url.searchParams.get("q"),
    status: url.searchParams.get("status"),
    payment: url.searchParams.get("payment"),
    limit: Number(url.searchParams.get("limit") ?? 100),
  });
  return NextResponse.json({ orders });
});
