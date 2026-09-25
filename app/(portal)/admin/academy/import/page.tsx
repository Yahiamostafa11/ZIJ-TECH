import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ImportWizard } from "@/components/academy/ImportWizard";
import { PageHeader } from "@/components/portal/ui";
import { localized } from "@/lib/academy/format";
import { listBranches, listGroups, listInstructors, listLevels } from "@/lib/academy/queries";
import { branchScope } from "@/lib/academy/scope";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const user = await requirePermission("students.import");
  const [t, locale, groups, levels, branches, instructors, params] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listGroups(user),
    listLevels(true),
    listBranches(true),
    listInstructors(),
    searchParams,
  ]);

  const scope = branchScope(user);
  // listGroups is already limited to the user's branches.
  const options = groups.map((group) => ({
    id: group.id,
    label: `${group.name} — ${localized(locale, group.levelNameAr, group.levelNameEn)}`,
  }));
  const preselected = Number(params.group);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("nav.import")} description={t("importer.description")} />
      <ImportWizard
        groups={options}
        levels={levels.map((item) => ({
          id: item.id,
          label: `${localized(locale, item.programNameAr, item.programNameEn)} — ${localized(locale, item.nameAr, item.nameEn)}`,
        }))}
        branches={branches
          .filter((item) => scope.all || scope.branchIds.includes(item.id))
          .map((item) => ({ id: item.id, label: localized(locale, item.nameAr, item.nameEn) }))}
        instructors={instructors.map((item) => ({ id: item.id, label: item.name }))}
        preselectedGroup={options.some((group) => group.id === preselected) ? preselected : null}
        canCreateGroups={can(user.grants, "groups.write")}
        allowOnline={scope.all}
      />
    </div>
  );
}
