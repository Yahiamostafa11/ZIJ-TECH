import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ExternalLink } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Field, inputClass } from "@/components/portal/ui";
import { AttendanceSheet } from "@/components/teaching/AttendanceSheet";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { postponeSession, saveAttendance } from "@/lib/academy/actions/teaching";
import { formatDateTime, formatSessionTime, localized } from "@/lib/academy/format";
import { getSessionRoster, requireTeachingSession, sessionStarted } from "@/lib/academy/teaching";
import { cairoParts, whatsappNumber } from "@/lib/academy/time";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function InstructorSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("teaching.attendance");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const detail = await requireTeachingSession(user, id);
  const { session, group } = detail;

  const [t, locale, roster] = await Promise.all([
    getTranslations("teaching"),
    getLocale() as Promise<Locale>,
    getSessionRoster(session.id, group.id),
  ]);

  const started = sessionStarted(session.scheduledAt);
  const editable = started && session.status !== "cancelled";
  const levelName = localized(locale, detail.levelNameAr, detail.levelNameEn);
  const title = session.kind === "remedial" ? t("remedialNumber", { number: session.number }) : t("sessionNumber", { number: session.number });
  const instructorName = localized(locale, user.nameAr, user.nameEn) || user.name;
  const today = cairoParts(new Date()).date;

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <Link href={`/instructor/groups/${group.id}`} className="inline-flex w-fit items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
        <ArrowRight size={16} className="ltr:rotate-180" /> <bdi>{group.name}</bdi>
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-text-primary">
            {title} · <bdi className="font-dmsans">{group.name}</bdi>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {levelName} · {formatSessionTime(session.scheduledAt, locale)} · {t("minutes", { minutes: session.durationMinutes })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={group.mode === "online" ? "online" : "offline"}>
            {group.mode === "online" ? t("online") : localized(locale, detail.branchNameAr, detail.branchNameEn)}
          </Pill>
          {session.status === "held" && <Pill tone="green">{t("sessionState.held")}</Pill>}
          {group.meetingUrl && (
            <a href={group.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-info hover:underline">
              <ExternalLink size={14} /> {t("meetingLink")}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GlassCard title={t("sheet.title")}>
          {!started && <p className="mb-4 rounded-xl bg-info/10 px-4 py-3 text-sm text-info">{t("sheet.notYet")}</p>}
          {roster.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("sheet.noStudents")}</p>
          ) : (
            <AttendanceSheet
              action={saveAttendance.bind(null, session.id)}
              editable={editable}
              absenceMessage={t("absenceMessage", { instructor: instructorName, group: group.name, session: title, name: "{name}" })}
              rows={roster.map((row) => ({
                studentId: row.studentId,
                name: localized(locale, row.nameAr, row.nameEn),
                record: row.record,
                phones: row.phones.map((phone) => ({ relation: phone.relation, phone: phone.phone, whatsapp: whatsappNumber(phone.phone) })),
              }))}
            />
          )}
        </GlassCard>

        <div className="grid content-start gap-6">
          {session.status === "held" && (
            <GlassCard title={t("sheet.credited")}>
              <p className="text-sm text-text-secondary">
                {t("sheet.creditedBody", { date: formatDateTime(session.heldAt, locale) })}
              </p>
            </GlassCard>
          )}

          {session.status === "scheduled" && (
            <GlassCard title={t("postpone.title")}>
              {session.originalScheduledAt && (
                <p className="mb-3 text-xs text-warning">
                  {t("postponedFrom", { date: formatSessionTime(session.originalScheduledAt, locale) })}
                </p>
              )}
              <ActionForm action={postponeSession.bind(null, session.id)} className="grid gap-3">
                <Field label={t("postpone.date")} htmlFor="pp-date">
                  <input id="pp-date" name="date" type="date" min={today} className={inputClass} />
                  <FieldError name="date" />
                </Field>
                <Field label={t("postpone.time")} htmlFor="pp-time">
                  <input id="pp-time" name="time" type="time" dir="ltr" defaultValue={cairoParts(session.scheduledAt).time} className={inputClass} />
                  <FieldError name="time" />
                </Field>
                <Field label={t("postpone.reason")} htmlFor="pp-reason">
                  <input id="pp-reason" name="reason" maxLength={255} className={inputClass} />
                  <FieldError name="reason" />
                </Field>
                <SubmitButton variant="secondary">{t("postpone.submit")}</SubmitButton>
                <FormMessage />
              </ActionForm>
              <p className="mt-3 text-xs leading-6 text-text-secondary">{t("postpone.hint")}</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
