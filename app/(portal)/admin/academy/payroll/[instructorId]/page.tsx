import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Card, Field, PageHeader, inputClass } from "@/components/portal/ui";
import { MonthPicker } from "@/components/teaching/MonthPicker";
import { PayrollStatement } from "@/components/teaching/PayrollStatement";
import { addAdjustment, recordPayrollPayment } from "@/lib/academy/actions/payroll";
import { formatMonth, todayInCairo } from "@/lib/academy/format";
import { MONTH, getMonthStatement, listPayrollMonths } from "@/lib/academy/payroll";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/db/academy";
import { user } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

export default async function InstructorPayrollAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ instructorId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requirePermission("payroll.manage");
  const { instructorId } = await params;
  const [person] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, instructorId));
  if (!person) notFound();
  const months = await listPayrollMonths(person.id);
  const requested = (await searchParams).month;
  const month = requested && MONTH.test(requested) ? requested : months[0];
  if (!months.includes(month)) months.push(month);

  const [t, locale, statement] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>, getMonthStatement(person.id, month)]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <Link href={`/admin/academy/payroll?month=${month}`} className="inline-flex w-fit items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
        <ArrowRight size={16} className="ltr:rotate-180" /> {t("nav.payrollAdmin")}
      </Link>
      <PageHeader title={person.name} description={t("payroll.statementFor", { month: formatMonth(month, locale, "long") })} />
      <MonthPicker months={[...months].sort().reverse()} current={month} basePath={`/admin/academy/payroll/${person.id}`} />
      <PayrollStatement statement={statement} manage />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("payroll.recordPayment")}>
          <ActionForm action={recordPayrollPayment.bind(null, person.id, month)} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <Field label={t("payroll.amount")} htmlFor="pp-amount" hint={t("payroll.remainingHint", { amount: statement.totals.remaining })}>
              <input id="pp-amount" name="amount" inputMode="decimal" dir="ltr" defaultValue={statement.totals.remaining > 0 ? statement.totals.remaining : ""} className={inputClass} />
              <FieldError name="amount" />
            </Field>
            <Field label={t("payroll.paidOn")} htmlFor="pp-paidOn">
              <input id="pp-paidOn" name="paidOn" type="date" defaultValue={todayInCairo()} className={inputClass} />
              <FieldError name="paidOn" />
            </Field>
            <Field label={t("payroll.method")} htmlFor="pp-method">
              <select id="pp-method" name="method" defaultValue="instapay" className={inputClass}>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {t(`options.method.${method}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("payroll.reference")} htmlFor="pp-reference">
              <input id="pp-reference" name="reference" dir="ltr" className={inputClass} />
              <FieldError name="reference" />
            </Field>
            <Field label={t("fields.notes")} htmlFor="pp-notes" className="sm:col-span-2">
              <input id="pp-notes" name="notes" className={inputClass} />
            </Field>
            <div className="flex items-center gap-4 sm:col-span-2">
              <SubmitButton>{t("payroll.recordPayment")}</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </Card>

        <Card title={t("payroll.addAdjustment")}>
          <ActionForm action={addAdjustment.bind(null, person.id, month)} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <Field label={t("payroll.kind")} htmlFor="adj-kind">
              <select id="adj-kind" name="kind" defaultValue="bonus" className={inputClass}>
                <option value="bonus">{t("payroll.bonus")}</option>
                <option value="deduction">{t("payroll.deduction")}</option>
              </select>
            </Field>
            <Field label={t("payroll.amount")} htmlFor="adj-amount">
              <input id="adj-amount" name="amount" inputMode="decimal" dir="ltr" className={inputClass} />
              <FieldError name="amount" />
            </Field>
            <Field label={t("payroll.reason")} htmlFor="adj-reason" className="sm:col-span-2">
              <input id="adj-reason" name="reason" maxLength={255} className={inputClass} />
              <FieldError name="reason" />
            </Field>
            <div className="flex items-center gap-4 sm:col-span-2">
              <SubmitButton variant="secondary">{t("payroll.addAdjustment")}</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
