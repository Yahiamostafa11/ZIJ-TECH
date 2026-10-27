import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarCheck, CircleCheck, CircleMinus, Coins, Gift, Hourglass, Video } from "lucide-react";
import { buttonClass } from "@/components/portal/ui";
import { AutoRefresh } from "@/components/teaching/AutoRefresh";
import { EarningsChart } from "@/components/teaching/EarningsChart";
import { GlassCard, Pill, StatTile } from "@/components/teaching/Glass";
import { formatClock, formatDate, formatMoney, formatMonth, formatSessionTime, localized } from "@/lib/academy/format";
import { getMonthStatement, getPayrollBalance } from "@/lib/academy/payroll";
import { getRecentFeedback } from "@/lib/academy/feedback";
import { getInstructorActivity, getInstructorHome } from "@/lib/academy/teaching";
import { cairoParts } from "@/lib/academy/time";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

/** Keeps a name in its own direction inside a sentence in the other language. */
const isolate = (text: string) => `\u2068${text}\u2069`;

function minutesUntil(at: Date) {
  return Math.round((at.getTime() - Date.now()) / 60000);
}

function relativeTime(at: Date, locale: Locale) {
  const minutes = minutesUntil(at);
  const format = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  if (Math.abs(minutes) < 60 * 24) return format.format(Math.round(minutes / 60), "hour");
  return format.format(Math.round(minutes / 1440), "day");
}

