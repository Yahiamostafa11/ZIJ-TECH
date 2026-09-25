import React from "react";
import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/auth/session";

export default async function AcademyOverviewPage() {
  const user = await requirePermission("academy.overview");
  const t = await getTranslations("overview");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-text-primary">
        {t("welcome", { name: user.name })}
      </h1>
      <p className="mt-2 text-text-secondary">{t("body")}</p>
    </div>
  );
}
