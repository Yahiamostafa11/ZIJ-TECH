import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Card, EmptyState, Field, PageHeader, Table, Td, Th, buttonClass, inputClass } from "@/components/portal/ui";
import { formatDate, formatMoney, todayInCairo } from "@/lib/academy/format";
import { listPayments } from "@/lib/academy/queries";
import { requirePermission } from "@/lib/auth/session";
import { PAYMENT_METHODS } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; method?: string }>;
}) {
  const user = await requirePermission("payments.read");
  const params = await searchParams;
  const today = todayInCairo();
  const filters = {
    from: params.from && DATE.test(params.from) ? params.from : `${today.slice(0, 7)}-01`,
    to: params.to && DATE.test(params.to) ? params.to : today,
    method: PAYMENT_METHODS.includes(params.method as "cash") ? params.method : undefined,
  };

  const [t, locale, payments] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listPayments(user, filters),
  ]);

  const valid = payments.filter((row) => !row.voidedAt);
  const total = valid.reduce((sum, row) => sum + Number(row.amount), 0);
  const byMethod = PAYMENT_METHODS.map((method) => ({
    method,
    amount: valid.filter((row) => row.method === method).reduce((sum, row) => sum + Number(row.amount), 0),
  })).filter((row) => row.amount > 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("nav.payments")} description={t("payments.description")} />

      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Field label={t("payments.from")} htmlFor="from">
          <input id="from" name="from" type="date" defaultValue={filters.from} className={inputClass} />
        </Field>
        <Field label={t("payments.to")} htmlFor="to">
          <input id="to" name="to" type="date" defaultValue={filters.to} className={inputClass} />
        </Field>
        <Field label={t("payments.method")} htmlFor="method">
          <select id="method" name="method" defaultValue={filters.method ?? ""} className={inputClass}>
            <option value="">{t("common.all")}</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t(`options.method.${method}`)}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" className={buttonClass("secondary")}>
          {t("common.apply")}
        </button>
      </form>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-text-secondary">{t("payments.total")}</p>
          <p className="mt-1 text-2xl font-semibold text-gold-light">{formatMoney(total, locale)}</p>
          <p className="text-xs text-text-secondary">{t("payments.count", { count: valid.length })}</p>
        </Card>
        {byMethod.map((row) => (
          <Card key={row.method}>
            <p className="text-xs text-text-secondary">{t(`options.method.${row.method}`)}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{formatMoney(row.amount, locale)}</p>
          </Card>
        ))}
      </div>

      {payments.length === 0 ? (
        <EmptyState>{t("payments.empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>{t("payments.date")}</Th>
              <Th>{t("fields.student")}</Th>
              <Th>{t("fields.group")}</Th>
              <Th>{t("payments.amount")}</Th>
              <Th>{t("payments.method")}</Th>
              <Th>{t("payments.receivedBy")}</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.id} className={row.voidedAt ? "opacity-50" : ""}>
                <Td className="text-text-secondary">{row.id}</Td>
                <Td>{formatDate(row.paidOn, locale)}</Td>
                <Td>
                  <Link href={`/admin/academy/students/${row.studentId}`} className="text-gold-light hover:underline">
                    {row.nameAr}
                  </Link>
                </Td>
                <Td>{row.groupName}</Td>
                <Td>
                  <span className={row.voidedAt ? "line-through" : "font-semibold"}>{formatMoney(row.amount, locale)}</span>
                  {row.voidedAt && (
                    <p className="text-xs text-danger">
                      {t("payments.voidedLabel")} <bdi>{row.voidReason}</bdi>
                    </p>
                  )}
                </Td>
                <Td>
                  {t(`options.method.${row.method}`)}
                  {row.source === "import" && <span className="ms-2"><Badge>{t("payments.fromExcel")}</Badge></span>}
                </Td>
                <Td>{row.receivedByName ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
