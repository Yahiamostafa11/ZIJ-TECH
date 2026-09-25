import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LayoutGrid } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/auth/permissions";
import type { NavSection } from "@/lib/portal/nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitch } from "./LocaleSwitch";
import { SignOutButton } from "./SignOutButton";
import { Sidebar } from "./Sidebar";

const DIVISION_PORTALS: Permission[] = ["portal.academy", "portal.software", "portal.iot"];

type PortalShellProps = {
  user: CurrentUser;
  /** Key under the `portal` messages namespace. */
  title: string;
  basePath: string;
  sidebar?: { nav: "academy" | "instructor"; sections: NavSection[] };
  children: React.ReactNode;
};

export async function PortalShell({ user, title, basePath, sidebar, children }: PortalShellProps) {
  const t = await getTranslations();
  const portalCount = DIVISION_PORTALS.filter((permission) => can(user.grants, permission)).length;

  const allowed = sidebar
    ? sidebar.sections
        .flatMap((section) => section.items)
        .filter((item) => can(user.grants, item.permission))
        .map((item) => item.slug)
    : [];

  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border-subtle bg-bg-secondary/95 px-4 backdrop-blur md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href={basePath} className="flex items-baseline gap-2">
            <span className="font-cinzel text-2xl font-bold text-gold-primary" dir="ltr">
              ZIJ.
            </span>
            <span className="truncate text-sm text-text-secondary">{t(`portal.${title}`)}</span>
          </Link>
          {portalCount > 1 && (
            <Link
              href="/admin"
              className="hidden items-center gap-2 rounded-md px-2 py-1 text-sm text-text-secondary transition hover:text-gold-light sm:inline-flex"
            >
              <LayoutGrid size={16} strokeWidth={1.6} />
              {t("common.backToHub")}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/account" className="hidden text-sm text-text-secondary hover:text-gold-light md:inline">
            {user.name}
          </Link>
          <ThemeToggle labels={{ toLight: t("common.toLight"), toDark: t("common.toDark") }} />
          <LocaleSwitch />
          <SignOutButton />
        </div>
      </header>

      <div className="flex">
        {sidebar && <Sidebar nav={sidebar.nav} basePath={basePath} allowed={allowed} />}
        <main className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
