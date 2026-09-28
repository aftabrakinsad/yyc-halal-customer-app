import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/auth";
import { avatarUrl, isStaff, requireUser } from "@/lib/auth-helpers";
import { formatDate } from "@/lib/money";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { PushToggle } from "@/components/profile/PushToggle";
import { ChevronRightIcon, ReceiptIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="page-title">Profile</h1>

      <section className="card flex flex-col items-center gap-2 p-6 text-center">
        <AvatarUploader imageUrl={avatarUrl(user)} name={user.name} hasCustomPhoto={!!user.avatarUpdatedAt} />
        <h2 className="mt-2 text-2xl font-extrabold">{user.name}</h2>
        <p className="text-muted">{user.email}</p>
        <p className="text-sm text-muted">Customer since {formatDate(user.createdAt)}</p>
      </section>

      <Link href="/orders" className="card flex min-h-16 items-center gap-3 p-4 font-bold hover:border-brand-200">
        <span className="rounded-full bg-brand-50 p-2 text-brand-700">
          <ReceiptIcon />
        </span>
        <span className="flex-1">My order history</span>
        <ChevronRightIcon className="text-muted" />
      </Link>

      {isStaff(user.role) && (
        <Link href="/store" className="card flex min-h-16 items-center gap-3 border-2 border-gold-400 p-4 font-bold hover:bg-gold-400/10">
          <span className="rounded-full bg-gold-400 p-2 text-ink">
            <ReceiptIcon />
          </span>
          <span className="flex-1">Open the store app (staff)</span>
          <ChevronRightIcon className="text-muted" />
        </Link>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">Notifications</h2>
        <p className="text-sm text-muted">Get an alert on this device when your order is ready for pickup.</p>
        <PushToggle />
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="btn-danger btn-lg w-full">
          Log out
        </button>
      </form>
    </div>
  );
}
