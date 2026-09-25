import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Cpu, GraduationCap, Code2, type LucideIcon } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { can, homePathFor, type Permission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";

const PORTALS: { key: string; href: string; permission: Permission; icon: LucideIcon }[] = [
  { key: "academy", href: "/admin/academy", permission: "portal.academy", icon: GraduationCap },
  { key: "software", href: "/admin/software", permission: "portal.software", icon: Code2 },
  { key: "iot", href: "/admin/iot", permission: "portal.iot", icon: Cpu },
];

export default async function HubPage() {
  const user = await requireUser();
  const home = homePathFor(user.grants);
  if (home !== "/admin") redirect(home ?? "/forbidden");

  const t = await getTranslations("hub");
  const portals = PORTALS.filter((portal) => can(user.grants, portal.permission));

  return (
    <PortalShell user={user} title="hub" basePath="/admin">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-text-secondary">{t("subtitle")}</p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {portals.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="group flex flex-col rounded-lg border border-border-subtle bg-bg-card/78 p-6 transition hover:-translate-y-1 hover:border-gold-light/60 hover:shadow-[0_0_32px_rgba(242,193,102,0.14)]"
            >
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-border-subtle bg-bg-secondary text-gold-light">
                <Icon size={24} strokeWidth={1.5} />
              </span>
              <span className="text-lg font-semibold text-text-primary">{t(key)}</span>
              <span className="mt-2 text-sm leading-6 text-text-secondary">
                {t(`${key}Description`)}
              </span>
              <span className="mt-6 text-sm font-semibold text-gold-light">{t("open")}</span>
            </Link>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
