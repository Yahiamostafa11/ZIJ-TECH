"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { can, type Permission } from "@/lib/auth/permissions";
import { requirePermission, type CurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  ENROLLMENT_STATUSES,
  GUARDIAN_RELATIONS,
  PAYMENT_METHODS,
  STUDENT_STATUSES,
  enrollment,
  guardian,
  payment,
  student,
} from "@/lib/db/academy";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { todayInCairo, toMoney } from "../format";
import { cleanName, nameKey } from "../normalize";
import { FamilyConflictError, resolveFamily, resolveStudent } from "../people";
import { requireGroup, requireStudentAccess } from "../scope";

const BASE = "/admin/academy";

function isDuplicateKey(error: unknown) {
  return (error as { code?: string })?.code === "ER_DUP_ENTRY" ||
    (error as { cause?: { code?: string } })?.cause?.code === "ER_DUP_ENTRY";
}

/* Enrollment --------------------------------------------------------------- */

const newStudentSchema = z
  .object({
    nameAr: field.text(160),
    nameEn: field.optionalText(160),
    birthDate: field.optionalDate(),
    motherPhone: field.optionalPhone(),
    fatherPhone: field.optionalPhone(),
    price: z.preprocess((value) => (value === "" ? undefined : value), field.amount().optional()),
    discount: z.preprocess((value) => (value === "" ? 0 : value), field.amount()),
  })
  .refine((value) => value.motherPhone || value.fatherPhone, {
    path: ["motherPhone"],
    message: "phoneRequired",
  });

/** Adds a student to a group, creating the family and student when new. */
export async function enrollNewStudent(
  groupId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("students.write");
  const group = await requireGroup(user, groupId, "students.write");
  const parsed = parseForm(newStudentSchema, formData);
  if (!parsed.data) return parsed.state;
  const values = parsed.data;

  const price = values.price ?? Number(group.price);
  const customPrice = toMoney(price) !== Number(group.price) || values.discount > 0;
  if (customPrice && !can(user.grants, "pricing.manage", group.branchId)) {
    return { error: "noPricingPermission" };
  }
  if (values.discount > price) return { error: "checkFields", fieldErrors: { discount: "discountTooHigh" } };

  try {
    await db.transaction(async (tx) => {
      const { familyId } = await resolveFamily(
        tx,
        { mother: values.motherPhone, father: values.fatherPhone },
        values.nameAr,
      );
      const { studentId } = await resolveStudent(tx, familyId, values);
      const [{ id }] = await tx
        .insert(enrollment)
        .values({
          studentId,
          groupId,
          price: price.toFixed(2),
          discount: values.discount.toFixed(2),
        })
        .$returningId();
      await audit(tx, user.id, "enrollment.create", "enrollment", id, { studentId, groupId });
    });
  } catch (error) {
    if (error instanceof FamilyConflictError) return { error: "phonesConflict" };
    if (isDuplicateKey(error)) return { error: "alreadyEnrolled" };
    throw error;
  }

  revalidatePath(`${BASE}/groups/${groupId}`);
  return { ok: true, message: "enrolled" };
}

const existingStudentSchema = z.object({ studentId: field.id() });

export async function enrollExistingStudent(
  groupId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("students.write");
  const group = await requireGroup(user, groupId, "students.write");
  const parsed = parseForm(existingStudentSchema, formData);
  if (!parsed.data) return parsed.state;

  try {
    const [{ id }] = await db
      .insert(enrollment)
      .values({ studentId: parsed.data.studentId, groupId, price: group.price })
      .$returningId();
    await audit(db, user.id, "enrollment.create", "enrollment", id, { ...parsed.data, groupId });
  } catch (error) {
    if (isDuplicateKey(error)) return { error: "alreadyEnrolled" };
    throw error;
  }

  revalidatePath(`${BASE}/groups/${groupId}`);
  return { ok: true, message: "enrolled" };
}

const enrollmentSchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES),
  price: field.amount(),
  discount: field.amount(),
});

export async function updateEnrollment(
  enrollmentId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("students.write");
  const current = await loadEnrollment(user, enrollmentId, "students.write");
  const parsed = parseForm(enrollmentSchema, formData);
  if (!parsed.data) return parsed.state;
  const values = parsed.data;

  const priceChanged =
    toMoney(values.price) !== Number(current.price) || toMoney(values.discount) !== Number(current.discount);
  if (priceChanged && !can(user.grants, "pricing.manage")) {
    return { error: "noPricingPermission" };
  }
  if (values.discount > values.price) return { error: "checkFields", fieldErrors: { discount: "discountTooHigh" } };

  const update = { status: values.status, price: values.price.toFixed(2), discount: values.discount.toFixed(2) };
  await db.update(enrollment).set(update).where(eq(enrollment.id, enrollmentId));
  await audit(db, user.id, "enrollment.update", "enrollment", enrollmentId, {
    before: { status: current.status, price: current.price, discount: current.discount },
    after: update,
  });

  revalidatePath(`${BASE}/students/${current.studentId}`);
  revalidatePath(`${BASE}/groups/${current.groupId}`);
  return { ok: true, message: "saved" };
}

/* Payments ----------------------------------------------------------------- */

const paymentSchema = z.object({
  amount: field.positiveAmount(),
  paidOn: field.date(),
  method: z.enum(PAYMENT_METHODS, "required"),
  reference: field.optionalText(120),
  notes: field.optionalText(500),
});

