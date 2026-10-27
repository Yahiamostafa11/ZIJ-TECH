import React from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePermission } from "@/lib/auth/session";
import { STUDENT_NAV } from "@/lib/portal/nav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("portal.student");
  return (
    <PortalShell user={user} title="student" basePath="/student" sidebar={{ nav: "student", sections: STUDENT_NAV }}>
      <div className="teaching-glow" aria-hidden="true" />
      {children}
    </PortalShell>
  );
}
