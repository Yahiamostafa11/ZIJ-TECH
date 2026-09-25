import React from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePermission } from "@/lib/auth/session";
import { ACADEMY_NAV } from "@/lib/portal/nav";

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("portal.academy");

  return (
    <PortalShell
      user={user}
      title="academy"
      basePath="/admin/academy"
      sidebar={{ nav: "academy", sections: ACADEMY_NAV }}
    >
      {children}
    </PortalShell>
  );
}
