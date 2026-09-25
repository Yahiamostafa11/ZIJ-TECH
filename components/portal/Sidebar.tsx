"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { ACADEMY_NAV, INSTRUCTOR_NAV, type NavSection } from "@/lib/portal/nav";

const NAVS: Record<"academy" | "instructor", NavSection[]> = {
  academy: ACADEMY_NAV,
  instructor: INSTRUCTOR_NAV,
};

type SidebarProps = {
  nav: keyof typeof NAVS;
  basePath: string;
  /** Slugs the current user may open; computed on the server. */
  allowed: string[];
};

export function Sidebar({ nav, basePath, allowed }: SidebarProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const sections = NAVS[nav]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => allowed.includes(item.slug)),
    }))
    .filter((section) => section.items.length > 0);

  const links = (
    <nav className="flex flex-col gap-6 py-6">
      {sections.map((section) => (
        <div key={section.key}>
          <p className="mb-2 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-light/60">
            {t(`sections.${section.key}`)}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map(({ slug, key, icon: Icon }) => {
              const href = slug ? `${basePath}/${slug}` : basePath;
              const isActive = pathname === href;
              return (
                <li key={slug}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    className={`mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-gold-primary/15 text-gold-light"
                        : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.6} className="shrink-0" />
                    {t(key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={tCommon("menu")}
        aria-expanded={isOpen}
        aria-controls="portal-sidebar"
        className="fixed bottom-5 end-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-card text-gold-light shadow-lg lg:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        id="portal-sidebar"
        className={`fixed inset-y-0 start-0 z-30 w-64 overflow-y-auto border-e border-border-subtle bg-bg-secondary pt-16 transition-transform lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:pt-0 ${
          isOpen ? "" : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full"
        }`}
      >
        {links}
      </aside>
    </>
  );
}
