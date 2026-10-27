"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { enrollment } from "@/lib/db/academy";
import {
  ATTENDANCE_STATUSES,
  CRITERIA,
  attendance,
  classSession,
  instructorRate,
  studentRequest,
} from "@/lib/db/teaching";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { FamilyConflictError, resolveFamily, resolveStudent } from "../people";
import { requireGroup } from "../scope";
import { rateFor, requireTeachingGroup, requireTeachingSession, sessionStarted } from "../teaching";
import { cairoParts, cairoToUtc } from "../time";

const INSTRUCTOR = "/instructor";

/* Attendance and evaluation ------------------------------------------------ */

const score = z.number().int().min(1).max(4).nullable();
const sheetSchema = z
  .array(
    z.object({
      studentId: z.number().int().positive(),
      status: z.enum(ATTENDANCE_STATUSES),
      note: z.string().trim().max(500).nullable(),
      scores: z.object(Object.fromEntries(CRITERIA.map((criterion) => [criterion, score])) as Record<(typeof CRITERIA)[number], typeof score>),
    }),
  )
  .min(1)
  .max(60);

/**
 * Saves the attendance sheet. The first save marks the session held and
 * credits it, at the instructor's current rate, to whoever saved it.
 */
export async function saveAttendance(sessionId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.attendance");
  const { session, group } = await requireTeachingSession(user, sessionId);
  if (session.status === "cancelled") return { error: "sessionCancelled" };
  if (!sessionStarted(session.scheduledAt)) return { error: "sessionNotStarted" };

  let rows: z.infer<typeof sheetSchema>;
  try {
    const parsed = sheetSchema.safeParse(JSON.parse(String(formData.get("sheet") ?? "[]")));
    if (!parsed.success) return { error: "checkFields" };
    rows = parsed.data;
  } catch {
    return { error: "checkFields" };
  }

  // Only students enrolled in this group, or already on this sheet, may be marked.
  const ids = rows.map((row) => row.studentId);
  const allowed = new Set(
    (
      await db
        .select({ studentId: enrollment.studentId })
        .from(enrollment)
        .where(and(eq(enrollment.groupId, group.id), inArray(enrollment.studentId, ids)))
    ).map((row) => row.studentId),
  );
  if (ids.some((id) => !allowed.has(id))) return { error: "checkFields" };

  const rate = session.status === "held" ? null : await rateFor(user.id, group.mode);

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const scored = row.status === "present" || row.status === "late";
      const scores = Object.fromEntries(CRITERIA.map((criterion) => [criterion, scored ? row.scores[criterion] : null]));
      const values = { status: row.status, note: row.note || null, recordedBy: user.id, ...scores };
      await tx
        .insert(attendance)
        .values({ sessionId, studentId: row.studentId, ...values })
        .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
    }
    if (rate !== null) {
      await tx
        .update(classSession)
        .set({ status: "held", heldAt: new Date(), heldBy: user.id, heldMode: group.mode, rate: rate.toFixed(2) })
        .where(eq(classSession.id, sessionId));
    }
    await audit(tx, user.id, rate === null ? "attendance.update" : "attendance.create", "session", sessionId, {
      groupId: group.id,
      absent: rows.filter((row) => row.status === "absent").map((row) => row.studentId),
    });
  });

  revalidatePath(`${INSTRUCTOR}/sessions/${sessionId}`);
  revalidatePath(`${INSTRUCTOR}/groups/${group.id}`);
  revalidatePath(INSTRUCTOR);
  return { ok: true, message: "attendanceSaved" };
}

/* Postponing --------------------------------------------------------------- */

const postponeSchema = z.object({
  date: field.date(),
  time: z.string("required").regex(/^\d{2}:\d{2}$/, "invalid"),
  reason: field.text(255),
});

/** Moves a session that has not been held to a new Cairo date and time. */
export async function postponeSession(sessionId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.attendance");
  const { session, group } = await requireTeachingSession(user, sessionId);
  if (session.status !== "scheduled") return { error: "sessionAlreadyHeld" };

  const parsed = parseForm(postponeSchema, formData);
  if (!parsed.data) return parsed.state;
  const scheduledAt = cairoToUtc(parsed.data.date, parsed.data.time);
  if (cairoParts(scheduledAt).date < cairoParts(new Date()).date) {
    return { error: "checkFields", fieldErrors: { date: "dateInPast" } };
  }

  await db
    .update(classSession)
    .set({
      scheduledAt,
      originalScheduledAt: session.originalScheduledAt ?? session.scheduledAt,
      postponeReason: parsed.data.reason,
    })
    .where(eq(classSession.id, sessionId));
  await audit(db, user.id, "session.postpone", "session", sessionId, {
    groupId: group.id,
    from: session.scheduledAt.toISOString(),
    to: scheduledAt.toISOString(),
    reason: parsed.data.reason,
  });

  revalidatePath(`${INSTRUCTOR}/sessions/${sessionId}`);
  revalidatePath(`${INSTRUCTOR}/groups/${group.id}`);
  revalidatePath(INSTRUCTOR);
  return { ok: true, message: "sessionPostponed" };
}

