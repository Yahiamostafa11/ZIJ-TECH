import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user as userTable, userRole } from "@/lib/db/schema";
import { can, type Permission, type RoleGrant } from "./permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  nameAr: string | null;
  nameEn: string | null;
  nameEditsUsed: number;
  mustChangePassword: boolean;
  grants: RoleGrant[];
};

/** The signed-in user with their role grants, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Use the live cookie jar, not the original request header: a server action
  // that rotates the session (e.g. password change) re-renders in the same
  // request, and the stale header would look signed out.
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("cookie", (await cookies()).toString());
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const [[account], grants] = await Promise.all([
    db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        username: userTable.username,
        nameAr: userTable.nameAr,
        nameEn: userTable.nameEn,
        nameEditsUsed: userTable.nameEditsUsed,
        mustChangePassword: userTable.mustChangePassword,
      })
      .from(userTable)
      .where(eq(userTable.id, session.user.id)),
    db
      .select({ role: userRole.role, branchId: userRole.branchId })
      .from(userRole)
      .where(eq(userRole.userId, session.user.id)),
  ]);
  if (!account) return null;

  return { ...account, grants };
});

/**
 * The signed-in user, or a redirect to /login. Accounts still on a temporary
 * password are sent to /account to choose their own first; only the account
 * page opts out with `allowTemporaryPassword`.
 */
export async function requireUser({ allowTemporaryPassword = false } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !allowTemporaryPassword) redirect("/account");
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
