import React from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { LevelForm } from "@/components/academy/LevelForm";
import { Badge, Card, EmptyState, Field, PageHeader, Table, Td, Th, inputClass } from "@/components/portal/ui";
import { createProgram } from "@/lib/academy/actions/structure";
import { localized } from "@/lib/academy/format";
import { listLevels } from "@/lib/academy/queries";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { program } from "@/lib/db/academy";
import type { Locale } from "@/lib/i18n/config";

export default async function LevelsPage() {
  await requirePermission("levels.manage");
  const [t, locale, levels, programs] = await Promise.all([
    getTranslations(),
    getLocale() as Promise<Locale>,
    listLevels(),
    db.select().from(program).orderBy(program.nameEn),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("nav.levels")} description={t("levels.description")} />

      <div className="grid gap-6">
        {programs.length === 0 ? (
          <EmptyState>{t("levels.noPrograms")}</EmptyState>
        ) : (
          programs.map((item) => {
            const programLevels = levels.filter((row) => row.programId === item.id);
            return (
              <Card key={item.id} title={localized(locale, item.nameAr, item.nameEn)}>
                {programLevels.length === 0 ? (
                  <p className="text-sm text-text-secondary">{t("levels.empty")}</p>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>#</Th>
                        <Th>{t("fields.name")}</Th>
                        <Th>{t("levels.sessionCount")}</Th>
                        <Th>{t("levels.passMark")}</Th>
                        <Th>{t("levels.remedial")}</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {programLevels.map((row) => (
                        <tr key={row.id}>
                          <Td>{row.position}</Td>
                          <Td>
                            {localized(locale, row.nameAr, row.nameEn)}{" "}
                            {!row.active && <Badge>{t("common.inactive")}</Badge>}
                          </Td>
                          <Td>{row.sessionCount}</Td>
                          <Td>{row.passMark}%</Td>
                          <Td>
                            {row.remedialMin}–{row.remedialMax}
                          </Td>
                          <Td className="text-end">
                            <Link href={`/admin/academy/levels/${row.id}`} className="text-gold-light hover:underline">
                              {t("common.edit")}
                            </Link>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            );
          })
        )}

        {programs.length > 0 && (
          <Card title={t("levels.add")}>
            <LevelForm
              programs={programs.map((item) => ({ id: item.id, name: localized(locale, item.nameAr, item.nameEn) }))}
            />
          </Card>
        )}

        <Card title={t("levels.addProgram")}>
          <ActionForm action={createProgram} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label={t("fields.nameAr")} htmlFor="program-nameAr">
              <input id="program-nameAr" name="nameAr" dir="rtl" placeholder="روبوتكس" className={inputClass} />
              <FieldError name="nameAr" />
            </Field>
            <Field label={t("fields.nameEn")} htmlFor="program-nameEn">
              <input id="program-nameEn" name="nameEn" dir="ltr" placeholder="Robotics" className={inputClass} />
              <FieldError name="nameEn" />
            </Field>
            <SubmitButton variant="secondary">{t("common.add")}</SubmitButton>
            <div className="sm:col-span-3">
              <FormMessage />
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
