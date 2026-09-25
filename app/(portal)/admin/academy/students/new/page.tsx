import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Card, Field, PageHeader, inputClass } from "@/components/portal/ui";
import { registerStudent } from "@/lib/academy/actions/people";
import { localized } from "@/lib/academy/format";
import { listGroups } from "@/lib/academy/queries";
import { branchScope } from "@/lib/academy/scope";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const user = await requirePermission("students.write");
  const [t, locale, groups, params] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listGroups(user),
    searchParams,
  ]);
  const groupRequired = !branchScope(user).all;
  const preselected = groups.some((group) => group.id === Number(params.group)) ? params.group : "";

  const input = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <Field label={label} htmlFor={`student-${name}`} hint={hint}>
      <input id={`student-${name}`} name={name} className={inputClass} {...props} />
      <FieldError name={name} />
    </Field>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("students.new")} description={t("students.newDescription")} />

      <ActionForm action={registerStudent} className="grid gap-6">
        <Card title={t("students.profile")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("nameAr", t("fields.nameAr"), { dir: "rtl", autoFocus: true }, t("students.nameHint"))}
            {input("nameEn", t("fields.nameEn"), { dir: "ltr" }, t("students.nameEnHint"))}
            {input("birthDate", t("fields.birthDate"), { type: "date" })}
            {input("age", t("students.ageIfNoBirthDate"), { type: "number", min: 3, max: 25, inputMode: "numeric" })}
            {input("school", t("fields.school"))}
          </div>
        </Card>

        <Card title={t("students.guardians")}>
          <p className="mb-4 text-sm text-text-secondary">{t("students.guardiansHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("motherName", t("students.motherName"), { dir: "rtl" })}
            {input("motherPhone", t("fields.motherPhone"), { type: "tel", dir: "ltr", placeholder: "01xxxxxxxxx" })}
            {input("fatherName", t("students.fatherName"), { dir: "rtl" })}
            {input("fatherPhone", t("fields.fatherPhone"), { type: "tel", dir: "ltr", placeholder: "01xxxxxxxxx" })}
          </div>
        </Card>

        <Card title={t("fields.group")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={t("fields.group")}
              htmlFor="student-groupId"
              hint={groupRequired ? t("students.groupRequiredHint") : t("students.groupOptionalHint")}
              className="sm:col-span-3"
            >
              <select id="student-groupId" name="groupId" defaultValue={preselected} className={inputClass}>
                <option value="">{groupRequired ? t("common.choose") : t("students.noGroupYet")}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} — {localized(locale, group.levelNameAr, group.levelNameEn)}
                  </option>
                ))}
              </select>
              <FieldError name="groupId" />
            </Field>
            {can(user.grants, "pricing.manage") && (
              <>
                {input("price", t("payments.price"), { inputMode: "decimal", dir: "ltr" }, t("students.priceHint"))}
                {input("discount", t("payments.discount"), { inputMode: "decimal", dir: "ltr" })}
              </>
            )}
          </div>
        </Card>

        <Card title={t("fields.notes")}>
          <textarea name="notes" rows={3} aria-label={t("fields.notes")} className={inputClass} />
          <label className="mt-4 flex items-start gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="photoConsent" className="mt-1" />
            {t("students.photoConsent")}
          </label>
        </Card>

        <div className="flex items-center gap-4">
          <SubmitButton>{t("students.register")}</SubmitButton>
          <FormMessage />
        </div>
      </ActionForm>
    </div>
  );
}
