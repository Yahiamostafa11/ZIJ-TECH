import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { buttonClass } from "@/components/portal/ui";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { QuizUploadForm } from "@/components/teaching/QuizUploadForm";
import { createQuiz } from "@/lib/academy/actions/quiz";
import { formatSessionTime, localized, todayInCairo } from "@/lib/academy/format";
import { getGroupQuizMatrix, listGroupStudents, listInstructorQuizzes } from "@/lib/academy/quiz";
import { listTeachingGroups, requireTeachingGroup } from "@/lib/academy/teaching";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

function quizState(row: { opensAt: Date; closesAt: Date }) {
  const now = Date.now();
  return now < row.opensAt.getTime() ? "upcoming" : now > row.closesAt.getTime() ? "closed" : "open";
}

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const user = await requirePermission("teaching.grades");
  const [t, locale, quizzes, groups] = await Promise.all([
    getTranslations("quizzes"),
    getLocale() as Promise<Locale>,
    listInstructorQuizzes(user.id),
    listTeachingGroups(user.id, false),
  ]);
  // Open on the group of the latest quiz, so the results show something useful.
  const latestGroup = groups.find((group) => group.id === quizzes[0]?.quiz.groupId);
  const groupId = Number((await searchParams).group) || latestGroup?.id || groups[0]?.id;
  const matrixGroup = groupId ? await requireTeachingGroup(user, groupId) : null;
  const [matrix, roster] = matrixGroup ? await Promise.all([getGroupQuizMatrix(matrixGroup.group.id), listGroupStudents(matrixGroup.group.id)]) : [null, []];

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("description")}</p>
        </div>
        <a href="/instructor/quizzes/template" download="zij-quiz-template.xlsx" className={buttonClass("secondary")}>
          <Download size={16} /> {t("template")}
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <GlassCard title={t("all")}>
          {quizzes.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("none")}</p>
          ) : (
            <ul className="grid gap-2.5">
              {quizzes.map((row) => {
                const state = quizState(row.quiz);
                return (
                  <li key={row.quiz.id}>
                    <Link href={`/instructor/quizzes/${row.quiz.id}`} className="glass-inset grid gap-1 p-3 transition hover:bg-gold-primary/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold">{row.quiz.title}</span>
                        <Pill tone={state === "open" ? "green" : state === "upcoming" ? "online" : "neutral"} live={state === "open"}>
                          {t(`states.${state}`)}
                        </Pill>
                      </div>
                      <p className="text-xs text-text-secondary">
                        <bdi>{row.groupName}</bdi> · {t(`purposes.${row.quiz.purpose}`)} · {t("questions", { count: row.questions })} ·{" "}
                        {t("submitted", { done: row.submitted, total: row.students })}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatSessionTime(row.quiz.opensAt, locale)} → {formatSessionTime(row.quiz.closesAt, locale)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard title={t("new")}>
          {groups.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noGroups")}</p>
          ) : (
            <>
              <p className="mb-3 text-xs leading-6 text-text-secondary">{t("newHint")}</p>
              <QuizUploadForm action={createQuiz} groups={groups.map((group) => ({ id: group.id, name: group.name }))} today={todayInCairo()} />
            </>
          )}
        </GlassCard>
      </div>

      {matrixGroup && matrix && (
        <GlassCard
          title={t("byGroup")}
          actions={
            <nav className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/instructor/quizzes?group=${group.id}`}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${group.id === matrixGroup.group.id ? "bg-gold-gradient text-on-accent" : "border border-border-subtle text-text-secondary"}`}
                >
                  {group.name}
                </Link>
              ))}
            </nav>
          }
        >
          {matrix.quizzes.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noQuizzesInGroup")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-xs text-text-secondary">
                    <th className="px-2 py-2 text-start font-semibold">{t("student")}</th>
                    {matrix.quizzes.map((row) => (
                      <th key={row.id} className="px-2 py-2 text-start font-semibold">
                        <Link href={`/instructor/quizzes/${row.id}`} className="hover:text-gold-light">
                          {row.title}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((person) => (
                    <tr key={person.studentId} className="border-t border-border-subtle/50">
                      <td className="px-2 py-2 font-semibold">
                        <bdi>{localized(locale, person.nameAr, person.nameEn)}</bdi>
                      </td>
                      {matrix.quizzes.map((row) => {
                        const attempt = matrix.attempts.find((item) => item.quizId === row.id && item.studentId === person.studentId);
                        const total = matrix.totals.get(row.id) ?? 0;
                        const pct = attempt?.score != null && total ? Math.round((Number(attempt.score) / total) * 100) : null;
                        return (
                          <td key={row.id} className="px-2 py-2 font-dmsans tabular-nums">
                            {pct !== null ? (
                              <span className={pct >= 65 ? "text-success" : "text-danger"}>{pct}%</span>
                            ) : attempt?.submittedAt ? (
                              <span className="text-warning">{t("needsGrading")}</span>
                            ) : (
                              <span className="text-text-secondary">—</span>
                            )}
                            {attempt && attempt.focusLosses >= 3 && <span className="ms-1 text-warning" title={t("focusFlag")}>⚠</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
