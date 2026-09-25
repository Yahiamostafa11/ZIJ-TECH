"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Languages, LogIn, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GoldButton } from "@/components/ui/GoldButton";
import type { SiteCopy } from "./content";

const THEME_LABELS = {
  ltr: { toLight: "Switch to light theme", toDark: "Switch to dark theme" },
  rtl: { toLight: "التبديل إلى الوضع الفاتح", toDark: "التبديل إلى الوضع الداكن" },
};

export function SiteHeader({ copy, homeHref }: { copy: SiteCopy; homeHref: string }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const nav = copy.nav;
  const links = [
    { label: nav.academy, href: "#academy" },
    { label: nav.software, href: "#software" },
    { label: nav.iot, href: "#iot" },
    { label: nav.work, href: "#work" },
    { label: nav.contact, href: "#contact" },
  ];

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <header className="fixed inset-x-0 top-4 z-50">
      <div
        className={`zij-container rounded-2xl border border-border-subtle px-4 py-3 backdrop-blur-xl transition-all duration-300 md:px-6 ${
          isScrolled ? "bg-bg-secondary/90 shadow-float-strong" : "bg-bg-secondary/70 shadow-float"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <a href={homeHref} className="flex items-center gap-3" aria-label="ZIJ Technologies">
            <Image src="/brand/emblem-96.png" alt="" width={40} height={40} className="h-10 w-10" priority />
            <span className="flex flex-col leading-none" dir="ltr">
              <span className="font-cinzel text-2xl font-bold tracking-[0.03em] text-gold-primary">ZIJ.</span>
              <span className="mt-0.5 font-dmsans text-[9px] font-bold tracking-[0.34em] text-gold-light">TECHNOLOGIES</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 xl:flex" aria-label={nav.menu}>
            {links.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-text-primary/86 transition-colors hover:text-gold-light">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              href={nav.languageHref}
              hrefLang={copy.dir === "rtl" ? "en" : "ar"}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-subtle px-3 text-sm text-text-secondary transition hover:text-gold-light"
            >
              <Languages size={15} /> {nav.language}
            </a>
            <ThemeToggle labels={THEME_LABELS[copy.dir]} />
            {/* Families, instructors and staff; /login forwards signed-in users to their portal. */}
            <GoldButton href="/login" variant="outline" className="px-4">
              <LogIn size={16} className="me-2 rtl:-scale-x-100" /> {nav.signIn}
            </GoldButton>
            <GoldButton href="#contact" className="px-4">
              {nav.cta}
            </GoldButton>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle labels={THEME_LABELS[copy.dir]} />
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle text-gold-light"
              onClick={() => setIsOpen((open) => !open)}
              aria-label={nav.menu}
              aria-expanded={isOpen}
              aria-controls="site-navigation"
            >
              {isOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div id="site-navigation" className="mt-4 grid gap-1 border-t border-border-subtle/70 pt-4 lg:hidden">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-text-primary hover:bg-gold-primary/10 hover:text-gold-light"
              >
                {link.label}
              </a>
            ))}
            <a href={nav.languageHref} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:bg-gold-primary/10">
              <Languages size={15} /> {nav.language}
            </a>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <GoldButton href="/login" variant="outline">
                <LogIn size={16} className="me-2 rtl:-scale-x-100" /> {nav.signIn}
              </GoldButton>
              <GoldButton href="#contact" onClick={() => setIsOpen(false)}>
                {nav.cta}
              </GoldButton>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
