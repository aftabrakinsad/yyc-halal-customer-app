import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { FlyerForm } from "@/components/store/FlyerForm";

export const metadata: Metadata = { title: "Add flyer" };

export default async function NewFlyerPage() {
  await requireStaff("manageFlyers");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Add flyer</h1>
      <FlyerForm
        initial={{ kind: "FLYER", title: "", subtitle: "", body: "", imageUrl: null, linkUrl: "/order", active: true, startsAt: null, endsAt: null, sortOrder: 0 }}
      />
    </div>
  );
}
