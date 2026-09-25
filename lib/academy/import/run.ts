import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { classGroup, enrollment, importBatch, payment } from "@/lib/db/academy";
import { todayInCairo, toMoney } from "../format";
import { FamilyConflictError, resolveFamily, resolveStudent } from "../people";
import type { ParsedSheet, RowIssue } from "./parse";

export type RowOutcome = {
  rowNumber: number;
  nameAr: string;
  status: "created" | "updated" | "unchanged" | "skipped";
  /** New/existing student and enrollment, for display. */
  studentCreated?: boolean;
  enrollmentCreated?: boolean;
  paymentAdded?: number;
  errors: RowIssue[];
  warnings: RowIssue[];
};

export type SheetResult = {
  sheet: string;
  groupId: number;
  groupName: string;
  rows: RowOutcome[];
  totals: {
    studentsCreated: number;
    familiesCreated: number;
    enrollmentsCreated: number;
    paymentsCreated: number;
    paymentsAmount: number;
    skipped: number;
  };
};

class DryRunRollback extends Error {}

/**
 * Imports sheets into their mapped groups. Idempotent: re-importing the same
 * sheet matches families by phone and students by name, skips existing
 * enrollments, and only records the difference between the sheet's "paid"
 * and what is already on file.
 */
export async function runImport({
  sheets,
  mapping,
  actorId,
  fileName,
  dryRun,
}: {
  sheets: ParsedSheet[];
  mapping: Record<string, number>;
  actorId: string;
  fileName: string;
  dryRun: boolean;
}): Promise<SheetResult[]> {
  let results: SheetResult[] = [];
  const today = todayInCairo();

  try {
    await db.transaction(async (tx) => {
      results = [];
      for (const sheet of sheets) {
        const groupId = mapping[sheet.name];
        if (!groupId) continue;
        const [group] = await tx.select().from(classGroup).where(eq(classGroup.id, groupId));
        if (!group) continue;

        const result: SheetResult = {
          sheet: sheet.name,
          groupId,
          groupName: group.name,
          rows: [],
          totals: {
            studentsCreated: 0,
            familiesCreated: 0,
            enrollmentsCreated: 0,
            paymentsCreated: 0,
            paymentsAmount: 0,
            skipped: 0,
          },
        };

        for (const row of sheet.rows) {
          const outcome: RowOutcome = {
            rowNumber: row.rowNumber,
            nameAr: row.nameAr,
            status: "unchanged",
            errors: [...row.errors],
            warnings: [...row.warnings],
          };
          result.rows.push(outcome);

          if (outcome.errors.length) {
            outcome.status = "skipped";
            result.totals.skipped += 1;
            continue;
          }

          let familyId: number;
          try {
            const family = await resolveFamily(tx, { mother: row.motherPhone, father: row.fatherPhone }, row.nameAr);
            familyId = family.familyId;
            if (family.created) result.totals.familiesCreated += 1;
          } catch (error) {
            if (!(error instanceof FamilyConflictError)) throw error;
            outcome.errors.push({ code: "phonesConflict" });
            outcome.status = "skipped";
            result.totals.skipped += 1;
            continue;
          }

          const { studentId, created: studentCreated } = await resolveStudent(tx, familyId, {
            nameAr: row.nameAr,
            birthYear: row.birthYear,
            notes: row.notes,
          });
          outcome.studentCreated = studentCreated;
          if (studentCreated) result.totals.studentsCreated += 1;

          let [existing] = await tx
            .select()
            .from(enrollment)
            .where(and(eq(enrollment.studentId, studentId), eq(enrollment.groupId, groupId)));
          if (!existing) {
            const price = (row.price ?? Number(group.price)).toFixed(2);
            const [{ id }] = await tx.insert(enrollment).values({ studentId, groupId, price }).$returningId();
            [existing] = await tx.select().from(enrollment).where(eq(enrollment.id, id));
            outcome.enrollmentCreated = true;
            result.totals.enrollmentsCreated += 1;
            if (row.price === null) outcome.warnings.push({ code: "usedGroupPrice" });
          } else if (row.price !== null && toMoney(row.price) !== Number(existing.price)) {
            outcome.warnings.push({ code: "priceDiffers", value: existing.price });
          }

          const [{ paid }] = await tx
            .select({ paid: sql<string>`coalesce(sum(${payment.amount}), 0)` })
            .from(payment)
            .where(and(eq(payment.enrollmentId, existing.id), isNull(payment.voidedAt)));
          const difference = toMoney((row.paid ?? 0) - Number(paid));

          if (difference > 0) {
            await tx.insert(payment).values({
              enrollmentId: existing.id,
              amount: difference.toFixed(2),
              paidOn: row.paidOn && row.paidOn <= today ? row.paidOn : today,
              method: "other",
              source: "import",
              notes: `Excel: ${fileName} / ${sheet.name} / row ${row.rowNumber}`,
              receivedBy: actorId,
            });
            outcome.paymentAdded = difference;
            result.totals.paymentsCreated += 1;
            result.totals.paymentsAmount = toMoney(result.totals.paymentsAmount + difference);
          } else if (difference < 0) {
            outcome.warnings.push({ code: "excelPaidLess", value: String(toMoney(Number(paid))) });
          }

          outcome.status = studentCreated || outcome.enrollmentCreated ? "created" : outcome.paymentAdded ? "updated" : "unchanged";
        }

        results.push(result);
      }

      if (dryRun) throw new DryRunRollback();

      const [{ id }] = await tx
        .insert(importBatch)
        .values({
          fileName,
          createdBy: actorId,
          summary: JSON.stringify(results.map(({ rows, ...rest }) => ({ ...rest, rows: rows.length }))),
        })
        .$returningId();
      await audit(tx, actorId, "import.commit", "import_batch", id, { fileName, sheets: results.length });
    });
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }

  return results;
}
