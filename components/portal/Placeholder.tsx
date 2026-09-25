import React from "react";
import { getTranslations } from "next-intl/server";
import { Construction } from "lucide-react";

type PlaceholderProps = { title: string; body: string };

export async function Placeholder({ title, body }: PlaceholderProps) {
  const t = await getTranslations("placeholder");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-text-primary">{title}</h1>
      <div className="flex items-start gap-4 rounded-lg border border-dashed border-border-subtle bg-bg-card/60 p-6">
        <Construction className="mt-0.5 shrink-0 text-gold-primary" size={22} strokeWidth={1.6} />
        <div>
          <p className="font-semibold text-gold-light">{t("title")}</p>
          <p className="mt-1 text-sm leading-7 text-text-secondary">{body}</p>
        </div>
      </div>
    </div>
  );
}
