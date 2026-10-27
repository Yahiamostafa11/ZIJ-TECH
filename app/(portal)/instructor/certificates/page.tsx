import React from "react";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { Award, ExternalLink, MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/teaching/Glass";
import { siteUrl } from "@/lib/academy/feedback";
import { formatDate, localized } from "@/lib/academy/format";
import { guardianPhones } from "@/lib/academy/queries";
import { whatsappNumber } from "@/lib/academy/time";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { classGroup, level, student } from "@/lib/db/academy";
import { certificate, instructorCertificate } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export default async function InstructorCertificatesPage() {
  const user = await requirePermission("portal.instructor");
  const [t, locale, mine, issued] = await Promise.all([
    getTranslations("certificate"),
    getLocale() as Promise<Locale>,
    db.select().from(instructorCertificate).where(eq(instructorCertificate.userId, user.id)).orderBy(desc(instructorCertificate.issuedOn)),
    db
      .select({ certificate, nameAr: student.nameAr, nameEn: student.nameEn, familyId: student.familyId, groupName: classGroup.name, levelNameAr: level.nameAr, levelNameEn: level.nameEn })
      .from(certificate)
      .innerJoin(student, eq(student.id, certificate.studentId))
      .innerJoin(classGroup, eq(classGroup.id, certificate.groupId))
      .innerJoin(level, eq(level.id, certificate.levelId))
      .where(and(eq(classGroup.instructorId, user.id), isNull(certificate.revokedAt)))
      .orderBy(desc(certificate.issuedAt)),
  ]);
  const phones = await guardianPhones(issued.map((row) => row.familyId));
  const groups = [...new Set(issued.map((row) => row.groupName))];

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("pageDescription")}</p>
      </div>

      <GlassCard title={t("mine")}>
        {mine.length === 0 ? (
          <p className="text-sm text-text-secondary">{t("noMine")}</p>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {mine.map((item) => (
              <li key={item.id}>
                <a href={item.url} target="_blank" rel="noreferrer" className="glass-inset flex items-center gap-3 p-3 transition hover:bg-gold-primary/10">
                  <Award size={20} className="text-gold-light" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{item.title}</span>
                    <span className="text-xs text-text-secondary">{formatDate(item.issuedOn, locale)}</span>
                  </span>
                  <ExternalLink size={15} className="text-text-secondary" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard title={t("students")}>
        {issued.length === 0 ? (
          <p className="text-sm text-text-secondary">{t("noStudents")}</p>
        ) : (
          <div className="grid gap-5">
            {groups.map((groupName) => (
              <section key={groupName}>
                <h3 className="mb-2 font-dmsans font-bold text-gold-light" dir="ltr">
                  {groupName}
                </h3>
                <ul className="grid gap-2">
                  {issued
                    .filter((row) => row.groupName === groupName)
                    .map((row) => {
                      const url = `${siteUrl()}/certificate/${row.certificate.code}`;
                      const name = localized(locale, row.nameAr, row.nameEn);
                      return (
                        <li key={row.certificate.id} className="glass-inset flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                          <span>
                            <bdi className="font-semibold">{name}</bdi>
                            <span className="ms-2 text-xs text-text-secondary">
                              {localized(locale, row.levelNameAr, row.levelNameEn)} · {formatDate(row.certificate.issuedAt, locale)}
                            </span>
                          </span>
                          <span className="flex flex-wrap gap-2">
                            <Link href={`/certificate/${row.certificate.code}`} className="rounded-full bg-gold-primary/15 px-3 py-1 text-xs font-bold text-gold-light">
                              {t("openPdf")}
                            </Link>
                            {(phones.get(row.familyId) ?? []).map((phone) => (
                              <a
                                key={phone.phone}
                                href={`https://wa.me/${whatsappNumber(phone.phone)}?text=${encodeURIComponent(t("whatsapp", { name: name.split(" ")[0], url }))}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success"
                              >
                                <MessageCircle size={13} /> {t(`to.${phone.relation}`)}
                              </a>
                            ))}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
