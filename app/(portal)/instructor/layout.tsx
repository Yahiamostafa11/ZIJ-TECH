import React from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePermission } from "@/lib/auth/session";
import { INSTRUCTOR_NAV } from "@/lib/portal/nav";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("portal.instructor");

  return (
    <PortalShell
      user={user}
      title="instructor"
      basePath="/instructor"
      sidebar={{ nav: "instructor", sections: INSTRUCTOR_NAV }}
    >
      {children}
    </PortalShell>
  );
}
