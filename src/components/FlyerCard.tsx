/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Flyer } from "@/generated/prisma/client";
import { formatDate } from "@/lib/money";

const KIND: Record<Flyer["kind"], { label: string; cls: string }> = {
  FLYER: { label: "This week's flyer", cls: "from-brand-600 to-brand-800 text-white" },
  SALE: { label: "Sale", cls: "from-accent-500 to-[#8f0b21] text-white" },
  PROMOTION: { label: "Promotion", cls: "from-gold-400 to-[#e0a526] text-ink" },
  SPECIAL_OFFER: { label: "Special offer", cls: "from-brand-500 to-brand-700 text-white" },
  ANNOUNCEMENT: { label: "Store announcement", cls: "from-white to-brand-50 text-ink border border-line" },
};

export function FlyerCard({ flyer, featured = false }: { flyer: Flyer; featured?: boolean }) {
  const kind = KIND[flyer.kind];
  const body = (
    <article className={`h-full overflow-hidden rounded-3xl shadow-sm ${flyer.imageUrl ? "border border-line bg-white" : `bg-gradient-to-br ${kind.cls}`}`}>
      {flyer.imageUrl && (
        <img
          src={flyer.imageUrl}
          alt={flyer.title}
          className={`w-full object-cover ${featured ? "aspect-[16/9] sm:aspect-[21/9]" : "aspect-[4/3]"}`}
        />
      )}
      <div className={featured ? "p-6 sm:p-8" : "p-5"}>
        <p className={`text-xs font-bold tracking-wider uppercase ${flyer.imageUrl ? "text-accent-500" : "opacity-85"}`}>{kind.label}</p>
        <h2 className={`mt-1 font-extrabold tracking-tight ${featured ? "text-3xl sm:text-4xl" : "text-xl"}`}>{flyer.title}</h2>
        {flyer.subtitle && <p className={`mt-1 font-semibold ${featured ? "text-lg" : ""}`}>{flyer.subtitle}</p>}
        {flyer.body && <p className={`mt-2 whitespace-pre-line ${flyer.imageUrl ? "text-muted" : "opacity-90"}`}>{flyer.body}</p>}
        {flyer.endsAt && <p className="mt-3 text-sm font-semibold opacity-80">Ends {formatDate(flyer.endsAt)}</p>}
      </div>
    </article>
  );
  if (!flyer.linkUrl) return body;
  const internal = flyer.linkUrl.startsWith("/");
  return internal ? (
    <Link href={flyer.linkUrl} className="block h-full">
      {body}
    </Link>
  ) : (
    <a href={flyer.linkUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
      {body}
    </a>
  );
}
