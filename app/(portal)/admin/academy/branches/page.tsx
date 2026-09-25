import React from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Badge, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/portal/ui";
import { saveBranch } from "@/lib/academy/actions/structure";
import { localized } from "@/lib/academy/format";
import { listBranches } from "@/lib/academy/queries";
import { requirePermission } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";

export default async function BranchesPage() {
  await requirePermission("branches.manage");
  const [t, locale, branches] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listBranches(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("nav.branches")} description={t("branches.description")} />

      <div className="grid gap-6">
        {branches.length === 0 ? (
          <EmptyState>{t("branches.empty")}</EmptyState>
        ) : (
          branches.map((item) => (
            <Card
              key={item.id}
              title={localized(locale, item.nameAr, item.nameEn)}
              actions={
                <Badge tone={item.active ? "green" : "neutral"}>
                  {item.active ? t("common.active") : t("common.inactive")}
                </Badge>
              }
            >
              <ActionForm action={saveBranch} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={item.id} />
                <Field label={t("fields.nameAr")} htmlFor={`nameAr-${item.id}`}>
                  <input id={`nameAr-${item.id}`} name="nameAr" defaultValue={item.nameAr} dir="rtl" className={inputClass} />
                  <FieldError name="nameAr" />
                </Field>
                <Field label={t("fields.nameEn")} htmlFor={`nameEn-${item.id}`}>
                  <input id={`nameEn-${item.id}`} name="nameEn" defaultValue={item.nameEn} dir="ltr" className={inputClass} />
                  <FieldError name="nameEn" />
                </Field>
                <label className="flex items-center gap-2 pb-2 text-sm text-text-secondary">
                  <input type="checkbox" name="active" defaultChecked={item.active} />
                  {t("common.active")}
                </label>
                <SubmitButton variant="secondary">{t("common.save")}</SubmitButton>
                <div className="sm:col-span-4">
                  <FormMessage />
                </div>
              </ActionForm>
            </Card>
          ))
        )}

        <Card title={t("branches.add")}>
          <ActionForm action={saveBranch} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="active" value="on" />
            <Field label={t("fields.nameAr")} htmlFor="new-nameAr">
              <input id="new-nameAr" name="nameAr" dir="rtl" placeholder="الشروق" className={inputClass} />
              <FieldError name="nameAr" />
            </Field>
            <Field label={t("fields.nameEn")} htmlFor="new-nameEn">
              <input id="new-nameEn" name="nameEn" dir="ltr" placeholder="El Shorouk" className={inputClass} />
              <FieldError name="nameEn" />
            </Field>
            <SubmitButton>{t("common.add")}</SubmitButton>
            <div className="sm:col-span-3">
              <FormMessage />
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
