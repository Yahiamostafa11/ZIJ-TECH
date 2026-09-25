import React from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/portal/AuthCard";
import { LoginForm } from "@/components/portal/LoginForm";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/account" : (homePathFor(user.grants) ?? "/forbidden"));

  const t = await getTranslations("login");
  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      <LoginForm />
    </AuthCard>
  );
}
