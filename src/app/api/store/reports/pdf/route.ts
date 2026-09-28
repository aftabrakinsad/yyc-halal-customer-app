import { apiStaff } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { handle } from "@/lib/http";
import { getSettings } from "@/lib/settings";
import { buildReport, PERIODS, resolveRange, type Period } from "@/lib/store/reports";
import { renderReportPdf } from "@/lib/store/report-pdf";

export const GET = handle(async (req: Request) => {
  const staff = await apiStaff("viewReports");
  const p = new URL(req.url).searchParams;
  const period = (PERIODS as readonly string[]).includes(p.get("period") ?? "") ? (p.get("period") as Period) : "daily";
  const report = await buildReport(resolveRange(period, p.get("date"), p.get("from"), p.get("to")));
  const settings = await getSettings();
  const pdf = await renderReportPdf(report, settings.storeName);
  await audit({
    actorId: staff.id,
    actorRole: staff.role,
    action: "REPORT_DOWNLOADED",
    entityType: "Report",
    entityId: `${period}:${report.range.fromDay}`,
    data: { period, from: report.range.fromDay, to: report.range.toDay },
  });
  const name = `yyc-halal-${period}-report-${report.range.fromDay}${report.range.toDay !== report.range.fromDay ? `-to-${report.range.toDay}` : ""}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
});
