import { currentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const POLL_MS = 3000;

/**
 * Server-Sent Events stream of changes to the customer's orders and notifications.
 * It watches the shared database, so updates made by the Store app (e.g. "Ready for Pickup")
 * reach the customer within a few seconds without a page reload.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let signature = "";
      let lastNotificationId: string | null = null;
      let closed = false;
      const write = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      };

      const tick = async () => {
        try {
          const [orders, latest, unread] = await Promise.all([
            db.order.aggregate({ where: { userId: user.id, orderNumber: { not: null } }, _max: { updatedAt: true }, _count: true }),
            db.notification.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
            db.notification.count({ where: { userId: user.id, readAt: null } }),
          ]);
          const next = `${orders._max.updatedAt?.getTime()}|${orders._count}|${latest?.id}|${unread}`;
          if (!signature) {
            lastNotificationId = latest?.id ?? null;
            write(`event: hello\ndata: ${JSON.stringify({ unread })}\n\n`);
          } else if (next !== signature) {
            const fresh = latest && latest.id !== lastNotificationId ? latest : null;
            lastNotificationId = latest?.id ?? null;
            const notification = fresh
              ? { id: fresh.id, title: fresh.title, body: fresh.body, orderId: fresh.orderId, type: fresh.type }
              : null;
            write(`event: change\ndata: ${JSON.stringify({ unread, notification })}\n\n`);
          } else {
            write(`: ping\n\n`);
          }
          signature = next;
        } catch (err) {
          console.error("[events]", err);
        }
      };

      req.signal.addEventListener("abort", close);
      write(`retry: 5000\n\n`);
      await tick();
      timer = setInterval(tick, POLL_MS);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
