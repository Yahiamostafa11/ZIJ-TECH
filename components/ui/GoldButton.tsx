import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "outline" | "filled";
  className?: string;
  href?: string;
}

export function GoldButton({ children, variant = "filled", className, href, ...props }: GoldButtonProps) {
  const baseClasses =
    "relative inline-flex items-center justify-center rounded px-6 py-2.5 font-dmsans text-sm font-semibold transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.22)]";
  
  const outlineClasses =
    "border border-gold-primary/80 bg-bg-card/35 text-gold-light hover:border-gold-light hover:bg-gold-primary/12 hover:text-gold-light hover:shadow-[0_0_26px_rgba(242,193,102,0.18)]";
  
  const filledClasses =
    "border border-gold-light/20 bg-gold-gradient text-bg-primary hover:brightness-110 hover:shadow-[0_0_28px_rgba(242,193,102,0.26)]";

  const classes = twMerge(
    clsx(baseClasses, variant === "outline" ? outlineClasses : filledClasses),
    className
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
