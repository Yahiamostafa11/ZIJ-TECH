import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ImportWizard } from "@/components/academy/ImportWizard";
import { PageHeader } from "@/components/portal/ui";
import { localized } from "@/lib/academy/format";
import { listGroups } from "@/lib/academy/queries";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const user = await requirePermission("students.import");
  const [t, locale, groups, params] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listGroups(user),
    searchParams,
  ]);

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
        preselectedGroup={options.some((group) => group.id === preselected) ? preselected : null}
      />
    </div>
  );
}
