import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/portal/AuthCard";
import { ResetPasswordForm } from "@/components/portal/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = await getTranslations("recovery");
  return (
    <AuthCard title={t("resetTitle")}>
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="grid gap-4 text-center">
          <p className="text-sm text-danger">{t("invalidLink")}</p>
          <Link href="/forgot-password" className="text-sm text-gold-light hover:underline">
            {t("requestNew")}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
