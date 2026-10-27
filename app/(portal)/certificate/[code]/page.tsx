import React from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/teaching/PrintButton";
import { siteUrl } from "@/lib/academy/feedback";
import { formatDate, localized } from "@/lib/academy/format";
import { db } from "@/lib/db";
import { classGroup, level, program, student } from "@/lib/db/academy";
import { user } from "@/lib/db/schema";
import { certificate } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export const metadata = { title: "Zij Academy certificate", robots: { index: false } };

/**
 * A student's certificate. Anyone with the code can open it to verify it;
 * the layout is A4 landscape so the browser can save it as PDF. This is the
 * interim design until the academy's own template is applied.
 */
export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [row] = await db
    .select({
      certificate,
      nameAr: student.nameAr,
      nameEn: student.nameEn,
      levelNameAr: level.nameAr,
      levelNameEn: level.nameEn,
      programNameAr: program.nameAr,
      programNameEn: program.nameEn,
      instructorName: user.name,
    })
    .from(certificate)
    .innerJoin(student, eq(student.id, certificate.studentId))
    .innerJoin(level, eq(level.id, certificate.levelId))
    .innerJoin(program, eq(program.id, level.programId))
    .innerJoin(classGroup, eq(classGroup.id, certificate.groupId))
    .leftJoin(user, eq(user.id, classGroup.instructorId))
    .where(eq(certificate.code, code.toUpperCase()));
  if (!row) notFound();
  const [t, locale] = await Promise.all([getTranslations("certificate"), getLocale() as Promise<Locale>]);
  const revoked = Boolean(row.certificate.revokedAt);

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[297mm] items-center justify-between gap-3 print:hidden">
        <p className={`text-sm font-semibold ${revoked ? "text-danger" : "text-success"}`}>{revoked ? t("revoked") : t("verified")}</p>
        {!revoked && <PrintButton label={t("download")} />}
      </div>
      <article className="certificate relative mx-auto aspect-[297/210] max-w-[297mm] overflow-hidden rounded-2xl bg-[#fffaf0] p-[6%] text-center text-[#0e444a] shadow-card print:rounded-none print:shadow-none">
        <div className="absolute inset-[3%] rounded-xl border-[3px] border-double border-[#c8923c]" aria-hidden="true" />
        <div className="relative flex h-full flex-col items-center justify-between">
          <div>
            <p className="font-cinzel text-[min(5vw,44px)] font-bold text-[#b08438]" dir="ltr">
              ZIJ.
            </p>
            <p className="text-sm tracking-[0.3em] text-[#5c6d6c]" dir="ltr">
              ZIJ ACADEMY
            </p>
          </div>
          <div className="grid gap-2">
            <h1 className="text-[min(4vw,34px)] font-extrabold">{t("title")}</h1>
            <p className="text-[#5c6d6c]">{t("presented")}</p>
            <p className="text-[min(5vw,42px)] font-extrabold text-[#8e6527]">{row.nameAr}</p>
            {row.nameEn && (
              <p className="text-xl font-semibold" dir="ltr">
                {row.nameEn}
              </p>
            )}
            <p className="mx-auto max-w-[70%] text-[#5c6d6c]">
              {t("body", {
                level: localized(locale, row.levelNameAr, row.levelNameEn),
                program: localized(locale, row.programNameAr, row.programNameEn),
              })}
            </p>
          </div>
          <div className="flex w-full items-end justify-between gap-6 text-xs text-[#5c6d6c]">
            <div className="text-start">
              <p>{t("date", { date: formatDate(row.certificate.issuedAt, locale) })}</p>
              <p className="mt-1">
                {t("code")}: <bdi className="font-dmsans font-semibold tracking-wider">{row.certificate.code}</bdi>
              </p>
              <p className="font-dmsans" dir="ltr">
                {siteUrl().replace(/^https?:\/\//, "")}/certificate/{row.certificate.code}
              </p>
            </div>
            <p className="max-w-[30%] text-center">{t("accredited")}</p>
            <div className="w-44 border-t border-[#0e444a] pt-2 text-center">
              {row.instructorName && <p className="font-semibold text-[#0e444a]">{row.instructorName}</p>}
              {t("instructor")}
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
