"use client";

import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { GoldButton } from "./ui/GoldButton";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#" },
    { name: "Solutions", href: "#solutions" },
    { name: "About", href: "#about" },
    { name: "Projects", href: "#projects" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-bg-primary/90 backdrop-blur-md border-b border-border-subtle py-4" : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Logo */}
        <div className="flex flex-col">
          <span className="font-cinzel font-bold text-3xl text-gold-primary leading-none">
            ZIJ.
          </span>
          <span className="font-dmsans text-[10px] tracking-[0.2em] text-text-secondary mt-1">
            TECHNOLOGIES
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-dmsans text-text-primary hover:text-gold-light transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <GoldButton>Get Started</GoldButton>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-gold-primary"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-bg-secondary border-b border-border-subtle flex flex-col items-center py-6 gap-6 shadow-2xl">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-dmsans text-text-primary hover:text-gold-light transition-colors"
            >
              {link.name}
            </a>
          ))}
          <GoldButton className="mt-4">Get Started</GoldButton>
        </div>
      )}
    </nav>
  );
}
