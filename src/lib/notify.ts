import "server-only";
import webpush from "web-push";
import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import { db } from "./db";

type Tx = Prisma.TransactionClient;

export type NewNotification = {
  userId: string;
  orderId?: string;
  type: NotificationType;
  title: string;
  body: string;
};

/** Store an in-app notification (inside the caller's transaction). Deliver push after commit with `pushNotification`. */
export function createNotification(tx: Tx, n: NewNotification) {
  return tx.notification.create({ data: n });
}

let vapidReady: boolean | null = null;
function vapid() {
  if (vapidReady === null) {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    vapidReady = Boolean(pub && priv);
    if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:orders@yychalal.ca", pub!, priv!);
  }
  return vapidReady;
}

/** Web-push a notification to every device the customer enabled. Failures never break the caller. */
export async function pushNotification(n: { userId: string; title: string; body: string; orderId?: string | null }) {
  if (!vapid()) return;
  const subs = await db.pushSubscription.findMany({ where: { userId: n.userId } });
  const payload = JSON.stringify({ title: n.title, body: n.body, url: n.orderId ? `/orders/${n.orderId}` : "/orders" });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("[push] failed", status);
      }
    }),
  );
}
