import "server-only";
import { timingSafeEqual } from "node:crypto";
import { apiUser, STAFF_ROLES } from "@/lib/auth-helpers";

/** The in-store print agent authenticates with PRINT_AGENT_TOKEN; staff browsers use their session. */
export async function requirePrinterAccess(req: Request) {
  const token = process.env.PRINT_AGENT_TOKEN;
  const header = req.headers.get("authorization") ?? "";
  if (token && header.startsWith("Bearer ")) {
    const given = Buffer.from(header.slice(7));
    const expected = Buffer.from(token);
    if (given.length === expected.length && timingSafeEqual(given, expected)) return;
  }
  await apiUser(STAFF_ROLES);
}
