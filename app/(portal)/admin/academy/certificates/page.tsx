import React from "react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { Trash2 } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Badge, Card, Field, PageHeader, Table, Td, Th, inputClass } from "@/components/portal/ui";
import { addInstructorCertificate, removeInstructorCertificate, revokeCertificate } from "@/lib/academy/actions/grading";
import { formatDate, localized, todayInCairo } from "@/lib/academy/format";
import { listInstructors } from "@/lib/academy/queries";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { classGroup, level, student } from "@/lib/db/academy";
import { user } from "@/lib/db/schema";
import { certificate, instructorCertificate } from "@/lib/db/teaching";
import type { Locale } from "@/lib/i18n/config";

export default async function CertificatesAdminPage() {
  const viewer = await requirePermission("groups.read");
  const manageInstructors = can(viewer.grants, "instructors.manage");
  const [t, locale, instructors, staffCerts, studentCerts] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listInstructors(),
    db.select({ cert: instructorCertificate, name: user.name }).from(instructorCertificate).innerJoin(user, eq(user.id, instructorCertificate.userId)).orderBy(desc(instructorCertificate.issuedOn)),
    db
      .select({ certificate, nameAr: student.nameAr, nameEn: student.nameEn, groupName: classGroup.name, levelNameAr: level.nameAr, levelNameEn: level.nameEn })
      .from(certificate)
      .innerJoin(student, eq(student.id, certificate.studentId))
      .innerJoin(classGroup, eq(classGroup.id, certificate.groupId))
      .innerJoin(level, eq(level.id, certificate.levelId))
      .orderBy(desc(certificate.issuedAt))
      .limit(200),
  ]);

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader title={t("nav.certificatesAdmin")} description={t("certificate.adminDescription")} />

      {manageInstructors && (
        <Card title={t("certificate.addInstructor")}>
          <ActionForm action={addInstructorCertificate} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <Field label={t("fields.instructor")} htmlFor="ic-user">
              <select id="ic-user" name="userId" className={inputClass}>
                {instructors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("certificate.certTitle")} htmlFor="ic-title">
              <input id="ic-title" name="title" className={inputClass} />
              <FieldError name="title" />
            </Field>
            <Field label={t("certificate.issuedOn")} htmlFor="ic-date">
              <input id="ic-date" name="issuedOn" type="date" defaultValue={todayInCairo()} className={inputClass} />
            </Field>
            <Field label={t("certificate.link")} htmlFor="ic-url">
              <input id="ic-url" name="url" dir="ltr" placeholder="https://drive.google.com/…" className={inputClass} />
              <FieldError name="url" />
            </Field>
            <div className="flex items-center gap-4 sm:col-span-2">
              <SubmitButton>{t("certificate.add")}</SubmitButton>
              <FormMessage />
            </div>
          </ActionForm>
          {staffCerts.length > 0 && (
            <ul className="mt-5 grid gap-2 border-t border-border-subtle/60 pt-4 text-sm">
              {staffCerts.map(({ cert, name }) => (
                <li key={cert.id} className="flex items-center justify-between gap-2">
                  <a href={cert.url} target="_blank" rel="noreferrer" className="hover:text-gold-light">
                    {name} · {cert.title} · {formatDate(cert.issuedOn, locale)}
                  </a>
                  <form action={removeInstructorCertificate.bind(null, cert.id)}>
                    <button type="submit" aria-label={t("common.delete")} className="rounded p-1 text-text-secondary hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card title={t("certificate.studentsIssued")}>
        {studentCerts.length === 0 ? (
          <p className="text-sm text-text-secondary">{t("certificate.noStudents")}</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("fields.student")}</Th>
                <Th>{t("certificate.levelGroup")}</Th>
                <Th>{t("certificate.issuedOn")}</Th>
                <Th>{t("certificate.code")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {studentCerts.map((row) => (
                <tr key={row.certificate.id} className={row.certificate.revokedAt ? "opacity-60" : ""}>
                  <Td>
                    <bdi>{localized(locale, row.nameAr, row.nameEn)}</bdi>
                  </Td>
                  <Td>
                    {localized(locale, row.levelNameAr, row.levelNameEn)} · {row.groupName}
                  </Td>
                  <Td>{formatDate(row.certificate.issuedAt, locale)}</Td>
                  <Td>
                    <Link href={`/certificate/${row.certificate.code}`} className="font-dmsans text-gold-light hover:underline">
                      {row.certificate.code}
                    </Link>
                  </Td>
                  <Td>
                    {row.certificate.revokedAt ? (
                      <Badge tone="red">{t("certificate.revoked")}</Badge>
                    ) : (
                      can(viewer.grants, "students.write") && (
                        <form action={revokeCertificate.bind(null, row.certificate.id)}>
                          <button type="submit" className="text-xs text-danger hover:underline">
                            {t("certificate.revoke")}
                          </button>
                        </form>
                      )
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
