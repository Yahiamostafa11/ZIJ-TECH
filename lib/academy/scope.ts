import "server-only";
import { and, eq, inArray, isNotNull, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { classGroup, enrollment } from "@/lib/db/academy";
import { can, type Permission } from "@/lib/auth/permissions";
import type { CurrentUser } from "@/lib/auth/session";

/**
 * Which branches' academy data a user may see. Grants without a branch (super
 * admin, academy admin, moderator) see everything, including online groups;
 * branch admins see only their branches' groups and the students in them.
 */
export function branchScope(user: CurrentUser): { all: true } | { all: false; branchIds: number[] } {
  const academyGrants = user.grants.filter((grant) => grant.role !== "instructor");
  if (academyGrants.some((grant) => grant.branchId === null)) return { all: true };
  return {
    all: false,
    branchIds: academyGrants.flatMap((grant) => (grant.branchId === null ? [] : [grant.branchId])),
  };
}

/** WHERE condition limiting class_group rows to the user's scope. */
export function groupScopeCondition(user: CurrentUser): SQL | undefined {
  const scope = branchScope(user);
  if (scope.all) return undefined;
  if (scope.branchIds.length === 0) return sql`false`;
  return and(isNotNull(classGroup.branchId), inArray(classGroup.branchId, scope.branchIds));
}

/** WHERE condition limiting student rows to those enrolled in an in-scope group. */
export function studentScopeCondition(user: CurrentUser, studentId: SQLWrapper): SQL | undefined {
  const scope = branchScope(user);
  if (scope.all) return undefined;
  if (scope.branchIds.length === 0) return sql`false`;
  return sql`exists (select 1 from ${enrollment} inner join ${classGroup} on ${classGroup.id} = ${enrollment.groupId} where ${enrollment.studentId} = ${studentId} and ${inArray(classGroup.branchId, scope.branchIds)})`;
}

/** Loads a group the user may act on with `permission`, or ends the request. */
export async function requireGroup(user: CurrentUser, groupId: number, permission: Permission) {
  const [group] = await db.select().from(classGroup).where(eq(classGroup.id, groupId));
  if (!group) notFound();
  if (!can(user.grants, permission, group.branchId)) redirect("/forbidden");
  return group;
}

/** Ends the request unless the student is within the user's scope. */
export async function requireStudentAccess(user: CurrentUser, studentId: number) {
  const scope = branchScope(user);
  if (scope.all) return;
  const [row] = scope.branchIds.length
    ? await db
        .select({ id: enrollment.id })
        .from(enrollment)
        .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
        .where(and(eq(enrollment.studentId, studentId), inArray(classGroup.branchId, scope.branchIds)))
        .limit(1)
    : [];
  if (!row) redirect("/forbidden");
}
