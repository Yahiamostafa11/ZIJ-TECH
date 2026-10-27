import "server-only";
import { randomInt } from "node:crypto";
import ExcelJS from "exceljs";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { classGroup, enrollment, student } from "@/lib/db/academy";
import { quiz, quizAttempt, quizQuestion } from "@/lib/db/teaching";
import { nameKey } from "./normalize";
import { toMoney } from "./format";

/* Excel template ------------------------------------------------------------ */

export const MAX_OPTIONS = 5;
const LETTERS = ["A", "B", "C", "D", "E"];
const AR_LETTERS = ["أ", "ب", "ج", "د", "ه"];

const HEADERS = {
  type: ["type", "kind", "النوع", "نوع السؤال"],
  question: ["question", "السؤال"],
  a: ["a", "option a", "أ", "ا", "الاختيار أ", "اختيار ا"],
  b: ["b", "option b", "ب", "الاختيار ب", "اختيار ب"],
  c: ["c", "option c", "ج", "الاختيار ج", "اختيار ج"],
  d: ["d", "option d", "د", "الاختيار د", "اختيار د"],
  e: ["e", "option e", "ه", "هـ", "الاختيار ه", "اختيار ه"],
  correct: ["correct", "answer", "الاجابه الصحيحه", "الاجابه", "الإجابة الصحيحة", "الصحيح"],
  points: ["points", "score", "marks", "الدرجه", "الدرجة", "النقاط"],
} as const;
type Header = keyof typeof HEADERS;

const HEADER_LOOKUP = new Map<string, Header>(
  Object.entries(HEADERS).flatMap(([key, aliases]) => aliases.map((alias) => [nameKey(alias), key as Header] as const)),
);

/** The template instructors fill in: one question per row. */
export async function buildQuizTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Questions", { views: [{ rightToLeft: true }] });
  sheet.columns = [
    { header: "النوع", key: "type", width: 12 },
    { header: "السؤال", key: "question", width: 50 },
    { header: "أ", key: "a", width: 22 },
    { header: "ب", key: "b", width: 22 },
    { header: "ج", key: "c", width: 22 },
    { header: "د", key: "d", width: 22 },
    { header: "الإجابة الصحيحة", key: "correct", width: 16 },
    { header: "الدرجة", key: "points", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2C166" } };
  sheet.addRow({ type: "اختيار", question: "أي مكوّن بيقيس المسافة في الروبوت؟", a: "حساس الألتراسونيك", b: "المحرك", c: "البطارية", d: "الليد", correct: "أ", points: 1 });
  sheet.addRow({ type: "اختيار", question: "الأمر اللي بيكرر خطوات كذا مرة اسمه؟", a: "if", b: "loop", c: "print", d: "", correct: "ب", points: 1 });
  sheet.addRow({ type: "مقالي", question: "اشرح بكلامك الروبوت بيعرف إزاي إن قدامه حاجة.", points: 3 });

  const help = workbook.addWorksheet("طريقة الملء", { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 100;
  [
    "كل صف = سؤال واحد. سيب الصف الأول (العناوين) زي ما هو.",
    "النوع: «اختيار» لسؤال اختيار من متعدد، أو «مقالي» لسؤال إجابته مكتوبة.",
    "أسئلة الاختيار: اكتب من 2 لـ 5 اختيارات في أعمدة أ، ب، ج، د (وممكن عمود ه)، واكتب الحرف الصحيح في «الإجابة الصحيحة».",
    "الأسئلة المقالية: سيب الاختيارات والإجابة فاضية، والمدرّس بيصحّحها بنفسه.",
    "الدرجة: رقم موجب، ولو فاضية بتتحسب درجة واحدة.",
    "Type: MCQ or Essay · Correct: A–E · Points: a positive number (default 1).",
  ].forEach((line) => help.addRow([line]));
  return workbook.xlsx.writeBuffer();
}

export type ParsedQuestion = { kind: "mcq" | "essay"; text: string; options: string[]; correct: number | null; points: number };
export type SheetError = { row: number; code: string };

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("result" in value) return String(value.result ?? "");
    if ("text" in value) return String(value.text);
  }
  return String(value).trim();
}

/** Reads the first sheet; rows with problems are reported, not guessed. */
export async function parseQuizSheet(data: ArrayBuffer): Promise<{ questions: ParsedQuestion[]; errors: SheetError[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { questions: [], errors: [{ row: 0, code: "emptySheet" }] };

  const columns = new Map<Header, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const header = HEADER_LOOKUP.get(nameKey(cellText(cell.value)));
    if (header && !columns.has(header)) columns.set(header, column);
  });
  if (!columns.has("question")) return { questions: [], errors: [{ row: 1, code: "noQuestionColumn" }] };

  const questions: ParsedQuestion[] = [];
  const errors: SheetError[] = [];
  const read = (row: ExcelJS.Row, header: Header) => (columns.has(header) ? cellText(row.getCell(columns.get(header)!).value) : "");

  sheet.eachRow((row, number) => {
    if (number === 1) return;
    const text = read(row, "question");
    if (!text) return;
    const type = nameKey(read(row, "type"));
    const options = (["a", "b", "c", "d", "e"] as const).map((key) => read(row, key)).filter(Boolean).slice(0, MAX_OPTIONS);
    const essay = ["essay", "مقالي", "مقال", "written", "text"].map(nameKey).includes(type) || (!type && options.length === 0);
    const pointsRaw = read(row, "points");
    const points = pointsRaw ? Number(pointsRaw) : 1;
    if (!Number.isFinite(points) || points <= 0 || points > 100) {
      errors.push({ row: number, code: "badPoints" });
      return;
    }
    if (essay) {
      questions.push({ kind: "essay", text, options: [], correct: null, points });
      return;
    }
    if (options.length < 2) {
      errors.push({ row: number, code: "fewOptions" });
      return;
    }
    const answer = read(row, "correct").trim();
    let correct = LETTERS.indexOf(answer.toUpperCase());
    if (correct < 0) correct = AR_LETTERS.indexOf(answer === "ا" ? "أ" : answer);
    if (correct < 0 && /^\d$/.test(answer)) correct = Number(answer) - 1;
    if (correct < 0) correct = options.findIndex((option) => nameKey(option) === nameKey(answer));
    if (correct < 0 || correct >= options.length) {
      errors.push({ row: number, code: "badCorrect" });
      return;
    }
    questions.push({ kind: "mcq", text, options, correct, points });
  });

  if (questions.length === 0 && errors.length === 0) errors.push({ row: 0, code: "noQuestions" });
  return { questions, errors };
}