/* Add-student requests ----------------------------------------------------- */

const requestSchema = z
  .object({
    nameAr: field.text(160),
    nameEn: field.optionalText(160),
    birthDate: field.optionalDate(),
    motherPhone: field.optionalPhone(),
    fatherPhone: field.optionalPhone(),
    notes: field.optionalText(1000),
  })
  .refine((value) => value.motherPhone || value.fatherPhone, { path: ["motherPhone"], message: "phoneRequired" });

/** An instructor asks the academy to add a student to one of their groups. */
export async function requestStudent(groupId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("portal.instructor");
  await requireTeachingGroup(user, groupId);
  const parsed = parseForm(requestSchema, formData);
  if (!parsed.data) return parsed.state;

  const [{ id }] = await db
    .insert(studentRequest)
    .values({ groupId, requestedBy: user.id, ...parsed.data })
    .$returningId();
  await audit(db, user.id, "student_request.create", "student_request", id, { groupId });

  revalidatePath(`${INSTRUCTOR}/groups/${groupId}`);
  revalidatePath("/admin/academy/requests");
  return { ok: true, message: "requestSent" };
}

const reviewSchema = z.object({ note: field.optionalText(255) });

/**
 * Approving creates or matches the family and student and enrolls them at the
 * group's price; the instructor then sees the student on their sheets.
 */
export async function reviewStudentRequest(
  requestId: number,
  decision: "approved" | "rejected",
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requirePermission("students.write");
  const [request] = await db.select().from(studentRequest).where(eq(studentRequest.id, requestId));
  if (!request) return { error: "notFound" };
  if (request.status !== "pending") return { error: "alreadyReviewed" };
  const group = await requireGroup(user, request.groupId, "students.write");
  const parsed = parseForm(reviewSchema, formData);
  if (!parsed.data) return parsed.state;

  try {
    await db.transaction(async (tx) => {
      let studentId: number | null = null;
      if (decision === "approved") {
        const { familyId } = await resolveFamily(tx, { mother: request.motherPhone, father: request.fatherPhone }, request.nameAr);
        ({ studentId } = await resolveStudent(tx, familyId, {
          nameAr: request.nameAr,
          nameEn: request.nameEn,
          birthDate: request.birthDate,
          notes: request.notes,
        }));
        await tx
          .insert(enrollment)
          .values({ studentId, groupId: group.id, price: group.price })
          .onDuplicateKeyUpdate({ set: { status: "active" } });
      }
      // Guard against a second reviewer racing this one.
      const [result] = await tx
        .update(studentRequest)
        .set({ status: decision, reviewedBy: user.id, reviewedAt: new Date(), reviewNote: parsed.data.note, studentId })
        .where(and(eq(studentRequest.id, requestId), eq(studentRequest.status, "pending")));
      if (result.affectedRows !== 1) throw new Error("already reviewed");
      await audit(tx, user.id, `student_request.${decision}`, "student_request", requestId, { groupId: group.id, studentId });
    });
  } catch (error) {
    if (error instanceof FamilyConflictError) return { error: "phonesConflict" };
    if (error instanceof Error && error.message === "already reviewed") return { error: "alreadyReviewed" };
    throw error;
  }

  revalidatePath("/admin/academy/requests");
  revalidatePath(`/admin/academy/groups/${group.id}`);
  revalidatePath(`${INSTRUCTOR}/groups/${group.id}`);
  return { ok: true, message: decision === "approved" ? "requestApproved" : "requestRejected" };
}

/* Pay rates ---------------------------------------------------------------- */

const rateSchema = z.object({ rateOffline: field.positiveAmount(), rateOnline: field.positiveAmount() });

export async function saveInstructorRate(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("instructors.manage");
  if (!can(user.grants, "pricing.manage")) return { error: "noPricingPermission" };
  const parsed = parseForm(rateSchema, formData);
  if (!parsed.data) return parsed.state;
  const values = { rateOffline: parsed.data.rateOffline.toFixed(2), rateOnline: parsed.data.rateOnline.toFixed(2) };

  await db
    .insert(instructorRate)
    .values({ userId, ...values })
    .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  await audit(db, user.id, "instructor.rate", "user", userId, values);

  revalidatePath("/admin/academy/instructors");
  return { ok: true, message: "saved" };
}