export async function recordPayment(
  enrollmentId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("payments.write");
  const current = await loadEnrollment(user, enrollmentId, "payments.write");
  const parsed = parseForm(paymentSchema, formData);
  if (!parsed.data) return parsed.state;
  const values = parsed.data;

  if (values.paidOn > todayInCairo()) return { error: "checkFields", fieldErrors: { paidOn: "futureDate" } };

  const result = await db.transaction(async (tx) => {
    // Lock the enrollment so two simultaneous payments cannot both pass the balance check.
    await tx.execute(sql`select id from ${enrollment} where ${enrollment.id} = ${enrollmentId} for update`);
    const [{ paid }] = await tx
      .select({ paid: sql<string>`coalesce(sum(${payment.amount}), 0)` })
      .from(payment)
      .where(and(eq(payment.enrollmentId, enrollmentId), isNull(payment.voidedAt)));
    const balance = toMoney(Number(current.price) - Number(current.discount) - Number(paid));
    if (toMoney(values.amount) > balance) return { balance };

    const [{ id }] = await tx
      .insert(payment)
      .values({ ...values, amount: values.amount.toFixed(2), enrollmentId, receivedBy: user.id })
      .$returningId();
    await audit(tx, user.id, "payment.create", "payment", id, { enrollmentId, amount: values.amount, method: values.method });
    return { id };
  });

  if ("balance" in result) {
    return { error: "exceedsBalance", fieldErrors: { amount: "exceedsBalance" } };
  }

  revalidatePath(`${BASE}/students/${current.studentId}`);
  revalidatePath(`${BASE}/groups/${current.groupId}`);
  return { ok: true, message: "paymentRecorded" };
}

const voidSchema = z.object({ reason: field.text(255) });

export async function voidPayment(
  paymentId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("payments.void");
  const [row] = await db.select().from(payment).where(eq(payment.id, paymentId));
  if (!row || row.voidedAt) return { error: "notFound" };
  const current = await loadEnrollment(user, row.enrollmentId, "payments.void");
  const parsed = parseForm(voidSchema, formData);
  if (!parsed.data) return parsed.state;

  await db
    .update(payment)
    .set({ voidedAt: new Date(), voidedBy: user.id, voidReason: parsed.data.reason })
    .where(eq(payment.id, paymentId));
  await audit(db, user.id, "payment.void", "payment", paymentId, {
    amount: row.amount,
    reason: parsed.data.reason,
  });

  revalidatePath(`${BASE}/students/${current.studentId}`);
  revalidatePath(`${BASE}/groups/${current.groupId}`);
  return { ok: true, message: "paymentVoided" };
}

/* Students and guardians --------------------------------------------------- */

const studentSchema = z.object({
  nameAr: field.text(160),
  nameEn: field.optionalText(160),
  birthDate: field.optionalDate(),
  school: field.optionalText(160),
  notes: field.optionalText(2000),
  status: z.enum(STUDENT_STATUSES),
  photoConsent: field.checkbox(),
});

export async function updateStudent(
  studentId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("students.write");
  await requireStudentAccess(user, studentId);
  const parsed = parseForm(studentSchema, formData);
  if (!parsed.data) return parsed.state;

  const nameAr = cleanName(parsed.data.nameAr);
  const values = { ...parsed.data, nameAr, nameKey: nameKey(nameAr) };
  await db.update(student).set(values).where(eq(student.id, studentId));
  await audit(db, user.id, "student.update", "student", studentId, values);

  revalidatePath(`${BASE}/students/${studentId}`);
  return { ok: true, message: "saved" };
}

const guardianSchema = z.object({
  id: field.optionalId(),
  relation: z.enum(GUARDIAN_RELATIONS),
  name: field.optionalText(160),
  phone: field.phone(),
});

export async function saveGuardian(
  studentId: number,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("students.write");
  await requireStudentAccess(user, studentId);
  const parsed = parseForm(guardianSchema, formData);
  if (!parsed.data) return parsed.state;
  const { id, ...values } = parsed.data;

  const [owner] = await db.select({ familyId: student.familyId }).from(student).where(eq(student.id, studentId));
  if (!owner) return { error: "notFound" };

  try {
    if (id) {
      const result = await db
        .update(guardian)
        .set(values)
        .where(and(eq(guardian.id, id), eq(guardian.familyId, owner.familyId)));
      if (!result[0].affectedRows) return { error: "notFound" };
    } else {
      await db.insert(guardian).values({ ...values, familyId: owner.familyId });
    }
  } catch (error) {
    if (isDuplicateKey(error)) return { error: "checkFields", fieldErrors: { phone: "phoneTaken" } };
    throw error;
  }
  await audit(db, user.id, id ? "guardian.update" : "guardian.create", "family", owner.familyId, values);

  revalidatePath(`${BASE}/students/${studentId}`);
  return { ok: true, message: "saved" };
}

export async function removeGuardian(studentId: number, guardianId: number): Promise<ActionState> {
  const user = await requirePermission("students.write");
  await requireStudentAccess(user, studentId);
  const [owner] = await db.select({ familyId: student.familyId }).from(student).where(eq(student.id, studentId));
  if (!owner) return { error: "notFound" };

  const [remaining] = await db
    .select({ count: sql<number>`count(*)` })
    .from(guardian)
    .where(and(eq(guardian.familyId, owner.familyId), ne(guardian.id, guardianId)));
  if (Number(remaining.count) === 0) return { error: "lastGuardian" };

  await db.delete(guardian).where(and(eq(guardian.id, guardianId), eq(guardian.familyId, owner.familyId)));
  await audit(db, user.id, "guardian.delete", "family", owner.familyId, { guardianId });
  revalidatePath(`${BASE}/students/${studentId}`);
  return { ok: true, message: "saved" };
}

/* Helpers ------------------------------------------------------------------ */

async function loadEnrollment(user: CurrentUser, enrollmentId: number, permission: Permission) {
  const [row] = await db.select().from(enrollment).where(eq(enrollment.id, enrollmentId));
  if (!row) redirect("/forbidden");
  await requireGroup(user, row.groupId, permission);
  return row;
}

