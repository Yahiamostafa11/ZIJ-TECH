/**
 * Deployment setup: applies database migrations, then creates the first
 * super admin from INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD if no super
 * admin exists yet. Safe to run on every deploy.
 *
 * It runs automatically before `npm run build` (npm's prebuild step), so a
 * host whose build command is fixed to `npm run build` still gets it. Without
 * DATABASE_URL it does nothing, so builds without a database still work.
 *
 *   npm run db:setup
 *
 * The first admin must choose a new password at first sign-in. Remove
 * INITIAL_ADMIN_PASSWORD from the hosting panel once you have signed in.
 */
import { requireEnv } from "./env.mts";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { account, auditLog, user, userRole } from "../lib/db/schema.ts";

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL is not set; skipping database setup.");
  process.exit(0);
}

const connection = await mysql.createConnection({ uri: requireEnv("DATABASE_URL") });
const db = drizzle(connection);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const [existingAdmin] = await db.select({ id: userRole.id }).from(userRole).where(eq(userRole.role, "super_admin")).limit(1);

  if (existingAdmin) {
    console.log("A super admin already exists; nothing to create.");
  } else if (!email || !password) {
    console.log("No super admin yet. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to create one.");
  } else if (password.length < 10) {
    console.error("INITIAL_ADMIN_PASSWORD must be at least 10 characters.");
    process.exitCode = 1;
  } else {
    const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    const id = taken?.id ?? randomUUID();
    await db.transaction(async (tx) => {
      if (!taken) {
        await tx.insert(user).values({ id, name: "Super Admin", email, emailVerified: true, mustChangePassword: true });
        await tx.insert(account).values({
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          userId: id,
          password: await hashPassword(password),
        });
      }
      await tx.insert(userRole).values({ userId: id, role: "super_admin", branchId: null });
      await tx.insert(auditLog).values({ action: "user.bootstrap_admin", entity: "user", entityId: id, details: "setup" });
    });
    console.log(`Super admin ready: ${email} (must choose a new password at first sign-in).`);
  }
} finally {
  await connection.end();
}
