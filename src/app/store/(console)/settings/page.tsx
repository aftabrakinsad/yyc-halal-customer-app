import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/store/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaff("manageSettings");
  const [s, pendingPrints] = await Promise.all([getSettings(), db.printJob.count({ where: { status: "PENDING" } })]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Store settings</h1>
      {pendingPrints > 0 && (
        <p className="rounded-xl bg-gold-400/25 p-3 font-semibold">
          {pendingPrints} receipt{pendingPrints === 1 ? " is" : "s are"} waiting for the POS printer. Make sure the print agent is running (see README).
        </p>
      )}
      <SettingsForm
        initial={{
          storeName: s.storeName,
          addressLine: s.addressLine,
          phone: s.phone,
          email: s.email,
          taxRateBps: s.taxRateBps,
          taxLabel: s.taxLabel,
          pickupInstructions: s.pickupInstructions,
          receiptFooter: s.receiptFooter,
          autoPrintReceipts: s.autoPrintReceipts,
          emailWhenReady: s.emailWhenReady,
          acceptingOrders: s.acceptingOrders,
        }}
      />
    </div>
  );
}
