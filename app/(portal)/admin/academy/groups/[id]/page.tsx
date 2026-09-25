import React from "react";
import Link from "next/link";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { FileSpreadsheet, Pencil } from "lucide-react";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { WEEKDAYS } from "@/components/academy/GroupForm";
import { Badge, ButtonLink, Card, DetailList, EmptyState, Field, PageHeader, Table, Td, Th, inputClass } from "@/components/portal/ui";
import { enrollExistingStudent, enrollNewStudent } from "@/lib/academy/actions/people";
import { ageOf, formatDate, formatMoney, localized } from "@/lib/academy/format";
import { getGroupDetail, getGroupRoster } from "@/lib/academy/queries";
import { requireGroup, studentScopeCondition } from "@/lib/academy/scope";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { student } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("groups.read");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  await requireGroup(user, id, "groups.read");

  const [t, locale, detail, roster] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    getGroupDetail(id),
    getGroupRoster(id),
  ]);
  if (!detail) notFound();
  const { group } = detail;

  const canEnroll = can(user.grants, "students.write", group.branchId);
  const active = roster.filter((row) => row.status === "active");
  const totalDue = roster.reduce((sum, row) => sum + Math.max(row.balance, 0), 0);

  const otherStudents = canEnroll
    ? await db
        .select({ id: student.id, nameAr: student.nameAr })
        .from(student)
        .where(
          and(
            eq(student.status, "active"),
            roster.length ? notInArray(student.id, roster.map((row) => row.studentId)) : undefined,
            studentScopeCondition(user, student.id),
          ),
        )
        .orderBy(asc(student.nameAr))
    : [];

  const capacityTone =
    active.length > group.capacityMax ? "red" : active.length < group.capacityMin ? "gold" : "green";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={group.name}
        description={`${localized(locale, detail.levelNameAr, detail.levelNameEn)} · ${
          group.mode === "online" ? t("options.mode.online") : localized(locale, detail.branchNameAr, detail.branchNameEn)
        }`}
        actions={
          <>
            {can(user.grants, "students.import", group.branchId) && (
              <ButtonLink href={`/admin/academy/import?group=${group.id}`} variant="secondary">
                <FileSpreadsheet size={16} /> {t("nav.import")}
              </ButtonLink>
            )}
            {can(user.grants, "groups.write", group.branchId) && (
              <ButtonLink href={`/admin/academy/groups/${group.id}/edit`} variant="secondary">
                <Pencil size={16} /> {t("common.edit")}
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid min-w-0 gap-6">
          <Card
            title={t("groups.students")}
            actions={
              <div className="flex items-center gap-2">
                <Badge tone={capacityTone}>
                  {active.length} / {group.capacityMin}–{group.capacityMax}
                </Badge>
                {totalDue > 0 && <Badge tone="red">{t("groups.totalDue", { amount: formatMoney(totalDue, locale) })}</Badge>}
              </div>
            }
          >
            {roster.length === 0 ? (
              <EmptyState>{t("groups.noStudents")}</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("fields.student")}</Th>
                    <Th>{t("fields.age")}</Th>
                    <Th>{t("fields.phones")}</Th>
                    <Th>{t("payments.price")}</Th>
                    <Th>{t("payments.paid")}</Th>
                    <Th>{t("payments.remaining")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row) => (
                    <tr key={row.enrollmentId} className={row.status === "active" ? "" : "opacity-60"}>
                      <Td>
                        <Link href={`/admin/academy/students/${row.studentId}`} className="font-semibold text-gold-light hover:underline">
                          {row.nameAr}
                        </Link>
                        {row.status !== "active" && (
                          <span className="ms-2">
                            <Badge>{t(`options.enrollmentStatus.${row.status}`)}</Badge>
                          </span>
                        )}
                      </Td>
                      <Td>{ageOf(row.birthDate, row.birthYear) ?? "—"}</Td>
                      <Td>
                        <div className="flex flex-col gap-0.5" dir="ltr">
                          {row.phones.map((phone) => (
                            <a key={phone.phone} href={`tel:${phone.phone}`} className="text-xs text-text-secondary hover:text-gold-light">
                              {phone.phone} <span className="opacity-60">({t(`options.relation.${phone.relation}`)})</span>
                            </a>
                          ))}
                        </div>
                      </Td>
                      <Td>{formatMoney(Number(row.price) - Number(row.discount), locale)}</Td>
                      <Td>{formatMoney(row.paid, locale)}</Td>
                      <Td>
                        <span className={row.balance > 0 ? "font-semibold text-red-300" : "text-emerald-300"}>
                          {formatMoney(row.balance, locale)}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {canEnroll && (
            <Card title={t("groups.addNewStudent")}>
              <ActionForm action={enrollNewStudent.bind(null, group.id)} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
                <Field label={t("fields.nameAr")} htmlFor="new-nameAr" hint={t("students.nameHint")}>
                  <input id="new-nameAr" name="nameAr" dir="rtl" className={inputClass} />
                  <FieldError name="nameAr" />
                </Field>
                <Field label={t("fields.birthDate")} htmlFor="new-birthDate">
                  <input id="new-birthDate" name="birthDate" type="date" className={inputClass} />
                  <FieldError name="birthDate" />
                </Field>
                <Field label={t("fields.motherPhone")} htmlFor="new-motherPhone">
                  <input id="new-motherPhone" name="motherPhone" type="tel" dir="ltr" placeholder="01xxxxxxxxx" className={inputClass} />
                  <FieldError name="motherPhone" />
                </Field>
                <Field label={t("fields.fatherPhone")} htmlFor="new-fatherPhone">
                  <input id="new-fatherPhone" name="fatherPhone" type="tel" dir="ltr" placeholder="01xxxxxxxxx" className={inputClass} />
                  <FieldError name="fatherPhone" />
                </Field>
                {can(user.grants, "pricing.manage", group.branchId) && (
                  <>
                    <Field label={t("payments.price")} htmlFor="new-price" hint={t("groups.defaultPrice", { amount: formatMoney(group.price, locale) })}>
                      <input id="new-price" name="price" inputMode="decimal" dir="ltr" className={inputClass} />
                      <FieldError name="price" />
                    </Field>
                    <Field label={t("payments.discount")} htmlFor="new-discount">
                      <input id="new-discount" name="discount" inputMode="decimal" dir="ltr" className={inputClass} />
                      <FieldError name="discount" />
                    </Field>
                  </>
                )}
                <div className="flex items-center gap-4 sm:col-span-2">
                  <SubmitButton>{t("groups.enroll")}</SubmitButton>
                  <FormMessage />
                </div>
              </ActionForm>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Card title={t("groups.details")}>
            <DetailList
              items={[
                { label: t("fields.instructor"), value: detail.instructorName ?? "—" },
                { label: t("groups.price"), value: formatMoney(group.price, locale) },
                { label: t("fields.startDate"), value: formatDate(group.startDate, locale) },
                { label: t("levels.sessionCount"), value: detail.sessionCount },
                {
                  label: t("fields.status"),
                  value: t(`options.groupStatus.${group.status}`),
                },
              ]}
            />
            {detail.slots.length > 0 && (
              <ul className="mt-4 grid gap-1 border-t border-border-subtle/60 pt-4 text-sm">
                {[...detail.slots]
                  .sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday))
                  .map((slot) => (
                    <li key={slot.id} className="flex justify-between gap-2">
                      <span>{t(`options.weekday.${slot.weekday}`)}</span>
                      <span dir="ltr" className="text-text-secondary">
                        {slot.startTime.slice(0, 5)} · {t("groups.minutes", { minutes: slot.durationMinutes })}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            {group.meetingUrl && (
              <a href={group.meetingUrl} target="_blank" rel="noreferrer" className="mt-4 block truncate text-sm text-gold-light hover:underline" dir="ltr">
                {group.meetingUrl}
              </a>
            )}
          </Card>

          {canEnroll && otherStudents.length > 0 && (
            <Card title={t("groups.addExistingStudent")}>
              <ActionForm action={enrollExistingStudent.bind(null, group.id)} className="grid gap-3">
                <select name="studentId" defaultValue="" aria-label={t("fields.student")} className={inputClass}>
                  <option value="" disabled>
                    {t("common.choose")}
                  </option>
                  {otherStudents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nameAr}
                    </option>
                  ))}
                </select>
                <FieldError name="studentId" />
                <SubmitButton variant="secondary">{t("groups.enroll")}</SubmitButton>
                <FormMessage />
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
