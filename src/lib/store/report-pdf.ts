import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatDate, formatDateTime, formatMoney } from "../money";
import { REFUND_TYPE_LABEL } from "../labels";
import { PERIOD_LABEL, type SalesReport } from "./reports";

const GREEN = "#0b6b3a";
const INK = "#1c1f1d";
const MUTED = "#5c635e";
const LINE = "#d9dcd6";

const day = (key: string) => formatDate(`${key}T12:00:00`);

/** Printable, letter-size PDF of a sales report. */
export function renderReportPdf(report: SalesReport, storeName: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50, bufferPages: true, info: { Title: `${storeName} sales report`, Author: storeName } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const s = report.summary;

  // Header
  doc.image(path.join(process.cwd(), "public/brand/icon-512.png"), left, 45, { width: 58 });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(20).text(storeName, left + 72, 50);
  doc.font("Helvetica").fontSize(12).fillColor(GREEN).text(`${PERIOD_LABEL[report.range.period]} Sales Report`, left + 72, 75);
  doc.fillColor(MUTED).fontSize(9).text(
    `Period: ${day(report.range.fromDay)} – ${day(report.range.toDay)}   ·   Generated: ${formatDateTime(report.generatedAt)} (Calgary time)`,
    left + 72,
    92,
  );
  doc.moveTo(left, 115).lineTo(left + width, 115).strokeColor(GREEN).lineWidth(2).stroke();
  doc.y = 130;

  const heading = (text: string) => {
    if (doc.y > doc.page.height - 140) doc.addPage();
    doc.moveDown(0.6).font("Helvetica-Bold").fontSize(13).fillColor(GREEN).text(text, left, doc.y);
    doc.moveDown(0.3);
  };

  type Col = { label: string; width: number; align?: "left" | "right" };
  const table = (cols: Col[], rows: string[][], opts: { boldLast?: boolean } = {}) => {
    const drawRow = (cells: string[], bold: boolean, header = false) => {
      if (doc.y > doc.page.height - 70) {
        doc.addPage();
        doc.y = 50;
        if (!header) drawRow(cols.map((c) => c.label), false, true); // repeat column headings on the new page
      }
      const y = doc.y;
      let x = left;
      doc.font(bold || header ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(header ? MUTED : INK);
      const heights = cells.map((c, i) => doc.heightOfString(c, { width: cols[i].width - 8 }));
      cells.forEach((c, i) => {
        doc.text(c, x + 4, y + 4, { width: cols[i].width - 8, align: cols[i].align ?? "left" });
        x += cols[i].width;
      });
      const h = Math.max(...heights) + 8;
      doc.moveTo(left, y + h).lineTo(left + width, y + h).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.y = y + h;
    };
    drawRow(cols.map((c) => c.label), false, true);
    rows.forEach((r, i) => drawRow(r, !!opts.boldLast && i === rows.length - 1));
  };

  heading("Summary");
  table(
    [
      { label: "Measure", width: width * 0.6 },
      { label: "Amount", width: width * 0.4, align: "right" },
    ],
    [
      ["Gross sales (before tax)", formatMoney(s.grossSalesCents)],
      ["Taxes collected", formatMoney(s.taxCollectedCents)],
      ["Total collected (incl. tax)", formatMoney(s.totalCollectedCents)],
      ["Refunds (incl. tax)", `-${formatMoney(s.refundsCents)}`],
      ["Net tax (after refunds)", formatMoney(s.netTaxCents)],
      ["Number of orders", String(s.orderCount)],
      ["Average order", formatMoney(s.averageOrderCents)],
      ["Refunded orders", String(s.refundedOrderCount)],
      ["Cancelled orders", String(s.cancelledOrderCount)],
      ["Net sales (before tax, after refunds)", formatMoney(s.netSalesCents)],
    ],
    { boldLast: true },
  );

  heading("Product sales");
  if (report.products.length) {
    table(
      [
        { label: "Product", width: width * 0.34 },
        { label: "Qty sold", width: width * 0.14, align: "right" },
        { label: "Refunded", width: width * 0.14, align: "right" },
        { label: "Gross", width: width * 0.19, align: "right" },
        { label: "Net sales", width: width * 0.19, align: "right" },
      ],
      report.products.map((p) => [
        p.name,
        `${p.quantitySold} ${p.unit}`,
        p.quantityRefunded ? `${p.quantityRefunded} ${p.unit}` : "—",
        formatMoney(p.grossCents),
        formatMoney(p.netSalesCents),
      ]),
    );
  } else doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("No sales in this period.");

  heading(report.series.granularity === "month" ? "Sales by month" : "Sales by day");
  table(
    [
      { label: report.series.granularity === "month" ? "Month" : "Day", width: width * 0.34 },
      { label: "Orders", width: width * 0.14, align: "right" },
      { label: "Gross", width: width * 0.17, align: "right" },
      { label: "Refunds", width: width * 0.17, align: "right" },
      { label: "Net", width: width * 0.18, align: "right" },
    ],
    report.series.points
      .filter((p) => p.orders || p.refundsCents)
      .map((p) => [
        report.series.granularity === "month" ? p.key : day(p.key),
        String(p.orders),
        formatMoney(p.grossCents),
        p.refundsCents ? `-${formatMoney(p.refundsCents)}` : "—",
        formatMoney(p.netCents),
      ]),
  );

  heading("Refund summary");
  if (report.refunds.length) {
    table(
      [
        { label: "Date", width: width * 0.2 },
        { label: "Order", width: width * 0.2 },
        { label: "Type / reason", width: width * 0.26 },
        { label: "Employee", width: width * 0.18 },
        { label: "Amount", width: width * 0.16, align: "right" },
      ],
      [
        ...report.refunds.map((r) => [
          formatDateTime(r.date),
          r.orderNumber ?? "—",
          [REFUND_TYPE_LABEL[r.type], r.reasonCategory].filter(Boolean).join(" · "),
          r.employee,
          formatMoney(r.amountCents),
        ]),
        ["", "", "Total refunds", "", formatMoney(s.refundsCents)],
      ],
      { boldLast: true },
    );
  } else doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("No refunds in this period.");

  // Footer with page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 35;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED);
    doc.text(`${storeName} · Confidential business record`, left, bottom, { width: width / 2, lineBreak: false });
    doc.text(`Page ${i + 1} of ${range.count}`, left + width / 2, bottom, { width: width / 2, align: "right", lineBreak: false });
  }
  doc.end();
  return done;
}
