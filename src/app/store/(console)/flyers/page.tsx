import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/money";
import { FlyerCard } from "@/components/FlyerCard";
import { FlyerActions } from "@/components/store/FlyerActions";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Flyers" };

function state(f: { active: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  if (!f.active) return ["Disabled", "bg-line text-ink"] as const;
  if (f.startsAt && f.startsAt > now) return ["Scheduled", "bg-gold-400/40 text-ink"] as const;
  if (f.endsAt && f.endsAt < now) return ["Ended", "bg-line text-muted"] as const;
  return ["Live on customer app", "bg-brand-600 text-white"] as const;
}

export default async function FlyersPage() {
  await requireStaff("manageFlyers");
  const flyers = await db.flyer.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Flyers</h1>
          <p className="text-muted">Enabled flyers appear on the customer app&apos;s home page between their start and end dates.</p>
        </div>
        <Link href="/store/flyers/new" className="btn-primary">
          <PlusIcon /> Add flyer
        </Link>
      </div>
      <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {flyers.map((f) => {
          const [label, cls] = state(f, now);
          return (
            <li key={f.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${cls}`}>{label}</span>
                <Link href={`/store/flyers/${f.id}`} className="font-semibold text-brand-700 underline">
                  Edit
                </Link>
              </div>
              <div className="pointer-events-none">
                <FlyerCard flyer={{ ...f, linkUrl: null }} />
              </div>
              <p className="text-sm text-muted">
                {f.startsAt ? `From ${formatDateTime(f.startsAt)}` : "Starts immediately"} · {f.endsAt ? `until ${formatDateTime(f.endsAt)}` : "no end date"}
              </p>
              <FlyerActions id={f.id} title={f.title} active={f.active} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