/* Attempts ------------------------------------------------------------------ */

export type Layout = { questions: number[]; options: Record<number, number[]> };

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function buildLayout(questions: (typeof quizQuestion.$inferSelect)[], shuffle: boolean): Layout {
  const ordered = [...questions].sort((a, b) => a.position - b.position);
  const order = shuffle ? shuffled(ordered) : ordered;
  const options: Record<number, number[]> = {};
  for (const question of order) {
    if (question.kind !== "mcq") continue;
    const count = (JSON.parse(question.options ?? "[]") as string[]).length;
    const indexes = Array.from({ length: count }, (_, index) => index);
    options[question.id] = shuffle ? shuffled(indexes) : indexes;
  }
  return { questions: order.map((question) => question.id), options };
}

export function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Score of the multiple-choice part. Answers hold the original option index. */
export function autoScore(questions: (typeof quizQuestion.$inferSelect)[], answers: Record<string, number | string>) {
  return toMoney(
    questions
      .filter((question) => question.kind === "mcq" && answers[question.id] === question.correct)
      .reduce((sum, question) => sum + Number(question.points), 0),
  );
}

/** Final score once every essay answer has points; null while essays wait. */
export function finalScore(
  questions: (typeof quizQuestion.$inferSelect)[],
  auto: number,
  essayScores: Record<string, number>,
  answers: Record<string, number | string>,
) {
  const essays = questions.filter((question) => question.kind === "essay");
  const pending = essays.some((question) => essayScores[question.id] === undefined && typeof answers[question.id] === "string" && answers[question.id]);
  if (pending) return null;
  return toMoney(auto + essays.reduce((sum, question) => sum + (essayScores[question.id] ?? 0), 0));
}

export const totalPoints = (questions: (typeof quizQuestion.$inferSelect)[]) =>
  toMoney(questions.reduce((sum, question) => sum + Number(question.points), 0));

/** Grace after the time limit for slow connections before answers are locked. */
export const GRACE_MS = 60_000;

export function attemptDeadline(attempt: { startedAt: Date }, row: { timeLimit: number | null; closesAt: Date }) {
  const byLimit = row.timeLimit ? attempt.startedAt.getTime() + row.timeLimit * 60_000 : Infinity;
  return Math.min(byLimit, row.closesAt.getTime());
}

