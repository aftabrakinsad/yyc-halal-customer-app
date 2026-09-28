import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { FlyerForm } from "@/components/store/FlyerForm";

export const metadata: Metadata = { title: "Edit flyer" };

export default async function EditFlyerPage({ params }: PageProps<"/store/flyers/[id]">) {
  await requireStaff("manageFlyers");
  const f = await db.flyer.findUnique({ where: { id: (await params).id } });
  if (!f) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Edit flyer</h1>
      <FlyerForm
        initial={{
          id: f.id,
          kind: f.kind,
          title: f.title,
          subtitle: f.subtitle ?? "",
          body: f.body ?? "",
          imageUrl: f.imageUrl,
          linkUrl: f.linkUrl ?? "",
          active: f.active,
          startsAt: f.startsAt?.toISOString() ?? null,
          endsAt: f.endsAt?.toISOString() ?? null,
          sortOrder: f.sortOrder,
        }}
      />
    </div>
  );
}
