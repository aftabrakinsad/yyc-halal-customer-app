import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/auth-helpers";
import { handle } from "@/lib/http";
import { buildReport, PERIODS, resolveRange, type Period } from "@/lib/store/reports";

// ?period=daily|weekly|monthly|quarterly|yearly|custom&date=YYYY-MM-DD (or &from=&to= for custom)
export const GET = handle(async (req: Request) => {
  await apiStaff("viewReports");
  const p = new URL(req.url).searchParams;
  const period = (PERIODS as readonly string[]).includes(p.get("period") ?? "") ? (p.get("period") as Period) : "daily";
  return NextResponse.json(await buildReport(resolveRange(period, p.get("date"), p.get("from"), p.get("to"))));
});
