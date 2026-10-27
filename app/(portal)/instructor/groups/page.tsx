import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { GlassCard, Pill } from "@/components/teaching/Glass";
import { formatSessionTime, localized } from "@/lib/academy/format";
import { listTeachingGroups } from "@/lib/academy/teaching";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function InstructorGroupsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requirePermission("portal.instructor");
  const finished = (await searchParams).view === "finished";
  const [t, tAll, locale, groups, other] = await Promise.all([
    getTranslations("teaching"),
    getTranslations(),
    getLocale() as Promise<Locale>,
    listTeachingGroups(user.id, finished),
    listTeachingGroups(user.id, !finished),
  ]);
  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
      active ? "bg-gold-gradient text-on-accent" : "border border-border-subtle text-text-secondary hover:text-text-primary"
    }`;

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">{t("groups.title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("groups.description")}</p>
        </div>
        <nav className="flex gap-2" aria-label={t("groups.title")}>
          <Link href="/instructor/groups" className={tab(!finished)} aria-current={!finished ? "page" : undefined}>
            {t("groups.active")} ({finished ? other.length : groups.length})
          </Link>
          <Link href="/instructor/groups?view=finished" className={tab(finished)} aria-current={finished ? "page" : undefined}>
            {t("groups.finished")} ({finished ? groups.length : other.length})
          </Link>
        </nav>
      </div>

      {groups.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-text-secondary">{finished ? t("groups.noneFinished") : t("groups.noneActive")}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const progress = group.sessionCount ? Math.min(group.held / group.sessionCount, 1) : 0;
            return (
              <Link key={group.id} href={`/instructor/groups/${group.id}`} className="glass grid gap-3 p-5 transition hover:-translate-y-0.5 hover:border-gold-light/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-dmsans text-lg font-bold text-text-primary" dir="ltr">
                      {group.name}
                    </h2>
                    <p className="text-sm text-text-secondary">{localized(locale, group.levelNameAr, group.levelNameEn)}</p>
                  </div>
                  <Pill tone={group.mode === "online" ? "online" : "offline"}>
                    {group.mode === "online" ? t("online") : localized(locale, group.branchNameAr, group.branchNameEn)}
                  </Pill>
                </div>
                <p className="text-xs text-text-secondary">
                  {group.slots.length
                    ? group.slots.map((slot) => `${tAll(`options.weekday.${slot.weekday}`)} ${slot.startTime.slice(0, 5)}`).join(" · ")
                    : t("groups.noSchedule")}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-text-primary/10">
                  <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-xs text-text-secondary">
                  {t("groups.progress", { held: group.held, total: group.sessionCount })} · {t("groups.studentCount", { count: group.students })}
                  {group.attendanceRate !== null && ` · ${t("groups.attendance", { rate: Math.round(group.attendanceRate * 100) })}`}
                </p>
                {group.next && (
                  <p className="text-xs font-semibold text-gold-light">{t("groups.next", { date: formatSessionTime(group.next, locale) })}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
