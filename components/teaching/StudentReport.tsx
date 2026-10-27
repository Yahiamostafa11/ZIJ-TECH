import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { getStudentReport } from "@/lib/academy/feedback";
import { localized } from "@/lib/academy/format";
import { CRITERIA } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";
import { GlassCard, Pill } from "./Glass";

type Report = NonNullable<Awaited<ReturnType<typeof getStudentReport>>>;

const one = (value: number | null) => (value === null ? "—" : value.toFixed(1));

function Sparkline({ points }: { points: (number | null)[] }) {
  const values = points.map((value, index) => [index, value] as const).filter((pair): pair is readonly [number, number] => pair[1] !== null);
  if (values.length < 2) return null;
  const W = 320;
  const H = 70;
  const x = (index: number) => 8 + ((W - 16) * index) / Math.max(points.length - 1, 1);
  const y = (value: number) => H - 8 - ((H - 16) * (value - 1)) / 3;
  const path = values.map(([index, value], i) => `${i ? "L" : "M"}${x(index)},${y(value)}`).join(" ");
  return (
    <div dir="ltr">
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-sm" aria-hidden="true">
      {[1, 2, 3, 4].map((level) => (
        <line key={level} x1={8} x2={W - 8} y1={y(level)} y2={y(level)} stroke="rgb(var(--gold-primary) / 0.15)" strokeDasharray="3 4" />
      ))}
      <path d={path} fill="none" stroke="rgb(var(--gold-primary))" strokeWidth={2.5} strokeLinejoin="round" />
      {values.map(([index, value]) => (
        <circle key={index} cx={x(index)} cy={y(value)} r={3} fill="rgb(var(--gold-primary))" />
      ))}
    </svg>
    </div>
  );
}

