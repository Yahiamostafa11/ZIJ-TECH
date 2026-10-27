import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Award } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { inputClass } from "@/components/portal/ui";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { createRemedialSessions, issueCertificates, saveGrading, saveProjectScore } from "@/lib/academy/actions/grading";
import { localized, todayInCairo } from "@/lib/academy/format";
import { COMPONENTS, allSessionsHeld, getGroupResults } from "@/lib/academy/grading";
import { requireTeachingGroup } from "@/lib/academy/teaching";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { groupSlot, level } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value)}%`);

export default async function GradesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("teaching.grades");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const detail = await requireTeachingGroup(user, id);
  const { group } = detail;
  const [t, locale, results, finished, [lvl], [slot]] = await Promise.all([
    getTranslations("grades"),
    getLocale() as Promise<Locale>,
    getGroupResults(group.id),
    allSessionsHeld(group.id),
    db.select({ min: level.remedialMin, max: level.remedialMax }).from(level).where(eq(level.id, group.levelId)),
    db.select().from(groupSlot).where(eq(groupSlot.groupId, group.id)).limit(1),
  ]);
  const { grading, rows } = results;
  const failed = rows.filter((row) => row.final !== null && !row.passed);
  const eligible = rows.filter((row) => row.passed && !row.certificate);
  const name = (row: { nameAr: string; nameEn: string | null }) => localized(locale, row.nameAr, row.nameEn);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <Link href={`/instructor/groups/${group.id}`} className="inline-flex w-fit items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
        <ArrowRight size={16} className="ltr:rotate-180" /> <bdi>{group.name}</bdi>
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("description", { mark: grading.passMark })}</p>
      </div>

      <GlassCard title={t("formula")}>
        <ActionForm action={saveGrading.bind(null, group.id)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {COMPONENTS.map((key) => (
              <label key={key} className="grid gap-1.5 text-sm text-text-secondary">
                {t(`components.${key}`)} %
                <input name={key} type="number" min={0} max={100} defaultValue={grading[key]} dir="ltr" className={inputClass} />
              </label>
            ))}
            <label className="grid gap-1.5 text-sm font-semibold text-gold-light">
              {t("passMark")} %
              <input name="passMark" type="number" min={1} max={100} defaultValue={grading.passMark} dir="ltr" className={inputClass} />
            </label>
          </div>
          <p className="text-xs leading-6 text-text-secondary">{t("formulaHint")}</p>
          <div className="flex items-center gap-3">
            <SubmitButton variant="secondary">{t("saveFormula")}</SubmitButton>
            <FormMessage />
          </div>
        </ActionForm>
      </GlassCard>

      <GlassCard title={t("results")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-xs text-text-secondary">
                <th className="px-2 py-2 text-start font-semibold">{t("student")}</th>
                {COMPONENTS.filter((key) => key !== "project").map((key) => (
                  <th key={key} className="px-2 py-2 text-start font-semibold">
                    {t(`components.${key}`)}
                  </th>
                ))}
                <th className="px-2 py-2 text-start font-semibold">{t("components.project")}</th>
                <th className="px-2 py-2 text-start font-semibold">{t("final")}</th>
                <th className="px-2 py-2 text-start font-semibold">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="border-t border-border-subtle/50 align-middle">
                  <td className="px-2 py-2.5 font-semibold">
                    <Link href={`/instructor/groups/${group.id}/students/${row.studentId}`} className="hover:text-gold-light">
                      <bdi>{name(row)}</bdi>
                    </Link>
                  </td>
                  {COMPONENTS.filter((key) => key !== "project").map((key) => (
                    <td key={key} className="px-2 py-2.5 font-dmsans tabular-nums">
                      {pct(row.parts[key])}
                    </td>
                  ))}
                  <td className="px-2 py-2.5">
                    <ActionForm action={saveProjectScore.bind(null, group.id, row.studentId)} className="flex items-center gap-1.5">
                      <input name="score" inputMode="decimal" dir="ltr" defaultValue={row.parts.project ?? ""} aria-label={t("projectScore", { name: name(row) })} placeholder="/100" className={`${inputClass} w-20 px-2 py-1`} />
                      <SubmitButton variant="secondary" className="px-2 py-1 text-xs">
                        {t("save")}
                      </SubmitButton>
                      <FieldError name="score" />
                    </ActionForm>
                  </td>
                  <td className={`px-2 py-2.5 font-dmsans text-base font-bold tabular-nums ${row.final === null ? "" : row.passed ? "text-success" : "text-danger"}`}>{pct(row.final)}</td>
                  <td className="px-2 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {row.final === null ? <Pill>{t("noData")}</Pill> : row.passed ? <Pill tone="green">{t("passed")}</Pill> : <Pill tone="red">{t("failed")}</Pill>}
                      {row.remedial && <Pill tone="amber">{t("inRemedial")}</Pill>}
                      {row.certificate && (
                        <Link href={`/certificate/${row.certificate.code}`}>
                          <Pill tone="offline">
                            <Award size={12} /> {t("certificate")}
                          </Pill>
                        </Link>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard title={t("remedialTitle")}>
          <p className="mb-3 text-xs leading-6 text-text-secondary">{t("remedialHint", { min: lvl?.min ?? 2, max: lvl?.max ?? 4 })}</p>
          <ActionForm action={createRemedialSessions.bind(null, group.id)} className="grid gap-3">
            <fieldset className="flex flex-wrap gap-3">
              <legend className="mb-1 text-sm text-text-secondary">{t("remedialStudents")}</legend>
              {rows.map((row) => (
                <label key={row.studentId} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="students[]" value={row.studentId} defaultChecked={failed.some((item) => item.studentId === row.studentId)} className="accent-[rgb(var(--gold-primary))]" />
                  <bdi>{name(row)}</bdi>
                </label>
              ))}
            </fieldset>
            <FieldError name="students" />
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm text-text-secondary">
                {t("count")}
                <input name="count" type="number" min={1} max={10} defaultValue={lvl?.min ?? 2} dir="ltr" className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm text-text-secondary">
                {t("firstDate")}
                <input name="firstDate" type="date" min={todayInCairo()} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm text-text-secondary">
                {t("time")}
                <input name="time" type="time" defaultValue={slot?.startTime.slice(0, 5) ?? "16:00"} dir="ltr" className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm text-text-secondary">
                {t("every")}
                <input name="every" type="number" min={1} max={14} defaultValue={7} dir="ltr" className={inputClass} />
              </label>
            </div>
            <FieldError name="firstDate" />
            <div className="flex items-center gap-3">
              <SubmitButton>{t("createRemedial")}</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </GlassCard>

        <GlassCard title={t("certificatesTitle")}>
          {!finished && group.status !== "completed" ? (
            <p className="text-sm text-text-secondary">{t("certificatesLater")}</p>
          ) : eligible.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noEligible")}</p>
          ) : (
            <ActionForm action={issueCertificates.bind(null, group.id)} className="grid gap-3">
              <fieldset className="flex flex-wrap gap-3">
                {eligible.map((row) => (
                  <label key={row.studentId} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="students[]" value={row.studentId} defaultChecked className="accent-[rgb(var(--gold-primary))]" />
                    <bdi>{name(row)}</bdi> <span className="font-dmsans text-xs text-success">{pct(row.final)}</span>
                  </label>
                ))}
              </fieldset>
              <div className="flex items-center gap-3">
                <SubmitButton>{t("issue")}</SubmitButton>
                <FormMessage />
              </div>
            </ActionForm>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
