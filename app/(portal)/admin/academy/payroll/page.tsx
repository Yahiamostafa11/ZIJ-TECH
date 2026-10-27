import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge, EmptyState, PageHeader, Table, Td, Th, buttonClass, inputClass } from "@/components/portal/ui";
import { formatMoney, formatMonth } from "@/lib/academy/format";
import { MONTH, currentMonth, getPayrollOverview } from "@/lib/academy/payroll";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePermission("payroll.manage");
  const requested = (await searchParams).month;
  const month = requested && MONTH.test(requested) ? requested : currentMonth();
  const [t, locale, rows] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>, getPayrollOverview(month)]);
  const money = (value: number) => formatMoney(value, locale);
  const total = rows.reduce(
    (sum, row) => ({ net: sum.net + row.net, paid: sum.paid + row.paid, remaining: sum.remaining + row.remaining }),
    { net: 0, paid: 0, remaining: 0 },
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("nav.payrollAdmin")}
        description={t("payroll.adminDescription", { month: formatMonth(month, locale, "long") })}
        actions={
          <form className="flex items-center gap-2">
            <input type="month" name="month" defaultValue={month} aria-label={t("payroll.month")} className={inputClass} />
            <button type="submit" className={buttonClass("secondary")}>
              {t("common.show")}
            </button>
          </form>
        }
      />
      {rows.length === 0 ? (
        <EmptyState>{t("payroll.noInstructors")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("fields.instructor")}</Th>
              <Th>{t("payroll.sessionsShort")}</Th>
              <Th>{t("payroll.sessionsAmount")}</Th>
              <Th>{t("payroll.bonuses")}</Th>
              <Th>{t("payroll.deductions")}</Th>
              <Th>{t("payroll.net")}</Th>
              <Th>{t("payroll.paid")}</Th>
              <Th>{t("payroll.remaining")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>
                  <Link href={`/admin/academy/payroll/${row.id}?month=${month}`} className="font-semibold text-gold-light hover:underline">
                    {row.name}
                  </Link>
                </Td>
                <Td className="tabular-nums">{row.sessions}</Td>
                <Td className="tabular-nums">{money(row.sessionsAmount)}</Td>
                <Td className="tabular-nums text-success">{row.bonuses ? money(row.bonuses) : "—"}</Td>
                <Td className="tabular-nums text-danger">{row.deductions ? money(row.deductions) : "—"}</Td>
                <Td className="font-semibold tabular-nums">{money(row.net)}</Td>
                <Td className="tabular-nums">{money(row.paid)}</Td>
                <Td>
                  {row.net === 0 ? (
                    <span className="text-text-secondary">—</span>
                  ) : row.remaining <= 0 ? (
                    <Badge tone="green">{t("payroll.settled")}</Badge>
                  ) : (
                    <span className="font-semibold tabular-nums text-danger">{money(row.remaining)}</span>
                  )}
                </Td>
              </tr>
            ))}
            <tr>
              <Td className="font-bold">{t("payroll.total")}</Td>
              <Td />
              <Td />
              <Td />
              <Td />
              <Td className="font-bold tabular-nums">{money(total.net)}</Td>
              <Td className="font-bold tabular-nums">{money(total.paid)}</Td>
              <Td className="font-bold tabular-nums">{money(total.remaining)}</Td>
            </tr>
          </tbody>
        </Table>
      )}
      <p className="mt-4 text-xs text-text-secondary">{t("payroll.adminHint")}</p>
    </div>
  );
}