/** One student's progress in a group, from the instructor, the student and the parent. */
export async function StudentReport({ report, groupName }: { report: Report; groupName: string }) {
  const [t, tCriteria, locale] = await Promise.all([
    getTranslations("report"),
    getTranslations("teaching.criteria"),
    getLocale() as Promise<Locale>,
  ]);
  const name = localized(locale, report.student.nameAr, report.student.nameEn);
  const { studentView, parentView } = report;
  const emoji = (value: number | null) => (value === null ? "—" : value >= 2.5 ? "😄" : value >= 1.75 ? "😐" : "😕");

  return (
    <div className="grid gap-6">
      <section className="glass flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            <bdi>{name}</bdi>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            <bdi>{groupName}</bdi> · {t("attendance", { attended: report.attendance.attended, total: report.attendance.counted })}
          </p>
        </div>
        <div className="text-center">
          <p className="font-dmsans text-4xl font-extrabold tabular-nums text-gold-light">{one(report.overall)}</p>
          <p className="text-xs text-text-secondary">{t("overall")}</p>
        </div>
      </section>

      {report.flags.length > 0 && (
        <section className="glass grid gap-2 border-warning/40 p-5">
          <h2 className="font-bold text-warning">{t("flagsTitle")}</h2>
          <ul className="grid gap-1.5 text-sm text-text-primary">
            {report.flags.map((flag) => (
              <li key={flag}>
                • {t(`flags.${flag}`, { criteria: report.trendDown.map((criterion) => tCriteria(criterion)).join("، ") })}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard title={t("criteriaTitle")}>
          <ul className="grid gap-3">
            {CRITERIA.map((criterion) => {
              const item = report.criteria[criterion];
              const tone = item.average === null ? "bg-text-secondary/30" : item.average >= 3.5 ? "bg-success" : item.average < 2.5 ? "bg-danger" : "bg-gold-primary";
              return (
                <li key={criterion} className="grid gap-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{tCriteria(criterion)}</span>
                    <span className="flex items-center gap-1 font-dmsans font-bold tabular-nums" dir="ltr">
                      {item.trend !== null && item.trend >= 0.5 && <ArrowUpRight size={15} className="text-success" aria-label={t("up")} />}
                      {item.trend !== null && item.trend <= -0.5 && <ArrowDownRight size={15} className="text-danger" aria-label={t("down")} />}
                      {one(item.average)} / 4
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-text-primary/10">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${((item.average ?? 0) / 4) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-5">
            <p className="mb-1 text-xs text-text-secondary">{t("trendTitle")}</p>
            <Sparkline points={report.sessionAverages.map((row) => row.value)} />
          </div>
        </GlassCard>

        <div className="grid content-start gap-6">
          <GlassCard title={t("strengths")}>
            {report.strengths.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noStrengths")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.strengths.map((criterion) => (
                  <Pill key={criterion} tone="green">
                    {tCriteria(criterion)}
                  </Pill>
                ))}
              </div>
            )}
          </GlassCard>
          <GlassCard title={t("improve")}>
            {report.improve.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noImprove")}</p>
            ) : (
              <ul className="grid gap-3">
                {report.improve.map((criterion) => (
                  <li key={criterion} className="text-sm">
                    <Pill tone="red">{tCriteria(criterion)}</Pill>
                    <p className="mt-1.5 leading-6 text-text-secondary">{t(`suggestion.${criterion}`)}</p>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard title={t("studentView")}>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                ["enjoyed", studentView.enjoyed],
                ["understood", studentView.understood],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="glass-inset p-3">
                <dt className="text-xs text-text-secondary">{t(`self.${key}`)}</dt>
                <dd className="mt-1 text-3xl">{emoji(value)}</dd>
              </div>
            ))}
            <div className="glass-inset p-3">
              <dt className="text-xs text-text-secondary">{t("self.difficulty")}</dt>
              <dd className="mt-2 text-sm font-bold">
                {studentView.difficulty === null ? "—" : t(`difficulty.${Math.round(studentView.difficulty)}`)}
              </dd>
            </div>
          </dl>
          {studentView.texts.length > 0 && (
            <ul className="mt-4 grid gap-2 text-sm">
              {studentView.texts.map((item, index) => (
                <li key={index} className="glass-inset px-3 py-2">
                  <span className="text-xs text-text-secondary">{t(`self.${item.key}`)} · {t("sessionShort", { number: item.number })}</span>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          )}
          {studentView.enjoyed === null && <p className="mt-3 text-xs text-text-secondary">{t("noAnswers")}</p>}
        </GlassCard>

        <GlassCard title={t("parentView")}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(["enthusiasm", "thinking", "confidence", "communication", "value"] as const).map((key) =>
              parentView[key] === null ? null : (
                <div key={key} className="glass-inset p-3">
                  <dt className="text-xs text-text-secondary">{t(`parent.${key}`)}</dt>
                  <dd className="mt-1 font-dmsans text-xl font-bold tabular-nums" dir="ltr">{one(parentView[key])} / 5</dd>
                </div>
              ),
            )}
            {parentView.showed !== null && (
              <div className="glass-inset p-3">
                <dt className="text-xs text-text-secondary">{t("parent.showed")}</dt>
                <dd className="mt-1 font-dmsans text-xl font-bold tabular-nums" dir="ltr">{Math.round(parentView.showed * 100)}%</dd>
              </div>
            )}
            {parentView.recommend !== null && (
              <div className="glass-inset p-3">
                <dt className="text-xs text-text-secondary">{t("parent.recommend")}</dt>
                <dd className="mt-1 font-dmsans text-xl font-bold tabular-nums" dir="ltr">{parentView.recommend} / 10</dd>
              </div>
            )}
          </dl>
          {parentView.comments.length > 0 && (
            <ul className="mt-4 grid gap-2 text-sm">
              {parentView.comments.map((item, index) => (
                <li key={index} className="glass-inset px-3 py-2">
                  <span className="text-xs text-text-secondary">{t("sessionShort", { number: item.number })}</span>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          )}
          {parentView.enthusiasm === null && <p className="mt-3 text-xs text-text-secondary">{t("noAnswers")}</p>}
        </GlassCard>
      </div>

      {report.notes.length > 0 && (
        <GlassCard title={t("notes")}>
          <ul className="grid gap-2 text-sm">
            {report.notes.map((item, index) => (
              <li key={index} className="glass-inset px-3 py-2">
                <span className="text-xs text-text-secondary">{t("sessionShort", { number: item.number })}</span>
                <p>{item.note}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
