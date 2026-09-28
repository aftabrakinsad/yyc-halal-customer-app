import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, HttpError, parseBody } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

const schema = z
  .object({
    role: z.enum(["CUSTOMER", "STORE_EMPLOYEE", "STORE_MANAGER", "ADMIN"]),
    disabled: z.boolean(),
    name: z.string().min(1).max(100),
  })
  .partial();

// Role changes and disabling take effect on the employee's very next request (roles are re-read every time).
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const admin = await apiStaff("manageEmployees");
  const { id } = await ctx.params;
  const data = await parseBody(req, schema);
  const before = await db.user.findUnique({ where: { id } });
  if (!before) throw new HttpError(404, "Employee not found.");
  if (id === admin.id && (data.disabled || (data.role && data.role !== "ADMIN"))) {
    throw new HttpError(400, "You can't disable yourself or remove your own admin role.");
  }
  if (before.role === "ADMIN" && (data.disabled || (data.role && data.role !== "ADMIN"))) {
    const admins = await db.user.count({ where: { role: "ADMIN", disabled: false } });
    if (admins <= 1) throw new HttpError(400, "There must always be at least one active admin.");
  }
  const employee = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, disabled: true, lastLoginAt: true },
  });
  if (data.disabled) await db.pushSubscription.deleteMany({ where: { userId: id } });
  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    ip: clientIp(req),
    action: data.disabled === true ? "EMPLOYEE_DISABLED" : data.disabled === false ? "EMPLOYEE_ENABLED" : "EMPLOYEE_PERMISSIONS_CHANGED",
    entityType: "User",
    entityId: id,
    data: { email: before.email, from: { role: before.role, disabled: before.disabled, name: before.name }, to: data },
  });
  return NextResponse.json({ employee });
});
