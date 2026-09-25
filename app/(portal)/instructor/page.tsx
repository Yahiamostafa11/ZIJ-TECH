import React from "react";
import { getTranslations } from "next-intl/server";
import { Placeholder } from "@/components/portal/Placeholder";
import { requirePermission } from "@/lib/auth/session";

export default async function InstructorTodayPage() {
  await requirePermission("portal.instructor");
  const t = await getTranslations();

  return <Placeholder title={t("nav.today")} body={t("placeholder.body", { phase: "1b" })} />;
}
