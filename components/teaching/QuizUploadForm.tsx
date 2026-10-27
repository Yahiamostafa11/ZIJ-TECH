"use client";

import React, { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/forms";
import { buttonClass, inputClass } from "@/components/portal/ui";

type Group = { id: number; name: string };

/** New quiz from an Excel sheet; lists any rows that need fixing. */
export function QuizUploadForm({
  action,
  groups,
  today,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  groups: Group[];
  today: string;
}) {
  const t = useTranslations("quizzes");
  const tErrors = useTranslations("errors");
  const [state, formAction, pending] = useActionState(action, {});
  const error = (name: string) => state.fieldErrors?.[name] && <p className="text-xs text-danger">{tErrors(state.fieldErrors[name])}</p>;
  const label = "grid gap-1.5 text-sm text-text-secondary";

  return (
    <form action={formAction} className="grid gap-3" noValidate>
      <label className={label}>
        {t("group")}
        <select name="groupId" className={inputClass}>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        {t("titleField")}
        <input name="title" className={inputClass} />
        {error("title")}
      </label>
      <label className={label}>
        {t("instructions")}
        <textarea name="instructions" rows={2} className={`${inputClass} resize-y`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          {t("purpose")}
          <select name="purpose" defaultValue="homework" className={inputClass}>
            <option value="homework">{t("purposes.homework")}</option>
            <option value="inclass">{t("purposes.inclass")}</option>
          </select>
        </label>
        <label className={label}>
          {t("timeLimit")}
          <input name="timeLimit" type="number" min={1} max={300} placeholder={t("noLimit")} dir="ltr" className={inputClass} />
          {error("timeLimit")}
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          {t("opens")}
          <input name="opensDate" type="date" defaultValue={today} className={inputClass} />
        </label>
        <label className={label}>
          &nbsp;
          <input name="opensTime" type="time" defaultValue="08:00" dir="ltr" className={inputClass} />
        </label>
        <label className={label}>
          {t("closes")}
          <input name="closesDate" type="date" defaultValue={today} className={inputClass} />
          {error("closesDate")}
        </label>
        <label className={label}>
          &nbsp;
          <input name="closesTime" type="time" defaultValue="23:00" dir="ltr" className={inputClass} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="shuffle" defaultChecked className="accent-[rgb(var(--gold-primary))]" /> {t("shuffle")}
      </label>
      <label className={label}>
        {t("file")}
        <input name="file" type="file" accept=".xlsx" className={`${inputClass} file:me-3 file:rounded file:border-0 file:bg-gold-primary/20 file:px-3 file:py-1 file:text-gold-light`} />
        {error("file")}
      </label>
      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? t("creating") : t("create")}
      </button>
      {state.error && !state.details && <p className="text-sm text-danger">{tErrors(state.error)}</p>}
      {state.details && (
        <div className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          <p className="mb-1 font-semibold">{tErrors(state.error ?? "checkFields")}</p>
          <ul className="grid gap-0.5">
            {state.details.map((item, index) => (
              <li key={index}>{item.row ? t("rowError", { row: item.row, problem: t(`sheetErrors.${item.code}`) }) : t(`sheetErrors.${item.code}`)}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
