"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/lib/i18n/actions";

export function LocaleSwitch() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setLocale(locale === "ar" ? "en" : "ar");
          router.refresh();
        })
      }
      className="inline-flex items-center gap-2 rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary transition hover:border-gold-light/50 hover:text-gold-light disabled:opacity-60"
    >
      <Languages size={16} strokeWidth={1.6} />
      {t("language")}
    </button>
  );
}
