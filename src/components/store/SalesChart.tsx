import { formatDate, formatMoney } from "@/lib/money";

type Point = { key: string; grossCents: number; refundsCents: number; netCents: number; orders: number };

function niceMax(v: number) {
  if (v <= 0) return 10000;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

const label = (key: string, month: boolean) =>
  month
    ? new Intl.DateTimeFormat("en-CA", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`))
    : formatDate(`${key}T12:00:00`);

/**
 * Single-series column chart of net sales (before tax, after refunds). One brand-green series,
 * so no legend — the heading names it. Hover/focus shows the exact figures; the table below is
 * the accessible full view.
 */
export function SalesChart({ points, granularity }: { points: Point[]; granularity: "day" | "month" }) {
  const month = granularity === "month";
  const max = niceMax(Math.max(...points.map((p) => p.netCents), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const every = Math.ceil(points.length / 12);

  return (
    <figure className="space-y-2">
      <div className="flex gap-2 pt-4">
        <div className="relative h-56 w-16 shrink-0 text-right text-xs text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              {formatMoney(t).replace(/\.00$/, "")}
            </span>
          ))}
        </div>
        <div className="relative h-56 flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden />
          ))}
          <ul className="absolute inset-0 flex items-end gap-[2px]" aria-label="Net sales by period">
            {points.map((p) => {
              const h = Math.max(0, (p.netCents / max) * 100);
              return (
                <li key={p.key} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0}>
                  <span className="absolute inset-0 rounded group-hover:bg-brand-50/70 group-focus:bg-brand-50/70" aria-hidden />
                  <span
                    className="relative w-full max-w-6 rounded-t bg-brand-500"
                    style={{ height: `${h}%`, minHeight: p.netCents > 0 ? 2 : 0 }}
                    aria-hidden
                  />
                  <span className="sr-only">
                    {label(p.key, month)}: net {formatMoney(p.netCents)}, {p.orders} orders
                  </span>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 rounded-xl border border-line bg-white p-3 text-left text-xs shadow-lg group-hover:block group-focus:block"
                  >
                    <span className="block text-sm font-bold">{label(p.key, month)}</span>
                    <span className="flex justify-between">
                      <span className="text-muted">Net sales</span>
                      <span className="font-semibold">{formatMoney(p.netCents)}</span>
                    </span>
                    <span className="flex justify-between">
                      <span className="text-muted">Gross</span>
                      <span>{formatMoney(p.grossCents)}</span>
                    </span>
                    <span className="flex justify-between">
                      <span className="text-muted">Refunds</span>
                      <span>{p.refundsCents ? `-${formatMoney(p.refundsCents)}` : "—"}</span>
                    </span>
                    <span className="flex justify-between">
                      <span className="text-muted">Orders</span>
                      <span>{p.orders}</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="ml-[4.5rem] flex gap-[2px] text-[11px] text-muted" aria-hidden>
        {points.map((p, i) => (
          <span key={p.key} className="flex-1 truncate text-center">
            {i % every === 0 ? (month ? label(p.key, true).split(" ")[0] : p.key.slice(8)) : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
