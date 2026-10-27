import React from "react";
import { LessonsEditor } from "@/components/teaching/LessonsEditor";
import { getLevelLessons } from "@/lib/academy/content";
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

  const [t, locale, programs, lessons] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    db.select().from(program),
    getLevelLessons(row.id),
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
      <h2 className="mb-2 mt-10 text-xl font-semibold text-text-primary">{t("content.curriculum")}</h2>
      <p className="mb-4 text-sm text-text-secondary">{t("content.levelHint")}</p>
      <LessonsEditor levelId={row.id} sessionCount={row.sessionCount} lessons={lessons} />
    </div>
  );
}
