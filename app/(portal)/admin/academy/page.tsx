import React from "react";
import Link from "next/link";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { Card, PageHeader } from "@/components/portal/ui";
import { formatMoney, todayInCairo } from "@/lib/academy/format";
import { listGroups, listOutstanding } from "@/lib/academy/queries";
import { groupScopeCondition } from "@/lib/academy/scope";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { classGroup, enrollment, payment } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

export default async function AcademyOverviewPage() {
  const user = await requirePermission("academy.overview");
  const canSeeMoney = can(user.grants, "payments.read");
  const monthStart = `${todayInCairo().slice(0, 7)}-01`;

  const [t, locale, groups, outstanding, [students], [collected]] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listGroups(user),
    canSeeMoney ? listOutstanding(user) : Promise.resolve([]),
    db
      .select({ count: sql<number>`count(distinct ${enrollment.studentId})` })
      .from(enrollment)
      .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
      .where(and(eq(enrollment.status, "active"), eq(classGroup.status, "active"), groupScopeCondition(user))),
    canSeeMoney
      ? db
          .select({ total: sql<string>`coalesce(sum(${payment.amount}), 0)` })
          .from(payment)
          .innerJoin(enrollment, eq(enrollment.id, payment.enrollmentId))
          .innerJoin(classGroup, eq(classGroup.id, enrollment.groupId))
          .where(and(isNull(payment.voidedAt), sql`${payment.paidOn} >= ${monthStart}`, groupScopeCondition(user)))
      : Promise.resolve([{ total: "0" }]),
  ]);

  const activeGroups = groups.filter((group) => group.status === "active");
  const capacityIssues = activeGroups.filter(
    (group) => Number(group.enrolled) < group.capacityMin || Number(group.enrolled) > group.capacityMax,
  );
  const owed = outstanding.reduce((sum, row) => sum + row.balance, 0);

  const stats = [
    { label: t("overview.activeStudents"), value: Number(students?.count ?? 0), href: "/admin/academy/students" },
    { label: t("overview.activeGroups"), value: activeGroups.length, href: "/admin/academy/groups" },
    ...(canSeeMoney
      ? [
          { label: t("overview.collectedThisMonth"), value: formatMoney(collected?.total, locale), href: "/admin/academy/payments" },
          { label: t("overview.outstanding"), value: formatMoney(owed, locale), href: "/admin/academy/balances", alert: owed > 0 },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("overview.welcome", { name: user.name })} description={t("overview.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-lg border border-border-subtle bg-bg-card/70 p-5 transition hover:border-gold-light/50">
            <p className="text-xs text-text-secondary">{stat.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${"alert" in stat && stat.alert ? "text-danger" : "text-gold-light"}`}>
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={t("overview.capacity")}>
          {capacityIssues.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("overview.capacityOk")}</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {capacityIssues.map((group) => (
                <li key={group.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/academy/groups/${group.id}`} className="flex items-center gap-2 text-gold-light hover:underline">
                    <AlertTriangle size={15} className="text-warning" />
                    {group.name}
                  </Link>
                  <span className="text-text-secondary">
                    {t("overview.capacityCount", { count: Number(group.enrolled), min: group.capacityMin, max: group.capacityMax })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canSeeMoney && (
          <Card title={t("overview.topBalances")}>
            {outstanding.length === 0 ? (
              <p className="text-sm text-text-secondary">{t("balances.empty")}</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {outstanding.slice(0, 6).map((row) => (
                  <li key={row.enrollmentId} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/academy/students/${row.studentId}`} className="text-gold-light hover:underline">
                      {row.nameAr}
                      <span className="ms-2 text-xs text-text-secondary">{row.groupName}</span>
                    </Link>
                    <span className="font-semibold text-danger">{formatMoney(row.balance, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
