import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { buttonClass, inputClass } from "@/components/portal/ui";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { deleteQuiz, gradeAttempt, resetAttempt } from "@/lib/academy/actions/quiz";
import { siteUrl } from "@/lib/academy/feedback";
import { formatSessionTime, localized } from "@/lib/academy/format";
import { closeExpiredAttempts, getQuizQuestions, getQuizResults, parseJson, totalPoints } from "@/lib/academy/quiz";
import { requireTeachingGroup } from "@/lib/academy/teaching";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { quiz } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("teaching.grades");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [row] = await db.select().from(quiz).where(eq(quiz.id, id));
  if (!row) notFound();
  const { group } = await requireTeachingGroup(user, row.groupId);
  await closeExpiredAttempts(row);
  const [t, locale, questions, results] = await Promise.all([
    getTranslations("quizzes"),
    getLocale() as Promise<Locale>,
    getQuizQuestions(row.id),
    getQuizResults(row.id, group.id),
  ]);
  const total = totalPoints(questions);
  const link = `${siteUrl()}/student/quiz/${row.id}`;
  const share = t("shareMessage", { title: row.title, link });
  const essays = questions.filter((question) => question.kind === "essay");

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <Link href="/instructor/quizzes" className="inline-flex w-fit items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
        <ArrowRight size={16} className="ltr:rotate-180" /> {t("title")}
      </Link>
      <section className="glass grid gap-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">{row.title}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              <bdi>{group.name}</bdi> · {t(`purposes.${row.purpose}`)} · {t("questions", { count: questions.length })} · {t("outOf", { total })}
              {row.timeLimit ? ` · ${t("minutes", { minutes: row.timeLimit })}` : ""}
            </p>
            <p className="text-sm text-text-secondary">
              {formatSessionTime(row.opensAt, locale)} → {formatSessionTime(row.closesAt, locale)}
            </p>
          </div>
          <form action={deleteQuiz.bind(null, row.id)}>
            <button type="submit" className={buttonClass("danger")}>
              {t("delete")}
            </button>
          </form>
        </div>
        <div className="glass-inset flex flex-wrap items-center gap-3 p-3 text-sm">
          <span className="text-text-secondary">{t("studentLink")}</span>
          <bdi className="min-w-0 flex-1 truncate font-dmsans">{link}</bdi>
          <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer" className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
            {t("shareWhatsapp")}
          </a>
        </div>
        <p className="text-xs leading-6 text-text-secondary">{t("integrityHint")}</p>
      </section>

      <GlassCard title={t("results")}>
        <ul className="grid gap-3">
          {results.map((item) => {
            const attempt = item.attempt;
            const answers = parseJson<Record<string, number | string>>(attempt?.answers ?? null, {});
            const essayScores = parseJson<Record<string, number>>(attempt?.essayScores ?? null, {});
            const minutes = attempt?.submittedAt ? Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 60000) : null;
            return (
              <li key={item.studentId} className="glass-inset grid gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <bdi className="font-bold">{localized(locale, item.nameAr, item.nameEn)}</bdi>
                    {!attempt ? (
                      <Pill>{t("notStarted")}</Pill>
                    ) : !attempt.submittedAt ? (
                      <Pill tone="online" live>
                        {t("inProgress")}
                      </Pill>
                    ) : attempt.score === null ? (
                      <Pill tone="amber">{t("needsGrading")}</Pill>
                    ) : (
                      <Pill tone={Number(attempt.score) / total >= 0.65 ? "green" : "red"}>
                        <span dir="ltr">
                          {Number(attempt.score)} / {total}
                        </span>
                      </Pill>
                    )}
                    {attempt && attempt.focusLosses > 0 && (
                      <Pill tone={attempt.focusLosses >= 3 ? "red" : "amber"}>{t("focusLosses", { count: attempt.focusLosses })}</Pill>
                    )}
                    {attempt && attempt.copyEvents > 0 && <Pill tone="amber">{t("copyEvents", { count: attempt.copyEvents })}</Pill>}
                    {minutes !== null && <span className="text-xs text-text-secondary">{t("took", { minutes })}</span>}
                  </span>
                  {attempt && (
                    <form action={resetAttempt.bind(null, attempt.id)}>
                      <button type="submit" className="text-xs text-text-secondary hover:text-danger">
                        {t("reset")}
                      </button>
                    </form>
                  )}
                </div>
                {attempt?.submittedAt && (
                  <ActionForm action={gradeAttempt.bind(null, attempt.id)} className="grid gap-3">
                    {essays.map((question) => (
                      <div key={question.id} className="grid gap-1.5 text-sm">
                        <p className="font-semibold">{question.text}</p>
                        <p className="whitespace-pre-line rounded-lg bg-text-primary/5 p-2">{typeof answers[question.id] === "string" && answers[question.id] ? String(answers[question.id]) : t("noAnswer")}</p>
                        <label className="flex items-center gap-2 text-xs text-text-secondary">
                          {t("points")}
                          <input
                            name={`essay_${question.id}`}
                            inputMode="decimal"
                            dir="ltr"
                            defaultValue={essayScores[question.id] ?? ""}
                            placeholder={`/ ${Number(question.points)}`}
                            className={`${inputClass} w-24`}
                          />
                        </label>
                        <FieldError name={`essay_${question.id}`} />
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-2">
                      <input name="note" defaultValue={attempt.instructorNote ?? ""} aria-label={t("note")} placeholder={t("note")} className={`${inputClass} min-w-0 flex-1`} />
                      <SubmitButton variant="secondary">{t("save")}</SubmitButton>
                      <FormMessage />
                    </div>
                  </ActionForm>
                )}
              </li>
            );
          })}
        </ul>
      </GlassCard>

      <GlassCard title={t("questionList")}>
        <ol className="grid gap-2 text-sm">
          {questions.map((question) => {
            const options = parseJson<string[]>(question.options, []);
            return (
              <li key={question.id} className="glass-inset grid gap-1 p-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {question.position}. {question.text}
                  </span>
                  <Pill>{t(`kinds.${question.kind}`)} · {Number(question.points)}</Pill>
                </span>
                {options.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {options.map((option, index) => (
                      <li key={index} className={`rounded-md px-2 py-0.5 text-xs ${index === question.correct ? "bg-success/15 font-bold text-success" : "bg-text-primary/5 text-text-secondary"}`}>
                        {option}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </GlassCard>
    </div>
  );
}
