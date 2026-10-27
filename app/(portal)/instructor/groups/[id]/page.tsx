import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Field, inputClass } from "@/components/portal/ui";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { SessionList } from "@/components/teaching/SessionList";
import { requestStudent } from "@/lib/academy/actions/teaching";
import { formatDateTime, localized } from "@/lib/academy/format";
import {
  ensureSessions,
  getGroupProgress,
  listGroupRequests,
  listGroupSessions,
  requireTeachingGroup,
} from "@/lib/academy/teaching";
import { requirePermission } from "@/lib/auth/session";
import { CRITERIA } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

function scoreTone(value: number | null) {
  if (value === null) return "text-text-secondary";
  if (value >= 3.5) return "text-success";
  if (value < 2.5) return "text-danger";
  return "text-text-primary";
}

export default async function InstructorGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("portal.instructor");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const detail = await requireTeachingGroup(user, id);
  const { group } = detail;
  await ensureSessions([group.id]);

  const [t, locale, sessions, progress, requests] = await Promise.all([
    getTranslations("teaching"),
    getLocale() as Promise<Locale>,
    listGroupSessions(group.id),
    getGroupProgress(group.id),
    listGroupRequests(group.id),
  ]);
  const held = sessions.filter((session) => session.status === "held").length;

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-dmsans text-2xl font-extrabold text-text-primary" dir="ltr">
            {group.name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {localized(locale, detail.levelNameAr, detail.levelNameEn)} · {t("groups.progress", { held, total: detail.sessionCount })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={group.mode === "online" ? "online" : "offline"}>
            {group.mode === "online" ? t("online") : localized(locale, detail.branchNameAr, detail.branchNameEn)}
          </Pill>
          {group.meetingUrl && (
            <a href={group.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-info hover:underline">
              <ExternalLink size={14} /> {t("meetingLink")}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <GlassCard title={t("groupPage.sessions")}>
            {sessions.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("groupPage.noSessions")}</p>
            ) : (
              <SessionList sessions={sessions} linkBase="/instructor/sessions/" />
            )}
          </GlassCard>

          <GlassCard title={t("groupPage.progress")}>
            {progress.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("groupPage.noProgress")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-xs text-text-secondary">
                      <th className="px-2 py-2 text-start font-semibold">{t("groupPage.student")}</th>
                      <th className="px-2 py-2 text-start font-semibold">{t("groupPage.attendance")}</th>
                      {CRITERIA.map((criterion) => (
                        <th key={criterion} className="px-2 py-2 text-start font-semibold">
                          {t(`criteriaShort.${criterion}`)}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-start font-semibold">{t("groupPage.overall")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((row) => (
                      <tr key={row.studentId} className="border-t border-border-subtle/50">
                        <td className="px-2 py-2.5 font-semibold">
                          <Link href={`/instructor/groups/${group.id}/students/${row.studentId}`} className="text-gold-light hover:underline">
                            <bdi>{localized(locale, row.nameAr, row.nameEn)}</bdi>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 font-dmsans tabular-nums">
                          {row.attended}/{row.counted}
                        </td>
                        {CRITERIA.map((criterion) => (
                          <td key={criterion} className={`px-2 py-2.5 font-dmsans tabular-nums ${scoreTone(row.scores[criterion])}`}>
                            {row.scores[criterion]?.toFixed(1) ?? "—"}
                          </td>
                        ))}
                        <td className={`px-2 py-2.5 font-dmsans font-bold tabular-nums ${scoreTone(row.overall)}`}>
                          {row.overall?.toFixed(1) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-text-secondary">{t("groupPage.progressHint")} {t("groupPage.reportHint")}</p>
              </div>
            )}
          </GlassCard>
        </div>

        <div className="grid content-start gap-6">
          <GlassCard title={t("request.title")}>
            <p className="mb-4 text-xs leading-6 text-text-secondary">{t("request.hint")}</p>
            <ActionForm action={requestStudent.bind(null, group.id)} resetOnSuccess className="grid gap-3">
              <Field label={t("request.nameAr")} htmlFor="req-nameAr">
                <input id="req-nameAr" name="nameAr" dir="rtl" className={inputClass} />
                <FieldError name="nameAr" />
              </Field>
              <Field label={t("request.nameEn")} htmlFor="req-nameEn">
                <input id="req-nameEn" name="nameEn" dir="ltr" className={inputClass} />
                <FieldError name="nameEn" />
              </Field>
              <Field label={t("request.birthDate")} htmlFor="req-birthDate">
                <input id="req-birthDate" name="birthDate" type="date" className={inputClass} />
                <FieldError name="birthDate" />
              </Field>
              <Field label={t("request.motherPhone")} htmlFor="req-motherPhone">
                <input id="req-motherPhone" name="motherPhone" type="tel" dir="ltr" placeholder="01xxxxxxxxx" className={inputClass} />
                <FieldError name="motherPhone" />
              </Field>
              <Field label={t("request.fatherPhone")} htmlFor="req-fatherPhone">
                <input id="req-fatherPhone" name="fatherPhone" type="tel" dir="ltr" placeholder="01xxxxxxxxx" className={inputClass} />
                <FieldError name="fatherPhone" />
              </Field>
              <Field label={t("request.notes")} htmlFor="req-notes">
                <textarea id="req-notes" name="notes" rows={2} className={`${inputClass} resize-none`} />
                <FieldError name="notes" />
              </Field>
              <SubmitButton>{t("request.submit")}</SubmitButton>
              <FormMessage />
            </ActionForm>
          </GlassCard>

          {requests.length > 0 && (
            <GlassCard title={t("request.history")}>
              <ul className="grid gap-2.5">
                {requests.map((request) => (
                  <li key={request.id} className="glass-inset grid gap-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <bdi className="text-sm font-semibold">{request.nameAr}</bdi>
                      <Pill tone={request.status === "approved" ? "green" : request.status === "rejected" ? "red" : "amber"}>
                        {t(`request.status.${request.status}`)}
                      </Pill>
                    </div>
                    <p className="text-xs text-text-secondary">{formatDateTime(request.reviewedAt ?? request.createdAt, locale)}</p>
                    {request.reviewNote && <p className="text-xs text-text-secondary">{request.reviewNote}</p>}
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
