import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { LessonsEditor } from "@/components/teaching/LessonsEditor";
import { canEditLevel, getLevelLessons } from "@/lib/academy/content";
import { localized } from "@/lib/academy/format";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { level } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

export default async function CoursePage({ params }: { params: Promise<{ levelId: string }> }) {
  const user = await requirePermission("teaching.lessons");
  const levelId = Number((await params).levelId);
  if (!Number.isInteger(levelId)) notFound();
  const [row] = await db.select().from(level).where(eq(level.id, levelId));
  if (!row) notFound();
  if (!(await canEditLevel(user, levelId))) redirect("/forbidden");
  const [t, locale, lessons] = await Promise.all([getTranslations("content"), getLocale() as Promise<Locale>, getLevelLessons(levelId)]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <Link href="/instructor/courses" className="inline-flex w-fit items-center gap-2 text-sm text-text-secondary hover:text-gold-light">
        <ArrowRight size={16} className="ltr:rotate-180" /> {t("coursesTitle")}
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">{localized(locale, row.nameAr, row.nameEn)}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("levelHint")}</p>
      </div>
      <LessonsEditor levelId={levelId} sessionCount={row.sessionCount} lessons={lessons} />
    </div>
  );
}
