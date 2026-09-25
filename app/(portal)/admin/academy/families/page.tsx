import React from "react";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/portal/ui";
import { formatMoney } from "@/lib/academy/format";
import { listStudents } from "@/lib/academy/queries";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { family } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

export default async function FamiliesPage() {
  const user = await requirePermission("students.read");
  const [t, locale, students] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listStudents(user, {}, 2000),
  ]);

  const familyIds = [...new Set(students.map((row) => row.familyId))];
  const families = familyIds.length
    ? await db.select().from(family).where(inArray(family.id, familyIds))
    : [];

  const rows = families
    .map((item) => {
      const children = students.filter((row) => row.familyId === item.id);
      return {
        ...item,
        children,
        phones: children[0]?.phones ?? [],
        balance: children.reduce((sum, row) => sum + row.balance, 0),
      };
    })
    .sort((a, b) => b.children.length - a.children.length || (a.name ?? "").localeCompare(b.name ?? ""));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("nav.families")} description={t("families.description", { count: rows.length })} />
      {rows.length === 0 ? (
        <EmptyState>{t("students.empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("families.family")}</Th>
              <Th>{t("families.children")}</Th>
              <Th>{t("fields.phones")}</Th>
              <Th>{t("payments.remaining")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.name ?? "—"}</Td>
                <Td>
                  <div className="flex flex-col gap-0.5">
                    {row.children.map((child) => (
                      <Link key={child.id} href={`/admin/academy/students/${child.id}`} className="text-gold-light hover:underline">
                        {child.nameAr}
                      </Link>
                    ))}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-col gap-0.5 text-xs text-text-secondary" dir="ltr">
                    {row.phones.map((phone) => (
                      <span key={phone.phone}>
                        {phone.phone} ({t(`options.relation.${phone.relation}`)})
                      </span>
                    ))}
                  </div>
                </Td>
                <Td>
                  <span className={row.balance > 0 ? "font-semibold text-danger" : "text-text-secondary"}>
                    {formatMoney(row.balance, locale)}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
