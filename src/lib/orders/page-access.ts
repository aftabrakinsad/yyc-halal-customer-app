import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "../auth-helpers";
import { HttpError } from "../http";
import { loadReceipt } from "../receipt";
import { findAccessibleOrderId } from "./access";

/** For order pages: the receipt data, or a 404 if this user may not see the order. */
export async function receiptForPage(orderId: string) {
  const user = await requireUser();
  try {
    await findAccessibleOrderId(orderId, user);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  }
  const receipt = await loadReceipt(orderId);
  if (!receipt) notFound();
  return receipt;
}
