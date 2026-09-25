import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/portal/ui";
import { formatMoney } from "@/lib/academy/format";
import { listOutstanding } from "@/lib/academy/queries";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function BalancesPage() {
  const user = await requirePermission("payments.read");
  // Reminders go to parents in Arabic whatever language staff use.
  const [t, tArabic, locale, rows] = await Promise.all([
    getTranslations(),
    getTranslations({ locale: "ar", namespace: "balances" }),
    getLocale() as Promise<Locale>,
    listOutstanding(user),
  ]);
  const total = rows.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("nav.balances")} description={t("balances.description")} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-text-secondary">{t("balances.total")}</p>
          <p className="mt-1 text-2xl font-semibold text-red-300">{formatMoney(total, locale)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary">{t("balances.enrollments")}</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{rows.length}</p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState>{t("balances.empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("fields.student")}</Th>
              <Th>{t("fields.group")}</Th>
              <Th>{t("payments.remaining")}</Th>
              <Th>{t("balances.remind")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const message = tArabic("reminderMessage", {
                student: row.nameAr,
                group: row.groupName,
                amount: formatMoney(row.balance, "ar"),
              });
              return (
                <tr key={row.enrollmentId}>
                  <Td>
                    <Link href={`/admin/academy/students/${row.studentId}`} className="font-semibold text-gold-light hover:underline">
                      {row.nameAr}
                    </Link>
                  </Td>
                  <Td>{row.groupName}</Td>
                  <Td>
                    <span className="font-semibold text-red-300">{formatMoney(row.balance, locale)}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      {row.phones.map((phone) => (
                        <a
                          key={phone.phone}
                          href={`https://wa.me/2${phone.phone}?text=${encodeURIComponent(message)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-emerald-300"
                        >
                          <MessageCircle size={14} />
                          <span dir="ltr">{phone.phone}</span> ({t(`options.relation.${phone.relation}`)})
                        </a>
                      ))}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
