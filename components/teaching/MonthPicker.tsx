import React from "react";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { formatMonth } from "@/lib/academy/format";
import type { Locale } from "@/lib/i18n/config";

/** Month chips that link to `?month=`. */
export async function MonthPicker({ months, current, basePath }: { months: string[]; current: string; basePath: string }) {
  const locale = (await getLocale()) as Locale;
  return (
    <nav className="flex flex-wrap gap-2">
      {months.map((month) => (
        <Link
          key={month}
          href={`${basePath}?month=${month}`}
          aria-current={month === current ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            month === current ? "bg-gold-gradient text-on-accent" : "border border-border-subtle text-text-secondary hover:text-text-primary"
          }`}
        >
          {formatMonth(month, locale, "long")}
        </Link>
      ))}
    </nav>
  );
}
