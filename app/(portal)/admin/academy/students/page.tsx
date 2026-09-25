import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Search, UserPlus } from "lucide-react";
import { Badge, ButtonLink, EmptyState, PageHeader, Table, Td, Th, buttonClass, inputClass } from "@/components/portal/ui";
import { ageOf, formatMoney } from "@/lib/academy/format";
import { listStudents } from "@/lib/academy/queries";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requirePermission("students.read");
  const filters = await searchParams;
  const [t, locale, students] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listStudents(user, filters),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("nav.students")}
        description={t("students.description", { count: students.length })}
        actions={
          can(user.grants, "students.write") && (
            <ButtonLink href="/admin/academy/students/new">
              <UserPlus size={16} /> {t("students.new")}
            </ButtonLink>
          )
        }
      />

      <form className="mb-5 flex flex-wrap gap-3" role="search">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder={t("students.searchPlaceholder")}
            aria-label={t("common.search")}
            className={`${inputClass} ps-9`}
          />
        </div>
        <select name="status" defaultValue={filters.status ?? ""} aria-label={t("fields.status")} className={`${inputClass} w-auto`}>
          <option value="">{t("students.filterActive")}</option>
          <option value="archived">{t("students.filterArchived")}</option>
        </select>
        <button type="submit" className={buttonClass("secondary")}>
          {t("common.search")}
        </button>
      </form>

      {students.length === 0 ? (
        <EmptyState>{filters.q ? t("students.noMatches") : t("students.empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("fields.student")}</Th>
              <Th>{t("fields.age")}</Th>
              <Th>{t("fields.phones")}</Th>
              <Th>{t("nav.groups")}</Th>
              <Th>{t("payments.remaining")}</Th>
            </tr>
          </thead>
          <tbody>
            {students.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <Td>
                  <Link href={`/admin/academy/students/${row.id}`} className="font-semibold text-gold-light hover:underline">
                    {row.nameAr}
                  </Link>
                </Td>
                <Td>{ageOf(row.birthDate, row.birthYear) ?? "—"}</Td>
                <Td>
                  <div className="flex flex-col gap-0.5 text-xs text-text-secondary" dir="ltr">
                    {row.phones.map((phone) => (
                      <span key={phone.phone}>{phone.phone}</span>
                    ))}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {row.groups.length === 0 ? (
                      <span className="text-text-secondary">—</span>
                    ) : (
                      row.groups.map((group) => (
                        <Badge key={group.id} tone="gold">
                          {group.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </Td>
                <Td>
                  <span className={row.balance > 0 ? "font-semibold text-red-300" : "text-text-secondary"}>
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
