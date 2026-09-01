import React from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
}

export function Reveal({ children, className }: RevealProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
