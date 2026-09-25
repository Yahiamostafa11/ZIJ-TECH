import React from "react";
import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitch } from "./LocaleSwitch";

/** Centered card used by the sign-in and password recovery pages. */
export async function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute end-4 top-4 flex items-center gap-2">
        <ThemeToggle labels={{ toLight: t("toLight"), toDark: t("toDark") }} />
        <LocaleSwitch />
      </div>
      <div className="premium-panel w-full max-w-sm rounded-xl p-8">
        <div className="mb-8 text-center">
          <span className="font-cinzel text-4xl font-bold text-gold-primary" dir="ltr">
            ZIJ.
          </span>
          <h1 className="mt-4 text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
