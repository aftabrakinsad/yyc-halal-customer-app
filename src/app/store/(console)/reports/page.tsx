import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { HttpError } from "@/lib/http";
import { formatDate, formatDateTime, formatMoney } from "@/lib/money";
import { REFUND_TYPE_LABEL } from "@/lib/labels";
import { buildReport, PERIOD_LABEL, PERIODS, resolveRange, todayKey, type Period } from "@/lib/store/reports";
import { StatTiles } from "@/components/store/StatTiles";
import { SalesChart } from "@/components/store/SalesChart";

export const metadata: Metadata = { title: "Sales Reports" };

const day = (key: string) => formatDate(`${key}T12:00:00`);

export default async function ReportsPage({ searchParams }: PageProps<"/store/reports">) {
  await requireStaff("viewReports");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const period: Period = (PERIODS as readonly string[]).includes(str("period")) ? (str("period") as Period) : "daily";
  const date = str("date") || todayKey();
  const from = str("from") || todayKey();
  const to = str("to") || todayKey();

  let report;
  let error: string | null = null;
  try {
    report = await buildReport(resolveRange(period, date, from, to));
  } catch (e) {
    if (e instanceof HttpError) error = e.message;
    else throw e;
  }
  const query = new URLSearchParams(period === "custom" ? { period, from, to } : { period, date });
  const s = report?.summary;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">Sales Reports</h1>

      <form className="card flex flex-wrap items-end gap-3 p-4" aria-label="Report period">
        <label className="font-semibold">
          Report
          <select name="period" defaultValue={period} className="input mt-1 w-48">
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="font-semibold">
          Date in period
          <input type="date" name="date" defaultValue={date} className="input mt-1" />
        </label>
        <span className="pb-3 text-sm text-muted">or for a custom range:</span>
        <label className="font-semibold">
          From
          <input type="date" name="from" defaultValue={from} className="input mt-1" />
        </label>
        <label className="font-semibold">
          To
          <input type="date" name="to" defaultValue={to} className="input mt-1" />
        </label>
        <button className="btn-primary">Show report</button>
        {report && (
          <a href={`/api/store/reports/pdf?${query}`} className="btn-secondary ml-auto">
            Download PDF
          </a>
        )}
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
          {error}
        </p>
      )}

      {report && s && (
        <>
          <p className="text-lg font-bold">
            {PERIOD_LABEL[report.range.period]}: {day(report.range.fromDay)}
            {report.range.toDay !== report.range.fromDay && ` – ${day(report.range.toDay)}`}
          </p>

          <StatTiles
            stats={[
              { label: "Net sales", value: formatMoney(s.netSalesCents), tone: "green" },
              { label: "Gross sales", value: formatMoney(s.grossSalesCents) },
              { label: "Taxes collected", value: formatMoney(s.taxCollectedCents) },
              { label: "Refunds", value: formatMoney(s.refundsCents) },
              { label: "Orders", value: String(s.orderCount) },
              { label: "Average order", value: formatMoney(s.averageOrderCents) },
              { label: "Refunded / cancelled orders", value: `${s.refundedOrderCount} / ${s.cancelledOrderCount}` },
            ]}
          />
          <p className="text-sm text-muted">
            Gross sales are before tax. Net sales = gross sales minus the before-tax part of refunds issued in this period (
            {formatMoney(s.refundsCents - s.refundedTaxCents)} + {formatMoney(s.refundedTaxCents)} tax). Refunded money is never counted as sales.
          </p>

          <section className="card space-y-3 p-5" aria-labelledby="chart-h">
            <h2 id="chart-h" className="text-lg font-bold">
              Net sales by {report.series.granularity}
            </h2>
            <SalesChart points={report.series.points} granularity={report.series.granularity} />
          </section>

          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <section className="card p-5" aria-labelledby="best-h">
              <h2 id="best-h" className="text-lg font-bold">
                Best-selling products
              </h2>
              {report.bestSellers.length ? (
                <ol className="mt-2 space-y-2">
                  {report.bestSellers.map((p, i) => (
                    <li key={`${p.name}${p.unit}`} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 font-black text-brand-700">{i + 1}</span>
                      <span className="flex-1 font-semibold">{p.name}</span>
                      <span className="text-muted">
                        {p.netQuantity} {p.unit}
                      </span>
                      <span className="w-24 text-right font-bold">{formatMoney(p.netSalesCents)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted">No sales in this period.</p>
              )}
            </section>

            <section className="card p-5" aria-labelledby="refund-h">
              <h2 id="refund-h" className="text-lg font-bold">
                Refunds ({formatMoney(s.refundsCents)})
              </h2>
              {report.refunds.length ? (
                <ul className="mt-2 divide-y divide-line">
                  {report.refunds.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <Link href={`/store/orders/${r.orderId}`} className="font-bold text-brand-700 underline">
                        {r.orderNumber}
                      </Link>
                      <span>
                        {REFUND_TYPE_LABEL[r.type]}
                        {r.reasonCategory && ` · ${r.reasonCategory}`}
                      </span>
                      <span className="text-muted">
                        {formatDateTime(r.date)} · {r.employee}
                      </span>
                      <span className="font-bold">-{formatMoney(r.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No refunds in this period.</p>
              )}
            </section>
          </div>

          <section className="card overflow-x-auto p-5" aria-labelledby="products-h">
            <h2 id="products-h" className="text-lg font-bold">
              Product sales
            </h2>
            <table className="mt-2 w-full min-w-[640px] text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 text-right font-semibold">Quantity sold</th>
                  <th className="py-2 text-right font-semibold">Refunded</th>
                  <th className="py-2 text-right font-semibold">Gross</th>
                  <th className="py-2 text-right font-semibold">Net sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {report.products.map((p) => (
                  <tr key={`${p.name}${p.unit}`}>
                    <td className="py-2 font-semibold">{p.name}</td>
                    <td className="py-2 text-right">
                      {p.quantitySold} {p.unit}
                    </td>
                    <td className="py-2 text-right text-muted">{p.quantityRefunded ? `${p.quantityRefunded} ${p.unit}` : "—"}</td>
                    <td className="py-2 text-right">{formatMoney(p.grossCents)}</td>
                    <td className="py-2 text-right font-bold">{formatMoney(p.netSalesCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report.products.length && <p className="py-3 text-muted">No sales in this period.</p>}
          </section>

          <section className="card overflow-x-auto p-5" aria-labelledby="series-h">
            <h2 id="series-h" className="text-lg font-bold">
              Sales by {report.series.granularity}
            </h2>
            <table className="mt-2 w-full min-w-[560px] text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th className="py-2 font-semibold">{report.series.granularity === "month" ? "Month" : "Day"}</th>
                  <th className="py-2 text-right font-semibold">Orders</th>
                  <th className="py-2 text-right font-semibold">Gross</th>
                  <th className="py-2 text-right font-semibold">Refunds</th>
                  <th className="py-2 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {report.series.points.map((p) => (
                  <tr key={p.key} className={p.orders || p.refundsCents ? "" : "text-muted"}>
                    <td className="py-2">{report.series.granularity === "month" ? p.key : day(p.key)}</td>
                    <td className="py-2 text-right">{p.orders}</td>
                    <td className="py-2 text-right">{formatMoney(p.grossCents)}</td>
                    <td className="py-2 text-right">{p.refundsCents ? `-${formatMoney(p.refundsCents)}` : "—"}</td>
                    <td className="py-2 text-right font-semibold">{formatMoney(p.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
