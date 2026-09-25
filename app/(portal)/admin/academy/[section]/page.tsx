import React from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Placeholder } from "@/components/portal/Placeholder";
import { requirePermission } from "@/lib/auth/session";
import { ACADEMY_NAV, findNavItem } from "@/lib/portal/nav";

// Placeholder for modules not built yet. A module gets its own route folder
// when it is implemented, which takes precedence over this dynamic segment.
export default async function AcademySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = findNavItem(ACADEMY_NAV, section);
  if (!item || !item.slug) notFound();

  await requirePermission(item.permission);
  const t = await getTranslations();

  return (
    <Placeholder
      title={t(`nav.${item.key}`)}
      body={t("placeholder.body", { phase: item.phase })}
    />
  );
}
