import React from "react";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LevelForm } from "@/components/academy/LevelForm";
import { Card, PageHeader } from "@/components/portal/ui";
import { localized } from "@/lib/academy/format";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { level, program } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

export default async function EditLevelPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("levels.manage");
  const id = Number((await params).id);
  const [row] = Number.isInteger(id) ? await db.select().from(level).where(eq(level.id, id)) : [];
  if (!row) notFound();

  const [t, locale, programs] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    db.select().from(program),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={`${t("common.edit")}: ${localized(locale, row.nameAr, row.nameEn)}`} />
      <Card>
        <LevelForm
          level={row}
          programs={programs.map((item) => ({ id: item.id, name: localized(locale, item.nameAr, item.nameEn) }))}
        />
      </Card>
    </div>
  );
}