export default async function InstructorHomePage() {
  const user = await requirePermission("portal.instructor");
  const month = cairoParts(new Date()).month;
  const [t, tAll, locale, home, activity, statement, balance] = await Promise.all([
    getTranslations("teaching"),
    getTranslations(),
    getLocale() as Promise<Locale>,
    getInstructorHome(user.id),
    getInstructorActivity(user.id),
    getMonthStatement(user.id, month),
    getPayrollBalance(user.id),
  ]);
  const reviews = await getRecentFeedback(user.id);
  const lastOf = (kind: "bonus" | "deduction") => statement.adjustments.filter((row) => row.kind === kind).at(-1)?.reason;

  const firstName = localized(locale, user.nameAr, user.nameEn).split(" ")[0] || user.name.split(" ")[0];
  const hour = Number(cairoParts(new Date()).time.slice(0, 2));
  const greeting = hour < 12 ? t("home.morning", { name: firstName }) : t("home.evening", { name: firstName });
  const next = home.next;
  const nextMinutes = next ? minutesUntil(next.scheduledAt) : null;
  const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);
  const place = (row: { mode: "online" | "offline"; branchNameAr: string | null; branchNameEn: string | null }) =>
    row.mode === "online" ? t("online") : localized(locale, row.branchNameAr, row.branchNameEn);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <AutoRefresh seconds={30} />

      <section className="glass flex flex-wrap items-center justify-between gap-5 bg-[linear-gradient(135deg,rgb(var(--gold-light)/0.22),rgb(var(--info)/0.10))] p-6 md:p-7">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-text-primary md:text-3xl">{greeting}</h1>
          <p className="mt-1 text-text-secondary">
            {t("home.summary", { sessions: home.todaySessions.length, groups: home.activeGroups })}
          </p>
        </div>
        {next ? (
          <div className="glass flex flex-wrap items-center gap-4 p-4">
            <Pill tone={next.mode === "online" ? "online" : "offline"} live={nextMinutes !== null && nextMinutes <= 60}>
              {nextMinutes !== null && nextMinutes <= 0
                ? t("home.startedAgo", { time: relativeTime(next.scheduledAt, locale) })
                : relativeTime(next.scheduledAt, locale)}
            </Pill>
            <div className="min-w-0">
              <p className="font-bold text-text-primary">
                <bdi>{next.groupName}</bdi> · {localized(locale, next.levelNameAr, next.levelNameEn)}
              </p>
              <p className="text-xs text-text-secondary">
                {t("sessionNumber", { number: next.number })} · {formatSessionTime(next.scheduledAt, locale)} · {place(next)}
              </p>
            </div>
            <Link href={`/instructor/sessions/${next.id}`} className={buttonClass("primary")}>
              {t("home.startAttendance")}
            </Link>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{t("home.noUpcoming")}</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2 text-xs">
        <Pill tone="green">
          <CalendarCheck size={12} /> {t("home.sessionsThisMonth")}: {home.month.held} / {home.month.scheduled}
        </Pill>
        <Pill tone="online">
          {t("home.students")}: {home.students}
        </Pill>
        <Pill tone="amber">
          {t("home.attendanceRate")}: {percent(home.month.attendanceRate)}
        </Pill>
        {home.pendingRequests > 0 && (
          <Pill tone="red">
            {t("home.pendingRequests")}: {home.pendingRequests}
          </Pill>
        )}
      </div>

      <Link href="/instructor/payroll" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5" aria-label={tAll("nav.payroll")}>
        <StatTile
          icon={<Coins size={16} />}
          label={t("home.earnedThisMonth", { month: formatMonth(month, locale, "long") })}
          value={formatMoney(statement.totals.net, locale)}
          sub={t("home.earnedSessions", { count: statement.totals.sessions })}
        />
        <StatTile
          tone="green"
          icon={<CircleCheck size={16} />}
          label={t("home.lastTransfer")}
          value={balance.lastPayment ? formatMoney(balance.lastPayment.amount, locale) : "—"}
          sub={balance.lastPayment ? formatDate(balance.lastPayment.paidOn, locale) : t("home.noTransfer")}
        />
        <StatTile
          tone="blue"
          icon={<Hourglass size={16} />}
          label={t("home.owed")}
          value={formatMoney(balance.owed, locale)}
          sub={t("home.owedHint")}
        />
        <StatTile tone="gold" icon={<Gift size={16} />} label={t("home.bonus")} value={formatMoney(statement.totals.bonuses, locale)} sub={lastOf("bonus") ?? t("home.none")} />
        <StatTile tone="red" icon={<CircleMinus size={16} />} label={t("home.deductions")} value={formatMoney(statement.totals.deductions, locale)} sub={lastOf("deduction") ?? t("home.none")} />
      </Link>

      <GlassCard title={t("home.chartTitle")}>
        <EarningsChart
          points={home.chart.map((point) => ({
            label: formatMonth(point.month, locale),
            earnings: point.earnings,
            earningsText: formatMoney(point.earnings, locale),
            students: point.students,
          }))}
          labels={{
            earnings: t("home.chartEarnings"),
            students: t("home.chartStudents"),
            studentsUnit: t("home.studentsUnit"),
            chart: t("home.chartTitle"),
          }}
        />
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard title={t("home.today")} actions={<Pill tone="green" live>{t("live")}</Pill>}>
          {home.todaySessions.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("home.noSessionsToday")}</p>
          ) : (
            <ul className="grid gap-2.5">
              {home.todaySessions.map((session) => (
                <li key={session.id}>
                  <Link href={`/instructor/sessions/${session.id}`} className="glass-inset grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 transition hover:bg-gold-primary/10">
                    <span className="w-16 text-center font-dmsans text-sm font-bold tabular-nums text-text-primary">
                      {formatClock(session.scheduledAt, locale)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-text-primary">
                        <bdi>{session.groupName}</bdi> · {localized(locale, session.levelNameAr, session.levelNameEn)}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {session.kind === "remedial" ? t("remedialNumber", { number: session.number }) : t("sessionNumber", { number: session.number })}
                        {session.status === "held" ? ` · ${t("sessionState.held")}` : ""}
                      </span>
                    </span>
                    <Pill tone={session.mode === "online" ? "online" : "offline"}>
                      {session.mode === "online" && <Video size={12} />}
                      {session.mode === "online" ? t("online") : `${t("offline")} · ${localized(locale, session.branchNameAr, session.branchNameEn)}`}
                    </Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard title={t("home.activity")} actions={<Pill tone="green" live>{t("autoUpdates")}</Pill>}>
          {activity.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("home.noActivity")}</p>
          ) : (
            <ul className="grid gap-3">
              {activity.map((item, index) => (
                <li key={index} className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                      item.kind === "request"
                        ? item.status === "rejected"
                          ? "bg-danger/15 text-danger"
                          : "bg-info/15 text-info"
                        : item.kind === "joined"
                          ? "bg-success/15 text-success"
                          : "bg-gold-primary/15 text-gold-light"
                    }`}
                    aria-hidden="true"
                  >
                    {item.kind === "held" ? "✓" : item.kind === "joined" ? "+" : "?"}
                  </span>
                  <p className="text-sm text-text-primary">
                    {item.kind === "held" &&
                      t("activity.held", { group: isolate(item.groupName), number: item.number })}
                    {item.kind === "joined" && t("activity.joined", { name: isolate(localized(locale, item.studentName, item.studentNameEn)), group: isolate(item.groupName) })}
                    {item.kind === "request" &&
                      t(`activity.request.${item.status}`, { name: isolate(localized(locale, item.studentName, item.studentNameEn)), group: isolate(item.groupName) })}
                    {item.kind === "request" && item.note && <span className="block text-xs text-text-secondary">{item.note}</span>}
                  </p>
                  <time className="whitespace-nowrap text-xs text-text-secondary" dateTime={item.at.toISOString()}>
                    {relativeTime(item.at, locale)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard title={t("home.reviews")}>
        {reviews.length === 0 ? (
          <p className="text-sm text-text-secondary">{t("home.noReviews")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => {
              const parent = review.respondent === "parent";
              const score = parent ? review.data.enthusiasm : review.data.enjoyed;
              const comment = parent ? review.data.comment : review.data.likedMost;
              return (
                <Link
                  key={review.id}
                  href={`/instructor/groups/${review.groupId}/students/${review.studentId}`}
                  className="glass-inset grid gap-2 p-4 transition hover:bg-gold-primary/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <bdi className="font-bold">{localized(locale, review.nameAr, review.nameEn)}</bdi>
                    <span className={parent ? "tracking-widest text-gold-light" : "text-xl"} aria-label={String(score ?? "")}>
                      {parent
                        ? "★★★★★".slice(0, Number(score) || 0) + "☆☆☆☆☆".slice(0, 5 - (Number(score) || 0))
                        : ["", "😕", "😐", "😄"][Number(score) || 0]}
                    </span>
                  </div>
                  {typeof comment === "string" && comment && <p className="text-sm text-text-primary">{comment}</p>}
                  <p className="text-xs text-text-secondary">
                    <Pill tone={parent ? "offline" : "online"}>{parent ? t("home.fromParent") : t("home.fromStudent")}</Pill>{" "}
                    <bdi>{review.groupName}</bdi> · {t("sessionNumber", { number: review.number })}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
