"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ROLES, account, branch, session, user, userRole, type Role } from "@/lib/db/schema";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { requirePermission, type CurrentUser } from "./session";

const USERS_PATH = "/admin/academy/users";

/** Roles each actor may grant or revoke. Only the owner manages admins. */
function grantableRoles(actor: CurrentUser): Role[] {
  if (actor.grants.some((grant) => grant.role === "super_admin")) return [...ROLES];
  return ["branch_admin", "moderator", "instructor"];
}

async function rolesOf(userId: string) {
  return db.select().from(userRole).where(eq(userRole.userId, userId));
}

function temporaryPassword() {
  return randomBytes(12).toString("base64url");
}

/** Whether the actor may manage this account (not someone above them). */
async function canManage(actor: CurrentUser, targetId: string) {
  const allowed = grantableRoles(actor);
  const roles = await rolesOf(targetId);
  return roles.every((grant) => allowed.includes(grant.role));
}

const roleSchema = z
  .object({
    role: z.enum(ROLES, "required"),
    branchId: field.optionalId(),
  })
  .refine((value) => value.role !== "branch_admin" || value.branchId !== null, {
    path: ["branchId"],
    message: "branchRequired",
  });

const createSchema = z.object({ name: field.text(255), email: z.email("invalidEmail").max(255) });

export type CreateUserState = ActionState & { password?: string; email?: string };

export async function createUser(_: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const actor = await requirePermission("users.manage");
  const parsedUser = parseForm(createSchema, formData);
  const parsedRole = parseForm(roleSchema, formData);
  if (!parsedUser.data || !parsedRole.data) {
    return {
      error: "checkFields",
      fieldErrors: { ...parsedUser.state?.fieldErrors, ...parsedRole.state?.fieldErrors },
    };
  }
  const { role, branchId } = parsedRole.data;
  if (!grantableRoles(actor).includes(role)) return { error: "cannotGrantRole" };

  const email = parsedUser.data.email.toLowerCase();
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing) return { error: "checkFields", fieldErrors: { email: "emailTaken" } };

  const id = randomUUID();
  const password = temporaryPassword();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, name: parsedUser.data.name, email, emailVerified: true });
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(password),
    });
    await tx.insert(userRole).values({ userId: id, role, branchId: role === "branch_admin" ? branchId : null });
    await audit(tx, actor.id, "user.create", "user", id, { email, role, branchId });
  });

  revalidatePath(USERS_PATH);
  return { ok: true, message: "userCreated", password, email };
}

export async function grantRole(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("users.manage");
  const parsed = parseForm(roleSchema, formData);
  if (!parsed.data) return parsed.state;
  const { role } = parsed.data;
  const branchId = role === "branch_admin" ? parsed.data.branchId : null;
  if (!grantableRoles(actor).includes(role) || !(await canManage(actor, userId))) {
    return { error: "cannotGrantRole" };
  }
  if (branchId !== null) {
    const [exists] = await db.select({ id: branch.id }).from(branch).where(eq(branch.id, branchId));
    if (!exists) return { error: "checkFields", fieldErrors: { branchId: "invalid" } };
  }

  const [duplicate] = await db
    .select({ id: userRole.id })
    .from(userRole)
    .where(
      and(
        eq(userRole.userId, userId),
        eq(userRole.role, role),
        branchId === null ? isNull(userRole.branchId) : eq(userRole.branchId, branchId),
      ),
    );
  if (!duplicate) {
    await db.insert(userRole).values({ userId, role, branchId });
    await audit(db, actor.id, "role.grant", "user", userId, { role, branchId });
  }

  revalidatePath(USERS_PATH);
  return { ok: true, message: "saved" };
}

export async function revokeRole(roleId: number): Promise<ActionState> {
  const actor = await requirePermission("users.manage");
  const [grant] = await db.select().from(userRole).where(eq(userRole.id, roleId));
  if (!grant) return { error: "notFound" };
  if (!grantableRoles(actor).includes(grant.role) || !(await canManage(actor, grant.userId))) {
    return { error: "cannotGrantRole" };
  }
  if (grant.userId === actor.id && grant.role === "super_admin") return { error: "cannotRevokeSelf" };

  await db.delete(userRole).where(eq(userRole.id, roleId));
  await audit(db, actor.id, "role.revoke", "user", grant.userId, { role: grant.role, branchId: grant.branchId });
  revalidatePath(USERS_PATH);
  return { ok: true, message: "saved" };
}

export type ResetPasswordState = ActionState & { password?: string };

export async function resetPassword(userId: string): Promise<ResetPasswordState> {
  const actor = await requirePermission("users.manage");
  if (userId === actor.id) return { error: "useAccountPage" };
  if (!(await canManage(actor, userId))) return { error: "cannotGrantRole" };

  const password = temporaryPassword();
  await db.transaction(async (tx) => {
    await tx
      .update(account)
      .set({ password: await hashPassword(password) })
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    // Sign the user out everywhere so the old password stops working immediately.
    await tx.delete(session).where(eq(session.userId, userId));
    await audit(tx, actor.id, "user.reset_password", "user", userId);
  });

  return { ok: true, message: "passwordReset", password };
}
