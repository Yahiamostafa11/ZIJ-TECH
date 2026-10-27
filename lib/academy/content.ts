import "server-only";
import { and, asc, desc, eq, inArray, isNull, lte, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { classGroup, enrollment, level, program, student } from "@/lib/db/academy";
import type { CurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  announcement,
  announcementRead,
  announcementTarget,
  assignment,
  classSession,
  lesson,
  lessonResource,
  submission,
} from "@/lib/db/teaching";

/* Lessons ------------------------------------------------------------------- */

/** Levels the instructor has taught or teaches, for the courses page. */
export async function listTaughtLevels(userId: string) {
  return db
    .selectDistinct({
      id: level.id,
      nameAr: level.nameAr,
      nameEn: level.nameEn,
      sessionCount: level.sessionCount,
      programNameAr: program.nameAr,
      programNameEn: program.nameEn,
    })
    .from(classGroup)
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .innerJoin(program, eq(program.id, level.programId))
    .where(eq(classGroup.instructorId, userId))
    .orderBy(asc(program.nameEn), asc(level.position));
}

/** Instructors edit lessons of levels they teach; admins who manage levels edit any. */
export async function canEditLevel(user: CurrentUser, levelId: number) {
  if (can(user.grants, "levels.manage") || user.grants.some((grant) => grant.role === "super_admin")) return true;
  const [row] = await db
    .select({ id: classGroup.id })
    .from(classGroup)
    .where(and(eq(classGroup.levelId, levelId), eq(classGroup.instructorId, user.id)))
    .limit(1);
  return Boolean(row);
}

export async function getLevelLessons(levelId: number) {
  const lessons = await db.select().from(lesson).where(eq(lesson.levelId, levelId)).orderBy(asc(lesson.number));
  const resources = lessons.length
    ? await db
        .select()
        .from(lessonResource)
        .where(inArray(lessonResource.lessonId, lessons.map((row) => row.id)))
        .orderBy(asc(lessonResource.createdAt))
    : [];
  return lessons.map((row) => ({ ...row, resources: resources.filter((item) => item.lessonId === row.id) }));
}

/** Lessons a group's students may see: those for sessions the group has held. */
export async function getReleasedLessons(groupId: number, levelId: number) {
  const [{ reached }] = await db
    .select({ reached: max(classSession.number) })
    .from(classSession)
    .where(and(eq(classSession.groupId, groupId), eq(classSession.kind, "regular"), eq(classSession.status, "held")));
  if (!reached) return [];
  const lessons = await db
    .select()
    .from(lesson)
    .where(and(eq(lesson.levelId, levelId), lte(lesson.number, reached)))
    .orderBy(desc(lesson.number));
  const resources = lessons.length
    ? await db
        .select()
        .from(lessonResource)
        .where(and(inArray(lessonResource.lessonId, lessons.map((row) => row.id)), eq(lessonResource.teacherOnly, false)))
    : [];
  return lessons.map((row) => ({ ...row, resources: resources.filter((item) => item.lessonId === row.id) }));
}

/* Assignments --------------------------------------------------------------- */

export async function listInstructorAssignments(userId: string) {
  const rows = await db
    .select({
      assignment,
      groupName: classGroup.name,
      submitted: sql<number>`(select count(*) from ${submission} where ${submission.assignmentId} = ${assignment.id} and ${submission.submittedAt} is not null)`,
      graded: sql<number>`(select count(*) from ${submission} where ${submission.assignmentId} = ${assignment.id} and ${submission.gradedAt} is not null)`,
      students: sql<number>`(select count(*) from ${enrollment} where ${enrollment.groupId} = ${assignment.groupId} and ${enrollment.status} = 'active')`,
    })
    .from(assignment)
    .innerJoin(classGroup, eq(classGroup.id, assignment.groupId))
    .where(eq(classGroup.instructorId, userId))
    .orderBy(desc(assignment.createdAt));
  return rows.map((row) => ({ ...row, submitted: Number(row.submitted), graded: Number(row.graded), students: Number(row.students) }));
}

/** Each active student of the assignment's group with their hand-in, if any. */
export async function getAssignmentSubmissions(assignmentId: number, groupId: number) {
  const students = await db
    .select({ studentId: student.id, nameAr: student.nameAr, nameEn: student.nameEn })
    .from(enrollment)
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .where(and(eq(enrollment.groupId, groupId), eq(enrollment.status, "active")))
    .orderBy(asc(student.nameAr));
  const rows = await db.select().from(submission).where(eq(submission.assignmentId, assignmentId));
  return students.map((row) => ({ ...row, submission: rows.find((item) => item.studentId === row.studentId) ?? null }));
}

/* Student portal ------------------------------------------------------------ */

/** The student records linked to a signed-in student account. */
export async function getStudentSelf(userId: string) {
  return db.select().from(student).where(eq(student.userId, userId));
}

export async function getStudentGroups(studentIds: number[]) {
  if (studentIds.length === 0) return [];
  return db
    .select({
      studentId: enrollment.studentId,
      groupId: classGroup.id,
      groupName: classGroup.name,
      mode: classGroup.mode,
      meetingUrl: classGroup.meetingUrl,
      status: classGroup.status,
      levelId: level.id,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
    })
    .from(enrollment)
    .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .where(and(inArray(enrollment.studentId, studentIds), eq(enrollment.status, "active")));
}

export async function getStudentAssignments(studentId: number, groupIds: number[]) {
  if (groupIds.length === 0) return [];
  const rows = await db
    .select({ assignment, groupName: classGroup.name })
    .from(assignment)
    .innerJoin(classGroup, eq(classGroup.id, assignment.groupId))
    .where(inArray(assignment.groupId, groupIds))
    .orderBy(desc(assignment.dueAt));
  const subs = rows.length
    ? await db
        .select()
        .from(submission)
        .where(and(eq(submission.studentId, studentId), inArray(submission.assignmentId, rows.map((row) => row.assignment.id))))
    : [];
  return rows.map((row) => ({ ...row, submission: subs.find((item) => item.assignmentId === row.assignment.id) ?? null }));
}

/* Announcements ------------------------------------------------------------- */

/** Announcements addressed to a user, newest first, with whether they read each. */
export async function listAnnouncementsFor(userId: string, limit = 50) {
  const rows = await db
    .select({ announcement, readAt: announcementRead.readAt })
    .from(announcement)
    .leftJoin(announcementRead, and(eq(announcementRead.announcementId, announcement.id), eq(announcementRead.userId, userId)))
    .where(
      sql`(${announcement.toAll} = true or exists (select 1 from ${announcementTarget} where ${announcementTarget.announcementId} = ${announcement.id} and ${announcementTarget.userId} = ${userId}))`,
    )
    .orderBy(desc(announcement.createdAt))
    .limit(limit);
  return rows;
}

export async function countUnreadAnnouncements(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(announcement)
    .leftJoin(announcementRead, and(eq(announcementRead.announcementId, announcement.id), eq(announcementRead.userId, userId)))
    .where(
      and(
        isNull(announcementRead.id),
        sql`(${announcement.toAll} = true or exists (select 1 from ${announcementTarget} where ${announcementTarget.announcementId} = ${announcement.id} and ${announcementTarget.userId} = ${userId}))`,
      ),
    );
  return Number(row?.count ?? 0);
}

export async function markAnnouncementsRead(userId: string, ids: number[]) {
  if (ids.length === 0) return;
  await db
    .insert(announcementRead)
    .values(ids.map((announcementId) => ({ announcementId, userId, readAt: new Date() })))
    .onDuplicateKeyUpdate({ set: { announcementId: sql`announcement_id` } });
}

/** Admin list with how many recipients have read each. */
export async function listAnnouncementsAdmin() {
  return db
    .select({
      announcement,
      reads: sql<number>`(select count(*) from ${announcementRead} where ${announcementRead.announcementId} = ${announcement.id})`,
      targets: sql<number>`(select count(*) from ${announcementTarget} where ${announcementTarget.announcementId} = ${announcement.id})`,
    })
    .from(announcement)
    .orderBy(desc(announcement.createdAt))
    .limit(100);
}
