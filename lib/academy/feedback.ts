import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { classGroup, student } from "@/lib/db/academy";
import { CRITERIA, type Criterion, attendance, classSession, feedback } from "@/lib/db/teaching";
import { formFor } from "./feedback-questions";

type Executor = Pick<typeof db, "select" | "insert">;

/** Feedback links stay valid for two weeks after they are created. */
export const FEEDBACK_DAYS = 14;

export function isFeedbackExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > FEEDBACK_DAYS * 86_400_000;
}

export function siteUrl() {
  return (process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
}

/** Creates parent and student links for the students who attended, once per session. */
export async function createFeedbackLinks(
  executor: Executor,
  session: { id: number; kind: "regular" | "remedial"; number: number },
  sessionCount: number,
  studentIds: number[],
) {
  if (studentIds.length === 0) return;
  const existing = await executor
    .select({ studentId: feedback.studentId, respondent: feedback.respondent })
    .from(feedback)
    .where(eq(feedback.sessionId, session.id));
  const has = new Set(existing.map((row) => `${row.studentId}:${row.respondent}`));
  const form = formFor(session.kind, session.number, sessionCount);
  const rows = studentIds.flatMap((studentId) =>
    (["parent", "student"] as const)
      .filter((respondent) => !has.has(`${studentId}:${respondent}`))
      .map((respondent) => ({ token: randomBytes(18).toString("base64url"), sessionId: session.id, studentId, respondent, form })),
  );
  if (rows.length) await executor.insert(feedback).values(rows);
}

export async function getSessionFeedbackLinks(sessionId: number) {
  const rows = await db.select().from(feedback).where(eq(feedback.sessionId, sessionId));
  const base = siteUrl();
  const byStudent = new Map<number, { parentUrl: string; studentUrl: string; parentDone: boolean; studentDone: boolean }>();
  for (const row of rows) {
    const entry = byStudent.get(row.studentId) ?? { parentUrl: "", studentUrl: "", parentDone: false, studentDone: false };
    if (row.respondent === "parent") {
      entry.parentUrl = `${base}/f/${row.token}`;
      entry.parentDone = Boolean(row.submittedAt);
    } else {
      entry.studentUrl = `${base}/f/${row.token}`;
      entry.studentDone = Boolean(row.submittedAt);
    }
    byStudent.set(row.studentId, entry);
  }
  return byStudent;
}

export function parseAnswers(raw: string | null): Record<string, number | string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, number | string>;
  } catch {
    return {};
  }
}

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

/**
 * A student's report in one group: the instructor's scores per criterion and
 * their trend, the student's own view, the parent's observations, and flags
 * where those disagree.
 */
