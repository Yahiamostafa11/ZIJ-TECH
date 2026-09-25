import type { Role } from "@/lib/db/schema";

/**
 * Every action the portal checks. Names follow `area.action`.
 * Instructor permissions apply only to the instructor's own groups; that
 * narrowing is enforced in the queries that load group data, not here.
 */
export const PERMISSIONS = [
  // Portals
  "portal.academy",
  "portal.software",
  "portal.iot",
  "portal.instructor",
  // Academy administration
  "academy.overview",
  "leads.read",
  "leads.write",
  "students.read",
  "students.write",
  "students.import",
  "instructors.manage",
  "levels.manage",
  "groups.read",
  "groups.write",
  "sessions.read",
  "attendance.read",
  "grades.read",
  "homework.read",
  "warnings.read",
  "warnings.approve",
  "payments.read",
  "payments.write",
  "payments.void",
  "pricing.manage",
  "finance.reports",
  "followup.read",
  "followup.write",
  "reports.read",
  "branches.manage",
  "inventory.manage",
  "users.manage",
  "audit.read",
  // Instructor portal (own groups only)
  "teaching.attendance",
  "teaching.lessons",
  "teaching.homework",
  "teaching.grades",
  "teaching.behavior",
  "teaching.warnings",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ACADEMY_ADMIN: Permission[] = PERMISSIONS.filter(
  (permission) =>
    permission.startsWith("portal.academy") ||
    !(permission.startsWith("portal.") || permission.startsWith("teaching.")),
);

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  academy_admin: ACADEMY_ADMIN,
  branch_admin: ACADEMY_ADMIN.filter(
    (permission) =>
      ![
        "finance.reports",
        "users.manage",
        "branches.manage",
        "levels.manage",
        "instructors.manage",
        "audit.read",
      ].includes(permission),
  ),
  // Follow-up calls, parent and instructor notes, and recording payments.
  // Voiding a payment stays with admins so one person cannot both take and
  // erase money.
  moderator: [
    "portal.academy",
    "academy.overview",
    "leads.read",
    "leads.write",
    "students.read",
    "groups.read",
    "sessions.read",
    "attendance.read",
    "warnings.read",
    "payments.read",
    "payments.write",
    "followup.read",
    "followup.write",
  ],
  instructor: [
    "portal.instructor",
    "teaching.attendance",
    "teaching.lessons",
    "teaching.homework",
    "teaching.grades",
    "teaching.behavior",
    "teaching.warnings",
  ],
};

export type RoleGrant = { role: Role; branchId: number | null };

/**
 * Whether any of the grants allows the permission. Pass `branchId` to check an
 * action on a specific branch's data; `null` means online (branch-less) data,
 * which only grants without a branch restriction cover.
 */
export function can(
  grants: readonly RoleGrant[],
  permission: Permission,
  branchId?: number | null,
) {
  return grants.some((grant) => {
    if (!ROLE_PERMISSIONS[grant.role].includes(permission)) return false;
    if (branchId === undefined || grant.branchId === null) return true;
    return grant.branchId === branchId;
  });
}

/** Where to send a user after login, based on what they can open. */
export function homePathFor(grants: readonly RoleGrant[]) {
  const portals = [
    can(grants, "portal.academy"),
    can(grants, "portal.software"),
    can(grants, "portal.iot"),
  ].filter(Boolean).length;

  if (portals > 1) return "/admin";
  if (can(grants, "portal.academy")) return "/admin/academy";
  if (can(grants, "portal.software")) return "/admin/software";
  if (can(grants, "portal.iot")) return "/admin/iot";
  if (can(grants, "portal.instructor")) return "/instructor";
  return null;
}
