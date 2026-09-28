import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";
import { HttpError } from "./http";
import { Role } from "@/generated/prisma/enums";

export const STAFF_ROLES: Role[] = [Role.STORE_EMPLOYEE, Role.STORE_MANAGER, Role.ADMIN];
export const MANAGER_ROLES: Role[] = [Role.STORE_MANAGER, Role.ADMIN];

/** The signed-in user, freshly loaded from the database (so role changes and bans apply immediately). */
export const currentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, omit: { avatarData: true } });
  if (!user || user.disabled) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** For pages: redirect to /login when signed out. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** For API routes: 401 when signed out, 403 when the role isn't allowed. */
export async function apiUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in.");
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "You don't have permission to do that.");
  return user;
}

export function isStaff(role: Role) {
  return STAFF_ROLES.includes(role);
}

export function avatarUrl(user: { id: string; avatarUpdatedAt: Date | null; googleImageUrl: string | null }) {
  if (user.avatarUpdatedAt) return `/api/users/${user.id}/avatar?v=${user.avatarUpdatedAt.getTime()}`;
  return user.googleImageUrl;
}
