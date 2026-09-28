import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/auth-helpers";
import { handle, parseBody } from "@/lib/http";
import { previewRefund } from "@/lib/orders/service";
import { refundPreviewSchema } from "@/lib/store-schemas";

type Ctx = { params: Promise<{ id: string }> };

/** Calculates a refund on the server for the confirmation screen. Nothing is charged back. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  await apiStaff("refund");
  const request = await parseBody(req, refundPreviewSchema);
  return NextResponse.json(await previewRefund((await ctx.params).id, request));
});
