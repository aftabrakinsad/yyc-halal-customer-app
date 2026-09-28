"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABEL } from "@/lib/permissions";
import { useToast } from "../shell/Toaster";
import { storePost } from "./api";

type Employee = { id: string; name: string; email: string; role: "STORE_EMPLOYEE" | "STORE_MANAGER" | "ADMIN"; disabled: boolean; lastLogin: string | null };
const ROLES = ["STORE_EMPLOYEE", "STORE_MANAGER", "ADMIN"] as const;

export function EmployeesManager({ employees, meId }: { employees: Employee[]; meId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", name: "", role: "STORE_EMPLOYEE" as Employee["role"] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast({ title: message });
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <form
        className="card grid gap-3 p-5 md:grid-cols-[1fr_1fr_220px_auto] md:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => storePost("/api/store/employees", form), `${form.name} can now sign in to the store app`)) setForm({ email: "", name: "", role: "STORE_EMPLOYEE" });
        }}
      >
        <p className="font-bold md:col-span-4">Add employee (approve their Google / Gmail account)</p>
        <label className="font-semibold">
          Google email
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input mt-1" placeholder="name@gmail.com" />
        </label>
        <label className="font-semibold">
          Name
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input mt-1" />
        </label>
        <label className="font-semibold">
          Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Employee["role"] })} className="input mt-1">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary" disabled={busy}>
          Add
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-cream text-sm text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
              <th className="px-4 py-3 font-semibold">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {employees.map((emp) => {
              const me = emp.id === meId;
              return (
                <tr key={emp.id} className={emp.disabled ? "bg-cream/70 text-muted" : ""}>
                  <td className="px-4 py-3">
                    <span className="block font-bold">
                      {emp.name} {me && <span className="text-sm font-normal text-muted">(you)</span>}
                    </span>
                    <span className="block text-sm text-muted">{emp.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={emp.role}
                      disabled={busy || me}
                      aria-label={`Role for ${emp.name}`}
                      onChange={(e) => run(() => storePost(`/api/store/employees/${emp.id}`, { role: e.target.value }, "PATCH"), `${emp.name} is now ${ROLE_LABEL[e.target.value as Employee["role"]]}`)}
                      className="input w-52"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">{emp.lastLogin ?? "Never signed in"}</td>
                  <td className="px-4 py-3">
                    {emp.disabled ? (
                      <button type="button" disabled={busy} className="btn-secondary min-h-11 text-sm" onClick={() => run(() => storePost(`/api/store/employees/${emp.id}`, { disabled: false }, "PATCH"), `${emp.name} re-enabled`)}>
                        Enable
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || me}
                          className="btn-danger min-h-11 text-sm"
                          onClick={() => {
                            if (confirm(`Disable ${emp.name}? They lose access to the store app immediately.`))
                              run(() => storePost(`/api/store/employees/${emp.id}`, { disabled: true }, "PATCH"), `${emp.name} disabled`);
                          }}
                        >
                          Disable
                        </button>
                        <button
                          type="button"
                          disabled={busy || me}
                          className="btn-ghost min-h-11 text-sm"
                          onClick={() => {
                            if (confirm(`Remove ${emp.name} from the store staff? Their account becomes a normal customer account.`))
                              run(() => storePost(`/api/store/employees/${emp.id}`, { role: "CUSTOMER" }, "PATCH"), `${emp.name} removed from staff`);
                          }}
                        >
                          Remove from staff
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
