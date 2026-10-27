import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ExternalLink } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { buttonClass, inputClass } from "@/components/portal/ui";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { deleteAssignment, gradeSubmission } from "@/lib/academy/actions/content";
import { getAssignmentSubmissions } from "@/lib/academy/content";
import { formatSessionTime, localized } from "@/lib/academy/format";
import { requireTeachingGroup } from "@/lib/academy/teaching";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assignment } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("teaching.homework");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [row] = await db.select().from(assignment).where(eq(assignment.id, id));
  if (!row) notFound();
  const { group } = await requireTeachingGroup(user, row.groupId);
  const [t, locale, students] = await Promise.all([getTranslations("assignments"), getLocale() as Promise<Locale>, getAssignmentSubmissions(row.id, group.id)]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <Link href="/instructor/assignments" className="inline-flex w-fit items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
        <ArrowRight size={16} className="ltr:rotate-180" /> {t("title")}
      </Link>
      <section className="glass grid gap-2 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-text-primary">{row.title}</h1>
          <form action={deleteAssignment.bind(null, row.id)}>
            <button type="submit" className={buttonClass("danger")}>
              {t("delete")}
            </button>
          </form>
        </div>
        <p className="text-sm text-text-secondary">
          <bdi>{group.name}</bdi> · {t("published", { date: formatSessionTime(row.createdAt, locale) })} · {t("due", { date: formatSessionTime(row.dueAt, locale) })} ·{" "}
          {t("outOf", { max: row.maxScore })}
        </p>
        {row.instructions && <p className="whitespace-pre-line text-sm text-text-primary">{row.instructions}</p>}
        {row.link && (
          <a href={row.link} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-info hover:underline">
            <ExternalLink size={14} /> {t("openLink")}
          </a>
        )}
      </section>

      <GlassCard title={t("submissions")}>
        <ul className="grid gap-3">
          {students.map((item) => {
            const sub = item.submission;
            const late = sub?.submittedAt && sub.submittedAt > row.dueAt;
            return (
              <li key={item.studentId} className="glass-inset grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <div className="grid content-start gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <bdi className="font-bold">{localized(locale, item.nameAr, item.nameEn)}</bdi>
                    {sub?.submittedAt ? (
                      <Pill tone={late ? "amber" : "green"}>{late ? t("late") : t("submitted")}</Pill>
                    ) : (
                      <Pill tone="red">{t("missing")}</Pill>
                    )}
                    {sub?.gradedAt && <Pill tone="online">{t("graded")}</Pill>}
                  </div>
                  {sub?.submittedAt && <p className="text-xs text-text-secondary">{formatSessionTime(sub.submittedAt, locale)}</p>}
                  {sub?.url && (
                    <a href={sub.url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm text-info hover:underline">
                      <ExternalLink size={14} /> {t("openWork")}
                    </a>
                  )}
                  {sub?.note && <p className="text-sm text-text-secondary">{sub.note}</p>}
                </div>
                <ActionForm action={gradeSubmission.bind(null, row.id, item.studentId)} className="flex flex-wrap items-start gap-2">
                  <div className="w-24">
                    <input name="score" inputMode="decimal" dir="ltr" defaultValue={sub?.score ?? ""} aria-label={t("score")} placeholder={`/ ${row.maxScore}`} className={inputClass} />
                    <FieldError name="score" />
                  </div>
                  <input name="feedback" defaultValue={sub?.feedback ?? ""} aria-label={t("feedback")} placeholder={t("feedback")} className={`${inputClass} min-w-0 flex-1`} />
                  <SubmitButton variant="secondary">{t("saveGrade")}</SubmitButton>
                  <FormMessage />
                </ActionForm>
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </div>
  );
}
