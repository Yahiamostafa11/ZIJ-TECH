"use client";

import React from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-border-subtle bg-bg-secondary pt-12 pb-8 overflow-hidden">
      {/* Decorative Hieroglyphs Line */}
      <div className="absolute top-0 left-0 w-full h-12 opacity-30 pointer-events-none flex overflow-hidden">
        <img
          src="/svgs/hieroglyphs-line.svg"
          alt="Hieroglyphs Pattern"
          className="h-full w-auto object-cover repeat-x min-w-full"
        />
      </div>

      <div className="container mx-auto px-6 md:px-12 relative z-10 flex flex-col md:flex-row items-center justify-between mt-8">
        {/* Logo */}
        <div className="flex flex-col items-center md:items-start mb-6 md:mb-0">
          <span className="font-cinzel font-bold text-2xl text-gold-primary leading-none">
            ZIJ.
          </span>
          <span className="font-dmsans text-[8px] tracking-[0.2em] text-text-secondary mt-1">
            TECHNOLOGIES
          </span>
        </div>

        {/* Links */}
        <div className="flex gap-6 mb-6 md:mb-0">
          {["Home", "Solutions", "About", "Projects", "Contact"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="font-dmsans text-sm text-text-secondary hover:text-gold-light transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <div className="font-dmsans text-xs text-text-secondary">
          &copy; {currentYear} ZIJ Technologies. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
