import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/money";
import { MarkAllRead } from "@/components/MarkAllRead";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = notifications.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="page-title">Notifications</h1>
      {unread && <MarkAllRead />}
      {notifications.length === 0 ? (
        <p className="card p-8 text-center text-muted">No notifications yet. We&apos;ll let you know about your orders here.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.orderId ? `/orders/${n.orderId}` : "/orders"}
                className={`card block p-4 hover:border-brand-200 ${n.readAt ? "" : "border-l-4 border-l-brand-600"}`}
              >
                <p className="font-bold">
                  {!n.readAt && <span className="sr-only">Unread: </span>}
                  {n.title}
                </p>
                <p>{n.body}</p>
                <p className="mt-1 text-sm text-muted">{formatDateTime(n.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
