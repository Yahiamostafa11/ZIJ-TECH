import React from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/portal/LoginForm";
import { LocaleSwitch } from "@/components/portal/LocaleSwitch";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.grants) ?? "/forbidden");

  const t = await getTranslations("login");

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute end-4 top-4">
        <LocaleSwitch />
      </div>
      <div className="premium-panel w-full max-w-sm rounded-xl p-8">
        <div className="mb-8 text-center">
          <span className="font-cinzel text-4xl font-bold text-gold-primary" dir="ltr">
            ZIJ.
          </span>
          <h1 className="mt-4 text-xl font-semibold text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
