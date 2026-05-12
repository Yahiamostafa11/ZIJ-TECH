"use client";

import React from "react";
import { GlyphStrip } from "./visuals/GlyphStrip";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-10 overflow-hidden border-t border-border-subtle bg-bg-secondary pb-24 pt-10">
      <GlyphStrip />

      <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-7 px-6 md:flex-row md:px-4">
        <div className="flex flex-col items-center md:items-start">
          <span className="font-cinzel text-3xl font-bold leading-none text-gold-primary">ZIJ.</span>
          <span className="mt-1 text-[9px] font-bold tracking-[0.34em] text-gold-light/70">TECHNOLOGIES</span>
        </div>

        <div className="flex flex-wrap justify-center gap-5">
          {["Home", "Solutions", "About", "Projects", "Contact"].map((link) => (
            <a
              key={link}
              href={link === "Home" ? "#home" : `#${link.toLowerCase()}`}
              className="text-sm text-text-secondary transition-colors hover:text-gold-light"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="text-center text-xs text-text-secondary md:text-right">
          &copy; {currentYear} ZIJ Technologies. Automate. Scale. Elevate.
        </div>
      </div>
    </footer>
  );
}
