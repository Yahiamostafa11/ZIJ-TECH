import React from "react";
import { getTranslations } from "next-intl/server";
import { Placeholder } from "@/components/portal/Placeholder";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePermission } from "@/lib/auth/session";

export default async function SoftwarePortalPage() {
  const user = await requirePermission("portal.software");
  const t = await getTranslations();

  return (
    <PortalShell user={user} title="software" basePath="/admin/software">
      <Placeholder title={t("hub.software")} body={t("placeholder.divisionBody")} />
    </PortalShell>
  );
}
