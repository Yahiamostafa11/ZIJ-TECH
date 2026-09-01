import React from "react";
import { LucideIcon } from "lucide-react";

interface SolutionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function SolutionCard({ icon: Icon, title, description }: SolutionCardProps) {
  return (
    <div className="group flex min-h-[210px] flex-col rounded-lg border border-border-subtle bg-bg-card/78 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-gold-light/60 hover:shadow-[0_0_32px_rgba(242,193,102,0.14)]">
      <div className="mb-6 flex h-[52px] w-[52px] items-center justify-center rounded-md border border-border-subtle bg-bg-secondary text-gold-light shadow-[0_0_26px_rgba(200,146,60,0.12)] transition group-hover:border-gold-light/70">
        <Icon size={26} strokeWidth={1.45} />
      </div>
      <h3 className="max-w-[11rem] text-lg font-semibold leading-tight text-text-primary">
        {title}
      </h3>
      <p lang="ar" dir="rtl" className="mt-auto pt-6 text-right font-cairo text-sm leading-7 text-text-secondary">
        {description}
      </p>
    </div>
  );
}
