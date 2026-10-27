import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { MonthPicker } from "@/components/teaching/MonthPicker";
import { PayrollStatement } from "@/components/teaching/PayrollStatement";
import { formatDate, formatMoney } from "@/lib/academy/format";
import { MONTH, getMonthStatement, getPayrollBalance, listPayrollMonths } from "@/lib/academy/payroll";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function InstructorPayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requirePermission("portal.instructor");
  const months = await listPayrollMonths(user.id);
  const requested = (await searchParams).month;
  const month = requested && MONTH.test(requested) ? requested : months[0];
  const [t, locale, statement, balance] = await Promise.all([
    getTranslations("payroll"),
    getLocale() as Promise<Locale>,
    getMonthStatement(user.id, month),
    getPayrollBalance(user.id),
  ]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">{t("myTitle")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("myDescription")}</p>
        </div>
        <div className="glass px-4 py-3 text-sm">
          <span className="text-text-secondary">{t("owedAll")}: </span>
          <span className="font-dmsans font-bold tabular-nums text-gold-light">{formatMoney(balance.owed, locale)}</span>
          {balance.lastPayment && (
            <span className="block text-xs text-text-secondary">
              {t("lastTransfer", { amount: formatMoney(balance.lastPayment.amount, locale), date: formatDate(balance.lastPayment.paidOn, locale) })}
            </span>
          )}
        </div>
      </div>
      <MonthPicker months={months} current={month} basePath="/instructor/payroll" />
      <PayrollStatement statement={statement} />
    </div>
  );
}
