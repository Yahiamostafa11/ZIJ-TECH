import React from "react";
import { getTranslations } from "next-intl/server";
import { Placeholder } from "@/components/portal/Placeholder";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePermission } from "@/lib/auth/session";

export default async function IotPortalPage() {
  const user = await requirePermission("portal.iot");
  const t = await getTranslations();

  return (
    <PortalShell user={user} title="iot" basePath="/admin/iot">
      <Placeholder title={t("hub.iot")} body={t("placeholder.divisionBody")} />
    </PortalShell>
  );
}
