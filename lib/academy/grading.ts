import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { classGroup, enrollment, level, student } from "@/lib/db/academy";
import {
  CRITERIA,
  assignment,
  attendance,
  certificate,
  classSession,
  groupGrading,
  projectScore,
  quiz,
  quizAttempt,
  quizQuestion,
  remedialStudent,
  submission,
} from "@/lib/db/teaching";

export const COMPONENTS = ["sessions", "attendance", "quizzes", "assignments", "project"] as const;
export type Component = (typeof COMPONENTS)[number];

/** The group's weights, or defaults with the level's pass mark. */
export async function getGrading(groupId: number) {
  const [row] = await db.select().from(groupGrading).where(eq(groupGrading.groupId, groupId));
  if (row) return row;
  const [group] = await db
    .select({ passMark: level.passMark })
    .from(classGroup)
    .innerJoin(level, eq(level.id, classGroup.levelId))
    .where(eq(classGroup.id, groupId));
  return { groupId, sessions: 30, attendance: 10, quizzes: 30, assignments: 10, project: 20, passMark: group?.passMark ?? 65, updatedBy: null, updatedAt: null };
}

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

/**
 * Each active student's percentage in every component and the weighted final
 * result. A component with nothing to grade yet is left out and the other
 * weights are scaled up, so early results are not dragged down by empty parts.
 */
export async function getGroupResults(groupId: number) {
  const now = new Date();
  const grading = await getGrading(groupId);
  const students = await db
    .select({ studentId: student.id, nameAr: student.nameAr, nameEn: student.nameEn, familyId: student.familyId })
    .from(enrollment)
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .where(and(eq(enrollment.groupId, groupId), inArray(enrollment.status, ["active", "completed"])));
  const ids = students.map((row) => row.studentId);

  const [records, quizzes, assignments, projects, remedial, certificates] = await Promise.all([
    db
      .select({ record: attendance })
      .from(attendance)
      .innerJoin(classSession, eq(classSession.id, attendance.sessionId))
      .where(and(eq(classSession.groupId, groupId), eq(classSession.kind, "regular"))),
    db.select().from(quiz).where(eq(quiz.groupId, groupId)),
    db.select().from(assignment).where(eq(assignment.groupId, groupId)),
    db.select().from(projectScore).where(eq(projectScore.groupId, groupId)),
    db.select().from(remedialStudent).where(eq(remedialStudent.groupId, groupId)),
    db.select().from(certificate).where(eq(certificate.groupId, groupId)),
  ]);
  const quizIds = quizzes.map((row) => row.id);
  const assignmentIds = assignments.map((row) => row.id);
  const [questions, attempts, submissions] = await Promise.all([
    quizIds.length ? db.select({ quizId: quizQuestion.quizId, points: quizQuestion.points }).from(quizQuestion).where(inArray(quizQuestion.quizId, quizIds)) : [],
    quizIds.length && ids.length ? db.select().from(quizAttempt).where(inArray(quizAttempt.quizId, quizIds)) : [],
    assignmentIds.length && ids.length ? db.select().from(submission).where(inArray(submission.assignmentId, assignmentIds)) : [],
  ]);
  const quizTotal = new Map<number, number>();
  for (const question of questions) quizTotal.set(question.quizId, (quizTotal.get(question.quizId) ?? 0) + Number(question.points));

  return {
    grading,
    rows: students.map((person) => {
      const own = records.filter((row) => row.record.studentId === person.studentId).map((row) => row.record);
      const counted = own.filter((row) => row.status !== "excused");
      const attended = counted.filter((row) => row.status === "present" || row.status === "late");
      const sessionScores = attended
        .map((row) => average(CRITERIA.map((criterion) => row[criterion]).filter((value): value is number => value !== null)))
        .filter((value): value is number => value !== null);

      const quizScores = quizzes
        .map((row) => {
          const attempt = attempts.find((item) => item.quizId === row.id && item.studentId === person.studentId);
          const total = quizTotal.get(row.id) ?? 0;
          if (!total) return null;
          if (attempt?.score != null) return (Number(attempt.score) / total) * 100;
          return row.closesAt < now && !attempt ? 0 : null;
        })
        .filter((value): value is number => value !== null);

      const assignmentScores = assignments
        .map((row) => {
          const own = submissions.find((item) => item.assignmentId === row.id && item.studentId === person.studentId);
          if (own?.score != null) return (Number(own.score) / row.maxScore) * 100;
          return row.dueAt < now && !own?.submittedAt ? 0 : null;
        })
        .filter((value): value is number => value !== null);

      const project = projects.find((row) => row.studentId === person.studentId);
      const parts: Record<Component, number | null> = {
        sessions: sessionScores.length ? (average(sessionScores)! / 4) * 100 : null,
        attendance: counted.length ? (attended.length / counted.length) * 100 : null,
        quizzes: average(quizScores),
        assignments: average(assignmentScores),
        project: project ? Number(project.score) : null,
      };
      const used = COMPONENTS.filter((key) => parts[key] !== null && grading[key] > 0);
      const weight = used.reduce((sum, key) => sum + grading[key], 0);
      const final = weight ? used.reduce((sum, key) => sum + parts[key]! * grading[key], 0) / weight : null;
      const cert = certificates.find((row) => row.studentId === person.studentId && !row.revokedAt);

      return {
        ...person,
        parts,
        final,
        passed: final !== null && final >= grading.passMark,
        projectNote: project?.note ?? null,
        remedial: remedial.some((row) => row.studentId === person.studentId),
        certificate: cert ?? null,
      };
    }),
  };
}

/** Whether every regular session of the group has been held. */
export async function allSessionsHeld(groupId: number) {
  const rows = await db
    .select({ status: classSession.status })
    .from(classSession)
    .where(and(eq(classSession.groupId, groupId), eq(classSession.kind, "regular")));
  return rows.length > 0 && rows.every((row) => row.status !== "scheduled");
}
