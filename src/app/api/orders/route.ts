import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle } from "@/lib/http";

// The signed-in customer's confirmed orders (drafts awaiting payment are never listed).
export const GET = handle(async () => {
  const user = await apiUser();
  const orders = await db.order.findMany({
    where: { userId: user.id, orderNumber: { not: null } },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      paidAt: true,
      status: true,
      paymentStatus: true,
      totalCents: true,
      refundedCents: true,
      currency: true,
    },
  });
  return NextResponse.json({ orders });
});
