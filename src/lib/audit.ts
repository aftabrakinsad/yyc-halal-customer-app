import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient;

export type AuditEntry = {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  data?: Prisma.InputJsonValue;
  ip?: string | null;
};

/** Append a permanent audit record. Pass `tx` to write it in the same transaction as the change. */
export async function audit(entry: AuditEntry, tx: Tx = db) {
  await tx.auditLog.create({ data: entry });
}
