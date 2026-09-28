import "server-only";
import { db } from "./db";

/** Store settings are a single row managed by the Store Management app. */
export async function getSettings() {
  return (
    (await db.storeSettings.findUnique({ where: { id: 1 } })) ??
    (await db.storeSettings.create({ data: { id: 1 } }))
  );
}
