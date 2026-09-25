"use client";

import React, { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { createFamilyAccount, resetFamilyAccount, type CredentialsState } from "@/lib/academy/actions/accounts";
import { buttonClass, inputClass } from "@/components/portal/ui";

type Props = {
  kind: "student" | "parent";
  recordId: number;
  /** Existing login (name@zij-academy), or null when there is no account yet. */
  loginId: string | null;
  suggestedUsername: string;
  hasEmail: boolean;
};

function Credentials({ state }: { state: CredentialsState }) {
  const t = useTranslations("accounts");
  if (!state.password || !state.loginId) return null;
  return (
    <div className="mt-3 rounded-md border border-gold-primary/50 bg-gold-primary/10 p-3 text-sm">
      <p className="text-gold-light">{t("shareOnce")}</p>
      <p className="mt-2 font-mono" dir="ltr">
        {state.loginId}
        <br />
        <span className="select-all text-base">{state.password}</span>
      </p>
      {state.whatsappUrl && (
        <a href={state.whatsappUrl} target="_blank" rel="noreferrer" className={`${buttonClass("secondary")} mt-3`}>
          <MessageCircle size={16} /> {t("sendWhatsapp")}
        </a>
      )}
    </div>
  );
}

export function FamilyAccountControl({ kind, recordId, loginId, suggestedUsername, hasEmail }: Props) {
  const t = useTranslations();
  const [created, createAction, creating] = useActionState(createFamilyAccount.bind(null, kind, recordId), {});
  const [reset, setReset] = useState<CredentialsState>({});
  const [isResetting, startReset] = useTransition();

  if (!loginId && !created.loginId) {
    return (
      <form action={createAction} className="mt-2 grid gap-2">
        <div className="flex items-center gap-2" dir="ltr">
          <input name="username" defaultValue={suggestedUsername} aria-label={t("accounts.username")} className={`${inputClass} min-w-0`} />
          <span className="shrink-0 text-xs text-text-secondary">@zij-academy</span>
        </div>
        {created.fieldErrors?.username && <p className="text-xs text-danger">{t(`errors.${created.fieldErrors.username}`)}</p>}
        {created.error && created.error !== "checkFields" && <p className="text-xs text-danger">{t(`errors.${created.error}`)}</p>}
        <button type="submit" disabled={creating} className={buttonClass("secondary")}>
          {t("accounts.create")}
        </button>
      </form>
    );
  }

  return (
    <div className="mt-1">
      <p className="text-sm" dir="ltr">
        {loginId ?? created.loginId}
      </p>
      <p className="text-xs text-text-secondary">{hasEmail ? t("accounts.hasEmail") : t("accounts.noEmail")}</p>
      <Credentials state={created} />
      <Credentials state={reset} />
      {!created.password && !reset.password && (
        <button
          type="button"
          disabled={isResetting}
          onClick={() => {
            if (!window.confirm(t("users.confirmReset"))) return;
            startReset(async () => setReset(await resetFamilyAccount(kind, recordId)));
          }}
          className={`${buttonClass("ghost")} mt-2`}
        >
          {t("users.resetPassword")}
        </button>
      )}
      {reset.error && <p className="text-xs text-danger">{t(`errors.${reset.error}`)}</p>}
    </div>
  );
}