export async function getStudentReport(groupId: number, studentId: number) {
  const [person] = await db.select().from(student).where(eq(student.id, studentId));
  if (!person) return null;

  const records = await db
    .select({ record: attendance, number: classSession.number, kind: classSession.kind, scheduledAt: classSession.scheduledAt })
    .from(attendance)
    .innerJoin(classSession, eq(classSession.id, attendance.sessionId))
    .where(and(eq(classSession.groupId, groupId), eq(attendance.studentId, studentId)))
    .orderBy(asc(classSession.scheduledAt));

  const answers = await db
    .select({ respondent: feedback.respondent, form: feedback.form, answers: feedback.answers, submittedAt: feedback.submittedAt, number: classSession.number })
    .from(feedback)
    .innerJoin(classSession, eq(classSession.id, feedback.sessionId))
    .where(and(eq(classSession.groupId, groupId), eq(feedback.studentId, studentId), isNotNull(feedback.submittedAt)))
    .orderBy(asc(classSession.scheduledAt));

  const scored = records.filter((row) => row.record.status === "present" || row.record.status === "late");
  const criteria = Object.fromEntries(
    CRITERIA.map((criterion) => {
      const values = scored.map((row) => row.record[criterion]).filter((value): value is number => value !== null);
      const half = Math.floor(values.length / 2);
      const early = average(values.slice(0, half));
      const late = average(values.slice(half));
      return [criterion, { average: average(values), trend: early !== null && late !== null && values.length >= 4 ? late - early : null }];
    }),
  ) as Record<Criterion, { average: number | null; trend: number | null }>;

  const sessionAverages = scored.map((row) => ({
    number: row.number,
    kind: row.kind,
    value: average(CRITERIA.map((criterion) => row.record[criterion]).filter((value): value is number => value !== null)),
  }));

  const parent = answers.filter((row) => row.respondent === "parent").map((row) => ({ ...row, data: parseAnswers(row.answers) }));
  const self = answers.filter((row) => row.respondent === "student").map((row) => ({ ...row, data: parseAnswers(row.answers) }));
  const pick = (rows: typeof parent, key: string) => rows.map((row) => row.data[key]).filter((value): value is number => typeof value === "number");

  const studentView = {
    enjoyed: average(pick(self, "enjoyed")),
    understood: average(pick(self, "understood")),
    difficulty: average(pick(self, "difficulty")),
    texts: self.flatMap((row) =>
      (["likedMost", "hardest", "nextTopic"] as const)
        .filter((key) => typeof row.data[key] === "string" && row.data[key])
        .map((key) => ({ key, text: String(row.data[key]), number: row.number })),
    ),
  };
  const parentView = {
    enthusiasm: average(pick(parent, "enthusiasm")),
    showed: average(pick(parent, "showed")),
    thinking: average(pick(parent, "thinking")),
    confidence: average(pick(parent, "confidence")),
    communication: average(pick(parent, "communication")),
    value: average(pick(parent, "value")),
    recommend: pick(parent, "recommend").at(-1) ?? null,
    comments: parent
      .filter((row) => typeof row.data.comment === "string" && row.data.comment)
      .map((row) => ({ text: String(row.data.comment), number: row.number })),
  };

  const counted = records.filter((row) => row.record.status !== "excused");
  const attended = counted.filter((row) => row.record.status === "present" || row.record.status === "late").length;

  const strengths = CRITERIA.filter((criterion) => (criteria[criterion].average ?? 0) >= 3.5);
  const improve = CRITERIA.filter((criterion) => criteria[criterion].average !== null && criteria[criterion].average! < 2.5);

  // Where the three views disagree, the instructor should look closer.
  const flags: string[] = [];
  if (studentView.understood !== null && studentView.understood >= 2.5 && (criteria.understanding.average ?? 4) < 2.5) flags.push("understandingGap");
  if (studentView.understood !== null && studentView.understood < 1.75 && (criteria.understanding.average ?? 0) >= 3) flags.push("lowConfidence");
  if (parentView.enthusiasm !== null && parentView.enthusiasm <= 2.5) flags.push("lowEnthusiasm");
  if (studentView.difficulty !== null && studentView.difficulty >= 2.6) flags.push("tooHard");
  if (studentView.enjoyed !== null && studentView.enjoyed < 1.75) flags.push("notEnjoying");
  if (counted.length >= 3 && attended / counted.length < 0.75) flags.push("attendance");
  const trendDown = CRITERIA.filter((criterion) => (criteria[criterion].trend ?? 0) <= -0.75);
  if (trendDown.length) flags.push("decline");

  return {
    student: person,
    attendance: { attended, counted: counted.length, absent: counted.length - attended },
    criteria,
    sessionAverages,
    overall: average(CRITERIA.map((criterion) => criteria[criterion].average).filter((value): value is number => value !== null)),
    strengths,
    improve,
    trendDown,
    studentView,
    parentView,
    flags,
    notes: records.filter((row) => row.record.note).map((row) => ({ number: row.number, note: row.record.note!, status: row.record.status })),
  };
}

/** Latest submitted parent and student answers in the instructor's groups. */
export async function getRecentFeedback(instructorId: string, limit = 6) {
  const rows = await db
    .select({
      id: feedback.id,
      respondent: feedback.respondent,
      answers: feedback.answers,
      submittedAt: feedback.submittedAt,
      number: classSession.number,
      kind: classSession.kind,
      groupId: classGroup.id,
      groupName: classGroup.name,
      studentId: student.id,
      nameAr: student.nameAr,
      nameEn: student.nameEn,
    })
    .from(feedback)
    .innerJoin(classSession, eq(classSession.id, feedback.sessionId))
    .innerJoin(classGroup, eq(classGroup.id, classSession.groupId))
    .innerJoin(student, eq(student.id, feedback.studentId))
    .where(and(eq(classGroup.instructorId, instructorId), isNotNull(feedback.submittedAt)))
    .orderBy(desc(feedback.submittedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, data: parseAnswers(row.answers) }));
}

/** Average parent enthusiasm (1–5) per group, for the instructor home. */
export async function getFeedbackSummary(groupIds: number[]) {
  if (groupIds.length === 0) return { parentAverage: null as number | null, responses: 0 };
  const rows = await db
    .select({ answers: feedback.answers })
    .from(feedback)
    .innerJoin(classSession, eq(classSession.id, feedback.sessionId))
    .where(and(inArray(classSession.groupId, groupIds), eq(feedback.respondent, "parent"), isNotNull(feedback.submittedAt)));
  const values = rows.map((row) => parseAnswers(row.answers).enthusiasm).filter((value): value is number => typeof value === "number");
  return { parentAverage: average(values), responses: rows.length };
}
