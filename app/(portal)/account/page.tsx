import React from "react";
import { getTranslations } from "next-intl/server";
import { ChangePasswordForm } from "@/components/portal/ChangePasswordForm";
import { PortalShell } from "@/components/portal/PortalShell";
import { Card, PageHeader } from "@/components/portal/ui";
import { homePathFor } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations();

  return (
    <PortalShell user={user} title="account" basePath={homePathFor(user.grants) ?? "/account"}>
      <div className="mx-auto max-w-3xl">
        <PageHeader title={t("account.title")} description={user.email} />
        <Card title={t("account.changePassword")}>
          <ChangePasswordForm />
        </Card>
      </div>
    </PortalShell>
  );
}
