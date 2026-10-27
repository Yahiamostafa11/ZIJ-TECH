"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { enrollment, student } from "@/lib/db/academy";
import { QUIZ_PURPOSES, quiz, quizAttempt, quizQuestion } from "@/lib/db/teaching";
import { field, parseForm, type ActionState } from "@/lib/forms";
import {
  GRACE_MS,
  attemptDeadline,
  autoScore,
  buildLayout,
  finalScore,
  finalizeAttempt,
  getQuizQuestions,
  parseJson,
  parseQuizSheet,
} from "../quiz";
import { requireTeachingGroup } from "../teaching";
import { cairoToUtc } from "../time";

const MAX_BYTES = 2 * 1024 * 1024;

/* Instructor ---------------------------------------------------------------- */

const quizSchema = z.object({
  groupId: field.id(),
  title: field.text(200),
  instructions: field.optionalText(3000),
  purpose: z.enum(QUIZ_PURPOSES),
  timeLimit: z.preprocess((value) => (value === "" ? null : value), z.coerce.number().int().min(1, "outOfRange").max(300, "outOfRange").nullable()),
  opensDate: field.date(),
  opensTime: z.string().regex(/^\d{2}:\d{2}$/, "invalid"),
  closesDate: field.date(),
  closesTime: z.string().regex(/^\d{2}:\d{2}$/, "invalid"),
  shuffle: field.checkbox(),
});

export async function createQuiz(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission("teaching.grades");
  const parsed = parseForm(quizSchema, formData);
  if (!parsed.data) return parsed.state;
  const { group } = await requireTeachingGroup(user, parsed.data.groupId);
  const { opensDate, opensTime, closesDate, closesTime, ...values } = parsed.data;
  const opensAt = cairoToUtc(opensDate, opensTime);
  const closesAt = cairoToUtc(closesDate, closesTime);
  if (closesAt <= opensAt) return { error: "checkFields", fieldErrors: { closesDate: "closesBeforeOpens" } };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "checkFields", fieldErrors: { file: "noFile" } };
  if (file.size > MAX_BYTES) return { error: "checkFields", fieldErrors: { file: "fileTooLarge" } };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "checkFields", fieldErrors: { file: "notXlsx" } };

  let sheet: Awaited<ReturnType<typeof parseQuizSheet>>;
  try {
    sheet = await parseQuizSheet(await file.arrayBuffer());
  } catch {
    return { error: "checkFields", fieldErrors: { file: "unreadableFile" } };
  }
  if (sheet.errors.length) return { error: "quizSheetErrors", details: sheet.errors };

  const id = await db.transaction(async (tx) => {
    const [{ id: quizId }] = await tx.insert(quiz).values({ ...values, opensAt, closesAt, createdBy: user.id }).$returningId();
    await tx.insert(quizQuestion).values(
      sheet.questions.map((question, index) => ({
        quizId,
        position: index + 1,
        kind: question.kind,
        text: question.text,
        options: question.kind === "mcq" ? JSON.stringify(question.options) : null,
        correct: question.correct,
        points: question.points.toFixed(2),
      })),
    );
    await audit(tx, user.id, "quiz.create", "quiz", quizId, { groupId: group.id, questions: sheet.questions.length });
    return quizId;
  });

  revalidatePath("/instructor/quizzes");
  redirect(`/instructor/quizzes/${id}`);
}

async function loadOwnQuiz(quizId: number) {
  const user = await requirePermission("teaching.grades");
  const [row] = await db.select().from(quiz).where(eq(quiz.id, quizId));
  if (!row) redirect("/instructor/quizzes");
  await requireTeachingGroup(user, row.groupId);
  return { user, row };
}

export async function deleteQuiz(quizId: number): Promise<void> {
  const { user, row } = await loadOwnQuiz(quizId);
  await db.delete(quiz).where(eq(quiz.id, quizId));
  await audit(db, user.id, "quiz.delete", "quiz", quizId, { title: row.title });
  revalidatePath("/instructor/quizzes");
  redirect("/instructor/quizzes");
}

/** Grades essay answers and leaves a note the student sees. */
export async function gradeAttempt(attemptId: number, _: ActionState, formData: FormData): Promise<ActionState> {
  const [attempt] = await db.select().from(quizAttempt).where(eq(quizAttempt.id, attemptId));
  if (!attempt) return { error: "notFound" };
  const { user } = await loadOwnQuiz(attempt.quizId);
  const questions = await getQuizQuestions(attempt.quizId);
  const essayScores: Record<string, number> = parseJson(attempt.essayScores, {});
  for (const question of questions.filter((item) => item.kind === "essay")) {
    const raw = String(formData.get(`essay_${question.id}`) ?? "").trim();
    if (raw === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > Number(question.points)) {
      return { error: "checkFields", fieldErrors: { [`essay_${question.id}`]: "outOfRange" } };
    }
    essayScores[question.id] = value;
  }
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  const answers = parseJson<Record<string, number | string>>(attempt.answers, {});
  const auto = attempt.autoScore === null ? autoScore(questions, answers) : Number(attempt.autoScore);
  const score = attempt.submittedAt ? finalScore(questions, auto, essayScores, answers) : null;

  await db
    .update(quizAttempt)
    .set({ essayScores: JSON.stringify(essayScores), instructorNote: note, score: score === null ? null : score.toFixed(2), gradedAt: new Date() })
    .where(eq(quizAttempt.id, attemptId));
  await audit(db, user.id, "quiz.grade", "quiz", attempt.quizId, { attemptId, score });
  revalidatePath(`/instructor/quizzes/${attempt.quizId}`);
  return { ok: true, message: "saved" };
}

