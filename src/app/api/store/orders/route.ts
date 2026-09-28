import { NextResponse } from "next/server";
import { apiUser, STAFF_ROLES } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { handle } from "@/lib/http";
import { OrderStatus } from "@/generated/prisma/enums";

// Store app: confirmed orders, newest first. ?status=IN_PROGRESS,READY_FOR_PICKUP
export const GET = handle(async (req: Request) => {
  await apiUser(STAFF_ROLES);
  const url = new URL(req.url);
  const statuses = (url.searchParams.get("status") ?? "")
    .split(",")
    .filter((s): s is OrderStatus => Object.values(OrderStatus).includes(s as OrderStatus));
  const orders = await db.order.findMany({
    where: { orderNumber: { not: null }, ...(statuses.length ? { status: { in: statuses } } : {}) },
    orderBy: { paidAt: "desc" },
    take: Math.min(Number(url.searchParams.get("limit") ?? 100), 500),
    include: { items: true },
  });
  return NextResponse.json({ orders });
});
