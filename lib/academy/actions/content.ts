"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { enrollment, level, student } from "@/lib/db/academy";
import { userRole } from "@/lib/db/schema";
import {
  ANNOUNCEMENT_KINDS,
  RESOURCE_KINDS,
  announcement,
  announcementTarget,
  assignment,
  classSession,
  lesson,
  lessonResource,
  submission,
} from "@/lib/db/teaching";
import { field, parseForm, type ActionState } from "@/lib/forms";
import { canEditLevel } from "../content";
import { requireTeachingGroup } from "../teaching";
import { cairoToUtc } from "../time";

function revalidateContent(levelId: number) {
  revalidatePath(`/instructor/courses/${levelId}`);
  revalidatePath(`/admin/academy/levels/${levelId}`);
  revalidatePath("/student");
}

/* Lessons ------------------------------------------------------------------ */

const lessonSchema = z.object({ title: field.text(200), summary: field.optionalText(5000) });

export async function saveLesson(levelId: number, number: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await canEditLevel(user, levelId))) return { error: "outOfScope" };
  const [row] = await db.select({ sessionCount: level.sessionCount }).from(level).where(eq(level.id, levelId));
  if (!row || number < 1 || number > row.sessionCount + 4) return { error: "notFound" };
  const parsed = parseForm(lessonSchema, formData);
  if (!parsed.data) return parsed.state;

  await db
    .insert(lesson)
    .values({ levelId, number, ...parsed.data, updatedBy: user.id })
    .onDuplicateKeyUpdate({ set: { ...parsed.data, updatedBy: user.id, updatedAt: new Date() } });
  await audit(db, user.id, "lesson.save", "level", levelId, { number });
  revalidateContent(levelId);
  return { ok: true, message: "saved" };
}

const resourceSchema = z.object({
  kind: z.enum(RESOURCE_KINDS, "required"),
  title: field.text(200),
  url: z.url("invalidUrl").max(500, "tooLong"),
  teacherOnly: field.checkbox(),
});

export async function addResource(levelId: number, number: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await canEditLevel(user, levelId))) return { error: "outOfScope" };
  const parsed = parseForm(resourceSchema, formData);
  if (!parsed.data) return parsed.state;

  // A resource needs its lesson; create an untitled one if the plan is empty.
  await db
    .insert(lesson)
    .values({ levelId, number, title: `#${number}`, updatedBy: user.id })
    .onDuplicateKeyUpdate({ set: { levelId } });
  const [row] = await db.select({ id: lesson.id }).from(lesson).where(and(eq(lesson.levelId, levelId), eq(lesson.number, number)));
  await db.insert(lessonResource).values({ lessonId: row.id, ...parsed.data, createdBy: user.id });
  await audit(db, user.id, "lesson.resource_add", "level", levelId, { number, url: parsed.data.url });
  revalidateContent(levelId);
  return { ok: true, message: "saved" };
}

export async function removeResource(resourceId: number): Promise<void> {
  const user = await requireUser();
  const [row] = await db
    .select({ id: lessonResource.id, levelId: lesson.levelId })
    .from(lessonResource)
    .innerJoin(lesson, eq(lesson.id, lessonResource.lessonId))
    .where(eq(lessonResource.id, resourceId));
  if (!row || !(await canEditLevel(user, row.levelId))) return;
  await db.delete(lessonResource).where(eq(lessonResource.id, resourceId));
  await audit(db, user.id, "lesson.resource_remove", "level", row.levelId, { resourceId });
  revalidateContent(row.levelId);
}

/* Assignments -------------------------------------------------------------- */

const assignmentSchema = z.object({
  groupId: field.id(),
  sessionId: field.optionalId(),
  title: field.text(200),
  instructions: field.optionalText(5000),
  link: field.optionalUrl(),
  dueDate: field.date(),
  dueTime: z.string("required").regex(/^\d{2}:\d{2}$/, "invalid"),
  maxScore: field.int(1, 100),
});

export async function createAssignment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.homework");
  const parsed = parseForm(assignmentSchema, formData);
  if (!parsed.data) return parsed.state;
  const { group } = await requireTeachingGroup(user, parsed.data.groupId);
  const { dueDate, dueTime, ...values } = parsed.data;
  if (values.sessionId) {
    const [session] = await db.select({ groupId: classSession.groupId }).from(classSession).where(eq(classSession.id, values.sessionId));
    if (session?.groupId !== group.id) return { error: "checkFields", fieldErrors: { sessionId: "invalid" } };
  }

  const [{ id }] = await db
    .insert(assignment)
    .values({ ...values, dueAt: cairoToUtc(dueDate, dueTime), createdBy: user.id })
    .$returningId();
  await audit(db, user.id, "assignment.create", "assignment", id, { groupId: group.id });
  revalidatePath("/instructor/assignments");
  revalidatePath("/student");
  redirect(`/instructor/assignments/${id}`);
}

