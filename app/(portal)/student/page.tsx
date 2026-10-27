import React from "react";
import Link from "next/link";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink, Video } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { inputClass } from "@/components/portal/ui";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { RESOURCE_ICONS } from "@/components/teaching/LessonsEditor";
import { submitAssignment } from "@/lib/academy/actions/content";
import { getReleasedLessons, getStudentAssignments, getStudentGroups, getStudentSelf } from "@/lib/academy/content";
import { formatSessionTime, localized } from "@/lib/academy/format";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { classGroup } from "@/lib/db/academy";
import { classSession, quiz, quizAttempt } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600_000);
}

export default async function StudentHomePage() {
  const user = await requirePermission("portal.student");
  const [t, locale, selves] = await Promise.all([getTranslations("studentPortal"), getLocale() as Promise<Locale>, getStudentSelf(user.id)]);
  const self = selves[0];
  if (!self) {
    return (
      <div className="mx-auto max-w-3xl">
        <GlassCard>
          <p className="text-sm text-text-secondary">{t("notLinked")}</p>
        </GlassCard>
      </div>
    );
  }

  const groups = await getStudentGroups([self.id]);
  const groupIds = groups.map((group) => group.groupId);
  const [upcoming, assignments, lessons, quizzes] = await Promise.all([
    groupIds.length
      ? db
          .select({ id: classSession.id, number: classSession.number, kind: classSession.kind, scheduledAt: classSession.scheduledAt, groupName: classGroup.name, mode: classGroup.mode, meetingUrl: classGroup.meetingUrl })
          .from(classSession)
          .innerJoin(classGroup, eq(classGroup.id, classSession.groupId))
          .where(and(inArray(classSession.groupId, groupIds), eq(classSession.status, "scheduled"), gte(classSession.scheduledAt, hoursAgo(2))))
          .orderBy(asc(classSession.scheduledAt))
          .limit(3)
      : [],
    getStudentAssignments(self.id, groupIds),
    Promise.all(groups.map(async (group) => ({ group, lessons: await getReleasedLessons(group.groupId, group.levelId) }))),
    groupIds.length
      ? db
          .select({ quiz, submittedAt: quizAttempt.submittedAt, score: quizAttempt.score })
          .from(quiz)
          .leftJoin(quizAttempt, and(eq(quizAttempt.quizId, quiz.id), eq(quizAttempt.studentId, self.id)))
          .where(and(inArray(quiz.groupId, groupIds), gte(quiz.closesAt, hoursAgo(24 * 14))))
          .orderBy(asc(quiz.opensAt))
      : [],
  ]);
  const name = localized(locale, self.nameAr, self.nameEn).split(" ")[0];
  const open = assignments.filter((row) => !row.submission?.gradedAt);
  const graded = assignments.filter((row) => row.submission?.gradedAt);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <section className="glass flex flex-wrap items-center justify-between gap-4 bg-[linear-gradient(135deg,rgb(var(--gold-light)/0.22),rgb(var(--info)/0.10))] p-6">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary md:text-3xl">{t("hello", { name })}</h1>
          <p className="mt-1 text-text-secondary">{t("summary", { open: open.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Pill key={group.groupId} tone={group.mode === "online" ? "online" : "offline"}>
              <bdi>{group.groupName}</bdi> · {localized(locale, group.levelNameAr, group.levelNameEn)}
            </Pill>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <GlassCard title={t("assignments")}>
          {open.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noAssignments")}</p>
          ) : (
            <ul className="grid gap-3">
              {open.map(({ assignment, groupName, submission }) => (
                <li key={assignment.id} className="glass-inset grid gap-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-text-primary">{assignment.title}</span>
                    {submission?.submittedAt ? <Pill tone="green">{t("handedIn")}</Pill> : <Pill tone="amber">{t("due", { date: formatSessionTime(assignment.dueAt, locale) })}</Pill>}
                  </div>
                  <p className="text-xs text-text-secondary">
                    <bdi>{groupName}</bdi> · {t("outOf", { max: assignment.maxScore })}
                  </p>
                  {assignment.instructions && <p className="whitespace-pre-line text-sm">{assignment.instructions}</p>}
                  {assignment.link && (
                    <a href={assignment.link} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm text-info hover:underline">
                      <ExternalLink size={14} /> {t("openLink")}
                    </a>
                  )}
                  <ActionForm action={submitAssignment.bind(null, assignment.id)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <div>
                      <input name="url" dir="ltr" defaultValue={submission?.url ?? ""} aria-label={t("workLink")} placeholder={t("workLinkPlaceholder")} className={inputClass} />
                      <FieldError name="url" />
                    </div>
                    <SubmitButton>{submission?.submittedAt ? t("resubmit") : t("submit")}</SubmitButton>
                    <input name="note" defaultValue={submission?.note ?? ""} aria-label={t("note")} placeholder={t("note")} className={`${inputClass} sm:col-span-2`} />
                    <FormMessage />
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          {graded.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-bold text-text-secondary">{t("graded")}</h3>
              <ul className="grid gap-2">
                {graded.map(({ assignment, submission }) => (
                  <li key={assignment.id} className="glass-inset flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      {assignment.title}
                      {submission?.feedback && <span className="block text-xs text-text-secondary">{submission.feedback}</span>}
                    </span>
                    <span className="font-dmsans font-bold tabular-nums text-gold-light" dir="ltr">
                      {Number(submission?.score)} / {assignment.maxScore}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </GlassCard>

        <GlassCard title={t("nextSessions")}>
          {upcoming.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noSessions")}</p>
          ) : (
            <ul className="grid gap-2.5">
              {upcoming.map((session) => (
                <li key={session.id} className="glass-inset grid gap-1 p-3">
                  <span className="font-semibold">{formatSessionTime(session.scheduledAt, locale)}</span>
                  <span className="text-xs text-text-secondary">
                    <bdi>{session.groupName}</bdi> · {t("session", { number: session.number })}
                  </span>
                  {session.mode === "online" && session.meetingUrl && (
                    <a href={session.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-info hover:underline">
                      <Video size={14} /> {t("join")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      {quizzes.length > 0 && (
        <GlassCard title={t("quizzes")}>
          <ul className="grid gap-2.5 md:grid-cols-2">
            {quizzes.map((row) => (
              <li key={row.quiz.id}>
                <Link href={`/student/quiz/${row.quiz.id}`} className="glass-inset flex flex-wrap items-center justify-between gap-2 p-3 transition hover:bg-gold-primary/10">
                  <span>
                    <span className="block font-bold">{row.quiz.title}</span>
                    <span className="text-xs text-text-secondary">{t("quizCloses", { date: formatSessionTime(row.quiz.closesAt, locale) })}</span>
                  </span>
                  {row.submittedAt ? (
                    <Pill tone="green">{row.score !== null ? <span dir="ltr">{Number(row.score)}</span> : t("handedIn")}</Pill>
                  ) : (
                    <Pill tone="amber" live>
                      {t("quizOpen")}
                    </Pill>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {lessons.map(({ group, lessons: items }) => (
        <GlassCard key={group.groupId} title={t("lessonsOf", { level: localized(locale, group.levelNameAr, group.levelNameEn) })}>
          {items.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noLessons")}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <li key={item.id} className="glass-inset grid content-start gap-2 p-4">
                  <p className="font-bold">
                    {t("session", { number: item.number })} · {item.title}
                  </p>
                  {item.summary && <p className="whitespace-pre-line text-sm text-text-secondary">{item.summary}</p>}
                  <ul className="grid gap-1.5">
                    {item.resources.map((resource) => {
                      const Icon = RESOURCE_ICONS[resource.kind];
                      return (
                        <li key={resource.id}>
                          <a href={resource.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-info hover:underline">
                            <Icon size={15} /> {resource.title}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      ))}
    </div>
  );
}
