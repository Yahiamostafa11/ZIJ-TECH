import React from "react";
import { getTranslations } from "next-intl/server";
import { GroupForm } from "@/components/academy/GroupForm";
import { PageHeader } from "@/components/portal/ui";
import { requirePermission } from "@/lib/auth/session";

export default async function NewGroupPage() {
  const user = await requirePermission("groups.write");
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("groups.new")} />
      <GroupForm viewer={user} />
    </div>
  );
}