export async function deleteAssignment(assignmentId: number): Promise<void> {
  const user = await requirePermission("teaching.homework");
  const [row] = await db.select().from(assignment).where(eq(assignment.id, assignmentId));
  if (!row) return;
  await requireTeachingGroup(user, row.groupId);
  await db.delete(assignment).where(eq(assignment.id, assignmentId));
  await audit(db, user.id, "assignment.delete", "assignment", assignmentId, { groupId: row.groupId, title: row.title });
  revalidatePath("/instructor/assignments");
  redirect("/instructor/assignments");
}

const gradeSchema = z.object({ score: field.amount(), feedback: field.optionalText(1000) });

export async function gradeSubmission(assignmentId: number, studentId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.homework");
  const [row] = await db.select().from(assignment).where(eq(assignment.id, assignmentId));
  if (!row) return { error: "notFound" };
  await requireTeachingGroup(user, row.groupId);
  const parsed = parseForm(gradeSchema, formData);
  if (!parsed.data) return parsed.state;
  if (parsed.data.score > row.maxScore) return { error: "checkFields", fieldErrors: { score: "outOfRange" } };
  const [enrolled] = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(and(eq(enrollment.groupId, row.groupId), eq(enrollment.studentId, studentId)));
  if (!enrolled) return { error: "notFound" };

  const values = { score: parsed.data.score.toFixed(2), feedback: parsed.data.feedback, gradedAt: new Date(), gradedBy: user.id };
  await db
    .insert(submission)
    .values({ assignmentId, studentId, ...values })
    .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  await audit(db, user.id, "submission.grade", "assignment", assignmentId, { studentId, score: parsed.data.score });
  revalidatePath(`/instructor/assignments/${assignmentId}`);
  revalidatePath("/student");
  return { ok: true, message: "saved" };
}

const submitSchema = z.object({ url: z.url("invalidUrl").max(500, "tooLong"), note: field.optionalText(1000) });

/** A signed-in student hands in a link; they can replace it until it is graded. */
export async function submitAssignment(assignmentId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("portal.student");
  const [row] = await db.select().from(assignment).where(eq(assignment.id, assignmentId));
  if (!row) return { error: "notFound" };
  const [self] = await db
    .select({ id: student.id })
    .from(student)
    .innerJoin(enrollment, eq(enrollment.studentId, student.id))
    .where(and(eq(student.userId, user.id), eq(enrollment.groupId, row.groupId), eq(enrollment.status, "active")));
  if (!self) return { error: "notFound" };
  const parsed = parseForm(submitSchema, formData);
  if (!parsed.data) return parsed.state;

  const [existing] = await db
    .select()
    .from(submission)
    .where(and(eq(submission.assignmentId, assignmentId), eq(submission.studentId, self.id)));
  if (existing?.gradedAt) return { error: "alreadyGraded" };

  const values = { url: parsed.data.url, note: parsed.data.note, submittedAt: new Date() };
  await db
    .insert(submission)
    .values({ assignmentId, studentId: self.id, ...values })
    .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  await audit(db, user.id, "submission.submit", "assignment", assignmentId, { studentId: self.id });
  revalidatePath("/student");
  revalidatePath(`/instructor/assignments/${assignmentId}`);
  return { ok: true, message: "submitted" };
}

/* Announcements ------------------------------------------------------------ */

const announcementSchema = z.object({
  kind: z.enum(ANNOUNCEMENT_KINDS, "required"),
  title: field.text(200),
  body: field.optionalText(5000),
  link: field.optionalUrl(),
  audience: z.enum(["all", "selected"]),
  "targets[]": z.array(z.string()).default([]),
});

export async function createAnnouncement(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("announcements.manage");
  const parsed = parseForm(announcementSchema, formData);
  if (!parsed.data) return parsed.state;
  const { audience, "targets[]": targets, ...values } = parsed.data;

  let recipients: string[] = [];
  if (audience === "selected") {
    if (targets.length === 0) return { error: "checkFields", fieldErrors: { targets: "chooseInstructor" } };
    recipients = (
      await db
        .selectDistinct({ userId: userRole.userId })
        .from(userRole)
        .where(and(eq(userRole.role, "instructor"), inArray(userRole.userId, targets)))
    ).map((row) => row.userId);
  }

  await db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(announcement)
      .values({ ...values, toAll: audience === "all", createdBy: user.id })
      .$returningId();
    if (recipients.length) await tx.insert(announcementTarget).values(recipients.map((userId) => ({ announcementId: id, userId })));
    await audit(tx, user.id, "announcement.create", "announcement", id, { kind: values.kind, recipients: recipients.length || "all" });
  });

  revalidatePath("/admin/academy/announcements");
  revalidatePath("/instructor/announcements");
  revalidatePath("/instructor");
  return { ok: true, message: "announcementSent" };
}

export async function deleteAnnouncement(announcementId: number): Promise<void> {
  const user = await requirePermission("announcements.manage");
  if (!can(user.grants, "announcements.manage")) return;
  await db.delete(announcement).where(eq(announcement.id, announcementId));
  await audit(db, user.id, "announcement.delete", "announcement", announcementId);
  revalidatePath("/admin/academy/announcements");
  revalidatePath("/instructor/announcements");
}
