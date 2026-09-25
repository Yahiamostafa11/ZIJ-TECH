import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { emailChange, user } from "@/lib/db/schema";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Called by /account/verify-email. Returns whether the email was confirmed. */
export async function confirmEmailToken(token: string) {
  if (!/^[\w-]{20,}$/.test(token)) return false;
  const [pending] = await db.select().from(emailChange).where(eq(emailChange.tokenHash, hashToken(token)));
  if (!pending || pending.expiresAt < new Date()) return false;

  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, pending.email));
  if (taken && taken.id !== pending.userId) return false;

  await db.transaction(async (tx) => {
    await tx.update(user).set({ email: pending.email, emailVerified: true }).where(eq(user.id, pending.userId));
    await tx.delete(emailChange).where(eq(emailChange.userId, pending.userId));
    await audit(tx, pending.userId, "user.email_verified", "user", pending.userId, { email: pending.email });
  });
  return true;
}

