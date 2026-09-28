import { currentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const POLL_MS = 2500;

/**
 * Server-Sent Events for the store dashboard: a "new-order" event for every newly *paid*
 * order (failed/abandoned checkouts never appear) and a "change" event whenever any order changes.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !can(user.role, "viewOrders")) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastPaidAt = new Date();
      let signature = "";
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
          // A disabled or demoted employee loses the live feed immediately.
          const me = await db.user.findUnique({ where: { id: user.id }, select: { role: true, disabled: true } });
          if (!me || me.disabled || !can(me.role, "viewOrders")) {
            write(`event: signed-out\ndata: {}\n\n`);
            return close();
          }
          const [fresh, agg] = await Promise.all([
            db.order.findMany({
              where: { orderNumber: { not: null }, paidAt: { gt: lastPaidAt } },
              orderBy: { paidAt: "asc" },
              select: { id: true, orderNumber: true, customerName: true, totalCents: true, paidAt: true },
            }),
            db.order.aggregate({ where: { orderNumber: { not: null } }, _max: { updatedAt: true }, _count: true }),
          ]);
          if (fresh.length) {
            lastPaidAt = fresh[fresh.length - 1].paidAt!;
            write(`event: new-order\ndata: ${JSON.stringify(fresh)}\n\n`);
          }
          const next = `${agg._max.updatedAt?.getTime()}|${agg._count}`;
          if (signature && next !== signature && !fresh.length) write(`event: change\ndata: {}\n\n`);
          else if (!fresh.length) write(`: ping\n\n`);
          signature = next;
        } catch (err) {
          console.error("[store events]", err);
        }
      };

      req.signal.addEventListener("abort", close);
      write(`retry: 3000\n\n`);
      await tick();
      timer = setInterval(tick, POLL_MS);
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
