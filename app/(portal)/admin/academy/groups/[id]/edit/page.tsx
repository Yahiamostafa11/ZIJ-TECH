import React from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GroupForm } from "@/components/academy/GroupForm";
import { PageHeader } from "@/components/portal/ui";
import { getGroupDetail } from "@/lib/academy/queries";
import { requireGroup } from "@/lib/academy/scope";
import { requirePermission } from "@/lib/auth/session";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("groups.write");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  await requireGroup(user, id, "groups.write");

  const [t, detail] = await Promise.all([getTranslations(), getGroupDetail(id)]);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`${t("common.edit")}: ${detail.group.name}`} />
      <GroupForm viewer={user} group={detail.group} slots={detail.slots} />
    </div>
  );
}
