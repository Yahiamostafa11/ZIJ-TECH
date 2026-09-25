import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MessageCircle, Phone } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Badge, Card, DetailList, Field, PageHeader, Table, Td, Th, inputClass } from "@/components/portal/ui";
import {
  recordPayment,
  removeGuardian,
  saveGuardian,
  updateEnrollment,
  updateStudent,
  voidPayment,
} from "@/lib/academy/actions/people";
import { ageOf, formatDate, formatMoney, localized, todayInCairo } from "@/lib/academy/format";
import { getStudentDetail } from "@/lib/academy/queries";
import { requireStudentAccess } from "@/lib/academy/scope";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { ENROLLMENT_STATUSES, GUARDIAN_RELATIONS, PAYMENT_METHODS } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("students.read");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  await requireStudentAccess(user, id);

  const [t, locale, detail] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    getStudentDetail(id),
  ]);
  if (!detail) notFound();

  const { student, guardians, siblings, enrollments } = detail;
  const canEdit = can(user.grants, "students.write");
  const canPay = can(user.grants, "payments.write");
  const canVoid = can(user.grants, "payments.void");
  const canPrice = can(user.grants, "pricing.manage");
  const age = ageOf(student.birthDate, student.birthYear);
  const totalBalance = enrollments.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {student.nameAr}
            {student.status === "archived" && <Badge>{t("options.studentStatus.archived")}</Badge>}
          </span>
        }
        description={
          <>
            {detail.familyName && (
              <>
                {t("students.familyLabel")} <bdi>{detail.familyName}</bdi>
              </>
            )}
            {age !== null && <> · {t("students.ageYears", { age })}</>}
            {totalBalance > 0 && <> · {t("students.owes", { amount: formatMoney(totalBalance, locale) })}</>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 content-start gap-6">
          {enrollments.length === 0 && (
            <Card>
              <p className="text-sm text-text-secondary">{t("students.noEnrollments")}</p>
            </Card>
          )}

          {enrollments.map((row) => {
            const due = Number(row.price) - Number(row.discount);
            return (
              <Card
                key={row.id}
                title={
                  <Link href={`/admin/academy/groups/${row.groupId}`} className="hover:text-gold-light">
                    <bdi>{row.groupName}</bdi> · {localized(locale, row.levelNameAr, row.levelNameEn)}
                  </Link>
                }
                actions={<Badge tone={row.status === "active" ? "green" : "neutral"}>{t(`options.enrollmentStatus.${row.status}`)}</Badge>}
              >
                <DetailList
                  items={[
                    { label: t("payments.price"), value: formatMoney(due, locale) + (Number(row.discount) > 0 ? ` (${t("payments.discount")} ${formatMoney(row.discount, locale)})` : "") },
                    { label: t("payments.paid"), value: formatMoney(row.paid, locale) },
                    {
                      label: t("payments.remaining"),
                      value: <span className={row.balance > 0 ? "font-semibold text-danger" : "text-success"}>{formatMoney(row.balance, locale)}</span>,
                    },
                    { label: t("students.enrolledOn"), value: formatDate(row.enrolledAt, locale) },
                  ]}
                />

                {row.payments.length > 0 && (
                  <div className="mt-5">
                    <Table>
                      <thead>
                        <tr>
                          <Th>{t("payments.date")}</Th>
                          <Th>{t("payments.amount")}</Th>
                          <Th>{t("payments.method")}</Th>
                          <Th>{t("payments.receivedBy")}</Th>
                          <Th />
                        </tr>
                      </thead>
                      <tbody>
                        {row.payments.map((item) => (
                          <tr key={item.id} className={item.voidedAt ? "opacity-50" : ""}>
                            <Td>
                              {formatDate(item.paidOn, locale)}
                              <span className="block text-xs text-text-secondary">
                                {t("payments.receipt", { id: item.id })}
                              </span>
                            </Td>
                            <Td>
                              <span className={item.voidedAt ? "line-through" : ""}>{formatMoney(item.amount, locale)}</span>
                              {item.voidedAt && <p className="text-xs text-danger">
                                  {t("payments.voidedLabel")} <bdi>{item.voidReason}</bdi>
                                </p>}
                            </Td>
                            <Td>
                              {t(`options.method.${item.method}`)}
                              {item.source === "import" && <span className="ms-2"><Badge>{t("payments.fromExcel")}</Badge></span>}
                              {item.reference && <p className="text-xs text-text-secondary" dir="ltr">{item.reference}</p>}
                            </Td>
                            <Td>{item.receivedByName ?? "—"}</Td>
                            <Td className="text-end">
                              {canVoid && !item.voidedAt && (
                                <details className="text-start">
                                  <summary className="cursor-pointer text-xs text-danger">{t("payments.void")}</summary>
                                  <ActionForm action={voidPayment.bind(null, item.id)} className="mt-2 grid w-56 gap-2">
                                    <input name="reason" placeholder={t("payments.voidReason")} className={inputClass} />
                                    <FieldError name="reason" />
                                    <SubmitButton variant="danger">{t("payments.confirmVoid")}</SubmitButton>
                                    <FormMessage />
                                  </ActionForm>
                                </details>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}

                {canPay && row.balance > 0 && (
                  <ActionForm action={recordPayment.bind(null, row.id)} resetOnSuccess className="mt-5 grid gap-3 rounded-md border border-border-subtle/70 bg-bg-secondary/40 p-4 sm:grid-cols-4">
                    <p className="text-sm font-semibold text-gold-light sm:col-span-4">{t("payments.record")}</p>
                    <Field label={t("payments.amount")} htmlFor={`amount-${row.id}`}>
                      <input id={`amount-${row.id}`} name="amount" inputMode="decimal" dir="ltr" placeholder={String(row.balance)} className={inputClass} />
                      <FieldError name="amount" />
                    </Field>
                    <Field label={t("payments.date")} htmlFor={`paidOn-${row.id}`}>
                      <input id={`paidOn-${row.id}`} name="paidOn" type="date" defaultValue={todayInCairo()} max={todayInCairo()} className={inputClass} />
                      <FieldError name="paidOn" />
                    </Field>
                    <Field label={t("payments.method")} htmlFor={`method-${row.id}`}>
                      <select id={`method-${row.id}`} name="method" defaultValue="cash" className={inputClass}>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {t(`options.method.${method}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("payments.reference")} htmlFor={`reference-${row.id}`}>
                      <input id={`reference-${row.id}`} name="reference" dir="ltr" className={inputClass} />
                    </Field>
                    <div className="flex items-center gap-4 sm:col-span-4">
                      <SubmitButton>{t("payments.save")}</SubmitButton>
                      <FormMessage />
                    </div>
                  </ActionForm>
                )}

                {canEdit && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-text-secondary hover:text-gold-light">{t("students.editEnrollment")}</summary>
                    <ActionForm action={updateEnrollment.bind(null, row.id)} className="mt-3 grid gap-3 sm:grid-cols-4 sm:items-end">
                      <Field label={t("fields.status")} htmlFor={`status-${row.id}`}>
                        <select id={`status-${row.id}`} name="status" defaultValue={row.status} className={inputClass}>
                          {ENROLLMENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {t(`options.enrollmentStatus.${status}`)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={t("payments.price")} htmlFor={`price-${row.id}`}>
                        <input id={`price-${row.id}`} name="price" defaultValue={Number(row.price)} readOnly={!canPrice} dir="ltr" className={inputClass} />
                        <FieldError name="price" />
                      </Field>
                      <Field label={t("payments.discount")} htmlFor={`discount-${row.id}`}>
                        <input id={`discount-${row.id}`} name="discount" defaultValue={Number(row.discount)} readOnly={!canPrice} dir="ltr" className={inputClass} />
                        <FieldError name="discount" />
                      </Field>
                      <SubmitButton variant="secondary">{t("common.save")}</SubmitButton>
                      <div className="sm:col-span-4">
                        <FormMessage />
                      </div>
                    </ActionForm>
                  </details>
                )}
              </Card>
            );
          })}
        </div>

        <div className="grid content-start gap-6">
          <Card title={t("students.guardians")}>
            <ul className="grid gap-4">
              {guardians.map((item) => (
                <li key={item.id} className="rounded-md border border-border-subtle/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">
                      {item.name ?? t(`options.relation.${item.relation}`)}
                      {item.name && <span className="ms-1 text-xs text-text-secondary">({t(`options.relation.${item.relation}`)})</span>}
                    </span>
                    <div className="flex gap-2">
                      <a href={`tel:${item.phone}`} aria-label={t("students.call")} className="text-text-secondary hover:text-gold-light">
                        <Phone size={16} />
                      </a>
                      <a href={`https://wa.me/2${item.phone}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="text-text-secondary hover:text-success">
                        <MessageCircle size={16} />
                      </a>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary" dir="ltr">
                    {item.phone}
                  </p>
                  {canEdit && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-text-secondary hover:text-gold-light">{t("common.edit")}</summary>
                      <GuardianForm studentId={student.id} guardian={item} t={t} />
                      <ActionForm action={removeGuardian.bind(null, student.id, item.id)} className="mt-2">
                        <SubmitButton variant="danger" className="w-full">{t("students.removeGuardian")}</SubmitButton>
                        <FormMessage />
                      </ActionForm>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gold-light">{t("students.addGuardian")}</summary>
                <GuardianForm studentId={student.id} t={t} />
              </details>
            )}
          </Card>

          {siblings.length > 0 && (
            <Card title={t("students.siblings")}>
              <ul className="grid gap-2 text-sm">
                {siblings.map((item) => (
                  <li key={item.id}>
                    <Link href={`/admin/academy/students/${item.id}`} className="text-gold-light hover:underline">
                      {item.nameAr}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title={t("students.profile")}>
            <ActionForm action={updateStudent.bind(null, student.id)} className="grid gap-3">
              <Field label={t("fields.nameAr")} htmlFor="student-nameAr">
                <input id="student-nameAr" name="nameAr" defaultValue={student.nameAr} readOnly={!canEdit} dir="rtl" className={inputClass} />
                <FieldError name="nameAr" />
              </Field>
              <Field label={t("fields.nameEn")} htmlFor="student-nameEn" hint={t("students.nameEnHint")}>
                <input id="student-nameEn" name="nameEn" defaultValue={student.nameEn ?? ""} readOnly={!canEdit} dir="ltr" className={inputClass} />
              </Field>
              <Field
                label={t("fields.birthDate")}
                htmlFor="student-birthDate"
                hint={!student.birthDate && student.birthYear ? t("students.birthYearEstimate", { year: student.birthYear }) : undefined}
              >
                <input id="student-birthDate" name="birthDate" type="date" defaultValue={student.birthDate ?? ""} readOnly={!canEdit} className={inputClass} />
                <FieldError name="birthDate" />
              </Field>
              <Field label={t("fields.school")} htmlFor="student-school">
                <input id="student-school" name="school" defaultValue={student.school ?? ""} readOnly={!canEdit} className={inputClass} />
              </Field>
              <Field label={t("fields.notes")} htmlFor="student-notes">
                <textarea id="student-notes" name="notes" rows={3} defaultValue={student.notes ?? ""} readOnly={!canEdit} className={inputClass} />
              </Field>
              <Field label={t("fields.status")} htmlFor="student-status">
                <select id="student-status" name="status" defaultValue={student.status} disabled={!canEdit} className={inputClass}>
                  <option value="active">{t("options.studentStatus.active")}</option>
                  <option value="archived">{t("options.studentStatus.archived")}</option>
                </select>
              </Field>
              <label className="flex items-start gap-2 text-sm text-text-secondary">
                <input type="checkbox" name="photoConsent" defaultChecked={student.photoConsent} disabled={!canEdit} className="mt-1" />
                {t("students.photoConsent")}
              </label>
              {canEdit && (
                <div className="flex items-center gap-3">
                  <SubmitButton>{t("common.save")}</SubmitButton>
                  <FormMessage />
                </div>
              )}
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GuardianForm({
  studentId,
  guardian,
  t,
}: {
  studentId: number;
  guardian?: { id: number; relation: (typeof GUARDIAN_RELATIONS)[number]; name: string | null; phone: string };
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const key = guardian?.id ?? "new";
  return (
    <ActionForm action={saveGuardian.bind(null, studentId)} resetOnSuccess={!guardian} className="mt-3 grid gap-2">
      {guardian && <input type="hidden" name="id" value={guardian.id} />}
      <select name="relation" defaultValue={guardian?.relation ?? "mother"} aria-label={t("students.relation")} className={inputClass}>
        {GUARDIAN_RELATIONS.map((relation) => (
          <option key={relation} value={relation}>
            {t(`options.relation.${relation}`)}
          </option>
        ))}
      </select>
      <input name="name" defaultValue={guardian?.name ?? ""} placeholder={t("fields.name")} aria-label={t("fields.name")} className={inputClass} id={`guardian-name-${key}`} />
      <input name="phone" type="tel" dir="ltr" defaultValue={guardian?.phone ?? ""} placeholder="01xxxxxxxxx" aria-label={t("fields.phone")} className={inputClass} />
      <FieldError name="phone" />
      <SubmitButton variant="secondary">{t("common.save")}</SubmitButton>
      <FormMessage />
    </ActionForm>
  );
}
