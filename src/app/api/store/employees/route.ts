import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/auth-helpers";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handle, HttpError, parseBody } from "@/lib/http";
import { employeeSchema } from "@/lib/store-schemas";

const select = { id: true, name: true, email: true, role: true, disabled: true, lastLoginAt: true, createdAt: true } as const;

export const GET = handle(async () => {
  await apiStaff("manageEmployees");
  const employees = await db.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: { name: "asc" }, select });
  return NextResponse.json({ employees });
});

/**
 * Approve a Google account for the store app. The person signs in with that Gmail/Google
 * account and gets the assigned role. An existing customer account is promoted.
 */
export const POST = handle(async (req: Request) => {
  const admin = await apiStaff("manageEmployees");
  const { email, name, role } = await parseBody(req, employeeSchema);
  const normalized = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing && existing.role !== "CUSTOMER") throw new HttpError(409, "That person is already an employee.");
  const employee = existing
    ? await db.user.update({ where: { id: existing.id }, data: { role, disabled: false }, select })
    : await db.user.create({ data: { email: normalized, name, role }, select });
  await audit({
    actorId: admin.id,
    actorRole: admin.role,
    ip: clientIp(req),
    action: "EMPLOYEE_ADDED",
    entityType: "User",
    entityId: employee.id,
    data: { email: normalized, role, previousRole: existing?.role ?? null },
  });
  return NextResponse.json({ employee }, { status: 201 });
});
