import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userRole } from "@/lib/db/schema";
import { can, type Permission, type RoleGrant } from "./permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  grants: RoleGrant[];
};

/** The signed-in user with their role grants, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const grants = await db
    .select({ role: userRole.role, branchId: userRole.branchId })
    .from(userRole)
    .where(eq(userRole.userId, session.user.id));

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    grants,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Call at the top of every protected page and server action. Layouts alone do
 * not protect a route: they are not re-run on every navigation and server
 * actions can be invoked directly.
 */
export async function requirePermission(permission: Permission, branchId?: number | null) {
  const user = await requireUser();
  if (!can(user.grants, permission, branchId)) redirect("/forbidden");
  return user;
}
