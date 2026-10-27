import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { FileText, Trash2 } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { inputClass } from "@/components/portal/ui";
import { removeAdjustment, voidPayrollPayment } from "@/lib/academy/actions/payroll";
import { formatDate, formatMoney, formatSessionTime } from "@/lib/academy/format";
import type { getMonthStatement } from "@/lib/academy/payroll";
import type { Locale } from "@/lib/i18n/config";
import { GlassCard, Pill } from "./Glass";

type Statement = Awaited<ReturnType<typeof getMonthStatement>>;

/** A month of pay: totals, the sessions behind them, adjustments and transfers. */
export async function PayrollStatement({ statement, manage = false }: { statement: Statement; manage?: boolean }) {
  const [t, tAll, locale] = await Promise.all([getTranslations("payroll"), getTranslations(), getLocale() as Promise<Locale>]);
  const { totals } = statement;
  const money = (value: number | string) => formatMoney(value, locale);

  const summary = [
    { label: t("sessionsAmount"), value: money(totals.sessionsAmount), sub: t("sessionsBreakdown", { offline: totals.offline, online: totals.online }), tone: "" },
    { label: t("bonuses"), value: money(totals.bonuses), tone: "text-success" },
    { label: t("deductions"), value: money(totals.deductions), tone: "text-danger" },
    { label: t("net"), value: money(totals.net), tone: "text-gold-light" },
    { label: t("paid"), value: money(totals.paid), tone: "text-success" },
    { label: t("remaining"), value: money(totals.remaining), tone: totals.remaining > 0 ? "text-warning" : "text-success" },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summary.map((item) => (
          <div key={item.label} className="glass p-4">
            <p className="text-xs font-semibold text-text-secondary">{item.label}</p>
            <p className={`mt-1 font-dmsans text-xl font-bold tabular-nums ${item.tone || "text-text-primary"}`}>{item.value}</p>
            {item.sub && <p className="mt-0.5 text-xs text-text-secondary">{item.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <GlassCard title={t("sessionsTitle", { count: totals.sessions })}>
          {statement.sessions.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noSessions")}</p>
          ) : (
            <ul className="grid gap-2">
              {statement.sessions.map((session) => (
                <li key={session.id} className="glass-inset flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <bdi className="font-semibold">{session.groupName}</bdi> ·{" "}
                    {session.kind === "remedial"
                      ? tAll("teaching.remedialNumber", { number: session.number })
                      : tAll("teaching.sessionNumber", { number: session.number })}
                    <span className="block text-xs text-text-secondary">{formatSessionTime(session.scheduledAt, locale)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Pill tone={session.mode === "online" ? "online" : "offline"}>{tAll(`teaching.${session.mode ?? "offline"}`)}</Pill>
                    <span className="font-dmsans font-bold tabular-nums">{money(session.rate ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <div className="grid content-start gap-6">
          <GlassCard title={t("adjustmentsTitle")}>
            {statement.adjustments.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noAdjustments")}</p>
            ) : (
              <ul className="grid gap-2">
                {statement.adjustments.map((item) => (
                  <li key={item.id} className="glass-inset flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <Pill tone={item.kind === "bonus" ? "green" : "red"}>{t(item.kind)}</Pill>
                      <span className="ms-2">{item.reason}</span>
                      <span className="block text-xs text-text-secondary">{formatDate(item.createdAt, locale)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`font-dmsans font-bold tabular-nums ${item.kind === "bonus" ? "text-success" : "text-danger"}`}>
                        {item.kind === "bonus" ? "+" : "−"}
                        {money(item.amount)}
                      </span>
                      {manage && (
                        <form action={removeAdjustment.bind(null, item.id)}>
                          <button type="submit" aria-label={t("remove")} className="rounded-md p-1.5 text-text-secondary hover:bg-danger/10 hover:text-danger">
                            <Trash2 size={15} />
                          </button>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard title={t("paymentsTitle")}>
            {statement.payments.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("noPayments")}</p>
            ) : (
              <ul className="grid gap-2">
                {statement.payments.map((item) => (
                  <li key={item.id} className={`glass-inset grid gap-2 px-3 py-2 text-sm ${item.voidedAt ? "opacity-60" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        <span className="font-dmsans font-bold tabular-nums">{money(item.amount)}</span>
                        <span className="ms-2 text-xs text-text-secondary">
                          {formatDate(item.paidOn, locale)} · {tAll(`options.method.${item.method}`)}
                          {item.reference ? ` · ${item.reference}` : ""}
                        </span>
                      </span>
                      {item.voidedAt ? (
                        <Pill tone="red">{t("voided")}</Pill>
                      ) : (
                        <Link href={`/receipt/${item.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-gold-light hover:underline">
                          <FileText size={14} /> {t("receipt", { number: item.id })}
                        </Link>
                      )}
                    </div>
                    {item.voidedAt && item.voidReason && <p className="text-xs text-text-secondary">{item.voidReason}</p>}
                    {manage && !item.voidedAt && (
                      <details>
                        <summary className="cursor-pointer text-xs text-danger">{t("void")}</summary>
                        <ActionForm action={voidPayrollPayment.bind(null, item.id)} className="mt-2 flex flex-wrap items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <input name="reason" aria-label={t("voidReason")} placeholder={t("voidReason")} className={inputClass} />
                            <FieldError name="reason" />
                          </div>
                          <SubmitButton variant="danger">{t("void")}</SubmitButton>
                          <FormMessage />
                        </ActionForm>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
