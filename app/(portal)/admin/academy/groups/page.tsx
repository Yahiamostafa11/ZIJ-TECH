import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Badge, ButtonLink, EmptyState, PageHeader, Table, Td, Th } from "@/components/portal/ui";
import { formatMoney, localized } from "@/lib/academy/format";
import { listGroups } from "@/lib/academy/queries";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

const STATUS_TONE = { planned: "blue", active: "green", completed: "neutral", cancelled: "red" } as const;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mode?: string }>;
}) {
  const user = await requirePermission("groups.read");
  const filters = await searchParams;
  const [t, locale, groups] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listGroups(user, filters),
  ]);

  const filterLink = (next: { status?: string; mode?: string }, label: string) => {
    const merged = { ...filters, ...next };
    const query = new URLSearchParams(
      Object.entries(merged).filter(([, value]) => value) as [string, string][],
    ).toString();
    const isActive =
      (next.status !== undefined && (filters.status ?? "") === next.status) ||
      (next.mode !== undefined && (filters.mode ?? "") === next.mode);
    return (
      <Link
        href={`/admin/academy/groups${query ? `?${query}` : ""}`}
        className={`rounded-full border px-3 py-1 text-xs transition ${
          isActive ? "border-gold-primary bg-gold-primary/15 text-gold-light" : "border-border-subtle text-text-secondary hover:text-text-primary"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("nav.groups")}
        description={t("groups.description")}
        actions={
          can(user.grants, "groups.write") && (
            <ButtonLink href="/admin/academy/groups/new">
              <Plus size={16} /> {t("groups.new")}
            </ButtonLink>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {filterLink({ status: "" }, t("groups.filterCurrent"))}
        {filterLink({ status: "completed" }, t("options.groupStatus.completed"))}
        {filterLink({ status: "all" }, t("common.all"))}
        <span className="mx-1 w-px bg-border-subtle" />
        {filterLink({ mode: "" }, t("groups.anyMode"))}
        {filterLink({ mode: "offline" }, t("options.mode.offline"))}
        {filterLink({ mode: "online" }, t("options.mode.online"))}
      </div>

      {groups.length === 0 ? (
        <EmptyState>{t("groups.empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("fields.name")}</Th>
              <Th>{t("fields.level")}</Th>
              <Th>{t("fields.mode")}</Th>
              <Th>{t("fields.instructor")}</Th>
              <Th>{t("groups.students")}</Th>
              <Th>{t("groups.price")}</Th>
              <Th>{t("fields.status")}</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const count = Number(group.enrolled);
              const outOfRange = count < group.capacityMin || count > group.capacityMax;
              return (
                <tr key={group.id} className="hover:bg-white/[0.02]">
                  <Td>
                    <Link href={`/admin/academy/groups/${group.id}`} className="font-semibold text-gold-light hover:underline">
                      {group.name}
                    </Link>
                  </Td>
                  <Td>{localized(locale, group.levelNameAr, group.levelNameEn)}</Td>
                  <Td>
                    {group.mode === "online"
                      ? t("options.mode.online")
                      : localized(locale, group.branchNameAr, group.branchNameEn)}
                  </Td>
                  <Td>{group.instructorName ?? <span className="text-text-secondary">—</span>}</Td>
                  <Td>
                    <span className={outOfRange ? "text-amber-300" : ""}>
                      {count} / {group.capacityMax}
                    </span>
                  </Td>
                  <Td>{formatMoney(group.price, locale)}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[group.status]}>{t(`options.groupStatus.${group.status}`)}</Badge>
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
