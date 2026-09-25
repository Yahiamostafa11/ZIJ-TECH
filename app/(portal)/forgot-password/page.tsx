import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/portal/ActionForm";
import { AuthCard } from "@/components/portal/AuthCard";
import { inputClass } from "@/components/portal/ui";
import { requestPasswordResetLink } from "@/lib/auth/account-actions";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("recovery");
  return (
    <AuthCard title={t("forgotTitle")} subtitle={t("forgotSubtitle")}>
      <ActionForm action={requestPasswordResetLink} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-text-secondary">
          {t("login")}
          <input name="login" required autoCapitalize="none" dir="ltr" placeholder="name@zij-academy" className={inputClass} />
          <FieldError name="login" />
        </label>
        <SubmitButton className="w-full">{t("send")}</SubmitButton>
        <FormMessage />
        <p className="text-xs leading-6 text-text-secondary">{t("noEmailHelp")}</p>
        <Link href="/login" className="text-center text-sm text-gold-light hover:underline">
          {t("backToLogin")}
        </Link>
      </ActionForm>
    </AuthCard>
  );
}
