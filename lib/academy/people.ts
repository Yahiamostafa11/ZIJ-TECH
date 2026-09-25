import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { db } from "@/lib/db";
import { family, guardian, student } from "@/lib/db/academy";
import { cleanName, familyNameFrom, nameKey } from "./normalize";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class FamilyConflictError extends Error {
  constructor() {
    super("Guardian phones belong to different families.");
  }
}

/**
 * Finds the family that owns any of the given phones, or creates one. Phones
 * not yet on file are added to the family. Throws FamilyConflictError when the
 * phones already belong to two different families.
 */
export async function resolveFamily(
  tx: Tx,
  phones: { mother: string | null; father: string | null },
  studentName: string,
  names: { mother?: string | null; father?: string | null } = {},
) {
  const entries = (["mother", "father"] as const)
    .map((relation) => ({ relation, phone: phones[relation] }))
    .filter((entry): entry is { relation: "mother" | "father"; phone: string } => Boolean(entry.phone));

  const existing = entries.length
    ? await tx
        .select({ id: guardian.id, familyId: guardian.familyId, phone: guardian.phone, name: guardian.name })
        .from(guardian)
        .where(inArray(guardian.phone, entries.map((entry) => entry.phone)))
    : [];

  const familyIds = [...new Set(existing.map((row) => row.familyId))];
  if (familyIds.length > 1) throw new FamilyConflictError();

  let familyId = familyIds[0];
  let created = false;
  if (!familyId) {
    [{ id: familyId }] = await tx
      .insert(family)
      .values({ name: familyNameFrom(studentName) })
      .$returningId();
    created = true;
  }

  const known = new Set(existing.map((row) => row.phone));
  const missing = entries.filter((entry) => !known.has(entry.phone));
  if (missing.length) {
    await tx
      .insert(guardian)
      .values(missing.map((entry) => ({ ...entry, familyId, name: names[entry.relation] || null })));
  }

  // Fill in a parent's name the first time we learn it; never overwrite one.
  for (const entry of entries) {
    const row = existing.find((item) => item.phone === entry.phone);
    const name = names[entry.relation];
    if (row && !row.name && name) await tx.update(guardian).set({ name }).where(eq(guardian.id, row.id));
  }

  return { familyId, created };
}

/** Finds a student in the family by normalised name, or creates one. */
export async function resolveStudent(
  tx: Tx,
  familyId: number,
  values: { nameAr: string; nameEn?: string | null; birthDate?: string | null; birthYear?: number | null; notes?: string | null },
) {
  const nameAr = cleanName(values.nameAr);
  const key = nameKey(nameAr);
  const [match] = await tx
    .select({ id: student.id, birthDate: student.birthDate, birthYear: student.birthYear })
    .from(student)
    .where(and(eq(student.familyId, familyId), eq(student.nameKey, key)));

  if (match) {
    // Fill gaps only; never overwrite what staff already corrected.
    const patch: Partial<typeof student.$inferInsert> = {};
    if (!match.birthDate && values.birthDate) patch.birthDate = values.birthDate;
    if (!match.birthDate && !match.birthYear && values.birthYear) patch.birthYear = values.birthYear;
    if (Object.keys(patch).length) await tx.update(student).set(patch).where(eq(student.id, match.id));
    return { studentId: match.id, created: false };
  }

  const [{ id }] = await tx
    .insert(student)
    .values({
      familyId,
      nameAr,
      nameKey: key,
      nameEn: values.nameEn ?? null,
      birthDate: values.birthDate ?? null,
      birthYear: values.birthYear ?? null,
      notes: values.notes ?? null,
    })
    .$returningId();
  return { studentId: id, created: true };
}
