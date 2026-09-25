import "server-only";
import { eq } from "drizzle-orm";
import { nameKey } from "@/lib/academy/normalize";
import type { db } from "@/lib/db";
import { guardian, student } from "@/lib/db/academy";
import { user } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Sets an account's Arabic/English name and keeps the linked student or
 * parent record in step, so certificates and rosters show the same name.
 */
export async function applyName(tx: Tx, userId: string, nameAr: string, nameEn: string | null) {
  const cleanAr = nameAr.replace(/\s+/g, " ").trim();
  const cleanEn = nameEn?.replace(/\s+/g, " ").trim() || null;
  await tx.update(user).set({ nameAr: cleanAr, nameEn: cleanEn, name: cleanAr }).where(eq(user.id, userId));
  await tx
    .update(student)
    .set({ nameAr: cleanAr, nameEn: cleanEn, nameKey: nameKey(cleanAr) })
    .where(eq(student.userId, userId));
  await tx.update(guardian).set({ name: cleanAr }).where(eq(guardian.userId, userId));
}
