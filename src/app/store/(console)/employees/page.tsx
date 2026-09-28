import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/money";
import { EmployeesManager } from "@/components/store/EmployeesManager";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const me = await requireStaff("manageEmployees");
  const staff = await db.user.findMany({
    where: { role: { in: ["STORE_EMPLOYEE", "STORE_MANAGER", "ADMIN"] } },
    orderBy: [{ disabled: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, disabled: true, lastLoginAt: true },
  });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Employees</h1>
        <p className="text-muted">
          Only accounts listed here can open the store app. Changes apply immediately — a disabled employee is signed out of the store app on their next
          action.
        </p>
      </div>
      <EmployeesManager
        meId={me.id}
        employees={staff.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role as "STORE_EMPLOYEE" | "STORE_MANAGER" | "ADMIN",
          disabled: s.disabled,
          lastLogin: s.lastLoginAt ? formatDateTime(s.lastLoginAt) : null,
        }))}
      />
    </div>
  );
}
