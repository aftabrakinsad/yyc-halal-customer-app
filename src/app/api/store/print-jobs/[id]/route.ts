import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, parseBody } from "@/lib/http";
import { loadReceipt } from "@/lib/receipt";
import { posReceiptText } from "@/lib/pos-receipt";
import { requirePrinterAccess } from "../auth";

type Ctx = { params: Promise<{ id: string }> };

/** Plain-text (42 columns) receipt, ready to send to an ESC/POS thermal printer. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  await requirePrinterAccess(req);
  const job = await db.printJob.findUnique({ where: { id: (await ctx.params).id } });
  if (!job) throw new HttpError(404, "Print job not found.");
  const receipt = await loadReceipt(job.orderId);
  if (!receipt) throw new HttpError(404, "Order not found.");
  return new Response(posReceiptText(receipt, job.kind === "REFUND" ? "REFUND" : "RECEIPT"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
});

/** The agent reports the result: { status: "PRINTED" } or { status: "FAILED", error }. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  await requirePrinterAccess(req);
  const { status, error } = await parseBody(req, z.object({ status: z.enum(["PRINTED", "FAILED"]), error: z.string().max(500).optional() }));
  const id = (await ctx.params).id;
  const job =
    status === "PRINTED"
      ? await db.printJob.update({ where: { id }, data: { status, printedAt: new Date(), attempts: { increment: 1 } } })
      : await db.printJob.update({ where: { id }, data: { status: "PENDING", error, attempts: { increment: 1 } } });
  return NextResponse.json({ job });
});