/* Queries ------------------------------------------------------------------- */

export async function listInstructorQuizzes(userId: string) {
  const rows = await db
    .select({
      quiz,
      groupName: classGroup.name,
      questions: sql<number>`(select count(*) from ${quizQuestion} where ${quizQuestion.quizId} = ${quiz.id})`,
      submitted: sql<number>`(select count(*) from ${quizAttempt} where ${quizAttempt.quizId} = ${quiz.id} and ${quizAttempt.submittedAt} is not null)`,
      students: sql<number>`(select count(*) from ${enrollment} where ${enrollment.groupId} = ${quiz.groupId} and ${enrollment.status} = 'active')`,
    })
    .from(quiz)
    .innerJoin(classGroup, eq(classGroup.id, quiz.groupId))
    .where(eq(classGroup.instructorId, userId))
    .orderBy(desc(quiz.opensAt));
  return rows.map((row) => ({ ...row, questions: Number(row.questions), submitted: Number(row.submitted), students: Number(row.students) }));
}

export async function getQuizQuestions(quizId: number) {
  return db.select().from(quizQuestion).where(eq(quizQuestion.quizId, quizId)).orderBy(asc(quizQuestion.position));
}

/** Every active student of the quiz's group with their attempt, if any. */
export async function getQuizResults(quizId: number, groupId: number) {
  const students = await db
    .select({ studentId: student.id, nameAr: student.nameAr, nameEn: student.nameEn })
    .from(enrollment)
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .where(and(eq(enrollment.groupId, groupId), eq(enrollment.status, "active")))
    .orderBy(asc(student.nameAr));
  const attempts = await db.select().from(quizAttempt).where(eq(quizAttempt.quizId, quizId));
  return students.map((row) => ({ ...row, attempt: attempts.find((item) => item.studentId === row.studentId) ?? null }));
}

/** Scores of every student in every quiz of a group, as percentages. */
export async function getGroupQuizMatrix(groupId: number) {
  const quizzes = await db.select().from(quiz).where(eq(quiz.groupId, groupId)).orderBy(asc(quiz.opensAt));
  if (quizzes.length === 0) return { quizzes: [], totals: new Map<number, number>(), attempts: [] };
  const ids = quizzes.map((row) => row.id);
  const [questions, attempts] = await Promise.all([
    db.select({ quizId: quizQuestion.quizId, points: quizQuestion.points }).from(quizQuestion).where(inArray(quizQuestion.quizId, ids)),
    db.select().from(quizAttempt).where(inArray(quizAttempt.quizId, ids)),
  ]);
  const totals = new Map<number, number>();
  for (const question of questions) totals.set(question.quizId, (totals.get(question.quizId) ?? 0) + Number(question.points));
  return { quizzes, totals, attempts };
}

/**
 * Scores and closes an attempt: on hand-in, and for attempts left open past
 * their deadline. Not a server action, so students cannot call it directly.
 */
export async function finalizeAttempt(attemptId: number, quizId: number, answers: Record<string, number | string>) {
  const questions = await getQuizQuestions(quizId);
  const auto = autoScore(questions, answers);
  const score = finalScore(questions, auto, {}, answers);
  await db
    .update(quizAttempt)
    .set({ answers: JSON.stringify(answers), submittedAt: new Date(), autoScore: auto.toFixed(2), score: score === null ? null : score.toFixed(2) })
    .where(and(eq(quizAttempt.id, attemptId), isNull(quizAttempt.submittedAt)));
}

/** Closes attempts whose time ran out without a hand-in, using their saved answers. */
export async function closeExpiredAttempts(row: typeof quiz.$inferSelect) {
  const open = await db.select().from(quizAttempt).where(and(eq(quizAttempt.quizId, row.id), isNull(quizAttempt.submittedAt)));
  for (const attempt of open) {
    if (Date.now() > attemptDeadline(attempt, row) + GRACE_MS) {
      await finalizeAttempt(attempt.id, row.id, parseJson(attempt.answers, {}));
    }
  }
}

export async function listGroupStudents(groupId: number) {
  return db
    .select({ studentId: student.id, nameAr: student.nameAr, nameEn: student.nameEn })
    .from(enrollment)
    .innerJoin(student, eq(student.id, enrollment.studentId))
    .where(and(eq(enrollment.groupId, groupId), eq(enrollment.status, "active")))
    .orderBy(asc(student.nameAr));
}
