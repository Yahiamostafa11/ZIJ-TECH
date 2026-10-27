import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { GlassCard } from "@/components/teaching/Glass";
import { listTaughtLevels } from "@/lib/academy/content";
import { localized } from "@/lib/academy/format";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function CoursesPage() {
  const user = await requirePermission("teaching.lessons");
  const [t, locale, levels] = await Promise.all([getTranslations("content"), getLocale() as Promise<Locale>, listTaughtLevels(user.id)]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">{t("coursesTitle")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("coursesDescription")}</p>
      </div>
      {levels.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-text-secondary">{t("noCourses")}</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {levels.map((item) => (
            <Link key={item.id} href={`/instructor/courses/${item.id}`} className="glass grid gap-2 p-5 transition hover:-translate-y-0.5 hover:border-gold-light/50">
              <BookOpen size={22} className="text-gold-light" />
              <h2 className="text-lg font-bold text-text-primary">{localized(locale, item.nameAr, item.nameEn)}</h2>
              <p className="text-sm text-text-secondary">
                {localized(locale, item.programNameAr, item.programNameEn)} · {t("sessions", { count: item.sessionCount })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
