import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { requireStaff } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Audit Log" };

const PAGE = 100;

function summarize(data: Prisma.JsonValue): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const d = data as Record<string, unknown>;
  const parts: string[] = [];
  if (d.orderNumber) parts.push(`#${d.orderNumber}`);
  if (d.product) parts.push(String(d.product));
  if (typeof d.amountCents === "number") parts.push(formatMoney(d.amountCents));
  if (d.from !== undefined && d.to !== undefined && typeof d.from !== "object") {
    parts.push(typeof d.from === "number" && typeof d.to === "number" ? `${formatMoney(d.from)} → ${formatMoney(d.to)}` : `${d.from} → ${d.to}`);
  }
  if (d.reasonCategory) parts.push(String(d.reasonCategory));
  if (d.email) parts.push(String(d.email));
  if (d.role) parts.push(String(d.role));
  return parts.join(" · ");
}

/** Read-only for admins. The table itself is append-only (database trigger), so nobody can edit history. */
export default async function AuditPage({ searchParams }: PageProps<"/store/audit">) {
  await requireStaff("viewAuditLogs");
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(q
      ? {
          OR: [
            { entityId: q },
            { actor: { name: { contains: q, mode: "insensitive" } } },
            { actor: { email: { contains: q, mode: "insensitive" } } },
            { data: { path: ["orderNumber"], string_contains: q.toUpperCase() } },
          ],
        }
      : {}),
  };
  const [logs, actions] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: page * PAGE, take: PAGE + 1, include: { actor: { select: { name: true, email: true } } } }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  const hasMore = logs.length > PAGE;
  const link = (p: number) => `/store/audit?${new URLSearchParams({ ...(action && { action }), ...(q && { q }), page: String(p) })}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Audit Log</h1>
        <p className="text-muted">Permanent record of logins, order, payment, refund, product, inventory, flyer and employee changes. Entries can&apos;t be edited or deleted.</p>
      </div>
      <form className="card flex flex-wrap items-end gap-3 p-4">
        <label className="font-semibold">
          Action
          <select name="action" defaultValue={action} className="input mt-1 w-64">
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a.action}>{a.action}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 font-semibold">
          Search
          <input name="q" defaultValue={q} placeholder="Employee name/email, order number or record ID" className="input mt-1" />
        </label>
        <button className="btn-primary">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Date &amp; time</th>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Related record</th>
              <th className="px-4 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.slice(0, PAGE).map((l) => (
              <tr key={l.id} className="align-top">
                <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                <td className="px-4 py-2">
                  {l.actor ? (
                    <>
                      <span className="block font-semibold">{l.actor.name}</span>
                      <span className="block text-muted">{l.actorRole}</span>
                    </>
                  ) : (
                    <span className="text-muted">{l.actorRole ?? "System"}</span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs font-bold">{l.action}</td>
                <td className="px-4 py-2">
                  {l.entityType === "Order" ? (
                    <Link href={`/store/orders/${l.entityId}`} className="text-brand-700 underline">
                      Order
                    </Link>
                  ) : l.entityType === "Product" ? (
                    <Link href={`/store/products/${l.entityId}`} className="text-brand-700 underline">
                      Product
                    </Link>
                  ) : (
                    l.entityType
                  )}
                  <span className="block text-xs text-muted">{l.entityId}</span>
                </td>
                <td className="px-4 py-2">
                  {summarize(l.data)}
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted">Raw</summary>
                    <pre className="max-w-md overflow-x-auto text-xs whitespace-pre-wrap">{JSON.stringify(l.data, null, 1)}</pre>
                    {l.ip && <p className="text-xs text-muted">IP {l.ip}</p>}
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between">
        {page > 0 ? (
          <Link href={link(page - 1)} className="btn-secondary">
            Newer
          </Link>
        ) : (
          <span />
        )}
        {hasMore && (
          <Link href={link(page + 1)} className="btn-secondary">
            Older
          </Link>
        )}
      </div>
    </div>
  );
}
