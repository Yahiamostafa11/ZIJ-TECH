import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Field, inputClass } from "@/components/portal/ui";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { createAssignment } from "@/lib/academy/actions/content";
import { listInstructorAssignments } from "@/lib/academy/content";
import { formatSessionTime, todayInCairo } from "@/lib/academy/format";
import { listTeachingGroups } from "@/lib/academy/teaching";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function AssignmentsPage() {
  const user = await requirePermission("teaching.homework");
  const [t, locale, assignments, groups] = await Promise.all([
    getTranslations("assignments"),
    getLocale() as Promise<Locale>,
    listInstructorAssignments(user.id),
    listTeachingGroups(user.id, false),
  ]);
  const now = new Date();

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("description")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <GlassCard title={t("all")}>
          {assignments.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("none")}</p>
          ) : (
            <ul className="grid gap-2.5">
              {assignments.map(({ assignment, groupName, submitted, graded, students }) => {
                const overdue = assignment.dueAt < now;
                return (
                  <li key={assignment.id}>
                    <Link href={`/instructor/assignments/${assignment.id}`} className="glass-inset grid gap-1 p-3 transition hover:bg-gold-primary/10">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-text-primary">{assignment.title}</span>
                        <Pill tone={overdue ? "neutral" : "amber"}>{overdue ? t("closed") : t("open")}</Pill>
                      </div>
                      <p className="text-xs text-text-secondary">
                        <bdi>{groupName}</bdi> · {t("published", { date: formatSessionTime(assignment.createdAt, locale) })} ·{" "}
                        {t("due", { date: formatSessionTime(assignment.dueAt, locale) })}
                      </p>
                      <p className="text-xs text-text-secondary">{t("progress", { submitted, graded, students })}</p>
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
            <ActionForm action={createAssignment} className="grid gap-3">
              <Field label={t("group")} htmlFor="as-group">
                <select id="as-group" name="groupId" className={inputClass}>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("titleField")} htmlFor="as-title">
                <input id="as-title" name="title" className={inputClass} />
                <FieldError name="title" />
              </Field>
              <Field label={t("instructions")} htmlFor="as-instructions">
                <textarea id="as-instructions" name="instructions" rows={3} className={`${inputClass} resize-y`} />
              </Field>
              <Field label={t("link")} htmlFor="as-link" hint={t("linkHint")}>
                <input id="as-link" name="link" dir="ltr" placeholder="https://drive.google.com/…" className={inputClass} />
                <FieldError name="link" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("dueDate")} htmlFor="as-dueDate">
                  <input id="as-dueDate" name="dueDate" type="date" min={todayInCairo()} className={inputClass} />
                  <FieldError name="dueDate" />
                </Field>
                <Field label={t("dueTime")} htmlFor="as-dueTime">
                  <input id="as-dueTime" name="dueTime" type="time" defaultValue="22:00" dir="ltr" className={inputClass} />
                </Field>
              </div>
              <Field label={t("maxScore")} htmlFor="as-maxScore">
                <input id="as-maxScore" name="maxScore" type="number" min={1} max={100} defaultValue={10} dir="ltr" className={inputClass} />
                <FieldError name="maxScore" />
              </Field>
              <SubmitButton>{t("publish")}</SubmitButton>
              <FormMessage />
            </ActionForm>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
