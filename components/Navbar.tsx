"use client";

import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { GoldButton } from "./ui/GoldButton";

const navLinks = [
  { name: "Home", href: "#home" },
  { name: "Solutions", href: "#solutions" },
  { name: "About", href: "#about" },
  { name: "Projects", href: "#projects" },
  { name: "Contact", href: "#contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="fixed inset-x-0 top-5 z-50">
      <div
        className={`zij-container rounded-2xl border border-border-subtle bg-[rgba(10,15,16,0.68)] px-5 py-4 shadow-[0_18px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all duration-300 md:px-8 ${
          isScrolled ? "bg-bg-secondary/82 shadow-[0_18px_80px_rgba(0,0,0,0.48)]" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-6">
          <a href="#home" className="flex flex-col leading-none" aria-label="ZIJ Technologies home">
            <span className="font-cinzel text-3xl font-bold tracking-[0.03em] text-gold-primary md:text-4xl">
              ZIJ.
            </span>
            <span className="mt-1 font-dmsans text-[9px] font-bold tracking-[0.38em] text-gold-light/80">
              TECHNOLOGIES
            </span>
          </a>

          <div className="hidden items-center gap-9 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="relative text-sm text-text-primary/86 transition-colors after:absolute after:-bottom-2 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-gold-light after:transition-all hover:text-gold-light hover:after:w-5"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden lg:block">
            <GoldButton href="#contact">Get Started</GoldButton>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle text-gold-light lg:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div id="mobile-navigation" className="mt-5 grid gap-3 border-t border-border-subtle/70 pt-5 lg:hidden">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-text-primary hover:bg-gold-primary/10 hover:text-gold-light"
              >
                {link.name}
              </a>
            ))}
            <GoldButton
              href="#contact"
              className="mt-2 w-full"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Get Started
            </GoldButton>
          </div>
        )}
      </div>
    </nav>
  );
}
