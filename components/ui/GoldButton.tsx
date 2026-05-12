import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "outline" | "filled";
  className?: string;
}

export function GoldButton({ children, variant = "filled", className, ...props }: GoldButtonProps) {
  const baseClasses =
    "relative inline-flex items-center justify-center px-6 py-2.5 font-dmsans text-sm font-medium transition-all duration-300 rounded";
  
  const outlineClasses =
    "border border-gold-primary text-gold-primary hover:bg-gold-primary hover:text-bg-primary";
  
  const filledClasses =
    "bg-gold-primary text-bg-primary hover:bg-gold-light";

  const classes = twMerge(
    clsx(baseClasses, variant === "outline" ? outlineClasses : filledClasses),
    className
  );

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
