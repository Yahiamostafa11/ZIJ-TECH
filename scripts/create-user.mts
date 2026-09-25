/**
 * Creates a portal user (or adds a role to an existing one).
 *
 *   npm run user:create -- --email owner@zijtech.com --name "Owner" --role super_admin
 *   npm run user:create -- --email teacher@zijtech.com --name "Teacher" --role instructor
 *   npm run user:create -- --email admin@zijtech.com --name "Admin" --role branch_admin --branch 1
 *
 * A random password is generated and printed once for new users.
 */
import { requireEnv } from "./env.mts";
import { randomBytes, randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ROLES, account, auditLog, user, userRole, type Role } from "../lib/db/schema.ts";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
    branch: { type: "string" },
  },
});

const email = values.email?.trim().toLowerCase();
const role = values.role as Role | undefined;
const branchId = values.branch ? Number(values.branch) : null;

if (!email || !role || !ROLES.includes(role) || (branchId !== null && !Number.isInteger(branchId))) {
  console.error(`Usage: --email <email> --name <name> --role <${ROLES.join("|")}> [--branch <id>]`);
  process.exit(1);
}
if (role === "branch_admin" && branchId === null) {
  console.error("branch_admin requires --branch.");
  process.exit(1);
}

const connection = await mysql.createConnection({ uri: requireEnv("DATABASE_URL") });
const db = drizzle(connection);

try {
  let [existing] = await db.select().from(user).where(eq(user.email, email));
  let password: string | null = null;

  if (!existing) {
    if (!values.name) {
      console.error("--name is required for a new user.");
      process.exit(1);
    }
    const id = randomUUID();
    password = randomBytes(12).toString("base64url");

    await db.transaction(async (tx) => {
      await tx.insert(user).values({ id, name: values.name!, email, emailVerified: true });
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: await hashPassword(password!),
      });
      await tx.insert(auditLog).values({ action: "user.create", entity: "user", entityId: id, details: "cli" });
    });
    [existing] = await db.select().from(user).where(eq(user.id, id));
  }

  const [hasRole] = await db
    .select()
    .from(userRole)
    .where(
      and(
        eq(userRole.userId, existing.id),
        eq(userRole.role, role),
        branchId === null ? isNull(userRole.branchId) : eq(userRole.branchId, branchId),
      ),
    );

  if (!hasRole) {
    await db.insert(userRole).values({ userId: existing.id, role, branchId });
    await db.insert(auditLog).values({
      action: "role.grant",
      entity: "user",
      entityId: existing.id,
      details: JSON.stringify({ role, branchId, via: "cli" }),
    });
  }

  console.log(`User: ${existing.email}`);
  console.log(`Role: ${role}${branchId ? ` (branch ${branchId})` : ""}${hasRole ? " (already granted)" : ""}`);
  if (password) console.log(`Temporary password: ${password}\nShare it privately and change it after first sign-in.`);
} finally {
  await connection.end();
}
