"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { enrollment, groupSlot } from "@/lib/db/academy";
import {
  certificate,
  classSession,
  groupGrading,
  instructorCertificate,
  projectScore,
  remedialStudent,
} from "@/lib/db/teaching";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { COMPONENTS, allSessionsHeld, getGroupResults } from "../grading";
import { requireTeachingGroup } from "../teaching";
import { addDays, cairoToUtc } from "../time";

function refresh(groupId: number) {
  revalidatePath(`/instructor/groups/${groupId}/grades`);
  revalidatePath(`/instructor/groups/${groupId}`);
  revalidatePath("/instructor/certificates");
}

const weight = () => field.int(0, 100);
const gradingSchema = z.object({
  sessions: weight(),
  attendance: weight(),
  quizzes: weight(),
  assignments: weight(),
  project: weight(),
  passMark: field.int(1, 100),
});

export async function saveGrading(groupId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.grades");
  await requireTeachingGroup(user, groupId);
  const parsed = parseForm(gradingSchema, formData);
  if (!parsed.data) return parsed.state;
  const sum = COMPONENTS.reduce((total, key) => total + parsed.data[key], 0);
  if (sum !== 100) return { error: "weightsSum" };

  await db
    .insert(groupGrading)
    .values({ groupId, ...parsed.data, updatedBy: user.id })
    .onDuplicateKeyUpdate({ set: { ...parsed.data, updatedBy: user.id, updatedAt: new Date() } });
  await audit(db, user.id, "grading.save", "group", groupId, parsed.data);
  refresh(groupId);
  return { ok: true, message: "saved" };
}

const projectSchema = z.object({ score: field.amount(), note: field.optionalText(500) });

export async function saveProjectScore(groupId: number, studentId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.grades");
  await requireTeachingGroup(user, groupId);
  const parsed = parseForm(projectSchema, formData);
  if (!parsed.data) return parsed.state;
  if (parsed.data.score > 100) return { error: "checkFields", fieldErrors: { score: "outOfRange" } };
  const [enrolled] = await db.select({ id: enrollment.id }).from(enrollment).where(and(eq(enrollment.groupId, groupId), eq(enrollment.studentId, studentId)));
  if (!enrolled) return { error: "notFound" };

  const values = { score: parsed.data.score.toFixed(2), note: parsed.data.note };
  await db
    .insert(projectScore)
    .values({ groupId, studentId, ...values })
    .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  await audit(db, user.id, "grading.project", "group", groupId, { studentId, score: parsed.data.score });
  refresh(groupId);
  return { ok: true, message: "saved" };
}

const remedialSchema = z.object({
  count: field.int(1, 10),
  firstDate: field.date(),
  time: z.string("required").regex(/^\d{2}:\d{2}$/, "invalid"),
  every: field.int(1, 14),
  "students[]": z.array(z.coerce.number().int().positive()).min(1, "chooseStudents"),
});

/**
 * Schedules extra sessions for the students who did not pass. Only those
 * students appear on the extra sessions' attendance sheets.
 */
export async function createRemedialSessions(groupId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.attendance");
  const detail = await requireTeachingGroup(user, groupId);
  const parsed = parseForm(remedialSchema, formData);
  if (!parsed.data) return parsed.state;
  const { count, firstDate, time, every, "students[]": students } = parsed.data;

  const { rows } = await getGroupResults(groupId);
  const allowed = new Set(rows.map((row) => row.studentId));
  if (students.some((id) => !allowed.has(id))) return { error: "checkFields" };

  const [{ last }] = await db
    .select({ last: max(classSession.number) })
    .from(classSession)
    .where(and(eq(classSession.groupId, groupId), eq(classSession.kind, "remedial")));
  const [slot] = await db.select({ duration: groupSlot.durationMinutes }).from(groupSlot).where(eq(groupSlot.groupId, groupId)).limit(1);

  await db.transaction(async (tx) => {
    await tx
      .insert(remedialStudent)
      .values(students.map((studentId) => ({ groupId, studentId })))
      .onDuplicateKeyUpdate({ set: { groupId } });
    await tx.insert(classSession).values(
      Array.from({ length: count }, (_, index) => ({
        groupId,
        kind: "remedial" as const,
        number: (last ?? 0) + index + 1,
        scheduledAt: cairoToUtc(addDays(firstDate, index * every), time),
        durationMinutes: slot?.duration ?? 90,
      })),
    );
    await audit(tx, user.id, "remedial.create", "group", groupId, { count, students, level: detail.sessionCount });
  });
  refresh(groupId);
  return { ok: true, message: "remedialCreated" };
}

/** Issues certificates to the selected students who passed, once the level is finished. */
export async function issueCertificates(groupId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.grades");
  const detail = await requireTeachingGroup(user, groupId);
  if (!(await allSessionsHeld(groupId)) && detail.group.status !== "completed") return { error: "levelNotFinished" };
  const chosen = formData.getAll("students[]").map(Number).filter(Number.isInteger);
  const { rows } = await getGroupResults(groupId);
  const eligible = rows.filter((row) => row.passed && !row.certificate && chosen.includes(row.studentId));
  if (eligible.length === 0) return { error: "noEligible" };

  await db.insert(certificate).values(
    eligible.map((row) => ({
      code: randomBytes(5).toString("hex").toUpperCase(),
      studentId: row.studentId,
      groupId,
      levelId: detail.group.levelId,
      score: row.final!.toFixed(2),
      issuedAt: new Date(),
      issuedBy: user.id,
    })),
  );
  await audit(db, user.id, "certificate.issue", "group", groupId, { students: eligible.map((row) => row.studentId) });
  refresh(groupId);
  revalidatePath("/admin/academy/certificates");
  return { ok: true, message: "certificatesIssued" };
}

export async function revokeCertificate(certificateId: number): Promise<void> {
  const user = await requirePermission("students.write");
  await db.update(certificate).set({ revokedAt: new Date() }).where(eq(certificate.id, certificateId));
  await audit(db, user.id, "certificate.revoke", "certificate", certificateId);
  revalidatePath("/admin/academy/certificates");
}

const instructorCertSchema = z.object({
  userId: z.string().min(1, "required").max(36),
  title: field.text(200),
  issuedOn: field.date(),
  url: z.url("invalidUrl").max(500, "tooLong"),
});

export async function addInstructorCertificate(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("instructors.manage");
  const parsed = parseForm(instructorCertSchema, formData);
  if (!parsed.data) return parsed.state;
  const [{ id }] = await db.insert(instructorCertificate).values({ ...parsed.data, createdBy: user.id }).$returningId();
  await audit(db, user.id, "instructor_certificate.add", "user", parsed.data.userId, { id, title: parsed.data.title });
  revalidatePath("/admin/academy/certificates");
  revalidatePath("/instructor/certificates");
  return { ok: true, message: "saved" };
}

export async function removeInstructorCertificate(id: number): Promise<void> {
  const user = await requirePermission("instructors.manage");
  await db.delete(instructorCertificate).where(inArray(instructorCertificate.id, [id]));
  await audit(db, user.id, "instructor_certificate.remove", "instructor_certificate", id);
  revalidatePath("/admin/academy/certificates");
  revalidatePath("/instructor/certificates");
}
