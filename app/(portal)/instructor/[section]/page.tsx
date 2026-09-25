import React from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Placeholder } from "@/components/portal/Placeholder";
import { requirePermission } from "@/lib/auth/session";
import { INSTRUCTOR_NAV, findNavItem } from "@/lib/portal/nav";

export default async function InstructorSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = findNavItem(INSTRUCTOR_NAV, section);
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
