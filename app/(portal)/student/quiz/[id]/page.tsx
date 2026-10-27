import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/portal/ui";
import { GlassCard } from "@/components/teaching/Glass";
import { QuizRunner, type RunnerQuestion } from "@/components/teaching/QuizRunner";
import { logQuizEvent, saveQuizAnswers, startQuiz, submitQuiz } from "@/lib/academy/actions/quiz";
import { formatSessionTime } from "@/lib/academy/format";
import { type Layout, attemptDeadline, closeExpiredAttempts, getQuizQuestions, parseJson, totalPoints } from "@/lib/academy/quiz";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { enrollment, student } from "@/lib/db/academy";
import { quiz, quizAttempt } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export default async function StudentQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("portal.student");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [row] = await db.select().from(quiz).where(eq(quiz.id, id));
  if (!row) notFound();
  const [self] = await db
    .select({ id: student.id })
    .from(student)
    .innerJoin(enrollment, eq(enrollment.studentId, student.id))
    .where(and(eq(student.userId, user.id), eq(enrollment.groupId, row.groupId), eq(enrollment.status, "active")));
  if (!self) notFound();
  await closeExpiredAttempts(row);

  const [t, locale, questions, [attempt]] = await Promise.all([
    getTranslations("quizzes.take"),
    getLocale() as Promise<Locale>,
    getQuizQuestions(row.id),
    db.select().from(quizAttempt).where(and(eq(quizAttempt.quizId, row.id), eq(quizAttempt.studentId, self.id))),
  ]);
  const now = new Date();
  const total = totalPoints(questions);
  const back = (
    <Link href="/student" className="inline-flex w-fit items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
      <ArrowRight size={16} className="ltr:rotate-180" /> {t("back")}
    </Link>
  );
  const header = (
    <div>
      <h1 className="text-2xl font-extrabold text-text-primary">{row.title}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {t("summary", { count: questions.length, total })}
        {row.timeLimit ? ` · ${t("limit", { minutes: row.timeLimit })}` : ""} · {t("closes", { date: formatSessionTime(row.closesAt, locale) })}
      </p>
      {row.instructions && <p className="mt-2 whitespace-pre-line text-sm">{row.instructions}</p>}
    </div>
  );

  if (attempt?.submittedAt) {
    const closed = now > row.closesAt;
    const answers = parseJson<Record<string, number | string>>(attempt.answers, {});
    return (
      <div className="mx-auto grid max-w-3xl gap-6">
        {back}
        {header}
        <GlassCard>
          <p className="text-lg font-bold">{t("handedIn")}</p>
          {attempt.score !== null ? (
            <p className="mt-2 font-dmsans text-3xl font-extrabold text-gold-light" dir="ltr">
              {Number(attempt.score)} / {total}
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">{t("waitingGrade")}</p>
          )}
          {attempt.instructorNote && <p className="mt-3 rounded-xl bg-info/10 p-3 text-sm">{attempt.instructorNote}</p>}
        </GlassCard>
        {closed && (
          <GlassCard title={t("review")}>
            <ol className="grid gap-2 text-sm">
              {questions
                .filter((question) => question.kind === "mcq")
                .map((question) => {
                  const options = parseJson<string[]>(question.options, []);
                  const right = answers[question.id] === question.correct;
                  return (
                    <li key={question.id} className={`glass-inset p-3 ${right ? "" : "border border-danger/30"}`}>
                      <p className="font-semibold">{question.text}</p>
                      <p className={right ? "text-success" : "text-danger"}>
                        {right ? "✓ " : "✗ "}
                        {typeof answers[question.id] === "number" ? options[answers[question.id] as number] : t("noAnswer")}
                      </p>
                      {!right && <p className="text-success">{t("correctWas", { answer: options[question.correct ?? 0] })}</p>}
                    </li>
                  );
                })}
            </ol>
          </GlassCard>
        )}
      </div>
    );
  }

  if (now < row.opensAt || now > row.closesAt) {
    return (
      <div className="mx-auto grid max-w-3xl gap-6">
        {back}
        {header}
        <GlassCard>
          <p className="text-sm text-text-secondary">{now < row.opensAt ? t("notOpen", { date: formatSessionTime(row.opensAt, locale) }) : t("closedMissed")}</p>
        </GlassCard>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="mx-auto grid max-w-3xl gap-6">
        {back}
        {header}
        <GlassCard>
          <ul className="mb-4 grid list-disc gap-1 ps-5 text-sm text-text-secondary">
            <li>{t("rule1")}</li>
            <li>{t("rule2")}</li>
            {row.timeLimit && <li>{t("rule3", { minutes: row.timeLimit })}</li>}
          </ul>
          <form action={startQuiz.bind(null, row.id)}>
            <button type="submit" className={buttonClass("primary")}>
              {t("start")}
            </button>
          </form>
        </GlassCard>
      </div>
    );
  }

  const layout = parseJson<Layout>(attempt.layout, { questions: [], options: {} });
  const byId = new Map(questions.map((question) => [question.id, question]));
  const ordered: RunnerQuestion[] = layout.questions
    .map((questionId) => byId.get(questionId))
    .filter((question): question is NonNullable<typeof question> => Boolean(question))
    .map((question) => {
      const options = parseJson<string[]>(question.options, []);
      return {
        id: question.id,
        kind: question.kind,
        text: question.text,
        points: Number(question.points),
        options: (layout.options[question.id] ?? options.map((_, index) => index)).map((index) => ({ index, text: options[index] })),
      };
    });
  const deadline = attemptDeadline(attempt, row);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      {header}
      <QuizRunner
        quizId={row.id}
        questions={ordered}
        initial={parseJson(attempt.answers, {})}
        deadline={Number.isFinite(deadline) ? deadline : null}
        save={saveQuizAnswers}
        submit={submitQuiz}
        log={logQuizEvent}
      />
    </div>
  );
}