/** Lets a student start again, e.g. after a lost connection. */
export async function resetAttempt(attemptId: number): Promise<void> {
  const [attempt] = await db.select().from(quizAttempt).where(eq(quizAttempt.id, attemptId));
  if (!attempt) return;
  const { user } = await loadOwnQuiz(attempt.quizId);
  await db.delete(quizAttempt).where(eq(quizAttempt.id, attemptId));
  await audit(db, user.id, "quiz.reset", "quiz", attempt.quizId, { studentId: attempt.studentId, focusLosses: attempt.focusLosses });
  revalidatePath(`/instructor/quizzes/${attempt.quizId}`);
}

/* Student ------------------------------------------------------------------- */

async function loadOwnStudent(quizId: number) {
  const user = await requirePermission("portal.student");
  const [row] = await db.select().from(quiz).where(eq(quiz.id, quizId));
  if (!row) return null;
  const [self] = await db
    .select({ id: student.id })
    .from(student)
    .innerJoin(enrollment, eq(enrollment.studentId, student.id))
    .where(and(eq(student.userId, user.id), eq(enrollment.groupId, row.groupId), eq(enrollment.status, "active")));
  return self ? { user, row, studentId: self.id } : null;
}

export async function startQuiz(quizId: number): Promise<void> {
  const own = await loadOwnStudent(quizId);
  if (!own) redirect("/student");
  const now = Date.now();
  if (now < own.row.opensAt.getTime() || now > own.row.closesAt.getTime()) redirect(`/student/quiz/${quizId}`);
  const questions = await getQuizQuestions(quizId);
  await db
    .insert(quizAttempt)
    .values({ quizId, studentId: own.studentId, layout: JSON.stringify(buildLayout(questions, own.row.shuffle)), startedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { quizId } });
  redirect(`/student/quiz/${quizId}`);
}

async function loadOpenAttempt(quizId: number) {
  const own = await loadOwnStudent(quizId);
  if (!own) return null;
  const [attempt] = await db
    .select()
    .from(quizAttempt)
    .where(and(eq(quizAttempt.quizId, quizId), eq(quizAttempt.studentId, own.studentId), isNull(quizAttempt.submittedAt)));
  if (!attempt) return null;
  return { ...own, attempt };
}

const answersSchema = z.record(z.string(), z.union([z.number().int().min(0).max(9), z.string().max(5000)]));

function cleanAnswers(raw: unknown) {
  const parsed = answersSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Autosave while the student works. Ignored after the deadline. */
export async function saveQuizAnswers(quizId: number, answers: unknown): Promise<{ ok: boolean }> {
  const open = await loadOpenAttempt(quizId);
  const clean = cleanAnswers(answers);
  if (!open || !clean) return { ok: false };
  if (Date.now() > attemptDeadline(open.attempt, open.row) + GRACE_MS) return { ok: false };
  await db.update(quizAttempt).set({ answers: JSON.stringify(clean) }).where(eq(quizAttempt.id, open.attempt.id));
  return { ok: true };
}

/** Records the student leaving the page or copying/pasting, for the instructor. */
export async function logQuizEvent(quizId: number, kind: "blur" | "copy" | "paste"): Promise<void> {
  const open = await loadOpenAttempt(quizId);
  if (!open || !["blur", "copy", "paste"].includes(kind)) return;
  const log = parseJson<[string, string][]>(open.attempt.eventLog, []);
  if (log.length < 200) log.push([new Date().toISOString(), kind]);
  await db
    .update(quizAttempt)
    .set({
      focusLosses: open.attempt.focusLosses + (kind === "blur" ? 1 : 0),
      copyEvents: open.attempt.copyEvents + (kind === "blur" ? 0 : 1),
      eventLog: JSON.stringify(log),
    })
    .where(eq(quizAttempt.id, open.attempt.id));
}

/** Hands the quiz in. Answers sent after the deadline and grace are not used. */
export async function submitQuiz(quizId: number, answers: unknown): Promise<{ ok: boolean }> {
  const open = await loadOpenAttempt(quizId);
  if (!open) return { ok: false };
  const clean = cleanAnswers(answers);
  const late = Date.now() > attemptDeadline(open.attempt, open.row) + GRACE_MS;
  const final = !late && clean ? clean : parseJson<Record<string, number | string>>(open.attempt.answers, {});
  await finalizeAttempt(open.attempt.id, open.row.id, final);
  revalidatePath("/student");
  revalidatePath(`/instructor/quizzes/${quizId}`);
  return { ok: true };
}
