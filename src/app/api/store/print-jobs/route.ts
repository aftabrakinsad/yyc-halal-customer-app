import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle } from "@/lib/http";
import { requirePrinterAccess } from "./auth";

// The POS print agent polls this for receipts to print.
export const GET = handle(async (req: Request) => {
  await requirePrinterAccess(req);
  const jobs = await db.printJob.findMany({
    where: { status: "PENDING", attempts: { lt: 5 } },
    orderBy: { createdAt: "asc" },
    take: 20,
    include: { order: { select: { orderNumber: true } } },
  });
  return NextResponse.json({
    jobs: jobs.map((j) => ({ id: j.id, kind: j.kind, orderId: j.orderId, orderNumber: j.order.orderNumber, createdAt: j.createdAt, textUrl: `/api/store/print-jobs/${j.id}` })),
  });
});
