
type Stat = { label: string; value: string; tone?: "gold" | "green" | "plain" };

export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-2xl border p-4 ${
            s.tone === "gold" ? "border-gold-400 bg-gold-400/20" : s.tone === "green" ? "border-brand-200 bg-brand-50" : "border-line bg-white"
          }`}
        >
          <dt className="text-sm font-semibold text-muted">{s.label}</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

