import React from "react";
import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { Field, inputClass } from "@/components/portal/ui";
import { saveLevel } from "@/lib/academy/actions/structure";

type LevelValues = {
  id: number;
  programId: number;
  nameAr: string;
  nameEn: string;
  position: number;
  sessionCount: number;
  passMark: number;
  remedialMin: number;
  remedialMax: number;
  active: boolean;
};

export async function LevelForm({
  programs,
  level,
}: {
  programs: { id: number; name: string }[];
  level?: LevelValues;
}) {
  const t = await getTranslations();

  const number = (name: keyof LevelValues, label: string, fallback: number, min: number, max: number) => (
    <Field label={label} htmlFor={`level-${name}`}>
      <input
        id={`level-${name}`}
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={(level?.[name] as number | undefined) ?? fallback}
        className={inputClass}
      />
      <FieldError name={name} />
    </Field>
  );

  return (
    <ActionForm action={saveLevel} resetOnSuccess={!level} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {level && <input type="hidden" name="id" value={level.id} />}
      <Field label={t("fields.program")} htmlFor="level-programId">
        <select id="level-programId" name="programId" defaultValue={level?.programId ?? ""} className={inputClass}>
          <option value="" disabled>
            {t("common.choose")}
          </option>
          {programs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <FieldError name="programId" />
      </Field>
      <Field label={t("fields.nameAr")} htmlFor="level-nameAr">
        <input id="level-nameAr" name="nameAr" dir="rtl" defaultValue={level?.nameAr} className={inputClass} />
        <FieldError name="nameAr" />
      </Field>
      <Field label={t("fields.nameEn")} htmlFor="level-nameEn">
        <input id="level-nameEn" name="nameEn" dir="ltr" defaultValue={level?.nameEn} className={inputClass} />
        <FieldError name="nameEn" />
      </Field>
      {number("position", t("levels.position"), 1, 1, 99)}
      {number("sessionCount", t("levels.sessionCount"), 12, 1, 60)}
      {number("passMark", t("levels.passMark"), 65, 0, 100)}
      {number("remedialMin", t("levels.remedialMin"), 2, 0, 20)}
      {number("remedialMax", t("levels.remedialMax"), 4, 0, 20)}
      <input type="hidden" name="active" value={level && !level.active ? "" : "on"} />
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
        <SubmitButton>{level ? t("common.save") : t("levels.add")}</SubmitButton>
        <FormMessage />
      </div>
    </ActionForm>
  );
}
