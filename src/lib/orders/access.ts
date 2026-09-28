import "server-only";
import { db } from "../db";
import { HttpError } from "../http";
import { isStaff, type CurrentUser } from "../auth-helpers";

/**
 * Loads an order only if the user may see it: customers get their own confirmed orders,
 * staff get any. A guessed or edited id/URL returns 404 — never another customer's data.
 */
export async function findAccessibleOrderId(orderId: string, user: CurrentUser, opts: { includeDrafts?: boolean } = {}) {
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      ...(isStaff(user.role) ? {} : { userId: user.id }),
      ...(opts.includeDrafts ? {} : { orderNumber: { not: null } }),
    },
    select: { id: true },
  });
  if (!order) throw new HttpError(404, "Order not found.");
  return order.id;
}
