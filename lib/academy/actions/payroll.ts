"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/db/academy";
import { ADJUSTMENT_KINDS, payrollAdjustment, payrollPayment } from "@/lib/db/teaching";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { todayInCairo } from "../format";
import { MONTH, getMonthStatement } from "../payroll";

function refresh(instructorId: string) {
  revalidatePath("/admin/academy/payroll");
  revalidatePath(`/admin/academy/payroll/${instructorId}`);
  revalidatePath("/instructor/payroll");
  revalidatePath("/instructor");
}

const adjustmentSchema = z.object({
  kind: z.enum(ADJUSTMENT_KINDS, "required"),
  amount: field.positiveAmount(),
  reason: field.text(255),
});

export async function addAdjustment(instructorId: string, month: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payroll.manage");
  if (!MONTH.test(month)) return { error: "invalid" };
  const parsed = parseForm(adjustmentSchema, formData);
  if (!parsed.data) return parsed.state;

  const [{ id }] = await db
    .insert(payrollAdjustment)
    .values({ instructorId, month, kind: parsed.data.kind, amount: parsed.data.amount.toFixed(2), reason: parsed.data.reason, createdBy: user.id })
    .$returningId();
  await audit(db, user.id, `payroll.${parsed.data.kind}`, "payroll_adjustment", id, { instructorId, month, ...parsed.data });
  refresh(instructorId);
  return { ok: true, message: "saved" };
}

export async function removeAdjustment(adjustmentId: number): Promise<void> {
  const user = await requirePermission("payroll.manage");
  const [row] = await db.select().from(payrollAdjustment).where(eq(payrollAdjustment.id, adjustmentId));
  if (!row) return;
  await db.delete(payrollAdjustment).where(eq(payrollAdjustment.id, adjustmentId));
  await audit(db, user.id, "payroll.adjustment_remove", "payroll_adjustment", adjustmentId, {
    instructorId: row.instructorId,
    month: row.month,
    kind: row.kind,
    amount: row.amount,
    reason: row.reason,
  });
  refresh(row.instructorId);
}

const paymentSchema = z.object({
  amount: field.positiveAmount(),
  method: z.enum(PAYMENT_METHODS, "required"),
  reference: field.optionalText(120),
  paidOn: field.date(),
  notes: field.optionalText(500),
});

/** Records a transfer to an instructor; it becomes a numbered receipt. */
export async function recordPayrollPayment(instructorId: string, month: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payroll.manage");
  if (!MONTH.test(month)) return { error: "invalid" };
  const parsed = parseForm(paymentSchema, formData);
  if (!parsed.data) return parsed.state;
  if (parsed.data.paidOn > todayInCairo()) return { error: "checkFields", fieldErrors: { paidOn: "futureDate" } };

  const statement = await getMonthStatement(instructorId, month);
  if (parsed.data.amount > statement.totals.remaining + 0.001) {
    return { error: "checkFields", fieldErrors: { amount: "exceedsBalance" } };
  }

  const [{ id }] = await db
    .insert(payrollPayment)
    .values({
      instructorId,
      month,
      ...parsed.data,
      amount: parsed.data.amount.toFixed(2),
      sessionsAmount: statement.totals.sessionsAmount.toFixed(2),
      bonuses: statement.totals.bonuses.toFixed(2),
      deductions: statement.totals.deductions.toFixed(2),
      paidBefore: statement.totals.paid.toFixed(2),
      createdBy: user.id,
    })
    .$returningId();
  await audit(db, user.id, "payroll.payment", "payroll_payment", id, { instructorId, month, amount: parsed.data.amount });
  refresh(instructorId);
  return { ok: true, message: "payrollPaid" };
}

const voidSchema = z.object({ reason: field.text(255) });

export async function voidPayrollPayment(paymentId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("payroll.manage");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.data) return parsed.state;
  const [row] = await db.select().from(payrollPayment).where(eq(payrollPayment.id, paymentId));
  if (!row) return { error: "notFound" };

  await db
    .update(payrollPayment)
    .set({ voidedAt: new Date(), voidedBy: user.id, voidReason: parsed.data.reason })
    .where(and(eq(payrollPayment.id, paymentId), isNull(payrollPayment.voidedAt)));
  await audit(db, user.id, "payroll.payment_void", "payroll_payment", paymentId, { reason: parsed.data.reason });
  refresh(row.instructorId);
  return { ok: true, message: "paymentVoided" };
}
